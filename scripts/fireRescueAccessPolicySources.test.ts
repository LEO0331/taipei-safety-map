import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CONFIG, RAW, parseSource, decodeSource, download, loadAccepted, validateEditions, stageRefresh, hash } from './fireRescueAccessPolicySources.ts';
const fixture = (key: 'A' | 'B' | 'C', cells: string[][]) => Buffer.from([CONFIG.find(x => x.key === key)!.headers.join(','), ...cells.map(x => x.join(','))].join('\r\n'));
const bRow = ['1','紅區','63000050','城中分隊','齊東街82巷','2.9',''];
afterEach(() => vi.unstubAllGlobals());
describe('Policy 12 source admission', () => {
  it('verifies actual original hashes and all accepted rows offline', async () => {
    const { sources,candidates } = await loadAccepted(); expect(candidates).toHaveLength(869);
    expect(sources.map(x => x.rowCount)).toEqual([185,273,411]);
    for (const source of sources) expect(hash(await readFile(source.filename))).toBe(source.sha256);
  });
  it('fails closed on source registry, metadata, schema and original-byte mismatch', async () => {
    const { sources } = await loadAccepted();
    for (const change of [{ resourceId: 'fake' },{ publisher:'' },{ resourceUpdatedAt:'' },{ acquiredAt:'' },{ sha256:'0'.repeat(64) },{ rowCount:1 },{ schema:[] },{ contentType:'' },{ license:'javascript:alert(1)' },{ acquiredAt:'2026-99-99Tnot-a-timeZ' }]) {
      const next = structuredClone(sources); Object.assign(next[0],change); await expect(validateEditions(next)).rejects.toThrow();
    }
    await expect(validateEditions(sources.slice(1))).rejects.toThrow('registry');
  });
  it('rejects schema/encoding/CSV drift, preserves quoted original fields', () => {
    expect(() => parseSource(Buffer.from('wrong\n1'), 'B')).toThrow('schema');
    expect(() => decodeSource(new Uint8Array([255,255]))).toThrow();
    expect(() => decodeSource(new Uint8Array([0]),'utf-16')).toThrow();
    expect(() => parseSource(fixture('B',[[...bRow.slice(0,4),'"bad',...bRow.slice(5)]]),'B')).toThrow();
    expect(() => parseSource(fixture('B',[bRow.slice(0,5)]),'B')).toThrow('row width');
    const [row] = parseSource(fixture('B',[[...bRow.slice(0,4),'"齊東街82巷,南側"',...bRow.slice(5)]]),'B');
    expect(row.raw['巷道名稱']).toBe('齊東街82巷,南側');
  });
  it('retains malformed documentation rows with stable occurrence identities', () => {
    const rows = parseSource(fixture('B',[bRow,bRow]),'B'); expect(rows[0].issues).toContain('duplicate-sequence');
    expect(rows[0].tier).toBe('A'); expect(rows[0].id).not.toBe(rows[1].id);
    const bad = [...bRow]; bad[2] = 'unknown'; bad[4] = ''; bad[1] = '紫區';
    const [r] = parseSource(fixture('B',[bad]),'B'); expect(r.issues).toEqual(expect.arrayContaining(['unknown-district','missing-name','unknown-category'])); expect(r.eligible).toBe(true);
  });
  it('flags unknown classification/recognition and embedded district conflicts', () => {
    const a = parseSource(fixture('A',[['1','63000050','文祥里','大安區齊東街82巷','新分類','無','分隊','']]),'A')[0];
    expect(a.issues).toEqual(expect.arrayContaining(['unknown-category','district-label-conflict']));
    const c = parseSource(fixture('C',[['1','2','999','63000050','齊東街','大樓']]),'C')[0];
    expect(c.issues).toContain('unknown-recognition');
  });
  it('binds IDs to bytes and separates multiple village labels without polygons', () => {
    const a = fixture('A',[['1','63000030','文祥里、三愛里','永康街','社區參與','無','金華分隊','123']]);
    const [row] = parseSource(a,'A'); expect(row.villages).toEqual(['文祥里','三愛里']); expect(row.raw).not.toHaveProperty('聯絡電話');
    expect(parseSource(Buffer.concat([a,Buffer.from('\r\n')]),'A')[0].id).not.toBe(row.id);
  });
  it('rejects unapproved hosts/resources and oversized or failed retrieval', async () => {
    const fake = vi.fn(async () => new Response('x',{ status:500 }));
    await expect(download('https://example.org/x','resource',fake as typeof fetch)).rejects.toThrow('Unapproved'); expect(fake).not.toHaveBeenCalled();
    const url = `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${CONFIG[0].resourceId}`;
    await expect(download(url,'resource',fake as typeof fetch)).rejects.toThrow('fetch');
    const over = vi.fn(async () => new Response('x',{ headers:{ 'content-type':'text/csv','content-length':'5000001' } }));
    await expect(download(url,'resource',over as typeof fetch)).rejects.toThrow();
    const html = vi.fn(async () => new Response('<html>',{ headers:{ 'content-type':'text/html' } }));
    await expect(download(url,'resource',html as typeof fetch)).rejects.toThrow('content type');
    const stream = vi.fn(async () => new Response(new Uint8Array(5_000_001),{ headers:{ 'content-type':'text/csv' } }));
    await expect(download(url,'resource',stream as typeof fetch)).rejects.toThrow('limit');
  });
  it('keeps accepted source publication and policy pointer after rejected refresh, then recovers offline', async () => {
    const before = await readFile(`${RAW}/sources.json`), pointer = await readFile('public/data/fire-rescue-access-policy/current.json');
    const directories = await readdir(`${RAW}/pending`);
    const manifest = JSON.parse(before.toString());
    const cat = await readFile(manifest[0].catalogueFile);
    vi.stubGlobal('fetch',vi.fn(async (url:string) => new Response(url.includes('/dataset/detail') ? cat : 'changed-schema\n1', { headers:{ 'content-type':url.includes('/dataset/detail') ? 'text/html' : 'text/csv' } })));
    await expect(stageRefresh()).rejects.toThrow('schema');
    expect(await readFile(`${RAW}/sources.json`)).toEqual(before); expect(await readFile('public/data/fire-rescue-access-policy/current.json')).toEqual(pointer);
    expect((await loadAccepted()).candidates).toHaveLength(869);
    for (const entry of await readdir(`${RAW}/pending`)) if (!directories.includes(entry)) {
      const target = resolve(RAW,'pending',entry), root = resolve(RAW,'pending'); if (!target.startsWith(root + '\\') && !target.startsWith(root + '/')) throw new Error('Unsafe test cleanup');
      const failure=JSON.parse(await readFile(`${target}/failure.json`,'utf8')); expect(failure.status).toBe('rejected-refresh'); expect(failure.completed).toHaveLength(2); for(const item of failure.completed) expect(hash(await readFile(item.filename))).toBe(item.sha256); await rm(target,{ recursive:true });
    }
  });
});
