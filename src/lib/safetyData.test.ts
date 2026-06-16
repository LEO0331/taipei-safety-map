import { describe, expect, it } from 'vitest';
import {
  buildDistrictSafetySummary,
  calculateDistanceMeters,
  extractDistrictFromLocation,
  formatDistance,
  normalizeBurglaryTimePeriod,
  normalizeShelterCoordinate,
  parseBurglaryDate,
  parseCapacity,
} from './safetyData';

describe('shelter conversion helpers', () => {
  it('parses comma-formatted shelter capacity', () => {
    expect(parseCapacity('1,250')).toBe(1250);
    expect(parseCapacity('')).toBeNull();
    expect(parseCapacity('not available')).toBeNull();
  });

  it('detects valid WGS84 shelter coordinates inside Taipei bounds', () => {
    expect(normalizeShelterCoordinate(121.565, 25.033)).toMatchObject({
      longitude: 121.565,
      latitude: 25.033,
      coordinateSystem: 'wgs84',
      coordinateStatus: 'valid',
    });
  });

  it('marks unknown or out-of-bounds shelter coordinates without throwing', () => {
    expect(normalizeShelterCoordinate(0, 0)).toMatchObject({
      longitude: null,
      latitude: null,
      coordinateSystem: 'unknown',
      coordinateStatus: 'missing',
    });

    expect(normalizeShelterCoordinate(121.9, 25.1)).toMatchObject({
      coordinateSystem: 'wgs84',
      coordinateStatus: 'outlier',
    });
  });
});

describe('burglary conversion helpers', () => {
  it('parses ROC and Gregorian burglary dates', () => {
    expect(parseBurglaryDate('113/05/12')).toEqual({
      occurredAt: '2024-05-12',
      year: 2024,
      month: 5,
      day: 12,
    });

    expect(parseBurglaryDate('2024-01-20')).toEqual({
      occurredAt: '2024-01-20',
      year: 2024,
      month: 1,
      day: 20,
    });
  });

  it('normalizes broad time-period labels', () => {
    expect(normalizeBurglaryTimePeriod('凌晨')).toBe('early_morning');
    expect(normalizeBurglaryTimePeriod('上午')).toBe('morning');
    expect(normalizeBurglaryTimePeriod('下午')).toBe('afternoon');
    expect(normalizeBurglaryTimePeriod('夜間')).toBe('night');
    expect(normalizeBurglaryTimePeriod('')).toBe('unknown');
  });

  it('extracts districts from blurred location text', () => {
    expect(extractDistrictFromLocation('臺北市大安區某路段')).toBe('大安區');
    expect(extractDistrictFromLocation('沒有行政區的模糊位置')).toBeUndefined();
  });
});

describe('dashboard helpers', () => {
  it('calculates distance and localized labels', () => {
    const meters = calculateDistanceMeters(25.0478, 121.517, 25.0339, 121.5645);
    expect(meters).toBeGreaterThan(4000);
    expect(formatDistance(420, 'zh')).toBe('420 公尺');
    expect(formatDistance(1420, 'en')).toBe('1.4 km');
  });

  it('builds district summaries without implying household-level points', () => {
    const summaries = buildDistrictSafetySummary(
      [
        {
          id: 's1',
          district: '中正區',
          address: '臺北市中正區',
          capacity: 1000,
          coordinateStatus: 'valid',
          source: '北市警政APP_防空避難設備位置',
        },
      ],
      [
        {
          id: 'b1',
          caseType: '住宅竊盜',
          occurredDateRaw: '113/05/12',
          year: 2024,
          month: 5,
          day: 12,
          timePeriod: 'morning',
          locationText: '中正區某路段',
          district: '中正區',
          source: '臺北市住宅竊盜點位資訊',
        },
      ],
    );

    expect(summaries.find((summary) => summary.district === '中正區')).toMatchObject({
      shelterCount: 1,
      shelterCapacity: 1000,
      burglaryRecordCount: 1,
      burglaryRecordsByYear: { '2024': 1 },
      burglaryRecordsByTimePeriod: expect.objectContaining({ morning: 1 }),
    });
  });
});
