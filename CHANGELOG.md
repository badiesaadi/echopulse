# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- Bluetooth LE Beacon distance estimation.
- WebXR integration for spatial depth sensor ingestion.

## [1.0.0-beta.1] - 2026-10-18

### Added
- **Spatial Radar Module**:
  - Live object detection canvas simulator tracking pedestrians, steps, doors, and vehicles.
  - Perspective LiDAR depth grid and moving distance particles.
  - Proximity arc meter needle indicating nearest collision boundary.
  - Interactive Left/Right audio stereoscopic pan visualizer.
- **Acoustic Environment Analyzer**:
  - Oscillating decibel (dB) meter with color-coded safety thresholds.
  - Sensory overload alert system for neurodivergent sensory protection.
  - Multi-band live FFT frequency spectrum canvas (HVAC, traffic, crowd profiles).
  - NIOSH daily permissible noise exposure and ear health countdown timer.
- **PathFinder Navigation**:
  - Rotating 72-point digital compass canvas with cardinal bearings.
  - Step-by-step directional prompts with integrated haptic cues.
  - Saved routes directory with accessible entrance bookmarks and audio preview.
  - Indoor/Outdoor navigation mode switch.
- **Emergency & Companion Suite**:
  - Slide-to-activate tactile SOS track with intentional drag threshold.
  - 3-finger long-press emergency HUD for rapid nearest exit guidance.
  - Live GPS coordinate telemetry simulator with drift modeling.
  - Trusted emergency contacts manager and companion broadcast status.
- **Acoustic-Tactile Design System**:
  - Ultra-high contrast dark theme (`#000000` base) with Electric Lime, Amber, and Cyan accents.
  - Mobile ergonomic layout with single-handed thumb target ergonomics.
  - Full WCAG 2.2 AAA accessibility compliance, VoiceOver/TalkBack ARIA tagging, and reduced-motion modes.
- **Progressive Web App Support**:
  - Web App Manifest (`manifest.json`) and vector SVG icon.
  - Cache-first Service Worker (`sw.js`) for full offline functionality.
  - Settings modal bottom sheet with persisted preferences in `localStorage`.
  - First-run 3-step swipeable onboarding walkthrough.
