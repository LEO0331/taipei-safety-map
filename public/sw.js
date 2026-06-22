const CACHE_NAME = 'taipei-safety-map-v1';
const cacheUrl = (path) => new URL(path, self.registration.scope).toString();
const APP_SHELL = [cacheUrl(''), cacheUrl('manifest.webmanifest'), cacheUrl('icons/icon.svg')];
const DATA_FILES = [
  cacheUrl('data/air-raid-shelters.json'),
  cacheUrl('data/residential-burglary-records.json'),
  cacheUrl('data/residential-burglary-summary.json'),
  cacheUrl('data/shelter-summary.json'),
  cacheUrl('data/safety-dashboard-summary.json'),
  cacheUrl('data/aed-locations.json'),
  cacheUrl('data/aed-summary.json'),
  cacheUrl('data/dengue-vector-density-records.json'),
  cacheUrl('data/dengue-vector-density-summary.json')
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled([...APP_SHELL, ...DATA_FILES].map((url) => cache.add(url))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
