/* ═══════════════════════════════════════════════════════
   EchoPulse — Hardware Sensors Bridge
   Live camera stream, microphone FFT/RMS decibel analysis,
   device orientation (compass), and GPS geolocation with
   seamless fallback to simulation mode.
═══════════════════════════════════════════════════════ */
'use strict';

const HardwareSensors = (() => {
  // State
  const state = {
    camera: { active: false, stream: null, error: null },
    mic: { active: false, stream: null, error: null, analyser: null, audioCtx: null },
    orientation: { active: false, supported: false, heading: null },
    geolocation: { active: false, supported: false, coords: null, watchId: null },
  };

  // Event listeners
  const listeners = {
    camera: [],
    mic: [],
    orientation: [],
    geolocation: [],
  };

  function on(event, callback) {
    if (listeners[event]) listeners[event].push(callback);
  }

  function emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(`[Sensors] Error in ${event} listener:`, e); }
      });
    }
  }

  /* ─────────────────────────────────────────────
     1. CAMERA STREAM
  ───────────────────────────────────────────── */
  async function initCamera(videoEl) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      state.camera.error = 'Camera API not supported in this environment';
      emit('camera', { active: false, error: state.camera.error });
      return false;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.camera.stream = stream;
      state.camera.active = true;
      state.camera.error = null;

      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play().catch(err => console.warn('[Sensors] Video play interrupted:', err));
      }

      emit('camera', { active: true, stream });
      return true;
    } catch (err) {
      console.warn('[Sensors] Camera permission or access error:', err.message);
      state.camera.active = false;
      state.camera.error = err.message;
      emit('camera', { active: false, error: err.message });
      return false;
    }
  }

  function stopCamera(videoEl) {
    if (state.camera.stream) {
      state.camera.stream.getTracks().forEach(t => t.stop());
      state.camera.stream = null;
    }
    state.camera.active = false;
    if (videoEl) videoEl.srcObject = null;
    emit('camera', { active: false });
  }

  /* ─────────────────────────────────────────────
     2. MICROPHONE & REAL DECIBEL ANALYZER
  ───────────────────────────────────────────── */
  async function initMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      state.mic.error = 'Microphone API not supported';
      emit('mic', { active: false, error: state.mic.error });
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      state.mic.stream = stream;

      // Create Web Audio Analyser
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      state.mic.audioCtx = audioCtx;
      state.mic.analyser = analyser;
      state.mic.active = true;
      state.mic.error = null;

      emit('mic', { active: true });
      return true;
    } catch (err) {
      console.warn('[Sensors] Microphone access error:', err.message);
      state.mic.active = false;
      state.mic.error = err.message;
      emit('mic', { active: false, error: err.message });
      return false;
    }
  }

  function getLiveDecibels() {
    if (!state.mic.active || !state.mic.analyser) return null;

    const analyser = state.mic.analyser;
    const bufferLength = analyser.fftSize;
    const timeData = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(timeData);

    // Calculate Root Mean Square (RMS)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sum / bufferLength);

    if (rms <= 0.00001) return 32; // Baseline room ambient silence

    // Convert RMS to approximate Sound Pressure Level (SPL dB)
    // Calibrated so quiet room is ~40-45 dB, speaking is ~65-72 dB, loud is 85+ dB
    const dbFS = 20 * Math.log10(rms);
    const dbSPL = Math.round(dbFS + 98);

    return Math.max(30, Math.min(120, dbSPL));
  }

  function getLiveFrequencyData(outputArray) {
    if (!state.mic.active || !state.mic.analyser) return false;
    state.mic.analyser.getByteFrequencyData(outputArray);
    return true;
  }

  /* ─────────────────────────────────────────────
     3. PHYSICAL COMPASS & DEVICE ORIENTATION
  ───────────────────────────────────────────── */
  function initOrientation() {
    if (typeof window === 'undefined') return;

    function handleOrientation(e) {
      let heading = null;

      // iOS compass heading
      if (typeof e.webkitCompassHeading !== 'undefined') {
        heading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Android compass heading (alpha is 0-360 counter-clockwise)
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null && !isNaN(heading)) {
        state.orientation.active = true;
        state.orientation.heading = heading;
        emit('orientation', { heading, active: true });
      }
    }

    if (window.DeviceOrientationEvent) {
      state.orientation.supported = true;

      // Handle iOS 13+ permission model if required
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // Requires user gesture, will be triggered on first interaction
        state.orientation.needsPermission = true;
      } else {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }
  }

  async function requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          initOrientation();
          return true;
        }
      } catch (e) {
        console.warn('[Sensors] DeviceOrientation permission error:', e);
      }
    }
    return false;
  }

  /* ─────────────────────────────────────────────
     4. GPS & GEOLOCATION
  ───────────────────────────────────────────── */
  function initGeolocation() {
    if (!('geolocation' in navigator)) {
      state.geolocation.supported = false;
      return;
    }

    state.geolocation.supported = true;

    try {
      state.geolocation.watchId = navigator.geolocation.watchPosition(
        pos => {
          state.geolocation.active = true;
          state.geolocation.coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          };
          emit('geolocation', { active: true, coords: state.geolocation.coords });
        },
        err => {
          console.warn('[Sensors] Geolocation watch error:', err.message);
          state.geolocation.active = false;
          emit('geolocation', { active: false, error: err.message });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    } catch (e) {
      console.warn('[Sensors] Geolocation failed to initialize:', e);
    }
  }

  return {
    state,
    on,
    initCamera,
    stopCamera,
    initMicrophone,
    getLiveDecibels,
    getLiveFrequencyData,
    initOrientation,
    requestOrientationPermission,
    initGeolocation,
  };
})();
