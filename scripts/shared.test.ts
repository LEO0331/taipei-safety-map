import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { decodeCsvBuffer, parseCsv, readCsv } from './shared';

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

  it('reads CSV files into normalized row objects', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'taipei-safety-map-'));
    const path = join(directory, 'sample.csv');
    await writeFile(path, '\uFEFF行政區,地址\n中正區,臺北市中正區\n');

    await expect(readCsv(path)).resolves.toEqual([{ 行政區: '中正區', 地址: '臺北市中正區' }]);
  });
});
