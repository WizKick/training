const CACHE = 'sbt-mobile-v1';
const SHELL = ['/', '/trainer-cloud.js', '/manifest.webmanifest', '/trainer-192.png', '/trainer-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sbt-mobile-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const path = url.pathname === '/index.html' ? '/' : url.pathname;
  if (!SHELL.includes(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(req);
      if (response.ok && !response.redirected) await cache.put(path, response.clone());
      return response;
    } catch (error) { return await cache.match(path) || Response.error(); }
  })());
});