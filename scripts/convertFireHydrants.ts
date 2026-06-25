import { countBy } from '../src/lib/safetyData.ts';
import type { FireHydrant, FireHydrantSummary } from '../src/types.ts';
import { convertFireHydrantRow, readCsv, writeJson } from './shared.ts';

const path = process.argv[2] ?? 'data/raw/fire-hydrants/fire-hydrants.csv';
const rows = await readCsv(path);
const conflicts: string[] = [];
let duplicateRows = 0;
const byKey = new Map<string, FireHydrant>();
for (const row of rows) {
  const hydrant = convertFireHydrantRow(row, byKey.size);
  const key =
    hydrant.wpid ||
    [hydrant.mapSheetNumber, hydrant.hydrantNumber, hydrant.areaRaw].filter(Boolean).join('|') ||
    hydrant.id;
  const existing = byKey.get(key);
  if (!existing) {
    byKey.set(key, hydrant);
  } else {
    duplicateRows += 1;
    if (existing.latitude !== hydrant.latitude || existing.longitude !== hydrant.longitude) {
      conflicts.push(key);
    }
  }
}
const hydrants = [...byKey.values()];

const byCity = Object.entries(countBy(hydrants, (item) => item.city)).map(([city, count]) => ({ city, count }));
const byAreaScope = Object.entries(countBy(hydrants, (item) => item.areaScope)).map(([areaScope, count]) => ({
  areaScope: areaScope as FireHydrant['areaScope'],
  count,
}));
const byHydrantType = Object.entries(countBy(hydrants, (item) => item.hydrantType)).map(([hydrantType, count]) => ({
  hydrantType: hydrantType as FireHydrant['hydrantType'],
  count,
}));
const districtKeys = [...new Set(hydrants.flatMap((item) => (item.city && item.district ? [`${item.city}|${item.district}`] : [])))];
const villageKeys = [...new Set(hydrants.flatMap((item) => (item.city && item.district && item.village ? [`${item.city}|${item.district}|${item.village}`] : [])))];
const summary: FireHydrantSummary = {
  totalRecords: hydrants.length,
  validCoordinateCount: hydrants.filter((item) => item.coordinateStatus === 'valid').length,
  outlierCoordinateCount: hydrants.filter((item) => item.coordinateStatus === 'outlier').length,
  taipeiCityCount: hydrants.filter((item) => item.isTaipeiCity).length,
  newTaipeiCount: hydrants.filter((item) => item.isNewTaipei).length,
  newTaipeiOfficialScopeCount: hydrants.filter((item) => item.areaScope === 'new_taipei_official_scope').length,
  newTaipeiOtherCount: hydrants.filter((item) => item.areaScope === 'new_taipei_other').length,
  undergroundHydrantCount: hydrants.filter((item) => item.hydrantType === 'underground').length,
  aboveGroundHydrantCount: hydrants.filter((item) => item.hydrantType === 'above_ground').length,
  otherHydrantTypeCount: hydrants.filter((item) => item.hydrantType === 'other').length,
  unknownHydrantTypeCount: hydrants.filter((item) => item.hydrantType === 'unknown').length,
  cityCount: byCity.length,
  districtCount: districtKeys.length,
  villageCount: villageKeys.length,
  byCity,
  byDistrict: districtKeys.map((key) => {
    const [city, district] = key.split('|');
    const records = hydrants.filter((item) => item.city === city && item.district === district);
    return {
      city,
      district,
      count: records.length,
      undergroundHydrantCount: records.filter((item) => item.hydrantType === 'underground').length,
      aboveGroundHydrantCount: records.filter((item) => item.hydrantType === 'above_ground').length,
    };
  }),
  byVillage: villageKeys.map((key) => {
    const [city, district, village] = key.split('|');
    return {
      city,
      district,
      village,
      count: hydrants.filter((item) => item.city === city && item.district === district && item.village === village)
        .length,
    };
  }),
  byHydrantType,
  byAreaScope,
};

await writeJson('public/data/fire-hydrants.json', hydrants);
await writeJson('public/data/fire-hydrant-summary.json', summary);
await writeJson('public/data/fire-hydrant-conversion.json', {
  inputRows: rows.length,
  outputRows: hydrants.length,
  duplicateRows,
  coordinateConflicts: conflicts.length,
  coordinateConflictExamples: conflicts.slice(0, 10),
  areaParseWarnings: hydrants.filter((item) => item.areaScope === 'unknown').slice(0, 10).map((item) => item.areaRaw),
});

console.log(`Converted ${hydrants.length} fire hydrant rows.`);
