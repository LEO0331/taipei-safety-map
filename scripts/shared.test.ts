import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  convertAedRow,
  convertEvacuationGateRow,
  convertShelterRow,
  decodeCsvBuffer,
  parseCsv,
  readCsv,
} from './shared';

describe('CSV script helpers', () => {
  it('parses quoted CSV fields with embedded commas and newlines', () => {
    expect(parseCsv('行政區,地址\n中正區,"臺北市,測試路"\n大安區,"跨\n行"')).toEqual([
      ['行政區', '地址'],
      ['中正區', '臺北市,測試路'],
      ['大安區', '跨\n行'],
    ]);
  });

  it('decodes UTF-8 BOM CSV buffers without leaking the BOM into headers', () => {
    const buffer = new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('行政區\n中正區', 'utf8')]);

    expect(decodeCsvBuffer(buffer)).toBe('行政區\n中正區');
  });

  it('falls back to Big5 when a CSV is not valid UTF-8', () => {
    const buffer = new Uint8Array([0xbd, 0x73, 0xb8, 0xb9]);

    expect(decodeCsvBuffer(buffer)).toBe('編號');
  });

  it('reads CSV files into normalized row objects', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'taipei-safety-map-'));
    const path = join(directory, 'sample.csv');
    await writeFile(path, '\uFEFF行政區,地址\n中正區,臺北市中正區\n');

    await expect(readCsv(path)).resolves.toEqual([{ 行政區: '中正區', 地址: '臺北市中正區' }]);
  });

  it('accepts shelter coordinate headers with uppercase X and Y', () => {
    expect(
      convertShelterRow(
        {
          項次: '1',
          行政區: '大同區',
          地址: '臺北市大同區承德路二段235號',
          容納人數: '1,581',
          座標X: '121.518527',
          座標Y: '25.061274',
        },
        0,
      ),
    ).toMatchObject({
      capacity: 1581,
      coordinateStatus: 'valid',
      longitude: 121.518527,
      latitude: 25.061274,
    });
  });

  it('maps AED district codes and validates coordinates', () => {
    expect(
      convertAedRow(
        {
          場所名稱: '測試 AED',
          場所地址: '和平東路1段162號',
          行政區域代碼: '63000030',
          緯度: '25.02603',
          經度: '121.528283',
        },
        0,
      ),
    ).toMatchObject({
      district: '大安區',
      coordinateStatus: 'valid',
      layer: 'aed_location',
    });
  });

  it('normalizes evacuation gate fields and validates coordinates', () => {
    expect(
      convertEvacuationGateRow(
        {
          Riverside_Park: '-',
          Name: '景1,育英',
          Description: '文山區育英街底',
          Longitude: '121.5369669',
          Latitude: '24.98947221',
        },
        0,
      ),
    ).toEqual({
      id: 'evacuation-gate-1',
      layer: 'evacuation_gate',
      riversidePark: undefined,
      gateName: '景1,育英',
      description: '文山區育英街底',
      longitude: 121.5369669,
      latitude: 24.98947221,
      coordinateStatus: 'valid',
      source: '臺北市疏散門資訊',
    });

    expect(
      convertEvacuationGateRow(
        { Riverside_Park: '河濱公園', Name: '測試', Longitude: '120', Latitude: '24' },
        1,
      ).coordinateStatus,
    ).toBe('outlier');
  });
});
