const CACHE_NAME = 'qrandurid-demo-social-v13-mascot-skins';
const CACHE_PREFIX = 'qrandurid-demo-social-';
const APP_SHELL = ['./', './index.html', './styles.css', './favicon.svg', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './cosmetics.js', './cosmetics.css', './art/urban-portraits.png', './places.js', './progress.js', './account.css', './account.js', './account-config.js', './vendor/supabase-2.118.0.js', ...Array.from({length:24},(_,i)=>`./art/s${i+1}.svg`), ...Array.from({length:24},(_,i)=>`./art/f${i+1}.svg`)];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {}));
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
