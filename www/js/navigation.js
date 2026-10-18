/* ═══════════════════════════════════════════════════════
   EchoPulse — Navigation Controller
   Bottom tab switching with spring transitions
   Screen management and active state tracking
═══════════════════════════════════════════════════════ */
'use strict';

const NavController = (() => {
  const SCREENS = {
    radar:      { nav: 'nav-radar',      screen: 'screen-radar' },
    acoustic:   { nav: 'nav-acoustic',   screen: 'screen-acoustic' },
    pathfinder: { nav: 'nav-pathfinder', screen: 'screen-pathfinder' },
    emergency:  { nav: 'nav-emergency',  screen: 'screen-emergency' },
  };

  let current = 'radar';

  function init() {
    Object.keys(SCREENS).forEach(key => {
      const navBtn = document.getElementById(SCREENS[key].nav);
      if (navBtn) {
        let touchTriggered = false;

        navBtn.addEventListener('touchend', (e) => {
          touchTriggered = true;
          navigate(key);
          setTimeout(() => { touchTriggered = false; }, 300);
        }, { passive: true });

        navBtn.addEventListener('click', (e) => {
          if (!touchTriggered) {
            navigate(key);
          }
        });
      }
    });
  }

  function navigate(key) {
    if (key === current) return;
    AudioEngine.uiTick('select');
    EP.haptic('light');

    // Deactivate current
    const prevNav    = document.getElementById(SCREENS[current].nav);
    const prevScreen = document.getElementById(SCREENS[current].screen);
    if (prevNav) {
      prevNav.classList.remove('nav-item--active');
      prevNav.setAttribute('aria-current', 'false');
    }
    if (prevScreen) {
      prevScreen.classList.remove('active');
      prevScreen.setAttribute('hidden', '');
    }

    // Activate new
    current = key;
    const newNav    = document.getElementById(SCREENS[key].nav);
    const newScreen = document.getElementById(SCREENS[key].screen);
    if (newNav) {
      newNav.classList.add('nav-item--active');
      newNav.setAttribute('aria-current', 'page');
    }
    if (newScreen) {
      newScreen.removeAttribute('hidden');
      // Force reflow for animation
      newScreen.offsetHeight;
      newScreen.classList.add('active');
    }

    // Screen-specific activations
    if (key === 'acoustic') {
      SpectrumRenderer.init && SpectrumRenderer.init();
    }
    if (key === 'pathfinder') {
      CompassRenderer.init && CompassRenderer.init();
    }
  }

  return { init, navigate };
})();
