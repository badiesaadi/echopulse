/* ═══════════════════════════════════════════════════════
   EchoPulse — Spatial Audio Engine
   Web Audio API — 3D spatial tones, proximity audio,
   frequency pitch shifts, haptic audio feedback ticks
═══════════════════════════════════════════════════════ */
'use strict';

const AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let pannerLeft = null;
  let pannerRight = null;
  let spatialEnabled = true;
  let pitchShift = 1.0; // 0.5 – 2.0

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('[AudioEngine] Web Audio not supported');
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // Play a short tone at a given frequency, pan, duration
  function playTone(freq, pan = 0, duration = 0.08, type = 'sine', gain = 0.3) {
    if (!ctx || !spatialEnabled) return;
    resume();

    const osc   = ctx.createOscillator();
    const gNode = ctx.createGain();
    const pNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    osc.type = type;
    osc.frequency.setValueAtTime(freq * pitchShift, ctx.currentTime);

    gNode.gain.setValueAtTime(gain, ctx.currentTime);
    gNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gNode);
    if (pNode) {
      pNode.pan.value = EP.clamp(pan, -1, 1);
      gNode.connect(pNode);
      pNode.connect(masterGain);
    } else {
      gNode.connect(masterGain);
    }

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // Proximity tick — distance mapped to frequency (close = high)
  function proximityTick(distanceMeters, panX = 0) {
    const maxDist = 10;
    const t = 1 - EP.clamp(distanceMeters / maxDist, 0, 1);
    const freq = EP.lerp(200, 1200, t);
    const gain = EP.lerp(0.05, 0.3, t);
    playTone(freq, panX, 0.06, 'triangle', gain);
  }

  // Obstacle warning — double tick
  function obstacleWarning(panX = 0) {
    playTone(880, panX, 0.05, 'square', 0.2);
    setTimeout(() => playTone(1100, panX, 0.05, 'square', 0.2), 100);
  }

  // Clear pathway tick — soft high sine
  function clearTick() {
    playTone(660, 0, 0.05, 'sine', 0.1);
  }

  // Navigation step sound
  function navigationStep() {
    playTone(440, 0, 0.08, 'sine', 0.2);
    setTimeout(() => playTone(550, 0, 0.1, 'sine', 0.15), 120);
  }

  // SOS activation alarm
  function sosAlarm() {
    if (!ctx) return;
    resume();
    [0, 200, 400, 600, 800].forEach(delay => {
      setTimeout(() => {
        playTone(880, 0, 0.15, 'square', 0.35);
        setTimeout(() => playTone(660, 0, 0.15, 'square', 0.35), 80);
      }, delay);
    });
  }

  // UI action tick (for every micro-interaction)
  function uiTick(type = 'tap') {
    const map = {
      tap:    { freq: 500, dur: 0.04, gain: 0.1, type: 'sine' },
      swipe:  { freq: 300, dur: 0.06, gain: 0.08, type: 'sine' },
      select: { freq: 660, dur: 0.08, gain: 0.12, type: 'sine' },
      error:  { freq: 200, dur: 0.12, gain: 0.15, type: 'sawtooth' },
    };
    const p = map[type] || map.tap;
    playTone(p.freq, 0, p.dur, p.type, p.gain);
  }

  // Generate ambient soundscape noise (for radar mode)
  function startAmbient() {
    if (!ctx) return;
    resume();
    // Low drone
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.015;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const ambGain = ctx.createGain();
    ambGain.gain.value = 0.15;

    src.connect(filter);
    filter.connect(ambGain);
    ambGain.connect(masterGain);
    src.start();
    return src;
  }

  // Adjust pitch shift (from two-finger swipe)
  function adjustPitch(delta) {
    pitchShift = EP.clamp(pitchShift + delta, 0.5, 2.0);
    uiTick('swipe');
    return pitchShift;
  }

  function setSpatialEnabled(val) {
    spatialEnabled = val;
    masterGain && (masterGain.gain.value = val ? 0.4 : 0);
  }

  return {
    init, resume,
    playTone, proximityTick, obstacleWarning, clearTick,
    navigationStep, sosAlarm, uiTick, startAmbient,
    adjustPitch, setSpatialEnabled,
    get pitchShift() { return pitchShift; },
    get spatialEnabled() { return spatialEnabled; },
  };
})();
