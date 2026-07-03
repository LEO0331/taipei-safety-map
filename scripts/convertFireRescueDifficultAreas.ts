import { readFile, stat } from 'node:fs/promises';
import { countBy } from '../src/lib/safetyData.ts';
import type {
  FireRescueDifficultAreaRecognitionItemCategory,
  FireRescueDifficultAreaSummary,
  FireRescueDifficultyRatingLevel,
} from '../src/types.ts';
import { convertFireRescueDifficultAreaRow, readCsv, writeJson } from './shared.ts';

const rawPath = process.argv[2] ?? 'data/raw/fire-rescue-difficult-areas/fire-rescue-difficult-areas.csv';
const rows = await readCsv(rawPath);
const records = rows.map(convertFireRescueDifficultAreaRow);
const duplicates = (values: Array<string | undefined>) =>
  Object.entries(countBy(values.map((value) => value || undefined), (value) => value))
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
const fallbackKeys = records.map((record) =>
  [record.districtCodeNormalized, record.ratingLevel, record.recognitionItemCode, record.addressNormalized, record.placeNameNormalized].join('|'),
);

const summary: FireRescueDifficultAreaSummary = {
  totalRecords: records.length,
  districtCount: new Set(records.flatMap((record) => (record.districtName ? [record.districtName] : []))).size,
  uniqueAddressCount: new Set(records.flatMap((record) => (record.addressNormalized ? [record.addressNormalized] : []))).size,
  uniquePlaceNameCount: new Set(records.flatMap((record) => (record.placeNameNormalized ? [record.placeNameNormalized] : []))).size,
  uniqueRecognitionItemCount: new Set(records.flatMap((record) => (record.recognitionItemCode ? [record.recognitionItemCode] : []))).size,
  uniqueRatingLevelCount: new Set(records.flatMap((record) => (record.ratingLevel ? [record.ratingLevel] : []))).size,
  recordsWithDistrictName: records.filter((record) => record.districtName).length,
  recordsWithAddress: records.filter((record) => record.address).length,
  recordsWithPlaceName: records.filter((record) => record.placeName).length,
  recordsWithAreaOrRangeAddress: records.filter((record) => record.addressLooksLikeAreaOrRange).length,
  recordsWithGeocodedCoordinates: records.filter((record) => record.coordinateSource === 'geocoded').length,
  recordsWithOfficialCoordinates: records.filter((record) => record.coordinateSource === 'official').length,
  byDistrict: Object.entries(countBy(records, (record) => record.districtCodeNormalized)).map(([districtCode, count]) => {
    const matching = records.filter((record) => record.districtCodeNormalized === districtCode);
    return {
      districtCode,
      districtName: matching[0]?.districtName,
      count,
      ratingLevel1Count: matching.filter((record) => record.ratingLevelCategory === 'level_1').length,
      ratingLevel2Count: matching.filter((record) => record.ratingLevelCategory === 'level_2').length,
      uniqueAddressCount: new Set(matching.flatMap((record) => (record.addressNormalized ? [record.addressNormalized] : []))).size,
      uniquePlaceNameCount: new Set(matching.flatMap((record) => (record.placeNameNormalized ? [record.placeNameNormalized] : []))).size,
    };
  }).sort((a, b) => b.count - a.count),
  byRatingLevel: Object.entries(countBy(records, (record) => record.ratingLevel)).map(([ratingLevel, count]) => {
    const matching = records.filter((record) => record.ratingLevel === ratingLevel);
    return {
      ratingLevel,
      ratingLevelCategory: (matching[0]?.ratingLevelCategory ?? 'unknown') as FireRescueDifficultyRatingLevel,
      count,
      districtCount: new Set(matching.flatMap((record) => (record.districtName ? [record.districtName] : []))).size,
    };
  }).sort((a, b) => b.count - a.count),
  byRecognitionItem: Object.entries(countBy(records, (record) => record.recognitionItemCode)).map(([recognitionItemCode, count]) => {
    const matching = records.filter((record) => record.recognitionItemCode === recognitionItemCode);
    return {
      recognitionItemCode,
      recognitionItemCategory: (matching[0]?.recognitionItemCategory ?? 'unknown') as FireRescueDifficultAreaRecognitionItemCategory,
      count,
      districtCount: new Set(matching.flatMap((record) => (record.districtName ? [record.districtName] : []))).size,
    };
  }).sort((a, b) => b.count - a.count),
  byRoadName: Object.entries(countBy(records, (record) => record.roadName)).map(([roadName, count]) => {
    const matching = records.filter((record) => record.roadName === roadName);
    return { roadName, count, districtCount: new Set(matching.flatMap((record) => (record.districtName ? [record.districtName] : []))).size };
  }).sort((a, b) => b.count - a.count),
  topPlaceNames: Object.entries(countBy(records, (record) => record.placeNameNormalized)).map(([placeName, count]) => {
    const matching = records.find((record) => record.placeNameNormalized === placeName);
    return { placeName, count, districtName: matching?.districtName };
  }).sort((a, b) => b.count - a.count).slice(0, 30),
  dataQuality: {
    missingSequenceNumberCount: records.filter((record) => !record.sourceSequenceNumberNormalized).length,
    duplicateSequenceNumberCount: duplicates(records.map((record) => record.sourceSequenceNumberNormalized)).length,
    missingRatingLevelCount: records.filter((record) => !record.ratingLevel).length,
    unknownRatingLevelCount: records.filter((record) => record.ratingLevelCategory === 'unknown' || record.ratingLevelCategory === 'other').length,
    missingRecognitionItemCount: records.filter((record) => !record.recognitionItemCode).length,
    unknownRecognitionItemCount: records.filter((record) => record.recognitionItemCategory === 'unknown' || record.recognitionItemCategory === 'other').length,
    missingDistrictCodeCount: records.filter((record) => !record.districtCode).length,
    unknownDistrictCodeCount: records.filter((record) => record.districtCode && !record.districtName).length,
    missingAddressCount: records.filter((record) => !record.address).length,
    missingPlaceNameCount: records.filter((record) => !record.placeName).length,
    duplicateAddressCount: duplicates(records.map((record) => record.addressNormalized)).length,
    duplicatePlaceNameCount: duplicates(records.map((record) => record.placeNameNormalized)).length,
    duplicateFallbackKeyCount: duplicates(fallbackKeys).length,
    areaOrRangeAddressCount: records.filter((record) => record.addressLooksLikeAreaOrRange).length,
  },
};

await writeJson('public/data/fire-rescue-difficult-areas.json', records);
await writeJson('public/data/fire-rescue-difficult-area-summary.json', summary);
await writeJson('public/data/fire-rescue-difficult-area-conversion.json', {
  inputRows: rows.length,
  outputRows: records.length,
  sourceFile: { path: rawPath, fileSize: (await stat(rawPath)).size },
  duplicateSequenceNumbers: duplicates(records.map((record) => record.sourceSequenceNumberNormalized)),
  duplicateAddresses: duplicates(records.map((record) => record.addressNormalized)),
  duplicatePlaceNames: duplicates(records.map((record) => record.placeNameNormalized)),
  duplicateFallbackKeys: duplicates(fallbackKeys),
  unknownDistrictCodes: [...new Set(records.filter((record) => record.districtCode && !record.districtName).map((record) => record.districtCode!))],
  unknownRatingLevels: [...new Set(records.filter((record) => record.ratingLevelCategory === 'other').map((record) => record.ratingLevel!))],
  unknownRecognitionItems: [...new Set(records.filter((record) => record.recognitionItemCategory === 'other').map((record) => record.recognitionItemCode!))],
  areaOrRangeAddressExamples: records.filter((record) => record.addressLooksLikeAreaOrRange).slice(0, 30).map((record) => `${record.address} / ${record.placeName ?? ''}`),
});

await readFile(rawPath);
console.log(`Converted ${records.length} fire rescue difficult area rows.`);
