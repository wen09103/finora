/* ============================================================
   FINORA — SERVICE WORKER
   Cache static assets, offline-ready.
   ============================================================ */
const CACHE_NAME = 'finora-cache-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/responsive.css',
  './js/utils.js',
  './js/storage.js',
  './js/dashboard.js',
  './js/transactions.js',
  './js/budget.js',
  './js/statistics.js',
  './js/settings.js',
  './js/app.js'
];

/* Install — cache static */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* Activate — clean old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch — cache-first, network fallback */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Chỉ xử lý GET
  if (request.method !== 'GET') return;

  // Bỏ qua Google Fonts và lucide CDN — dùng network
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});