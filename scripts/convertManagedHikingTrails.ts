import { readFile, stat } from 'node:fs/promises';
import { countBy } from '../src/lib/safetyData.ts';
import type {
  HikingTrailLengthCategory,
  HikingTrailWalkingTimeCategory,
  ManagedHikingTrailSummary,
  MobileSignalConditionCategory,
  PortableToiletLocationCategory,
} from '../src/types.ts';
import { convertManagedHikingTrailRow, readCsv, writeJson } from './shared.ts';

const rawPath = process.argv[2] ?? 'data/raw/managed-hiking-trails/managed-hiking-trails.csv';
const rows = await readCsv(rawPath);
const records = rows.map(convertManagedHikingTrailRow);
const lengths = records.flatMap((record) => (record.totalLengthMeters != null ? [record.totalLengthMeters] : []));
const walkingTimes = records.flatMap((record) => (record.oneWayWalkingTimeMinutes != null ? [record.oneWayWalkingTimeMinutes] : []));
const average = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : undefined);
const duplicates = (values: Array<string | undefined>) =>
  Object.entries(countBy(values.map((value) => value || undefined), (value) => value))
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
const primaryKeys = records.map((record) => [record.sourceSequenceNumber, record.districtNormalized, record.trailRouteNameNormalized].join('|'));
const fallbackKeys = records.map((record) => [record.districtNormalized, record.trailRouteNameNormalized, record.startPointNameNormalized, record.endPointNameNormalized].join('|'));
const coordinatePairs = records.map((record) => [record.startLongitude, record.startLatitude, record.endLongitude, record.endLatitude].join('|'));

const summary: ManagedHikingTrailSummary = {
  totalRecords: records.length,
  totalLengthMeters: lengths.reduce((sum, value) => sum + value, 0),
  totalLengthKilometers: Number((lengths.reduce((sum, value) => sum + value, 0) / 1000).toFixed(3)),
  minLengthMeters: lengths.length ? Math.min(...lengths) : undefined,
  maxLengthMeters: lengths.length ? Math.max(...lengths) : undefined,
  averageLengthMeters: average(lengths),
  minWalkingTimeMinutes: walkingTimes.length ? Math.min(...walkingTimes) : undefined,
  maxWalkingTimeMinutes: walkingTimes.length ? Math.max(...walkingTimes) : undefined,
  averageWalkingTimeMinutes: average(walkingTimes),
  districtCount: new Set(records.flatMap((record) => (record.district ? [record.district] : []))).size,
  trailGradeCount: new Set(records.flatMap((record) => (record.trailGrade ? [record.trailGrade] : []))).size,
  recordsWithValidStartCoordinate: records.filter((record) => record.hasValidStartCoordinate).length,
  recordsWithValidEndCoordinate: records.filter((record) => record.hasValidEndCoordinate).length,
  recordsWithBothValidCoordinates: records.filter((record) => record.hasBothValidCoordinates).length,
  startPointStairCount: records.filter((record) => record.startPointHasStairs).length,
  endPointStairCount: records.filter((record) => record.endPointHasStairs).length,
  trailheadRoadblockCount: records.filter((record) => record.trailheadHasRoadblock).length,
  wheelchairSuitableCount: records.filter((record) => record.wheelchairSuitable).length,
  portableToiletCount: records.filter((record) => record.hasPortableToilet).length,
  accessibleToiletCount: records.filter((record) => record.hasAccessibleToilet).length,
  mobileSignalAvailableCount: records.filter((record) => record.mobileSignalConditionCategory === 'available').length,
  byDistrict: Object.entries(countBy(records, (record) => record.district)).map(([district, trailCount]) => {
    const districtRecords = records.filter((record) => record.district === district);
    const districtLengths = districtRecords.flatMap((record) => (record.totalLengthMeters != null ? [record.totalLengthMeters] : []));
    const districtWalkingTimes = districtRecords.flatMap((record) => (record.oneWayWalkingTimeMinutes != null ? [record.oneWayWalkingTimeMinutes] : []));
    return {
      district,
      trailCount,
      totalLengthMeters: districtLengths.reduce((sum, value) => sum + value, 0),
      averageLengthMeters: average(districtLengths),
      averageWalkingTimeMinutes: average(districtWalkingTimes),
      wheelchairSuitableCount: districtRecords.filter((record) => record.wheelchairSuitable).length,
      portableToiletCount: districtRecords.filter((record) => record.hasPortableToilet).length,
      accessibleToiletCount: districtRecords.filter((record) => record.hasAccessibleToilet).length,
    };
  }).sort((a, b) => b.trailCount - a.trailCount),
  byTrailGrade: Object.entries(countBy(records, (record) => record.trailGrade)).map(([trailGrade, count]) => {
    const matching = records.filter((record) => record.trailGrade === trailGrade);
    return {
      trailGrade,
      trailGradeCategory: matching[0]?.trailGradeCategory ?? 'unknown',
      count,
      totalLengthMeters: matching.reduce((sum, record) => sum + (record.totalLengthMeters ?? 0), 0),
    };
  }),
  byLengthCategory: Object.entries(countBy(records, (record) => record.lengthCategory))
    .map(([lengthCategory, count]) => ({ lengthCategory: lengthCategory as HikingTrailLengthCategory, count })),
  byWalkingTimeCategory: Object.entries(countBy(records, (record) => record.walkingTimeCategory))
    .map(([walkingTimeCategory, count]) => ({ walkingTimeCategory: walkingTimeCategory as HikingTrailWalkingTimeCategory, count })),
  byMobileSignalCondition: Object.entries(countBy(records, (record) => record.mobileSignalConditionCategory))
    .map(([mobileSignalConditionCategory, count]) => ({ mobileSignalConditionCategory: mobileSignalConditionCategory as MobileSignalConditionCategory, count })),
  byPortableToiletLocation: Object.entries(countBy(records, (record) => record.portableToiletLocationCategory))
    .map(([portableToiletLocationCategory, count]) => ({ portableToiletLocationCategory: portableToiletLocationCategory as PortableToiletLocationCategory, count })),
  longestTrails: records
    .filter((record) => record.trailRouteName)
    .sort((a, b) => (b.totalLengthMeters ?? 0) - (a.totalLengthMeters ?? 0))
    .slice(0, 10)
    .map((record) => ({ trailRouteName: record.trailRouteName!, district: record.district, totalLengthMeters: record.totalLengthMeters, oneWayWalkingTimeMinutes: record.oneWayWalkingTimeMinutes })),
  shortestTrails: records
    .filter((record) => record.trailRouteName)
    .sort((a, b) => (a.totalLengthMeters ?? Infinity) - (b.totalLengthMeters ?? Infinity))
    .slice(0, 10)
    .map((record) => ({ trailRouteName: record.trailRouteName!, district: record.district, totalLengthMeters: record.totalLengthMeters, oneWayWalkingTimeMinutes: record.oneWayWalkingTimeMinutes })),
  dataQuality: {
    missingTrailRouteNameCount: records.filter((record) => !record.trailRouteName).length,
    missingDistrictCount: records.filter((record) => !record.district).length,
    invalidLengthCount: records.filter((record) => record.totalLengthMeters == null).length,
    invalidWalkingTimeCount: records.filter((record) => record.oneWayWalkingTimeMinutes == null).length,
    invalidStartCoordinateCount: records.filter((record) => !record.hasValidStartCoordinate).length,
    invalidEndCoordinateCount: records.filter((record) => !record.hasValidEndCoordinate).length,
    duplicateTrailRouteNameCount: duplicates(records.map((record) => record.trailRouteNameNormalized)).length,
    duplicateStartPointCount: duplicates(records.map((record) => record.startPointNameNormalized)).length,
    duplicateEndPointCount: duplicates(records.map((record) => record.endPointNameNormalized)).length,
    duplicateFallbackKeyCount: duplicates(fallbackKeys).length,
  },
};

await writeJson('public/data/managed-hiking-trails.json', records);
await writeJson('public/data/managed-hiking-trail-summary.json', summary);
await writeJson('public/data/managed-hiking-trail-conversion.json', {
  inputRows: rows.length,
  outputRows: records.length,
  sourceFile: { path: rawPath, fileSize: (await stat(rawPath)).size },
  duplicatePrimaryKeys: duplicates(primaryKeys),
  duplicateFallbackKeys: duplicates(fallbackKeys),
  duplicateTrailRouteNames: duplicates(records.map((record) => record.trailRouteNameNormalized)),
  duplicateStartPoints: duplicates(records.map((record) => record.startPointNameNormalized)).slice(0, 30),
  duplicateEndPoints: duplicates(records.map((record) => record.endPointNameNormalized)).slice(0, 30),
  duplicateCoordinatePairs: duplicates(coordinatePairs),
  invalidCoordinateExamples: records
    .filter((record) => !record.hasBothValidCoordinates)
    .slice(0, 20)
    .map((record) => `${record.trailRouteName ?? record.id}: ${record.startCoordinateStatus}/${record.endCoordinateStatus}`),
  slopeParseWarnings: records
    .filter((record) => record.wheelchairAccessibleAverageSlopeRaw && record.wheelchairAccessibleSlopeCategory === 'unknown')
    .slice(0, 20)
    .map((record) => `${record.trailRouteName ?? record.id}: ${record.wheelchairAccessibleAverageSlopeRaw}`),
});

await readFile(rawPath);
console.log(`Converted ${records.length} managed hiking trail rows.`);
