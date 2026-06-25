import { countBy } from '../src/lib/safetyData.ts';
import type { CoordinateStatus, TrafficCctvFacility, TrafficCctvSummary } from '../src/types.ts';
import { convertTrafficCctvRow, readCsv, writeJson } from './shared.ts';

const path = process.argv[2] ?? 'data/raw/traffic-cctv/traffic-cctv.csv';
const rows = await readCsv(path);
let duplicateRows = 0;
const duplicateExamples: string[] = [];
const byKey = new Map<string, TrafficCctvFacility>();

for (const row of rows) {
  const facility = convertTrafficCctvRow(row, byKey.size);
  const key =
    String(facility.sourceSequenceNumber ?? '') ||
    [facility.cameraLocationCodeRaw, facility.longitude, facility.latitude].filter(Boolean).join('|') ||
    facility.id;
  if (byKey.has(key)) {
    duplicateRows += 1;
    if (duplicateExamples.length < 10) duplicateExamples.push(key);
    continue;
  }
  byKey.set(key, facility);
}

const facilities = [...byKey.values()];
const summary: TrafficCctvSummary = {
  totalRecords: facilities.length,
  validCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'valid').length,
  missingCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'missing').length,
  outlierCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'outlier').length,
  unparsedCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'unparsed').length,
  cityCount: new Set(facilities.flatMap((item) => (item.city ? [item.city] : []))).size,
  byCity: Object.entries(countBy(facilities, (item) => item.city)).map(([city, count]) => ({ city, count })),
  coordinateStatus: Object.entries(countBy(facilities, (item) => item.coordinateStatus)).map(([coordinateStatus, count]) => ({
    coordinateStatus: coordinateStatus as CoordinateStatus,
    count,
  })),
};

await writeJson('public/data/traffic-cctv-facilities.json', facilities);
await writeJson('public/data/traffic-cctv-summary.json', summary);
await writeJson('public/data/traffic-cctv-conversion.json', {
  inputRows: rows.length,
  outputRows: facilities.length,
  duplicateRows,
  duplicateExamples,
  invalidCoordinateExamples: facilities
    .filter((item) => item.coordinateStatus === 'missing' || item.coordinateStatus === 'unparsed')
    .slice(0, 10)
    .map((item) => item.cameraLocationCodeRaw ?? item.id),
  outlierCoordinateExamples: facilities
    .filter((item) => item.coordinateStatus === 'outlier')
    .slice(0, 10)
    .map((item) => `${item.cameraLocationCodeRaw ?? item.id}: ${item.longitude},${item.latitude}`),
});

console.log(`Converted ${facilities.length} CCTV rows.`);
