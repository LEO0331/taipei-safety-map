import { describe, expect, it } from 'vitest';
import { classifyFloodingAreaSquareMeters, classifyFloodingDepthCm, parseFloodingArea, parseFloodingDepth, parseFloodingEventDate, parseTaipeiDistrictName, validateHistoricalFloodingGeometry } from './historicalFlooding';

describe('historical flooding helpers', () => {
  it('parses Gregorian and ROC event dates', () => {
    expect(parseFloodingEventDate('2025/06/09').date).toBe('2025-06-09');
    expect(parseFloodingEventDate('114/06/09').date).toBe('2025-06-09');
  });

  it('parses depth and area units without clamping values', () => {
    expect(parseFloodingDepth('0.5公尺').depthCm).toBe(50);
    expect(parseFloodingDepth('15').depthCm).toBe(15);
    expect(parseFloodingArea('1,200㎡').areaSquareMeters).toBe(1200);
    expect(classifyFloodingDepthCm(45)).toBe('30_to_50cm');
    expect(classifyFloodingAreaSquareMeters(1200)).toBe('1000_to_5000sqm');
  });

  it('normalizes districts and validates Taipei-nearby geometry', () => {
    expect(parseTaipeiDistrictName('台北市信義區').districtNameNormalized).toBe('信義區');
    const result = validateHistoricalFloodingGeometry({ type: 'Polygon', coordinates: [[
      [121.5, 25.0],
      [121.51, 25.0],
      [121.51, 25.01],
      [121.5, 25.0],
    ]] });
    expect(result.geometryValid).toBe(true);
    expect(result.centroid?.latitude).toBeGreaterThan(25);
  });
});
