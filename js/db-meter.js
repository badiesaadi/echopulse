/* ═══════════════════════════════════════════════════════
   EchoPulse — dB Meter Controller
   Dual Mode:
   1. Live Microphone analysis via Web Audio Analyser (Real RMS & dB SPL)
   2. Automated Realistic Acoustic Scenarios Simulation
   - Dynamic real-time meter oscillation
   - Sensory overload badge + warning
   - NIOSH ear health dose tracking
   - Bar + needle position
═══════════════════════════════════════════════════════ */
'use strict';

const DBMeter = (() => {
  let currentDB  = 62;
  let targetDB   = 62;
  let exposureSec = 720; // 12 minutes in seconds
  let tick = 0;
  let isLiveMic = false;

  // dB level scenarios (cycles for simulation fallback)
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

    // Bind microphone toggle
    const micBtn = document.getElementById('btn-mic-toggle');
    if (micBtn) {
      micBtn.addEventListener('click', toggleLiveMic);
    }

    // Auto-attempt mic if already granted
    HardwareSensors.on('mic', data => {
      isLiveMic = data.active;
      updateMicUI(data.active);
    });
  }

  async function toggleLiveMic() {
    if (isLiveMic) {
      isLiveMic = false;
      updateMicUI(false);
      EP.toast('Switched to simulated acoustic profile', '🎙️', 2000);
    } else {
      const ok = await HardwareSensors.initMicrophone();
      if (ok) {
        isLiveMic = true;
        updateMicUI(true);
        EP.toast('Live microphone connected — Monitoring room dB', '🎙️', 3000);
      } else {
        EP.toast('Microphone access denied — using simulation', '⚠', 3000);
      }
    }
  }

  function updateMicUI(live) {
    const badge = document.getElementById('mic-mode-badge');
    const dot = document.getElementById('mic-live-dot');
    const btn = document.getElementById('btn-mic-toggle');

    if (badge) {
      badge.textContent = live ? 'LIVE MIC' : 'SIM';
      badge.style.color = live ? EP.LIME : 'rgba(255,255,255,0.6)';
    }
    if (dot) {
      dot.style.display = live ? 'inline-block' : 'none';
      dot.classList.toggle('active', live);
    }
    if (btn) {
      btn.style.color = live ? EP.LIME : '';
      btn.setAttribute('aria-pressed', live ? 'true' : 'false');
    }
  }

  function tick_update() {
    tick++;

    if (isLiveMic) {
      const liveDb = HardwareSensors.getLiveDecibels();
      if (liveDb !== null) {
        currentDB = EP.lerp(currentDB, liveDb, 0.25);
      }
    } else {
      // Small random oscillation around target in simulation
      const noise = EP.rand(-1.5, 1.5);
      currentDB = EP.lerp(currentDB, targetDB + noise, 0.12);
    }

    currentDB = EP.clamp(currentDB, 0, 120);
    update();
  }

  function advanceScenario() {
    if (isLiveMic) return; // Do not auto-advance scenarios when measuring real microphone!

    scenarioIdx = (scenarioIdx + 1) % SCENARIOS.length;
    const sc = SCENARIOS[scenarioIdx];
    targetDB = sc.db;

    if (sc.badgeClass === 'danger') {
      AudioEngine.obstacleWarning(0);
      EP.haptic('warning');
      document.getElementById('sensory-warning')?.classList.remove('hidden');
      EP.toast('⚠ High noise — Sensory overload risk', '🔊', 4000);
    } else {
      document.getElementById('sensory-warning')?.classList.add('hidden');
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
    const valEl     = document.getElementById('db-value');
    const barEl     = document.getElementById('db-bar-fill');
    const needle    = document.getElementById('db-bar-needle');
    const badge     = document.getElementById('sensory-badge');
    const labelEl   = document.getElementById('db-label');
    const warnAlert = document.getElementById('sensory-warning');
    if (!valEl) return;

    valEl.textContent = db;
    if (barEl)  barEl.style.width  = `${pct * 100}%`;
    if (needle) needle.style.left  = `${pct * 100}%`;

    // Dynamic sensory badge & labels
    let label = 'Moderate';
    let badgeText = 'NORMAL';
    let badgeClass = '';
    let color = EP.LIME;

    if (db < 60) {
      label = 'Quiet';
      badgeText = 'SAFE';
      color = EP.LIME;
    } else if (db < 75) {
      label = 'Moderate';
      badgeText = 'NORMAL';
      color = EP.AMBER;
    } else if (db < 85) {
      label = 'Loud';
      badgeText = 'ELEVATED';
      badgeClass = 'warn';
      color = '#f97316';
    } else {
      label = 'Very Loud';
      badgeText = 'HIGH RISK';
      badgeClass = 'danger';
      color = EP.DANGER;
    }

    valEl.style.color = color;
    if (badge) {
      badge.textContent = badgeText;
      badge.className   = `sensory-badge ${badgeClass}`;
    }
    if (labelEl) labelEl.textContent = label;

    // Sensory alert visibility
    if (warnAlert) {
      if (db >= 85) {
        warnAlert.classList.remove('hidden');
        if (tick % 50 === 0) EP.haptic('warning');
      } else {
        warnAlert.classList.add('hidden');
      }
    }

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

  return { init, toggleLiveMic };
})();
