import { readFile } from 'node:fs/promises';
import { writeJson } from './shared.ts';

type RecordItem = { id: string; address: string; [key: string]: unknown };
const targets = [
  ['surgical-medical-institutions', 'public/data/surgical-medical-institutions/records.json'],
  ['antivenom-stockpiles', 'public/data/antivenom-stockpiles/records.json'],
  ['diabetes-health-institutions', 'public/data/diabetes-health-institutions/records.json'],
] as const;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
for (const [name, path] of targets) {
  const records = JSON.parse(await readFile(path, 'utf8')) as RecordItem[];
  const output: RecordItem[] = [];
  for (const record of records) {
    const query = record.address.replace(/[；;].*$/, '').replace(/台北市/g, '臺北市').trim();
    let latitude: number | null = null; let longitude: number | null = null; let status = 'not_found';
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tw&q=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'taipei-safety-map/0.1 local-static-geocoder (contact: open-data@taipei-safety-map.local)' } });
      const result = await response.json() as Array<{ lat: string; lon: string }>;
      if (result[0]) { latitude = Number(result[0].lat); longitude = Number(result[0].lon); status = 'matched'; }
    } catch { status = 'request_failed'; }
    output.push({ ...record, normalizedAddress: query, latitude, longitude, geocodingStatus: status, geocodingProvider: 'Nominatim/OpenStreetMap', geocodingQuery: query, geocodedAt: new Date().toISOString() });
    await wait(1100);
  }
  await writeJson(`public/data/${name}/geocoded-records.json`, output);
  console.log(`Geocoded ${name}: ${output.filter(record => record.geocodingStatus === 'matched').length}/${output.length} matched.`);
}
