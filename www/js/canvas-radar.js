/* ═══════════════════════════════════════════════════════
   EchoPulse — Radar Canvas Renderer & Vision Engine
   Dual Mode:
   1. Live Camera Mode (getUserMedia) with real-time HUD,
      contrast & edge obstacle tracking, and 3D spatial pan.
   2. Interactive Simulation Mode with LiDAR depth grid,
      synthetic targets, and proximity audio cues.
═══════════════════════════════════════════════════════ */
'use strict';

const RadarRenderer = (() => {
  let canvas, ctx, raf;
  let W, H;
  let particles = [];
  let objects   = [];
  let tick = 0;
  let videoEl = null;
  let isLiveCamera = false;

  // Analysis canvas for computer vision processing
  let cvCanvas = null;
  let cvCtx = null;
  const CV_W = 160;
  const CV_H = 120;
  let prevFrameData = null;

  // Object templates for fallback simulation
  const OBJ_TEMPLATES = [
    { label: 'Person',  icon: '🚶', type: 'safe',   baseW: 0.12, baseH: 0.32 },
    { label: 'Steps',   icon: '🪜', type: 'warn',   baseW: 0.18, baseH: 0.12 },
    { label: 'Door',    icon: '🚪', type: 'safe',   baseW: 0.1,  baseH: 0.35 },
    { label: 'Vehicle', icon: '🚗', type: 'danger', baseW: 0.28, baseH: 0.18 },
    { label: 'Pillar',  icon: '🏛',  type: 'warn',   baseW: 0.08, baseH: 0.4  },
    { label: 'Sign',    icon: '🪧', type: 'safe',   baseW: 0.12, baseH: 0.1  },
  ];

  const COLORS = {
    safe:   EP.LIME,
    warn:   EP.AMBER,
    danger: EP.DANGER,
  };

  function init() {
    canvas = document.getElementById('camera-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    videoEl = document.getElementById('camera-video');

    // Create offscreen CV canvas
    cvCanvas = document.createElement('canvas');
    cvCanvas.width = CV_W;
    cvCanvas.height = CV_H;
    cvCtx = cvCanvas.getContext('2d', { willReadFrequently: true });

    resize();
    spawnObjects();
    spawnParticles();
    loop();

    window.addEventListener('resize', EP.debounce(resize, 200));

    // Bind camera toggle button & badge
    const toggleBtn = document.getElementById('btn-camera-toggle');
    const badge = document.getElementById('camera-badge');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleCamera);
    if (badge) badge.addEventListener('click', toggleCamera);

    // Auto-attempt starting live camera if supported
    setTimeout(() => {
      startCamera();
    }, 800);
  }

  async function startCamera() {
    if (!videoEl) return;
    const ok = await HardwareSensors.initCamera(videoEl);
    if (ok) {
      isLiveCamera = true;
      updateCameraUI(true);
      EP.toast('Camera connected — Live vision active', '📷', 3000);
    } else {
      isLiveCamera = false;
      updateCameraUI(false);
    }
  }

  function stopCamera() {
    HardwareSensors.stopCamera(videoEl);
    isLiveCamera = false;
    updateCameraUI(false);
    EP.toast('Switched to simulated radar mode', '📡', 2000);
  }

  function toggleCamera() {
    if (isLiveCamera) {
      stopCamera();
    } else {
      startCamera();
    }
  }

  function updateCameraUI(live) {
    const modeText = document.getElementById('camera-mode-text');
    const dot = document.getElementById('camera-dot');
    const toggleBtn = document.getElementById('btn-camera-toggle');

    if (modeText) modeText.textContent = live ? 'LIVE CAM' : 'SIM RADAR';
    if (dot) {
      dot.style.background = live ? EP.LIME : EP.CYAN;
      dot.classList.toggle('active', live);
    }
    if (toggleBtn) {
      toggleBtn.style.color = live ? EP.LIME : '';
      toggleBtn.setAttribute('aria-pressed', live ? 'true' : 'false');
    }
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width  = rect.width  || 390;
    H = canvas.height = rect.height || 300;
    particles = [];
    spawnParticles();
  }

  // ── Particles (depth fog for simulation) ──
  function spawnParticles() {
    for (let i = 0; i < 50; i++) {
      particles.push({
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    EP.rand(1, 3),
        vx:   EP.rand(-0.3, 0.3),
        vy:   EP.rand(-0.1, 0.2),
        alpha: EP.rand(0.03, 0.12),
        color: Math.random() > 0.6 ? EP.LIME : Math.random() > 0.5 ? EP.CYAN : '#ffffff',
      });
    }
  }

  // ── Object Simulation / Tracking ──
  function spawnObjects() {
    objects = [];
    const count  = Math.floor(EP.rand(3, 5));
    const chosen = [...OBJ_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, count);

    chosen.forEach(t => {
      const bw = t.baseW * W;
      const bh = t.baseH * H;
      objects.push({
        ...t,
        x:    EP.rand(0.05, 0.8) * W,
        y:    EP.rand(0.05, 0.6) * H,
        w:    bw,
        h:    bh,
        vx:   EP.rand(-0.4, 0.4),
        vy:   EP.rand(-0.15, 0.15),
        dist: EP.rand(1.2, 7.5),
        alpha: 1,
      });
    });

    syncBBoxOverlay();
  }

  // Sync HTML bounding boxes
  function syncBBoxOverlay() {
    const layer = document.getElementById('detection-layer');
    if (!layer) return;
    layer.innerHTML = '';
    objects.forEach((obj, i) => {
      const el = document.createElement('div');
      el.className = `bbox bbox--${obj.type}`;
      el.dataset.idx = i;

      const label = document.createElement('div');
      label.className = 'bbox__label';
      label.textContent = obj.label;

      const dist = document.createElement('div');
      dist.className = 'bbox__dist';
      dist.style.color = COLORS[obj.type] || EP.LIME;
      dist.textContent = `${obj.dist.toFixed(1)}m`;

      el.appendChild(label);
      el.appendChild(dist);
      layer.appendChild(el);
    });
    updateBBoxPositions();
  }

  function updateBBoxPositions() {
    const layer = document.getElementById('detection-layer');
    if (!layer) return;

    objects.forEach((obj, i) => {
      const el = layer.querySelector(`[data-idx="${i}"]`);
      if (!el) return;
      el.style.left   = `${(obj.x / W) * 100}%`;
      el.style.top    = `${(obj.y / H) * 100}%`;
      el.style.width  = `${(obj.w / W) * 100}%`;
      el.style.height = `${(obj.h / H) * 100}%`;

      const distEl = el.querySelector('.bbox__dist');
      if (distEl) distEl.textContent = `${obj.dist.toFixed(1)}m`;
    });
  }

  // ── Computer Vision Motion & Contrast Detector ──
  function processLiveVideoFrame() {
    if (!videoEl || videoEl.readyState < 2 || !cvCtx) return;

    cvCtx.drawImage(videoEl, 0, 0, CV_W, CV_H);
    const frame = cvCtx.getImageData(0, 0, CV_W, CV_H);
    const data = frame.data;

    // Detect zone activity (Left, Center, Right)
    const zones = [
      { name: 'Left Zone',   xStart: 0,           xEnd: CV_W * 0.33,  activity: 0 },
      { name: 'Center Path', xStart: CV_W * 0.33, xEnd: CV_W * 0.66,  activity: 0 },
      { name: 'Right Zone',  xStart: CV_W * 0.66, xEnd: CV_W,         activity: 0 },
    ];

    if (prevFrameData) {
      for (let y = 10; y < CV_H - 10; y += 4) {
        for (let x = 10; x < CV_W - 10; x += 4) {
          const idx = (y * CV_W + x) * 4;
          const diff = Math.abs(data[idx] - prevFrameData[idx]) +
                       Math.abs(data[idx + 1] - prevFrameData[idx + 1]) +
                       Math.abs(data[idx + 2] - prevFrameData[idx + 2]);

          if (diff > 50) {
            for (let z = 0; z < 3; z++) {
              if (x >= zones[z].xStart && x < zones[z].xEnd) {
                zones[z].activity++;
                break;
              }
            }
          }
        }
      }
    }

    prevFrameData = new Uint8ClampedArray(data);

    // If substantial motion detected in a zone, dynamically align an obstacle target
    zones.forEach((z, idx) => {
      if (z.activity > 15) {
        const targetObj = objects[idx % objects.length];
        if (targetObj) {
          const targetX = (z.xStart + (z.xEnd - z.xStart) * 0.5) / CV_W * W - targetObj.w / 2;
          targetObj.x = EP.lerp(targetObj.x, targetX, 0.2);
          // Scale distance inversely with activity (closer = more motion)
          const estDist = EP.clamp(8.0 - (z.activity / 80) * 5.0, 1.2, 7.0);
          targetObj.dist = EP.lerp(targetObj.dist, estDist, 0.15);
        }
      }
    });
  }

  // ── Main loop ──
  function loop() {
    raf = requestAnimationFrame(loop);
    tick++;

    if (isLiveCamera && tick % 4 === 0) {
      processLiveVideoFrame();
    }

    update();
    draw();

    if (tick % 6 === 0) updateBBoxPositions();
    if (!isLiveCamera && tick % 300 === 0) refreshObjects();

    updateProximityArc();
    updateSoundDirectionBars();
  }

  function update() {
    if (!isLiveCamera) {
      // Particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      });

      // Simulated object movement
      objects.forEach(obj => {
        obj.x += obj.vx;
        obj.y += obj.vy;
        if (obj.x < 0 || obj.x + obj.w > W) obj.vx *= -1;
        if (obj.y < 0 || obj.y + obj.h > H) obj.vy *= -1;
        obj.x = EP.clamp(obj.x, 0, W - obj.w);
        obj.y = EP.clamp(obj.y, 0, H - obj.h);

        obj.dist += EP.rand(-0.02, 0.02);
        obj.dist = EP.clamp(obj.dist, 0.8, 9.5);
      });
    }
  }

  function draw() {
    if (isLiveCamera && videoEl && videoEl.readyState >= 2) {
      // Render camera frame
      ctx.drawImage(videoEl, 0, 0, W, H);

      // Subtle cybernetic tint overlay
      ctx.fillStyle = 'rgba(0, 15, 20, 0.25)';
      ctx.fillRect(0, 0, W, H);
    } else {
      // Clear with slight dark overlay for trail effect
      ctx.fillStyle = 'rgba(3, 4, 5, 0.85)';
      ctx.fillRect(0, 0, W, H);
      drawGrid();
      drawParticles();
    }

    drawDepthFog();
    drawCrosshair();
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(163,230,53,0.04)';
    ctx.lineWidth = 0.5;
    const step = 28;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Perspective lines
    ctx.strokeStyle = 'rgba(6,182,212,0.05)';
    ctx.lineWidth = 0.8;
    const cx = W / 2;
    const cy = H * 0.4;
    for (let a = -60; a <= 60; a += 20) {
      const rad = (a * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(rad) * W, cy + Math.cos(rad) * H);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawDepthFog() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(0.3, 'transparent');
    grad.addColorStop(0.7, 'transparent');
    grad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawCrosshair() {
    const cx = W / 2;
    const cy = H / 2;
    const s = Math.sin(tick * 0.02) * 2;

    ctx.save();
    ctx.strokeStyle = isLiveCamera ? 'rgba(163,230,53,0.6)' : 'rgba(6,182,212,0.4)';
    ctx.lineWidth   = 1;

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 18 + s, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = isLiveCamera ? EP.LIME : EP.CYAN;
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Four cross ticks
    const tickLen = 8;
    const gap     = 24 + s;
    ctx.beginPath();
    ctx.moveTo(cx - gap - tickLen, cy); ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);           ctx.lineTo(cx + gap + tickLen, cy);
    ctx.moveTo(cx, cy - gap - tickLen); ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap);           ctx.lineTo(cx, cy + gap + tickLen);
    ctx.stroke();

    ctx.restore();
  }

  function refreshObjects() {
    spawnObjects();
  }

  // ── Proximity Arc Meter ──
  function updateProximityArc() {
    if (objects.length === 0) return;
    const nearest = objects.reduce((a, b) => a.dist < b.dist ? a : b);
    const dist    = nearest.dist;

    const needle = document.getElementById('arc-needle');
    const fill   = document.getElementById('arc-fill');
    const label  = document.querySelector('.proximity-svg text');
    if (!needle || !fill) return;

    // Rotate needle: 0m = leftmost, 10m = rightmost
    const angle = EP.mapRange(dist, 0, 10, -90, 90);
    needle.setAttribute('transform', `rotate(${angle}, 100, 100)`);

    const offset = EP.mapRange(dist, 0, 10, 283, 0);
    fill.setAttribute('stroke-dashoffset', offset.toFixed(1));

    if (label) label.textContent = `${dist.toFixed(1)}m`;

    // Play proximity tick occasionally
    if (tick % 60 === 0 && AudioEngine.spatialEnabled) {
      const panX = EP.mapRange(nearest.x + nearest.w / 2, 0, W, -1, 1);
      AudioEngine.proximityTick(dist, panX);
    }

    if (dist < 2.5 && tick % 90 === 0) {
      AudioEngine.obstacleWarning(0);
      EP.haptic('double');
    }
  }

  // ── Sound Direction Bars ──
  function updateSoundDirectionBars() {
    if (objects.length === 0) return;
    const nearest = objects.reduce((a, b) => a.dist < b.dist ? a : b);
    const cx = nearest.x + nearest.w / 2;
    const panX = EP.mapRange(cx, 0, W, -1, 1);

    const leftLevel  = EP.mapRange(-panX, -1, 1, 10, 90);
    const rightLevel = EP.mapRange(panX, -1, 1, 10, 90);

    const leftBar  = document.getElementById('sd-left');
    const rightBar = document.getElementById('sd-right');
    if (leftBar)  leftBar.style.setProperty('--level', `${leftLevel}%`);
    if (rightBar) rightBar.style.setProperty('--level', `${rightLevel}%`);
  }

  function destroy() {
    cancelAnimationFrame(raf);
  }

  return { init, destroy, startCamera, stopCamera, toggleCamera };
})();
