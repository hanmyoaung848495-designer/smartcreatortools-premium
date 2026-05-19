self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A simple fetch handler is required for PWA installability criteria
  // We can just respond with the network request
  event.respondWith(fetch(event.request).catch(() => {
    return new Response('Offline content not available');
  }));
});
