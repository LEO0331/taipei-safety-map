import { describe, expect, it } from 'vitest';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { A_PATH, RAW, REQUIRED_A, MAX_BYTES, atomicJson, boundedDownload, catalogueMetadata, hashBytes, loadAccepted, parseInspectionSource, parseInventorySource, verifyHash } from './bridgePolicySources.ts';
import { parsePolicyCost, parsePolicyYear, yearEvidence } from '../src/lib/bridgePolicy.ts';
const encode = (text: string) => new TextEncoder().encode(text);
const rawB = JSON.parse(await readFile(`${RAW}/pending/2026-10-23-04-03-30-793-/B.json`, 'utf8'))[0];
const csv = (values: string[], header = REQUIRED_A) => encode(header.join(',') + '\n' + values.join(','));
const row = ['1', '測試橋', '文山區', '新建工程處', 'x', '113', '原文', '', '', '', '原文'];

describe('Policy source contracts (synthetic edge cases)', () => {
  it('preserves BOM, raw values, source row identity and unknown versus zero', () => {
    const bytes = csv(row); const a = parseInspectionSource(bytes)[0];
    expect(a.inspectionYear).toBe(2024); expect(a.cost).toBeNull();
    expect(a.raw['最近一期檢測年度']).toBe('113');
    expect(parseInspectionSource(encode('\uFEFF' + new TextDecoder().decode(bytes)))[0].name).toBe('測試橋');
    const zero = [...row]; zero[9] = '0'; expect(parseInspectionSource(csv(zero))[0].cost).toBe(0);
    expect(parseInspectionSource(bytes)[0].id).toBe(a.id);
    const changed = [...row]; changed[1] = '另一橋'; expect(parseInspectionSource(csv(changed))[0].id).not.toBe(a.id);
  });
  it('rejects malformed CSV, missing and duplicate headers', () => {
    expect(() => parseInspectionSource(encode(REQUIRED_A.join(',') + '\n"bad'))).toThrow('quote');
    expect(() => parseInspectionSource(csv(row.slice(1)))).toThrow('row');
    expect(() => parseInspectionSource(csv(row, REQUIRED_A.slice(1)))).toThrow('schema');
    expect(() => parseInspectionSource(csv(row, [...REQUIRED_A, '序號']))).toThrow('duplicate');
    const bad = [...row]; bad[1] = '測"試"橋'; expect(() => parseInspectionSource(csv(bad))).toThrow('quote');
    bad[1] = '"測試"橋'; expect(() => parseInspectionSource(csv(bad))).toThrow('suffix');
  });
  it('retains duplicate source sequences and conflicting records as issues', () => {
    const changed = [...row]; changed[5] = '112';
    const items = parseInspectionSource(encode(REQUIRED_A.join(',') + '\n' + row.join(',') + '\n' + changed.join(',')));
    expect(items).toHaveLength(2); expect(items[0].id).not.toBe(items[1].id);
    expect(items.every(x => x.issues.includes('duplicate-sequence') && x.issues.includes('conflicting-group-records'))).toBe(true);
  });
  it('rejects JSON envelope, schema drift, invalid JSON and empty arrays', () => {
    for (const value of ['{', '[]', '{}', JSON.stringify({ data: [rawB] }), '[{}]']) expect(() => parseInventorySource(encode(value))).toThrow();
  });
  it('keeps blank and duplicate inventory identifiers as audited rows', () => {
    const rows = parseInventorySource(encode(JSON.stringify([{ ...rawB, bridge_id: '' }, rawB, rawB, { ...rawB, ID: null, bridge_id: 'x' }])));
    expect(rows).toHaveLength(4); expect(new Set(rows.map(x => x.id)).size).toBe(4);
    expect(rows[0].issues).toContain('missing-bridge-id'); expect(rows[1].issues).toContain('duplicate-bridge-id'); expect(rows[3].issues).toContain('missing-ID');
  });
  it('checks original-byte hashes and bounded sizes', () => {
    expect(() => verifyHash(encode('x'), hashBytes('y'))).toThrow('hash');
    expect(() => parseInventorySource(new Uint8Array(MAX_BYTES + 1))).toThrow('oversized');
    expect(() => parseInspectionSource(new Uint8Array())).toThrow('Empty');
  });
  it('rejects wrong hosts, network failures, non-OK responses and oversized streams', async () => {
    await expect(boundedDownload('http://data.taipei/a')).rejects.toThrow('host');
    await expect(boundedDownload('https://evil.example/a')).rejects.toThrow('host');
    await expect(boundedDownload('https://data.taipei/a', async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    await expect(boundedDownload('https://data.taipei/a', async () => new Response('failed', { status: 503 }))).rejects.toThrow('503');
    await expect(boundedDownload('https://data.taipei/a', async () => new Response(new Uint8Array(MAX_BYTES + 1)))).rejects.toThrow('Oversized');
  });
  it('does not replace the accepted pointer when atomic publication fails', async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'bridge-policy-')), 'current.json');
    await atomicJson(path, { accepted: 1 });
    await expect(atomicJson(path, { accepted: 2 }, async () => { throw new Error('disk failure'); })).rejects.toThrow('disk failure');
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ accepted: 1 });
  });
  it('reads publisher metadata and resource membership from retained catalogue evidence', async () => {
    const html = await readFile(`${RAW}/pending/2026-10-23-04-03-30-793-/B-catalogue.html`, 'utf8');
    const meta = catalogueMetadata(html, '866a9982-0a63-421f-b120-9144fc6ce732', '68d6c971-d077-4578-a52e-e42db765f861');
    expect(meta.originalFilename).toBe('Bridges.json'); expect(meta.resourceUpdatedAt).toBe('2025-12-16T09:41:34+08:00');
    expect(() => catalogueMetadata(html, 'unrelated', '68d6c971-d077-4578-a52e-e42db765f861')).toThrow('relationship');
    expect(() => catalogueMetadata('{}', 'a', 'b')).toThrow('envelope');
  });
});
describe('Policy time and maintenance semantics', () => {
  it.each([['113', 2024], ['113年', 2024], ['2025', 2025], ['', null], ['113/12/01', null], ['unknown', null]])('parses year %s conservatively', (raw, expected) => expect(parsePolicyYear(raw as string)).toBe(expected));
  it('never assigns month, day or overdue status', () => { expect(yearEvidence(2024)).toEqual({ publishedYear: 2024, calendarYearDifference: 2, month: null, day: null, overdue: null }); expect(yearEvidence(null).calendarYearDifference).toBeNull(); });
  it.each([['', null], ['0', 0], ['NT$ 1,000元', 1000], ['-1', null], ['unknown', null]])('parses expenditure %s', (raw, expected) => expect(parsePolicyCost(raw as string)).toBe(expected));
  it('flags future and malformed year/cost values without inventing dates', () => {
    const values = [...row]; values[5] = '2099'; values[7] = 'not-year'; values[9] = '-100';
    const parsed = parseInspectionSource(csv(values))[0];
    expect(parsed.issues).toEqual(expect.arrayContaining(['future-inspection-year', 'malformed-maintenance-year', 'malformed-maintenance-cost']));
  });
});
describe('Retained production evidence', () => {
  it('preserves the historical source population and hashes', async () => {
    const { sources, a, b } = await loadAccepted();
    expect(hashBytes(await readFile(sources[0].filename))).toBe('3b6d39373759036e725412474636ea328828297902990ca319452893e05121ee');
    expect(parseInspectionSource(await readFile(A_PATH)).map(x => x.raw)).toEqual(a.map(x => x.raw));
    expect(a).toHaveLength(416); expect(new Set(a.map(x => x.group)).size).toBe(415); expect(b).toHaveLength(612);
    expect(sources[0].historicalOriginalAcquiredAt).toBeNull(); expect(a.filter(x => x.maintenanceYear === null)).toHaveLength(314);
    expect(a.filter(x => x.cost === null)).toHaveLength(317); expect(a.filter(x => x.inspectionYear === null)).toHaveLength(1);
  });
});
