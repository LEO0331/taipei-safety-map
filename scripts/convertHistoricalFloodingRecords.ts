import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { buildHistoricalFloodingSummary, classifyFloodingAreaSquareMeters, classifyFloodingDepthCm, cleanText, parseFloodingAddress, parseFloodingArea, parseFloodingDepth, parseFloodingEventDate, parseTaipeiDistrictName, validateHistoricalFloodingGeometry } from '../src/lib/historicalFlooding.ts';
import type { HistoricalFloodingGeometry, HistoricalFloodingRecord, HistoricalFloodingSummary } from '../src/types.ts';
import { writeJson } from './shared.ts';

const rawDir = 'data/raw/historical-flooding-records';
const source = '臺北市水利處歷史積水紀錄圖';
const sourceAgency = '臺北市政府工務局水利工程處';
const reportAgency = '工務局水利處';

const decode = (value: string) => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const hash = (value: string) => createHash('sha1').update(value).digest('hex').slice(0, 16);
const blocks = (text: string, tag: string) => [...text.matchAll(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'g'))].map((match) => match[0]);
const first = (text: string, tag: string) => text.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1];

function simpleData(placemark: string) {
  return Object.fromEntries([...placemark.matchAll(/<SimpleData\s+name="([^"]+)">([\s\S]*?)<\/SimpleData>/g)].map(([, key, value]) => [key, cleanText(decode(value))]));
}

function coordList(text: string): Array<[number, number]> {
  return decode(text).trim().split(/\s+/).map((chunk) => {
    const [lng, lat] = chunk.split(',').map(Number);
    return [lng, lat] as [number, number];
  }).filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
}

function parseGeometry(placemark: string): HistoricalFloodingGeometry | undefined {
  const polygons = blocks(placemark, 'Polygon').map((polygon) => blocks(polygon, 'coordinates').map((coord) => coordList(first(coord, 'coordinates') ?? '')).filter((ring) => ring.length));
  if (polygons.length === 1) return { type: 'Polygon', coordinates: polygons[0] };
  if (polygons.length > 1) return { type: 'MultiPolygon', coordinates: polygons };
  const lines = blocks(placemark, 'LineString').map((line) => coordList(first(line, 'coordinates') ?? '')).filter((line) => line.length);
  if (lines.length === 1) return { type: 'LineString', coordinates: lines[0] };
  if (lines.length > 1) return { type: 'MultiLineString', coordinates: lines };
  const points = blocks(placemark, 'Point').map((point) => coordList(first(point, 'coordinates') ?? '')[0]).filter(Boolean) as Array<[number, number]>;
  if (points.length === 1) return { type: 'Point', coordinates: points[0] };
  if (points.length > 1) return { type: 'MultiPoint', coordinates: points };
  return undefined;
}

const emptyQuality = (): HistoricalFloodingSummary['dataQuality'] => ({
  missingEventDateCount: 0,
  invalidEventDateCount: 0,
  missingDistrictCount: 0,
  unknownDistrictCount: 0,
  missingAddressCount: 0,
  missingDepthCount: 0,
  invalidDepthCount: 0,
  missingAreaCount: 0,
  invalidAreaCount: 0,
  missingGeometryCount: 0,
  invalidGeometryCount: 0,
  duplicateFallbackKeyCount: 0,
});

async function main() {
  const file = (await readdir(rawDir)).find((name) => name.endsWith('.kml'));
  if (!file) throw new Error(`No KML file found in ${rawDir}`);
  const kml = await readFile(path.join(rawDir, file), 'utf8');
  const fetchStatus = await readFile(path.join(rawDir, 'fetch-status.json'), 'utf8').then((value) => JSON.parse(value)).catch(() => null);
  const dataQuality = emptyQuality();
  const warnings: Array<{ row: number; issue: string; value?: string }> = [];
  const fallbackKeys = new Set<string>();
  const duplicateFallbackKeys = new Set<string>();
  const records = blocks(kml, 'Placemark').map((placemark, index): HistoricalFloodingRecord => {
    const raw = simpleData(placemark);
    const date = parseFloodingEventDate(raw.FDATE);
    if (!date.raw) dataQuality.missingEventDateCount += 1;
    if (date.warning && date.raw) dataQuality.invalidEventDateCount += 1;
    const district = parseTaipeiDistrictName(raw.TOWN_NAME);
    if (!district.districtName) dataQuality.missingDistrictCount += 1;
    if (district.warning) dataQuality.unknownDistrictCount += 1;
    const address = parseFloodingAddress(raw.ADDRESS);
    if (!address.address) dataQuality.missingAddressCount += 1;
    const depth = parseFloodingDepth(raw.Depth);
    if (!depth.raw) dataQuality.missingDepthCount += 1;
    if (depth.warning && depth.raw) dataQuality.invalidDepthCount += 1;
    const area = parseFloodingArea(raw.area);
    if (!area.raw) dataQuality.missingAreaCount += 1;
    if (area.warning && area.raw) dataQuality.invalidAreaCount += 1;
    const geometry = parseGeometry(placemark);
    const geometryCheck = validateHistoricalFloodingGeometry(geometry);
    if (!geometry) dataQuality.missingGeometryCount += 1;
    if (!geometryCheck.geometryValid) dataQuality.invalidGeometryCount += 1;
    for (const item of [date, district, address, depth, area, geometryCheck]) if (item.warning) warnings.push({ row: index + 1, issue: item.warning, value: JSON.stringify(raw) });
    const fallbackKey = [date.date ?? date.raw, district.districtNameNormalized, address.addressNormalized, depth.raw, area.raw].join('|');
    if (fallbackKeys.has(fallbackKey)) duplicateFallbackKeys.add(fallbackKey);
    fallbackKeys.add(fallbackKey);
    const id = `historical-flooding-${hash(`${fallbackKey}|${JSON.stringify(geometry)}`)}`;
    return {
      id,
      module: 'historical_flooding_records',
      eventDateRaw: date.raw,
      eventDate: date.date,
      eventYear: date.year,
      eventMonth: date.month,
      eventYearMonth: date.yearMonth,
      eventSeason: date.season ?? 'unknown',
      districtName: district.districtName,
      districtNameNormalized: district.districtNameNormalized,
      floodingLocationAddress: address.address,
      floodingLocationAddressNormalized: address.addressNormalized,
      roadName: address.roadName,
      floodingDepthRaw: depth.raw,
      floodingDepthCm: depth.depthCm,
      floodingDepthMeters: depth.depthMeters,
      floodingDepthCategory: classifyFloodingDepthCm(depth.depthCm),
      floodingAreaRaw: area.raw,
      floodingAreaSquareMeters: area.areaSquareMeters,
      floodingAreaCategory: classifyFloodingAreaSquareMeters(area.areaSquareMeters),
      geometry,
      geometryType: geometryCheck.geometryType,
      geometryValid: geometryCheck.geometryValid,
      geometrySource: geometry ? 'official_kml_geometry' : 'missing',
      geometryBounds: geometryCheck.bounds,
      centroidLatitude: geometryCheck.centroid?.latitude,
      centroidLongitude: geometryCheck.centroid?.longitude,
      locationPrecision: geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon' ? 'official_kml_polygon' : geometry?.type === 'LineString' || geometry?.type === 'MultiLineString' ? 'official_kml_line' : geometry?.type === 'Point' || geometry?.type === 'MultiPoint' ? 'official_kml_point' : 'missing',
      rawProperties: raw,
      sourceRecordHash: hash(`${fallbackKey}|${JSON.stringify(geometry)}`),
      source,
      sourceAgency,
    };
  });
  dataQuality.duplicateFallbackKeyCount = duplicateFallbackKeys.size;
  const summary = buildHistoricalFloodingSummary(records, dataQuality);
  const geojson = { type: 'FeatureCollection', features: records.map((record) => ({ type: 'Feature', id: record.id, geometry: record.geometry ?? null, properties: { ...record, geometry: undefined } })) };
  await writeJson('public/data/historical-flooding-records.json', records);
  await writeJson('public/data/historical-flooding-records.geojson', geojson);
  await writeJson('public/data/historical-flooding-summary.json', summary);
  await writeJson('public/data/historical-flooding-conversion.json', {
    generatedAt: new Date().toISOString(),
    source,
    sourceAgency: reportAgency,
    file,
    fileSize: fetchStatus?.fileSize,
    placemarkCount: records.length,
    geometryCount: records.filter((record) => record.geometry).length,
    warningCount: warnings.length,
    warnings: warnings.slice(0, 100),
    duplicateFallbackKeys: [...duplicateFallbackKeys].slice(0, 50),
    notes: ['KML source geometry is preserved as GeoJSON for historical record lookup only.', 'Centroids are derived only for popup placement and sorting support, not as replacement geometry.'],
  });
  console.log(`Converted ${records.length} historical flooding record(s) from ${file}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
