/* ═══════════════════════════════════════════════════════
   EchoPulse — Settings Controller
   Slide-up modal sheet with persisted user preferences.
═══════════════════════════════════════════════════════ */
'use strict';

const SettingsController = (() => {
  const STORAGE_KEY = 'ep_settings';
  const DEFAULTS = {
    spatialAudio:    true,
    hapticIntensity: 'medium',   // low | medium | high
    sensoryProfile:  'standard', // standard | sensitive | high-threshold
    alertRadius:     5,          // 2 | 5 | 10 (metres)
  };

  let settings = { ...DEFAULTS };
  let sheetEl = null;
  let backdropEl = null;

  function init() {
    load();
    buildDOM();
    injectGearButton();
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) settings = { ...DEFAULTS, ...JSON.parse(saved) };
    } catch (e) {
      settings = { ...DEFAULTS };
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function buildDOM() {
    if (sheetEl) return;

    backdropEl = document.createElement('div');
    backdropEl.className = 'settings-backdrop';
    backdropEl.setAttribute('aria-hidden', 'true');
    backdropEl.addEventListener('click', close);

    sheetEl = document.createElement('div');
    sheetEl.className = 'settings-sheet';
    sheetEl.setAttribute('role', 'dialog');
    sheetEl.setAttribute('aria-modal', 'true');
    sheetEl.setAttribute('aria-label', 'Application Settings');

    sheetEl.innerHTML = `
      <div class="settings-handle" aria-hidden="true"></div>
      <div class="settings-header">
        <span class="settings-title">Settings</span>
        <button class="settings-close-btn" id="settings-close" aria-label="Close settings sheet">✕</button>
      </div>
      <div class="settings-body">

        <div class="settings-section">
          <div class="settings-section-title">Acoustic Feedback</div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="settings-row__left">
                <span class="settings-row__icon" aria-hidden="true">🔊</span>
                <div>
                  <div class="settings-row__label">3D Spatial Sound</div>
                  <div class="settings-row__sublabel">Stereoscopic obstacle pan cues</div>
                </div>
              </div>
              <div class="settings-row__control">
                <label class="toggle-switch" aria-label="Toggle spatial audio engine">
                  <input type="checkbox" id="st-spatial" role="switch" ${settings.spatialAudio ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div class="settings-row">
              <div class="settings-row__left">
                <span class="settings-row__icon" aria-hidden="true">🎵</span>
                <div>
                  <div class="settings-row__label">Tone Pitch Base</div>
                  <div class="settings-row__sublabel">Frequency tuning baseline</div>
                </div>
              </div>
              <div class="settings-row__control">
                <div class="settings-segmented" role="group" aria-label="Tone pitch range">
                  <button class="settings-seg-btn ${settings.hapticIntensity === 'low' ? 'active' : ''}" data-pitch="low">Low</button>
                  <button class="settings-seg-btn ${settings.hapticIntensity === 'medium' ? 'active' : ''}" data-pitch="medium">Mid</button>
                  <button class="settings-seg-btn ${settings.hapticIntensity === 'high' ? 'active' : ''}" data-pitch="high">High</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Sensory & Safety Profile</div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="settings-row__left">
                <span class="settings-row__icon" aria-hidden="true">🧠</span>
                <div>
                  <div class="settings-row__label">Sensory Overload Sensitivity</div>
                  <div class="settings-row__sublabel">Threshold for decibel warnings</div>
                </div>
              </div>
              <div class="settings-row__control">
                <div class="settings-segmented" role="group" aria-label="Sensory profile">
                  <button class="settings-seg-btn ${settings.sensoryProfile === 'sensitive' ? 'active' : ''}" data-profile="sensitive">Sensitive</button>
                  <button class="settings-seg-btn ${settings.sensoryProfile === 'standard' ? 'active' : ''}" data-profile="standard">Standard</button>
                  <button class="settings-seg-btn ${settings.sensoryProfile === 'high-threshold' ? 'active' : ''}" data-profile="high-threshold">High</button>
                </div>
              </div>
            </div>
            <div class="settings-row">
              <div class="settings-row__left">
                <span class="settings-row__icon" aria-hidden="true">📏</span>
                <div>
                  <div class="settings-row__label">Radar Alert Radius</div>
                  <div class="settings-row__sublabel">Proximity warning distance</div>
                </div>
              </div>
              <div class="settings-row__control">
                <div class="settings-segmented" role="group" aria-label="Alert radius">
                  <button class="settings-seg-btn ${settings.alertRadius === 2 ? 'active' : ''}" data-radius="2">2m</button>
                  <button class="settings-seg-btn ${settings.alertRadius === 5 ? 'active' : ''}" data-radius="5">5m</button>
                  <button class="settings-seg-btn ${settings.alertRadius === 10 ? 'active' : ''}" data-radius="10">10m</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Emergency Circle</div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="settings-row__left">
                <span class="settings-row__icon" aria-hidden="true">📞</span>
                <div>
                  <div class="settings-row__label">Emergency Dispatch</div>
                  <div class="settings-row__sublabel">3 active contacts registered</div>
                </div>
              </div>
              <div class="settings-row__control">
                <span style="color:var(--clr-lime);font-size:12px;font-weight:600">Active</span>
              </div>
            </div>
            <div class="settings-row">
              <div class="settings-row__left">
                <span class="settings-row__icon" aria-hidden="true">🎥</span>
                <div>
                  <div class="settings-row__label">Spatial Video SOS Clip</div>
                  <div class="settings-row__sublabel">On-device emergency recording</div>
                </div>
              </div>
              <div class="settings-row__control">
                <div class="settings-segmented" role="group" aria-label="SOS clip duration">
                  <button class="settings-seg-btn" data-clip="3">3s</button>
                  <button class="settings-seg-btn active" data-clip="5">5s</button>
                  <button class="settings-seg-btn" data-clip="10">10s</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">System & Diagnostics</div>
          <div class="settings-card">
            <div class="settings-row">
              <div class="settings-row__left">
                <span class="settings-row__icon" aria-hidden="true">⚡</span>
                <div><div class="settings-row__label">Audio/Haptic Engine Test</div></div>
              </div>
              <div class="settings-row__control">
                <button id="btn-test-haptic" class="settings-seg-btn active" style="padding:4px 10px">Test</button>
              </div>
            </div>
            <div class="settings-row settings-row--danger" id="row-reset-walkthrough" style="cursor:pointer">
              <div class="settings-row__left">
                <span class="settings-row__icon" aria-hidden="true">🔄</span>
                <div>
                  <div class="settings-row__label">Restart Onboarding Flow</div>
                  <div class="settings-row__sublabel">Show guided introduction again</div>
                </div>
              </div>
              <div class="settings-row__control"><span style="color:rgba(255,255,255,0.4);font-size:18px">›</span></div>
            </div>
          </div>
        </div>

        <div class="settings-version">EchoPulse v1.0.0-beta · Acoustic-Tactile Engine · © 2026 Badie Saadi</div>
      </div>
    `;

    document.body.appendChild(backdropEl);
    document.body.appendChild(sheetEl);

    document.getElementById('settings-close').addEventListener('click', close);

    const spatialToggle = document.getElementById('st-spatial');
    if (spatialToggle) {
      spatialToggle.addEventListener('change', e => {
        settings.spatialAudio = e.target.checked;
        if (window.AudioEngine) AudioEngine.setSpatialEnabled(settings.spatialAudio);
        save();
        if (window.EP) EP.toast(settings.spatialAudio ? 'Spatial audio enabled' : 'Spatial audio disabled', '🔊');
      });
    }

    sheetEl.querySelectorAll('[data-pitch]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.settings-segmented').querySelectorAll('.settings-seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        settings.hapticIntensity = btn.dataset.pitch;
        save();
        if (window.EP) EP.haptic('light');
        if (window.AudioEngine) AudioEngine.uiTick('tap');
      });
    });

    sheetEl.querySelectorAll('[data-profile]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.settings-segmented').querySelectorAll('.settings-seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        settings.sensoryProfile = btn.dataset.profile;
        save();
        if (window.EP) {
          EP.haptic('light');
          EP.toast(`Sensory calibration: ${settings.sensoryProfile}`, '🧠', 2500);
        }
      });
    });

    sheetEl.querySelectorAll('[data-radius]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.settings-segmented').querySelectorAll('.settings-seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        settings.alertRadius = parseInt(btn.dataset.radius);
        save();
        if (window.EP) {
          EP.haptic('light');
          EP.toast(`Proximity alert radius set to ${settings.alertRadius}m`, '📏', 2500);
        }
      });
    });

    const testBtn = document.getElementById('btn-test-haptic');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        if (window.AudioEngine) AudioEngine.obstacleWarning(0);
        if (window.EP) {
          EP.haptic('double');
          EP.toast('Haptic & Spatial Audio diagnostics executed', '✓');
        }
      });
    }

    const resetRow = document.getElementById('row-reset-walkthrough');
    if (resetRow) {
      resetRow.addEventListener('click', () => {
        localStorage.removeItem('ep_onboarded');
        close();
        if (window.OnboardingFlow) OnboardingFlow.init();
        if (window.EP) EP.toast('Onboarding flow reset', '🔄');
      });
    }
  }

  function injectGearButton() {
    const headerRight = document.querySelector('.radar-header__right');
    if (!headerRight || document.querySelector('.settings-gear-btn')) return;

    const gearBtn = document.createElement('button');
    gearBtn.className = 'settings-gear-btn';
    gearBtn.setAttribute('aria-label', 'Open application settings');
    gearBtn.setAttribute('title', 'Settings');
    gearBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    `;
    gearBtn.addEventListener('click', open);
    headerRight.insertBefore(gearBtn, headerRight.firstChild);
  }

  function open() {
    if (window.AudioEngine) AudioEngine.uiTick('select');
    if (window.EP) EP.haptic('light');
    if (backdropEl) backdropEl.classList.add('open');
    if (sheetEl) {
      sheetEl.classList.add('open');
      sheetEl.setAttribute('aria-hidden', 'false');
    }
  }

  function close() {
    if (window.AudioEngine) AudioEngine.uiTick('tap');
    if (backdropEl) backdropEl.classList.remove('open');
    if (sheetEl) {
      sheetEl.classList.remove('open');
      sheetEl.setAttribute('aria-hidden', 'true');
    }
  }

  return {
    init,
    open,
    close,
    get settings() { return { ...settings }; }
  };
})();
