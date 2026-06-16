import { convertShelterRow, readCsv, sources, writeJson } from './shared.ts';

const rows = await readCsv(sources.shelters.rawPath);
const shelters = rows.map(convertShelterRow);

await writeJson('public/data/air-raid-shelters.json', shelters);
await writeJson('public/data/shelter-summary.json', {
  totalShelters: shelters.length,
  totalCapacity: shelters.reduce((sum, shelter) => sum + (shelter.capacity ?? 0), 0),
  validCoordinateCount: shelters.filter((shelter) => shelter.coordinateStatus === 'valid').length,
  invalidCoordinateCount: shelters.filter((shelter) => shelter.coordinateStatus !== 'valid').length,
  byDistrict: shelters.reduce<Record<string, { count: number; capacity: number }>>((counts, shelter) => {
    counts[shelter.district] ??= { count: 0, capacity: 0 };
    counts[shelter.district].count += 1;
    counts[shelter.district].capacity += shelter.capacity ?? 0;
    return counts;
  }, {}),
});

console.log(`Converted ${shelters.length} shelter rows.`);
