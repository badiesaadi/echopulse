/* ═══════════════════════════════════════════════════════
   EchoPulse — Gesture Control System
   - Double-tap  → Voice command
   - Two-finger swipe up/down → Pitch shift
   - Three-finger hold → Emergency guidance
   - SOS slide gesture (drag thumb)
═══════════════════════════════════════════════════════ */
'use strict';

const GestureEngine = (() => {
  const DOUBLE_TAP_MS   = 280;
  const THREE_HOLD_MS   = 800;
  const SWIPE_THRESHOLD = 40;

  let lastTapTime  = 0;
  let twoFingerStartY = null;
  let threeFingerTimer = null;
  let threeFingerActive = false;

  // SOS slide state
  let sosSliding = false;
  let sosStartX  = 0;
  let sosThumb   = null;
  let sosFill    = null;
  let sosTrack   = null;

  function init() {
    const overlay = document.getElementById('gesture-overlay');
    if (overlay) {
      overlay.style.pointerEvents = 'none';
      overlay.style.display = 'none';
    }

    // ── Touch events on content area ──
    const content = document.getElementById('content-area');
    if (content) {
      content.addEventListener('touchstart', onTouchStart, { passive: true });
      content.addEventListener('touchmove',  onTouchMove,  { passive: true });
      content.addEventListener('touchend',   onTouchEnd,   { passive: true });

      // Mouse fallback for desktop preview
      content.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup',   onMouseUp);
    }

    // SOS slide
    initSOSSlide();

    // Environment toggle
    document.getElementById('env-indoor').addEventListener('click', () => {
      document.getElementById('env-indoor').classList.add('env-btn--active');
      document.getElementById('env-outdoor').classList.remove('env-btn--active');
      EP.toast('Indoor navigation mode activated', '🏠');
      AudioEngine.uiTick('select');
      EP.haptic('medium');
    });

    document.getElementById('env-outdoor').addEventListener('click', () => {
      document.getElementById('env-outdoor').classList.add('env-btn--active');
      document.getElementById('env-indoor').classList.remove('env-btn--active');
      EP.toast('Outdoor navigation mode activated', '☀️');
      AudioEngine.uiTick('select');
      EP.haptic('medium');
    });

    // Sound toggle button
    document.getElementById('btn-sound-toggle').addEventListener('click', () => {
      const enabled = !AudioEngine.spatialEnabled;
      AudioEngine.setSpatialEnabled(enabled);
      document.getElementById('btn-sound-toggle').setAttribute('aria-pressed', String(enabled));
      EP.toast(enabled ? 'Spatial audio enabled' : 'Spatial audio muted', enabled ? '🔊' : '🔇');
      AudioEngine.uiTick('select');
      EP.haptic('light');
    });

    // Voice cancel
    document.getElementById('voice-cancel').addEventListener('click', closeVoiceOverlay);

    // Emergency dismiss
    document.getElementById('emergency-dismiss').addEventListener('click', () => {
      document.getElementById('emergency-hud').classList.add('hidden');
      AudioEngine.uiTick('tap');
      EP.haptic('light');
    });

    // Emergency SOS btn inside HUD
    document.getElementById('emergency-sos-btn').addEventListener('click', () => {
      EP.haptic('heavy');
      AudioEngine.sosAlarm();
      EP.toast('SOS Activated — Broadcasting location', '🆘', 5000);
      const broadcastStatus = document.getElementById('broadcast-status');
      const broadcastDot    = broadcastStatus.querySelector('.broadcast-dot');
      broadcastStatus.querySelector('span:last-child').textContent = 'Broadcasting…';
      broadcastDot.classList.add('active');
      document.getElementById('emergency-hud').classList.add('hidden');
    });

    // Soundscape toggle
    document.getElementById('soundscape-toggle').addEventListener('change', (e) => {
      const checked = e.target.checked;
      AudioEngine.setSpatialEnabled(checked);
      document.getElementById('soundscape-mode').textContent = checked ? '3D Spatial' : 'Off';
      EP.haptic('light');
    });

    // Voice search button
    document.getElementById('btn-voice-search').addEventListener('click', openVoiceOverlay);
  }

  // ── Touch handlers ──
  function onTouchStart(e) {
    // If touch target is an interactive element, do NOT intercept
    if (e.target && e.target.closest('button, input, select, label, a, .icon-btn, .env-btn, .settings-gear-btn, .toggle-switch, .toggle-slider, .settings-seg-btn, .det-chip, .saved-route, .contact-item, .nav-item, [role="button"], [role="tab"]')) {
      return;
    }

    AudioEngine.resume();
    const touches = e.touches;

    if (touches.length === 1) {
      handleSingleTap(touches[0]);
    } else if (touches.length === 2) {
      twoFingerStartY = (touches[0].clientY + touches[1].clientY) / 2;
    } else if (touches.length === 3) {
      startThreeFingerHold();
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 2 && twoFingerStartY !== null) {
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const delta = twoFingerStartY - currentY;

      if (Math.abs(delta) > SWIPE_THRESHOLD) {
        const direction = delta > 0 ? 1 : -1;
        const newPitch = AudioEngine.adjustPitch(direction * 0.1);
        EP.toast(`Pitch: ${Math.round(newPitch * 100)}%`, '🎵', 1000);
        EP.haptic('light');
        twoFingerStartY = currentY;
      }
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length < 3) cancelThreeFingerHold();
    if (e.touches.length < 2) twoFingerStartY = null;
  }

  // ── Mouse fallback ──
  let mouseDoubleTimer = null;
  let mouseClickCount  = 0;

  function onMouseDown(e) {
    if (e.target && e.target.closest('button, input, select, label, a, .icon-btn, .env-btn, .settings-gear-btn, .toggle-switch, .toggle-slider, .settings-seg-btn, .det-chip, .saved-route, .contact-item, .nav-item, [role="button"], [role="tab"]')) {
      return;
    }
    AudioEngine.resume();
    EP.createRipple(e.clientX - getAppOffset().x, e.clientY - getAppOffset().y);
    mouseClickCount++;
    clearTimeout(mouseDoubleTimer);
    mouseDoubleTimer = setTimeout(() => {
      if (mouseClickCount >= 2) openVoiceOverlay();
      mouseClickCount = 0;
    }, DOUBLE_TAP_MS);
  }

  function onMouseMove() {}
  function onMouseUp() {}

  function getAppOffset() {
    const shell = document.getElementById('app-shell');
    if (!shell) return { x: 0, y: 0 };
    const rect = shell.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }

  // ── Single tap logic ──
  function handleSingleTap(touch) {
    const now = Date.now();
    EP.createRipple(touch.clientX - getAppOffset().x, touch.clientY - getAppOffset().y);
    AudioEngine.uiTick('tap');
    EP.haptic('light');

    if (now - lastTapTime < DOUBLE_TAP_MS) {
      // Double tap — voice command
      openVoiceOverlay();
    }
    lastTapTime = now;
  }

  // ── Three-finger hold ──
  function startThreeFingerHold() {
    cancelThreeFingerHold();
    threeFingerTimer = setTimeout(() => {
      if (!threeFingerActive) {
        threeFingerActive = true;
        EP.haptic('warning');
        AudioEngine.obstacleWarning(0);
        document.getElementById('emergency-hud').classList.remove('hidden');
        EP.toast('Emergency Guidance Activated', '⚡', 4000);
      }
    }, THREE_HOLD_MS);
  }

  function cancelThreeFingerHold() {
    clearTimeout(threeFingerTimer);
    threeFingerActive = false;
  }

  // ── Voice Overlay ──
  function openVoiceOverlay() {
    AudioEngine.uiTick('select');
    EP.haptic('medium');
    document.getElementById('voice-overlay').classList.remove('hidden');
    document.getElementById('voice-overlay').setAttribute('aria-hidden', 'false');

    // Simulate listening → response after 2.5s
    setTimeout(() => {
      const destinations = ['Main Entrance Ramp', 'Elevator B', 'Exit E', 'Coffee Shop', 'Restrooms'];
      const dest = destinations[Math.floor(Math.random() * destinations.length)];
      closeVoiceOverlay();
      EP.toast(`Navigating to: ${dest}`, '🗺️');
      AudioEngine.navigationStep();
      EP.haptic('success');
    }, 2500);
  }

  function closeVoiceOverlay() {
    AudioEngine.uiTick('tap');
    document.getElementById('voice-overlay').classList.add('hidden');
    document.getElementById('voice-overlay').setAttribute('aria-hidden', 'true');
  }

  // ── SOS Slide ──
  function initSOSSlide() {
    sosThumb = document.getElementById('sos-slide-thumb');
    sosFill  = document.getElementById('sos-slide-fill');
    sosTrack = document.getElementById('sos-slide-track');
    if (!sosThumb) return;

    const trackWidth = () => sosTrack.getBoundingClientRect().width;

    // Mouse
    sosThumb.addEventListener('mousedown', (e) => {
      sosSliding = true;
      sosStartX  = e.clientX;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!sosSliding) return;
      const maxSlide = trackWidth() - 56;
      const dx = EP.clamp(e.clientX - sosStartX, 0, maxSlide);
      const pct = dx / maxSlide;
      sosThumb.style.transform = `translateX(${dx}px)`;
      sosFill.style.width = `${pct * 100}%`;
      sosThumb.setAttribute('aria-valuenow', Math.round(pct * 100));
      if (pct >= 0.95) triggerSOS();
    });

    document.addEventListener('mouseup', cancelSOSSlide);

    // Touch
    sosThumb.addEventListener('touchstart', (e) => {
      sosSliding = true;
      sosStartX  = e.touches[0].clientX;
      e.preventDefault();
    }, { passive: false });

    sosThumb.addEventListener('touchmove', (e) => {
      if (!sosSliding) return;
      const maxSlide = trackWidth() - 56;
      const dx = EP.clamp(e.touches[0].clientX - sosStartX, 0, maxSlide);
      const pct = dx / maxSlide;
      sosThumb.style.transform = `translateX(${dx}px)`;
      sosFill.style.width = `${pct * 100}%`;
      sosThumb.setAttribute('aria-valuenow', Math.round(pct * 100));
      if (pct >= 0.95) triggerSOS();
    }, { passive: false });

    sosThumb.addEventListener('touchend', cancelSOSSlide);
  }

  function cancelSOSSlide() {
    if (!sosSliding) return;
    sosSliding = false;
    sosThumb.style.transform = 'translateX(0)';
    sosFill.style.width = '0%';
    sosThumb.setAttribute('aria-valuenow', 0);
  }

  function triggerSOS() {
    sosSliding = false;
    EP.haptic('heavy');
    AudioEngine.sosAlarm();

    const dot = document.querySelector('.broadcast-dot');
    const broadcastText = document.querySelector('#broadcast-status span:last-child');
    if (dot) dot.classList.add('active');
    if (broadcastText) broadcastText.textContent = 'Broadcasting…';

    EP.toast('🆘 SOS Activated — Location broadcast sent to contacts', '🆘', 6000);
    cancelSOSSlide();
  }

  return { init };
})();
