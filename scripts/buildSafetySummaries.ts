import { countBy } from '../src/lib/safetyData.ts';
import { loadConvertedData, sources, writeJson } from './shared.ts';
import { readFile, stat } from 'node:fs/promises';

const {
  shelters,
  burglaries,
  aeds,
  evacuationGates,
  medicalFacilities,
  dengueRecords,
  districtSummaries,
  dengueDistrictSummaries,
} = await loadConvertedData();
const evacuationGateFile = await stat('data/raw/evacuation-gates/evacuation-gates.csv').catch(() => null);
const evacuationGateFetchStatus = await readFile('data/raw/evacuation-gates/fetch-status.json', 'utf8')
  .then((value) => JSON.parse(value) as { failure?: string | null })
  .catch(() => null);
const evacuationGateSummary = {
  totalRecords: evacuationGates.length,
  validCoordinates: evacuationGates.filter((item) => item.coordinateStatus === 'valid').length,
  riversideParks: Object.keys(countBy(evacuationGates, (item) => item.riversidePark)).length,
  recordsWithLocationDescription: evacuationGates.filter((item) => item.description).length,
  byRiversidePark: countBy(evacuationGates, (item) => item.riversidePark),
};
const [hospitalFile, clinicFile] = await Promise.all([
  stat('data/raw/medical-facilities/hospitals.csv').catch(() => null),
  stat('data/raw/medical-facilities/clinics.csv').catch(() => null),
]);
const medicalFetchStatus = await readFile('data/raw/medical-facilities/fetch-status.json', 'utf8')
  .then((value) => JSON.parse(value) as Array<{ name: string; failure?: string | null }>)
  .catch(() => []);
const medicalFacilitiesByDistrict = countBy(medicalFacilities, (item) => item.district);
const medicalFacilitySummary = {
  totalMedicalFacilities: medicalFacilities.length,
  hospitalCount: medicalFacilities.filter((item) => item.facilityType === 'hospital').length,
  clinicCount: medicalFacilities.filter((item) => item.facilityType === 'clinic').length,
  validCoordinateCount: medicalFacilities.filter((item) => item.coordinateStatus === 'valid').length,
  recordsWithoutDistrict: medicalFacilities.filter((item) => !item.district).length,
  byDistrict: medicalFacilitiesByDistrict,
};

await writeJson('public/data/safety-dashboard-summary.json', {
  districtSummaries,
  dengueDistrictSummaries,
  aedCount: aeds.length,
  evacuationGateCount: evacuationGates.length,
  evacuationGateSummary,
  medicalFacilitySummary,
  dengueRecordCount: dengueRecords.length,
});
await writeJson('public/data/conversion-report.json', {
  generatedAt: new Date().toISOString(),
  sources: [
    {
      name: sources.shelters.name,
      url: sources.shelters.pageUrl,
      downloadUrl: sources.shelters.downloadUrl,
      downloadedAt: null,
      notes: 'Generated from local raw CSV when scripts are run.',
    },
    {
      name: sources.burglaries.name,
      url: sources.burglaries.pageUrl,
      downloadUrl: sources.burglaries.downloadUrl,
      downloadedAt: null,
      notes: 'Burglary addresses are pre-blurred by the data source and are aggregated in the app.',
    },
    {
      name: '臺北市AED自動體外心臟去顫器設置地點',
      url: 'https://data.taipei/dataset/detail?id=cd050577-115f-4299-b37a-012ff490a632',
      downloadUrl: '',
      downloadedAt: null,
      notes: 'Generated from the uploaded UTF-8-SIG CSV.',
    },
    {
      name: '臺北市登革熱病媒蚊密度調查結果',
      url: 'https://data.taipei/dataset/detail?id=1ec5170f-8507-48ad-ad91-c50cb1493119',
      downloadUrl: '',
      downloadedAt: null,
      notes: 'District and village survey results; no exact coordinates are provided.',
    },
    {
      name: '臺北市疏散門資訊',
      url: 'https://data.taipei/dataset/detail?id=443dc687-92b6-4ffd-8dc0-23738437b571',
      downloadUrl:
        'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=47cffd30-3527-45af-b709-6f76772e3cfb',
      downloadedAt: evacuationGateFile?.mtime.toISOString() ?? null,
      fileSize: evacuationGateFile?.size,
      encoding: 'UTF-8-SIG',
      notes: evacuationGateFetchStatus?.failure
        ? `Latest download failed: ${evacuationGateFetchStatus.failure}. Existing generated data was retained.`
        : 'WGS84 location records; operating status is not real-time.',
    },
    {
      name: '臺北市公私立醫療院所－臺北市醫院清冊',
      url: 'https://data.taipei/dataset/detail?id=ffdd5753-30db-4c38-b65f-b77892773d60',
      downloadUrl:
        'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=04a3d195-ee97-467a-b066-e471ff99d15d',
      downloadedAt: hospitalFile?.mtime.toISOString() ?? null,
      fileSize: hospitalFile?.size,
      encoding: 'Big5 / CP950',
      notes: medicalFetchStatus.find((item) => item.name === 'hospitals')?.failure
        ? 'Latest hospital download failed; existing generated data was retained.'
        : 'Hospital location records with WGS84 coordinates.',
    },
    {
      name: '臺北市公私立醫療院所－臺北市診所清冊',
      url: 'https://data.taipei/dataset/detail?id=ffdd5753-30db-4c38-b65f-b77892773d60',
      downloadUrl:
        'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=3a02af7d-8c33-46c1-8226-c12a11610f6b',
      downloadedAt: clinicFile?.mtime.toISOString() ?? null,
      fileSize: clinicFile?.size,
      encoding: 'Big5 / CP950',
      notes: medicalFetchStatus.find((item) => item.name === 'clinics')?.failure
        ? 'Latest clinic download failed; existing generated data was retained.'
        : 'Clinic location records with WGS84 coordinates.',
    },
  ],
  shelters: {
    inputRows: shelters.length,
    outputRows: shelters.length,
    validCoordinates: shelters.filter((shelter) => shelter.coordinateStatus === 'valid').length,
    missingCoordinates: shelters.filter((shelter) => shelter.coordinateStatus === 'missing').length,
    outlierCoordinates: shelters.filter((shelter) => shelter.coordinateStatus === 'outlier').length,
  },
  burglaries: {
    inputRows: burglaries.length,
    outputRows: burglaries.length,
    recordsWithoutDistrict: burglaries.filter((record) => !record.district).length,
    dateParseWarnings: burglaries.filter((record) => !record.year).length,
  },
  aeds: {
    inputRows: aeds.length,
    outputRows: aeds.length,
    validCoordinates: aeds.filter((item) => item.coordinateStatus === 'valid').length,
    missingCoordinates: aeds.filter((item) => item.coordinateStatus === 'missing').length,
    outlierCoordinates: aeds.filter((item) => item.coordinateStatus === 'outlier').length,
    recordsWithoutDistrict: aeds.filter((item) => !item.district).length,
  },
  dengue: {
    inputRows: dengueRecords.length,
    outputRows: dengueRecords.length,
    dateParseWarnings: dengueRecords.filter((item) => !item.surveyDate).length,
    numericParseWarnings: 0,
  },
  evacuationGates: {
    inputRows: evacuationGates.length,
    outputRows: evacuationGates.length,
    validCoordinates: evacuationGates.filter((item) => item.coordinateStatus === 'valid').length,
    missingCoordinates: evacuationGates.filter((item) => item.coordinateStatus === 'missing').length,
    outlierCoordinates: evacuationGates.filter((item) => item.coordinateStatus === 'outlier').length,
  },
  medicalFacilities: {
    inputRows: medicalFacilities.length,
    outputRows: medicalFacilities.length,
    hospitalCount: medicalFacilities.filter((item) => item.facilityType === 'hospital').length,
    clinicCount: medicalFacilities.filter((item) => item.facilityType === 'clinic').length,
    validCoordinates: medicalFacilities.filter((item) => item.coordinateStatus === 'valid').length,
    missingCoordinates: medicalFacilities.filter((item) => item.coordinateStatus === 'missing').length,
    outlierCoordinates: medicalFacilities.filter((item) => item.coordinateStatus === 'outlier').length,
    recordsWithoutDistrict: medicalFacilities.filter((item) => !item.district).length,
    unmappedDistrictExamples: medicalFacilities
      .filter((item) => !item.district)
      .slice(0, 5)
      .map((item) => `${item.facilityName}: ${item.districtCode ?? 'missing code'}`),
  },
  notes: [
    'Residential burglary records remain blurred and are never geocoded into exact household-level markers.',
    `Burglary time periods: ${Object.keys(countBy(burglaries, (record) => record.timePeriod)).join(', ')}`,
    'AED availability is not real-time.',
    'Dengue records are shown only as district/village survey aggregates.',
    'Evacuation gate records do not represent real-time operating status or safe routes.',
    'Medical facility records do not represent real-time opening, emergency-service, or care availability.',
  ],
});

console.log('Built safety dashboard summaries.');
