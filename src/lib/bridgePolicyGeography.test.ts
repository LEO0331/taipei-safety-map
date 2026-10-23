import { describe, expect, it } from 'vitest';
import { publishedPoint, validateGeography } from './bridgePolicyGeography';
const raw = { Obj_Longitude: 121.53, Obj_Latitude: 25.05, Longitude_start: 121.529, Latitude_start: 25.049, Longitude_end: 121.531, Latitude_end: 25.051, CountyCode: 63000 };
describe('Published geographic evidence screening', () => {
  it('validates order and finite plausible coordinates', () => {
    expect(publishedPoint(121.5, 25)).toEqual({ longitude: 121.5, latitude: 25 });
    for (const pair of [[25, 121.5], [Infinity, 25], [null, null], ['', ''], [0, 0], [123.5, 25], [121.5, 90]]) expect(publishedPoint(pair[0], pair[1])).toBeNull();
    expect(publishedPoint([121.5], [25])).toBeNull();
  });
  it('preserves object and endpoint roles with no surveyed geometry or boundary claim', () => {
    const result = validateGeography(raw, '中山區');
    expect(result.status).toBe('valid-reference'); expect(result.boundaryValidated).toBe(false);
    expect(result.object).not.toEqual(result.start); expect(result.level).toBe('published-object-reference');
  });
  it('allows a valid object with missing endpoints but records the limitation', () => {
    const result = validateGeography({ ...raw, Longitude_start: null }, '中山區');
    expect(result.status).toBe('valid-reference'); expect(result.issues).toContain('missing-or-invalid-start');
  });
  it('excludes invalid objects, administrative scope and inconsistent endpoints', () => {
    for (const changes of [{ Obj_Longitude: null }, { Obj_Longitude: 122 }, { CountyCode: 65000 }, { Longitude_end: 120 }]) expect(validateGeography({ ...raw, ...changes }, '中山區').status).toBe('excluded');
    expect(validateGeography(raw, '').status).toBe('excluded');
    expect(validateGeography({ ...raw, Longitude_start: 120, Latitude_start: 23, Longitude_end: null }, '中山區').status).toBe('excluded');
  });
});
