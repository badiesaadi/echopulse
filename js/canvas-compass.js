/* ═══════════════════════════════════════════════════════
   EchoPulse — Compass Canvas Renderer
   Animated rotating compass ring with degree marks,
   cardinal labels, and bearing indicator
═══════════════════════════════════════════════════════ */
'use strict';

const CompassRenderer = (() => {
  let canvas, ctx;
  let W = 110, H = 110;
  let bearing = 47; // degrees
  let targetBearing = 47;
  let tick = 0;
  let raf;

  const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const STEPS = [
    { bearing: 47,  label: 'NE', text: 'Bear northeast on Main Corridor', dist: '~18m' },
    { bearing: 90,  label: 'E',  text: 'Turn right — East Wing',         dist: '~32m' },
    { bearing: 355, label: 'N',  text: 'Continue straight — Lobby',      dist: '~10m' },
  ];
  let stepIdx = 0;

  function init() {
    canvas = document.getElementById('compass-canvas');
    if (!canvas) return;
    canvas.width  = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    loop();

    // Auto-advance steps
    setInterval(advanceStep, 6000);
  }

  function advanceStep() {
    stepIdx = (stepIdx + 1) % STEPS.length;
    const step = STEPS[stepIdx];
    targetBearing = step.bearing;

    const bearingEl = document.getElementById('compass-bearing');
    const degEl     = document.getElementById('compass-deg');
    const stepEl    = document.getElementById('compass-step');

    if (bearingEl) bearingEl.textContent = step.label;
    if (degEl)     degEl.textContent     = `${step.bearing}°`;
    if (stepEl) {
      stepEl.querySelector('.step-arrow').textContent = getBearingArrow(step.bearing);
      stepEl.querySelector('.step-text').textContent  = step.text;
      stepEl.querySelector('.step-dist').textContent  = step.dist;
    }

    AudioEngine.navigationStep();
    EP.haptic('medium');
  }

  function getBearingArrow(deg) {
    const dirs = ['↑','↗','→','↘','↓','↙','←','↖','↑'];
    return dirs[Math.round(deg / 45) % 8];
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    tick += 0.01;

    // Smooth bearing interpolation
    const diff = targetBearing - bearing;
    bearing += diff * 0.04;

    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const R  = W / 2 - 6;

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Tick marks
    for (let i = 0; i < 72; i++) {
      const angle   = (i / 72) * Math.PI * 2 - (bearing * Math.PI) / 180;
      const isMain  = i % 9 === 0;
      const isMinor = i % 3 === 0;
      const outerR  = R;
      const innerR  = R - (isMain ? 10 : isMinor ? 6 : 3);
      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * outerR;
      const y2 = cy + Math.sin(angle) * outerR;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isMain
        ? 'rgba(163,230,53,0.7)'
        : isMinor
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(255,255,255,0.07)';
      ctx.lineWidth = isMain ? 1.5 : 0.7;
      ctx.stroke();
    }

    // Cardinal letters (N, NE, E, …)
    ctx.font = 'bold 8px "Inter", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    CARDINALS.forEach((label, idx) => {
      const angle  = (idx / 8) * Math.PI * 2 - (bearing * Math.PI) / 180 - Math.PI / 2;
      const lR     = R - 16;
      const lx     = cx + Math.cos(angle) * lR;
      const ly     = cy + Math.sin(angle) * lR;

      ctx.fillStyle = label === 'N' ? EP.LIME : 'rgba(255,255,255,0.35)';
      ctx.fillText(label, lx, ly);
    });

    // North indicator glow
    const northAngle = -Math.PI / 2 - (bearing * Math.PI) / 180;
    const nGlowX = cx + Math.cos(northAngle) * (R - 5);
    const nGlowY = cy + Math.sin(northAngle) * (R - 5);

    const northGlow = ctx.createRadialGradient(nGlowX, nGlowY, 0, nGlowX, nGlowY, 12);
    northGlow.addColorStop(0, 'rgba(163,230,53,0.3)');
    northGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = northGlow;
    ctx.beginPath();
    ctx.arc(nGlowX, nGlowY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(163,230,53,0.4)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = EP.LIME;
    ctx.fill();
  }

  function destroy() { cancelAnimationFrame(raf); }

  return { init, destroy };
})();
