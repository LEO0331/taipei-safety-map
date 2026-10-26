import { describe,it,expect,vi,afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { DEFAULT_CONFIG, runAccessScenario, compareAccessScenarios, sensitivity, accessBriefing, accessBriefingCsv, safeAccessCsvCell } from './fireRescueAccessScenarios';
import { loadFireRescueAccessPolicy } from './loadFireRescueAccessPolicy';

import { parseRoadIdentity } from './fireRescueAccessIdentity';
import type { Candidate, Snapshot } from '../types/fireRescueAccessPolicy';
const pointer = JSON.parse(await readFile('public/data/fire-rescue-access-policy/current.json','utf8'));
const bytes = await readFile(`public/data/fire-rescue-access-policy/${pointer.filename}`);
const snapshot: Snapshot = JSON.parse(bytes.toString());
const sample = (n: number): Candidate => ({ ...snapshot.candidates[n],id:`test-${n}`,sourceKey:n % 2 ? 'B' : 'A',sourceSha256:snapshot.sources[n % 2].sha256,
  district:n % 3 ? '中正區' : '大安區',issues:[],tier:'C',identity:parseRoadIdentity('齊東街') });
const small = { ...snapshot,candidates:Array.from({ length:7 },(_,i) => sample(i)),relationships:[] };
afterEach(() => vi.unstubAllGlobals());
describe('source-bound documentary scenarios', () => {
  it.each([5,10,'all'] as const)('uses capacity %s, deterministic IDs and exact source/district representation', capacity => {
    const a = runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,capacity });
    expect(a.eligibleCount).toBe(869); expect(a.selected).toHaveLength(capacity === 'all' ? 869 : capacity);
    expect(a).toEqual(runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,capacity }));
    expect(Object.values(a.tiers).reduce((x,y) => x+y,0)).toBe(a.selected.length);
    expect(Object.values(a.sources).reduce((x,y) => x+y,0)).toBe(a.selected.length);
    expect(a.selected.every(x => snapshot.candidates.some(c => c.id === x.id))).toBe(true);
  });
  it('handles all with fewer than ten, zero eligible and valid empty exports', async () => {
    expect(runAccessScenario(small,{ ...DEFAULT_CONFIG,capacity:'all' }).selected).toHaveLength(7);
    const empty = runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,eligibility:{ ...DEFAULT_CONFIG.eligibility,query:'does-not-exist' } });
    expect(empty.eligibleCount).toBe(0); expect((await accessBriefing(snapshot,empty,pointer.sha256)).selectedIds).toEqual([]);
    expect(await accessBriefingCsv(snapshot,empty,pointer.sha256)).toContain('provenance_json');
    expect(Object.values(empty.exclusions)).toEqual([869]);
  });
  it('keeps global tier precedence and balances source then districts deterministically', () => {
    const rows = small.candidates.map((x,i) => ({ ...x,tier:i === 6 ? 'B' as const : 'A' as const,issues:i === 6 ? ['missing-geographic-evidence'] : ['ambiguous-association'] }));
    const run = runAccessScenario({ ...small,candidates:rows },{ ...DEFAULT_CONFIG,strategy:'balanced',capacity:'all' });
    expect(run.selected.map(x => x.group).slice(0,4)).toEqual(['A','B','A','B']);
    expect(run.selected[0].district).toBe('中正區'); expect(run.selected.at(-1)?.tier).toBe('B');
    expect(new Set(run.selected.map(x => x.district)).size).toBe(2);
  });
  it('rejects duplicate IDs, incompatible source editions, snapshots and forged exports', async () => {
    expect(() => runAccessScenario({ ...small,candidates:[small.candidates[0],small.candidates[0]] })).toThrow('Duplicate');
    expect(() => runAccessScenario({ ...small,candidates:[{ ...small.candidates[0],sourceSha256:'wrong' }] })).toThrow('source mismatch');
    const run = runAccessScenario(snapshot);
    expect(() => compareAccessScenarios(run,{ ...run,snapshotId:'other' })).toThrow();
    expect(() => compareAccessScenarios(run,{ ...run,sourceHashes:[] })).toThrow();
    await expect(accessBriefing(snapshot,{ ...run,selected:[] },pointer.sha256)).rejects.toThrow();
    await expect(accessBriefing(snapshot,run,'fake')).rejects.toThrow();
    await expect(accessBriefing(snapshot,run,'0'.repeat(64))).rejects.toThrow('hash');
  });
  it('admits only accepted relationships into B, handles no associations and never admits C', () => {
    for (const capacity of [5,10,'all'] as const) expect(runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,mode:'B',capacity }).selected).toHaveLength(1);
    expect(runAccessScenario({ ...snapshot,modes:{ A:true,B:false,C:false } },{ ...DEFAULT_CONFIG,mode:'B' }).selected).toEqual([]);
    const empty = runAccessScenario({ ...small,modes:{ A:true,B:false,C:false } },{ ...DEFAULT_CONFIG,mode:'B' }); expect(empty.available).toBe(false); expect(empty.eligibleCount).toBe(0);
    const c = runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,mode:'C' }); expect(c.available).toBe(false); expect(c.selected).toEqual([]);
  });
  it('compares real IDs and signals different source populations', () => {
    const a=runAccessScenario(snapshot), b=runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,strategy:'balanced' });
    expect(compareAccessScenarios(a,b).shared).toHaveLength(2);
    const variants=sensitivity(snapshot,DEFAULT_CONFIG); expect(variants.find(x => x.label === 'source-B')?.change.equivalentPopulation).toBe(false);
    expect(variants.find(x => x.label === 'source-B')?.scenario.eligibleCount).toBe(273);
    const all=runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,capacity:'all' });
    expect(compareAccessScenarios(all,runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,capacity:'all',strategy:'balanced' })).shared).toHaveLength(869);
    const modeB=runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,mode:'B' });
    expect(compareAccessScenarios(modeB,runAccessScenario(snapshot,{ ...DEFAULT_CONFIG,mode:'B',strategy:'balanced' })).shared).toHaveLength(1);
  });
  it('produces deterministic briefings with exact hash, source lineage and no contact phones', async () => {
    const scenario=runAccessScenario(snapshot), report=await accessBriefing(snapshot,scenario,pointer.sha256);
    expect(report.exactSnapshotHash).toBe(pointer.sha256); expect(report.sourceVersions).toHaveLength(3);
    expect(await accessBriefingCsv(snapshot,scenario,pointer.sha256)).toBe(await accessBriefingCsv(snapshot,scenario,pointer.sha256));
    expect(JSON.stringify(report)).not.toContain('聯絡電話');
    expect(snapshot.candidates.every(c => c.widthNumeric === null && !('coordinates' in c) && !('passable' in c) && !('riskScore' in c))).toBe(true);
  });
  it.each(['=1+1',' +cmd','\t@SUM(1)','\r-1','\u0001=2','"a,b\nc"'])('escapes CSV injection and RFC fields %j', text => {
    const escaped=safeAccessCsvCell(text); expect(escaped.startsWith('"')).toBe(true); expect(escaped.endsWith('"')).toBe(true);
    if (/[=+@-]/.test(text)) expect(escaped[1]).toBe("'");
    if (text.includes('"')) expect(escaped).toContain('""');
  });
});
describe('integrity checked lazy client loading', () => {
  it('loads only pointer and immutable file and returns exact hash', async () => {
    const fake=vi.fn(async (url: string) => new Response(url.endsWith('current.json') ? JSON.stringify(pointer) : bytes)); vi.stubGlobal('fetch',fake);
    const loaded=await loadFireRescueAccessPolicy(); expect(loaded.exactHash).toBe(pointer.sha256); expect(fake).toHaveBeenCalledTimes(2);
    expect(fake.mock.calls.every(([url]) => !url.includes('data.taipei'))).toBe(true);
  });
  it('fails integrity, wrong pointer and local failure, then permits retry', async () => {
    vi.stubGlobal('fetch',vi.fn(async (url: string) => new Response(url.endsWith('current.json') ? JSON.stringify(pointer) : '{}')));
    await expect(loadFireRescueAccessPolicy()).rejects.toThrow('integrity');
    vi.stubGlobal('fetch',vi.fn(async () => new Response(JSON.stringify({ ...pointer,filename:'../outside.json' }))));
    await expect(loadFireRescueAccessPolicy()).rejects.toThrow('pointer');
    vi.stubGlobal('fetch',vi.fn(async () => new Response('',{ status:503 }))); await expect(loadFireRescueAccessPolicy()).rejects.toThrow();
    vi.stubGlobal('fetch',vi.fn(async (url: string) => new Response(url.endsWith('current.json') ? JSON.stringify(pointer) : bytes)));
    expect((await loadFireRescueAccessPolicy()).snapshot.candidates).toHaveLength(869);
  });
  it('rejects malformed members even with matching file integrity', async () => {
    const broken = structuredClone(snapshot); broken.candidates[0].issues = null as unknown as string[];
    const data = JSON.stringify(broken,null,2) + '\n';
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data)))].map(x => x.toString(16).padStart(2,'0')).join('');
    vi.stubGlobal('fetch',vi.fn(async (url:string) => new Response(url.endsWith('current.json') ? JSON.stringify({ ...pointer,sha256:digest,bytes:new TextEncoder().encode(data).length }) : data)));
    await expect(loadFireRescueAccessPolicy()).rejects.toThrow('candidate members');
  });
  it('verifies explorer width null compatibility and Policy 9 retained integrity', async () => {
    const legacy=JSON.parse(await readFile('public/data/narrow-alley-red-yellow-registry/records.json','utf8')); expect(legacy).toHaveLength(274); expect(legacy.every((x: {widthMeters:number|null}) => x.widthMeters === null)).toBe(true);

  });
});
