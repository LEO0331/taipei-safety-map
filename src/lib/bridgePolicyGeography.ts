import type { GeographicEvidence, Point } from '../types/bridgePolicy';

export function publishedPoint(lon: unknown, lat: unknown): Point | null {
  if (!['string', 'number'].includes(typeof lon) || !['string', 'number'].includes(typeof lat)) return null;
  if (lon === null || lat === null || lon === undefined || lat === undefined || String(lon).trim() === '' || String(lat).trim() === '') return null;
  const longitude = Number(lon), latitude = Number(lat);
  return Number.isFinite(longitude) && Number.isFinite(latitude) && longitude >= 119 && longitude <= 123 && latitude >= 21 && latitude <= 26
    ? { longitude, latitude } : null;
}
const distance = (a: Point, b: Point) => Math.hypot((a.longitude - b.longitude) * 100700, (a.latitude - b.latitude) * 111000);
export function validateGeography(raw: Record<string, unknown>, district: string): GeographicEvidence {
  const object = publishedPoint(raw.Obj_Longitude, raw.Obj_Latitude);
  const start = publishedPoint(raw.Longitude_start, raw.Latitude_start);
  const end = publishedPoint(raw.Longitude_end, raw.Latitude_end);
  const issues: string[] = [];
  if (!object) issues.push('missing-or-invalid-object');
  if (!start) issues.push('missing-or-invalid-start');
  if (!end) issues.push('missing-or-invalid-end');
  if (!district || String(raw.CountyCode) !== '63000') issues.push('administrative-scope-unresolved');
  if (object && (object.longitude < 121.4 || object.longitude > 121.7 || object.latitude < 24.9 || object.latitude > 25.3)) issues.push('outside-taipei-screening-range');
  if ((object && start && distance(object, start) > 12000) ||
    (object && end && distance(object, end) > 12000) ||
    (start && end && distance(start, end) > 15000)) issues.push('inconsistent-coordinate-sets');
  // A conservative screening rule, not a city/district polygon check.
  const excluded = issues.some(x => !['missing-or-invalid-start', 'missing-or-invalid-end'].includes(x));
  return { status: excluded ? 'excluded' : 'valid-reference', object, start, end, issues,
    boundaryValidated: false, level: excluded ? 'none' : 'published-object-reference' };
}
