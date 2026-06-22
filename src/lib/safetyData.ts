import proj4 from 'proj4';
import type {
  AirRaidShelter,
  BurglaryTimePeriod,
  CoordinateStatus,
  CoordinateSystem,
  DistrictSafetySummary,
  DengueDistrictSummary,
  DengueSurveyRecord,
  Language,
  ResidentialBurglaryRecord,
  ShelterMapCluster,
} from '../types';

proj4.defs(
  'EPSG:3826',
  '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
);

export const TAIPEI_BOUNDS = {
  minLng: 121.43,
  maxLng: 121.7,
  minLat: 24.9,
  maxLat: 25.25,
};

export const TIME_PERIODS: BurglaryTimePeriod[] = [
  'early_morning',
  'morning',
  'afternoon',
  'evening',
  'night',
  'unknown',
];

export const TAIPEI_DISTRICT_CENTROIDS: Record<string, { latitude: number; longitude: number }> = {
  中正區: { latitude: 25.0324, longitude: 121.5199 },
  大同區: { latitude: 25.0634, longitude: 121.513 },
  中山區: { latitude: 25.0642, longitude: 121.5335 },
  松山區: { latitude: 25.0497, longitude: 121.5778 },
  大安區: { latitude: 25.0268, longitude: 121.543 },
  萬華區: { latitude: 25.033, longitude: 121.497 },
  信義區: { latitude: 25.033, longitude: 121.5668 },
  士林區: { latitude: 25.095, longitude: 121.5246 },
  北投區: { latitude: 25.131, longitude: 121.501 },
  內湖區: { latitude: 25.0837, longitude: 121.5924 },
  南港區: { latitude: 25.0327, longitude: 121.6112 },
  文山區: { latitude: 24.9886, longitude: 121.5736 },
};

export const TAIPEI_DISTRICTS = Object.keys(TAIPEI_DISTRICT_CENTROIDS);
export const TAIPEI_DISTRICT_CODE_MAP: Record<string, string> = {
  '63000010': '松山區',
  '63000020': '信義區',
  '63000030': '大安區',
  '63000040': '中山區',
  '63000050': '中正區',
  '63000060': '大同區',
  '63000070': '萬華區',
  '63000080': '文山區',
  '63000090': '南港區',
  '63000100': '內湖區',
  '63000110': '士林區',
  '63000120': '北投區',
};

export function parseCapacity(raw: unknown): number | null {
  const normalized = String(raw ?? '')
    .replaceAll(',', '')
    .trim();
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function normalizeColumnName(raw: string): string {
  return raw.replace(/^\uFEFF/, '').trim();
}

export function normalizeDistrict(raw: string): string | undefined {
  return TAIPEI_DISTRICTS.find((district) => raw.includes(district));
}

export function extractDistrictFromLocation(location: string): string | undefined {
  return normalizeDistrict(location);
}

export function normalizeShelterCoordinate(
  x: number,
  y: number,
): {
  longitude: number | null;
  latitude: number | null;
  coordinateSystem: CoordinateSystem;
  coordinateStatus: CoordinateStatus;
} {
  if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) {
    return { longitude: null, latitude: null, coordinateSystem: 'unknown', coordinateStatus: 'missing' };
  }

  if (x >= 121 && x <= 122 && y >= 24 && y <= 26) {
    return finalizeCoordinate(x, y, 'wgs84');
  }

  if (x >= 250000 && x <= 350000 && y >= 2700000 && y <= 2800000) {
    const [longitude, latitude] = proj4('EPSG:3826', 'EPSG:4326', [x, y]);
    return finalizeCoordinate(longitude, latitude, 'twd97_tm2');
  }

  return { longitude: x, latitude: y, coordinateSystem: 'unknown', coordinateStatus: 'outlier' };
}

function finalizeCoordinate(longitude: number, latitude: number, coordinateSystem: CoordinateSystem) {
  const inBounds =
    longitude >= TAIPEI_BOUNDS.minLng &&
    longitude <= TAIPEI_BOUNDS.maxLng &&
    latitude >= TAIPEI_BOUNDS.minLat &&
    latitude <= TAIPEI_BOUNDS.maxLat;

  return {
    longitude,
    latitude,
    coordinateSystem,
    coordinateStatus: inBounds ? ('valid' as const) : ('outlier' as const),
  };
}

export function parseBurglaryDate(raw: string): {
  occurredAt?: string;
  year?: number;
  month?: number;
  day?: number;
} {
  const text = raw.trim();
  const match = text.match(/(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})/) ?? text.match(/^(\d{2,3})(\d{2})(\d{2})$/);
  if (!match) return {};

  const parsedYear = Number(match[1]);
  const year = parsedYear < 1911 ? parsedYear + 1911 : parsedYear;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDateParts(year, month, day)) return {};

  return {
    occurredAt: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    year,
    month,
    day,
  };
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normalizeBurglaryTimePeriod(raw: string): BurglaryTimePeriod {
  const text = raw.trim().toLowerCase();
  if (!text) return 'unknown';
  const hourRange = text.match(/^(\d{1,2})\s*[~-]\s*(\d{1,2})$/);
  if (hourRange) {
    const hour = Number(hourRange[1]);
    if (hour >= 0 && hour < 6) return 'early_morning';
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    if (hour >= 21 && hour <= 24) return 'night';
  }
  if (text.includes('凌晨') || text.includes('early')) return 'early_morning';
  if (text.includes('上午') || text.includes('morning')) return 'morning';
  if (text.includes('下午') || text.includes('afternoon')) return 'afternoon';
  if (text.includes('傍晚') || text.includes('evening')) return 'evening';
  if (text.includes('夜') || text.includes('night')) return 'night';
  return 'unknown';
}

export function calculateDistanceMeters(
  userLat: number,
  userLng: number,
  itemLat: number,
  itemLng: number,
): number {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(itemLat - userLat);
  const deltaLng = toRadians(itemLng - userLng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(userLat)) *
      Math.cos(toRadians(itemLat)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function formatDistance(distanceMeters: number, language: Language): string {
  if (distanceMeters < 1000) {
    const meters = Math.round(distanceMeters);
    return language === 'zh' ? `${meters} 公尺` : `${meters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function getBurglaryBubbleRadius(recordCount: number): number {
  return Math.min(26, 7 + Math.sqrt(Math.max(0, recordCount)) * 0.75);
}

export function parseNumber(raw: unknown): number | undefined {
  const text = String(raw ?? '').replaceAll(',', '').trim();
  if (!text) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

export function parseDengueSurveyDate(raw: string | undefined): {
  surveyDate?: string;
  surveyYear?: number;
  surveyMonth?: number;
  warning?: string;
} {
  const text = raw?.trim() ?? '';
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  const separated = text.match(/^(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})$/);
  const match = compact ?? separated;
  if (!match) return text ? { warning: `Unparsed date: ${text}` } : {};
  const rawYear = Number(match[1]);
  const year = rawYear < 1911 ? rawYear + 1911 : rawYear;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDateParts(year, month, day)) return { warning: `Invalid date: ${text}` };
  return {
    surveyDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    surveyYear: year,
    surveyMonth: month,
  };
}

export function buildDistrictSafetySummary(
  shelters: AirRaidShelter[],
  burglaryRecords: ResidentialBurglaryRecord[],
): DistrictSafetySummary[] {
  return TAIPEI_DISTRICTS.map((district) => {
    const districtShelters = shelters.filter((shelter) => shelter.district === district);
    const districtBurglaries = burglaryRecords.filter((record) => record.district === district);

    return {
      district,
      ...TAIPEI_DISTRICT_CENTROIDS[district],
      shelterCount: districtShelters.length,
      shelterCapacity: districtShelters.reduce((sum, shelter) => sum + (shelter.capacity ?? 0), 0),
      burglaryRecordCount: districtBurglaries.length,
      burglaryRecordsByYear: countBy(districtBurglaries, (record) =>
        record.year ? String(record.year) : 'unknown',
      ),
      burglaryRecordsByTimePeriod: TIME_PERIODS.reduce<Record<BurglaryTimePeriod, number>>(
        (counts, period) => {
          counts[period] = districtBurglaries.filter((record) => record.timePeriod === period).length;
          return counts;
        },
        {
          early_morning: 0,
          morning: 0,
          afternoon: 0,
          evening: 0,
          night: 0,
          unknown: 0,
        },
      ),
    };
  });
}

export function buildDengueDistrictSummaries(records: DengueSurveyRecord[]): DengueDistrictSummary[] {
  return TAIPEI_DISTRICTS.map((district) => {
    const districtRecords = records.filter((record) => record.district === district);
    const breteauValues = districtRecords.flatMap((record) =>
      record.breteauIndex === undefined ? [] : [record.breteauIndex],
    );
    const containerValues = districtRecords.flatMap((record) =>
      record.containerIndex === undefined ? [] : [record.containerIndex],
    );
    const villageMax = new Map<string, { breteauIndex: number; breteauLevel?: number }>();
    for (const record of districtRecords) {
      if (!record.village || record.breteauIndex === undefined) continue;
      const current = villageMax.get(record.village);
      if (!current || record.breteauIndex > current.breteauIndex) {
        villageMax.set(record.village, {
          breteauIndex: record.breteauIndex,
          breteauLevel: record.breteauLevel,
        });
      }
    }
    return {
      district,
      ...TAIPEI_DISTRICT_CENTROIDS[district],
      recordCount: districtRecords.length,
      surveyedHouseholds: sumOptional(districtRecords.map((record) => record.surveyedHouseholds)),
      positiveHouseholds: sumOptional(districtRecords.map((record) => record.positiveHouseholds)),
      inspectedContainersTotal: sumOptional(districtRecords.map((record) => record.inspectedContainersTotal)),
      positiveContainersTotal: sumOptional(districtRecords.map((record) => record.positiveContainersTotal)),
      averageBreteauIndex: average(breteauValues),
      maxBreteauIndex: maxOptional(breteauValues),
      maxBreteauLevel: maxOptional(
        districtRecords.flatMap((record) => (record.breteauLevel === undefined ? [] : [record.breteauLevel])),
      ),
      averageContainerIndex: average(containerValues),
      maxContainerIndex: maxOptional(containerValues),
      maxContainerLevel: maxOptional(
        districtRecords.flatMap((record) => (record.containerLevel === undefined ? [] : [record.containerLevel])),
      ),
      topVillagesByBreteauIndex: [...villageMax.entries()]
        .map(([village, value]) => ({ village, ...value }))
        .sort((a, b) => b.breteauIndex - a.breteauIndex)
        .slice(0, 5),
      bySurveyType: Object.entries(countBy(districtRecords, (record) => record.surveyType))
        .map(([surveyType, count]) => ({ surveyType, count }))
        .sort((a, b) => b.count - a.count),
    };
  });
}

function sumOptional(values: Array<number | undefined>): number {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function average(values: number[]): number | undefined {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

function maxOptional(values: number[]): number | undefined {
  return values.length ? Math.max(...values) : undefined;
}

export function buildShelterMapClusters<T extends { latitude: number; longitude: number; capacity?: number | null }>(
  shelters: T[],
  zoom: number,
): ShelterMapCluster[] {
  const precision = zoom >= 14 ? 3 : zoom >= 12 ? 2 : 1;
  const clusters = new Map<string, { latitudeTotal: number; longitudeTotal: number; count: number; capacity: number }>();

  for (const shelter of shelters) {
    const key = `${shelter.latitude.toFixed(precision)}:${shelter.longitude.toFixed(precision)}`;
    const cluster = clusters.get(key) ?? { latitudeTotal: 0, longitudeTotal: 0, count: 0, capacity: 0 };
    cluster.latitudeTotal += shelter.latitude;
    cluster.longitudeTotal += shelter.longitude;
    cluster.count += 1;
    cluster.capacity += shelter.capacity ?? 0;
    clusters.set(key, cluster);
  }

  return [...clusters.entries()].map(([id, cluster]) => ({
    id,
    latitude: cluster.latitudeTotal / cluster.count,
    longitude: cluster.longitudeTotal / cluster.count,
    count: cluster.count,
    capacity: cluster.capacity,
  }));
}

export function countBy<T>(items: T[], getKey: (item: T) => string | undefined): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    if (!key) return counts;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export function mostCommonEntry(counts: Record<string, number>): [string, number] | undefined {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
}
