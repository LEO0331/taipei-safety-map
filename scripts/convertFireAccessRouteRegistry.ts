import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { countBy, TAIPEI_DISTRICT_CODE_MAP } from '../src/lib/safetyData.ts';
import type { FireAccessRouteRegistryRecord, FireAccessRouteRegistrySummary } from '../src/types.ts';
import { readCsv, writeJson } from './shared.ts';

const rawPath = process.argv[2] ?? 'data/raw/fire-access-route-registry/fire-access-route-registry.csv';
const source = '臺北市政府消防局消防通道清冊';
const sourceAgency = '臺北市政府消防局';
const text = (value: string | undefined) => value?.trim() || undefined;
const normalize = (value: string | undefined) => text(value)?.replace(/\s+/g, '');
const duplicates = (values: Array<string | undefined>) => Object.entries(countBy(values.filter((value): value is string => Boolean(value)), (value) => value))
  .filter(([, count]) => count > 1).map(([value]) => value);
const rows = await readCsv(rawPath);
const records: FireAccessRouteRegistryRecord[] = rows.map((row, index) => {
  const sourceSequenceNumber = text(row['項次編號']);
  const districtCode = text(row['行政區代碼']);
  const districtCodeNormalized = normalize(districtCode);
  const villageName = text(row['里別']);
  const listedRouteName = text(row['列管名稱']);
  const listingCriteria = text(row['列管要件']);
  const difficultRescueLocation = text(row['搶救困難地區場所']);
  const responsibleFireStation = text(row['轄區分隊']);
  const phone = text(row['聯絡電話']);
  const sourceRecordHash = createHash('sha256').update([sourceSequenceNumber, districtCodeNormalized, villageName, listedRouteName, listingCriteria, difficultRescueLocation, responsibleFireStation, phone].join('|')).digest('hex');
  const districtName = districtCodeNormalized ? TAIPEI_DISTRICT_CODE_MAP[districtCodeNormalized] : undefined;
  const externalMapQuery = [districtName, villageName, listedRouteName, difficultRescueLocation].filter(Boolean).join(' ') || undefined;
  return {
    id: `fire-access-route-registry-${sourceSequenceNumber ?? index + 1}`,
    module: 'fire_access_route_registry', sourceSequenceNumber, sourceSequenceNumberNormalized: normalize(sourceSequenceNumber),
    districtCode, districtCodeNormalized, districtName, villageName, villageNameNormalized: normalize(villageName),
    listedRouteName, listedRouteNameNormalized: normalize(listedRouteName), listingCriteria, listingCriteriaNormalized: normalize(listingCriteria),
    difficultRescueLocation, difficultRescueLocationNormalized: normalize(difficultRescueLocation), responsibleFireStation, responsibleFireStationNormalized: normalize(responsibleFireStation),
    phone, phoneNormalized: normalize(phone), hasPhone: Boolean(phone), hasDifficultRescueLocation: Boolean(difficultRescueLocation), externalMapQuery,
    sourceRecordHash, source, sourceAgency,
  };
});
const byDistrict = Object.entries(countBy(records, (record) => record.districtCodeNormalized ?? 'unknown')).map(([districtCode, count]) => ({ districtCode, districtName: records.find((record) => (record.districtCodeNormalized ?? 'unknown') === districtCode)?.districtName, count })).sort((a, b) => b.count - a.count);
const byVillage = Object.entries(countBy(records.filter((record) => record.villageNameNormalized), (record) => record.villageNameNormalized!)).map(([villageName, count]) => ({ villageName, districtName: records.find((record) => record.villageNameNormalized === villageName)?.districtName, count })).sort((a, b) => b.count - a.count);
const byResponsibleFireStation = Object.entries(countBy(records.filter((record) => record.responsibleFireStationNormalized), (record) => record.responsibleFireStationNormalized!)).map(([responsibleFireStation, count]) => ({ responsibleFireStation, count })).sort((a, b) => b.count - a.count);
const missingFields = {
  sourceSequenceNumber: records.filter((record) => !record.sourceSequenceNumberNormalized).length,
  districtCode: records.filter((record) => !record.districtCodeNormalized).length,
  villageName: records.filter((record) => !record.villageNameNormalized).length,
  listedRouteName: records.filter((record) => !record.listedRouteNameNormalized).length,
  listingCriteria: records.filter((record) => !record.listingCriteriaNormalized).length,
  responsibleFireStation: records.filter((record) => !record.responsibleFireStationNormalized).length,
};
const summary: FireAccessRouteRegistrySummary = {
  totalRecords: records.length, districtCount: new Set(records.flatMap((record) => record.districtName ? [record.districtName] : [])).size,
  villageCount: new Set(records.flatMap((record) => record.villageNameNormalized ? [record.villageNameNormalized] : [])).size,
  responsibleFireStationCount: new Set(records.flatMap((record) => record.responsibleFireStationNormalized ? [record.responsibleFireStationNormalized] : [])).size,
  recordsWithDifficultRescueLocation: records.filter((record) => record.hasDifficultRescueLocation).length, recordsWithPhone: records.filter((record) => record.hasPhone).length,
  byDistrict, byVillage, byResponsibleFireStation,
  byDifficultRescueLocation: { withLocation: records.filter((record) => record.hasDifficultRescueLocation).length, withoutLocation: records.filter((record) => !record.hasDifficultRescueLocation).length },
  byPhone: { withPhone: records.filter((record) => record.hasPhone).length, withoutPhone: records.filter((record) => !record.hasPhone).length },
  dataQuality: { missingSequenceNumberCount: missingFields.sourceSequenceNumber, duplicateSequenceNumberCount: duplicates(records.map((record) => record.sourceSequenceNumberNormalized)).length, unknownDistrictCodeCount: records.filter((record) => record.districtCodeNormalized && !record.districtName).length, missingDistrictCodeCount: missingFields.districtCode, missingVillageNameCount: missingFields.villageName, missingListedRouteNameCount: missingFields.listedRouteName, missingListingCriteriaCount: missingFields.listingCriteria, missingResponsibleFireStationCount: missingFields.responsibleFireStation },
};
const conversion = { inputRows: rows.length, outputRows: records.length, sourceFile: { path: rawPath, fileSize: (await stat(rawPath)).size }, duplicateSequenceNumbers: duplicates(records.map((record) => record.sourceSequenceNumberNormalized)), unknownDistrictCodes: [...new Set(records.filter((record) => record.districtCodeNormalized && !record.districtName).map((record) => record.districtCodeNormalized!))], missingFields };
await writeJson('public/data/fire-access-route-registry.json', records);
await writeJson('public/data/fire-access-route-registry-summary.json', summary);
await writeJson('public/data/fire-access-route-registry-conversion.json', conversion);
console.log(`Converted ${records.length} fire access route registry rows.`);
