/* ═══════════════════════════════════════════════════════
   EchoPulse — Onboarding Flow
   Shows on first launch, persists completion to localStorage.
   Creates DOM dynamically, supports swipe & button navigation.
═══════════════════════════════════════════════════════ */
'use strict';

const OnboardingFlow = (() => {
  const STORAGE_KEY = 'ep_onboarded';
  let currentStep = 0;
  let overlay = null;
  let slidesEl = null;
  let dots = [];

  const STEPS = [
    {
      emoji: '🎯',
      title: 'Spatial <span>Radar</span>',
      subtitle: 'EchoPulse translates immediate physical surroundings into dynamic 3D directional audio and haptic cues.',
      features: [
        'Real-time object detection HUD (steps, hazards, doors)',
        'Distance-to-frequency spatial audio mapping',
        'Left & right ear stereoscopic panning',
      ],
      accentClass: 'onboarding-card--1',
    },
    {
      emoji: '〜',
      title: 'Acoustic <span>Intelligence</span>',
      subtitle: 'Continuous ambient decibel monitoring and sensory overload warnings designed for neurodivergent comfort.',
      features: [
        'Live decibel meter with color risk thresholds',
        'Frequency spectrum (HVAC, traffic, speech resonance)',
        'NIOSH-calibrated ear health dose tracker',
      ],
      accentClass: 'onboarding-card--2',
    },
    {
      emoji: '⚡',
      title: 'Emergency <span>Ready</span>',
      subtitle: 'Tactile SOS triggers broadcast live coordinates and spatial recordings to your trusted emergency circle.',
      features: [
        'Slide-to-activate tactile SOS track',
        '3-finger hold rapid emergency guidance',
        'Companion mode with GPS breadcrumbs',
      ],
      accentClass: 'onboarding-card--3',
    },
  ];

  function init() {
    if (localStorage.getItem(STORAGE_KEY)) return;
    buildDOM();
  }

  function buildDOM() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'EchoPulse Welcome Onboarding');

    const trackOuter = document.createElement('div');
    trackOuter.className = 'onboarding-track-outer';

    slidesEl = document.createElement('div');
    slidesEl.className = 'onboarding-slides';

    STEPS.forEach((step, i) => {
      const card = document.createElement('div');
      card.className = `onboarding-card ${step.accentClass}`;
      card.setAttribute('aria-label', `Step ${i + 1} of ${STEPS.length}`);

      const emoji = document.createElement('div');
      emoji.className = 'onboarding-card__emoji';
      emoji.setAttribute('aria-hidden', 'true');
      emoji.textContent = step.emoji;

      const title = document.createElement('h2');
      title.className = 'onboarding-card__title';
      title.innerHTML = step.title;

      const subtitle = document.createElement('p');
      subtitle.className = 'onboarding-card__subtitle';
      subtitle.textContent = step.subtitle;

      const list = document.createElement('ul');
      list.className = 'onboarding-card__feature-list';
      step.features.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        list.appendChild(li);
      });

      card.appendChild(emoji);
      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(list);
      slidesEl.appendChild(card);
    });

    trackOuter.appendChild(slidesEl);
    overlay.appendChild(trackOuter);

    const nav = document.createElement('div');
    nav.className = 'onboarding-nav';

    const dotsRow = document.createElement('div');
    dotsRow.className = 'onboarding-dots';
    dotsRow.setAttribute('role', 'tablist');
    dotsRow.setAttribute('aria-label', 'Onboarding steps');
    dots = [];
    STEPS.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'onboarding-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      dot.setAttribute('aria-label', `Step ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dot.addEventListener('touchend', (e) => { e.preventDefault(); goTo(i); }, { passive: false });
      dots.push(dot);
      dotsRow.appendChild(dot);
    });

    const btnRow = document.createElement('div');
    btnRow.className = 'onboarding-btn-row';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'onboarding-btn-skip';
    skipBtn.textContent = 'Skip';
    skipBtn.setAttribute('aria-label', 'Skip onboarding walkthrough');
    skipBtn.addEventListener('click', complete);
    skipBtn.addEventListener('touchend', (e) => { e.preventDefault(); complete(); }, { passive: false });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'onboarding-btn-primary';
    nextBtn.id = 'ob-next-btn';
    nextBtn.textContent = 'Next';
    nextBtn.setAttribute('aria-label', 'Next step');
    nextBtn.addEventListener('click', next);
    nextBtn.addEventListener('touchend', (e) => { e.preventDefault(); next(); }, { passive: false });

    btnRow.appendChild(skipBtn);
    btnRow.appendChild(nextBtn);
    nav.appendChild(dotsRow);
    nav.appendChild(btnRow);
    overlay.appendChild(nav);

    let touchStartX = 0;
    trackOuter.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    trackOuter.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (dx < -45) next();
      else if (dx > 45) prev();
    }, { passive: true });

    document.body.appendChild(overlay);
    goTo(0);
  }

  function goTo(idx) {
    currentStep = Math.max(0, Math.min(idx, STEPS.length - 1));
    if (slidesEl) {
      slidesEl.style.transform = `translateX(-${currentStep * (100 / 3)}%)`;
    }

    dots.forEach((d, i) => {
      d.classList.toggle('active', i === currentStep);
      d.setAttribute('aria-selected', i === currentStep ? 'true' : 'false');
    });

    const nextBtn = document.getElementById('ob-next-btn');
    if (nextBtn) {
      nextBtn.textContent = currentStep === STEPS.length - 1 ? 'Get Started' : 'Next';
    }

    if (window.EP) EP.haptic('light');
    if (window.AudioEngine) AudioEngine.uiTick('tap');
  }

  function next() {
    if (currentStep < STEPS.length - 1) {
      goTo(currentStep + 1);
    } else {
      complete();
    }
  }

  function prev() {
    if (currentStep > 0) {
      goTo(currentStep - 1);
    }
  }

  function complete() {
    localStorage.setItem(STORAGE_KEY, 'true');
    if (overlay) {
      overlay.classList.add('exiting');
      setTimeout(() => {
        if (overlay) {
          overlay.remove();
          overlay = null;
        }
      }, 350);
    }
    if (window.EP) EP.haptic('success');
    if (window.AudioEngine) {
      AudioEngine.playTone(440, 0, 0.08, 'sine', 0.15);
      setTimeout(() => AudioEngine.playTone(660, 0, 0.12, 'sine', 0.12), 120);
    }
  }

  return { init, reset: () => localStorage.removeItem(STORAGE_KEY) };
})();
