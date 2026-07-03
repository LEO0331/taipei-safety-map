import type { FloodingAreaCategory, FloodingDepthCategory, HistoricalFloodingGeometry, HistoricalFloodingRecord, HistoricalFloodingSeason, HistoricalFloodingSummary } from '../types';

export const TAIPEI_NEARBY_BOUNDS = { minLng: 121.3, maxLng: 121.8, minLat: 24.85, maxLat: 25.3 };
const missing = new Set(['', '-', '--', 'nan', 'null', '尚無資料']);
const districts = new Set(['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區']);

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return missing.has(text.toLowerCase()) ? undefined : text;
}

export function classifyFloodingDepthCm(depthCm: number | undefined): FloodingDepthCategory {
  if (depthCm == null || !Number.isFinite(depthCm)) return 'missing';
  if (depthCm < 10) return 'under_10cm';
  if (depthCm < 30) return '10_to_30cm';
  if (depthCm < 50) return '30_to_50cm';
  if (depthCm < 100) return '50cm_to_1m';
  return 'over_1m';
}

export function classifyFloodingAreaSquareMeters(areaSqm: number | undefined): FloodingAreaCategory {
  if (areaSqm == null || !Number.isFinite(areaSqm)) return 'missing';
  if (areaSqm < 100) return 'under_100sqm';
  if (areaSqm < 500) return '100_to_500sqm';
  if (areaSqm < 1000) return '500_to_1000sqm';
  if (areaSqm < 5000) return '1000_to_5000sqm';
  return 'over_5000sqm';
}

const season = (month: number | undefined): HistoricalFloodingSeason => {
  if (!month) return 'unknown';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

export function parseFloodingEventDate(raw: unknown) {
  const text = cleanText(raw);
  if (!text) return { warning: 'Missing event date' };
  const match = text.match(/(\d{2,4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  if (!match) return { raw: text, warning: `Invalid event date: ${text}` };
  const year = Number(match[1]) < 1911 ? Number(match[1]) + 1911 : Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { raw: text, warning: `Invalid event date: ${text}` };
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  return { raw: text, date: `${yearMonth}-${String(day).padStart(2, '0')}`, year, month, yearMonth, season: season(month) };
}

export function parseTaipeiDistrictName(raw: unknown) {
  const districtName = cleanText(raw);
  const districtNameNormalized = districtName?.replace(/^臺北市/, '').replace(/^台北市/, '').replace(/台/g, '臺');
  return { districtName, districtNameNormalized, warning: districtNameNormalized && !districts.has(districtNameNormalized) ? `Unknown district: ${districtNameNormalized}` : undefined };
}

export function parseFloodingAddress(raw: unknown) {
  const address = cleanText(raw);
  const addressNormalized = address?.replace(/台北市/g, '臺北市').replace(/台/g, '臺');
  const roadName = addressNormalized?.match(/([\u4e00-\u9fff]{1,12}(?:路|街|大道|巷|段))/)?.[1];
  return { address, addressNormalized, roadName, warning: address && !roadName ? `Road not parsed: ${address}` : undefined };
}

export function parseFloodingDepth(raw: unknown) {
  const text = cleanText(raw);
  if (!text) return { warning: 'Missing depth' };
  const value = Number(text.replace(/[,，]/g, '').match(/-?\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(value)) return { raw: text, warning: `Invalid depth: ${text}` };
  const depthCm = /公尺|米|\bm\b/i.test(text) && !/公分|cm/i.test(text) ? value * 100 : value;
  return { raw: text, depthCm, depthMeters: depthCm / 100, warning: depthCm < 0 || depthCm > 300 ? `Suspicious depth: ${text}` : undefined };
}

export function parseFloodingArea(raw: unknown) {
  const text = cleanText(raw);
  if (!text) return { warning: 'Missing area' };
  const areaSquareMeters = Number(text.replace(/[,，]/g, '').match(/-?\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(areaSquareMeters)) return { raw: text, warning: `Invalid area: ${text}` };
  return { raw: text, areaSquareMeters, warning: areaSquareMeters < 0 || areaSquareMeters > 1_000_000 ? `Suspicious area: ${text}` : undefined };
}

function positions(geometry: HistoricalFloodingGeometry | undefined): Array<[number, number]> {
  if (!geometry) return [];
  if (geometry.type === 'Point') return [geometry.coordinates];
  return JSON.stringify(geometry.coordinates).match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g)?.map((pair) => pair.split(',').map(Number) as [number, number]) ?? [];
}

export function validateHistoricalFloodingGeometry(geometry: HistoricalFloodingGeometry | undefined) {
  const coords = positions(geometry);
  if (!geometry || !coords.length) return { geometryValid: false, warning: 'Missing geometry' };
  const invalid = coords.find(([lng, lat]) => !Number.isFinite(lng) || !Number.isFinite(lat) || lng < TAIPEI_NEARBY_BOUNDS.minLng || lng > TAIPEI_NEARBY_BOUNDS.maxLng || lat < TAIPEI_NEARBY_BOUNDS.minLat || lat > TAIPEI_NEARBY_BOUNDS.maxLat);
  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  const bounds = { minLng: Math.min(...lngs), minLat: Math.min(...lats), maxLng: Math.max(...lngs), maxLat: Math.max(...lats) };
  const centroid = { longitude: lngs.reduce((sum, value) => sum + value, 0) / lngs.length, latitude: lats.reduce((sum, value) => sum + value, 0) / lats.length };
  return { geometryValid: !invalid, geometryType: geometry.type, bounds, centroid, warning: invalid ? `Invalid or out-of-bounds coordinate: ${invalid.join(',')}` : undefined };
}

const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
const median = (values: number[]) => {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};
const group = <T extends string | number>(records: HistoricalFloodingRecord[], key: (record: HistoricalFloodingRecord) => T | undefined) => {
  const map = new Map<T, HistoricalFloodingRecord[]>();
  for (const record of records) {
    const value = key(record);
    if (value === undefined) continue;
    map.set(value, [...(map.get(value) ?? []), record]);
  }
  return map;
};

export function buildHistoricalFloodingSummary(records: HistoricalFloodingRecord[], dataQuality: HistoricalFloodingSummary['dataQuality']): HistoricalFloodingSummary {
  const dates = records.map((record) => record.eventDate).filter((value): value is string => !!value).sort();
  const depths = records.map((record) => record.floodingDepthCm).filter((value): value is number => value !== undefined);
  const areas = records.map((record) => record.floodingAreaSquareMeters).filter((value): value is number => value !== undefined);
  const byDistrict = [...group(records, (record) => record.districtNameNormalized ?? record.districtName).entries()].map(([districtName, items]) => ({ districtName: String(districtName), count: items.length, uniqueAddressCount: new Set(items.map((item) => item.floodingLocationAddressNormalized).filter(Boolean)).size, averageDepthCm: avg(items.map((item) => item.floodingDepthCm).filter((value): value is number => value !== undefined)), maxDepthCm: Math.max(...items.map((item) => item.floodingDepthCm ?? 0)), totalAreaSquareMeters: items.reduce((sum, item) => sum + (item.floodingAreaSquareMeters ?? 0), 0) })).sort((a, b) => b.count - a.count);
  const byEventYear = [...group(records, (record) => record.eventYear).entries()].map(([eventYear, items]) => ({ eventYear: Number(eventYear), count: items.length, districtCount: new Set(items.map((item) => item.districtNameNormalized).filter(Boolean)).size, averageDepthCm: avg(items.map((item) => item.floodingDepthCm).filter((value): value is number => value !== undefined)), totalAreaSquareMeters: items.reduce((sum, item) => sum + (item.floodingAreaSquareMeters ?? 0), 0) })).sort((a, b) => a.eventYear - b.eventYear);
  return {
    totalRecords: records.length,
    minEventDate: dates[0],
    maxEventDate: dates.at(-1),
    eventYearCount: new Set(records.map((record) => record.eventYear).filter(Boolean)).size,
    districtCount: new Set(records.map((record) => record.districtNameNormalized).filter(Boolean)).size,
    uniqueAddressCount: new Set(records.map((record) => record.floodingLocationAddressNormalized).filter(Boolean)).size,
    recordsWithGeometry: records.filter((record) => record.geometry).length,
    recordsWithValidGeometry: records.filter((record) => record.geometryValid).length,
    recordsWithCentroid: records.filter((record) => record.centroidLatitude !== undefined && record.centroidLongitude !== undefined).length,
    recordsWithDepth: depths.length,
    recordsWithArea: areas.length,
    minFloodingDepthCm: depths.length ? Math.min(...depths) : undefined,
    maxFloodingDepthCm: depths.length ? Math.max(...depths) : undefined,
    averageFloodingDepthCm: avg(depths),
    medianFloodingDepthCm: median(depths),
    minFloodingAreaSquareMeters: areas.length ? Math.min(...areas) : undefined,
    maxFloodingAreaSquareMeters: areas.length ? Math.max(...areas) : undefined,
    averageFloodingAreaSquareMeters: avg(areas),
    medianFloodingAreaSquareMeters: median(areas),
    totalFloodingAreaSquareMeters: areas.reduce((sum, value) => sum + value, 0),
    byDistrict,
    byEventYear,
    byEventYearMonth: [...group(records, (record) => record.eventYearMonth).entries()].map(([eventYearMonth, items]) => ({ eventYearMonth: String(eventYearMonth), count: items.length, districtCount: new Set(items.map((item) => item.districtNameNormalized).filter(Boolean)).size, averageDepthCm: avg(items.map((item) => item.floodingDepthCm).filter((value): value is number => value !== undefined)), totalAreaSquareMeters: items.reduce((sum, item) => sum + (item.floodingAreaSquareMeters ?? 0), 0) })).sort((a, b) => a.eventYearMonth.localeCompare(b.eventYearMonth)),
    byFloodingDepthCategory: [...group(records, (record) => record.floodingDepthCategory).entries()].map(([floodingDepthCategory, items]) => ({ floodingDepthCategory: floodingDepthCategory as FloodingDepthCategory, count: items.length })),
    byFloodingAreaCategory: [...group(records, (record) => record.floodingAreaCategory).entries()].map(([floodingAreaCategory, items]) => ({ floodingAreaCategory: floodingAreaCategory as FloodingAreaCategory, count: items.length })),
    byGeometryType: [...group(records, (record) => record.geometryType ?? 'missing').entries()].map(([geometryType, items]) => ({ geometryType: String(geometryType), count: items.length })),
    topRoadNames: [...group(records, (record) => record.roadName).entries()].map(([roadName, items]) => ({ roadName: String(roadName), count: items.length, districtCount: new Set(items.map((item) => item.districtNameNormalized).filter(Boolean)).size })).sort((a, b) => b.count - a.count).slice(0, 20),
    topAddresses: [...group(records, (record) => record.floodingLocationAddressNormalized).entries()].map(([address, items]) => ({ address: String(address), count: items.length, districtName: items[0]?.districtNameNormalized })).sort((a, b) => b.count - a.count).slice(0, 20),
    dataQuality,
  };
}
