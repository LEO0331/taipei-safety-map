import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { loadSafetyData } from './lib/loadSafetyData';
import { loadFireHydrants } from './lib/loadSafetyData';
import {
  TAIPEI_DISTRICT_CENTROIDS,
  TAIPEI_DISTRICTS,
  TIME_PERIODS,
  calculateDistanceMeters,
  buildDengueDistrictSummaries,
  buildShelterMapClusters,
  countBy,
  formatDistance,
  getBurglaryBubbleRadius,
  mostCommonEntry,
} from './lib/safetyData';
import { timePeriodLabels, translations } from './lib/translations';
import type {
  AedLocation,
  AirRaidShelter,
  BicycleTheftLocationFuzzinessLevel,
  BurglaryTimePeriod,
  CoordinateStatus,
  DengueDistrictSummary,
  DistrictSafetySummary,
  DisasterApplicabilityStatus,
  EmergencyShelterType,
  EvacuationGate,
  FireHydrant,
  FireHydrantAreaScope,
  FireHydrantType,
  IncidentTimeOfDayCategory,
  Language,
  MedicalFacility,
  MedicalFacilityType,
  NaturalDisasterType,
  WorkOrSchoolSuspensionStatus,
  WorkSchoolSuspensionDecisionCategory,
  ResidentialBurglaryRecord,
  SafetyDataBundle,
  TrafficCctvFacility,
} from './types';

type Tab = 'map' | 'nearby' | 'burglary' | 'bike' | 'motorcycle' | 'policeCctv' | 'fireDonations' | 'health' | 'disaster' | 'overview' | 'notes';
type CapacityRange = 'all' | 'under100' | '100-499' | '500-999' | '1000plus';
type DenseLayer = 'aeds' | 'medical' | 'fireHydrants' | 'airRaidShelters' | 'evacuationGates' | 'cctv';
const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
type MapViewport = {
  bounds: L.LatLngBounds | null;
  zoom: number;
};
type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

const shieldIcon = L.divIcon({
  className: 'shield-marker',
  html: '<span>🛡️</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const aedIcon = L.divIcon({
  className: 'shield-marker aed-marker',
  html: '<span>❤️‍🩹</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const evacuationGateIcon = L.divIcon({
  className: 'shield-marker evacuation-gate-marker',
  html: '<span>🚪</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const hospitalIcon = L.divIcon({
  className: 'shield-marker hospital-marker',
  html: '<span>🏥</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const clinicIcon = L.divIcon({
  className: 'shield-marker clinic-marker',
  html: '<span>⚕️</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const hydrantIcon = L.divIcon({
  className: 'shield-marker hydrant-marker',
  html: '<span>🚰</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const cctvIcon = L.divIcon({
  className: 'shield-marker cctv-marker',
  html: '<span>📹</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const userIcon = L.divIcon({
  className: 'user-marker',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const taipeiCenter: [number, number] = [25.0478, 121.5319];
const detailedShelterZoom = 15;
const maxDetailedShelterMarkers = 900;
const maxVisibleBurglaryRecords = 100;
const radiusOptions: SelectOption[] = [
  { value: '100', label: '100m' },
  { value: '300', label: '300m' },
  { value: '500', label: '500m' },
  { value: '1000', label: '1km' },
  { value: '2000', label: '2km' },
  { value: '5000', label: '5km' },
];
const hydrantDistrictCentroids: Record<string, { latitude: number; longitude: number }> = {
  ...TAIPEI_DISTRICT_CENTROIDS,
  三重區: { latitude: 25.0615, longitude: 121.4881 },
  中和區: { latitude: 24.9994, longitude: 121.4983 },
  永和區: { latitude: 25.0097, longitude: 121.5148 },
  新店區: { latitude: 24.9676, longitude: 121.5412 },
  汐止區: { latitude: 25.0642, longitude: 121.6587 },
  蘆洲區: { latitude: 25.0855, longitude: 121.4706 },
};
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const capacityOptions: SelectOption<CapacityRange>[] = [
  { value: 'all', label: 'All' },
  { value: 'under100', label: 'Under 100' },
  { value: '100-499', label: '100-499' },
  { value: '500-999', label: '500-999' },
  { value: '1000plus', label: '1,000+' },
];
const disasterStatuses: DisasterApplicabilityStatus[] = ['yes', 'no', 'backup', 'old_settlement', 'unknown'];
const naturalDisasterTypes: NaturalDisasterType[] = ['typhoon', 'heavy_rain', 'earthquake', 'tsunami_warning', 'cold_wave', 'other', 'unknown'];
const decisionCategories: WorkSchoolSuspensionDecisionCategory[] = [
  'citywide_full_suspension',
  'citywide_partial_day_suspension',
  'standard_met',
  'standard_not_met',
  'normal_work_school',
  'normal_with_local_exceptions',
  'school_only_suspension',
  'local_or_area_suspension',
  'mixed_or_unclear',
  'unknown',
];
const suspensionStatuses: WorkOrSchoolSuspensionStatus[] = [
  'suspended',
  'normal',
  'partial_day_suspended',
  'local_exception',
  'school_only',
  'standard_met',
  'standard_not_met',
  'mixed_or_unclear',
  'unknown',
];
const timeOfDayCategories: IncidentTimeOfDayCategory[] = [
  'late_night',
  'early_morning',
  'morning',
  'midday',
  'afternoon',
  'evening',
  'night',
  'cross_midnight',
  'unknown',
];
const locationFuzzinessLevels: BicycleTheftLocationFuzzinessLevel[] = [
  'address_range',
  'road_or_area_text',
  'facility_or_landmark_text',
  'district_only',
  'unknown',
];
const bicycleLabels = {
  zh: {
    all: '全部',
    title: '自行車竊盜點位資訊',
    shortTitle: '自行車竊盜',
    subtitle: '整理臺北市自行車竊盜歷史紀錄，依行政區、年份、月份、發生時段與模糊地點文字提供資料查詢與趨勢整理。',
    directory: '自行車竊盜紀錄清單',
    district: '行政區',
    year: '年度',
    month: '月份',
    quarter: '季度',
    timeBand: '發生時段',
    timeOfDay: '時段分類',
    road: '道路',
    village: '里',
    fuzziness: '地點模糊程度',
    hasAddressRange: '含地址範圍',
    search: '搜尋',
    searchPlaceholder: '搜尋行政區、道路、模糊地點、日期或發生時段',
    date: '日期',
    caseType: '案類',
    location: '模糊發生地點',
    recordCount: '歷史紀錄數',
    historicalCount: '自行車竊盜歷史紀錄數',
    dataDateRange: '資料日期範圍',
    districtsCovered: '涵蓋行政區數',
    fuzzyLocationCount: '模糊地點數',
    recordsWithParsedRoadName: '可解析道路紀錄數',
    topDistrict: '紀錄最多行政區',
    topTimeBand: '最常見發生時段',
    topTimeOfDay: '最常見時段分類',
    latestRecordDate: '最新紀錄日期',
    currentYearRecordCount: '本年度紀錄數',
    byYear: '各年度自行車竊盜紀錄數',
    byMonth: '各月份自行車竊盜紀錄數',
    byDistrict: '各行政區自行車竊盜紀錄數',
    byTimeBand: '各發生時段自行車竊盜紀錄數',
    byTimeOfDay: '各時段分類自行車竊盜紀錄數',
    topRoads: '較多歷史紀錄的道路',
    topBuckets: '較多歷史紀錄的模糊地點',
    mapNotice: '自行車竊盜資料未提供經緯度，且發生地點為預先模糊處理之地址文字。地圖以行政區彙總呈現，不代表精確案發地址、即時治安狀態或目前犯罪風險。',
    dataNote: '本資料為歷史治安公開資料，僅供資料查詢與趨勢整理，不代表即時治安狀態、目前犯罪風險、精確案發地址、路線安全保證、警政通報、法律意見或防竊建議。',
  },
  en: {
    all: 'All',
    title: 'Bicycle Theft Records',
    shortTitle: 'Bicycle Theft',
    subtitle: 'Explore Taipei historical bicycle theft records by district, year, month, incident time band, and fuzzy location text.',
    directory: 'Bicycle Theft Record Directory',
    district: 'District',
    year: 'Year',
    month: 'Month',
    quarter: 'Quarter',
    timeBand: 'Incident time band',
    timeOfDay: 'Time-of-day category',
    road: 'Road',
    village: 'Village',
    fuzziness: 'Location fuzziness',
    hasAddressRange: 'Has address range',
    search: 'Search',
    searchPlaceholder: 'Search district, road, fuzzy location, date, or time band',
    date: 'Date',
    caseType: 'Case type',
    location: 'Fuzzy incident location',
    recordCount: 'Historical record count',
    historicalCount: 'Historical bicycle theft record count',
    dataDateRange: 'Data date range',
    districtsCovered: 'Districts covered',
    fuzzyLocationCount: 'Fuzzy location count',
    recordsWithParsedRoadName: 'Records with parsed road name',
    topDistrict: 'Top district by records',
    topTimeBand: 'Most common time band',
    topTimeOfDay: 'Most common time-of-day category',
    latestRecordDate: 'Latest record date',
    currentYearRecordCount: 'Current-year record count',
    byYear: 'Bicycle theft records by year',
    byMonth: 'Bicycle theft records by month',
    byDistrict: 'Bicycle theft records by district',
    byTimeBand: 'Bicycle theft records by incident time band',
    byTimeOfDay: 'Bicycle theft records by time of day',
    topRoads: 'Roads with more historical records',
    topBuckets: 'Fuzzy locations with more historical records',
    mapNotice: 'Bicycle theft data does not provide coordinates, and incident locations are pre-fuzzed address text. The map shows district-level summaries and does not represent exact incident addresses, real-time public-safety status, or current crime risk.',
    dataNote: 'This data is historical public-safety open data for lookup and trend organization only. It does not represent real-time public-safety status, current crime risk, exact incident address, route-safety guarantee, police reporting, legal advice, or theft-prevention advice.',
  },
} as const;
const motorcycleLabels = {
  zh: {
    ...bicycleLabels.zh,
    title: '機車竊盜點位資訊',
    shortTitle: '機車竊盜',
    subtitle: '整理臺北市機車竊盜歷史紀錄，依行政區、年份、月份、發生時段與模糊地點文字提供資料查詢與趨勢整理。',
    directory: '機車竊盜紀錄清單',
    historicalCount: '機車竊盜歷史紀錄數',
    byYear: '各年度機車竊盜紀錄數',
    byMonth: '各月份機車竊盜紀錄數',
    byDistrict: '各行政區機車竊盜紀錄數',
    byTimeBand: '各發生時段機車竊盜紀錄數',
    byTimeOfDay: '各時段分類機車竊盜紀錄數',
    mapNotice: '機車竊盜資料未提供經緯度，且發生地點為預先模糊處理之地址文字。地圖以行政區彙總呈現，不代表精確案發地址、即時治安狀態或目前犯罪風險。',
    dataNote: '本資料為歷史治安公開資料，僅供資料查詢與趨勢整理，不代表即時治安狀態、目前犯罪風險、精確案發地址、路線安全保證、警政通報、法律意見、保險意見或防竊建議。',
  },
  en: {
    ...bicycleLabels.en,
    title: 'Motorcycle Theft Records',
    shortTitle: 'Motorcycle Theft',
    subtitle: 'Explore Taipei historical motorcycle theft records by district, year, month, incident time band, and fuzzy location text.',
    directory: 'Motorcycle Theft Record Directory',
    historicalCount: 'Historical motorcycle theft record count',
    byYear: 'Motorcycle theft records by year',
    byMonth: 'Motorcycle theft records by month',
    byDistrict: 'Motorcycle theft records by district',
    byTimeBand: 'Motorcycle theft records by incident time band',
    byTimeOfDay: 'Motorcycle theft records by time of day',
    mapNotice: 'Motorcycle theft data does not provide coordinates, and incident locations are pre-fuzzed address text. The map shows district-level summaries and does not represent exact incident addresses, real-time public-safety status, or current crime risk.',
    dataNote: 'This data is historical public-safety open data for lookup and trend organization only. It does not represent real-time public-safety status, current crime risk, exact incident address, route-safety guarantee, police reporting, legal advice, insurance advice, or theft-prevention advice.',
  },
} as const;
const policeCctvLabels = {
  zh: {
    all: '全部',
    title: '警察局錄影監視系統設置區位',
    subtitle: '整理臺北市政府警察局錄影監視系統設置區位公開資料，依所屬單位、安裝地址、攝影方向與行政區提供查詢與統計。',
    directory: '警察局錄影監視系統設置區位清單',
    districtDistribution: '警察局監視器行政區分布',
    policeUnit: '所屬單位',
    district: '行政區',
    road: '道路',
    cameraDirectionKeyword: '攝影方向關鍵字',
    search: '搜尋',
    searchPlaceholder: '搜尋所屬單位、安裝地址、攝影方向、行政區或編號',
    hasInstallationAddress: '有安裝地址',
    hasCameraDirection: '有攝影方向',
    hasParsedDistrict: '有解析行政區',
    hasParsedRoadName: '有解析道路',
    recordCount: '紀錄數',
    cityCountyCode: '縣市別代碼',
    sourceSequenceNumber: '編號',
    installationAddress: '安裝地址',
    cameraDirection: '攝影方向',
    mapLookup: '地圖查詢',
    installationRecordCount: '警察局監視器設置紀錄數',
    policeUnitCount: '所屬單位數',
    uniqueInstallationAddressCount: '不重複安裝地址數',
    recordsWithCameraDirection: '有攝影方向紀錄',
    recordsWithParsedDistrict: '有解析行政區紀錄',
    recordsWithParsedRoadName: '有解析道路紀錄',
    topDistrict: '紀錄最多行政區',
    topPoliceUnit: '紀錄最多所屬單位',
    byDistrict: '各行政區警察局監視器紀錄數',
    byPoliceUnit: '各所屬單位警察局監視器紀錄數',
    cameraDirectionAvailability: '攝影方向有無',
    topRoads: '道路紀錄數',
    keywordSummary: '攝影方向關鍵字統計',
    parsingQuality: '地點解析品質',
    mapNotice: '警察局錄影監視系統設置區位資料未提供官方經緯度，地圖以行政區彙總呈現，不代表精確設備位置、即時運作狀態或攝影範圍。',
    popupNotice: '本圖以行政區彙總設置區位紀錄，不代表精確設備位置、即時運作狀態或攝影範圍。',
    dataNote: '警察局錄影監視系統設置區位資料提供臺北市政府警察局錄影監視系統設置區位公開紀錄，欄位包含縣市別代碼、編號、所屬單位、安裝地址與攝影方向。本網站解析安裝地址中的行政區與道路名稱，並以行政區彙總呈現。資料未提供官方經緯度，因此預設不顯示精確點位。',
    interpretationNote: '本資料為錄影監視系統設置區位公開紀錄，僅供資料查詢與統計整理，不代表即時影像、即時運作狀態、完整監視器清冊、精確攝影範圍、犯罪預測、治安風險判定、路線安全保證、隱私或法律意見、警政通報或官方保證。實際設備狀態、調閱程序、警政勤務、監視器管理與最新資訊請以臺北市政府警察局及主管機關公告為準。',
  },
  en: {
    all: 'All',
    title: 'Police CCTV Installation Locations',
    subtitle: 'Explore Taipei City Police Department CCTV installation-location public records by police unit, installation address, camera direction, and district.',
    directory: 'Police CCTV Installation Directory',
    districtDistribution: 'Police CCTV District Distribution',
    policeUnit: 'Police unit',
    district: 'District',
    road: 'Road',
    cameraDirectionKeyword: 'Camera direction keyword',
    search: 'Search',
    searchPlaceholder: 'Search police unit, installation address, camera direction, district, or sequence number',
    hasInstallationAddress: 'Has installation address',
    hasCameraDirection: 'Has camera direction',
    hasParsedDistrict: 'Has parsed district',
    hasParsedRoadName: 'Has parsed road',
    recordCount: 'Record count',
    cityCountyCode: 'City/county code',
    sourceSequenceNumber: 'Sequence number',
    installationAddress: 'Installation address',
    cameraDirection: 'Camera direction',
    mapLookup: 'Map lookup',
    installationRecordCount: 'Police CCTV installation record count',
    policeUnitCount: 'Police unit count',
    uniqueInstallationAddressCount: 'Unique installation address count',
    recordsWithCameraDirection: 'Records with camera direction',
    recordsWithParsedDistrict: 'Records with parsed district',
    recordsWithParsedRoadName: 'Records with parsed road',
    topDistrict: 'Top district by record count',
    topPoliceUnit: 'Top police unit by record count',
    byDistrict: 'Police CCTV records by district',
    byPoliceUnit: 'Police CCTV records by police unit',
    cameraDirectionAvailability: 'Camera direction availability',
    topRoads: 'Top roads by record count',
    keywordSummary: 'Camera direction keyword summary',
    parsingQuality: 'Location parsing quality',
    mapNotice: 'Police CCTV installation-location data does not provide official coordinates. The map shows district-level summaries and does not represent exact device locations, real-time operational status, or camera field of view.',
    popupNotice: 'This map summarizes installation-location records by district and does not represent exact device locations, real-time operational status, or camera field of view.',
    dataNote: 'Police CCTV installation-location data provides Taipei City Police Department public records for video-surveillance system installation locations. Fields include city/county code, sequence number, police unit, installation address, and camera direction. This site parses district and road name from installation addresses and presents district-level summaries. The data does not provide official coordinates, so exact points are not shown by default.',
    interpretationNote: 'This data is public record information for video-surveillance system installation locations and is for lookup and statistical organization only. It does not represent live video, real-time operational status, a complete camera inventory, exact field of view, crime prediction, public-safety risk determination, route-safety guarantee, privacy or legal advice, police notification, or official guarantee. Actual equipment status, footage request procedures, policing operations, CCTV management, and latest information should be verified with Taipei City Police Department and competent-authority announcements.',
  },
} as const;
const fireDonationLabels = {
  zh: {
    all: '全部',
    title: '消防局接受各界捐贈實物明細',
    subtitle: '整理臺北市政府消防局各年度接受各界捐贈實物公開資料，包含年度、月份、日、捐贈者、捐贈財物與捐贈用途。',
    shortTitle: '消防捐贈實物',
    year: '年度',
    month: '月份',
    day: '日',
    donor: '捐贈者',
    donatedItem: '捐贈財物',
    donationPurpose: '捐贈用途',
    itemCategory: '捐贈財物類別',
    purposeCategory: '捐贈用途類別',
    sourceResource: '來源檔案',
    possibleReceivingUnit: '可能受贈單位',
    search: '搜尋',
    searchPlaceholder: '搜尋捐贈者、捐贈財物、捐贈用途、年度或可能受贈單位',
    medical: '救護或醫療相關',
    protective: '防護裝備相關',
    vehicle: '車輛或運輸相關',
    electronics: '電子或通訊相關',
    food: '食品或物資相關',
    training: '訓練或宣導相關',
    recordCount: '捐贈紀錄數',
    yearRange: '年度範圍',
    latestYear: '最新年度',
    uniqueDonorCount: '不重複捐贈者數',
    uniqueDonatedItemCount: '不重複捐贈財物數',
    uniqueDonationPurposeCount: '不重複捐贈用途數',
    recordsWithCompleteDate: '有完整日期紀錄',
    topDonor: '紀錄最多捐贈者',
    topItemCategory: '最多捐贈財物類別',
    topPurposeCategory: '最多捐贈用途類別',
    byYear: '各年度捐贈紀錄數',
    byMonth: '各月捐贈紀錄數',
    itemCategoryDistribution: '捐贈財物類別分布',
    purposeCategoryDistribution: '捐贈用途類別分布',
    topDonors: '紀錄最多捐贈者',
    topItems: '常見捐贈財物',
    topPurposes: '常見捐贈用途',
    resourceBreakdown: '來源檔案分布',
    noMapNotice: '消防局接受各界捐贈實物明細未提供官方經緯度、地址、消防分隊、行政區或受贈單位位置欄位。本模組以年度、月份、捐贈者、捐贈財物與捐贈用途進行統計，不顯示地圖點位，也不自動連結消防分隊或緊急設施。',
    dataNote: '消防局接受各界捐贈實物明細提供臺北市政府消防局各年度接受各界捐贈實物之公開資料，欄位包含項次編號、年度、月份、日、捐贈者、捐贈財物與捐贈用途。資料未提供官方經緯度、地址、消防分隊、行政區或受贈單位位置欄位，因此不顯示地圖點位。',
    interpretationNote: '本資料為消防局受贈實物行政公開紀錄，僅供查詢來源欄位與統計整理，不代表即時消防設備庫存、消防分隊現有裝備、採購紀錄、預算支出、災害應變能力評分、公共安全風險判斷、捐贈者背書或受贈物品目前仍在使用。',
  },
  en: {
    all: 'All',
    title: 'Fire Department In-Kind Donation Records',
    subtitle: 'Explore Taipei City Fire Department annual public records of in-kind donations, including year, month, day, donor, donated goods, and donation purpose.',
    shortTitle: 'Fire Dept Donations',
    year: 'Year',
    month: 'Month',
    day: 'Day',
    donor: 'Donor',
    donatedItem: 'Donated goods',
    donationPurpose: 'Donation purpose',
    itemCategory: 'Donated item category',
    purposeCategory: 'Donation purpose category',
    sourceResource: 'Source resource',
    possibleReceivingUnit: 'Possible receiving unit',
    search: 'Search',
    searchPlaceholder: 'Search donor, donated goods, donation purpose, year, or possible receiving unit',
    medical: 'Medical or rescue related',
    protective: 'Protective equipment related',
    vehicle: 'Vehicle or transport related',
    electronics: 'Electronics or communication related',
    food: 'Food or supplies related',
    training: 'Training or education related',
    recordCount: 'Donation record count',
    yearRange: 'Year range',
    latestYear: 'Latest year',
    uniqueDonorCount: 'Unique donor count',
    uniqueDonatedItemCount: 'Unique donated item count',
    uniqueDonationPurposeCount: 'Unique donation purpose count',
    recordsWithCompleteDate: 'Records with complete date',
    topDonor: 'Top donor by record count',
    topItemCategory: 'Top donated item category',
    topPurposeCategory: 'Top donation purpose category',
    byYear: 'Donation record count by year',
    byMonth: 'Donation record count by month',
    itemCategoryDistribution: 'Donated item category distribution',
    purposeCategoryDistribution: 'Donation purpose category distribution',
    topDonors: 'Top donors by record count',
    topItems: 'Top donated goods',
    topPurposes: 'Top donation purposes',
    resourceBreakdown: 'Source resource breakdown',
    noMapNotice: 'Fire Department in-kind donation records do not provide official coordinates, addresses, fire station, district, or receiving-unit location fields. This module summarizes year, month, donor, donated goods, and donation purpose. It does not show map points and does not automatically link records to fire stations or emergency facilities.',
    dataNote: 'Fire Department in-kind donation records provide Taipei City Fire Department annual public data on donated goods received from various parties. Fields include sequence number, year, month, day, donor, donated goods, and donation purpose. The data does not provide official coordinates, addresses, fire station, district, or receiving-unit location fields, so no map points are shown.',
    interpretationNote: 'This data is administrative public record information about in-kind donations received by the Fire Department for source-field lookup and statistical organization only. It does not represent real-time fire equipment inventory, current equipment at any fire station, procurement records, budget expenditure, disaster-response readiness scoring, public-safety risk assessment, donor endorsement, or proof that donated goods are still in use.',
  },
} as const;
const disasterLabels = {
  zh: {
    all: '全部',
    title: '天然災害停班停課紀錄',
    year: '年度',
    month: '月份',
    date: '日期',
    disasterName: '天然災害名稱',
    disasterType: '災害類型',
    decisionCategory: '停班停課分類',
    workStatus: '上班狀態',
    schoolStatus: '上課狀態',
    mentionedDistrict: '提及行政區',
    search: '搜尋',
    searchPlaceholder: '搜尋災害名稱、停班停課內容、年份或提及地點',
    citywide: '全市性',
    partialDay: '部分時段',
    localException: '局部例外',
    schoolOnly: '僅停課或學校例外',
    mountainArea: '山區例外',
    historicalRecordCount: '歷史紀錄數',
    dataDateRange: '資料日期範圍',
    disasterNameCount: '災害名稱數',
    eventGroupCount: '事件分組數',
    typhoonRecordCount: '颱風紀錄數',
    heavyRainRecordCount: '豪雨紀錄數',
    citywideSuspensionCount: '全市停班停課紀錄數',
    normalWorkSchoolCount: '照常上班上課紀錄數',
    localExceptionCount: '局部例外紀錄數',
    latestRecordDate: '最新紀錄日期',
    recordsByYear: '各年度紀錄數',
    recordsByMonth: '各月份紀錄數',
    recordsByDisasterType: '各災害類型紀錄數',
    recordsByDecisionCategory: '各停班停課分類紀錄數',
    timeline: '停班停課時間軸',
    eventGroups: '事件分組',
    directory: '天然災害停班停課紀錄清單',
    recordCount: '紀錄數',
    suspensionMessage: '臺北市停止上班上課情形',
    disclaimer:
      '天然災害停班停課紀錄為臺北市公開資料中的歷史訊息，僅供查詢歷次天然災害期間停止上班上課公告紀錄與趨勢整理，不代表即時停班停課資訊、目前災害狀態、氣象預報、交通安全、避難指示或緊急應變指令。',
    timelineNote: '歷史訊息中的「停止辦公上課」與「停止上班上課」用語會因年代與官方表述而不同，本網站保留原文並提供輔助分類。',
    eventGroupNotice: '事件分組僅依年份與災害名稱整理歷史停班停課訊息，不代表災害強度、損失程度、影響範圍或風險等級。',
  },
  en: {
    all: 'All',
    title: 'Natural Disaster Work/School Suspension Records',
    year: 'Year',
    month: 'Month',
    date: 'Date',
    disasterName: 'Disaster name',
    disasterType: 'Disaster type',
    decisionCategory: 'Decision category',
    workStatus: 'Work status',
    schoolStatus: 'School status',
    mentionedDistrict: 'Mentioned district',
    search: 'Search',
    searchPlaceholder: 'Search disaster name, suspension message, year, or mentioned place',
    citywide: 'Citywide',
    partialDay: 'Partial day',
    localException: 'Local exception',
    schoolOnly: 'School-only or school exception',
    mountainArea: 'Mountain-area exception',
    historicalRecordCount: 'Historical record count',
    dataDateRange: 'Data date range',
    disasterNameCount: 'Disaster name count',
    eventGroupCount: 'Event group count',
    typhoonRecordCount: 'Typhoon record count',
    heavyRainRecordCount: 'Heavy-rain record count',
    citywideSuspensionCount: 'Citywide suspension count',
    normalWorkSchoolCount: 'Normal work/school count',
    localExceptionCount: 'Local exception count',
    latestRecordDate: 'Latest record date',
    recordsByYear: 'Records by year',
    recordsByMonth: 'Records by month',
    recordsByDisasterType: 'Records by disaster type',
    recordsByDecisionCategory: 'Records by decision category',
    timeline: 'Suspension Timeline',
    eventGroups: 'Event Groups',
    directory: 'Natural Disaster Suspension Record Directory',
    recordCount: 'Record count',
    suspensionMessage: 'Suspension message',
    disclaimer:
      'Natural disaster work/school suspension records are historical public-data messages from Taipei. They are provided only for looking up past suspension announcements and organizing historical trends. They do not represent real-time work/school suspension information, current disaster status, weather forecasts, traffic safety, evacuation instructions, or emergency-response orders.',
    timelineNote: 'Historical messages may use different official wording across periods. This site preserves the original text and provides auxiliary classification.',
    eventGroupNotice: 'Event groups organize historical suspension messages only by year and disaster name. They do not represent disaster intensity, damage level, impact area, or risk level.',
  },
} as const;

function App() {
  const [language, setLanguage] = useState<Language>('zh');
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [data, setData] = useState<SafetyDataBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSafetyData().then(setData).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load data');
    });
  }, []);

  const t = translations[language];

  if (error) {
    return <main className="status-screen">{error}</main>;
  }

  if (!data) {
    return <main className="status-screen">{language === 'zh' ? '載入資料中...' : 'Loading data...'}</main>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Public safety information</p>
          <h1>{t.appTitle}</h1>
          <p>{t.appSubtitle}</p>
        </div>
        <button
          className="language-toggle"
          type="button"
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          aria-label="Toggle language"
        >
          {language === 'zh' ? 'EN' : '中文'}
        </button>
      </header>

      <nav className="tabs" aria-label="Main sections">
        {(
          [
            ['map', t.safetyMap],
            ['nearby', t.nearbyFacilities],
            ['burglary', t.burglaryRecords],
            ['bike', language === 'zh' ? '自行車竊盜' : 'Bicycle Theft'],
            ['motorcycle', language === 'zh' ? '機車竊盜' : 'Motorcycle Theft'],
            ['policeCctv', language === 'zh' ? '警察局監視器' : 'Police CCTV'],
            ['fireDonations', language === 'zh' ? '消防捐贈實物' : 'Fire Dept Donations'],
            ['health', t.publicHealth],
            ['disaster', language === 'zh' ? '停班停課紀錄' : 'Closure Records'],
            ['overview', t.safetyOverview],
            ['notes', t.dataNotes],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'map' && <SafetyMap data={data} language={language} />}
      {activeTab === 'nearby' && <SafetyMap data={data} language={language} nearbyMode />}
      {activeTab === 'burglary' && <BurglaryRecords data={data} language={language} />}
      {activeTab === 'bike' && <BicycleTheftRecords data={data} language={language} />}
      {activeTab === 'motorcycle' && <BicycleTheftRecords data={data} language={language} mode="motorcycle" />}
      {activeTab === 'policeCctv' && <PoliceCctvInstallationLocations data={data} language={language} />}
      {activeTab === 'fireDonations' && <FireDepartmentDonations data={data} language={language} />}
      {activeTab === 'health' && <PublicHealth data={data} language={language} />}
      {activeTab === 'disaster' && <NaturalDisasterSuspensions data={data} language={language} />}
      {activeTab === 'overview' && <SafetyOverview data={data} language={language} />}
      {activeTab === 'notes' && <DataNotes data={data} language={language} />}

      <footer>{t.footer}</footer>
    </div>
  );
}

function SafetyMap({
  data,
  language,
  nearbyMode = false,
}: {
  data: SafetyDataBundle;
  language: Language;
  nearbyMode?: boolean;
}) {
  const t = translations[language];
  const uiText = localizedUiText[language];
  const [district, setDistrict] = useState('all');
  const [search, setSearch] = useState('');
  const [capacityRange, setCapacityRange] = useState<CapacityRange>('all');
  const [validOnly, setValidOnly] = useState(true);
  const [showShelters, setShowShelters] = useState(false);
  const [showAeds, setShowAeds] = useState(false);
  const [showEvacuationGates, setShowEvacuationGates] = useState(false);
  const [showMedicalFacilities, setShowMedicalFacilities] = useState(false);
  const [showFireHydrants, setShowFireHydrants] = useState(false);
  const [showEmergencyShelters, setShowEmergencyShelters] = useState(false);
  const [showCctvFacilities, setShowCctvFacilities] = useState(false);
  const [showExactHydrants, setShowExactHydrants] = useState(false);
  const [taipeiCityOnlyHydrants, setTaipeiCityOnlyHydrants] = useState(true);
  const [medicalFacilityType, setMedicalFacilityType] = useState<MedicalFacilityType | 'all'>('all');
  const [medicalCategory, setMedicalCategory] = useState('all');
  const [hydrantType, setHydrantType] = useState<FireHydrantType | 'all'>('all');
  const [hydrantCity, setHydrantCity] = useState('all');
  const [hydrantDistrict, setHydrantDistrict] = useState('all');
  const [hydrantVillage, setHydrantVillage] = useState('all');
  const [areaScope, setAreaScope] = useState<FireHydrantAreaScope | 'all'>('all');
  const [emergencyShelterType, setEmergencyShelterType] = useState<EmergencyShelterType | 'all'>('all');
  const [floodStatus, setFloodStatus] = useState<DisasterApplicabilityStatus | 'all'>('all');
  const [earthquakeStatus, setEarthquakeStatus] = useState<DisasterApplicabilityStatus | 'all'>('all');
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [indoorOnly, setIndoorOnly] = useState(false);
  const [outdoorOnly, setOutdoorOnly] = useState(false);
  const [hasEmergencyShelterCapacity, setHasEmergencyShelterCapacity] = useState(false);
  const [servedVillage, setServedVillage] = useState('all');
  const [cctvCity, setCctvCity] = useState('all');
  const [cctvCoordinateStatus, setCctvCoordinateStatus] = useState<CoordinateStatus | 'all'>('valid');
  const [fireHydrants, setFireHydrants] = useState<FireHydrant[] | null>(null);
  const [showBurglaries, setShowBurglaries] = useState(false);
  const [showDengue, setShowDengue] = useState(false);
  const [riversidePark, setRiversidePark] = useState('all');
  const [hasLocationDescription, setHasLocationDescription] = useState(false);
  const [radius, setRadius] = useState(500);
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState<MapViewport>({ bounds: null, zoom: 12 });

  const filteredShelters = useMemo(
    () =>
      data.shelters.filter((shelter) => {
        const haystack = [shelter.name, shelter.placeName, shelter.address, shelter.village]
          .join(' ')
          .toLowerCase();
        const capacity = shelter.capacity ?? 0;
        return (
          (district === 'all' || shelter.district === district) &&
          (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
          (!validOnly || shelter.coordinateStatus === 'valid') &&
          matchesCapacityRange(capacity, capacityRange)
        );
      }),
    [capacityRange, data.shelters, district, search, validOnly],
  );
  const filteredAeds = useMemo(
    () =>
      data.aeds.filter((aed) => {
        const haystack = [
          aed.placeName,
          aed.address,
          aed.aedPlacementLocation,
          aed.aedLocationDescription,
        ]
          .join(' ')
          .toLowerCase();
        return (
          (district === 'all' || aed.district === district) &&
          (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
          (!validOnly || aed.coordinateStatus === 'valid')
        );
      }),
    [data.aeds, district, search, validOnly],
  );
  const riversideParks = useMemo(
    () => [...new Set(data.evacuationGates.flatMap((gate) => (gate.riversidePark ? [gate.riversidePark] : [])))].sort(),
    [data.evacuationGates],
  );
  const filteredEvacuationGates = useMemo(
    () =>
      data.evacuationGates.filter((gate) => {
        const haystack = [gate.gateName, gate.riversidePark, gate.description].join(' ').toLowerCase();
        return (
          (riversidePark === 'all' || gate.riversidePark === riversidePark) &&
          (!hasLocationDescription || Boolean(gate.description)) &&
          (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
          (!validOnly || gate.coordinateStatus === 'valid')
        );
      }),
    [data.evacuationGates, hasLocationDescription, riversidePark, search, validOnly],
  );
  const medicalCategories = useMemo(
    () => [...new Set(data.medicalFacilities.flatMap((item) => (item.medicalCategory ? [item.medicalCategory] : [])))].sort(),
    [data.medicalFacilities],
  );
  const filteredMedicalFacilities = useMemo(
    () =>
      data.medicalFacilities.filter((facility) => {
        const typeLabel = facility.facilityType === 'hospital' ? t.hospital : t.clinic;
        const haystack = [
          facility.facilityName,
          facility.address,
          facility.district,
          facility.medicalCategory,
          typeLabel,
        ]
          .join(' ')
          .toLowerCase();
        return (
          (district === 'all' || facility.district === district) &&
          (medicalFacilityType === 'all' || facility.facilityType === medicalFacilityType) &&
          (medicalCategory === 'all' || facility.medicalCategory === medicalCategory) &&
          (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
          (!validOnly || facility.coordinateStatus === 'valid')
        );
      }),
    [data.medicalFacilities, district, medicalCategory, medicalFacilityType, search, t.clinic, t.hospital, validOnly],
  );
  const filteredFireHydrants = useMemo(() => {
    const records = fireHydrants ?? [];
    const query = search.trim().toLowerCase();
    return records.filter((hydrant) => {
      const haystack = [
        hydrant.wpid,
        hydrant.mapSheetNumber,
        hydrant.hydrantNumber,
        hydrant.city,
        hydrant.district,
        hydrant.village,
        hydrant.areaRaw,
        hydrant.hydrantTypeRaw,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!taipeiCityOnlyHydrants || hydrant.isTaipeiCity) &&
        (hydrantCity === 'all' || hydrant.city === hydrantCity) &&
        (hydrantDistrict === 'all' || hydrant.district === hydrantDistrict) &&
        (hydrantVillage === 'all' || hydrant.village === hydrantVillage) &&
        (hydrantType === 'all' || hydrant.hydrantType === hydrantType) &&
        (areaScope === 'all' || hydrant.areaScope === areaScope) &&
        (!query || haystack.includes(query)) &&
        (!validOnly || hydrant.coordinateStatus === 'valid')
      );
    });
  }, [
    areaScope,
    fireHydrants,
    hydrantCity,
    hydrantDistrict,
    hydrantType,
    hydrantVillage,
    search,
    taipeiCityOnlyHydrants,
    validOnly,
  ]);
  const emergencyShelterTypes = useMemo(
    () => [...new Set(data.emergencyShelters.map((item) => item.shelterType))].sort(),
    [data.emergencyShelters],
  );
  const servedVillages = useMemo(
    () => [...new Set(data.emergencyShelters.flatMap((item) => item.servedVillages))].sort(),
    [data.emergencyShelters],
  );
  const filteredEmergencyShelters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.emergencyShelters.filter((shelter) => {
      const haystack = [
        shelter.shelterId,
        shelter.shelterName,
        shelter.district,
        shelter.village,
        shelter.address,
        shelter.shelterTypeRaw,
        shelter.servedVillages.join(' '),
        shelter.notes,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (district === 'all' || shelter.district === district) &&
        (emergencyShelterType === 'all' || shelter.shelterType === emergencyShelterType) &&
        (floodStatus === 'all' || shelter.floodStatus === floodStatus) &&
        (earthquakeStatus === 'all' || shelter.earthquakeStatus === earthquakeStatus) &&
        (!accessibleOnly || shelter.hasAccessibleFacilities) &&
        (!indoorOnly || shelter.hasIndoorSpace) &&
        (!outdoorOnly || shelter.hasOutdoorSpace) &&
        (!hasEmergencyShelterCapacity || shelter.capacityPeople !== undefined) &&
        (servedVillage === 'all' || shelter.servedVillages.includes(servedVillage)) &&
        (!query || haystack.includes(query)) &&
        (!hasEmergencyShelterCapacity || matchesCapacityRange(shelter.capacityPeople ?? 0, capacityRange))
      );
    });
  }, [
    accessibleOnly,
    capacityRange,
    data.emergencyShelters,
    district,
    earthquakeStatus,
    emergencyShelterType,
    floodStatus,
    hasEmergencyShelterCapacity,
    indoorOnly,
    outdoorOnly,
    search,
    servedVillage,
  ]);
  const cctvCities = useMemo(
    () => [...new Set(data.trafficCctvFacilities.flatMap((item) => (item.city ? [item.city] : [])))].sort(),
    [data.trafficCctvFacilities],
  );
  const filteredCctvFacilities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.trafficCctvFacilities.filter((facility) => {
      const haystack = [
        facility.sourceSequenceNumber,
        facility.city,
        facility.cameraLocationCodeRaw,
        facility.cameraLocationCode,
        facility.locationDescription,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (cctvCity === 'all' || facility.city === cctvCity) &&
        (cctvCoordinateStatus === 'all' || facility.coordinateStatus === cctvCoordinateStatus) &&
        (!query || haystack.includes(query))
      );
    });
  }, [cctvCity, cctvCoordinateStatus, data.trafficCctvFacilities, search]);
  const hydrantCities = useMemo(
    () => [...new Set((fireHydrants ?? []).flatMap((item) => (item.city ? [item.city] : [])))].sort(),
    [fireHydrants],
  );
  const hydrantDistricts = useMemo(
    () =>
      [...new Set((fireHydrants ?? []).flatMap((item) => (item.city === hydrantCity || hydrantCity === 'all') && item.district ? [item.district] : []))].sort(),
    [fireHydrants, hydrantCity],
  );
  const hydrantVillages = useMemo(
    () =>
      [
        ...new Set(
          (fireHydrants ?? []).flatMap((item) =>
            (hydrantDistrict === 'all' || item.district === hydrantDistrict) && item.village ? [item.village] : [],
          ),
        ),
      ].sort(),
    [fireHydrants, hydrantDistrict],
  );

  const nearbyShelters = useMemo(() => {
    if (!userPosition) return [];
    return filteredShelters
      .filter(hasValidCoordinate)
      .map((shelter) => ({
        shelter,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          shelter.latitude,
          shelter.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredShelters, radius, userPosition]);
  const nearbyAeds = useMemo(() => {
    if (!userPosition) return [];
    return filteredAeds
      .filter(hasValidPoint)
      .map((aed) => ({
        aed,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          aed.latitude,
          aed.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredAeds, radius, userPosition]);
  const nearbyEvacuationGates = useMemo(() => {
    if (!userPosition) return [];
    return filteredEvacuationGates
      .filter(hasValidPoint)
      .map((gate) => ({
        gate,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          gate.latitude,
          gate.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredEvacuationGates, radius, userPosition]);
  const nearbyMedicalFacilities = useMemo(() => {
    if (!userPosition) return [];
    return filteredMedicalFacilities
      .filter(hasValidPoint)
      .map((facility) => ({
        facility,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          facility.latitude,
          facility.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredMedicalFacilities, radius, userPosition]);
  const nearbyFireHydrants = useMemo(() => {
    if (!userPosition) return [];
    return filteredFireHydrants
      .filter(hasValidPoint)
      .map((hydrant) => ({
        hydrant,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          hydrant.latitude,
          hydrant.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredFireHydrants, radius, userPosition]);

  const visibleShelters = useMemo(
    () => filteredShelters.filter(hasValidCoordinate).filter((shelter) => isInViewport(shelter, viewport.bounds)),
    [filteredShelters, viewport.bounds],
  );
  const shouldRenderDetailedShelters =
    viewport.zoom >= detailedShelterZoom || visibleShelters.length <= maxDetailedShelterMarkers;
  const shelterClusters = useMemo(
    () => buildShelterMapClusters(visibleShelters, viewport.zoom),
    [visibleShelters, viewport.zoom],
  );
  const visibleAeds = useMemo(
    () => filteredAeds.filter(hasValidPoint).filter((aed) => isInViewport(aed, viewport.bounds)),
    [filteredAeds, viewport.bounds],
  );
  const shouldRenderDetailedAeds =
    viewport.zoom >= detailedShelterZoom || visibleAeds.length <= maxDetailedShelterMarkers;
  const aedClusters = useMemo(() => buildShelterMapClusters(visibleAeds, viewport.zoom), [visibleAeds, viewport.zoom]);
  const visibleEvacuationGates = useMemo(
    () => filteredEvacuationGates.filter(hasValidPoint).filter((gate) => isInViewport(gate, viewport.bounds)),
    [filteredEvacuationGates, viewport.bounds],
  );
  const evacuationGateClusters = useMemo(
    () => buildShelterMapClusters(visibleEvacuationGates, viewport.zoom),
    [visibleEvacuationGates, viewport.zoom],
  );
  const visibleMedicalFacilities = useMemo(
    () => filteredMedicalFacilities.filter(hasValidPoint).filter((item) => isInViewport(item, viewport.bounds)),
    [filteredMedicalFacilities, viewport.bounds],
  );
  const medicalFacilityClusters = useMemo(
    () => buildShelterMapClusters(visibleMedicalFacilities, viewport.zoom),
    [visibleMedicalFacilities, viewport.zoom],
  );
  const visibleFireHydrants = useMemo(
    () => filteredFireHydrants.filter(hasValidPoint).filter((item) => isInViewport(item, viewport.bounds)),
    [filteredFireHydrants, viewport.bounds],
  );
  const fireHydrantClusters = useMemo(
    () => buildShelterMapClusters(visibleFireHydrants, viewport.zoom),
    [visibleFireHydrants, viewport.zoom],
  );
  const visibleCctvFacilities = useMemo(
    () => filteredCctvFacilities.filter(hasValidPoint).filter((item) => isInViewport(item, viewport.bounds)),
    [filteredCctvFacilities, viewport.bounds],
  );
  const cctvClusters = useMemo(
    () => buildShelterMapClusters(visibleCctvFacilities, viewport.zoom),
    [visibleCctvFacilities, viewport.zoom],
  );
  const hydrantDistrictSummaries = useMemo(
    () =>
      data.fireHydrantSummary.byDistrict
        .filter((item) => (!taipeiCityOnlyHydrants || item.city === '臺北市'))
        .filter((item) => hydrantCity === 'all' || item.city === hydrantCity)
        .filter((item) => hydrantDistrict === 'all' || item.district === hydrantDistrict)
        .flatMap((item) => {
          const centroid = hydrantDistrictCentroids[item.district];
          return centroid ? [{ ...item, ...centroid }] : [];
        }),
    [data.fireHydrantSummary.byDistrict, hydrantCity, hydrantDistrict, taipeiCityOnlyHydrants],
  );
  const emergencyShelterDistrictSummaries = useMemo(
    () =>
      TAIPEI_DISTRICTS.flatMap((name) => {
        const records = filteredEmergencyShelters.filter((item) => item.district === name);
        const centroid = TAIPEI_DISTRICT_CENTROIDS[name];
        if (!records.length || !centroid) return [];
        const topType = mostCommonEntry(countBy(records, (item) => formatEmergencyShelterType(item.shelterType, language)));
        return [{
          district: name,
          ...centroid,
          count: records.length,
          capacity: records.reduce((sum, item) => sum + (item.capacityPeople ?? 0), 0),
          accessible: records.filter((item) => item.hasAccessibleFacilities).length,
          indoor: records.filter((item) => item.hasIndoorSpace).length,
          outdoor: records.filter((item) => item.hasOutdoorSpace).length,
          topType: topType?.[0] ?? '-',
        }];
      }),
    [filteredEmergencyShelters, language],
  );

  async function ensureFireHydrants() {
    if (!fireHydrants) setFireHydrants(await loadFireHydrants());
  }

  function showOnlyDenseLayer(layer: DenseLayer) {
    setShowAeds(layer === 'aeds');
    setShowMedicalFacilities(layer === 'medical');
    setShowFireHydrants(layer === 'fireHydrants');
    setShowShelters(layer === 'airRaidShelters');
    setShowEvacuationGates(layer === 'evacuationGates');
    setShowCctvFacilities(layer === 'cctv');
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setGeoMessage(uiText.geolocationUnsupported);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoMessage(null);
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setGeoMessage(uiText.geolocationDenied),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <main className="workspace">
      <section className="filter-panel">
        <label className="checkbox-row">
          <input type="checkbox" checked={showAeds} onChange={(event) => (event.target.checked ? showOnlyDenseLayer('aeds') : setShowAeds(false))} />
          {t.aedLocations}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showMedicalFacilities}
            onChange={(event) => (event.target.checked ? showOnlyDenseLayer('medical') : setShowMedicalFacilities(false))}
          />
          {t.medicalFacilities}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showFireHydrants}
            onChange={(event) => {
              if (event.target.checked) showOnlyDenseLayer('fireHydrants');
              else setShowFireHydrants(false);
              if (event.target.checked && showExactHydrants) void ensureFireHydrants();
            }}
          />
          {t.fireHydrants}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showShelters}
            onChange={(event) => (event.target.checked ? showOnlyDenseLayer('airRaidShelters') : setShowShelters(false))}
          />
          {t.airRaidShelters}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showEmergencyShelters}
            onChange={(event) => setShowEmergencyShelters(event.target.checked)}
          />
          {t.emergencyShelters}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showEvacuationGates}
            onChange={(event) => (event.target.checked ? showOnlyDenseLayer('evacuationGates') : setShowEvacuationGates(false))}
          />
          {t.evacuationGates}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showCctvFacilities}
            onChange={(event) => (event.target.checked ? showOnlyDenseLayer('cctv') : setShowCctvFacilities(false))}
          />
          {t.cctvFacilities}
        </label>
        {!nearbyMode && (
          <>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showBurglaries}
                onChange={(event) => setShowBurglaries(event.target.checked)}
              />
              {t.burglaryRecords}
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={showDengue} onChange={(event) => setShowDengue(event.target.checked)} />
              {t.dengueVectorDensity}
            </label>
          </>
        )}
        <label>
          {t.district}
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="all">{t.all}</option>
            {TAIPEI_DISTRICTS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {t.search}
          <input
            value={search}
            placeholder={
              showCctvFacilities
                ? t.cctvSearchPlaceholder
                : showEmergencyShelters
                  ? t.emergencyShelterSearchPlaceholder
                  : showFireHydrants
                    ? t.fireHydrantSearchPlaceholder
                    : t.searchPlaceholder
            }
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          {t.cctvFacilities}
          <select value={cctvCity} onChange={(event) => setCctvCity(event.target.value)}>
            <option value="all">{t.all}</option>
            {cctvCities.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label>
          {t.coordinateStatus}
          <select value={cctvCoordinateStatus} onChange={(event) => setCctvCoordinateStatus(event.target.value as CoordinateStatus | 'all')}>
            <option value="all">{t.all}</option>
            <option value="valid">{t.hasValidCoordinates}</option>
            <option value="missing">{t.missingCoordinates}</option>
            <option value="unparsed">{t.unparsedCoordinates}</option>
            <option value="outlier">{t.outlierCoordinates}</option>
          </select>
        </label>
        <label>
          {t.shelterType}
          <select value={emergencyShelterType} onChange={(event) => setEmergencyShelterType(event.target.value as EmergencyShelterType | 'all')}>
            <option value="all">{t.all}</option>
            {emergencyShelterTypes.map((type) => (
              <option key={type} value={type}>{formatEmergencyShelterType(type, language)}</option>
            ))}
          </select>
        </label>
        <label>
          {t.floodApplicable}
          <select value={floodStatus} onChange={(event) => setFloodStatus(event.target.value as DisasterApplicabilityStatus | 'all')}>
            <option value="all">{t.all}</option>
            {disasterStatuses.map((status) => (
              <option key={status} value={status}>{formatDisasterStatus(status, language)}</option>
            ))}
          </select>
        </label>
        <label>
          {t.earthquakeApplicable}
          <select value={earthquakeStatus} onChange={(event) => setEarthquakeStatus(event.target.value as DisasterApplicabilityStatus | 'all')}>
            <option value="all">{t.all}</option>
            {disasterStatuses.map((status) => (
              <option key={status} value={status}>{formatDisasterStatus(status, language)}</option>
            ))}
          </select>
        </label>
        <label>
          {t.servedVillages}
          <select value={servedVillage} onChange={(event) => setServedVillage(event.target.value)}>
            <option value="all">{t.all}</option>
            {servedVillages.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={accessibleOnly} onChange={(event) => setAccessibleOnly(event.target.checked)} />
          {t.accessibleFacilities}
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={indoorOnly} onChange={(event) => setIndoorOnly(event.target.checked)} />
          {t.indoor}
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={outdoorOnly} onChange={(event) => setOutdoorOnly(event.target.checked)} />
          {t.outdoor}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={hasEmergencyShelterCapacity}
            onChange={(event) => setHasEmergencyShelterCapacity(event.target.checked)}
          />
          {t.hasCapacity}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={taipeiCityOnlyHydrants}
            onChange={(event) => setTaipeiCityOnlyHydrants(event.target.checked)}
          />
          {t.taipeiCityOnly}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showExactHydrants}
            onChange={(event) => {
              setShowExactHydrants(event.target.checked);
              if (event.target.checked) void ensureFireHydrants();
            }}
          />
          {t.showExactFireHydrantPoints}
        </label>
        <label>
          {t.hydrantType}
          <select value={hydrantType} onChange={(event) => setHydrantType(event.target.value as FireHydrantType | 'all')}>
            <option value="all">{t.all}</option>
            <option value="underground">{t.undergroundHydrant}</option>
            <option value="above_ground">{t.aboveGroundHydrant}</option>
          </select>
        </label>
        <label>
          {t.city}
          <select value={hydrantCity} onChange={(event) => setHydrantCity(event.target.value)}>
            <option value="all">{t.all}</option>
            {(hydrantCities.length ? hydrantCities : data.fireHydrantSummary.byCity.map((item) => item.city)).map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label>
          {t.district}
          <select value={hydrantDistrict} onChange={(event) => setHydrantDistrict(event.target.value)}>
            <option value="all">{t.all}</option>
            {(hydrantDistricts.length ? hydrantDistricts : data.fireHydrantSummary.byDistrict.map((item) => item.district)).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {t.village}
          <select value={hydrantVillage} onChange={(event) => setHydrantVillage(event.target.value)}>
            <option value="all">{t.all}</option>
            {hydrantVillages.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {t.areaScope}
          <select value={areaScope} onChange={(event) => setAreaScope(event.target.value as FireHydrantAreaScope | 'all')}>
            <option value="all">{t.all}</option>
            <option value="taipei_city">{t.taipeiCityScope}</option>
            <option value="new_taipei_official_scope">{t.newTaipeiOfficialScope}</option>
            <option value="new_taipei_other">{t.newTaipeiOtherScope}</option>
          </select>
        </label>
        <label>
          {t.medicalFacilityType}
          <select
            value={medicalFacilityType}
            onChange={(event) => setMedicalFacilityType(event.target.value as MedicalFacilityType | 'all')}
          >
            <option value="all">{t.all}</option>
            <option value="hospital">{t.hospitals}</option>
            <option value="clinic">{t.clinics}</option>
          </select>
        </label>
        <label>
          {t.classification}
          <select value={medicalCategory} onChange={(event) => setMedicalCategory(event.target.value)}>
            <option value="all">{t.all}</option>
            {medicalCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          {t.riversidePark}
          <select value={riversidePark} onChange={(event) => setRiversidePark(event.target.value)}>
            <option value="all">{t.all}</option>
            {riversideParks.map((park) => (
              <option key={park}>{park}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={hasLocationDescription}
            onChange={(event) => setHasLocationDescription(event.target.checked)}
          />
          {t.hasLocationDescription}
        </label>
        <label>
          {t.capacityRange}
          <select value={capacityRange} onChange={(event) => setCapacityRange(event.target.value as CapacityRange)}>
            {capacityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === 'all' ? t.all : option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={validOnly} onChange={(event) => setValidOnly(event.target.checked)} />
          {t.validCoordinateOnly}
        </label>
      </section>

      <section className="map-stage">
        <MapContainer center={taipeiCenter} zoom={12} scrollWheelZoom className="map-canvas">
          <MapSizeSync />
          <ViewportTracker onChange={setViewport} />
          <TileLayer
            attribution={tileAttribution}
            url={tileUrl}
          />
          {showShelters && (shouldRenderDetailedShelters
            ? visibleShelters.map((shelter) => (
                <Marker key={shelter.id} position={[shelter.latitude, shelter.longitude]} icon={shieldIcon}>
                  <Popup>
                    <ShelterPopup shelter={shelter} language={language} />
                  </Popup>
                </Marker>
              ))
            : shelterClusters.map((cluster) => (
                <CircleMarker
                  key={cluster.id}
                  center={[cluster.latitude, cluster.longitude]}
                  radius={Math.min(28, 7 + Math.sqrt(cluster.count) * 2.4)}
                  pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.34, weight: 2 }}
                >
                  <Popup>
                    <div className="popup-stack">
                      <strong>{t.airRaidShelters}</strong>
                      <span>
                        {t.recordCount}: {cluster.count.toLocaleString()}
                      </span>
                      <span>
                        {t.capacity}: {cluster.capacity.toLocaleString()}
                      </span>
                    </div>
                  </Popup>
                </CircleMarker>
              )))}
          {showAeds &&
            (shouldRenderDetailedAeds
              ? visibleAeds.map((aed) => (
                  <Marker key={aed.id} position={[aed.latitude, aed.longitude]} icon={aedIcon}>
                    <Popup>
                      <AedPopup aed={aed} language={language} />
                    </Popup>
                  </Marker>
                ))
              : aedClusters.map((cluster) => (
                  <CircleMarker
                    key={`aed-${cluster.id}`}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(25, 7 + Math.sqrt(cluster.count) * 2)}
                    pathOptions={{ color: '#be123c', fillColor: '#fb7185', fillOpacity: 0.34, weight: 2 }}
                  >
                    <Popup>
                      <strong>
                        {t.aedLocations}: {cluster.count.toLocaleString()}
                      </strong>
                    </Popup>
                  </CircleMarker>
                )))}
          {showEvacuationGates &&
            (viewport.zoom >= detailedShelterZoom
              ? visibleEvacuationGates.map((gate) => (
                  <Marker key={gate.id} position={[gate.latitude, gate.longitude]} icon={evacuationGateIcon}>
                    <Popup>
                      <EvacuationGatePopup gate={gate} language={language} />
                    </Popup>
                  </Marker>
                ))
              : evacuationGateClusters.map((cluster) => (
                  <CircleMarker
                    key={`evacuation-gate-${cluster.id}`}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(22, 7 + Math.sqrt(cluster.count) * 2)}
                    pathOptions={{ color: '#1d4ed8', fillColor: '#60a5fa', fillOpacity: 0.34, weight: 2 }}
                  >
                    <Popup>
                      <strong>
                        {t.evacuationGates}: {cluster.count.toLocaleString()}
                      </strong>
                    </Popup>
                  </CircleMarker>
                )))}
          {showMedicalFacilities &&
            (viewport.zoom >= detailedShelterZoom
              ? visibleMedicalFacilities.map((facility) => (
                  <Marker
                    key={facility.id}
                    position={[facility.latitude, facility.longitude]}
                    icon={facility.facilityType === 'hospital' ? hospitalIcon : clinicIcon}
                  >
                    <Popup>
                      <MedicalFacilityPopup facility={facility} language={language} />
                    </Popup>
                  </Marker>
                ))
              : medicalFacilityClusters.map((cluster) => (
                  <CircleMarker
                    key={`medical-${cluster.id}`}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(25, 7 + Math.sqrt(cluster.count) * 2)}
                    pathOptions={{ color: '#7c3aed', fillColor: '#a78bfa', fillOpacity: 0.34, weight: 2 }}
                  >
                    <Popup>
                      <strong>
                        {t.medicalFacilities}: {cluster.count.toLocaleString()}
                      </strong>
                    </Popup>
                  </CircleMarker>
                )))}
          {showFireHydrants &&
            (!showExactHydrants
              ? hydrantDistrictSummaries.map((summary) => (
                  <CircleMarker
                    key={`hydrant-district-${summary.city}-${summary.district}`}
                    center={[summary.latitude, summary.longitude]}
                    radius={Math.min(26, 6 + Math.sqrt(summary.count) / 2)}
                    pathOptions={{ color: '#dc2626', fillColor: '#f87171', fillOpacity: 0.26, weight: 2 }}
                  >
                    <Popup>
                      <div className="popup-stack">
                        <strong>{summary.district}</strong>
                        <span>{t.city}: {summary.city}</span>
                        <span>{t.fireHydrants}: {summary.count.toLocaleString()}</span>
                        <span>{t.undergroundHydrant}: {summary.undergroundHydrantCount.toLocaleString()}</span>
                        <span>{t.aboveGroundHydrant}: {summary.aboveGroundHydrantCount.toLocaleString()}</span>
                        <small>{t.fireHydrantNotice}</small>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))
              : viewport.zoom >= detailedShelterZoom
                ? visibleFireHydrants.map((hydrant) => (
                    <Marker key={hydrant.id} position={[hydrant.latitude, hydrant.longitude]} icon={hydrantIcon}>
                      <Popup>
                        <FireHydrantPopup hydrant={hydrant} language={language} />
                      </Popup>
                    </Marker>
                  ))
                : fireHydrantClusters.map((cluster) => (
                    <CircleMarker
                      key={`hydrant-${cluster.id}`}
                      center={[cluster.latitude, cluster.longitude]}
                      radius={Math.min(24, 7 + Math.sqrt(cluster.count) * 1.8)}
                      pathOptions={{ color: '#dc2626', fillColor: '#f87171', fillOpacity: 0.32, weight: 2 }}
                    >
                      <Popup>
                        <strong>
                          {t.fireHydrants}: {cluster.count.toLocaleString()}
                        </strong>
                      </Popup>
                    </CircleMarker>
                  )))}
          {showEmergencyShelters &&
            emergencyShelterDistrictSummaries.map((summary) => (
              <CircleMarker
                key={`emergency-shelter-${summary.district}`}
                center={[summary.latitude, summary.longitude]}
                radius={Math.min(26, 7 + Math.sqrt(summary.count) * 1.4)}
                pathOptions={{ color: '#9333ea', fillColor: '#c084fc', fillOpacity: 0.28, weight: 2 }}
              >
                <Popup>
                  <div className="popup-stack">
                    <strong>{t.emergencyShelters}</strong>
                    <span>{t.district}: {summary.district}</span>
                    <span>{t.emergencyShelterCount}: {summary.count.toLocaleString()}</span>
                    <span>{t.totalListedCapacity}: {summary.capacity.toLocaleString()}</span>
                    <span>{t.accessibleFacilities}: {summary.accessible.toLocaleString()}</span>
                    <span>{t.indoor}: {summary.indoor.toLocaleString()}</span>
                    <span>{t.outdoor}: {summary.outdoor.toLocaleString()}</span>
                    <span>{t.topShelterType}: {summary.topType}</span>
                    <small>{t.emergencyShelterNoCoordinateNotice}</small>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          {showCctvFacilities &&
            (viewport.zoom >= detailedShelterZoom || visibleCctvFacilities.length <= maxDetailedShelterMarkers
              ? visibleCctvFacilities.map((facility) => (
                  <Marker key={facility.id} position={[facility.latitude, facility.longitude]} icon={cctvIcon}>
                    <Popup>
                      <TrafficCctvPopup facility={facility} language={language} />
                    </Popup>
                  </Marker>
                ))
              : cctvClusters.map((cluster) => (
                  <CircleMarker
                    key={`cctv-${cluster.id}`}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(24, 7 + Math.sqrt(cluster.count) * 1.8)}
                    pathOptions={{ color: '#374151', fillColor: '#9ca3af', fillOpacity: 0.34, weight: 2 }}
                  >
                    <Popup>
                      <strong>
                        {t.cctvFacilities}: {cluster.count.toLocaleString()}
                      </strong>
                    </Popup>
                  </CircleMarker>
                )))}
          {!nearbyMode && showBurglaries && data.districtSummaries.map((summary) => {
            if (!summary.burglaryRecordCount) return null;
            return (
              <CircleMarker
                key={`burglary-${summary.district}`}
                center={[summary.latitude, summary.longitude]}
                radius={getBurglaryBubbleRadius(summary.burglaryRecordCount)}
                pathOptions={{ color: '#b45309', fillColor: '#f59e0b', fillOpacity: 0.28, weight: 2 }}
              >
                <Popup>
                  <DistrictPopup
                    summary={summary}
                    count={summary.burglaryRecordCount}
                    records={data.burglaries}
                    language={language}
                  />
                </Popup>
              </CircleMarker>
            );
          })}
          {!nearbyMode &&
            showDengue &&
            data.dengueDistrictSummaries.map((summary) =>
              summary.recordCount ? (
                <CircleMarker
                  key={`dengue-${summary.district}`}
                  center={[summary.latitude, summary.longitude]}
                  radius={Math.min(22, 6 + Math.sqrt(summary.recordCount))}
                  pathOptions={{ color: '#047857', fillColor: '#34d399', fillOpacity: 0.22, weight: 2 }}
                >
                  <Popup>
                    <DenguePopup summary={summary} language={language} />
                  </Popup>
                </CircleMarker>
              ) : null,
            )}
          {userPosition && (
            <Marker position={[userPosition.latitude, userPosition.longitude]} icon={userIcon}>
              <Popup>{uiText.currentLocation}</Popup>
            </Marker>
          )}
          {userPosition && <FlyTo position={[userPosition.latitude, userPosition.longitude]} />}
        </MapContainer>
      </section>

      <aside className="side-panel">
        <button
          type="button"
          className="primary-action"
          onClick={() => {
            showOnlyDenseLayer('aeds');
            requestLocation();
          }}
        >
          {t.showNearbyAeds}
        </button>
        <button
          type="button"
          onClick={() => {
            showOnlyDenseLayer('airRaidShelters');
            requestLocation();
          }}
        >
          {t.showNearbyShelters}
        </button>
        <button
          type="button"
          onClick={() => {
            showOnlyDenseLayer('evacuationGates');
            requestLocation();
          }}
        >
          {t.showNearbyEvacuationGates}
        </button>
        <button
          type="button"
          onClick={() => {
            setMedicalFacilityType('hospital');
            showOnlyDenseLayer('medical');
            requestLocation();
          }}
        >
          {t.showNearbyHospitals}
        </button>
        <button
          type="button"
          onClick={() => {
            setMedicalFacilityType('clinic');
            showOnlyDenseLayer('medical');
            requestLocation();
          }}
        >
          {t.showNearbyClinics}
        </button>
        <button
          type="button"
          onClick={() => {
            setMedicalFacilityType('all');
            showOnlyDenseLayer('medical');
            requestLocation();
          }}
        >
          {t.showNearbyMedicalFacilities}
        </button>
        <button
          type="button"
          onClick={() => {
            showOnlyDenseLayer('fireHydrants');
            setShowExactHydrants(true);
            void ensureFireHydrants();
            requestLocation();
          }}
        >
          {t.showNearbyFireHydrants}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowEmergencyShelters(true);
            setGeoMessage(t.emergencyShelterDistanceUnavailableNotice);
          }}
        >
          {t.viewEmergencySheltersByNearbyDistrict}
        </button>
        <label>
          {t.nearbyRadius}
          <select value={radius} onChange={(event) => setRadius(Number(event.target.value))}>
            {radiusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {geoMessage && <p className="notice">{geoMessage}</p>}
        <p className="notice">{t.aedEmergencyNotice}</p>
        <p className="notice">{t.emergencyShelterNoCoordinateNotice}</p>
        <h2>{t.emergencyShelterDirectory}</h2>
        <ol className="nearby-list">
          {filteredEmergencyShelters.slice(0, 50).map((shelter) => (
            <li key={shelter.id}>
              <strong>{shelter.shelterName}</strong>
              <span>{shelter.shelterId} · {shelter.district ?? '-'} · {formatEmergencyShelterType(shelter.shelterType, language)}</span>
              <small>{shelter.address ?? '-'}</small>
              <small>{t.capacityPeople}: {shelter.capacityPeople?.toLocaleString() ?? '-'}</small>
              <small>
                {t.flood}: {formatDisasterStatus(shelter.floodStatus, language)} · {t.earthquake}: {formatDisasterStatus(shelter.earthquakeStatus, language)}
              </small>
              {shelter.servedVillages.length > 0 && <small>{t.servedVillages}: {shelter.servedVillages.slice(0, 8).join('、')}</small>}
              {shelter.address && (
                <a href={googleMapsAddressUrl(shelter.address)} target="_blank" rel="noreferrer">
                  {t.openGoogleMaps}
                </a>
              )}
            </li>
          ))}
        </ol>
        <p className="notice">{t.cctvFacilityNotice}</p>
        <h2>{t.trafficCctvFacilities}</h2>
        <ol className="nearby-list">
          {filteredCctvFacilities.slice(0, 50).map((facility) => (
            <li key={facility.id}>
              <strong>{facility.cameraLocationCodeRaw ?? facility.locationDescription ?? t.cctvFacility}</strong>
              <span>{t.sourceSequenceNumber}: {facility.sourceSequenceNumber ?? '-'}</span>
              <small>{t.city}: {facility.city ?? '-'}</small>
              <small>{t.coordinateStatus}: {formatCoordinateStatus(facility.coordinateStatus, language)}</small>
              {facility.coordinateStatus === 'valid' && facility.latitude !== undefined && facility.longitude !== undefined && (
                <a href={googleMapsUrl(facility.latitude, facility.longitude)} target="_blank" rel="noreferrer">
                  {t.openGoogleMaps}
                </a>
              )}
            </li>
          ))}
        </ol>
        <h2>{t.nearbyAeds}</h2>
        <ol className="nearby-list">
          {nearbyAeds.slice(0, 20).map(({ aed, distance }) => (
            <li key={aed.id}>
              <strong>{aed.placeName}</strong>
              <span>{formatDistance(distance, language)}</span>
              <small>{aed.aedPlacementLocation ?? aed.address}</small>
              <a href={googleMapsUrl(aed.latitude, aed.longitude)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
        <p className="notice">{t.fireHydrantNotice}</p>
        <h2>{t.nearbyFireHydrants}</h2>
        <ol className="nearby-list">
          {nearbyFireHydrants.slice(0, 20).map(({ hydrant, distance }) => (
            <li key={hydrant.id}>
              <strong>{hydrant.wpid ?? hydrant.hydrantNumber ?? t.fireHydrant}</strong>
              <span>{formatDistance(distance, language)}</span>
              <small>{hydrant.hydrantType === 'underground' ? t.undergroundHydrant : t.aboveGroundHydrant}</small>
              <small>{[hydrant.city, hydrant.district, hydrant.village].filter(Boolean).join(' ')}</small>
              <a href={googleMapsUrl(hydrant.latitude, hydrant.longitude)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
        <p className="notice">{t.medicalFacilityNotice}</p>
        <h2>{t.nearbyMedicalFacilities}</h2>
        <ol className="nearby-list">
          {nearbyMedicalFacilities.slice(0, 20).map(({ facility, distance }) => (
            <li key={facility.id}>
              <strong>{facility.facilityName}</strong>
              <span>{facility.facilityType === 'hospital' ? t.hospital : t.clinic} · {formatDistance(distance, language)}</span>
              {facility.district && <small>{facility.district}</small>}
              <small>{facility.address}</small>
              {facility.medicalCategory && <small>{t.classification}: {facility.medicalCategory}</small>}
              <a href={googleMapsUrl(facility.latitude, facility.longitude)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
        <p className="notice">{t.evacuationGateNotice}</p>
        <h2>{t.nearbyEvacuationGates}</h2>
        <ol className="nearby-list">
          {nearbyEvacuationGates.slice(0, 20).map(({ gate, distance }) => (
            <li key={gate.id}>
              <strong>{gate.gateName}</strong>
              <span>{formatDistance(distance, language)}</span>
              <small>{gate.riversidePark ?? t.notSpecified}</small>
              {gate.description && <small>{gate.description}</small>}
              <a href={googleMapsUrl(gate.latitude, gate.longitude)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
        <p className="notice">
          {shouldRenderDetailedShelters
            ? `${t.airRaidShelters}: ${visibleShelters.length.toLocaleString()}`
            : `${t.airRaidShelters}: ${visibleShelters.length.toLocaleString()} (${shelterClusters.length.toLocaleString()} clusters)`}
        </p>
        <h2>{t.nearbyShelters}</h2>
        <ol className="nearby-list">
          {nearbyShelters.slice(0, 20).map(({ shelter, distance }) => (
            <li key={shelter.id}>
              <strong>{shelter.placeName || shelter.name || shelter.address}</strong>
              <span>{formatDistance(distance, language)}</span>
              <small>
                {t.capacity}: {shelter.capacity?.toLocaleString() ?? '-'}
              </small>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}

function BurglaryRecords({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const t = translations[language];
  const uiText = localizedUiText[language];
  const [district, setDistrict] = useState('all');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [timePeriod, setTimePeriod] = useState<BurglaryTimePeriod | 'all'>('all');
  const [search, setSearch] = useState('');

  const years = [...new Set(data.burglaries.flatMap((record) => (record.year ? [record.year] : [])))].sort();
  const filtered = data.burglaries.filter((record) => {
    return (
      (district === 'all' || record.district === district) &&
      (year === 'all' || record.year === Number(year)) &&
      (month === 'all' || record.month === Number(month)) &&
      (timePeriod === 'all' || record.timePeriod === timePeriod) &&
      (!search.trim() || record.locationText.includes(search.trim()))
    );
  });
  const countsByDistrict = countBy(filtered, (record) => record.district);
  const visibleRecords = filtered.slice(0, maxVisibleBurglaryRecords);

  return (
    <main className="workspace burglary-layout">
      <section className="filter-panel">
        <label>
          {t.district}
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="all">{t.all}</option>
            {TAIPEI_DISTRICTS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {t.occurredDate}
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">{t.all}</option>
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          {uiText.month}
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="all">{t.all}</option>
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.timePeriod}
          <select
            value={timePeriod}
            onChange={(event) => setTimePeriod(event.target.value as BurglaryTimePeriod | 'all')}
          >
            <option value="all">{timePeriodLabels[language].all}</option>
            {TIME_PERIODS.map((period) => (
              <option key={period} value={period}>
                {timePeriodLabels[language][period]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.search}
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </section>

      <section className="map-stage">
        <MapContainer center={taipeiCenter} zoom={12} scrollWheelZoom className="map-canvas">
          <MapSizeSync />
          <TileLayer
            attribution={tileAttribution}
            url={tileUrl}
          />
          {data.districtSummaries.map((summary) => {
            const count = countsByDistrict[summary.district] ?? 0;
            if (!count) return null;
            return (
              <CircleMarker
                key={summary.district}
                center={[summary.latitude, summary.longitude]}
                radius={getBurglaryBubbleRadius(count)}
                pathOptions={{ color: '#b45309', fillColor: '#f59e0b', fillOpacity: 0.38, weight: 2 }}
              >
                <Popup>
                  <DistrictPopup summary={summary} count={count} records={filtered} language={language} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </section>

      <aside className="side-panel">
        <p className="notice">{t.recordsAreAggregated}</p>
        <h2>{t.recordCount}: {filtered.length.toLocaleString()}</h2>
        {filtered.length > visibleRecords.length && (
          <p className="notice">
            {language === 'zh'
              ? `列表先顯示前 ${visibleRecords.length.toLocaleString()} 筆，請使用篩選縮小範圍。`
              : `Showing the first ${visibleRecords.length.toLocaleString()} records. Use filters to narrow the list.`}
          </p>
        )}
        <RankingTable counts={countsByDistrict} label={t.district} valueLabel={t.recordCount} />
        <div className="record-list">
          {visibleRecords.map((record) => (
            <article key={record.id}>
              <strong>{record.locationText}</strong>
              <span>
                {record.district ?? '-'} · {record.occurredAt ?? record.occurredDateRaw} ·{' '}
                {timePeriodLabels[language][record.timePeriod]}
              </span>
            </article>
          ))}
        </div>
      </aside>
    </main>
  );
}

function BicycleTheftRecords({
  data,
  language,
  mode = 'bicycle',
}: {
  data: SafetyDataBundle;
  language: Language;
  mode?: 'bicycle' | 'motorcycle';
}) {
  const labels = mode === 'motorcycle' ? motorcycleLabels[language] : bicycleLabels[language];
  const records = mode === 'motorcycle' ? data.motorcycleThefts : data.bicycleThefts;
  const summary = mode === 'motorcycle' ? data.motorcycleTheftSummary : data.bicycleTheftSummary;
  const [district, setDistrict] = useState('all');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [timeBand, setTimeBand] = useState('all');
  const [timeOfDay, setTimeOfDay] = useState<IncidentTimeOfDayCategory | 'all'>('all');
  const [road, setRoad] = useState('all');
  const [village, setVillage] = useState('all');
  const [fuzziness, setFuzziness] = useState<BicycleTheftLocationFuzzinessLevel | 'all'>('all');
  const [addressRangeOnly, setAddressRangeOnly] = useState(false);
  const [search, setSearch] = useState('');
  const years = [...new Set(records.flatMap((record) => (record.year ? [record.year] : [])))].sort((a, b) => a - b);
  const timeBands = [...new Set(records.flatMap((record) => (record.incidentTimeBand ? [record.incidentTimeBand] : [])))].sort();
  const roads = summary.byRoadName.slice(0, 80).map((item) => item.roadName);
  const villages = [...new Set(records.flatMap((record) => (record.village ? [record.village] : [])))].sort();
  const filtered = records.filter((record) => {
    const haystack = [
      record.caseTypeRaw,
      record.date,
      record.year,
      record.district,
      record.village,
      record.roadName,
      record.incidentLocationRaw,
      record.incidentTimeBand,
    ]
      .join(' ')
      .toLowerCase();
    return (
      (district === 'all' || record.district === district) &&
      (year === 'all' || record.year === Number(year)) &&
      (month === 'all' || record.month === Number(month)) &&
      (timeBand === 'all' || record.incidentTimeBand === timeBand) &&
      (timeOfDay === 'all' || record.timeOfDayCategory === timeOfDay) &&
      (road === 'all' || record.roadName === road) &&
      (village === 'all' || record.village === village) &&
      (fuzziness === 'all' || record.locationFuzzinessLevel === fuzziness) &&
      (!addressRangeOnly || record.hasAddressRange) &&
      (!search.trim() || haystack.includes(search.trim().toLowerCase()))
    );
  });
  const countsByDistrict = countBy(filtered, (record) => record.district);
  const topDistrict = summary.byDistrict.slice().sort((a, b) => b.recordCount - a.recordCount)[0];
  const topTimeBand = summary.byIncidentTimeBand.slice().sort((a, b) => b.recordCount - a.recordCount)[0];
  const topTimeOfDay = summary.byTimeOfDayCategory.slice().sort((a, b) => b.recordCount - a.recordCount)[0];
  const currentYearCount = summary.maxYear
    ? summary.byYear.find((item) => item.year === summary.maxYear)?.recordCount ?? 0
    : 0;

  return (
    <main className="overview">
      <section className="filter-panel health-filters">
        <label>{labels.district}<select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="all">{labels.all}</option>{TAIPEI_DISTRICTS.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.year}<select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">{labels.all}</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.month}<select value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">{labels.all}</option>{monthOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.timeBand}<select value={timeBand} onChange={(event) => setTimeBand(event.target.value)}><option value="all">{labels.all}</option>{timeBands.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.timeOfDay}<select value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value as IncidentTimeOfDayCategory | 'all')}><option value="all">{labels.all}</option>{timeOfDayCategories.map((value) => <option key={value} value={value}>{formatTimeOfDay(value, language)}</option>)}</select></label>
        <label>{labels.road}<select value={road} onChange={(event) => setRoad(event.target.value)}><option value="all">{labels.all}</option>{roads.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.village}<select value={village} onChange={(event) => setVillage(event.target.value)}><option value="all">{labels.all}</option>{villages.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.fuzziness}<select value={fuzziness} onChange={(event) => setFuzziness(event.target.value as BicycleTheftLocationFuzzinessLevel | 'all')}><option value="all">{labels.all}</option>{locationFuzzinessLevels.map((value) => <option key={value} value={value}>{formatLocationFuzziness(value, language)}</option>)}</select></label>
        <label>{labels.search}<input value={search} placeholder={labels.searchPlaceholder} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={addressRangeOnly} onChange={(event) => setAddressRangeOnly(event.target.checked)} />{labels.hasAddressRange}</label>
      </section>
      <h1>{labels.title}</h1>
      <p>{labels.subtitle}</p>
      <p className="notice">{labels.mapNotice}</p>
      <section className="summary-grid">
        <Metric label={labels.historicalCount} value={summary.totalRecords.toLocaleString()} />
        <Metric label={labels.dataDateRange} value={`${summary.minDate ?? '-'} - ${summary.maxDate ?? '-'}`} />
        <Metric label={labels.districtsCovered} value={summary.districtCount.toLocaleString()} />
        <Metric label={labels.fuzzyLocationCount} value={summary.uniqueFuzzyLocationCount.toLocaleString()} />
        <Metric label={labels.recordsWithParsedRoadName} value={summary.recordsWithParsedRoadName.toLocaleString()} />
        <Metric label={labels.topDistrict} value={topDistrict?.district ?? '-'} />
        <Metric label={labels.topTimeBand} value={topTimeBand?.incidentTimeBand ?? '-'} />
        <Metric label={labels.topTimeOfDay} value={topTimeOfDay ? formatTimeOfDay(topTimeOfDay.timeOfDayCategory, language) : '-'} />
        <Metric label={labels.latestRecordDate} value={summary.maxDate ?? '-'} />
        <Metric label={labels.currentYearRecordCount} value={currentYearCount.toLocaleString()} />
      </section>
      <section className="public-health-grid">
        <div className="map-stage">
          <MapContainer center={taipeiCenter} zoom={11} scrollWheelZoom className="map-canvas">
            <MapSizeSync />
            <TileLayer attribution={tileAttribution} url={tileUrl} />
            {TAIPEI_DISTRICTS.map((name) => {
              const count = countsByDistrict[name] ?? 0;
              if (!count) return null;
              const center = TAIPEI_DISTRICT_CENTROIDS[name];
              const records = filtered.filter((record) => record.district === name);
              const topRoads = Object.entries(countBy(records, (record) => record.roadName)).sort((a, b) => b[1] - a[1]).slice(0, 3);
              const topBands = Object.entries(countBy(records, (record) => record.incidentTimeBand)).sort((a, b) => b[1] - a[1]).slice(0, 3);
              return (
                <CircleMarker
                  key={name}
                  center={[center.latitude, center.longitude]}
                  radius={Math.min(26, 7 + Math.sqrt(count) * 0.9)}
                  pathOptions={{ color: '#be123c', fillColor: '#fb7185', fillOpacity: 0.32, weight: 2 }}
                >
                  <Popup>
                    <div className="popup-stack">
                      <strong>{labels.shortTitle}</strong>
                      <span>{labels.district}: {name}</span>
                      <span>{labels.recordCount}: {count.toLocaleString()}</span>
                      <span>{labels.timeBand}: {topBands.map(([label, value]) => `${label} ${value}`).join(' / ') || '-'}</span>
                      <span>{labels.road}: {topRoads.map(([label, value]) => `${label} ${value}`).join(' / ') || '-'}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
        <div className="health-table">
          <p className="notice">{labels.dataNote}</p>
          <RankingTable counts={countsByDistrict} label={labels.district} valueLabel={labels.recordCount} />
        </div>
      </section>
      <section className="chart-grid">
        <BarChart title={labels.byYear} values={Object.fromEntries(summary.byYear.map((item) => [String(item.year), item.recordCount]))} />
        <BarChart title={labels.byMonth} values={Object.fromEntries(summary.byMonth.map((item) => [String(item.month), item.recordCount]))} />
        <BarChart title={labels.byDistrict} values={Object.fromEntries(summary.byDistrict.map((item) => [item.district, item.recordCount]))} />
        <BarChart title={labels.byTimeBand} values={Object.fromEntries(summary.byIncidentTimeBand.map((item) => [item.incidentTimeBand, item.recordCount]))} />
        <BarChart title={labels.byTimeOfDay} values={Object.fromEntries(summary.byTimeOfDayCategory.map((item) => [formatTimeOfDay(item.timeOfDayCategory, language), item.recordCount]))} />
        <BarChart title={labels.topRoads} values={Object.fromEntries(summary.byRoadName.slice(0, 20).map((item) => [item.roadName, item.recordCount]))} />
      </section>
      <h2>{labels.topBuckets}</h2>
      <table>
        <thead><tr><th>{labels.district}</th><th>{labels.road}</th><th>{labels.location}</th><th>{labels.recordCount}</th></tr></thead>
        <tbody>
          {summary.byLocationBucket.slice(0, 30).map((bucket) => (
            <tr key={bucket.locationBucketKey}>
              <td>{bucket.district ?? '-'}</td>
              <td>{bucket.roadName ?? '-'}</td>
              <td>{bucket.sampleLocationText ?? bucket.locationBucketKey}</td>
              <td>{bucket.recordCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>{labels.directory}</h2>
      <p>{labels.recordCount}: {filtered.length.toLocaleString()}</p>
      <table>
        <thead><tr><th>{labels.date}</th><th>{labels.caseType}</th><th>{labels.district}</th><th>{labels.timeBand}</th><th>{labels.location}</th><th>{labels.road}</th></tr></thead>
        <tbody>
          {filtered.slice().reverse().slice(0, 100).map((record) => (
            <tr key={record.id}>
              <td>{record.date ?? '-'}</td>
              <td>{record.caseTypeRaw ?? '-'}</td>
              <td>{record.district ?? '-'}</td>
              <td>{record.incidentTimeBand ?? '-'}</td>
              <td>{record.incidentLocationRaw ?? '-'}</td>
              <td>{record.roadName ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function PoliceCctvInstallationLocations({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const labels = policeCctvLabels[language];
  const [district, setDistrict] = useState('all');
  const [policeUnit, setPoliceUnit] = useState('all');
  const [road, setRoad] = useState('all');
  const [keyword, setKeyword] = useState('all');
  const [hasAddress, setHasAddress] = useState(false);
  const [hasDirection, setHasDirection] = useState(false);
  const [hasDistrict, setHasDistrict] = useState(false);
  const [hasRoad, setHasRoad] = useState(false);
  const [search, setSearch] = useState('');
  const records = data.policeCctvInstallationLocations;
  const summary = data.policeCctvInstallationLocationSummary;
  const policeUnits = summary.byPoliceUnit.map((item) => item.policeUnit);
  const roads = summary.byRoadName.slice(0, 80).map((item) => item.roadName);
  const keywords = summary.byCameraDirectionKeyword.map((item) => item.keyword);
  const filtered = records.filter((record) => {
    const haystack = [
      record.policeUnit,
      record.installationAddress,
      record.cameraDirection,
      record.district,
      record.roadName,
      record.sourceSequenceNumber,
    ]
      .join(' ')
      .toLowerCase();
    return (
      (district === 'all' || record.district === district) &&
      (policeUnit === 'all' || record.policeUnit === policeUnit) &&
      (road === 'all' || record.roadName === road) &&
      (keyword === 'all' || record.cameraDirectionNormalized?.includes(keyword)) &&
      (!hasAddress || record.hasInstallationAddress) &&
      (!hasDirection || record.hasCameraDirection) &&
      (!hasDistrict || record.hasParsedDistrict) &&
      (!hasRoad || record.hasParsedRoadName) &&
      (!search.trim() || haystack.includes(search.trim().toLowerCase()))
    );
  });
  const countsByDistrict = countBy(filtered, (record) => record.district);
  const topDistrict = summary.byDistrict[0];
  const topPoliceUnit = summary.byPoliceUnit[0];

  return (
    <main className="overview">
      <section className="filter-panel health-filters">
        <label>{labels.district}<select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="all">{labels.all}</option>{TAIPEI_DISTRICTS.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.policeUnit}<select value={policeUnit} onChange={(event) => setPoliceUnit(event.target.value)}><option value="all">{labels.all}</option>{policeUnits.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.road}<select value={road} onChange={(event) => setRoad(event.target.value)}><option value="all">{labels.all}</option>{roads.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.cameraDirectionKeyword}<select value={keyword} onChange={(event) => setKeyword(event.target.value)}><option value="all">{labels.all}</option>{keywords.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.search}<input value={search} placeholder={labels.searchPlaceholder} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={hasAddress} onChange={(event) => setHasAddress(event.target.checked)} />{labels.hasInstallationAddress}</label>
        <label className="checkbox-row"><input type="checkbox" checked={hasDirection} onChange={(event) => setHasDirection(event.target.checked)} />{labels.hasCameraDirection}</label>
        <label className="checkbox-row"><input type="checkbox" checked={hasDistrict} onChange={(event) => setHasDistrict(event.target.checked)} />{labels.hasParsedDistrict}</label>
        <label className="checkbox-row"><input type="checkbox" checked={hasRoad} onChange={(event) => setHasRoad(event.target.checked)} />{labels.hasParsedRoadName}</label>
      </section>
      <h1>{labels.title}</h1>
      <p>{labels.subtitle}</p>
      <p className="notice">{labels.mapNotice}</p>
      <section className="summary-grid">
        <Metric label={labels.installationRecordCount} value={summary.totalRecords.toLocaleString()} />
        <Metric label={labels.district} value={summary.districtCount.toLocaleString()} />
        <Metric label={labels.policeUnitCount} value={summary.policeUnitCount.toLocaleString()} />
        <Metric label={labels.uniqueInstallationAddressCount} value={summary.uniqueInstallationAddressCount.toLocaleString()} />
        <Metric label={labels.recordsWithCameraDirection} value={summary.recordsWithCameraDirection.toLocaleString()} />
        <Metric label={labels.recordsWithParsedDistrict} value={summary.recordsWithParsedDistrict.toLocaleString()} />
        <Metric label={labels.recordsWithParsedRoadName} value={summary.recordsWithParsedRoadName.toLocaleString()} />
        <Metric label={labels.topDistrict} value={topDistrict?.district ?? '-'} />
        <Metric label={labels.topPoliceUnit} value={topPoliceUnit?.policeUnit ?? '-'} />
      </section>
      <section className="public-health-grid">
        <div className="map-stage">
          <MapContainer center={taipeiCenter} zoom={11} scrollWheelZoom className="map-canvas">
            <MapSizeSync />
            <TileLayer attribution={tileAttribution} url={tileUrl} />
            {TAIPEI_DISTRICTS.map((name) => {
              const count = countsByDistrict[name] ?? 0;
              if (!count) return null;
              const center = TAIPEI_DISTRICT_CENTROIDS[name];
              const matching = filtered.filter((record) => record.district === name);
              const topUnits = Object.entries(countBy(matching, (record) => record.policeUnit)).sort((a, b) => b[1] - a[1]).slice(0, 3);
              return (
                <CircleMarker
                  key={name}
                  center={[center.latitude, center.longitude]}
                  radius={Math.min(28, 7 + Math.sqrt(count) * 0.8)}
                  pathOptions={{ color: '#155e75', fillColor: '#22d3ee', fillOpacity: 0.3, weight: 2 }}
                >
                  <Popup>
                    <div className="popup-stack">
                      <strong>{labels.districtDistribution}</strong>
                      <span>{labels.district}: {name}</span>
                      <span>{labels.recordCount}: {count.toLocaleString()}</span>
                      <span>{labels.policeUnit}: {topUnits.map(([unit, value]) => `${unit} ${value}`).join(' / ') || '-'}</span>
                      <small>{labels.popupNotice}</small>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
        <div className="health-table">
          <p className="notice">{labels.interpretationNote}</p>
          <RankingTable counts={countsByDistrict} label={labels.district} valueLabel={labels.recordCount} />
        </div>
      </section>
      <section className="chart-grid">
        <BarChart title={labels.byDistrict} values={Object.fromEntries(summary.byDistrict.map((item) => [item.district, item.recordCount]))} />
        <BarChart title={labels.byPoliceUnit} values={Object.fromEntries(summary.byPoliceUnit.slice(0, 30).map((item) => [item.policeUnit, item.count]))} />
        <BarChart title={labels.cameraDirectionAvailability} values={{ [labels.hasCameraDirection]: summary.recordsWithCameraDirection, [language === 'zh' ? '無攝影方向' : 'Without camera direction']: summary.totalRecords - summary.recordsWithCameraDirection }} />
        <BarChart title={labels.topRoads} values={Object.fromEntries(summary.byRoadName.slice(0, 20).map((item) => [item.roadName, item.count]))} />
        <BarChart title={labels.keywordSummary} values={Object.fromEntries(summary.byCameraDirectionKeyword.map((item) => [item.keyword, item.count]))} />
        <BarChart title={labels.parsingQuality} values={{
          [labels.hasParsedDistrict]: summary.locationParsingQuality.parsedDistrict,
          [language === 'zh' ? '未解析行政區' : 'Unparsed district']: summary.locationParsingQuality.unparsedDistrict,
          [labels.hasParsedRoadName]: summary.locationParsingQuality.parsedRoadName,
        }} />
      </section>
      <h2>{labels.directory}</h2>
      <p>{labels.recordCount}: {filtered.length.toLocaleString()}</p>
      <table>
        <thead><tr><th>{labels.policeUnit}</th><th>{labels.district}</th><th>{labels.installationAddress}</th><th>{labels.cameraDirection}</th><th>{labels.cityCountyCode}</th><th>{labels.sourceSequenceNumber}</th><th>{labels.mapLookup}</th></tr></thead>
        <tbody>
          {filtered.slice(0, 100).map((record) => (
            <tr key={record.id}>
              <td>{record.policeUnit ?? '-'}</td>
              <td>{record.district ?? '-'}</td>
              <td>{record.installationAddress ?? '-'}</td>
              <td>{record.cameraDirection ?? '-'}</td>
              <td>{record.cityCountyCode ?? '-'}</td>
              <td>{record.sourceSequenceNumber ?? '-'}</td>
              <td>{record.googleMapsQuery ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.googleMapsQuery)}`}>{labels.mapLookup}</a> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function FireDepartmentDonations({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const labels = fireDonationLabels[language];
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [donor, setDonor] = useState('all');
  const [itemCategory, setItemCategory] = useState('all');
  const [purposeCategory, setPurposeCategory] = useState('all');
  const [resource, setResource] = useState('all');
  const [medical, setMedical] = useState(false);
  const [protective, setProtective] = useState(false);
  const [search, setSearch] = useState('');
  const records = data.fireDepartmentDonationInKindRecords;
  const summary = data.fireDepartmentDonationInKindSummary;
  const years = [...new Set(records.flatMap((record) => (record.year ? [record.year] : [])))].sort((a, b) => a - b);
  const donors = summary.byDonor.slice(0, 100).map((item) => item.donorName);
  const resources = summary.resourceBreakdown.map((item) => item.resourceName);
  const filtered = records.filter((record) => {
    const haystack = [record.donorName, record.donatedItem, record.donationPurpose, record.year, record.possibleReceivingUnit, record.resourceName]
      .join(' ')
      .toLowerCase();
    return (
      (year === 'all' || record.year === Number(year)) &&
      (month === 'all' || record.month === Number(month)) &&
      (donor === 'all' || record.donorNameNormalized === donor) &&
      (itemCategory === 'all' || record.donatedItemCategory === itemCategory) &&
      (purposeCategory === 'all' || record.donationPurposeCategory === purposeCategory) &&
      (resource === 'all' || record.resourceName === resource) &&
      (!medical || record.hasMedicalOrRescueKeyword) &&
      (!protective || record.hasProtectiveEquipmentKeyword) &&
      (!search.trim() || haystack.includes(search.trim().toLowerCase()))
    );
  });
  const topItemCategory = summary.byDonatedItemCategory[0]?.donatedItemCategory;
  const topPurposeCategory = summary.byDonationPurposeCategory[0]?.donationPurposeCategory;

  return (
    <main className="overview">
      <section className="filter-panel health-filters">
        <label>{labels.year}<select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">{labels.all}</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.month}<select value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">{labels.all}</option>{monthOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.donor}<select value={donor} onChange={(event) => setDonor(event.target.value)}><option value="all">{labels.all}</option>{donors.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.itemCategory}<select value={itemCategory} onChange={(event) => setItemCategory(event.target.value)}><option value="all">{labels.all}</option>{summary.byDonatedItemCategory.map((item) => <option key={item.donatedItemCategory} value={item.donatedItemCategory}>{formatFireDonationItemCategory(item.donatedItemCategory, language)}</option>)}</select></label>
        <label>{labels.purposeCategory}<select value={purposeCategory} onChange={(event) => setPurposeCategory(event.target.value)}><option value="all">{labels.all}</option>{summary.byDonationPurposeCategory.map((item) => <option key={item.donationPurposeCategory} value={item.donationPurposeCategory}>{formatFireDonationPurposeCategory(item.donationPurposeCategory, language)}</option>)}</select></label>
        <label>{labels.sourceResource}<select value={resource} onChange={(event) => setResource(event.target.value)}><option value="all">{labels.all}</option>{resources.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{labels.search}<input value={search} placeholder={labels.searchPlaceholder} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={medical} onChange={(event) => setMedical(event.target.checked)} />{labels.medical}</label>
        <label className="checkbox-row"><input type="checkbox" checked={protective} onChange={(event) => setProtective(event.target.checked)} />{labels.protective}</label>
      </section>
      <h1>{labels.title}</h1>
      <p>{labels.subtitle}</p>
      <p className="notice">{labels.noMapNotice}</p>
      <section className="summary-grid">
        <Metric label={labels.recordCount} value={summary.totalRecords.toLocaleString()} />
        <Metric label={labels.yearRange} value={`${summary.minYear ?? '-'} - ${summary.maxYear ?? '-'}`} />
        <Metric label={labels.latestYear} value={String(summary.latestYear ?? '-')} />
        <Metric label={labels.uniqueDonorCount} value={summary.uniqueDonorCount.toLocaleString()} />
        <Metric label={labels.uniqueDonatedItemCount} value={summary.uniqueDonatedItemCount.toLocaleString()} />
        <Metric label={labels.uniqueDonationPurposeCount} value={summary.uniqueDonationPurposeCount.toLocaleString()} />
        <Metric label={labels.recordsWithCompleteDate} value={summary.recordsWithDonationDate.toLocaleString()} />
        <Metric label={labels.topDonor} value={summary.byDonor[0]?.donorName ?? '-'} />
        <Metric label={labels.topItemCategory} value={topItemCategory ? formatFireDonationItemCategory(topItemCategory, language) : '-'} />
        <Metric label={labels.topPurposeCategory} value={topPurposeCategory ? formatFireDonationPurposeCategory(topPurposeCategory, language) : '-'} />
        <Metric label={labels.medical} value={records.filter((record) => record.hasMedicalOrRescueKeyword).length.toLocaleString()} />
        <Metric label={labels.protective} value={records.filter((record) => record.hasProtectiveEquipmentKeyword).length.toLocaleString()} />
      </section>
      <p className="notice">{labels.interpretationNote}</p>
      <section className="chart-grid">
        <BarChart title={labels.byYear} values={Object.fromEntries(summary.byYear.map((item) => [String(item.year), item.recordCount]))} />
        <BarChart title={labels.byMonth} values={Object.fromEntries(summary.byMonth.map((item) => [item.donationMonthKey, item.recordCount]))} />
        <BarChart title={labels.itemCategoryDistribution} values={Object.fromEntries(summary.byDonatedItemCategory.map((item) => [formatFireDonationItemCategory(item.donatedItemCategory, language), item.count]))} />
        <BarChart title={labels.purposeCategoryDistribution} values={Object.fromEntries(summary.byDonationPurposeCategory.map((item) => [formatFireDonationPurposeCategory(item.donationPurposeCategory, language), item.count]))} />
        <BarChart title={labels.topDonors} values={Object.fromEntries(summary.byDonor.slice(0, 20).map((item) => [item.donorName, item.recordCount]))} />
        <BarChart title={labels.topItems} values={Object.fromEntries(summary.topDonatedItems.slice(0, 20).map((item) => [item.donatedItem, item.count]))} />
        <BarChart title={labels.topPurposes} values={Object.fromEntries(summary.topDonationPurposes.slice(0, 20).map((item) => [item.donationPurpose, item.count]))} />
        <BarChart title={labels.resourceBreakdown} values={Object.fromEntries(summary.resourceBreakdown.map((item) => [item.resourceName, item.recordCount]))} />
      </section>
      <h2>{language === 'zh' ? '捐贈清冊' : 'Donation Directory'}</h2>
      <p>{labels.recordCount}: {filtered.length.toLocaleString()}</p>
      <table>
        <thead><tr><th>{labels.year}</th><th>{labels.month}</th><th>{labels.day}</th><th>{labels.donor}</th><th>{labels.donatedItem}</th><th>{labels.donationPurpose}</th></tr></thead>
        <tbody>
          {filtered.slice(0, 100).map((record) => (
            <tr key={record.id}>
              <td>{record.year ?? '-'}</td>
              <td>{record.month ?? '-'}</td>
              <td>{record.day ?? '-'}</td>
              <td>{record.donorName ?? '-'}</td>
              <td>{record.donatedItem ?? '-'}</td>
              <td>{record.donationPurpose ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function PublicHealth({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const t = translations[language];
  const [district, setDistrict] = useState('all');
  const [month, setMonth] = useState('all');
  const [surveyType, setSurveyType] = useState('all');
  const [positiveOnly, setPositiveOnly] = useState(false);
  const surveyTypes = [...new Set(data.dengueRecords.flatMap((item) => (item.surveyType ? [item.surveyType] : [])))];
  const filtered = data.dengueRecords.filter(
    (item) =>
      (district === 'all' || item.district === district) &&
      (month === 'all' || item.surveyMonth === Number(month)) &&
      (surveyType === 'all' || item.surveyType === surveyType) &&
      (!positiveOnly || (item.positiveHouseholds ?? 0) > 0 || (item.positiveContainersTotal ?? 0) > 0),
  );
  const summaries = buildDengueDistrictSummaries(filtered);
  const breteauValues = filtered.flatMap((item) => (item.breteauIndex === undefined ? [] : [item.breteauIndex]));
  const containerValues = filtered.flatMap((item) => (item.containerIndex === undefined ? [] : [item.containerIndex]));

  return (
    <main className="overview">
      <section className="filter-panel health-filters">
        <label>
          {t.district}
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="all">{t.all}</option>
            {TAIPEI_DISTRICTS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {localizedUiText[language].month}
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="all">{t.all}</option>
            {monthOptions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          {t.surveyType}
          <select value={surveyType} onChange={(event) => setSurveyType(event.target.value)}>
            <option value="all">{t.all}</option>
            {surveyTypes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={positiveOnly} onChange={(event) => setPositiveOnly(event.target.checked)} />
          {language === 'zh' ? '僅顯示陽性紀錄' : 'Positive records only'}
        </label>
      </section>
      <p className="notice">{t.dengueMapNotice}</p>
      <section className="summary-grid">
        <Metric label={t.dengueSurveyRecordCount} value={filtered.length.toLocaleString()} />
        <Metric
          label={t.surveyedHouseholds}
          value={filtered.reduce((sum, item) => sum + (item.surveyedHouseholds ?? 0), 0).toLocaleString()}
        />
        <Metric
          label={t.positiveHouseholds}
          value={filtered.reduce((sum, item) => sum + (item.positiveHouseholds ?? 0), 0).toLocaleString()}
        />
        <Metric label={t.averageBreteauIndex} value={formatAverage(breteauValues)} />
        <Metric label={t.averageContainerIndex} value={formatAverage(containerValues)} />
      </section>
      <section className="public-health-grid">
        <div className="map-stage">
          <MapContainer center={taipeiCenter} zoom={11} scrollWheelZoom className="map-canvas">
            <MapSizeSync />
            <TileLayer
              attribution={tileAttribution}
              url={tileUrl}
            />
            {summaries.map((summary) =>
              summary.recordCount ? (
                <CircleMarker
                  key={summary.district}
                  center={[summary.latitude, summary.longitude]}
                  radius={Math.min(25, 7 + Math.sqrt(summary.recordCount) * 1.2)}
                  pathOptions={{ color: '#047857', fillColor: '#34d399', fillOpacity: 0.3, weight: 2 }}
                >
                  <Popup>
                    <DenguePopup summary={summary} language={language} />
                  </Popup>
                </CircleMarker>
              ) : null,
            )}
          </MapContainer>
        </div>
        <div className="health-table">
          <p className="notice">{t.dengueSurveyInterpretationNotice}</p>
          <table>
            <thead>
              <tr>
                <th>{t.district}</th>
                <th>{t.village}</th>
                <th>{t.surveyType}</th>
                <th>{t.breteauIndex}</th>
                <th>{t.containerIndex}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((item) => (
                <tr key={item.id}>
                  <td>{item.district}</td>
                  <td>{item.village ?? '-'}</td>
                  <td>{item.surveyType ?? '-'}</td>
                  <td>{item.breteauIndex ?? '-'}</td>
                  <td>{item.containerIndex ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function NaturalDisasterSuspensions({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const labels = disasterLabels[language];
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [disasterType, setDisasterType] = useState<NaturalDisasterType | 'all'>('all');
  const [disasterName, setDisasterName] = useState('all');
  const [decisionCategory, setDecisionCategory] = useState<WorkSchoolSuspensionDecisionCategory | 'all'>('all');
  const [workStatus, setWorkStatus] = useState<WorkOrSchoolSuspensionStatus | 'all'>('all');
  const [schoolStatus, setSchoolStatus] = useState<WorkOrSchoolSuspensionStatus | 'all'>('all');
  const [mentionedDistrict, setMentionedDistrict] = useState('all');
  const [citywideOnly, setCitywideOnly] = useState(false);
  const [partialOnly, setPartialOnly] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [schoolOnly, setSchoolOnly] = useState(false);
  const [mountainOnly, setMountainOnly] = useState(false);
  const [search, setSearch] = useState('');
  const years = [...new Set(data.naturalDisasterSuspensionRecords.flatMap((item) => (item.year ? [item.year] : [])))].sort((a, b) => a - b);
  const disasterNames = [...new Set(data.naturalDisasterSuspensionRecords.flatMap((item) => (item.disasterName ? [item.disasterName] : [])))].sort();
  const filtered = data.naturalDisasterSuspensionRecords.filter((record) => {
    const haystack = [
      record.disasterName,
      record.suspensionMessageRaw,
      record.date,
      record.year,
      ...record.mentionedDistricts,
      ...record.mentionedSchoolsOrAreas,
    ]
      .join(' ')
      .toLowerCase();
    return (
      (year === 'all' || record.year === Number(year)) &&
      (month === 'all' || record.month === Number(month)) &&
      (disasterType === 'all' || record.disasterType === disasterType) &&
      (disasterName === 'all' || record.disasterName === disasterName) &&
      (decisionCategory === 'all' || record.decisionCategory === decisionCategory) &&
      (workStatus === 'all' || record.workSuspensionStatus === workStatus) &&
      (schoolStatus === 'all' || record.schoolSuspensionStatus === schoolStatus) &&
      (mentionedDistrict === 'all' || record.mentionedDistricts.includes(mentionedDistrict)) &&
      (!citywideOnly || record.isCitywide) &&
      (!partialOnly || record.isPartialDay) &&
      (!localOnly || record.hasLocalException) &&
      (!schoolOnly || record.hasSchoolOnlyException) &&
      (!mountainOnly || record.hasMountainAreaException) &&
      (!search.trim() || haystack.includes(search.trim().toLowerCase()))
    );
  });
  const summary = data.naturalDisasterSuspensionSummary;
  const typhoonCount = summary.byDisasterType.find((item) => item.disasterType === 'typhoon')?.count ?? 0;
  const heavyRainCount = summary.byDisasterType.find((item) => item.disasterType === 'heavy_rain')?.count ?? 0;
  const citywideCount = summary.byDecisionCategory.find((item) => item.decisionCategory === 'citywide_full_suspension')?.count ?? 0;
  const normalCount = summary.byDecisionCategory.find((item) => item.decisionCategory === 'normal_work_school')?.count ?? 0;
  const localCount = data.naturalDisasterSuspensionRecords.filter((item) => item.hasLocalException).length;

  return (
    <main className="overview">
      <section className="filter-panel health-filters">
        <label>
          {labels.year}
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">{labels.all}</option>
            {years.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          {labels.month}
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="all">{labels.all}</option>
            {monthOptions.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          {labels.disasterType}
          <select value={disasterType} onChange={(event) => setDisasterType(event.target.value as NaturalDisasterType | 'all')}>
            <option value="all">{labels.all}</option>
            {naturalDisasterTypes.map((value) => <option key={value} value={value}>{formatNaturalDisasterType(value, language)}</option>)}
          </select>
        </label>
        <label>
          {labels.disasterName}
          <select value={disasterName} onChange={(event) => setDisasterName(event.target.value)}>
            <option value="all">{labels.all}</option>
            {disasterNames.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          {labels.decisionCategory}
          <select value={decisionCategory} onChange={(event) => setDecisionCategory(event.target.value as WorkSchoolSuspensionDecisionCategory | 'all')}>
            <option value="all">{labels.all}</option>
            {decisionCategories.map((value) => <option key={value} value={value}>{formatDecisionCategory(value, language)}</option>)}
          </select>
        </label>
        <label>
          {labels.workStatus}
          <select value={workStatus} onChange={(event) => setWorkStatus(event.target.value as WorkOrSchoolSuspensionStatus | 'all')}>
            <option value="all">{labels.all}</option>
            {suspensionStatuses.map((value) => <option key={value} value={value}>{formatSuspensionStatus(value, language)}</option>)}
          </select>
        </label>
        <label>
          {labels.schoolStatus}
          <select value={schoolStatus} onChange={(event) => setSchoolStatus(event.target.value as WorkOrSchoolSuspensionStatus | 'all')}>
            <option value="all">{labels.all}</option>
            {suspensionStatuses.map((value) => <option key={value} value={value}>{formatSuspensionStatus(value, language)}</option>)}
          </select>
        </label>
        <label>
          {labels.mentionedDistrict}
          <select value={mentionedDistrict} onChange={(event) => setMentionedDistrict(event.target.value)}>
            <option value="all">{labels.all}</option>
            {TAIPEI_DISTRICTS.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>{labels.search}<input value={search} placeholder={labels.searchPlaceholder} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={citywideOnly} onChange={(event) => setCitywideOnly(event.target.checked)} />{labels.citywide}</label>
        <label className="checkbox-row"><input type="checkbox" checked={partialOnly} onChange={(event) => setPartialOnly(event.target.checked)} />{labels.partialDay}</label>
        <label className="checkbox-row"><input type="checkbox" checked={localOnly} onChange={(event) => setLocalOnly(event.target.checked)} />{labels.localException}</label>
        <label className="checkbox-row"><input type="checkbox" checked={schoolOnly} onChange={(event) => setSchoolOnly(event.target.checked)} />{labels.schoolOnly}</label>
        <label className="checkbox-row"><input type="checkbox" checked={mountainOnly} onChange={(event) => setMountainOnly(event.target.checked)} />{labels.mountainArea}</label>
      </section>
      <h1>{labels.title}</h1>
      <p className="notice">{labels.disclaimer}</p>
      <section className="summary-grid">
        <Metric label={labels.historicalRecordCount} value={summary.totalRecords.toLocaleString()} />
        <Metric label={labels.dataDateRange} value={`${summary.minDate ?? '-'} - ${summary.maxDate ?? '-'}`} />
        <Metric label={labels.disasterNameCount} value={summary.uniqueDisasterNameCount.toLocaleString()} />
        <Metric label={labels.eventGroupCount} value={summary.eventGroupCount.toLocaleString()} />
        <Metric label={labels.typhoonRecordCount} value={typhoonCount.toLocaleString()} />
        <Metric label={labels.heavyRainRecordCount} value={heavyRainCount.toLocaleString()} />
        <Metric label={labels.citywideSuspensionCount} value={citywideCount.toLocaleString()} />
        <Metric label={labels.normalWorkSchoolCount} value={normalCount.toLocaleString()} />
        <Metric label={labels.localExceptionCount} value={localCount.toLocaleString()} />
        <Metric label={labels.latestRecordDate} value={summary.maxDate ?? '-'} />
      </section>
      <section className="chart-grid">
        <BarChart title={labels.recordsByYear} values={Object.fromEntries(summary.byYear.map((item) => [String(item.year), item.recordCount]))} />
        <BarChart title={labels.recordsByMonth} values={Object.fromEntries(summary.byMonth.map((item) => [String(item.month), item.recordCount]))} />
        <BarChart title={labels.recordsByDisasterType} values={Object.fromEntries(summary.byDisasterType.map((item) => [formatNaturalDisasterType(item.disasterType, language), item.count]))} />
        <BarChart title={labels.recordsByDecisionCategory} values={Object.fromEntries(summary.byDecisionCategory.map((item) => [formatDecisionCategory(item.decisionCategory, language), item.count]))} />
      </section>
      <h2>{labels.timeline}</h2>
      <p className="notice">{labels.timelineNote}</p>
      <div className="record-list">
        {filtered.slice().reverse().slice(0, 30).map((record) => (
          <article key={`timeline-${record.id}`}>
            <strong>{record.date ?? '-'} · {record.disasterName ?? '-'}</strong>
            <span>{formatNaturalDisasterType(record.disasterType, language)} · {formatDecisionCategory(record.decisionCategory, language)}</span>
            <small>{record.suspensionMessageRaw}</small>
          </article>
        ))}
      </div>
      <h2>{labels.eventGroups}</h2>
      <p className="notice">{labels.eventGroupNotice}</p>
      <div className="record-list">
        {data.naturalDisasterSuspensionEventGroups.slice().reverse().slice(0, 20).map((group) => (
          <article key={group.eventGroupKey}>
            <strong>{group.disasterName}</strong>
            <span>{formatNaturalDisasterType(group.disasterType, language)} · {group.startDate ?? '-'} - {group.endDate ?? '-'} · {group.recordCount}</span>
            <small>{group.decisionCategories.map((item) => `${formatDecisionCategory(item.decisionCategory, language)} ${item.count}`).join(' / ')}</small>
          </article>
        ))}
      </div>
      <h2>{labels.directory}</h2>
      <p>{labels.recordCount}: {filtered.length.toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            <th>{labels.date}</th>
            <th>{labels.disasterName}</th>
            <th>{labels.disasterType}</th>
            <th>{labels.decisionCategory}</th>
            <th>{labels.suspensionMessage}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice().reverse().slice(0, 100).map((record) => (
            <tr key={record.id}>
              <td>{record.date ?? '-'}</td>
              <td>{record.disasterName ?? '-'}</td>
              <td>{formatNaturalDisasterType(record.disasterType, language)}</td>
              <td>{formatDecisionCategory(record.decisionCategory, language)}</td>
              <td>{record.suspensionMessageRaw ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function SafetyOverview({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const t = translations[language];
  const totalCapacity = data.shelters.reduce((sum, shelter) => sum + (shelter.capacity ?? 0), 0);
  const shelterDistricts = data.districtSummaries.reduce<Record<string, number>>((counts, summary) => {
    counts[summary.district] = summary.shelterCount;
    return counts;
  }, {});
  const shelterCapacity = data.districtSummaries.reduce<Record<string, number>>((counts, summary) => {
    counts[summary.district] = summary.shelterCapacity;
    return counts;
  }, {});
  const burglaryByYear = countBy(data.burglaries, (record) => (record.year ? String(record.year) : undefined));
  const burglaryByMonth = countBy(data.burglaries, (record) => (record.month ? String(record.month) : undefined));
  const burglaryByPeriod = countBy(data.burglaries, (record) => timePeriodLabels[language][record.timePeriod]);
  const burglaryByDistrict = countBy(data.burglaries, (record) => record.district);
  const topCapacity = mostCommonEntry(shelterCapacity);
  const topBurglary = mostCommonEntry(burglaryByDistrict);
  const commonPeriod = mostCommonEntry(burglaryByPeriod);
  const latest = [...data.burglaries]
    .filter((record) => record.year && record.month)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.month ?? 0) - (a.month ?? 0))[0];
  const aedByDistrict = countBy(data.aeds, (item) => item.district);
  const hospitals = data.medicalFacilities.filter((item) => item.facilityType === 'hospital');
  const clinics = data.medicalFacilities.filter((item) => item.facilityType === 'clinic');
  const hospitalsByDistrict = countBy(hospitals, (item) => item.district);
  const clinicsByDistrict = countBy(clinics, (item) => item.district);
  const medicalFacilitiesByDistrict = countBy(data.medicalFacilities, (item) => item.district);
  const medicalFacilitiesByType = {
    [t.hospitals]: hospitals.length,
    [t.clinics]: clinics.length,
  };
  const medicalCoordinateAvailability = {
    [t.hasValidCoordinates]: data.medicalFacilities.filter((item) => item.coordinateStatus === 'valid').length,
    [t.invalidCoordinates]: data.medicalFacilities.filter((item) => item.coordinateStatus !== 'valid').length,
  };
  const hydrantSummary = data.fireHydrantSummary;
  const hydrantsByCity = Object.fromEntries(hydrantSummary.byCity.map((item) => [item.city, item.count]));
  const hydrantsByDistrict = Object.fromEntries(hydrantSummary.byDistrict.map((item) => [`${item.city} ${item.district}`, item.count]));
  const hydrantsByType = {
    [t.undergroundHydrant]: hydrantSummary.undergroundHydrantCount,
    [t.aboveGroundHydrant]: hydrantSummary.aboveGroundHydrantCount,
  };
  const hydrantsByScope = Object.fromEntries(
    hydrantSummary.byAreaScope.map((item) => [formatAreaScope(item.areaScope, language), item.count]),
  );
  const hydrantCoordinateStatus = {
    [t.hasValidCoordinates]: hydrantSummary.validCoordinateCount,
    [t.invalidCoordinates]: hydrantSummary.totalRecords - hydrantSummary.validCoordinateCount,
  };
  const topHydrantDistrict = [...hydrantSummary.byDistrict].sort((a, b) => b.count - a.count)[0];
  const topHydrantVillage = Object.fromEntries(
    [...hydrantSummary.byVillage]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((item) => [`${item.city} ${item.district} ${item.village}`, item.count]),
  );
  const emergencyShelterSummary = data.emergencyShelterSummary;
  const emergencySheltersByDistrict = Object.fromEntries(
    emergencyShelterSummary.byDistrict.map((item) => [item.district, item.count]),
  );
  const emergencyCapacityByDistrict = Object.fromEntries(
    emergencyShelterSummary.byDistrict.map((item) => [item.district, item.totalListedCapacityPeople]),
  );
  const emergencySheltersByType = Object.fromEntries(
    emergencyShelterSummary.byShelterType.map((item) => [formatEmergencyShelterType(item.shelterType, language), item.count]),
  );
  const emergencyCapacityByType = Object.fromEntries(
    emergencyShelterSummary.byShelterType.map((item) => [
      formatEmergencyShelterType(item.shelterType, language),
      item.totalListedCapacityPeople,
    ]),
  );
  const accessibleSheltersByDistrict = Object.fromEntries(
    emergencyShelterSummary.byDistrict.map((item) => [item.district, item.accessibleFacilityCount]),
  );
  const reliefStationsByDistrict = Object.fromEntries(
    emergencyShelterSummary.byDistrict.map((item) => [item.district, item.reliefStationCount]),
  );
  const indoorOutdoorShelters = {
    [t.indoor]: emergencyShelterSummary.indoorShelterCount,
    [t.outdoor]: emergencyShelterSummary.outdoorShelterCount,
  };
  const disasterApplicability = Object.fromEntries(
    emergencyShelterSummary.byDisasterApplicability.flood.map((item) => [
      `${t.flood} ${formatDisasterStatus(item.status, language)}`,
      item.count,
    ]),
  );
  const topEmergencyShelterDistrict = [...emergencyShelterSummary.byDistrict].sort((a, b) => b.count - a.count)[0];
  const topEmergencyCapacityDistrict = [...emergencyShelterSummary.byDistrict].sort((a, b) => b.totalListedCapacityPeople - a.totalListedCapacityPeople)[0];
  const topEmergencyShelterType = [...emergencyShelterSummary.byShelterType].sort((a, b) => b.count - a.count)[0];
  const cctvSummary = data.trafficCctvSummary;
  const cctvByCity = Object.fromEntries(cctvSummary.byCity.map((item) => [item.city, item.count]));
  const cctvCoordinateStatus = Object.fromEntries(
    cctvSummary.coordinateStatus.map((item) => [formatCoordinateStatus(item.coordinateStatus, language), item.count]),
  );
  const gatesByRiversidePark = countBy(data.evacuationGates, (item) => item.riversidePark);
  const topRiversidePark = mostCommonEntry(gatesByRiversidePark);
  const riversideParkAvailability = {
    [t.hasRiversidePark]: data.evacuationGates.filter((item) => item.riversidePark).length,
    [t.withoutRiversidePark]: data.evacuationGates.filter((item) => !item.riversidePark).length,
  };
  const locationDescriptionAvailability = {
    [t.hasLocationDescription]: data.evacuationGates.filter((item) => item.description).length,
    [t.withoutLocationDescription]: data.evacuationGates.filter((item) => !item.description).length,
  };
  const dengueByDistrict = data.dengueDistrictSummaries.reduce<Record<string, number>>((counts, item) => {
    counts[item.district] = item.recordCount;
    return counts;
  }, {});
  const latestDengueMonth = data.dengueRecords
    .flatMap((item) => (item.surveyYear && item.surveyMonth ? [`${item.surveyYear}-${String(item.surveyMonth).padStart(2, '0')}`] : []))
    .sort()
    .at(-1);
  const disasterSummary = data.naturalDisasterSuspensionSummary;
  const disasterLabelsForOverview = disasterLabels[language];
  const bikeSummary = data.bicycleTheftSummary;
  const bikeLabelsForOverview = bicycleLabels[language];
  const motorcycleSummary = data.motorcycleTheftSummary;
  const motorcycleLabelsForOverview = motorcycleLabels[language];
  const policeCctvSummary = data.policeCctvInstallationLocationSummary;
  const policeCctvLabelsForOverview = policeCctvLabels[language];
  const fireDonationSummary = data.fireDepartmentDonationInKindSummary;
  const fireDonationLabelsForOverview = fireDonationLabels[language];

  return (
    <main className="overview">
      <section className="summary-grid">
        <Metric label={t.totalShelters} value={data.shelters.length.toLocaleString()} />
        <Metric label={t.totalShelterCapacity} value={totalCapacity.toLocaleString()} />
        <Metric label={t.topShelterCapacityDistrict} value={topCapacity?.[0] ?? '-'} />
        <Metric label={t.totalBurglaryRecords} value={data.burglaries.length.toLocaleString()} />
        <Metric label={bikeLabelsForOverview.historicalCount} value={bikeSummary.totalRecords.toLocaleString()} />
        <Metric label={bikeLabelsForOverview.fuzzyLocationCount} value={bikeSummary.uniqueFuzzyLocationCount.toLocaleString()} />
        <Metric label={bikeLabelsForOverview.topDistrict} value={bikeSummary.byDistrict.slice().sort((a, b) => b.recordCount - a.recordCount)[0]?.district ?? '-'} />
        <Metric label={bikeLabelsForOverview.topTimeBand} value={bikeSummary.byIncidentTimeBand.slice().sort((a, b) => b.recordCount - a.recordCount)[0]?.incidentTimeBand ?? '-'} />
        <Metric label={motorcycleLabelsForOverview.historicalCount} value={motorcycleSummary.totalRecords.toLocaleString()} />
        <Metric label={motorcycleLabelsForOverview.fuzzyLocationCount} value={motorcycleSummary.uniqueFuzzyLocationCount.toLocaleString()} />
        <Metric label={motorcycleLabelsForOverview.topDistrict} value={motorcycleSummary.byDistrict.slice().sort((a, b) => b.recordCount - a.recordCount)[0]?.district ?? '-'} />
        <Metric label={motorcycleLabelsForOverview.topTimeBand} value={motorcycleSummary.byIncidentTimeBand.slice().sort((a, b) => b.recordCount - a.recordCount)[0]?.incidentTimeBand ?? '-'} />
        <Metric label={policeCctvLabelsForOverview.installationRecordCount} value={policeCctvSummary.totalRecords.toLocaleString()} />
        <Metric label={policeCctvLabelsForOverview.policeUnitCount} value={policeCctvSummary.policeUnitCount.toLocaleString()} />
        <Metric label={policeCctvLabelsForOverview.uniqueInstallationAddressCount} value={policeCctvSummary.uniqueInstallationAddressCount.toLocaleString()} />
        <Metric label={policeCctvLabelsForOverview.recordsWithCameraDirection} value={policeCctvSummary.recordsWithCameraDirection.toLocaleString()} />
        <Metric label={policeCctvLabelsForOverview.recordsWithParsedDistrict} value={policeCctvSummary.recordsWithParsedDistrict.toLocaleString()} />
        <Metric label={policeCctvLabelsForOverview.recordsWithParsedRoadName} value={policeCctvSummary.recordsWithParsedRoadName.toLocaleString()} />
        <Metric label={policeCctvLabelsForOverview.topDistrict} value={policeCctvSummary.byDistrict[0]?.district ?? '-'} />
        <Metric label={policeCctvLabelsForOverview.topPoliceUnit} value={policeCctvSummary.byPoliceUnit[0]?.policeUnit ?? '-'} />
        <Metric label={fireDonationLabelsForOverview.recordCount} value={fireDonationSummary.totalRecords.toLocaleString()} />
        <Metric label={fireDonationLabelsForOverview.yearRange} value={`${fireDonationSummary.minYear ?? '-'} - ${fireDonationSummary.maxYear ?? '-'}`} />
        <Metric label={fireDonationLabelsForOverview.uniqueDonorCount} value={fireDonationSummary.uniqueDonorCount.toLocaleString()} />
        <Metric label={fireDonationLabelsForOverview.recordsWithCompleteDate} value={fireDonationSummary.recordsWithDonationDate.toLocaleString()} />
        <Metric label={fireDonationLabelsForOverview.topDonor} value={fireDonationSummary.byDonor[0]?.donorName ?? '-'} />
        <Metric label={t.latestBurglaryMonth} value={latest ? `${latest.year}-${String(latest.month).padStart(2, '0')}` : '-'} />
        <Metric label={t.mostCommonBurglaryTimePeriod} value={commonPeriod?.[0] ?? '-'} />
        <Metric label={t.topBurglaryDistrict} value={topBurglary?.[0] ?? '-'} />
        <Metric
          label={t.recordsWithDistrict}
          value={data.burglaries.filter((record) => record.district).length.toLocaleString()}
        />
        <Metric label={t.aedLocationCount} value={data.aeds.length.toLocaleString()} />
        <Metric label={t.fireHydrantCount} value={hydrantSummary.totalRecords.toLocaleString()} />
        <Metric label={t.taipeiCityHydrantCount} value={hydrantSummary.taipeiCityCount.toLocaleString()} />
        <Metric label={t.newTaipeiHydrantCount} value={hydrantSummary.newTaipeiCount.toLocaleString()} />
        <Metric label={t.undergroundHydrantCount} value={hydrantSummary.undergroundHydrantCount.toLocaleString()} />
        <Metric label={t.aboveGroundHydrantCount} value={hydrantSummary.aboveGroundHydrantCount.toLocaleString()} />
        <Metric label={t.topDistrictByHydrantCount} value={topHydrantDistrict ? `${topHydrantDistrict.city} ${topHydrantDistrict.district}` : '-'} />
        <Metric label={t.topHydrantType} value={hydrantSummary.undergroundHydrantCount >= hydrantSummary.aboveGroundHydrantCount ? t.undergroundHydrant : t.aboveGroundHydrant} />
        <Metric label={t.villagesCovered} value={hydrantSummary.villageCount.toLocaleString()} />
        <Metric label={t.emergencyShelterCount} value={emergencyShelterSummary.totalRecords.toLocaleString()} />
        <Metric label={t.totalListedCapacity} value={emergencyShelterSummary.totalListedCapacityPeople.toLocaleString()} />
        <Metric label={t.shelterTypesCovered} value={emergencyShelterSummary.byShelterType.length.toLocaleString()} />
        <Metric label={t.accessibleShelterCount} value={emergencyShelterSummary.accessibleFacilityCount.toLocaleString()} />
        <Metric label={t.reliefStationCount} value={emergencyShelterSummary.reliefStationCount.toLocaleString()} />
        <Metric label={t.indoorShelterCount} value={emergencyShelterSummary.indoorShelterCount.toLocaleString()} />
        <Metric label={t.outdoorShelterCount} value={emergencyShelterSummary.outdoorShelterCount.toLocaleString()} />
        <Metric label={t.topDistrictByShelterCount} value={topEmergencyShelterDistrict?.district ?? '-'} />
        <Metric label={t.topDistrictByListedCapacity} value={topEmergencyCapacityDistrict?.district ?? '-'} />
        <Metric label={t.topShelterType} value={topEmergencyShelterType ? formatEmergencyShelterType(topEmergencyShelterType.shelterType, language) : '-'} />
        <Metric label={t.cctvFacilityCount} value={cctvSummary.totalRecords.toLocaleString()} />
        <Metric label={t.cctvValidCoordinateCount} value={cctvSummary.validCoordinateCount.toLocaleString()} />
        <Metric label={t.cctvCityCount} value={cctvSummary.cityCount.toLocaleString()} />
        <Metric label={t.cctvCoordinateOutlierCount} value={cctvSummary.outlierCoordinateCount.toLocaleString()} />
        <Metric label={t.medicalFacilityCount} value={data.medicalFacilities.length.toLocaleString()} />
        <Metric label={t.hospitalCount} value={hospitals.length.toLocaleString()} />
        <Metric label={t.clinicCount} value={clinics.length.toLocaleString()} />
        <Metric
          label={t.medicalFacilitiesWithValidCoordinates}
          value={data.medicalFacilities.filter((item) => item.coordinateStatus === 'valid').length.toLocaleString()}
        />
        <Metric label={t.topDistrictByHospitalCount} value={mostCommonEntry(hospitalsByDistrict)?.[0] ?? '-'} />
        <Metric label={t.topDistrictByClinicCount} value={mostCommonEntry(clinicsByDistrict)?.[0] ?? '-'} />
        <Metric
          label={t.topDistrictByMedicalFacilityCount}
          value={mostCommonEntry(medicalFacilitiesByDistrict)?.[0] ?? '-'}
        />
        <Metric label={t.evacuationGateCount} value={data.evacuationGates.length.toLocaleString()} />
        <Metric
          label={t.evacuationGatesWithValidCoordinates}
          value={data.evacuationGates.filter((item) => item.coordinateStatus === 'valid').length.toLocaleString()}
        />
        <Metric
          label={t.riversideParksWithEvacuationGates}
          value={Object.keys(gatesByRiversidePark).length.toLocaleString()}
        />
        <Metric label={t.topRiversideParkByGateCount} value={topRiversidePark?.[0] ?? t.notSpecified} />
        <Metric
          label={t.recordsWithLocationDescription}
          value={data.evacuationGates.filter((item) => item.description).length.toLocaleString()}
        />
        <Metric label={t.latestDengueSurveyMonth} value={latestDengueMonth ?? '-'} />
        <Metric label={t.dengueSurveyRecordCount} value={data.dengueRecords.length.toLocaleString()} />
        <Metric label={disasterLabelsForOverview.historicalRecordCount} value={disasterSummary.totalRecords.toLocaleString()} />
        <Metric label={disasterLabelsForOverview.dataDateRange} value={`${disasterSummary.minDate ?? '-'} - ${disasterSummary.maxDate ?? '-'}`} />
        <Metric label={disasterLabelsForOverview.disasterNameCount} value={disasterSummary.uniqueDisasterNameCount.toLocaleString()} />
        <Metric label={disasterLabelsForOverview.eventGroupCount} value={disasterSummary.eventGroupCount.toLocaleString()} />
      </section>
      <section className="chart-grid">
        <BarChart title={t.sheltersByDistrict} values={shelterDistricts} />
        <BarChart title={t.shelterCapacityByDistrict} values={shelterCapacity} />
        <BarChart title={t.burglaryRecordsByYear} values={burglaryByYear} />
        <BarChart title={t.burglaryRecordsByMonth} values={burglaryByMonth} />
        <BarChart title={t.burglaryRecordsByTimePeriod} values={burglaryByPeriod} />
        <BarChart title={t.burglaryRecordsByDistrict} values={burglaryByDistrict} />
        <BarChart title={bikeLabelsForOverview.byYear} values={Object.fromEntries(bikeSummary.byYear.map((item) => [String(item.year), item.recordCount]))} />
        <BarChart title={bikeLabelsForOverview.byDistrict} values={Object.fromEntries(bikeSummary.byDistrict.map((item) => [item.district, item.recordCount]))} />
        <BarChart title={bikeLabelsForOverview.byTimeBand} values={Object.fromEntries(bikeSummary.byIncidentTimeBand.map((item) => [item.incidentTimeBand, item.recordCount]))} />
        <BarChart title={motorcycleLabelsForOverview.byYear} values={Object.fromEntries(motorcycleSummary.byYear.map((item) => [String(item.year), item.recordCount]))} />
        <BarChart title={motorcycleLabelsForOverview.byDistrict} values={Object.fromEntries(motorcycleSummary.byDistrict.map((item) => [item.district, item.recordCount]))} />
        <BarChart title={motorcycleLabelsForOverview.byTimeBand} values={Object.fromEntries(motorcycleSummary.byIncidentTimeBand.map((item) => [item.incidentTimeBand, item.recordCount]))} />
        <BarChart title={policeCctvLabelsForOverview.byDistrict} values={Object.fromEntries(policeCctvSummary.byDistrict.map((item) => [item.district, item.recordCount]))} />
        <BarChart title={policeCctvLabelsForOverview.byPoliceUnit} values={Object.fromEntries(policeCctvSummary.byPoliceUnit.slice(0, 30).map((item) => [item.policeUnit, item.count]))} />
        <BarChart title={policeCctvLabelsForOverview.keywordSummary} values={Object.fromEntries(policeCctvSummary.byCameraDirectionKeyword.map((item) => [item.keyword, item.count]))} />
        <BarChart title={fireDonationLabelsForOverview.byYear} values={Object.fromEntries(fireDonationSummary.byYear.map((item) => [String(item.year), item.recordCount]))} />
        <BarChart title={fireDonationLabelsForOverview.itemCategoryDistribution} values={Object.fromEntries(fireDonationSummary.byDonatedItemCategory.map((item) => [formatFireDonationItemCategory(item.donatedItemCategory, language), item.count]))} />
        <BarChart title={fireDonationLabelsForOverview.purposeCategoryDistribution} values={Object.fromEntries(fireDonationSummary.byDonationPurposeCategory.map((item) => [formatFireDonationPurposeCategory(item.donationPurposeCategory, language), item.count]))} />
        <BarChart title={t.aedLocationsByDistrict} values={aedByDistrict} />
        <BarChart title={t.fireHydrantsByCity} values={hydrantsByCity} />
        <BarChart title={t.fireHydrantsByDistrict} values={hydrantsByDistrict} />
        <BarChart title={t.fireHydrantsByHydrantType} values={hydrantsByType} />
        <BarChart title={t.fireHydrantsByAreaScope} values={hydrantsByScope} />
        <BarChart title={t.topVillagesByHydrantCount} values={topHydrantVillage} />
        <BarChart title={t.fireHydrantCoordinateStatus} values={hydrantCoordinateStatus} />
        <BarChart title={t.emergencySheltersByDistrict} values={emergencySheltersByDistrict} />
        <BarChart title={t.listedCapacityByDistrict} values={emergencyCapacityByDistrict} />
        <BarChart title={t.emergencySheltersByType} values={emergencySheltersByType} />
        <BarChart title={t.listedCapacityByShelterType} values={emergencyCapacityByType} />
        <BarChart title={t.accessibleSheltersByDistrict} values={accessibleSheltersByDistrict} />
        <BarChart title={t.indoorOutdoorShelters} values={indoorOutdoorShelters} />
        <BarChart title={t.reliefStationsByDistrict} values={reliefStationsByDistrict} />
        <BarChart title={t.disasterApplicabilityDistribution} values={disasterApplicability} />
        <BarChart title={t.cctvFacilitiesByCity} values={cctvByCity} />
        <BarChart title={t.cctvCoordinateStatus} values={cctvCoordinateStatus} />
        <BarChart title={t.hospitalsByDistrict} values={hospitalsByDistrict} />
        <BarChart title={t.clinicsByDistrict} values={clinicsByDistrict} />
        <BarChart title={t.medicalFacilitiesByDistrict} values={medicalFacilitiesByDistrict} />
        <BarChart title={t.medicalFacilitiesByType} values={medicalFacilitiesByType} />
        <BarChart title={t.medicalFacilityCoordinateAvailability} values={medicalCoordinateAvailability} />
        <BarChart title={t.evacuationGatesByRiversidePark} values={gatesByRiversidePark} />
        <BarChart title={t.riversideParkAvailability} values={riversideParkAvailability} />
        <BarChart title={t.locationDescriptionAvailability} values={locationDescriptionAvailability} />
        <BarChart title={t.dengueSurveyRecordsByDistrict} values={dengueByDistrict} />
        <BarChart title={disasterLabelsForOverview.recordsByYear} values={Object.fromEntries(disasterSummary.byYear.map((item) => [String(item.year), item.recordCount]))} />
        <BarChart title={disasterLabelsForOverview.recordsByDisasterType} values={Object.fromEntries(disasterSummary.byDisasterType.map((item) => [formatNaturalDisasterType(item.disasterType, language), item.count]))} />
        <BarChart title={disasterLabelsForOverview.recordsByDecisionCategory} values={Object.fromEntries(disasterSummary.byDecisionCategory.map((item) => [formatDecisionCategory(item.decisionCategory, language), item.count]))} />
        <ComparisonChart title={t.shelterCapacityVsBurglaryRecords} summaries={data.districtSummaries} notice={t.noCausationNotice} />
      </section>
    </main>
  );
}

function DataNotes({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const t = translations[language];
  return (
    <main className="notes">
      <h2>{t.dataNotes}</h2>
      <p>{t.dataDisclaimer}</p>
      <p>{t.burglaryPrivacyNotice}</p>
      <p>{bicycleLabels[language].dataNote}</p>
      <p>{motorcycleLabels[language].dataNote}</p>
      <p>{policeCctvLabels[language].dataNote}</p>
      <p>{policeCctvLabels[language].interpretationNote}</p>
      <p>{fireDonationLabels[language].dataNote}</p>
      <p>{fireDonationLabels[language].interpretationNote}</p>
      <p>{t.shelterAvailabilityNotice}</p>
      <p>{t.evacuationGateDataNote}</p>
      <p>{t.medicalFacilityDataNote}</p>
      <p>{t.fireHydrantDataNote}</p>
      <p>{t.emergencyShelterDataNote}</p>
      <p>{t.emergencyShelterUseNote}</p>
      <p>{t.cctvDataNote}</p>
      <p>{t.cctvLiveImageApplicationNote}</p>
      <p>{disasterLabels[language].disclaimer}</p>
      <dl>
        {data.conversionReport.sources.map((source) => (
          <div key={source.name}>
            <dt>{source.name}</dt>
            <dd>
              <a href={source.url}>{source.url}</a>
              <span>{source.notes}</span>
            </dd>
          </div>
        ))}
      </dl>
    </main>
  );
}

function ShelterPopup({ shelter, language }: { shelter: AirRaidShelter; language: Language }) {
  const t = translations[language];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${shelter.latitude},${shelter.longitude}`;
  return (
    <div className="popup-stack">
      <strong>{t.airRaidShelters}</strong>
      <span>{t.district}: {shelter.district}</span>
      <span>{t.policePrecinct}: {shelter.policePrecinct ?? '-'}</span>
      <span>{t.name}: {shelter.name ?? '-'}</span>
      <span>{t.placeName}: {shelter.placeName ?? '-'}</span>
      <span>{t.address}: {shelter.address}</span>
      <span>{t.village}: {shelter.village ?? '-'}</span>
      <span>{t.basementInfo}: {shelter.basementInfo ?? '-'}</span>
      <span>{t.capacity}: {shelter.capacity?.toLocaleString() ?? '-'}</span>
      <a href={mapsUrl} target="_blank" rel="noreferrer">
        {t.openGoogleMaps}
      </a>
    </div>
  );
}

function AedPopup({ aed, language }: { aed: AedLocation; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.aedLocation}</strong>
      <span>{aed.placeName}</span>
      <span>{t.address}: {aed.address}</span>
      {aed.district && <span>{t.district}: {aed.district}</span>}
      {aed.placeCategory && <span>{t.placeCategory}: {aed.placeCategory}</span>}
      {aed.placeType && <span>{t.placeType}: {aed.placeType}</span>}
      {aed.aedPlacementLocation && <span>{t.aedPlacementLocation}: {aed.aedPlacementLocation}</span>}
      {aed.aedLocationDescription && <span>{t.aedLocationDescription}: {aed.aedLocationDescription}</span>}
      <span className="notice">{t.aedEmergencyNotice}</span>
      {aed.latitude !== undefined && aed.longitude !== undefined && (
        <a href={googleMapsUrl(aed.latitude, aed.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function EvacuationGatePopup({ gate, language }: { gate: EvacuationGate; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.evacuationGate}</strong>
      <span>{t.riversidePark}: {gate.riversidePark ?? t.notSpecified}</span>
      <span>{t.gateName}: {gate.gateName}</span>
      {gate.description && <span>{t.locationDescription}: {gate.description}</span>}
      <span className="notice">{t.evacuationGateNotice}</span>
      {gate.latitude !== undefined && gate.longitude !== undefined && (
        <a href={googleMapsUrl(gate.latitude, gate.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function MedicalFacilityPopup({ facility, language }: { facility: MedicalFacility; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.medicalFacility}</strong>
      <span>{t.medicalFacilityType}: {facility.facilityType === 'hospital' ? t.hospital : t.clinic}</span>
      <span>{t.institutionName}: {facility.facilityName}</span>
      {facility.district && <span>{t.district}: {facility.district}</span>}
      <span>{t.address}: {facility.address}</span>
      {facility.medicalCategory && <span>{t.classification}: {facility.medicalCategory}</span>}
      <span className="notice">{t.medicalFacilityNotice}</span>
      {facility.latitude !== undefined && facility.longitude !== undefined && (
        <a href={googleMapsUrl(facility.latitude, facility.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function FireHydrantPopup({ hydrant, language }: { hydrant: FireHydrant; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.fireHydrant}</strong>
      {hydrant.wpid && <span>{t.wpid}: {hydrant.wpid}</span>}
      {hydrant.mapSheetNumber && <span>{t.mapSheetNumber}: {hydrant.mapSheetNumber}</span>}
      {hydrant.hydrantNumber && <span>{t.hydrantNumber}: {hydrant.hydrantNumber}</span>}
      <span>{t.hydrantType}: {hydrant.hydrantType === 'underground' ? t.undergroundHydrant : t.aboveGroundHydrant}</span>
      {hydrant.city && <span>{t.city}: {hydrant.city}</span>}
      {hydrant.district && <span>{t.district}: {hydrant.district}</span>}
      {hydrant.village && <span>{t.village}: {hydrant.village}</span>}
      {hydrant.areaRaw && <span>{t.areaRaw}: {hydrant.areaRaw}</span>}
      {hydrant.longitude !== undefined && <span>{t.wgs84Longitude}: {hydrant.longitude}</span>}
      {hydrant.latitude !== undefined && <span>{t.wgs84Latitude}: {hydrant.latitude}</span>}
      {hydrant.xTwd97 !== undefined && <span>{t.xTwd97}: {hydrant.xTwd97}</span>}
      {hydrant.yTwd97 !== undefined && <span>{t.yTwd97}: {hydrant.yTwd97}</span>}
      <span className="notice">{t.fireHydrantNotice}</span>
      {hydrant.latitude !== undefined && hydrant.longitude !== undefined && (
        <a href={googleMapsUrl(hydrant.latitude, hydrant.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function TrafficCctvPopup({ facility, language }: { facility: TrafficCctvFacility; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.cctvFacility}</strong>
      <span>{t.sourceSequenceNumber}: {facility.sourceSequenceNumber ?? '-'}</span>
      <span>{t.city}: {facility.city ?? '-'}</span>
      <span>{t.cameraLocationCode}: {facility.cameraLocationCodeRaw ?? '-'}</span>
      {facility.longitude !== undefined && <span>{t.wgs84Longitude}: {facility.longitude}</span>}
      {facility.latitude !== undefined && <span>{t.wgs84Latitude}: {facility.latitude}</span>}
      <span className="notice">{t.cctvPopupNotice}</span>
      {facility.latitude !== undefined && facility.longitude !== undefined && (
        <a href={googleMapsUrl(facility.latitude, facility.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function DenguePopup({ summary, language }: { summary: DengueDistrictSummary; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.dengueVectorDensity}</strong>
      <span>{t.district}: {summary.district}</span>
      <span>{t.recordCount}: {summary.recordCount}</span>
      <span>{t.surveyedHouseholds}: {summary.surveyedHouseholds}</span>
      <span>{t.positiveHouseholds}: {summary.positiveHouseholds}</span>
      <span>{t.positiveContainersTotal}: {summary.positiveContainersTotal}</span>
      <span>{t.averageBreteauIndex}: {formatOptional(summary.averageBreteauIndex)}</span>
      <span>{t.averageContainerIndex}: {formatOptional(summary.averageContainerIndex)}</span>
      <small>{t.dengueMapNotice}</small>
    </div>
  );
}

function DistrictPopup({
  summary,
  count,
  records,
  language,
}: {
  summary: DistrictSafetySummary;
  count: number;
  records: ResidentialBurglaryRecord[];
  language: Language;
}) {
  const t = translations[language];
  const districtRecords = records.filter((record) => record.district === summary.district);
  const common = mostCommonEntry(countBy(districtRecords, (record) => timePeriodLabels[language][record.timePeriod]));
  const years = districtRecords.flatMap((record) => (record.year ? [record.year] : []));
  return (
    <div className="popup-stack">
      <strong>{summary.district}</strong>
      <span>{t.recordCount}: {count}</span>
      <span>{t.mostCommonBurglaryTimePeriod}: {common?.[0] ?? '-'}</span>
      <span>
        {t.occurredDate}: {years.length ? `${Math.min(...years)}-${Math.max(...years)}` : '-'}
      </span>
      <span>{t.airRaidShelters}: {summary.shelterCount}</span>
      <span>{t.capacity}: {summary.shelterCapacity.toLocaleString()}</span>
    </div>
  );
}

function FlyTo({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 15);
  }, [map, position]);
  return null;
}

function ViewportTracker({ onChange }: { onChange: (viewport: MapViewport) => void }) {
  const map = useMapEvents({
    moveend: () => onChange({ bounds: map.getBounds(), zoom: map.getZoom() }),
    zoomend: () => onChange({ bounds: map.getBounds(), zoom: map.getZoom() }),
  });

  useEffect(() => {
    onChange({ bounds: map.getBounds(), zoom: map.getZoom() });
  }, [map, onChange]);

  return null;
}

function MapSizeSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const syncSize = () => map.invalidateSize({ animate: false, pan: false });
    const frame = requestAnimationFrame(syncSize);
    const observer = new ResizeObserver(syncSize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function BarChart({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).filter(([, value]) => value > 0);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <article className="chart">
      <h2>{title}</h2>
      {entries.map(([label, value]) => (
        <div className="bar-row" key={label}>
          <span>{label}</span>
          <div>
            <i style={{ width: `${(value / max) * 100}%` }} />
          </div>
          <b>{value.toLocaleString()}</b>
        </div>
      ))}
    </article>
  );
}

function ComparisonChart({
  title,
  summaries,
  notice,
}: {
  title: string;
  summaries: DistrictSafetySummary[];
  notice: string;
}) {
  const maxCapacity = Math.max(1, ...summaries.map((summary) => summary.shelterCapacity));
  const maxRecords = Math.max(1, ...summaries.map((summary) => summary.burglaryRecordCount));
  return (
    <article className="chart">
      <h2>{title}</h2>
      <p className="notice">{notice}</p>
      {summaries
        .filter((summary) => summary.shelterCapacity || summary.burglaryRecordCount)
        .map((summary) => (
          <div className="comparison-row" key={summary.district}>
            <span>{summary.district}</span>
            <div>
              <i className="capacity-bar" style={{ width: `${(summary.shelterCapacity / maxCapacity) * 100}%` }} />
              <i className="record-bar" style={{ width: `${(summary.burglaryRecordCount / maxRecords) * 100}%` }} />
            </div>
          </div>
        ))}
    </article>
  );
}

function RankingTable({ counts, label, valueLabel }: { counts: Record<string, number>; label: string; valueLabel: string }) {
  return (
    <table>
      <thead>
        <tr>
          <th>{label}</th>
          <th>{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{count}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

function hasValidCoordinate(
  shelter: AirRaidShelter,
): shelter is AirRaidShelter & { latitude: number; longitude: number } {
  return shelter.coordinateStatus === 'valid' && typeof shelter.latitude === 'number' && typeof shelter.longitude === 'number';
}

function hasValidPoint<T extends { coordinateStatus: string; latitude?: number; longitude?: number }>(
  item: T,
): item is T & { latitude: number; longitude: number } {
  return item.coordinateStatus === 'valid' && typeof item.latitude === 'number' && typeof item.longitude === 'number';
}

function isInViewport(shelter: { latitude: number; longitude: number }, bounds: L.LatLngBounds | null): boolean {
  return !bounds || bounds.pad(0.2).contains([shelter.latitude, shelter.longitude]);
}

function matchesCapacityRange(capacity: number, range: CapacityRange): boolean {
  if (range === 'all') return true;
  if (range === 'under100') return capacity < 100;
  if (range === '100-499') return capacity >= 100 && capacity <= 499;
  if (range === '500-999') return capacity >= 500 && capacity <= 999;
  return capacity >= 1000;
}

function googleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function googleMapsAddressUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function formatAverage(values: number[]): string {
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : '-';
}

function formatOptional(value: number | undefined): string {
  return value === undefined ? '-' : value.toFixed(2);
}

function formatAreaScope(scope: FireHydrantAreaScope, language: Language): string {
  const t = translations[language];
  if (scope === 'taipei_city') return t.taipeiCityScope;
  if (scope === 'new_taipei_official_scope') return t.newTaipeiOfficialScope;
  if (scope === 'new_taipei_other') return t.newTaipeiOtherScope;
  return t.unknownScope;
}

function formatEmergencyShelterType(type: EmergencyShelterType, language: Language): string {
  const t = translations[language];
  const labels: Record<EmergencyShelterType, string> = {
    school: t.schoolShelter,
    library: t.libraryShelter,
    park_green_space: t.parkGreenSpaceShelter,
    activity_center: t.activityCenterShelter,
    market_parking_lot: t.marketParkingLotShelter,
    metro_station: t.metroStationShelter,
    sports_facility: t.sportsFacilityShelter,
    arts_center: t.artsCenterShelter,
    military_camp: t.militaryCampShelter,
    other: t.other,
    unknown: t.unknown,
  };
  return labels[type];
}

function formatDisasterStatus(status: DisasterApplicabilityStatus, language: Language): string {
  const t = translations[language];
  const labels: Record<DisasterApplicabilityStatus, string> = {
    yes: t.applicableYes,
    no: t.applicableNo,
    backup: t.backup,
    old_settlement: t.oldSettlement,
    unknown: t.unknown,
  };
  return labels[status];
}

function formatCoordinateStatus(status: CoordinateStatus, language: Language): string {
  const t = translations[language];
  const labels: Record<CoordinateStatus, string> = {
    valid: t.hasValidCoordinates,
    missing: t.missingCoordinates,
    unparsed: t.unparsedCoordinates,
    outlier: t.outlierCoordinates,
  };
  return labels[status];
}

function formatNaturalDisasterType(type: NaturalDisasterType, language: Language): string {
  const labels: Record<Language, Record<NaturalDisasterType, string>> = {
    zh: {
      typhoon: '颱風',
      heavy_rain: '豪雨',
      earthquake: '地震',
      tsunami_warning: '海嘯警報',
      cold_wave: '寒流或低溫',
      other: '其他',
      unknown: '未知',
    },
    en: {
      typhoon: 'Typhoon',
      heavy_rain: 'Heavy rain',
      earthquake: 'Earthquake',
      tsunami_warning: 'Tsunami warning',
      cold_wave: 'Cold wave / low temperature',
      other: 'Other',
      unknown: 'Unknown',
    },
  };
  return labels[language][type];
}

function formatDecisionCategory(category: WorkSchoolSuspensionDecisionCategory, language: Language): string {
  const labels: Record<Language, Record<WorkSchoolSuspensionDecisionCategory, string>> = {
    zh: {
      citywide_full_suspension: '全市停止上班上課',
      citywide_partial_day_suspension: '全市部分時段停止上班上課',
      standard_met: '達停班停課標準',
      standard_not_met: '未達停班停課標準',
      normal_work_school: '照常上班上課',
      normal_with_local_exceptions: '照常上班上課但有局部例外',
      school_only_suspension: '僅停課或學校例外',
      local_or_area_suspension: '局部地區停止',
      mixed_or_unclear: '混合或不明確',
      unknown: '未知',
    },
    en: {
      citywide_full_suspension: 'Citywide full suspension',
      citywide_partial_day_suspension: 'Citywide partial-day suspension',
      standard_met: 'Standard met',
      standard_not_met: 'Standard not met',
      normal_work_school: 'Normal work/school',
      normal_with_local_exceptions: 'Normal with local exceptions',
      school_only_suspension: 'School-only or school exception',
      local_or_area_suspension: 'Local or area suspension',
      mixed_or_unclear: 'Mixed or unclear',
      unknown: 'Unknown',
    },
  };
  return labels[language][category];
}

function formatSuspensionStatus(status: WorkOrSchoolSuspensionStatus, language: Language): string {
  const labels: Record<Language, Record<WorkOrSchoolSuspensionStatus, string>> = {
    zh: {
      suspended: '停止',
      normal: '照常',
      partial_day_suspended: '部分時段停止',
      local_exception: '局部例外',
      school_only: '僅學校',
      standard_met: '達標準',
      standard_not_met: '未達標準',
      mixed_or_unclear: '混合或不明確',
      unknown: '未知',
    },
    en: {
      suspended: 'Suspended',
      normal: 'Normal',
      partial_day_suspended: 'Partial-day suspended',
      local_exception: 'Local exception',
      school_only: 'School-only',
      standard_met: 'Standard met',
      standard_not_met: 'Standard not met',
      mixed_or_unclear: 'Mixed or unclear',
      unknown: 'Unknown',
    },
  };
  return labels[language][status];
}

function formatTimeOfDay(category: IncidentTimeOfDayCategory, language: Language): string {
  const labels: Record<Language, Record<IncidentTimeOfDayCategory, string>> = {
    zh: {
      late_night: '深夜',
      early_morning: '清晨',
      morning: '上午',
      midday: '中午',
      afternoon: '下午',
      evening: '傍晚',
      night: '夜間',
      cross_midnight: '跨日',
      unknown: '未知',
    },
    en: {
      late_night: 'Late night',
      early_morning: 'Early morning',
      morning: 'Morning',
      midday: 'Midday',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night',
      cross_midnight: 'Cross-midnight',
      unknown: 'Unknown',
    },
  };
  return labels[language][category];
}

function formatFireDonationItemCategory(category: string, language: Language): string {
  const labels = {
    medical_or_rescue_equipment: ['救護或醫療設備', 'Medical or rescue equipment'],
    protective_equipment: ['防護裝備', 'Protective equipment'],
    vehicle_or_transport: ['車輛或運輸', 'Vehicle or transport'],
    electronics_or_communication: ['電子或通訊設備', 'Electronics or communication'],
    food_or_daily_supplies: ['食品或日用品', 'Food or daily supplies'],
    training_or_education_materials: ['訓練或教育物資', 'Training or education materials'],
    cash_equivalent_or_voucher: ['禮券或兌換券', 'Voucher or cash-equivalent'],
    other_goods: ['其他實物', 'Other goods'],
    unknown: ['未知', 'Unknown'],
  } as Record<string, [string, string]>;
  return labels[category]?.[language === 'zh' ? 0 : 1] ?? category;
}

function formatFireDonationPurposeCategory(category: string, language: Language): string {
  const labels = {
    firefighting: ['消防救災', 'Firefighting'],
    emergency_medical_service: ['緊急救護', 'Emergency medical service'],
    disaster_prevention: ['防災', 'Disaster prevention'],
    public_education: ['宣導教育', 'Public education'],
    staff_support: ['員工或同仁支持', 'Staff support'],
    general_fire_department_use: ['消防局一般用途', 'General Fire Department use'],
    other: ['其他', 'Other'],
    unknown: ['未知', 'Unknown'],
  } as Record<string, [string, string]>;
  return labels[category]?.[language === 'zh' ? 0 : 1] ?? category;
}

function formatLocationFuzziness(level: BicycleTheftLocationFuzzinessLevel, language: Language): string {
  const labels: Record<Language, Record<BicycleTheftLocationFuzzinessLevel, string>> = {
    zh: {
      address_range: '地址範圍',
      road_or_area_text: '道路或地區文字',
      facility_or_landmark_text: '設施或地標文字',
      district_only: '僅行政區',
      unknown: '未知',
    },
    en: {
      address_range: 'Address range',
      road_or_area_text: 'Road or area text',
      facility_or_landmark_text: 'Facility or landmark text',
      district_only: 'District only',
      unknown: 'Unknown',
    },
  };
  return labels[language][level];
}

const localizedUiText: Record<
  Language,
  {
    currentLocation: string;
    geolocationDenied: string;
    geolocationUnsupported: string;
    month: string;
  }
> = {
  zh: {
    currentLocation: '目前位置',
    geolocationDenied: '無法取得您的位置，請確認定位權限。',
    geolocationUnsupported: '此瀏覽器不支援定位。',
    month: '月份',
  },
  en: {
    currentLocation: 'Current location',
    geolocationDenied: 'Unable to get your location. Please check location permission.',
    geolocationUnsupported: 'Geolocation is not supported.',
    month: 'Month',
  },
};

export default App;
