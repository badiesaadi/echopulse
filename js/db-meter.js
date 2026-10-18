/* ═══════════════════════════════════════════════════════
   EchoPulse — dB Meter Controller
   Simulates live microphone dB readings with:
   - Dynamic value oscillation
   - Sensory overload badge + warning
   - Ear health dose tracking
   - Bar + needle position
═══════════════════════════════════════════════════════ */
'use strict';

const DBMeter = (() => {
  let currentDB  = 62;
  let targetDB   = 62;
  let exposureSec = 720; // 12 minutes in seconds
  let tick = 0;

  // dB level scenarios (cycles)
  const SCENARIOS = [
    { db: 58, label: 'Quiet',    badge: 'SAFE',     badgeClass: '' },
    { db: 66, label: 'Moderate', badge: 'NORMAL',   badgeClass: '' },
    { db: 78, label: 'Loud',     badge: 'ELEVATED',  badgeClass: 'warn' },
    { db: 91, label: 'Very Loud',badge: 'HIGH RISK', badgeClass: 'danger' },
    { db: 64, label: 'Moderate', badge: 'NORMAL',   badgeClass: '' },
  ];
  let scenarioIdx = 0;
  let scenarioTimer = null;

  function init() {
    update();
    setInterval(tick_update, 100);
    scenarioTimer = setInterval(advanceScenario, 8000);
    setInterval(updateExposureTimer, 1000);
  }

  function tick_update() {
    tick++;
    // Small random oscillation around target
    const noise = EP.rand(-1.5, 1.5);
    currentDB = EP.lerp(currentDB, targetDB + noise, 0.12);
    currentDB = EP.clamp(currentDB, 0, 120);
    update();
  }

  function advanceScenario() {
    scenarioIdx = (scenarioIdx + 1) % SCENARIOS.length;
    const sc = SCENARIOS[scenarioIdx];
    targetDB = sc.db;

    if (sc.badgeClass === 'danger') {
      AudioEngine.obstacleWarning(0);
      EP.haptic('warning');
      document.getElementById('sensory-warning').classList.remove('hidden');
      EP.toast('⚠ High noise — Sensory overload risk', '🔊', 4000);
    } else {
      document.getElementById('sensory-warning').classList.add('hidden');
    }

    if (sc.badgeClass === 'warn') {
      AudioEngine.uiTick('error');
      EP.haptic('medium');
    }
  }

  function update() {
    const db    = Math.round(currentDB);
    const pct   = currentDB / 120;

    // Update value display
    const valEl  = document.getElementById('db-value');
    const barEl  = document.getElementById('db-bar-fill');
    const needle = document.getElementById('db-bar-needle');
    const badge  = document.getElementById('sensory-badge');
    const labelEl = document.getElementById('db-label');
    if (!valEl) return;

    valEl.textContent = db;
    if (barEl)  barEl.style.width  = `${pct * 100}%`;
    if (needle) needle.style.left  = `${pct * 100}%`;

    // Color shift
    let color;
    if (db < 60)       color = EP.LIME;
    else if (db < 80)  color = EP.AMBER;
    else if (db < 100) color = '#f97316';
    else               color = EP.DANGER;
    valEl.style.color = color;

    // Badge
    const sc = SCENARIOS[scenarioIdx];
    if (badge) {
      badge.textContent = sc.badge;
      badge.className   = `sensory-badge ${sc.badgeClass}`;
    }
    if (labelEl) labelEl.textContent = sc.label;

    // ARIA update
    const barContainer = document.querySelector('.db-bar-container');
    if (barContainer) barContainer.setAttribute('aria-valuenow', db);
  }

  function updateExposureTimer() {
    exposureSec++;

    // Calculate based on 85dB reference (NIOSH formula)
    const permittedSec = 28800 / Math.pow(2, (currentDB - 85) / 3);
    const safeRemaining = Math.max(0, permittedSec - exposureSec);

    const expEl  = document.getElementById('exposure-time');
    const safeEl = document.getElementById('safe-limit');
    const doseEl = document.getElementById('dose-pct');
    const doseFill = document.getElementById('ear-dose-fill');
    const healthStatus = document.getElementById('ear-health-status');

    if (expEl) expEl.textContent = formatTime(exposureSec);
    if (safeEl) safeEl.textContent = formatTime(Math.round(safeRemaining));

    const dosePct = EP.clamp((exposureSec / permittedSec) * 100, 0, 100);
    if (doseEl) doseEl.textContent = `${Math.round(dosePct)}%`;
    if (doseFill) doseFill.style.width = `${dosePct}%`;

    if (healthStatus) {
      if (dosePct < 50) {
        healthStatus.textContent = '✓ OK';
        healthStatus.className = 'ear-health-status status--ok';
      } else if (dosePct < 85) {
        healthStatus.textContent = '⚠ Caution';
        healthStatus.className = 'ear-health-status status--warn';
      } else {
        healthStatus.textContent = '⛔ Limit';
        healthStatus.className = 'ear-health-status status--danger';
      }
    }
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return { init };
})();
