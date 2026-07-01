import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  buildDistrictSafetySummary,
  buildDengueDistrictSummaries,
  extractDistrictFromLocation,
  normalizeBurglaryTimePeriod,
  normalizeColumnName,
  normalizeShelterCoordinate,
  parseDengueSurveyDate,
  parseNumber,
  parseBurglaryDate,
  parseCapacity,
} from '../src/lib/safetyData.ts';
import type {
  AedLocation,
  AirRaidShelter,
  BicycleTheftCaseType,
  BicycleTheftLocationFuzzinessLevel,
  BicycleTheftRecord,
  CoordinateStatus,
  DengueSurveyRecord,
  DisasterApplicabilityStatus,
  EmergencyShelter,
  EmergencyShelterType,
  EvacuationGate,
  FireDepartmentDonationInKindRecord,
  FireDepartmentDonationItemCategory,
  FireDepartmentDonationPurposeCategory,
  FireHydrant,
  FireHydrantAreaScope,
  FireHydrantType,
  IncidentTimeOfDayCategory,
  MedicalFacility,
  MedicalFacilityType,
  MotorcycleTheftCaseType,
  MotorcycleTheftRecord,
  NaturalDisasterType,
  NaturalDisasterWorkSchoolSuspensionRecord,
  PoliceCctvInstallationLocationRecord,
  ResidentialBurglaryRecord,
  SuspensionMessageKeywordTag,
  TrafficCctvFacility,
  WorkOrSchoolSuspensionStatus,
  WorkSchoolSuspensionDecisionCategory,
} from '../src/types.ts';
import { TAIPEI_BOUNDS, TAIPEI_DISTRICTS, TAIPEI_DISTRICT_CODE_MAP } from '../src/lib/safetyData.ts';

export const RAW_DIR = 'data/raw/safety';
export const PUBLIC_DATA_DIR = 'public/data';
export const SHELTER_SOURCE = '北市警政APP_防空避難設備位置';
export const BURGLARY_SOURCE = '臺北市住宅竊盜點位資訊';
export const BICYCLE_THEFT_SOURCE = '臺北市自行車竊盜點位資訊';
export const BICYCLE_THEFT_AGENCY = '臺北市政府警察局刑事警察大隊';
export const MOTORCYCLE_THEFT_SOURCE = '臺北市機車竊盜點位資訊';
export const MOTORCYCLE_THEFT_AGENCY = '臺北市政府警察局刑警大隊';
export const AED_SOURCE = '臺北市AED自動體外心臟去顫器設置地點';
export const DENGUE_SOURCE = '臺北市登革熱病媒蚊密度調查結果';
export const EVACUATION_GATE_SOURCE = '臺北市疏散門資訊';
export const MEDICAL_HOSPITAL_SOURCE = '臺北市公私立醫療院所－臺北市醫院清冊';
export const MEDICAL_CLINIC_SOURCE = '臺北市公私立醫療院所－臺北市診所清冊';
export const FIRE_HYDRANT_SOURCE = '大臺北地區消防栓分布點位圖';
export const FIRE_HYDRANT_AGENCY = '臺北自來水事業處';
export const FIRE_DONATION_SOURCE = '臺北市政府消防局各年度接受各界捐贈實物明細表';
export const FIRE_DONATION_AGENCY = '臺北市政府消防局';
export const EMERGENCY_SHELTER_SOURCE = '臺北市可供避難收容處所一覽表';
export const EMERGENCY_SHELTER_AGENCY = '臺北市政府教育局';
export const TRAFFIC_CCTV_SOURCE = '臺北市CCTV設施';
export const TRAFFIC_CCTV_AGENCY = '臺北市政府交通局交通管制工程處';
export const POLICE_CCTV_SOURCE = '臺北市政府警察局錄影監視系統設置區位';
export const POLICE_CCTV_AGENCY = '臺北市政府警察局';
export const NATURAL_DISASTER_SUSPENSION_SOURCE = '臺北市歷次天然災害停止上班上課訊息';
export const NATURAL_DISASTER_SUSPENSION_AGENCY = '臺北市政府人事處';
export const FIRE_HYDRANT_BOUNDS = {
  minLng: 121.3,
  maxLng: 121.75,
  minLat: 24.85,
  maxLat: 25.25,
};
const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
const big5Decoder = new TextDecoder('big5', { fatal: false });

export const sources = {
  shelters: {
    name: SHELTER_SOURCE,
    pageUrl: 'https://data.taipei/dataset/detail?id=83eecdf1-3bbb-40f9-9484-b55b700c37ef',
    downloadUrl:
      'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=39ca53a1-c861-40bc-b329-fc9b28c10e01',
    rawPath: `${RAW_DIR}/air-raid-shelters.csv`,
  },
  burglaries: {
    name: BURGLARY_SOURCE,
    pageUrl: 'https://data.taipei/dataset/detail?id=68785231-d6c5-47a1-b001-77eec70bec02',
    downloadUrl:
      'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=93d9bc2d-af08-4db7-a56b-9f0a49226fa3',
    rawPath: `${RAW_DIR}/residential-burglaries.csv`,
  },
};

export async function readCsv(path: string): Promise<Record<string, string>[]> {
  const csv = decodeCsvBuffer(await readFile(path));
  const rows = parseCsv(csv);
  const [headers = [], ...records] = rows;
  const normalizedHeaders = headers.map(normalizeColumnName);
  return records
    .filter((record) => record.some((value) => value.trim()))
    .map((record) =>
      normalizedHeaders.reduce<Record<string, string>>((row, header, index) => {
        row[header] = record[index]?.trim() ?? '';
        return row;
      }, {}),
    );
}

export function decodeCsvBuffer(buffer: Uint8Array): string {
  const utf8Text = utf8Decoder.decode(buffer).replace(/^\uFEFF/, '');
  if (!utf8Text.includes('\uFFFD')) return utf8Text;
  return big5Decoder.decode(buffer).replace(/^\uFEFF/, '');
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function downloadCsv(url: string | undefined, path: string, force: boolean): Promise<void> {
  if (!url) {
    if (await stat(path).catch(() => null)) return;
    throw new Error(`CSV URL required because ${path} does not exist.`);
  }
  if (!force && (await stat(path).catch(() => null))) return;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CSV download failed: ${response.status} ${response.statusText}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, new Uint8Array(await response.arrayBuffer()));
}

export function convertShelterRow(row: Record<string, string>, index: number): AirRaidShelter {
  const originalX = Number(row['座標x'] ?? row['座標X']);
  const originalY = Number(row['座標y'] ?? row['座標Y']);
  const coordinate = normalizeShelterCoordinate(originalX, originalY);
  return {
    id: `shelter-${row['項次'] || index + 1}`,
    itemNo: row['項次'],
    district: row['行政區'] || '未分類',
    policePrecinct: row['分局'],
    name: row['名稱'],
    village: row['里別'],
    address: row['地址'] || '',
    basementInfo: row['地下層數位址'],
    capacity: parseCapacity(row['容納人數']),
    originalX: Number.isFinite(originalX) ? originalX : undefined,
    originalY: Number.isFinite(originalY) ? originalY : undefined,
    longitude: coordinate.longitude,
    latitude: coordinate.latitude,
    coordinateStatus: coordinate.coordinateStatus,
    coordinateSystem: coordinate.coordinateSystem,
    placeName: row['場所名稱'],
    source: SHELTER_SOURCE,
  };
}

export function convertBurglaryRow(row: Record<string, string>, index: number): ResidentialBurglaryRecord {
  const parsedDate = parseBurglaryDate(row['發生日期'] ?? '');
  const locationText = row['發生地點'] ?? '';
  return {
    id: `burglary-${row['編號'] || index + 1}`,
    sourceId: row['編號'],
    caseType: row['案類'] || '住宅竊盜',
    occurredDateRaw: row['發生日期'] ?? '',
    ...parsedDate,
    timePeriodRaw: row['發生時段'],
    timePeriod: normalizeBurglaryTimePeriod(row['發生時段'] ?? ''),
    locationText,
    district: extractDistrictFromLocation(locationText),
    source: BURGLARY_SOURCE,
  };
}

export function classifyBicycleTheftCaseType(raw: string | undefined): BicycleTheftCaseType {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  return text.includes('自行車竊盜') ? 'bicycle_theft' : 'other';
}

export function classifyMotorcycleTheftCaseType(raw: string | undefined): MotorcycleTheftCaseType {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  return text.includes('機車竊盜') ? 'motorcycle_theft' : 'other';
}

export function classifyIncidentTimeOfDayCategory(
  startHour: number | undefined,
  endHour: number | undefined,
  crossesMidnight: boolean,
): IncidentTimeOfDayCategory {
  if (startHour === undefined || endHour === undefined) return 'unknown';
  if (crossesMidnight) return 'cross_midnight';
  if (startHour >= 0 && startHour < 5) return 'late_night';
  if (startHour >= 5 && startHour < 8) return 'early_morning';
  if (startHour >= 8 && startHour < 12) return 'morning';
  if (startHour >= 12 && startHour < 14) return 'midday';
  if (startHour >= 14 && startHour < 18) return 'afternoon';
  if (startHour >= 18 && startHour < 21) return 'evening';
  if (startHour >= 21 && startHour <= 23) return 'night';
  return 'unknown';
}

export function parseRocCompactDate(raw: unknown) {
  const incidentDateRaw = emptyToUndefined(String(raw ?? ''));
  const match = incidentDateRaw?.match(/^(\d{3})(\d{2})(\d{2})$/);
  if (!match) return { incidentDateRaw, warning: incidentDateRaw ? `Unparsed date: ${incidentDateRaw}` : undefined };
  const rocYear = parseIntegerValue(match[1]);
  const month = parseIntegerValue(match[2]);
  const day = parseIntegerValue(match[3]);
  const year = rocYear === undefined ? undefined : rocYear + 1911;
  if (year === undefined || month === undefined || day === undefined || !isValidGregorianDate(year, month, day)) {
    return { incidentDateRaw, rocYear, year, month, day, warning: `Invalid date: ${incidentDateRaw}` };
  }
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    incidentDateRaw,
    rocYear,
    year,
    month,
    day,
    date,
    monthKey: `${year}-${String(month).padStart(2, '0')}`,
    quarter: `${year}-Q${Math.ceil(month / 3)}`,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

export function parseIncidentTimeBand(raw: unknown) {
  const incidentTimeBandRaw = emptyToUndefined(String(raw ?? ''));
  const match = incidentTimeBandRaw?.match(/^(\d{1,2})\s*(?:~|-|－|–)\s*(\d{1,2})$/);
  if (!match) {
    return {
      incidentTimeBandRaw,
      crossesMidnight: false,
      timeOfDayCategory: 'unknown' as const,
      warning: incidentTimeBandRaw ? `Unparsed time band: ${incidentTimeBandRaw}` : undefined,
    };
  }
  const timeBandStartHour = Number(match[1]);
  const timeBandEndHour = Number(match[2]);
  const valid = timeBandStartHour >= 0 && timeBandStartHour <= 23 && timeBandEndHour >= 0 && timeBandEndHour <= 24;
  const crossesMidnight = valid && (timeBandEndHour < timeBandStartHour || (timeBandEndHour === 0 && timeBandStartHour > 0));
  return {
    incidentTimeBandRaw,
    incidentTimeBand: `${String(timeBandStartHour).padStart(2, '0')}~${String(timeBandEndHour).padStart(2, '0')}`,
    timeBandStartHour: valid ? timeBandStartHour : undefined,
    timeBandEndHour: valid ? timeBandEndHour : undefined,
    crossesMidnight,
    timeOfDayCategory: classifyIncidentTimeOfDayCategory(
      valid ? timeBandStartHour : undefined,
      valid ? timeBandEndHour : undefined,
      crossesMidnight,
    ),
    warning: valid ? undefined : `Invalid time band: ${incidentTimeBandRaw}`,
  };
}

export function parseBicycleTheftLocation(raw: unknown): {
  incidentLocationRaw?: string;
  locationTextNormalized?: string;
  district?: string;
  village?: string;
  roadName?: string;
  locationFuzzinessLevel: BicycleTheftLocationFuzzinessLevel;
  hasAddressRange: boolean;
  addressRangeText?: string;
  locationBucketKey?: string;
  warning?: string;
} {
  const incidentLocationRaw = emptyToUndefined(String(raw ?? ''));
  const locationTextNormalized = incidentLocationRaw?.replace(/\s+/g, '').replaceAll('台北市', '臺北市');
  const district = locationTextNormalized ? extractDistrictFromLocation(locationTextNormalized) : undefined;
  const afterDistrict = district && locationTextNormalized ? locationTextNormalized.split(district)[1] : locationTextNormalized;
  const village = afterDistrict?.match(/^([\u4e00-\u9fff]{2,4}里)/)?.[1];
  const afterVillage = village && afterDistrict ? afterDistrict.slice(village.length) : afterDistrict;
  const roadName = afterVillage?.match(/^([\u4e00-\u9fff]{1,8}(?:路|街|大道|巷)(?:\d段)?)/)?.[1];
  const addressRangeText = locationTextNormalized?.match(/\d+\s*(?:~|-|－|–)\s*\d+號(?:外)?/)?.[0];
  const hasAddressRange = Boolean(addressRangeText);
  const isLandmark = /學校|公園|市場|捷運|車站|大學|高中|國中|國小/.test(locationTextNormalized ?? '');
  const locationFuzzinessLevel: BicycleTheftLocationFuzzinessLevel = hasAddressRange
    ? 'address_range'
    : roadName
      ? 'road_or_area_text'
      : isLandmark
        ? 'facility_or_landmark_text'
        : district
          ? 'district_only'
          : 'unknown';
  const locationBucketKey = [district, roadName, addressRangeText ?? (!roadName ? locationTextNormalized : undefined)]
    .filter(Boolean)
    .join('|') || undefined;

  return {
    incidentLocationRaw,
    locationTextNormalized,
    district,
    village,
    roadName,
    locationFuzzinessLevel,
    hasAddressRange,
    addressRangeText,
    locationBucketKey,
    warning: district ? undefined : `District not parsed: ${incidentLocationRaw ?? ''}`,
  };
}

export function convertBicycleTheftRow(row: Record<string, string>, index: number): BicycleTheftRecord {
  const date = parseRocCompactDate(row['發生日期']);
  const time = parseIncidentTimeBand(row['發生時段']);
  const location = parseBicycleTheftLocation(row['發生地點']);
  const sourceRecordNumber = parseIntegerValue(row['編號']);
  const caseTypeRaw = emptyToUndefined(row['案類']);
  return {
    id: `bicycle-theft-${sourceRecordNumber ?? index + 1}`,
    module: 'bicycle_theft_records',
    sourceRecordNumber,
    caseTypeRaw,
    caseType: classifyBicycleTheftCaseType(caseTypeRaw),
    ...date,
    ...time,
    ...location,
    eventGroupKey: [date.date, time.incidentTimeBand, location.locationBucketKey].filter(Boolean).join('|') || undefined,
    locationPrecision: location.roadName ? 'road_or_segment_level' : location.district ? 'district_centroid' : 'fuzzy_address_text',
    source: BICYCLE_THEFT_SOURCE,
    sourceAgency: BICYCLE_THEFT_AGENCY,
  };
}

export function convertMotorcycleTheftRow(row: Record<string, string>, index: number): MotorcycleTheftRecord {
  const date = parseRocCompactDate(row['發生日期']);
  const time = parseIncidentTimeBand(row['發生時段']);
  const location = parseBicycleTheftLocation(row['發生地點']);
  const sourceRecordNumber = parseIntegerValue(row['編號']);
  const caseTypeRaw = emptyToUndefined(row['案類']);
  return {
    id: `motorcycle-theft-${sourceRecordNumber ?? index + 1}`,
    module: 'motorcycle_theft_record',
    sourceRecordNumber,
    caseTypeRaw,
    caseType: classifyMotorcycleTheftCaseType(caseTypeRaw),
    ...date,
    ...time,
    ...location,
    eventGroupKey: [date.date, time.incidentTimeBand, location.locationBucketKey].filter(Boolean).join('|') || undefined,
    locationPrecision: location.roadName ? 'road_or_segment_level' : location.district ? 'district_centroid' : 'fuzzy_address_text',
    source: MOTORCYCLE_THEFT_SOURCE,
    sourceAgency: MOTORCYCLE_THEFT_AGENCY,
  };
}

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text && !['-', '--', 'NaN', 'NULL', 'null'].includes(text) ? text : undefined;
}

export function parseCodeText(raw: unknown): string | undefined {
  return cleanText(raw);
}

export function normalizePoliceUnit(raw: unknown): string | undefined {
  return cleanText(raw);
}

function extractDistrictFromPoliceUnit(policeUnit: string | undefined): string | undefined {
  if (!policeUnit) return undefined;
  return TAIPEI_DISTRICTS.find((district) => policeUnit.includes(district.replace('區', '')));
}

export function parsePoliceCctvInstallationAddress(raw: unknown) {
  const installationAddress = cleanText(raw);
  const installationAddressNormalized = installationAddress?.replaceAll('台北市', '臺北市').replace(/\s+/g, '');
  const district = installationAddressNormalized ? extractDistrictFromLocation(installationAddressNormalized) : undefined;
  const roadName = installationAddressNormalized?.match(/([\u4e00-\u9fff]{1,10}(?:路|街|大道|巷)(?:[一二三四五六七八九十\d]+段)?)/)?.[1];
  return {
    installationAddress,
    installationAddressNormalized,
    district,
    roadName,
    warning: installationAddress && !district ? `District not parsed: ${installationAddress}` : undefined,
  };
}

export function normalizeCameraDirection(raw: unknown): string | undefined {
  return cleanText(raw);
}

export function createPoliceCctvMapQuery(record: { installationAddress?: string; policeUnit?: string }): string | undefined {
  if (!record.installationAddress) return undefined;
  return record.installationAddress.includes('臺北') || record.installationAddress.includes('台北')
    ? record.installationAddress
    : `臺北市 ${record.installationAddress}`;
}

export function extractCameraDirectionKeywords(text: string | undefined): string[] {
  if (!text) return [];
  return ['東', '西', '南', '北', '路口', '巷口', '人行道', '車道', '廣場', '公園'].filter((keyword) => text.includes(keyword));
}

function hashSourceRecord(parts: Array<string | undefined>): string {
  return createHash('sha1').update(parts.map((part) => part ?? '').join('|')).digest('hex').slice(0, 16);
}

export function convertPoliceCctvInstallationLocationRow(row: Record<string, string>, index: number): PoliceCctvInstallationLocationRecord {
  const cityCountyCode = parseCodeText(row['縣市別代碼']);
  const sourceSequenceNumber = parseCodeText(row['編號']);
  const policeUnit = normalizePoliceUnit(row['所屬單位']);
  const address = parsePoliceCctvInstallationAddress(row['安裝地址']);
  const district = address.district ?? extractDistrictFromPoliceUnit(policeUnit);
  const cameraDirection = normalizeCameraDirection(row['攝影方向']);
  const sourceRecordHash = hashSourceRecord([
    cityCountyCode,
    sourceSequenceNumber,
    policeUnit,
    address.installationAddress,
    cameraDirection,
  ]);
  return {
    id: `police-cctv-${sourceSequenceNumber ?? index + 1}`,
    safetyLayer: 'police_cctv_installation_location',
    cityCountyCode,
    cityCountyCodeNormalized: cityCountyCode,
    sourceSequenceNumber,
    policeUnit,
    policeUnitNormalized: policeUnit,
    ...address,
    district,
    cameraDirection,
    cameraDirectionNormalized: cameraDirection,
    hasInstallationAddress: Boolean(address.installationAddress),
    hasCameraDirection: Boolean(cameraDirection),
    hasParsedDistrict: Boolean(district),
    hasParsedRoadName: Boolean(address.roadName),
    locationPrecision: address.installationAddress ? (district ? 'address_only' : 'unparsed_address') : 'missing',
    googleMapsQuery: createPoliceCctvMapQuery({ installationAddress: address.installationAddress, policeUnit }),
    sourceRecordHash,
    source: POLICE_CCTV_SOURCE,
    sourceAgency: POLICE_CCTV_AGENCY,
  };
}

function cleanDonationText(raw: unknown): string | undefined {
  const text = cleanText(raw);
  return text === '尚無資料' ? undefined : text;
}

export function parseIntegerText(raw: unknown): number | undefined {
  const text = cleanDonationText(raw)?.replace(/,/g, '');
  if (!text) return undefined;
  const value = Number.parseInt(text, 10);
  return Number.isFinite(value) ? value : undefined;
}

export function parseRocYear(raw: unknown) {
  const yearRaw = cleanDonationText(raw);
  const match = yearRaw?.match(/(\d{2,4})/);
  if (!match) return { yearRaw, warning: yearRaw ? `Invalid year: ${yearRaw}` : undefined };
  const value = Number(match[1]);
  const rocYear = value < 1911 ? value : undefined;
  const year = rocYear ? rocYear + 1911 : value;
  return year >= 1900 && year <= 2100
    ? { yearRaw, rocYear, year }
    : { yearRaw, warning: `Invalid year: ${yearRaw}` };
}

export function parseResourceYearFromName(resourceName: string | undefined) {
  return parseRocYear(resourceName?.match(/(\d{2,3})年度/)?.[1]);
}

export function deriveDonationDate({ year, month, day }: { year?: number; month?: number; day?: number }) {
  const donationMonthKey = year && month ? `${year}-${String(month).padStart(2, '0')}` : undefined;
  const donationQuarter = year && month ? `${year}-Q${Math.ceil(month / 3)}` : undefined;
  if (!year || !month || !day) return { donationMonthKey, donationQuarter };
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return {
    donationDate: valid ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : undefined,
    donationMonthKey,
    donationQuarter,
    warning: valid ? undefined : `Invalid date: ${year}-${month}-${day}`,
  };
}

const FIRE_DONATION_KEYWORDS = {
  medicalOrRescue: ['救護', '醫療', '急救', 'AED', '擔架'],
  protectiveEquipment: ['防護', '口罩', '手套', '防火', '消防衣', '安全帽'],
  vehicleOrTransport: ['車', '機車', '自行車', '運輸'],
  electronicsOrCommunication: ['電腦', '平板', '通訊', '無線電', '電器', '監視'],
  foodOrSupplies: ['食品', '飲料', '水', '物資', '日用品'],
  trainingOrEducation: ['教材', '訓練', '宣導', '書籍'],
};

function includesAny(text: string | undefined, keywords: string[]): boolean {
  return Boolean(text && keywords.some((keyword) => text.includes(keyword)));
}

export function classifyFireDonationItem(raw: string | undefined): FireDepartmentDonationItemCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (includesAny(text, FIRE_DONATION_KEYWORDS.medicalOrRescue)) return 'medical_or_rescue_equipment';
  if (includesAny(text, FIRE_DONATION_KEYWORDS.protectiveEquipment)) return 'protective_equipment';
  if (includesAny(text, FIRE_DONATION_KEYWORDS.vehicleOrTransport)) return 'vehicle_or_transport';
  if (includesAny(text, FIRE_DONATION_KEYWORDS.electronicsOrCommunication)) return 'electronics_or_communication';
  if (includesAny(text, FIRE_DONATION_KEYWORDS.foodOrSupplies)) return 'food_or_daily_supplies';
  if (includesAny(text, FIRE_DONATION_KEYWORDS.trainingOrEducation)) return 'training_or_education_materials';
  if (text.includes('禮券') || text.includes('提貨券') || text.includes('兌換券')) return 'cash_equivalent_or_voucher';
  return 'other_goods';
}

export function classifyFireDonationPurpose(raw: string | undefined): FireDepartmentDonationPurposeCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('消防') || text.includes('救災') || text.includes('滅火')) return 'firefighting';
  if (text.includes('救護') || text.includes('緊急醫療') || text.includes('急救')) return 'emergency_medical_service';
  if (text.includes('防災') || text.includes('災害') || text.includes('避難')) return 'disaster_prevention';
  if (text.includes('宣導') || text.includes('教育') || text.includes('訓練')) return 'public_education';
  if (text.includes('慰問') || text.includes('員工') || text.includes('同仁')) return 'staff_support';
  if (text.includes('消防局') || text.includes('本局') || text.includes('公務')) return 'general_fire_department_use';
  return 'other';
}

export function parsePossibleReceivingUnit(rawPurpose: unknown): string | undefined {
  return cleanDonationText(rawPurpose)?.match(/([\u4e00-\u9fffA-Za-z0-9]+(?:分隊|中隊|大隊|消防局|救災救護指揮中心))/)?.[1];
}

export function convertFireDepartmentDonationInKindRow(
  row: Record<string, string>,
  index: number,
  resourceName?: string,
): FireDepartmentDonationInKindRecord {
  const resourceYear = parseResourceYearFromName(resourceName);
  const year = parseRocYear(row['年度']);
  const monthRaw = cleanDonationText(row['月份']);
  const dayRaw = cleanDonationText(row['日']);
  const month = parseIntegerText(monthRaw);
  const day = parseIntegerText(dayRaw);
  const date = deriveDonationDate({ year: year.year ?? resourceYear.year, month, day });
  const donorName = cleanDonationText(row['捐贈者']);
  const donatedItem = cleanDonationText(row['捐贈財物']);
  const donationPurpose = cleanDonationText(row['捐贈用途']);
  const keywordText = [donatedItem, donationPurpose].filter(Boolean).join(' ');
  const sourceSequenceNumber = parseIntegerText(row['項次編號']);
  const sourceRecordHash = hashSourceRecord([
    resourceName,
    String(sourceSequenceNumber ?? ''),
    String(year.year ?? ''),
    String(month ?? ''),
    String(day ?? ''),
    donorName,
    donatedItem,
    donationPurpose,
  ]);
  return {
    id: `fire-donation-${resourceYear.year ?? year.year ?? 'unknown'}-${sourceSequenceNumber ?? index + 1}`,
    module: 'fire_department_donation_in_kind_records',
    resourceName,
    resourceYearRaw: resourceYear.yearRaw,
    resourceRocYear: resourceYear.rocYear,
    resourceYear: resourceYear.year,
    sourceSequenceNumber,
    yearRaw: year.yearRaw,
    rocYear: year.rocYear,
    year: year.year ?? resourceYear.year,
    monthRaw,
    month,
    dayRaw,
    day,
    ...date,
    donorName,
    donorNameNormalized: donorName,
    donatedItem,
    donatedItemNormalized: donatedItem,
    donatedItemCategory: classifyFireDonationItem(donatedItem),
    donationPurpose,
    donationPurposeNormalized: donationPurpose,
    donationPurposeCategory: classifyFireDonationPurpose(donationPurpose),
    hasMedicalOrRescueKeyword: includesAny(keywordText, FIRE_DONATION_KEYWORDS.medicalOrRescue),
    hasProtectiveEquipmentKeyword: includesAny(keywordText, FIRE_DONATION_KEYWORDS.protectiveEquipment),
    hasVehicleOrTransportKeyword: includesAny(keywordText, FIRE_DONATION_KEYWORDS.vehicleOrTransport),
    hasElectronicsOrCommunicationKeyword: includesAny(keywordText, FIRE_DONATION_KEYWORDS.electronicsOrCommunication),
    hasFoodOrSuppliesKeyword: includesAny(keywordText, FIRE_DONATION_KEYWORDS.foodOrSupplies),
    hasTrainingOrEducationKeyword: includesAny(keywordText, FIRE_DONATION_KEYWORDS.trainingOrEducation),
    possibleReceivingUnit: parsePossibleReceivingUnit(donationPurpose),
    sourceRecordHash,
    source: FIRE_DONATION_SOURCE,
    sourceAgency: FIRE_DONATION_AGENCY,
  };
}

export function convertAedRow(row: Record<string, string>, index: number): AedLocation {
  const latitude = parseNumber(row['緯度']);
  const longitude = parseNumber(row['經度']);
  const districtCode = emptyToUndefined(row['行政區域代碼']);
  const district =
    (districtCode ? TAIPEI_DISTRICT_CODE_MAP[districtCode] : undefined) ??
    extractDistrictFromLocation(row['場所地址'] ?? '');
  const coordinateStatus =
    latitude === undefined || longitude === undefined
      ? 'missing'
      : longitude < TAIPEI_BOUNDS.minLng ||
          longitude > TAIPEI_BOUNDS.maxLng ||
          latitude < TAIPEI_BOUNDS.minLat ||
          latitude > TAIPEI_BOUNDS.maxLat
        ? 'outlier'
        : 'valid';
  return {
    id: `aed-${index + 1}`,
    layer: 'aed_location',
    placeName: row['場所名稱']?.trim() || 'AED',
    address: row['場所地址']?.trim() || '',
    districtCode,
    district,
    latitude,
    longitude,
    coordinateStatus,
    placeCategory: emptyToUndefined(row['場所分類']),
    placeType: emptyToUndefined(row['場所類型']),
    aedPlacementLocation: emptyToUndefined(row['AED放置地點']),
    aedLocationDescription: emptyToUndefined(row['AED地點描述']),
    source: AED_SOURCE,
  };
}

export function convertDengueRow(row: Record<string, string>, index: number): DengueSurveyRecord {
  const surveyDateRaw = row['日期']?.trim() ?? '';
  const parsedDate = parseDengueSurveyDate(surveyDateRaw);
  return {
    id: `dengue-${row['流水號'] || index + 1}`,
    layer: 'dengue_vector_density',
    sourceId: emptyToUndefined(row['流水號']),
    surveyDateRaw,
    surveyDate: parsedDate.surveyDate,
    surveyYear: parsedDate.surveyYear,
    surveyMonth: parsedDate.surveyMonth,
    city: emptyToUndefined(row['縣市']),
    district: row['區別']?.trim() || '未分類',
    village: emptyToUndefined(row['里別']),
    surveyType: emptyToUndefined(row['調查種類']),
    surveyedHouseholds: parseNumber(row['調查戶數']),
    positiveHouseholds: parseNumber(row['陽性戶數']),
    inspectedContainersIndoor: parseNumber(row['調查積水容器數戶內']),
    inspectedContainersOutdoor: parseNumber(row['調查積水容器數戶外']),
    inspectedContainersTotal: parseNumber(row['調查積水容器數合計']),
    positiveContainersIndoor: parseNumber(row['陽性容器數戶內']),
    positiveContainersOutdoor: parseNumber(row['陽性容器數戶外']),
    positiveContainersTotal: parseNumber(row['陽性容器數合計']),
    breteauIndex: parseNumber(row['布氏指數']),
    breteauLevel: parseNumber(row['布氏級數']),
    containerIndex: parseNumber(row['容器指數']),
    containerLevel: parseNumber(row['容器級數']),
    source: DENGUE_SOURCE,
  };
}

export function convertEvacuationGateRow(row: Record<string, string>, index: number): EvacuationGate {
  const latitude = parseNumber(row.Latitude);
  const longitude = parseNumber(row.Longitude);
  const coordinateStatus =
    latitude === undefined || longitude === undefined
      ? 'missing'
      : longitude < TAIPEI_BOUNDS.minLng ||
          longitude > TAIPEI_BOUNDS.maxLng ||
          latitude < TAIPEI_BOUNDS.minLat ||
          latitude > TAIPEI_BOUNDS.maxLat
        ? 'outlier'
        : 'valid';
  const riversidePark = emptyToUndefined(row.Riverside_Park);
  return {
    id: `evacuation-gate-${index + 1}`,
    layer: 'evacuation_gate',
    riversidePark: riversidePark === '-' ? undefined : riversidePark,
    gateName: row.Name?.trim() || '疏散門',
    description: emptyToUndefined(row.Description),
    longitude,
    latitude,
    coordinateStatus,
    source: EVACUATION_GATE_SOURCE,
  };
}

export function normalizeDistrictCode(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).trim();
  if (!text || text.toLowerCase() === 'nan') return undefined;
  return text.replace(/\.0$/, '');
}

export function convertMedicalFacilityRow(
  row: Record<string, string>,
  index: number,
  facilityType: MedicalFacilityType,
): MedicalFacility {
  const districtCode = normalizeDistrictCode(
    facilityType === 'hospital' ? row['行政區域代碼'] : row['行政區'],
  );
  const address = row['地址']?.trim() ?? '';
  const latitude = parseNumber(row['緯度']);
  const longitude = parseNumber(row['經度']);
  const coordinateStatus =
    latitude === undefined || longitude === undefined
      ? 'missing'
      : longitude < TAIPEI_BOUNDS.minLng ||
          longitude > TAIPEI_BOUNDS.maxLng ||
          latitude < TAIPEI_BOUNDS.minLat ||
          latitude > TAIPEI_BOUNDS.maxLat
        ? 'outlier'
        : 'valid';
  return {
    id: `medical-${facilityType}-${index + 1}`,
    layer: 'medical_facility',
    facilityType,
    facilityName:
      row['機構名稱']?.split('\t')[0]?.trim() || (facilityType === 'hospital' ? '醫院' : '診所'),
    medicalCategory:
      facilityType === 'hospital' ? '醫院' : emptyToUndefined(row['分類']),
    address,
    districtCode,
    cityCode: facilityType === 'clinic' ? normalizeDistrictCode(row['縣市別代碼']) : undefined,
    district:
      (districtCode ? TAIPEI_DISTRICT_CODE_MAP[districtCode] : undefined) ??
      extractDistrictFromLocation(address),
    longitude,
    latitude,
    coordinateStatus,
    source: facilityType === 'hospital' ? MEDICAL_HOSPITAL_SOURCE : MEDICAL_CLINIC_SOURCE,
  };
}

export function classifyFireHydrantType(raw: string | undefined): FireHydrantType {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('地下')) return 'underground';
  if (text.includes('地上')) return 'above_ground';
  return 'other';
}

const newTaipeiOfficialHydrantDistricts = new Set(['三重區', '中和區', '永和區', '新店區', '汐止區']);

export function parseHydrantArea(raw: unknown): {
  areaRaw?: string;
  city?: string;
  district?: string;
  village?: string;
  areaScope: FireHydrantAreaScope;
  isTaipeiCity: boolean;
  isNewTaipei: boolean;
  warning?: string;
} {
  const areaRaw = emptyToUndefined(String(raw ?? ''));
  const match = areaRaw?.match(/^(臺北市|新北市)([^區]+區)?(.*)$/);
  const city = match?.[1];
  const district = match?.[2];
  const village = emptyToUndefined(match?.[3]);
  const isTaipeiCity = city === '臺北市';
  const isNewTaipei = city === '新北市';
  const areaScope: FireHydrantAreaScope = isTaipeiCity
    ? 'taipei_city'
    : isNewTaipei && district && newTaipeiOfficialHydrantDistricts.has(district)
      ? 'new_taipei_official_scope'
      : isNewTaipei
        ? 'new_taipei_other'
        : 'unknown';
  return {
    areaRaw,
    city,
    district,
    village,
    areaScope,
    isTaipeiCity,
    isNewTaipei,
    warning: city && district ? undefined : areaRaw,
  };
}

export function convertFireHydrantRow(row: Record<string, string>, index: number): FireHydrant {
  const longitude = parsePossiblyInvalidNumber(row['WGS84經度']);
  const latitude = parsePossiblyInvalidNumber(row['WGS84緯度']);
  const coordinateStatus =
    longitude.status !== 'valid' || latitude.status !== 'valid'
      ? longitude.status === 'unparsed' || latitude.status === 'unparsed'
        ? 'unparsed'
        : 'missing'
      : isOutsideFireHydrantBounds(longitude.value, latitude.value)
        ? 'outlier'
        : 'valid';
  const area = parseHydrantArea(row['所在地區']);
  const wpid = emptyToUndefined(row.WPID);
  return {
    id: `fire-hydrant-${wpid ?? index + 1}`,
    layer: 'fire_hydrant',
    sourceSequenceNumber: parseNumber(row['序號']),
    mapSheetNumber: emptyToUndefined(row['圖號']),
    hydrantNumber: emptyToUndefined(row['編號']),
    wpid,
    xTwd97: parseNumber(row['97X座標']),
    yTwd97: parseNumber(row['97Y座標']),
    longitude: longitude.value,
    latitude: latitude.value,
    coordinateStatus,
    hydrantTypeRaw: emptyToUndefined(row['型式']),
    hydrantType: classifyFireHydrantType(row['型式']),
    ...area,
    source: FIRE_HYDRANT_SOURCE,
    sourceAgency: FIRE_HYDRANT_AGENCY,
  };
}

export function classifyEmergencyShelterType(raw: string | undefined): EmergencyShelterType {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('學校')) return 'school';
  if (text.includes('圖書館')) return 'library';
  if (text.includes('公園') || text.includes('綠地')) return 'park_green_space';
  if (text.includes('活動中心')) return 'activity_center';
  if (text.includes('市場') || text.includes('停車場')) return 'market_parking_lot';
  if (text.includes('捷運')) return 'metro_station';
  if (text.includes('體育') || text.includes('運動')) return 'sports_facility';
  if (text.includes('藝術')) return 'arts_center';
  if (text.includes('營區')) return 'military_camp';
  return 'other';
}

export function parseDisasterApplicability(raw: unknown): DisasterApplicabilityStatus {
  const text = String(raw ?? '').trim();
  if (!text) return 'unknown';
  if (text === 'Y') return 'yes';
  if (text === 'N') return 'no';
  if (text.includes('備用')) return 'backup';
  if (text.includes('老舊聚落')) return 'old_settlement';
  return 'unknown';
}

export function parseSourceBoolean(raw: unknown): boolean | undefined {
  const text = String(raw ?? '').trim();
  if (!text) return undefined;
  if (text === 'Y') return true;
  if (text === 'N') return false;
  return undefined;
}

export function parseServedVillages(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(/[、,，;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseNumberField(raw: unknown): number | undefined {
  const text = String(raw ?? '').replaceAll(',', '').trim();
  if (!text || text.toLowerCase() === 'nan') return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

export function normalizeTaipeiDistrict(raw: unknown, address?: string): string | undefined {
  const text = String(raw ?? '').trim();
  return TAIPEI_DISTRICTS.find((district) => text === district || text.includes(district)) ?? extractDistrictFromLocation(address ?? '');
}

export function convertEmergencyShelterRow(row: Record<string, string>, index: number): EmergencyShelter {
  const address = emptyToUndefined(row['門牌地址']);
  return {
    id: `emergency-shelter-${row['收容所編號'] || index + 1}`,
    layer: 'emergency_shelter',
    shelterId: row['收容所編號']?.trim() || String(index + 1),
    shelterName: row['名稱']?.trim() || '避難收容處所',
    city: emptyToUndefined(row['縣市']),
    postalCode: emptyToUndefined(row['郵遞區號']),
    district: normalizeTaipeiDistrict(row['鄉鎮'], address),
    village: emptyToUndefined(row['村里']),
    address,
    shelterTypeRaw: emptyToUndefined(row['類型']),
    shelterType: classifyEmergencyShelterType(row['類型']),
    floodStatus: parseDisasterApplicability(row['水災']),
    earthquakeStatus: parseDisasterApplicability(row['震災']),
    landslideStatus: parseDisasterApplicability(row['土石流']),
    tsunamiStatus: parseDisasterApplicability(row['海嘯']),
    isReliefStation: parseSourceBoolean(row['救濟支站']),
    hasAccessibleFacilities: parseSourceBoolean(row['無障礙設施']),
    hasIndoorSpace: parseSourceBoolean(row['室內']),
    hasOutdoorSpace: parseSourceBoolean(row['室外']),
    servedVillagesRaw: emptyToUndefined(row['服務里別']),
    servedVillages: parseServedVillages(row['服務里別']),
    capacityPeople: parseNumberField(row['容納人數']),
    shelterAreaSqm: parseNumberField(row['收容所面積（平方公尺）']),
    contactPersonName: emptyToUndefined(row['聯絡人姓名']),
    contactPhone: emptyToUndefined(row['聯絡人連絡電話']),
    managerName: emptyToUndefined(row['管理人姓名']),
    managerPhone: emptyToUndefined(row['管理人連絡電話']),
    notes: emptyToUndefined(row['備考']),
    locationPrecision: address ? 'address_only' : 'missing',
    source: EMERGENCY_SHELTER_SOURCE,
    sourceAgency: EMERGENCY_SHELTER_AGENCY,
  };
}

export function parseCameraLocationCode(raw: unknown): {
  cameraLocationCodeRaw?: string;
  cameraLocationCode?: string;
  locationDescription?: string;
} {
  const text = emptyToUndefined(String(raw ?? ''));
  if (!text) return {};
  const match = text.match(/^([A-Za-z]*\d{1,5})(?:[-_／/](.*))?$/);
  return {
    cameraLocationCodeRaw: text,
    cameraLocationCode: match?.[1] ?? undefined,
    locationDescription: emptyToUndefined(match?.[2]) ?? text,
  };
}

export function convertTrafficCctvRow(row: Record<string, string>, index: number): TrafficCctvFacility {
  const longitude = parsePossiblyInvalidNumber(row['WGSX(WGS84經度座標)'] ?? row.WGSX);
  const latitude = parsePossiblyInvalidNumber(row['WGSY(WGS84緯度座標)'] ?? row.WGSY);
  const coordinateStatus: CoordinateStatus =
    longitude.status !== 'valid' || latitude.status !== 'valid'
      ? longitude.status === 'unparsed' || latitude.status === 'unparsed'
        ? 'unparsed'
        : 'missing'
      : isOutsideTaipeiBounds(longitude.value, latitude.value)
        ? 'outlier'
        : 'valid';
  const sequence = parseNumberField(row['流水號']);
  return {
    id: `traffic-cctv-${sequence ?? index + 1}`,
    layer: 'traffic_cctv',
    sourceSequenceNumber: sequence,
    city: emptyToUndefined(row['縣市']),
    ...parseCameraLocationCode(row['攝影機編號位置'] ?? row['攝影機編號']),
    longitude: longitude.value,
    latitude: latitude.value,
    coordinateStatus,
    source: TRAFFIC_CCTV_SOURCE,
    sourceAgency: TRAFFIC_CCTV_AGENCY,
  };
}

export function parseIntegerValue(raw: unknown): number | undefined {
  const text = String(raw ?? '').replaceAll(',', '').trim();
  if (!text || text === '-' || text === '--' || text.toLowerCase() === 'nan') return undefined;
  const value = Number.parseInt(text, 10);
  return Number.isInteger(value) ? value : undefined;
}

export function parseRocDateParts(rocYearRaw: unknown, monthRaw: unknown, dayRaw: unknown) {
  const rocYear = parseIntegerValue(rocYearRaw);
  const month = parseIntegerValue(monthRaw);
  const day = parseIntegerValue(dayRaw);
  const year = rocYear === undefined ? undefined : rocYear + 1911;
  if (year === undefined || month === undefined || day === undefined) {
    return { rocYear, year, month, day, warning: `Missing date part: ${[rocYearRaw, monthRaw, dayRaw].join('/')}` };
  }
  if (!isValidGregorianDate(year, month, day)) {
    return { rocYear, year, month, day, warning: `Invalid date: ${[rocYearRaw, monthRaw, dayRaw].join('/')}` };
  }
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    rocYear,
    year,
    month,
    day,
    date,
    dateDisplay: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    monthKey: `${year}-${String(month).padStart(2, '0')}`,
    quarter: `${year}-Q${Math.ceil(month / 3)}`,
  };
}

export function normalizeDisasterName(raw: unknown): string | undefined {
  return emptyToUndefined(String(raw ?? '').replace(/\s+/g, ' '));
}

export function classifyNaturalDisasterType(disasterName: string | undefined): NaturalDisasterType {
  const text = disasterName?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('颱風')) return 'typhoon';
  if (text.includes('豪雨') || text.includes('大雨') || text.includes('水災')) return 'heavy_rain';
  if (text.includes('地震')) return 'earthquake';
  if (text.includes('海嘯')) return 'tsunami_warning';
  if (text.includes('寒流') || text.includes('低溫')) return 'cold_wave';
  return 'other';
}

export function classifySuspensionMessage(messageRaw: string | undefined): {
  decisionCategory: WorkSchoolSuspensionDecisionCategory;
  workSuspensionStatus: WorkOrSchoolSuspensionStatus;
  schoolSuspensionStatus: WorkOrSchoolSuspensionStatus;
  isCitywide: boolean;
  isPartialDay: boolean;
  hasLocalException: boolean;
  hasSchoolOnlyException: boolean;
  hasMountainAreaException: boolean;
  hasNormalWorkSchool: boolean;
  hasSuspension: boolean;
  messageKeywordTags: SuspensionMessageKeywordTag[];
} {
  const text = messageRaw?.replace(/\s+/g, ' ').trim() ?? '';
  if (!text) {
    return {
      decisionCategory: 'unknown',
      workSuspensionStatus: 'unknown',
      schoolSuspensionStatus: 'unknown',
      isCitywide: false,
      isPartialDay: false,
      hasLocalException: false,
      hasSchoolOnlyException: false,
      hasMountainAreaException: false,
      hasNormalWorkSchool: false,
      hasSuspension: false,
      messageKeywordTags: ['unknown'],
    };
  }

  const hasNormalWorkSchool = /照常(上班及上課|上班上課|辦公、照常上課|辦公上課)/.test(text);
  const hasSuspension = /(停止辦公上課|停止上班上課|停止辦公、停止上課|停止上班、停止上課|停止上課|停止辦公|停止上班)/.test(text);
  const isPartialDay = /(下午|上午|晚上|中午|時起|起停止)/.test(text);
  const standardMet = /(已達停止辦公及上課標準|已達停止上班及上課標準)/.test(text);
  const standardNotMet = /(未達停止辦公及上課標準|未達停止上班及上課標準)/.test(text);
  const hasMountainAreaException = /(山區|陽明山|湖田|菁山|平等|溪山)/.test(text);
  const hasLocalException = hasMountainAreaException || /(淹水地區|社子地區|湖田里|國民小學|國小|國民中學|國中|高中|學校|里)/.test(text);
  const schoolOnly = /停止上課/.test(text) && !/(停止辦公|停止上班)/.test(text);
  const tags = new Set<SuspensionMessageKeywordTag>();
  if (hasSuspension) tags.add('work_suspension').add('school_suspension');
  if (hasNormalWorkSchool) tags.add('normal');
  if (isPartialDay) tags.add('partial_day');
  if (standardMet) tags.add('standard_met');
  if (standardNotMet) tags.add('standard_not_met');
  if (schoolOnly) tags.add('school_only');
  if (hasLocalException) tags.add('local_area');
  if (hasMountainAreaException) tags.add('mountain_area');

  let decisionCategory: WorkSchoolSuspensionDecisionCategory = 'mixed_or_unclear';
  let workSuspensionStatus: WorkOrSchoolSuspensionStatus = 'mixed_or_unclear';
  let schoolSuspensionStatus: WorkOrSchoolSuspensionStatus = 'mixed_or_unclear';

  if (standardMet) {
    decisionCategory = 'standard_met';
    workSuspensionStatus = 'standard_met';
    schoolSuspensionStatus = 'standard_met';
  } else if (standardNotMet) {
    decisionCategory = 'standard_not_met';
    workSuspensionStatus = 'standard_not_met';
    schoolSuspensionStatus = 'standard_not_met';
  } else if (hasNormalWorkSchool && hasSuspension) {
    decisionCategory = 'normal_with_local_exceptions';
    workSuspensionStatus = 'local_exception';
    schoolSuspensionStatus = 'local_exception';
  } else if (hasNormalWorkSchool) {
    decisionCategory = 'normal_work_school';
    workSuspensionStatus = 'normal';
    schoolSuspensionStatus = 'normal';
  } else if (schoolOnly) {
    decisionCategory = 'school_only_suspension';
    workSuspensionStatus = 'normal';
    schoolSuspensionStatus = 'school_only';
  } else if (hasSuspension && hasLocalException) {
    decisionCategory = 'local_or_area_suspension';
    workSuspensionStatus = 'local_exception';
    schoolSuspensionStatus = 'local_exception';
  } else if (hasSuspension && isPartialDay) {
    decisionCategory = 'citywide_partial_day_suspension';
    workSuspensionStatus = 'partial_day_suspended';
    schoolSuspensionStatus = 'partial_day_suspended';
    tags.add('citywide');
  } else if (hasSuspension) {
    decisionCategory = 'citywide_full_suspension';
    workSuspensionStatus = 'suspended';
    schoolSuspensionStatus = 'suspended';
    tags.add('citywide');
  }

  return {
    decisionCategory,
    workSuspensionStatus,
    schoolSuspensionStatus,
    isCitywide: decisionCategory.startsWith('citywide'),
    isPartialDay,
    hasLocalException,
    hasSchoolOnlyException: schoolOnly,
    hasMountainAreaException,
    hasNormalWorkSchool,
    hasSuspension,
    messageKeywordTags: tags.size ? [...tags] : ['other'],
  };
}

export function extractMentionedDistricts(text: string | undefined): string[] {
  return TAIPEI_DISTRICTS.filter((district) => text?.includes(district));
}

export function extractMentionedSchoolsOrAreas(text: string | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/[\u4e00-\u9fff]{2,12}(?:國民小學|實驗國民小學|國民中學|高中|國小|國中|里|地區)/g) ?? [];
  return [...new Set(matches)];
}

export function buildEventGroupKey(disasterNameNormalized: string | undefined, year: number | undefined): string {
  return `${year ?? 'unknown'}-${disasterNameNormalized ?? 'unknown'}`;
}

export function convertNaturalDisasterSuspensionRow(row: Record<string, string>, index: number): NaturalDisasterWorkSchoolSuspensionRecord {
  const parsedDate = parseRocDateParts(row['民國年'], row['月'], row['日']);
  const disasterName = normalizeDisasterName(row['天然災害名稱']);
  const suspensionMessageRaw = emptyToUndefined(row['臺北市停止上班上課情形']);
  const classification = classifySuspensionMessage(suspensionMessageRaw);
  return {
    id: `natural-disaster-suspension-${index + 1}`,
    module: 'natural_disaster_work_school_suspension_records',
    ...parsedDate,
    disasterName,
    disasterNameNormalized: disasterName,
    disasterType: classifyNaturalDisasterType(disasterName),
    suspensionMessageRaw,
    ...classification,
    mentionedDistricts: extractMentionedDistricts(suspensionMessageRaw),
    mentionedSchoolsOrAreas: extractMentionedSchoolsOrAreas(suspensionMessageRaw),
    eventGroupKey: buildEventGroupKey(disasterName, parsedDate.year),
    source: NATURAL_DISASTER_SUSPENSION_SOURCE,
    sourceAgency: NATURAL_DISASTER_SUSPENSION_AGENCY,
  };
}

export async function loadConvertedData() {
  const [
    shelters,
    burglaries,
    bicycleThefts,
    motorcycleThefts,
    policeCctvInstallationLocations,
    fireDepartmentDonationInKindRecords,
    aeds,
    dengueRecords,
    evacuationGates,
    medicalFacilities,
    emergencyShelters,
    trafficCctvFacilities,
  ] = await Promise.all([
    readJsonFile<AirRaidShelter[]>(`${PUBLIC_DATA_DIR}/air-raid-shelters.json`),
    readJsonFile<ResidentialBurglaryRecord[]>(`${PUBLIC_DATA_DIR}/residential-burglary-records.json`),
    readJsonFile<BicycleTheftRecord[]>(`${PUBLIC_DATA_DIR}/bicycle-theft-records.json`),
    readJsonFile<MotorcycleTheftRecord[]>(`${PUBLIC_DATA_DIR}/motorcycle-theft-records.json`),
    readJsonFile<PoliceCctvInstallationLocationRecord[]>(`${PUBLIC_DATA_DIR}/police-cctv-installation-locations.json`),
    readJsonFile<FireDepartmentDonationInKindRecord[]>(`${PUBLIC_DATA_DIR}/fire-department-donation-in-kind-records.json`),
    readJsonFile<AedLocation[]>(`${PUBLIC_DATA_DIR}/aed-locations.json`),
    readJsonFile<DengueSurveyRecord[]>(`${PUBLIC_DATA_DIR}/dengue-vector-density-records.json`),
    readJsonFile<EvacuationGate[]>(`${PUBLIC_DATA_DIR}/evacuation-gates.json`),
    readJsonFile<MedicalFacility[]>(`${PUBLIC_DATA_DIR}/medical-facilities.json`),
    readJsonFile<EmergencyShelter[]>(`${PUBLIC_DATA_DIR}/emergency-shelters.json`),
    readJsonFile<TrafficCctvFacility[]>(`${PUBLIC_DATA_DIR}/traffic-cctv-facilities.json`),
  ]);
  return {
    shelters,
    burglaries,
    bicycleThefts,
    motorcycleThefts,
    policeCctvInstallationLocations,
    fireDepartmentDonationInKindRecords,
    aeds,
    dengueRecords,
    evacuationGates,
    medicalFacilities,
    emergencyShelters,
    trafficCctvFacilities,
    districtSummaries: buildDistrictSafetySummary(shelters, burglaries),
    dengueDistrictSummaries: buildDengueDistrictSummaries(dengueRecords),
  };
}

function parsePossiblyInvalidNumber(value: string | undefined): { status: 'valid' | 'missing' | 'unparsed'; value?: number } {
  const text = value?.trim();
  if (!text || text.toLowerCase() === 'nan') return { status: 'missing' };
  const number = Number(text.replace(/,/g, ''));
  return Number.isFinite(number) ? { status: 'valid', value: number } : { status: 'unparsed' };
}

function isOutsideFireHydrantBounds(longitude: number | undefined, latitude: number | undefined): boolean {
  return (
    longitude === undefined ||
    latitude === undefined ||
    longitude < FIRE_HYDRANT_BOUNDS.minLng ||
    longitude > FIRE_HYDRANT_BOUNDS.maxLng ||
    latitude < FIRE_HYDRANT_BOUNDS.minLat ||
    latitude > FIRE_HYDRANT_BOUNDS.maxLat
  );
}

function isOutsideTaipeiBounds(longitude: number | undefined, latitude: number | undefined): boolean {
  return (
    longitude === undefined ||
    latitude === undefined ||
    longitude < TAIPEI_BOUNDS.minLng ||
    longitude > TAIPEI_BOUNDS.maxLng ||
    latitude < TAIPEI_BOUNDS.minLat ||
    latitude > TAIPEI_BOUNDS.maxLat
  );
}

function isValidGregorianDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}
