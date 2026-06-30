// ════════════════════════════════════════════════════════
//  THINGY SERVICE WORKER
//  Caches the app shell so it opens even with no internet.
//  API calls always try the network first — on failure the
//  app uses its last-synced localStorage copy automatically.
// ════════════════════════════════════════════════════════

const CACHE_NAME = 'thingy-v1';
const ASSETS = ['/', '/thingy.html', '/manifest.json', '/icon.png'];

// On install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// On activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// On fetch:
//   - API calls → try network, return {offline:true} if it fails
//   - Everything else → serve from cache, update cache in background
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(resp => {
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, resp.clone()));
        return resp;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
