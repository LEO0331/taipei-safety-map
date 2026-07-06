import { stat } from 'node:fs/promises';
import { countBy } from '../src/lib/safetyData.ts';
import type { SmartTrafficEnforcementEquipmentSummary, TrafficEnforcementItemCategory } from '../src/types.ts';
import { convertSmartTrafficEnforcementEquipmentRow, readCsv, writeJson } from './shared.ts';

const path = process.argv[2] ?? 'data/raw/smart-traffic-enforcement-equipment/smart-traffic-enforcement-equipment.csv';
const rows = await readCsv(path);
const records = rows.map(convertSmartTrafficEnforcementEquipmentRow);
const duplicateExamples: string[] = [];
const seen = new Set<string>();

for (const record of records) {
  const key = String(record.sourceSequenceNumber ?? '') || [record.equipmentNameRaw, record.enforcementRoadSection, record.sourceLongitudeRaw, record.sourceLatitudeRaw].join('|');
  if (seen.has(key) && duplicateExamples.length < 10) duplicateExamples.push(key);
  seen.add(key);
}

const firstActivationYears = Object.entries(countBy(records, (record) => record.firstActivationDate?.slice(0, 4)))
  .map(([year, recordCount]) => ({ year: Number(year), recordCount }))
  .sort((a, b) => a.year - b.year);
const itemCategoryRows = Object.entries(countBy(records.flatMap((record) => record.enforcementItemCategories), (category) => category))
  .map(([enforcementItemCategory, count]) => ({
    enforcementItemCategory: enforcementItemCategory as TrafficEnforcementItemCategory,
    count,
  }));

const summary: SmartTrafficEnforcementEquipmentSummary = {
  totalRecords: records.length,
  validCoordinateCount: records.filter((record) => record.coordinateStatus === 'valid').length,
  missingCoordinateCount: records.filter((record) => record.coordinateStatus === 'missing').length,
  outlierCoordinateCount: records.filter((record) => record.coordinateStatus === 'outlier').length,
  unparsedCoordinateCount: records.filter((record) => record.coordinateStatus === 'unparsed').length,
  equipmentTypeCount: new Set(records.flatMap((record) => (record.equipmentNameRaw ? [record.equipmentNameRaw] : []))).size,
  roadSectionCount: new Set(records.flatMap((record) => (record.enforcementRoadSection ? [record.enforcementRoadSection] : []))).size,
  recordsWithParsedStatusHistory: records.filter((record) => record.activationEvents.length).length,
  recordsWithSuspensionHistory: records.filter((record) => record.statusHistoryHasSuspension).length,
  recordsWithRestartHistory: records.filter((record) => record.statusHistoryHasRestart).length,
  byEquipmentType: Object.entries(countBy(records, (record) => record.equipmentNameRaw)).map(([equipmentType, count]) => ({
    equipmentType,
    equipmentTypeCategory: records.find((record) => record.equipmentNameRaw === equipmentType)?.equipmentTypeCategory ?? 'unknown',
    count,
  })),
  byRoadSectionType: Object.entries(countBy(records, (record) => record.roadSectionType)).map(([roadSectionType, count]) => ({
    roadSectionType: roadSectionType as SmartTrafficEnforcementEquipmentSummary['byRoadSectionType'][number]['roadSectionType'],
    count,
  })),
  byEnforcementItemCategory: itemCategoryRows,
  byFirstActivationYear: firstActivationYears,
  topRawEnforcementItemCombinations: Object.entries(countBy(records, (record) => record.enforcementItemsRaw))
    .map(([enforcementItemsRaw, count]) => ({ enforcementItemsRaw, count }))
    .sort((a, b) => b.count - a.count),
};
const file = await stat(path).catch(() => null);

await writeJson('public/data/smart-traffic-enforcement-equipment.json', records);
await writeJson('public/data/smart-traffic-enforcement-equipment-summary.json', summary);
await writeJson('public/data/smart-traffic-enforcement-equipment-conversion.json', {
  inputRows: rows.length,
  outputRows: records.length,
  fileSize: file?.size,
  encoding: 'UTF-8-SIG with Big5 / CP950 fallback',
  duplicateRows: duplicateExamples.length,
  validCoordinates: summary.validCoordinateCount,
  missingCoordinates: summary.missingCoordinateCount,
  unparsedCoordinates: summary.unparsedCoordinateCount,
  outlierCoordinates: summary.outlierCoordinateCount,
  unknownEquipmentTypeExamples: records.filter((record) => record.equipmentTypeCategory === 'unknown' || record.equipmentTypeCategory === 'other').map((record) => record.equipmentNameRaw ?? record.id),
  unknownEnforcementItemExamples: records.filter((record) => record.enforcementItemCategories.includes('unknown') || record.enforcementItemCategories.includes('other')).map((record) => record.enforcementItemsRaw ?? record.id),
  duplicateExamples,
});

console.log(`Converted ${records.length} smart traffic enforcement equipment rows.`);
