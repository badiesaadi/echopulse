/* ═══════════════════════════════════════════════════════
   EchoPulse — Radar Canvas Renderer
   Simulated camera feed with:
   - Animated particle background (depth cues)
   - Moving object bounding boxes with labels
   - LiDAR-style depth grid
   - Proximity arc needle animation
═══════════════════════════════════════════════════════ */
'use strict';

const RadarRenderer = (() => {
  let canvas, ctx, raf;
  let W, H;
  let particles = [];
  let objects   = [];
  let tick = 0;

  // Object definitions (simulated detection)
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
    resize();
    spawnObjects();
    spawnParticles();
    loop();

    window.addEventListener('resize', EP.debounce(resize, 200));
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width  = rect.width  || 390;
    H = canvas.height = rect.height || 300;
    particles = [];
    spawnParticles();
  }

  // ── Particles (depth fog) ──
  function spawnParticles() {
    for (let i = 0; i < 60; i++) {
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

  // ── Object Simulation ──
  function spawnObjects() {
    objects = [];
    // Pick 3–5 random objects
    const count  = Math.floor(EP.rand(3, 5));
    const chosen = [...OBJ_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, count);

    chosen.forEach((t, i) => {
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
        pulsePhase: Math.random() * Math.PI * 2,
      });
    });

    syncBBoxOverlay();
  }

  // Sync HTML bounding boxes
  function syncBBoxOverlay() {
    const layer = document.getElementById('detection-layer');
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
      dist.style.color = COLORS[obj.type];
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
      el.style.left   = `${obj.x / W * 100}%`;
      el.style.top    = `${obj.y / H * 100}%`;
      el.style.width  = `${obj.w / W * 100}%`;
      el.style.height = `${obj.h / H * 100}%`;

      // Update distance label
      const distEl = el.querySelector('.bbox__dist');
      if (distEl) distEl.textContent = `${obj.dist.toFixed(1)}m`;
    });
  }

  // ── Main loop ──
  function loop() {
    raf = requestAnimationFrame(loop);
    tick++;
    update();
    draw();
    if (tick % 6 === 0) updateBBoxPositions();
    if (tick % 300 === 0) refreshObjects();
    updateProximityArc();
    updateSoundDirectionBars();
  }

  function update() {
    // Move particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    });

    // Move objects
    objects.forEach(obj => {
      obj.x += obj.vx;
      obj.y += obj.vy;

      // Bounce off edges
      if (obj.x < 0 || obj.x + obj.w > W) obj.vx *= -1;
      if (obj.y < 0 || obj.y + obj.h > H) obj.vy *= -1;
      obj.x = EP.clamp(obj.x, 0, W - obj.w);
      obj.y = EP.clamp(obj.y, 0, H - obj.h);

      // Slowly drift distance
      obj.dist += EP.rand(-0.02, 0.02);
      obj.dist = EP.clamp(obj.dist, 0.8, 9.5);
    });
  }

  function draw() {
    // Clear with slight dark overlay for trail effect
    ctx.fillStyle = 'rgba(3, 4, 5, 0.85)';
    ctx.fillRect(0, 0, W, H);

    drawGrid();
    drawParticles();
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
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(0.3, 'transparent');
    grad.addColorStop(0.7, 'transparent');
    grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawCrosshair() {
    const cx = W / 2;
    const cy = H / 2;
    const s = Math.sin(tick * 0.02) * 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(163,230,53,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(cx - 20 - s, cy);
    ctx.lineTo(cx + 20 + s, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - 20 - s);
    ctx.lineTo(cx, cy + 20 + s);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();
  }

  // Refresh objects periodically
  function refreshObjects() {
    // Occasionally add/remove objects for realism
    if (Math.random() > 0.5 && objects.length < 6) {
      const t = OBJ_TEMPLATES[Math.floor(Math.random() * OBJ_TEMPLATES.length)];
      objects.push({
        ...t,
        x: EP.rand(0.05, 0.8) * W,
        y: EP.rand(0.05, 0.6) * H,
        w: t.baseW * W,
        h: t.baseH * H,
        vx: EP.rand(-0.4, 0.4),
        vy: EP.rand(-0.15, 0.15),
        dist: EP.rand(1.2, 7.5),
        pulsePhase: 0,
      });
      syncBBoxOverlay();
    }
  }

  // ── Proximity Arc ──
  function updateProximityArc() {
    if (objects.length === 0) return;
    const nearest = objects.reduce((a, b) => a.dist < b.dist ? a : b);
    const dist = nearest.dist;

    // Update arc needle
    const needle = document.getElementById('arc-needle');
    const fill   = document.getElementById('arc-fill');
    const label  = document.querySelector('.proximity-svg text');
    if (!needle) return;

    // Rotate needle: 0m = leftmost, 10m = rightmost
    const angle = EP.mapRange(dist, 0, 10, -90, 90);
    needle.setAttribute('transform', `rotate(${angle}, 100, 100)`);

    // Stroke offset
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
    const panX = EP.mapRange(cx, 0, W, -1, 1); // -1 = full left, +1 = full right

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

  return { init, destroy };
})();
