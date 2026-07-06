import { countBy } from '../src/lib/safetyData.ts';
import { loadConvertedData, sources, writeJson } from './shared.ts';
import { readFile, stat } from 'node:fs/promises';
import type {
  BicycleTheftSummary,
  EmergencyShelterSummary,
  FireDepartmentDonationInKindSummary,
  FireRescueDifficultAreaSummary,
  FireHydrantSummary,
  HistoricalFloodingSummary,
  ManagedHikingTrailSummary,
  MotorcycleTheftSummary,
  NaturalDisasterSuspensionSummary,
  PoliceCctvInstallationLocationSummary,
  SmartTrafficEnforcementEquipmentSummary,
  StreetRandomSnatchIncidentSummary,
  TrafficCctvSummary,
} from '../src/types.ts';

const {
  shelters,
  burglaries,
  aeds,
  evacuationGates,
  medicalFacilities,
  dengueRecords,
  districtSummaries,
  dengueDistrictSummaries,
  streetRandomSnatchIncidents,
  smartTrafficEnforcementEquipment,
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
const [fireHydrantSummary, fireHydrantConversion, fireHydrantFile, fireHydrantFetchStatus] = await Promise.all([
  readFile('public/data/fire-hydrant-summary.json', 'utf8').then((value) => JSON.parse(value) as FireHydrantSummary),
  readFile('public/data/fire-hydrant-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        duplicateRows: number;
        coordinateConflicts: number;
        coordinateConflictExamples: string[];
        areaParseWarnings: string[];
      },
  ),
  stat('data/raw/fire-hydrants/fire-hydrants.csv').catch(() => null),
  readFile('data/raw/fire-hydrants/fetch-status.json', 'utf8')
    .then((value) => JSON.parse(value) as { failure?: string | null })
    .catch(() => null),
]);
const [emergencyShelterSummary, emergencyShelterConversion, emergencyShelterFile, emergencyShelterFetchStatus] = await Promise.all([
  readFile('public/data/emergency-shelter-summary.json', 'utf8').then((value) => JSON.parse(value) as EmergencyShelterSummary),
  readFile('public/data/emergency-shelter-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        duplicateRows: number;
        recordsWithoutDistrict: number;
        invalidCapacityExamples: string[];
        invalidAreaExamples: string[];
        unmappedDistrictExamples: string[];
      },
  ),
  stat('data/raw/emergency-shelters/emergency-shelters.csv').catch(() => null),
  readFile('data/raw/emergency-shelters/fetch-status.json', 'utf8')
    .then((value) => JSON.parse(value) as { failure?: string | null })
    .catch(() => null),
]);
const [trafficCctvSummary, trafficCctvConversion, trafficCctvFile, trafficCctvFetchStatus] = await Promise.all([
  readFile('public/data/traffic-cctv-summary.json', 'utf8').then((value) => JSON.parse(value) as TrafficCctvSummary),
  readFile('public/data/traffic-cctv-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        duplicateRows: number;
        invalidCoordinateExamples: string[];
        outlierCoordinateExamples: string[];
        duplicateExamples: string[];
      },
  ),
  stat('data/raw/traffic-cctv/traffic-cctv.csv').catch(() => null),
  readFile('data/raw/traffic-cctv/fetch-status.json', 'utf8')
    .then((value) => JSON.parse(value) as { failure?: string | null })
    .catch(() => null),
]);
const [smartTrafficEnforcementEquipmentSummary, smartTrafficEnforcementEquipmentConversion, smartTrafficEnforcementEquipmentFile, smartTrafficEnforcementEquipmentFetchStatus] = await Promise.all([
  readFile('public/data/smart-traffic-enforcement-equipment-summary.json', 'utf8').then(
    (value) => JSON.parse(value) as SmartTrafficEnforcementEquipmentSummary,
  ),
  readFile('public/data/smart-traffic-enforcement-equipment-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        duplicateRows: number;
        unknownEquipmentTypeExamples: string[];
        unknownEnforcementItemExamples: string[];
        duplicateExamples: string[];
      },
  ),
  stat('data/raw/smart-traffic-enforcement-equipment/smart-traffic-enforcement-equipment.csv').catch(() => null),
  readFile('data/raw/smart-traffic-enforcement-equipment/fetch-status.json', 'utf8')
    .then((value) => JSON.parse(value) as { sourcePageUrl?: string; failure?: string | null })
    .catch(() => null),
]);
const [naturalDisasterSuspensionSummary, naturalDisasterSuspensionConversion, naturalDisasterSuspensionFile] = await Promise.all([
  readFile('public/data/natural-disaster-work-school-suspension-summary.json', 'utf8').then(
    (value) => JSON.parse(value) as NaturalDisasterSuspensionSummary,
  ),
  readFile('public/data/natural-disaster-work-school-suspension-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        dateParseWarnings: string[];
        invalidNumberExamples: string[];
        duplicateRows: number;
        duplicateExamples: string[];
        mixedOrUnclearExamples: string[];
      },
  ),
  stat('data/raw/natural-disaster-work-school-suspension-records/natural-disaster-work-school-suspension-records.csv').catch(() => null),
]);
const [bicycleTheftSummary, bicycleTheftConversion, bicycleTheftFile] = await Promise.all([
  readFile('public/data/bicycle-theft-summary.json', 'utf8').then((value) => JSON.parse(value) as BicycleTheftSummary),
  readFile('public/data/bicycle-theft-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        duplicateRows: number;
        dateParseWarnings: string[];
        timeBandParseWarnings: string[];
        locationParseWarnings: string[];
        duplicateExamples: string[];
      },
  ),
  stat('data/raw/bicycle-theft-records/bicycle-theft-records.csv').catch(() => null),
]);
const [motorcycleTheftSummary, motorcycleTheftConversion, motorcycleTheftFile] = await Promise.all([
  readFile('public/data/motorcycle-theft-summary.json', 'utf8').then((value) => JSON.parse(value) as MotorcycleTheftSummary),
  readFile('public/data/motorcycle-theft-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        duplicateRows: number;
        dateParseWarnings: string[];
        timeBandParseWarnings: string[];
        locationParseWarnings: string[];
        duplicateExamples: string[];
      },
  ),
  stat('data/raw/motorcycle-theft-records/motorcycle-theft-records.csv').catch(() => null),
]);
const [streetRandomSnatchIncidentSummary, streetRandomSnatchIncidentConversion, streetRandomSnatchIncidentFile, streetRandomSnatchIncidentFetchStatus] =
  await Promise.all([
    readFile('public/data/street-random-snatch-incident-summary.json', 'utf8').then(
      (value) => JSON.parse(value) as StreetRandomSnatchIncidentSummary,
    ),
    readFile('public/data/street-random-snatch-incident-conversion.json', 'utf8').then(
      (value) =>
        JSON.parse(value) as {
          inputRows: number;
          outputRows: number;
          duplicateRows: number;
          dateParseWarnings: string[];
          timeBandParseWarnings: string[];
          locationParseWarnings: string[];
          unexpectedCaseTypeWarnings: string[];
          duplicateExamples: string[];
        },
    ),
    stat('data/raw/street-random-snatch-incidents/street-random-snatch-incidents.csv').catch(() => null),
    readFile('data/raw/street-random-snatch-incidents/fetch-status.json', 'utf8')
      .then((value) => JSON.parse(value) as { sourceUrl?: string; failure?: string | null })
      .catch(() => null),
  ]);
const [
  policeCctvInstallationLocationSummary,
  policeCctvInstallationLocationConversion,
  policeCctvInstallationLocationFile,
  policeCctvInstallationLocationFetchStatus,
] = await Promise.all([
  readFile('public/data/police-cctv-installation-location-summary.json', 'utf8').then(
    (value) => JSON.parse(value) as PoliceCctvInstallationLocationSummary,
  ),
  readFile('public/data/police-cctv-installation-location-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        duplicateRows: number;
        duplicateSequenceNumbers: string[];
        duplicateAddresses: string[];
        duplicatePoliceUnitAddresses: string[];
        addressParseWarnings: string[];
      },
  ),
  stat('data/raw/police-cctv-installation-locations/police-cctv-installation-locations.csv').catch(() => null),
  readFile('data/raw/police-cctv-installation-locations/fetch-status.json', 'utf8')
    .then((value) => JSON.parse(value) as { sourceUrl?: string; failure?: string | null })
    .catch(() => null),
]);
const [fireDepartmentDonationInKindSummary, fireDepartmentDonationInKindConversion, fireDepartmentDonationInKindFetchStatus] = await Promise.all([
  readFile('public/data/fire-department-donation-in-kind-summary.json', 'utf8').then(
    (value) => JSON.parse(value) as FireDepartmentDonationInKindSummary,
  ),
  readFile('public/data/fire-department-donation-in-kind-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        unsupportedResources: string[];
        invalidYearExamples: string[];
        invalidDateExamples: string[];
        duplicateDonorNames: string[];
        duplicateFallbackKeys: string[];
      },
  ),
  readFile('data/raw/fire-department-donation-in-kind-records/fetch-status.json', 'utf8')
    .then((value) => JSON.parse(value) as { resources?: Array<{ name: string; sourceUrl: string; downloadedAt?: string; fileSize?: number; format: string; failure?: string | null }> })
    .catch(() => null),
]);
const [managedHikingTrailSummary, managedHikingTrailConversion, managedHikingTrailFetchStatus] = await Promise.all([
  readFile('public/data/managed-hiking-trail-summary.json', 'utf8').then(
    (value) => JSON.parse(value) as ManagedHikingTrailSummary,
  ),
  readFile('public/data/managed-hiking-trail-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        duplicatePrimaryKeys: string[];
        duplicateFallbackKeys: string[];
        duplicateTrailRouteNames: string[];
        duplicateStartPoints: string[];
        duplicateEndPoints: string[];
        duplicateCoordinatePairs: string[];
        invalidCoordinateExamples: string[];
        slopeParseWarnings: string[];
      },
  ),
  readFile('data/raw/managed-hiking-trails/fetch-status.json', 'utf8')
    .then((value) => JSON.parse(value) as { sourceUrl?: string; downloadedAt?: string; fileSize?: number; failure?: string | null })
    .catch(() => null),
]);
const [fireRescueDifficultAreaSummary, fireRescueDifficultAreaConversion, fireRescueDifficultAreaFetchStatus] = await Promise.all([
  readFile('public/data/fire-rescue-difficult-area-summary.json', 'utf8').then(
    (value) => JSON.parse(value) as FireRescueDifficultAreaSummary,
  ),
  readFile('public/data/fire-rescue-difficult-area-conversion.json', 'utf8').then(
    (value) =>
      JSON.parse(value) as {
        inputRows: number;
        outputRows: number;
        duplicateSequenceNumbers: string[];
        duplicateAddresses: string[];
        duplicatePlaceNames: string[];
        duplicateFallbackKeys: string[];
        unknownDistrictCodes: string[];
        unknownRatingLevels: string[];
        unknownRecognitionItems: string[];
        areaOrRangeAddressExamples: string[];
      },
  ),
  readFile('data/raw/fire-rescue-difficult-areas/fetch-status.json', 'utf8')
    .then((value) => JSON.parse(value) as { sourceUrl?: string; downloadedAt?: string; fileSize?: number; failure?: string | null })
    .catch(() => null),
]);
const [historicalFloodingSummary, historicalFloodingConversion, historicalFloodingFetchStatus] = await Promise.all([
  readFile('public/data/historical-flooding-summary.json', 'utf8')
    .then((value) => JSON.parse(value) as HistoricalFloodingSummary)
    .catch(() => null),
  readFile('public/data/historical-flooding-conversion.json', 'utf8')
    .then((value) => JSON.parse(value) as Record<string, unknown>)
    .catch(() => null),
  readFile('data/raw/historical-flooding-records/fetch-status.json', 'utf8')
    .then((value) => JSON.parse(value) as { fileSize?: number; failure?: string | null })
    .catch(() => null),
]);

await writeJson('public/data/safety-dashboard-summary.json', {
  districtSummaries,
  dengueDistrictSummaries,
  aedCount: aeds.length,
  bicycleTheftSummary,
  motorcycleTheftSummary,
  streetRandomSnatchIncidentSummary,
  policeCctvInstallationLocationSummary,
  fireDepartmentDonationInKindSummary,
  managedHikingTrailSummary,
  fireRescueDifficultAreaSummary,
  historicalFloodingSummary,
  evacuationGateCount: evacuationGates.length,
  evacuationGateSummary,
  medicalFacilitySummary,
  fireHydrantSummary,
  emergencyShelterSummary,
  trafficCctvSummary,
  smartTrafficEnforcementEquipmentSummary,
  naturalDisasterSuspensionSummary,
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
    {
      name: '大臺北地區消防栓分布點位圖',
      url: 'https://data.taipei/dataset/detail?id=c106a00b-5a21-4393-b213-475a0ece9f2b',
      downloadUrl:
        'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=b9f8154d-c627-48a8-b3ef-512ed9cde9e7',
      downloadedAt: fireHydrantFile?.mtime.toISOString() ?? null,
      fileSize: fireHydrantFile?.size,
      encoding: 'UTF-8-SIG',
      notes: fireHydrantFetchStatus?.failure
        ? `Latest fire hydrant download failed: ${fireHydrantFetchStatus.failure}. Existing generated data was retained.`
        : 'Greater Taipei hydrant records from 北水處; full hydrant JSON is lazy-loaded and not PWA-cached.',
    },
    {
      name: '臺北市可供避難收容處所一覽表',
      url: 'https://data.taipei/dataset/detail?id=aaf97773-3631-40e2-b3cc-da87bf2ce1d5',
      downloadUrl:
        'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=4c92dbd4-d259-495a-8390-52628119a4dd',
      downloadedAt: emergencyShelterFile?.mtime.toISOString() ?? null,
      fileSize: emergencyShelterFile?.size,
      encoding: 'UTF-8-SIG',
      notes: emergencyShelterFetchStatus?.failure
        ? `Latest emergency shelter download failed: ${emergencyShelterFetchStatus.failure}. Existing generated data was retained.`
        : 'Taipei emergency shelter public-data directory; records have no coordinates and are shown as district summaries plus address links.',
    },
    {
      name: '臺北市CCTV設施',
      url: 'https://data.taipei/dataset/detail?id=50a5c4ec-9515-4c30-b83f-30b66e37053d',
      downloadUrl:
        'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=d317a3c4-5621-4591-9cee-93334611e03e',
      downloadedAt: trafficCctvFile?.mtime.toISOString() ?? null,
      fileSize: trafficCctvFile?.size,
      encoding: 'Big5 / CP950',
      notes: trafficCctvFetchStatus?.failure
        ? `Latest CCTV download failed: ${trafficCctvFetchStatus.failure}. Existing generated data was retained.`
        : 'Traffic CCTV equipment location records from 交通局交工處; no live video, camera direction, or monitoring coverage is provided.',
    },
    {
      name: '臺北市智慧管理科技執法設備資料表',
      url: smartTrafficEnforcementEquipmentFetchStatus?.sourcePageUrl ?? 'https://data.taipei/dataset/detail?id=986fa73e-c470-4ebf-9f35-3a1c9d2a8788',
      downloadUrl: '',
      downloadedAt: smartTrafficEnforcementEquipmentFile?.mtime.toISOString() ?? null,
      fileSize: smartTrafficEnforcementEquipmentFile?.size,
      encoding: 'UTF-8-SIG with Big5 / CP950 fallback',
      notes: smartTrafficEnforcementEquipmentFetchStatus?.failure
        ? `Latest smart traffic enforcement equipment download failed: ${smartTrafficEnforcementEquipmentFetchStatus.failure}. Existing generated data was retained.`
        : 'Smart traffic-enforcement equipment public records for safety-awareness lookup only; not real-time enforcement status, route advice, legal advice, or device-operation verification.',
    },
    {
      name: '臺北市歷次天然災害停止上班上課訊息',
      url: 'https://data.taipei/dataset/detail?id=83b013c2-35f3-4470-98d7-03dd68a372cb',
      downloadUrl: '',
      downloadedAt: naturalDisasterSuspensionFile?.mtime.toISOString() ?? null,
      fileSize: naturalDisasterSuspensionFile?.size,
      encoding: 'UTF-8-SIG',
      notes:
        'Historical natural-disaster work/school suspension messages from 人事處; raw decision text is preserved and classifications are auxiliary only.',
    },
    {
      name: '臺北市自行車竊盜點位資訊',
      url: 'https://data.taipei/dataset/detail?id=5c5e9e13-9803-47c0-bbd2-1a4b3c11c49b',
      downloadUrl: '',
      downloadedAt: bicycleTheftFile?.mtime.toISOString() ?? null,
      fileSize: bicycleTheftFile?.size,
      encoding: 'CP950 / Big5-family',
      notes:
        'Historical bicycle theft public-safety records from 警察局刑警大隊; incident locations are pre-fuzzed text and are never geocoded into exact markers.',
    },
    {
      name: '臺北市機車竊盜點位資訊',
      url: 'https://data.taipei/dataset/detail?id=3a0e2289-a605-4eac-af30-f4af613f456d',
      downloadUrl: '',
      downloadedAt: motorcycleTheftFile?.mtime.toISOString() ?? null,
      fileSize: motorcycleTheftFile?.size,
      encoding: 'CP950 / Big5-family',
      notes:
        'Historical motorcycle theft public-safety records from 警察局刑警大隊; incident locations are pre-fuzzed text and are never geocoded into exact markers.',
    },
    {
      name: '臺北市街頭隨機搶奪案件點位資訊',
      url: 'https://data.taipei/dataset/detail?id=404ca667-bcc4-4f3b-9217-fdcc1da400b2',
      downloadUrl: streetRandomSnatchIncidentFetchStatus?.sourceUrl ?? '',
      downloadedAt: streetRandomSnatchIncidentFile?.mtime.toISOString() ?? null,
      fileSize: streetRandomSnatchIncidentFile?.size,
      encoding: 'CP950 / Big5-family',
      notes: streetRandomSnatchIncidentFetchStatus?.failure
        ? `Latest street random snatch download failed: ${streetRandomSnatchIncidentFetchStatus.failure}. Existing generated data was retained.`
        : 'Historical street random snatch public-safety records from 警察局刑警大隊; locations are pre-fuzzed text and are never geocoded into exact markers.',
    },
    {
      name: '臺北市政府警察局錄影監視系統設置區位',
      url: 'https://data.taipei/dataset/detail?id=e9b913ee-6df8-4663-bee5-aef6729d4389',
      downloadUrl:
        policeCctvInstallationLocationFetchStatus?.sourceUrl ??
        'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=5929d4ff-b7c5-4fa1-94e3-9d45576e8f37',
      downloadedAt: policeCctvInstallationLocationFile?.mtime.toISOString() ?? null,
      fileSize: policeCctvInstallationLocationFile?.size,
      encoding: 'UTF-8-SIG',
      notes: policeCctvInstallationLocationFetchStatus?.failure
        ? `Latest police CCTV installation-location download failed: ${policeCctvInstallationLocationFetchStatus.failure}. Existing generated data was retained.`
        : 'Police CCTV installation-location records from 警察局; the dataset has no official coordinates, so the app shows district summaries and an address-based directory only.',
    },
    {
      name: '臺北市政府消防局各年度接受各界捐贈實物明細表',
      url: 'https://data.taipei/dataset/detail?id=bcfdd7d7-7edd-441f-a69d-cb77f1ae4352',
      downloadUrl: fireDepartmentDonationInKindFetchStatus?.resources?.[0]?.sourceUrl ?? '',
      downloadedAt: fireDepartmentDonationInKindFetchStatus?.resources?.[0]?.downloadedAt ?? null,
      fileSize: fireDepartmentDonationInKindFetchStatus?.resources?.reduce((sum, item) => sum + (item.fileSize ?? 0), 0),
      encoding: 'UTF-8-SIG CSV; ODS resources reported unsupported',
      notes:
        'Fire Department annual in-kind donation records from 消防局; CSV annual resources are converted and ODS resources are reported as unsupported without map points.',
    },
    {
      name: '臺北市列管登山步道',
      url: 'https://data.taipei/dataset/detail?id=b5726297-d172-4ba7-b5c4-31de38e184e1',
      downloadUrl:
        managedHikingTrailFetchStatus?.sourceUrl ??
        'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=0d1d7db3-efc1-40d1-ad24-5a1a1f88e06b',
      downloadedAt: managedHikingTrailFetchStatus?.downloadedAt ?? null,
      fileSize: managedHikingTrailFetchStatus?.fileSize,
      encoding: 'Big5 / CP950 with UTF-8-SIG fallback',
      notes: managedHikingTrailFetchStatus?.failure
        ? `Latest managed hiking trail download failed: ${managedHikingTrailFetchStatus.failure}. Existing generated data was retained.`
        : 'Managed hiking trail records from 工務局大地處; start/end coordinates are source points only, not route geometry or real-time trail status.',
    },
    {
      name: '臺北市火災搶救困難地區',
      url: 'https://data.taipei/dataset/detail?id=0f322478-e09b-46af-8019-caeaa79678d7',
      downloadUrl:
        fireRescueDifficultAreaFetchStatus?.sourceUrl ??
        'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=577b3810-49b7-44fd-a5b7-97897bb50f9e',
      downloadedAt: fireRescueDifficultAreaFetchStatus?.downloadedAt ?? null,
      fileSize: fireRescueDifficultAreaFetchStatus?.fileSize,
      encoding: 'UTF-8-SIG with Big5 / CP950 fallback',
      notes: fireRescueDifficultAreaFetchStatus?.failure
        ? `Latest fire rescue difficult area download failed: ${fireRescueDifficultAreaFetchStatus.failure}. Existing generated data was retained.`
        : 'Fire rescue difficult area records from 消防局; the dataset has no official coordinates, so the app shows district summaries and address lookup records only.',
    },
    {
      name: '臺北市水利處歷史積水紀錄圖',
      url: 'https://data.taipei/dataset/detail?id=8377b584-81e9-432d-b902-5b4e9978e6bc',
      downloadUrl: '',
      downloadedAt: null,
      fileSize: historicalFloodingFetchStatus?.fileSize,
      encoding: 'KML',
      notes: historicalFloodingFetchStatus?.failure
        ? `Latest historical flooding KML download failed: ${historicalFloodingFetchStatus.failure}. Existing local KML was retained.`
        : 'Historical ponding/flooding KML records from 工務局水利處; source geometry is converted to GeoJSON for historical lookup only.',
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
  bicycleThefts: bicycleTheftConversion,
  motorcycleThefts: motorcycleTheftConversion,
  streetRandomSnatchIncidents: streetRandomSnatchIncidentConversion,
  policeCctvInstallationLocations: policeCctvInstallationLocationConversion,
  fireDepartmentDonations: fireDepartmentDonationInKindConversion,
  managedHikingTrails: managedHikingTrailConversion,
  fireRescueDifficultAreas: fireRescueDifficultAreaConversion,
  historicalFloodingRecords: historicalFloodingConversion,
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
  fireHydrants: {
    ...fireHydrantConversion,
    validCoordinates: fireHydrantSummary.validCoordinateCount,
    missingCoordinates: fireHydrantSummary.totalRecords - fireHydrantSummary.validCoordinateCount - fireHydrantSummary.outlierCoordinateCount,
    unparsedCoordinates: 0,
    outlierCoordinates: fireHydrantSummary.outlierCoordinateCount,
  },
  emergencyShelters: emergencyShelterConversion,
  trafficCctv: {
    ...trafficCctvConversion,
    validCoordinates: trafficCctvSummary.validCoordinateCount,
    missingCoordinates: trafficCctvSummary.missingCoordinateCount,
    unparsedCoordinates: trafficCctvSummary.unparsedCoordinateCount,
    outlierCoordinates: trafficCctvSummary.outlierCoordinateCount,
  },
  smartTrafficEnforcementEquipment: {
    ...smartTrafficEnforcementEquipmentConversion,
    validCoordinates: smartTrafficEnforcementEquipmentSummary.validCoordinateCount,
    missingCoordinates: smartTrafficEnforcementEquipmentSummary.missingCoordinateCount,
    unparsedCoordinates: smartTrafficEnforcementEquipmentSummary.unparsedCoordinateCount,
    outlierCoordinates: smartTrafficEnforcementEquipmentSummary.outlierCoordinateCount,
  },
  naturalDisasterSuspensions: naturalDisasterSuspensionConversion,
  notes: [
    'Residential burglary records remain blurred and are never geocoded into exact household-level markers.',
    'Bicycle theft records use pre-fuzzed address text and are shown only as district, road, and fuzzy-location summaries.',
    'Motorcycle theft records use pre-fuzzed address text and are shown only as district, road, and fuzzy-location summaries.',
    `Street random snatch records use ${streetRandomSnatchIncidents.length.toLocaleString()} pre-fuzzed source-location rows and are never shown as exact incident points.`,
    'Police CCTV installation-location records are shown as district summaries and address lookup records because the source has no official coordinates.',
    'Fire Department in-kind donation records have no official location fields and are shown as trends and directory records only.',
    'Managed hiking trail records provide start/end source coordinates only; connectors are approximate and not route geometry.',
    'Fire rescue difficult area records have no official coordinates and are shown as district summaries plus address lookup records only.',
    `Burglary time periods: ${Object.keys(countBy(burglaries, (record) => record.timePeriod)).join(', ')}`,
    'AED availability is not real-time.',
    'Dengue records are shown only as district/village survey aggregates.',
    'Evacuation gate records do not represent real-time operating status or safe routes.',
    'Medical facility records do not represent real-time opening, emergency-service, or care availability.',
    'Fire hydrant records do not represent real-time availability, fire-response deployment, or fire-safety level.',
    'Emergency shelter records do not represent real-time opening status, remaining capacity, or official evacuation instructions.',
    'CCTV records do not provide live video, camera direction, monitoring coverage, or public-safety scoring.',
    `Smart traffic enforcement equipment records include ${smartTrafficEnforcementEquipment.length.toLocaleString()} public-data rows; they are not real-time enforcement status, ticket-avoidance advice, route-avoidance advice, legal advice, or official device-operation verification.`,
    'Natural disaster suspension records are historical administrative messages and do not represent real-time closure status, forecasts, or emergency instructions.',
  ],
});

console.log('Built safety dashboard summaries.');

