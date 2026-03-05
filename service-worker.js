const CACHE_NAME = 'lawlib-v1';

// Files to cache immediately on install (core assets + all JSON documents)
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/docs.json'
  // We'll cache all JSON files dynamically after we know their paths
];

// Install event: cache core assets and trigger fetching of all JSON files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // First cache the core assets
        return cache.addAll(urlsToCache)
          .then(() => {
            // After core assets are cached, fetch docs.json to get list of all JSON files
            return fetch('/docs.json')
              .then(response => response.json())
              .then(docs => {
                // Extract all JSON paths from docs.json
                const jsonPaths = docs.map(doc => doc.path);
                // Add them to the cache
                return cache.addAll(jsonPaths);
              })
              .catch(err => {
                console.log('Could not pre-cache JSON files:', err);
              });
          });
      })
  );
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return cached version
        }
        // Not in cache – fetch from network and cache for future
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            // Clone the response – one to return, one to cache
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        );
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});