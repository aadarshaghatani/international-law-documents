const CACHE_NAME = 'lawlib-v4';

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './docs.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => fetch('./docs.json'))
      .then(response => response.json())
      .then(docs => {
        const jsonPaths = docs.map(doc => doc.path);
        return caches.open(CACHE_NAME).then(cache => cache.addAll(jsonPaths));
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Pre-cache failed:', err))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});
