/* ═══════════════════════════════════════════════════════
   EchoPulse — Emergency Module
   Dual Mode:
   1. Real GPS Geolocation & Telemetry Tracking
   2. Simulated GPS drift fallback
   SOS slide trigger, sound beacon, and broadcast payload
═══════════════════════════════════════════════════════ */
'use strict';

const EmergencyModule = (() => {
  let gpsInterval = null;
  let baseCoords  = { lat: 51.5074, lon: -0.1278, acc: 3 };
  let sosActive   = false;
  let isLiveGPS   = false;

  function init() {
    updateStatusTime();
    setInterval(updateStatusTime, 30000);

    // Initialize real geolocation
    HardwareSensors.initGeolocation();
    HardwareSensors.on('geolocation', data => {
      if (data && data.active && data.coords) {
        isLiveGPS = true;
        baseCoords.lat = data.coords.latitude;
        baseCoords.lon = data.coords.longitude;
        baseCoords.acc = data.coords.accuracy || 5;
        updateUI();
        updateBroadcastStatus('GPS: LIVE 📡', true);
      }
    });

    // Start fallback simulation if real GPS is not yet acquired
    startGPSSimulation();
  }

  function startGPSSimulation() {
    updateUI();
    gpsInterval = setInterval(() => {
      if (!isLiveGPS) {
        // Small random drift in simulation mode
        baseCoords.lat += EP.rand(-0.0001, 0.0001);
        baseCoords.lon += EP.rand(-0.0001, 0.0001);
        updateUI();
      }
    }, 3000);
  }

  function updateUI() {
    const latEl = document.getElementById('gps-lat');
    const lonEl = document.getElementById('gps-lon');
    const accEl = document.getElementById('gps-acc');

    const latDir = baseCoords.lat >= 0 ? 'N' : 'S';
    const lonDir = baseCoords.lon >= 0 ? 'E' : 'W';

    if (latEl) latEl.textContent = `${Math.abs(baseCoords.lat).toFixed(4)}° ${latDir}`;
    if (lonEl) lonEl.textContent = `${Math.abs(baseCoords.lon).toFixed(4)}° ${lonDir}`;
    if (accEl) accEl.textContent = `±${Math.round(baseCoords.acc)}m`;
  }

  function updateBroadcastStatus(text, live = false) {
    const textEl = document.querySelector('#broadcast-status span:last-child');
    const dotEl  = document.querySelector('.broadcast-dot');
    if (textEl) textEl.textContent = text;
    if (dotEl && live) dotEl.style.background = EP.LIME;
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

    const mapsUrl = `https://www.google.com/maps?q=${baseCoords.lat.toFixed(6)},${baseCoords.lon.toFixed(6)}`;
    const msg = `EMERGENCY ALERT — EchoPulse user needs assistance at: ${mapsUrl}`;

    console.log('[EchoPulse SOS] Broadcast payload:', {
      timestamp: new Date().toISOString(),
      location: baseCoords,
      mapsUrl,
      message: msg,
    });

    // Try copying emergency link to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }

    EP.toast(`🆘 Emergency SOS Broadcasted! [GPS: ${baseCoords.lat.toFixed(4)}, ${baseCoords.lon.toFixed(4)}]`, '🆘', 6000);

    // Auto-reset broadcast visual indicator after 10s
    setTimeout(() => {
      sosActive = false;
      if (dot)  dot.classList.remove('active');
      if (text) text.textContent = isLiveGPS ? 'GPS: LIVE 📡' : 'Ready';
    }, 10000);
  }

  function updateStatusTime() {
    const el = document.getElementById('status-time');
    if (el) el.textContent = EP.timeString();
  }

  return { init, activateSOS, getCoords: () => ({ ...baseCoords }) };
})();
