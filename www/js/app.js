/* ═══════════════════════════════════════════════════════
   EchoPulse — App Bootstrap
   Orchestrates the boot sequence, splash loading,
   and initialization of all modules
═══════════════════════════════════════════════════════ */
'use strict';

(function bootstrap() {
  const BOOT_STEPS = [
    { pct: 10, msg: 'Initializing sensors…' },
    { pct: 28, msg: 'Calibrating spatial audio…' },
    { pct: 46, msg: 'Loading object detection models…' },
    { pct: 64, msg: 'Connecting GPS antenna…' },
    { pct: 80, msg: 'Building acoustic map…' },
    { pct: 92, msg: 'Syncing trusted contacts…' },
    { pct: 100, msg: 'EchoPulse ready ✓' },
  ];

  let stepIdx = 0;
  const loaderBar = document.querySelector('.splash__loader-bar');
  const statusEl  = document.getElementById('splash-status');

  function advanceLoader() {
    if (stepIdx >= BOOT_STEPS.length) return;
    const step = BOOT_STEPS[stepIdx++];
    if (loaderBar) loaderBar.style.width = `${step.pct}%`;
    if (statusEl)  statusEl.textContent  = step.msg;

    if (stepIdx < BOOT_STEPS.length) {
      setTimeout(advanceLoader, EP.rand(300, 600));
    } else {
      // Launch app
      setTimeout(launchApp, 600);
    }
  }

  function launchApp() {
    const splash   = document.getElementById('screen-splash');
    const appShell = document.getElementById('app-shell');

    // Init audio
    AudioEngine.init();

    // Fade out splash
    splash.classList.add('screen--exit');
    appShell.classList.remove('hidden');

    // Force reflow then show shell
    appShell.offsetHeight;
    requestAnimationFrame(() => {
      splash.addEventListener('transitionend', () => {
        if (splash && splash.parentNode) splash.remove();
      }, { once: true });
    });

    // Guaranteed fallback: remove splash completely from DOM after 500ms
    setTimeout(() => {
      if (splash && splash.parentNode) splash.remove();
    }, 500);

    // Init all modules
    RadarRenderer.init();
    NavController.init();
    GestureEngine.init();
    DBMeter.init();
    EmergencyModule.init();
    SettingsController.init();
    OnboardingFlow.init();

    // Play startup tone
    setTimeout(() => {
      AudioEngine.playTone(440, 0, 0.1, 'sine', 0.15);
      setTimeout(() => AudioEngine.playTone(660, 0, 0.15, 'sine', 0.12), 150);
      EP.haptic('success');
    }, 200);

    // Activate first screen
    const firstScreen = document.getElementById('screen-radar');
    if (firstScreen) {
      firstScreen.removeAttribute('hidden');
      firstScreen.offsetHeight;
      firstScreen.classList.add('active');
    }

    // Welcome toast
    setTimeout(() => {
      EP.toast('Spatial radar active — detecting surroundings', '◎', 3000);
    }, 800);
  }

  // ── Splash canvas animation ──
  function initSplashCanvas() {
    const canvas = document.getElementById('splash-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;
    const particles = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.15 + 0.02,
        color: Math.random() > 0.5 ? EP.LIME : EP.CYAN,
      });
    }

    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, W, H);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      // Radial center glow
      const cx = W / 2, cy = H / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      grad.addColorStop(0, 'rgba(163,230,53,0.06)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    const animId = setInterval(draw, 1000 / 30);
    // Stop after boot
    setTimeout(() => clearInterval(animId), 4500);
  }

  // ── Start ──
  document.addEventListener('DOMContentLoaded', () => {
    initSplashCanvas();
    // Small delay so CSS renders first
    setTimeout(advanceLoader, 400);
  });
})();
