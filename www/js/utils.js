/* ═══════════════════════════════════════════════════════
   EchoPulse — Utility Helpers
   Shared constants and tiny utility functions
═══════════════════════════════════════════════════════ */
'use strict';

const EP = window.EP = {
  // Colors
  LIME:   '#a3e635',
  AMBER:  '#fbbf24',
  CYAN:   '#06b6d4',
  DANGER: '#ef4444',

  // Clamp a value between min and max
  clamp: (v, min, max) => Math.min(Math.max(v, min), max),

  // Linear interpolation
  lerp: (a, b, t) => a + (b - a) * t,

  // Map value from one range to another
  mapRange: (v, inMin, inMax, outMin, outMax) =>
    outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin),

  // Random float in range
  rand: (min, max) => Math.random() * (max - min) + min,

  // Debounce
  debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  // Show toast notification
  toast(message, icon = '🔔', duration = 3000) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="toast__icon">${icon}</span><span class="toast__text">${message}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('toast--exit');
      setTimeout(() => el.remove(), 400);
    }, duration);
  },

  // Simulate haptic feedback (visual flash for web)
  haptic(type = 'light') {
    document.body.style.transition = 'none';
    document.body.style.outline = '2px solid rgba(163,230,53,0.3)';
    setTimeout(() => { document.body.style.outline = ''; }, type === 'heavy' ? 150 : 80);

    // Real vibration API
    if (navigator.vibrate) {
      const patterns = {
        light: [30],
        medium: [50],
        heavy: [80],
        double: [40, 60, 40],
        warning: [100, 50, 100],
        success: [30, 30, 60],
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
  },

  // Format distance nicely
  formatDist: (m) => m < 1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(1)}km`,

  // Parse time to HH:MM string
  timeString: () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  // Check if reduced motion is preferred
  prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,

  // Create a gesture ripple visual
  createRipple(x, y) {
    const el = document.createElement('div');
    el.className = 'gesture-ripple';
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    document.getElementById('gesture-overlay').appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  },
};
