const CACHE_NAME = 'lawlib-v2'; // Increment version to force update

const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/docs.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache)
          .then(() => {
            // Use relative URL (no leading slash) to fetch docs.json
            return fetch('docs.json')
              .then(response => response.json())
              .then(docs => {
                // Extract paths – they are already relative (e.g., 'data/human-rights/udhr.json')
                const jsonPaths = docs.map(doc => doc.path);
                return cache.addAll(jsonPaths);
              })
              .catch(err => console.error('Could not pre-cache JSON files:', err));
          });
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});