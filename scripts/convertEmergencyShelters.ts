import { countBy } from '../src/lib/safetyData.ts';
import type { DisasterApplicabilityStatus, EmergencyShelter, EmergencyShelterSummary, EmergencyShelterType } from '../src/types.ts';
import { convertEmergencyShelterRow, parseNumberField, readCsv, writeJson } from './shared.ts';

const path = process.argv[2] ?? 'data/raw/emergency-shelters/emergency-shelters.csv';
const rows = await readCsv(path);
let duplicateRows = 0;
const duplicateExamples: string[] = [];
const byKey = new Map<string, EmergencyShelter>();

for (const row of rows) {
  const shelter = convertEmergencyShelterRow(row, byKey.size);
  const key = shelter.shelterId || [shelter.shelterName, shelter.address].filter(Boolean).join('|') || shelter.id;
  if (byKey.has(key)) {
    duplicateRows += 1;
    if (duplicateExamples.length < 10) duplicateExamples.push(key);
    continue;
  }
  byKey.set(key, shelter);
}

const shelters = [...byKey.values()];
const districtNames = [...new Set(shelters.flatMap((item) => (item.district ? [item.district] : [])))];
const typeEntries = Object.entries(countBy(shelters, (item) => item.shelterType));

const statusCounts = (field: keyof Pick<EmergencyShelter, 'floodStatus' | 'earthquakeStatus' | 'landslideStatus' | 'tsunamiStatus'>) =>
  Object.entries(countBy(shelters, (item) => item[field])).map(([status, count]) => ({
    status: status as DisasterApplicabilityStatus,
    count,
  }));

const summary: EmergencyShelterSummary = {
  totalRecords: shelters.length,
  uniqueShelterIdCount: new Set(shelters.map((item) => item.shelterId)).size,
  cityCount: new Set(shelters.flatMap((item) => (item.city ? [item.city] : []))).size,
  districtCount: districtNames.length,
  villageCount: new Set(shelters.flatMap((item) => (item.village ? [item.village] : []))).size,
  totalListedCapacityPeople: shelters.reduce((sum, item) => sum + (item.capacityPeople ?? 0), 0),
  totalKnownShelterAreaSqm: shelters.reduce((sum, item) => sum + (item.shelterAreaSqm ?? 0), 0),
  recordsWithCapacity: shelters.filter((item) => item.capacityPeople !== undefined).length,
  recordsWithArea: shelters.filter((item) => item.shelterAreaSqm !== undefined).length,
  reliefStationCount: shelters.filter((item) => item.isReliefStation).length,
  accessibleFacilityCount: shelters.filter((item) => item.hasAccessibleFacilities).length,
  indoorShelterCount: shelters.filter((item) => item.hasIndoorSpace).length,
  outdoorShelterCount: shelters.filter((item) => item.hasOutdoorSpace).length,
  byDistrict: districtNames.map((district) => {
    const records = shelters.filter((item) => item.district === district);
    return {
      district,
      count: records.length,
      totalListedCapacityPeople: records.reduce((sum, item) => sum + (item.capacityPeople ?? 0), 0),
      accessibleFacilityCount: records.filter((item) => item.hasAccessibleFacilities).length,
      reliefStationCount: records.filter((item) => item.isReliefStation).length,
      indoorShelterCount: records.filter((item) => item.hasIndoorSpace).length,
      outdoorShelterCount: records.filter((item) => item.hasOutdoorSpace).length,
      topShelterTypes: Object.entries(countBy(records, (item) => item.shelterType))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([shelterType, count]) => ({ shelterType: shelterType as EmergencyShelterType, count })),
    };
  }),
  byShelterType: typeEntries.map(([shelterType, count]) => ({
    shelterType: shelterType as EmergencyShelterType,
    count,
    totalListedCapacityPeople: shelters
      .filter((item) => item.shelterType === shelterType)
      .reduce((sum, item) => sum + (item.capacityPeople ?? 0), 0),
  })),
  byDisasterApplicability: {
    flood: statusCounts('floodStatus'),
    earthquake: statusCounts('earthquakeStatus'),
    landslide: statusCounts('landslideStatus'),
    tsunami: statusCounts('tsunamiStatus'),
  },
};

await writeJson('public/data/emergency-shelters.json', shelters);
await writeJson('public/data/emergency-shelter-summary.json', summary);
await writeJson('public/data/emergency-shelter-conversion.json', {
  inputRows: rows.length,
  outputRows: shelters.length,
  duplicateRows,
  duplicateExamples,
  recordsWithoutDistrict: shelters.filter((item) => !item.district).length,
  unmappedDistrictExamples: shelters.filter((item) => !item.district).slice(0, 10).map((item) => item.address ?? item.shelterName),
  invalidCapacityExamples: rows.filter((row) => row['容納人數'] && parseNumberField(row['容納人數']) === undefined).slice(0, 10).map((row) => row['容納人數']),
  invalidAreaExamples: rows
    .filter((row) => row['收容所面積（平方公尺）'] && parseNumberField(row['收容所面積（平方公尺）']) === undefined)
    .slice(0, 10)
    .map((row) => row['收容所面積（平方公尺）']),
});

console.log(`Converted ${shelters.length} emergency shelter rows.`);
