const CACHE_NAME = 'taipei-safety-map-v16';
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
  cacheUrl('data/street-random-snatch-incidents.json'),
  cacheUrl('data/street-random-snatch-incident-summary.json'),
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
  cacheUrl('data/smart-traffic-enforcement-equipment.json'),
  cacheUrl('data/smart-traffic-enforcement-equipment-summary.json'),
  cacheUrl('data/vehicle-towing-top-road-sections.json'),
  cacheUrl('data/vehicle-towing-top-road-sections-summary.json'),
  cacheUrl('data/police-cctv-installation-locations.json'),
  cacheUrl('data/police-cctv-installation-location-summary.json'),
  cacheUrl('data/fire-department-donation-in-kind-records.json'),
  cacheUrl('data/fire-department-donation-in-kind-summary.json'),
  cacheUrl('data/fire-department-donation-in-kind-latest.json'),
  cacheUrl('data/fire-rescue-difficult-areas.json'),
  cacheUrl('data/fire-rescue-difficult-area-summary.json'),
  cacheUrl('data/fire-access-route-registry.json'),
  cacheUrl('data/fire-access-route-registry-summary.json'),
  cacheUrl('data/managed-hiking-trails.json'),
  cacheUrl('data/managed-hiking-trail-summary.json'),
  cacheUrl('data/historical-flooding-records.json'),
  cacheUrl('data/historical-flooding-records.geojson'),
  cacheUrl('data/historical-flooding-summary.json'),
  cacheUrl('data/tobacco-control-inspection-results/records.json'),
  cacheUrl('data/tobacco-control-inspection-results/summary.json'),
  cacheUrl('data/tobacco-control-inspection-results/schema-report.json'),
  cacheUrl('data/tobacco-control-inspection-results/conversion-report.json'),
  cacheUrl('data/domestic-violence-report-statistics/summary.json'),
  cacheUrl('data/domestic-violence-report-statistics/conversion-report.json'),
  cacheUrl('data/major-occupational-accidents/records.json'),
  cacheUrl('data/major-occupational-accidents/conversion-report.json'),
  cacheUrl('data/emergency-operations-center-activations/records.json'),
  cacheUrl('data/double-parking-enforcement-top-intersections/records.json'),
  cacheUrl('data/reported-traffic-violation-enforcement/summary.json'),
  cacheUrl('data/reported-traffic-violation-enforcement/by-district.json'),
  cacheUrl('data/reported-traffic-violation-enforcement/by-category.json'),
  cacheUrl('data/reported-traffic-violation-enforcement/by-road.json'),
  cacheUrl('data/traffic-violation-appeal-top-clauses/records.json'),
  cacheUrl('data/traffic-violation-appeal-top-clauses/metadata.json'),
  cacheUrl('data/kindergarten-child-transport-vehicles/records.json'),
  cacheUrl('data/kindergarten-child-transport-vehicles/metadata.json'),
  cacheUrl('data/soil-water-conservation-violations/records.json'),
  cacheUrl('data/soil-water-conservation-violations/metadata.json'),
  cacheUrl('data/alcohol-tobacco-business-inspections/records.json'),
  cacheUrl('data/alcohol-tobacco-business-inspections/metadata.json'),
  cacheUrl('data/entertainment-business-noise-enforcement-records/records.json'),
  cacheUrl('data/lpg-facilities-and-gas-retailers/records.json'),
  cacheUrl('data/lpg-facilities-and-gas-retailers/conversion-report.json'),
  cacheUrl('data/electrical-equipment-inspection-maintenance-businesses/records.json'),
  cacheUrl('data/electrical-equipment-inspection-maintenance-businesses/conversion-report.json'),
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
