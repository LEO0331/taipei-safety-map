import { stat } from 'node:fs/promises';
import { countBy } from '../src/lib/safetyData.ts';
import type { PoliceCctvInstallationLocationSummary } from '../src/types.ts';
import {
  convertPoliceCctvInstallationLocationRow,
  extractCameraDirectionKeywords,
  readCsv,
  writeJson,
} from './shared.ts';

const inputPath = process.argv[2] ?? 'data/raw/police-cctv-installation-locations/police-cctv-installation-locations.csv';
const rows = await readCsv(inputPath);
const records = rows.map(convertPoliceCctvInstallationLocationRow);
const byDistrictRecords = Object.entries(countBy(records, (record) => record.district));
const byPoliceUnitRecords = Object.entries(countBy(records, (record) => record.policeUnit));
const duplicateFallbackKeys = Object.entries(
  countBy(records, (record) => [record.policeUnit, record.installationAddress, record.cameraDirection].filter(Boolean).join('|')),
).filter(([, count]) => count > 1);

const summary: PoliceCctvInstallationLocationSummary = {
  totalRecords: records.length,
  districtCount: Object.keys(countBy(records, (record) => record.district)).length,
  policeUnitCount: Object.keys(countBy(records, (record) => record.policeUnit)).length,
  uniqueInstallationAddressCount: Object.keys(countBy(records, (record) => record.installationAddressNormalized)).length,
  uniqueCameraDirectionCount: Object.keys(countBy(records, (record) => record.cameraDirectionNormalized)).length,
  recordsWithInstallationAddress: records.filter((record) => record.hasInstallationAddress).length,
  recordsWithCameraDirection: records.filter((record) => record.hasCameraDirection).length,
  recordsWithParsedDistrict: records.filter((record) => record.hasParsedDistrict).length,
  recordsWithParsedRoadName: records.filter((record) => record.hasParsedRoadName).length,
  byDistrict: byDistrictRecords
    .map(([district, recordCount]) => {
      const matching = records.filter((record) => record.district === district);
      return {
        district,
        recordCount,
        policeUnitBreakdown: Object.entries(countBy(matching, (record) => record.policeUnit))
          .map(([policeUnit, count]) => ({ policeUnit, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.recordCount - a.recordCount),
  byPoliceUnit: byPoliceUnitRecords
    .map(([policeUnit, count]) => ({
      policeUnit,
      count,
      districtCount: Object.keys(countBy(records.filter((record) => record.policeUnit === policeUnit), (record) => record.district)).length,
    }))
    .sort((a, b) => b.count - a.count),
  byRoadName: Object.entries(countBy(records, (record) => record.roadName))
    .map(([roadName, count]) => ({ roadName, count }))
    .sort((a, b) => b.count - a.count),
  byCameraDirectionKeyword: Object.entries(
    countBy(records.flatMap((record) => extractCameraDirectionKeywords(record.cameraDirectionNormalized)), (keyword) => keyword),
  )
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count),
  locationParsingQuality: {
    parsedDistrict: records.filter((record) => record.hasParsedDistrict).length,
    unparsedDistrict: records.filter((record) => record.hasInstallationAddress && !record.hasParsedDistrict).length,
    parsedRoadName: records.filter((record) => record.hasParsedRoadName).length,
    addressOnly: records.filter((record) => record.locationPrecision === 'address_only').length,
    missingAddress: records.filter((record) => !record.hasInstallationAddress).length,
  },
};

await writeJson('public/data/police-cctv-installation-locations.json', records);
await writeJson('public/data/police-cctv-installation-location-summary.json', summary);
await writeJson('public/data/police-cctv-installation-location-conversion.json', {
  inputRows: rows.length,
  outputRows: records.length,
  fileSize: (await stat(inputPath)).size,
  encoding: 'UTF-8-SIG with Big5 fallback',
  duplicateRows: Object.entries(countBy(records, (record) => record.sourceRecordHash)).filter(([, count]) => count > 1).length,
  duplicateSequenceNumbers: Object.entries(countBy(records, (record) => record.sourceSequenceNumber))
    .filter(([, count]) => count > 1)
    .slice(0, 20)
    .map(([key]) => key),
  duplicateAddresses: Object.entries(countBy(records, (record) => record.installationAddressNormalized))
    .filter(([, count]) => count > 1)
    .slice(0, 20)
    .map(([key]) => key),
  duplicatePoliceUnitAddresses: duplicateFallbackKeys.slice(0, 20).map(([key]) => key),
  addressParseWarnings: records
    .filter((record) => record.hasInstallationAddress && !record.hasParsedDistrict)
    .slice(0, 20)
    .map((record) => record.installationAddress ?? ''),
});

console.log(`Converted ${records.length} police CCTV installation-location rows.`);
