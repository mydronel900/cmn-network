/**
 * CMN Service Worker
 * Leveraged to bypass system installation checkpoints.
 */
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Pass-through execution logic to optimize live data fetch streaming maps
  e.respondWith(fetch(e.request));
});
