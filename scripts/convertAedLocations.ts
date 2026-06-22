import { countBy } from '../src/lib/safetyData.ts';
import { convertAedRow, readCsv, writeJson } from './shared.ts';

const path = process.argv[2] ?? 'data/raw/aed-locations/aed-locations.csv';
const rows = await readCsv(path);
const aeds = rows.map(convertAedRow);

await writeJson('public/data/aed-locations.json', aeds);
await writeJson('public/data/aed-summary.json', {
  totalRecords: aeds.length,
  validCoordinates: aeds.filter((item) => item.coordinateStatus === 'valid').length,
  missingCoordinates: aeds.filter((item) => item.coordinateStatus === 'missing').length,
  outlierCoordinates: aeds.filter((item) => item.coordinateStatus === 'outlier').length,
  recordsWithDetailedDescription: aeds.filter((item) => item.aedLocationDescription).length,
  byDistrict: countBy(aeds, (item) => item.district),
  byPlaceCategory: countBy(aeds, (item) => item.placeCategory),
  byPlaceType: countBy(aeds, (item) => item.placeType),
});

console.log(`Converted ${aeds.length} AED rows.`);
