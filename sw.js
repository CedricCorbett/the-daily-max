// Service worker — shell cache + push handler.
// Bump CACHE_VERSION to invalidate the cache on deploy. The build version
// below is also embedded in index.html as a cache-buster on the JSX src URLs,
// so bumping it here AND in index.html kicks stale clients off the old code
// without requiring the user to delete their bookmark.
const CACHE_VERSION = 'dm-v8';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Let the page ask the waiting worker to take over immediately.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Strategy:
//   HTML docs          → network-first (fall back to cache when offline)
//   /src/*  (JSX code) → network-first. The app is babel-in-browser; stale
//                        JSX is the #1 cause of "I'm on an old build".
//   everything else    → stale-while-revalidate (serve cache, update in bg)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Skip cross-origin (Supabase, fonts CDN, react/babel CDNs).
  if (url.origin !== self.location.origin) return;

  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isSrc = url.pathname.startsWith('/src/');

  if (isDoc || isSrc) {
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(r => r || (isDoc ? caches.match('/index.html') : Response.error())))
    );
    return;
  }

  // stale-while-revalidate for static assets — serve cached copy immediately,
  // fetch in background and replace the cache for next time.
  event.respondWith(
    caches.match(req).then(hit => {
      const networked = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || networked;
    })
  );
});

// Push event — aggregated rally digest.
self.addEventListener('push', (event) => {
  let payload = { title: 'The Daily Max', body: 'Your crew needs you.', url: '/', tag: 'rally-digest' };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      renotify: false,
      icon: '/icons/icon-512.png',
      badge: '/icons/icon-512.png',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); return existing.navigate(url); }
      return self.clients.openWindow(url);
    })
  );
});
