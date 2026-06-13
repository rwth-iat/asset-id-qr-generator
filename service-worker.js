// Network-first service worker: always tries the network first so updates
// to the app are picked up immediately when online, falling back to the
// cache for offline use. CACHE_NAME only needs bumping when files are
// removed/renamed, to drop stale entries from old caches.
'use strict';

var CACHE_NAME = 'qr-generator-v1';
var PRECACHE_URLS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.webmanifest',
  'lib/qrcode.js',
  'lib/jszip.min.js',
  'lib/jspdf.umd.min.js',
  'assets/logo-light.png',
  'assets/logo-dark.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request).then(function (response) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(event.request, copy);
      });
      return response;
    }).catch(function () {
      return caches.match(event.request);
    })
  );
});
