/* ═══════════════════════════════════════════════════════
   EchoPulse — Service Worker v1.0.0
   Cache-first offline strategy for instant progressive web app access.
═══════════════════════════════════════════════════════ */
'use strict';

const CACHE_NAME = 'echopulse-v1.1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles/base.css',
  './styles/components.css',
  './styles/screens.css',
  './styles/animations.css',
  './styles/onboarding.css',
  './styles/settings.css',
  './js/utils.js',
  './js/sensors.js',
  './js/audio.js',
  './js/gestures.js',
  './js/onboarding.js',
  './js/settings.js',
  './js/canvas-radar.js',
  './js/canvas-spectrum.js',
  './js/canvas-compass.js',
  './js/db-meter.js',
  './js/navigation.js',
  './js/emergency.js',
  './js/app.js',
  './assets/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== 'opaque'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
