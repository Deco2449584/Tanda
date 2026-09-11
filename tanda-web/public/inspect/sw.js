/* Continental Inspect — scoped service worker for standalone install. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/** Required for installability; network-first so warehouse staff always get live data. */
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
