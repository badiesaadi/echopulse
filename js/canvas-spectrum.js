/* ═══════════════════════════════════════════════════════
   EchoPulse — Frequency Spectrum Visualizer
   Animated canvas FFT-style spectrum display
   with animated bars grouped by Low/Mid/High bands
═══════════════════════════════════════════════════════ */
'use strict';

const SpectrumRenderer = (() => {
  let canvas, ctx, raf;
  let W, H;
  let tick = 0;
  const BAR_COUNT = 40;
  let bars = [];

  // Band color mapping
  const BANDS = [
    { end: Math.floor(BAR_COUNT * 0.25), color: EP.CYAN   }, // Low
    { end: Math.floor(BAR_COUNT * 0.70), color: EP.LIME   }, // Mid
    { end: BAR_COUNT,                    color: EP.AMBER   }, // High
  ];

  // Simulated noise source profiles (frequency envelopes)
  const PROFILES = {
    hvac:    (i, t) => Math.sin(i * 0.4 + t * 0.5) * 0.3 + 0.4 + Math.sin(t * 2 + i) * 0.1,
    traffic: (i, t) => Math.exp(-i * 0.05) * (0.6 + Math.sin(t * 3 + i * 0.2) * 0.2),
    crowd:   (i, t) => Math.sin(i * 0.3 + t) * 0.25 + 0.35 + EP.rand(0, 0.1),
  };

  let activeProfile = 'hvac';
  let targetBars = new Array(BAR_COUNT).fill(0);

  function init() {
    canvas = document.getElementById('spectrum-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // Set actual pixel size
    const container = canvas.parentElement;
    canvas.width  = container.clientWidth  || 350;
    canvas.height = container.clientHeight || 80;
    W = canvas.width;
    H = canvas.height;

    bars = new Array(BAR_COUNT).fill(0.1);
    loop();
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    tick += 0.04;
    updateBars();
    draw();
  }

  function updateBars() {
    const t = tick;
    const profileFn = PROFILES[activeProfile] || PROFILES.hvac;
    const dbVal = parseInt(document.getElementById('db-value')?.textContent || '62');
    const gain  = EP.mapRange(dbVal, 0, 120, 0.2, 1.0);

    for (let i = 0; i < BAR_COUNT; i++) {
      targetBars[i] = EP.clamp(profileFn(i, t) * gain + EP.rand(-0.05, 0.05), 0.02, 1.0);
      bars[i] = EP.lerp(bars[i], targetBars[i], 0.15);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    const barW   = W / BAR_COUNT;
    const gap    = 1.5;
    const bw     = barW - gap;

    for (let i = 0; i < BAR_COUNT; i++) {
      const x   = i * barW;
      const bh  = bars[i] * H;
      const y   = H - bh;

      // Determine band color
      let color = EP.LIME;
      for (const band of BANDS) {
        if (i < band.end) { color = band.color; break; }
      }

      // Gradient for each bar
      const grad = ctx.createLinearGradient(x, H, x, y);
      grad.addColorStop(0, color + 'cc');
      grad.addColorStop(1, color + '44');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x + gap / 2, y, bw, bh, [2, 2, 0, 0]);
      ctx.fill();

      // Peak cap
      const peakY = y - 2;
      ctx.fillStyle = color;
      ctx.fillRect(x + gap / 2, peakY, bw, 2);
    }

    // Horizontal grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 0.5;
    [0.25, 0.5, 0.75].forEach(pct => {
      const y = H * (1 - pct);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    });

    // Frequency cursor line (follows time)
    const cursorX = (tick * 8) % W;
    ctx.strokeStyle = 'rgba(163,230,53,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, H);
    ctx.stroke();
  }

  function setProfile(name) {
    if (PROFILES[name]) activeProfile = name;
  }

  function destroy() { cancelAnimationFrame(raf); }

  return { init, setProfile, destroy };
})();
