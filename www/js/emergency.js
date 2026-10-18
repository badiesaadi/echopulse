/* ═══════════════════════════════════════════════════════
   EchoPulse — Emergency Module
   GPS simulation, contact pings, SOS state management
═══════════════════════════════════════════════════════ */
'use strict';

const EmergencyModule = (() => {
  let gpsInterval = null;
  let baseCoords  = { lat: 51.5074, lon: -0.1278 };
  let sosActive   = false;

  function init() {
    startGPSSimulation();
    updateStatusTime();
    setInterval(updateStatusTime, 30000);
  }

  function startGPSSimulation() {
    updateCoords();
    gpsInterval = setInterval(updateCoords, 3000);
  }

  function updateCoords() {
    // Tiny random drift to simulate GPS position updates
    baseCoords.lat += EP.rand(-0.0001, 0.0001);
    baseCoords.lon += EP.rand(-0.0001, 0.0001);

    const latEl = document.getElementById('gps-lat');
    const lonEl = document.getElementById('gps-lon');
    if (latEl) latEl.textContent = `${Math.abs(baseCoords.lat).toFixed(4)}° N`;
    if (lonEl) lonEl.textContent = `${Math.abs(baseCoords.lon).toFixed(4)}° W`;
  }

  function activateSOS() {
    if (sosActive) return;
    sosActive = true;

    EP.haptic('heavy');
    AudioEngine.sosAlarm();

    const dot  = document.querySelector('.broadcast-dot');
    const text = document.querySelector('#broadcast-status span:last-child');
    if (dot)  dot.classList.add('active');
    if (text) text.textContent = 'Broadcasting…';

    EP.toast('🆘 Emergency broadcast sent to 3 contacts', '🆘', 6000);

    // Auto-reset after 10s for demo purposes
    setTimeout(() => {
      sosActive = false;
      if (dot)  dot.classList.remove('active');
      if (text) text.textContent = 'Ready';
    }, 10000);
  }

  function updateStatusTime() {
    const el = document.getElementById('status-time');
    if (el) el.textContent = EP.timeString();
  }

  return { init, activateSOS };
})();
