# EchoPulse 📡⚡

> **AI-Driven Spatial Acoustics & Real-Time Environmental Navigation**  
> Turning physical surroundings into intuitive, non-intrusive 3D soundscapes and tactile haptics.

[![License: MIT](https://img.shields.io/badge/License-MIT-a3e635.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Mobile%20PWA%20%7C%20iOS%20%7C%20Android-06b6d4.svg)](#)
[![Accessibility](https://img.shields.io/badge/WCAG%202.2-AAA%20Compliant-a3e635.svg)](#)
[![Audio](https://img.shields.io/badge/Web%20Audio-3D%20Spatial%20Panner-fbbf24.svg)](#)

---

## 🧭 Problem & Mission

Conventional GPS navigation platforms strictly plot point-to-point street paths, leaving pedestrians—especially low-vision and neurodivergent individuals—blind to immediate physical hazards, approaching stairs, hanging obstacles, dynamic crowd noise, and acoustic overload.

**EchoPulse** bridges the gap between digital navigation and sensory reality. By fusing real-time computer vision, spatial audio panning, decibel frequency analysis, and precision haptics, EchoPulse constructs a subtle "acoustic tactile" shield that guides users safely through indoor and urban environments without relying on visual map reading.

---

## 📱 Core Modules

### 1. 🎯 Spatial Radar (Vision & LiDAR HUD)
- **Live Detection Overlays**: Dynamic bounding boxes tracking pedestrians, stairs/steps, doors, pillars, and approaching vehicles.
- **Distance-to-Frequency Sonar**: Obstacle distance maps directly to audio pitch (200 Hz at 10m up to 1200 Hz at point-blank range).
- **Stereoscopic 3D Audio Panning**: Automatically positions sound cues across the left and right ear to signal obstacle azimuth.
- **Interactive Proximity Arc**: Visual needle gauge displaying immediate collision boundaries.

### 2. 〜 Acoustic Analyzer & Sensory Guard
- **Continuous Decibel Meter**: Real-time ambient dB readings calibrated against safe exposure zones.
- **Sensory Overload Alerts**: High-contrast warning banners and tactile alarms when volume exceeds safe thresholds.
- **Real-Time FFT Spectrum Visualizer**: Animated multi-band frequency analyzer isolating HVAC hums, traffic rumblings, and room echo.
- **NIOSH Ear Health Monitor**: Calculates cumulative acoustic dose and estimates permissible safe exposure time.

### 3. ⬡ Smart Indoor & Outdoor PathFinder
- **Digital Haptic Compass**: 72-point rotating compass ring with cardinal bearings and smooth orientation tracking.
- **Turn-by-Turn Tactile Directions**: Differentiated vibration prompts for turns, straight corridors, and stair warnings.
- **Multi-Environment Modes**: One-tap toggle between Indoor (tile/carpet/ramps) and Outdoor (sidewalks/traffic).
- **Saved Routes & Voice Bookmarks**: Quick access to verified accessible routes (e.g., ramps, elevators).

### 4. ⚡ Emergency & Companion Mode
- **Tactile SOS Slider**: Intentional drag-to-activate slider preventing false positives while allowing panic activation.
- **3-Finger Rapid Trigger**: Instant exit-path guidance and emergency HUD when holding three fingers on screen.
- **Live GPS Broadcast**: High-accuracy coordinate drift simulation with one-touch emergency circle notification.
- **Spatial Recording Dispatch**: Transmits a 5-second spatial video and telemetry burst to designated contacts.

---

## 🎨 Design System: "Acoustic Tactile"

Built around an ultra-high contrast dark foundation optimized for low-vision clarity and OLED battery efficiency:

| Color Token | Hex Code | Semantic Role |
|:---|:---:|:---|
| **Deep Void** | `#000000` | Base canvas and glare-free background |
| **Electric Lime** | `#a3e635` | Clear routes, active safe targets, north compass needle |
| **Warning Amber** | `#fbbf24` | Dynamic obstacles, stairs, moderate noise thresholds |
| **Signal Cyan** | `#06b6d4` | Spatial nodes, GPS telemetry, low-frequency bands |
| **Emergency Red** | `#ef4444` | Vehicular hazards, SOS triggers, sensory danger alerts |

---

## 🎮 Gesture System

Designed for single-handed accessibility and zero-look interaction:

| Gesture | Action | Audio Feedback | Tactile Haptic |
|:---|:---|:---|:---|
| **Double-Tap Anywhere** | Opens Voice Command Overlay | High sine ping (500Hz) | Medium haptic tick |
| **Two-Finger Swipe ↕** | Pitch frequency shift (±10%) | Dynamic sweep (300Hz) | Micro vibration pulse |
| **Hold 3 Fingers (800ms)** | Emergency HUD & Nearest Exit | Urgent double chime | Triple warning vibration |
| **SOS Thumb Slide** | Triggers SOS Emergency Broadcast | 5-tone cascading siren | Heavy haptic cascade |
| **Single Tap** | UI interaction / Confirmation | Soft tap click | Light click |

---

## 🏗️ Architecture

```
EchoPulse Web App Shell (HTML5 / PWA)
 ├── AudioEngine (Web Audio API)
 │    ├── Spatial Panner Node (Stereo Azimuth)
 │    ├── Dynamic Oscillator (Proximity Frequency)
 │    └── Ambient Noise Generator
 ├── RadarRenderer (HTML5 Canvas 2D)
 │    ├── Simulated Object Tracking & Bounding Boxes
 │    ├── Perspective LiDAR Fog & Particle Grid
 │    └── Proximity Gauge Arc
 ├── SpectrumRenderer (FFT Canvas)
 │    └── Multi-Band Low/Mid/High Noise Decomposition
 ├── CompassRenderer (Canvas 2D)
 │    └── 72-Division Bearing Indicator & Direction Router
 ├── DBMeter Controller
 │    └── NIOSH Exposure Formula & Sensory Alert Dispatch
 ├── SettingsController & OnboardingFlow
 │    └── Modal Bottom Sheet & First-Run Carousel
 └── EmergencyModule
      └── GPS Coordinate Telemetry & SOS Dispatcher
```

---

## 📂 File Structure

```
echopulse/
├── index.html                  # Main app markup & screen containers
├── manifest.json               # Progressive Web App configuration
├── sw.js                       # Service worker for offline-first caching
├── package.json                # Project dependencies and dev scripts
├── LICENSE                     # MIT License
├── README.md                   # Complete architectural documentation
├── CHANGELOG.md                # Version release history
├── assets/
│   └── icon.svg                # Vector app icon & radar branding
├── styles/
│   ├── base.css                # CSS variables, typography & reset
│   ├── components.css          # Cards, buttons, toggles & navigation
│   ├── screens.css             # Screen-specific layouts (Radar, Compass, etc.)
│   ├── animations.css          # Fluid keyframes & reduced-motion queries
│   ├── onboarding.css          # First-launch swipe carousel styles
│   └── settings.css            # Settings modal bottom-sheet styles
└── js/
    ├── utils.js                # Core utility functions, haptic bridge, toasts
    ├── audio.js                # Web Audio API spatial acoustic engine
    ├── gestures.js             # Multi-touch & mouse gesture interpreter
    ├── canvas-radar.js         # Spatial radar camera HUD canvas engine
    ├── canvas-spectrum.js      # Acoustic frequency spectrum canvas
    ├── canvas-compass.js       # Rotating 72-division compass canvas
    ├── db-meter.js             # Decibel monitor & sensory overload alert system
    ├── navigation.js           # Screen transition router & state controller
    ├── emergency.js            # GPS telemetry simulator & SOS emergency state
    ├── onboarding.js           # 3-step walkthrough controller
    ├── settings.js             # Settings sheet manager & storage persistence
    └── app.js                  # Master application bootstrap orchestrator
```

---

## 🚀 Quick Start

EchoPulse requires **no build step** or heavy dependencies to run locally.

### Option 1: Direct Browser Launch
Simply double-click [`index.html`](index.html) or run in PowerShell:
```powershell
Start-Process "c:\development\newai\echopulse\index.html"
```

### Option 2: Local HTTP Server (Recommended for PWA & Audio API)
Using Node.js:
```bash
# Clone the repository
git clone https://github.com/badiesaadi/echopulse.git
cd echopulse

# Launch with any local server
npx serve .
# Or run with live reloading
npx live-server --port=3000
```
Open `http://localhost:3000` in Chrome, Safari, or Edge.

---

## ♿ Accessibility (A11y) & Neurodivergent UX

- **VoiceOver & TalkBack Support**: Strict semantic HTML with full ARIA regions (`role="region"`, `role="alert"`, `role="status"`).
- **Reduced Motion Support**: Fully respects `@media (prefers-reduced-motion: reduce)` by disabling sweeps, ripples, and spring transitions.
- **High Contrast Assurance**: 14:1+ contrast ratios across all critical indicators against `#000000`.
- **Sensory Overload Controls**: Configurable alert thresholds allowing users to attenuate loud sound cues.

---

## 📱 Native Implementation Roadmap

For production mobile deployment on iOS and Android:

| Feature | iOS Implementation (Swift / SwiftUI) | Android Implementation (Kotlin / Jetpack Compose) |
|:---|:---|:---|
| **Camera & LiDAR** | `AVFoundation` + `ARKit` (`sceneDepth` API) | `CameraX` + `ARCore` Depth API |
| **Object Detection** | `Vision` Framework (`VNDetectHumanRectanglesRequest`) | Google `ML Kit Object Detection` |
| **Spatial Acoustics** | `AVAudioEngine` + `AVAudioEnvironmentNode` | `Oboe C++` or `SpatializerCompat` |
| **Haptic Feedback** | `CoreHaptics` (`CHHapticEngine` transient patterns) | `VibrationEffect.createWaveform()` |
| **Compass & Telemetry** | `CoreLocation` (`CLHeading` & `CLLocationManager`) | `SensorManager` (`SENSOR_ORIENTATION`) |
| **Background Emergency** | `BackgroundTasks` + `MessageUI` | `WorkManager` + `SmsManager` |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.

Developed with precision by **Badie Saadi** ([@badiesaadi](https://github.com/badiesaadi)).
