const CACHE_NAME = 'taipei-safety-map-v1';
const cacheUrl = (path) => new URL(path, self.registration.scope).toString();
const APP_SHELL = [cacheUrl(''), cacheUrl('manifest.webmanifest'), cacheUrl('icons/icon.svg')];
const DATA_FILES = [
  cacheUrl('data/air-raid-shelters.json'),
  cacheUrl('data/residential-burglary-records.json'),
  cacheUrl('data/residential-burglary-summary.json'),
  cacheUrl('data/bicycle-theft-records.json'),
  cacheUrl('data/bicycle-theft-summary.json'),
  cacheUrl('data/bicycle-theft-location-buckets.json'),
  cacheUrl('data/motorcycle-theft-records.json'),
  cacheUrl('data/motorcycle-theft-summary.json'),
  cacheUrl('data/motorcycle-theft-location-buckets.json'),
  cacheUrl('data/shelter-summary.json'),
  cacheUrl('data/safety-dashboard-summary.json'),
  cacheUrl('data/aed-locations.json'),
  cacheUrl('data/aed-summary.json'),
  cacheUrl('data/dengue-vector-density-records.json'),
  cacheUrl('data/dengue-vector-density-summary.json'),
  cacheUrl('data/evacuation-gates.json'),
  cacheUrl('data/evacuation-gate-summary.json'),
  cacheUrl('data/medical-facilities.json'),
  cacheUrl('data/medical-facility-summary.json'),
  cacheUrl('data/fire-hydrant-summary.json'),
  cacheUrl('data/emergency-shelters.json'),
  cacheUrl('data/emergency-shelter-summary.json'),
  cacheUrl('data/traffic-cctv-facilities.json'),
  cacheUrl('data/traffic-cctv-summary.json'),
  cacheUrl('data/police-cctv-installation-locations.json'),
  cacheUrl('data/police-cctv-installation-location-summary.json'),
  cacheUrl('data/fire-department-donation-in-kind-records.json'),
  cacheUrl('data/fire-department-donation-in-kind-summary.json'),
  cacheUrl('data/fire-department-donation-in-kind-latest.json'),
  cacheUrl('data/natural-disaster-work-school-suspension-records.json'),
  cacheUrl('data/natural-disaster-work-school-suspension-summary.json'),
  cacheUrl('data/natural-disaster-work-school-suspension-event-groups.json'),
  cacheUrl('data/conversion-report.json')
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
