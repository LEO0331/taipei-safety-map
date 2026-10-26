import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseCsv } from './shared.ts';
import { catalogueMetadata, atomicJson } from './bridgePolicySources.ts';
import { parseRoadIdentity, documentaryTier, widthEvidence, normalizeRoadText } from '../src/lib/fireRescueAccessIdentity.ts';
import type { Candidate, SourceEdition, SourceKey } from '../src/types/fireRescueAccessPolicy.ts';
export { atomicJson };
export const RAW = 'data/raw/fire-rescue-access-policy';
export const OUTPUT = 'public/data/fire-rescue-access-policy';
export const MAX_BYTES = 5_000_000;
export const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export const CONFIG = [
  { key: 'A', datasetId: '7a800e92-eb22-461f-b29d-8def2127a1bc', resourceId: '351307e4-ffda-4660-ac72-1c4ef3808c38', legacy: 'data/raw/fire-access-route-registry/fire-access-route-registry.csv', headers: ['項次編號','行政區代碼','里別','列管名稱','列管要件','搶救困難地區場所','轄區分隊','聯絡電話'], historicalAcquiredAt: '2026-07-13T03:45:26.913Z' },
  { key: 'B', datasetId: '95c2eed3-8253-4dce-bf8e-1d6a01517514', resourceId: 'cd4ec60e-8d53-48a5-bbf1-9ec1f2afc20b', legacy: 'data/raw/narrow-alley-red-yellow-registry/records.csv', headers: ['項次編號','分類','行政區代碼','分隊名稱','巷道名稱','寬度','備註'], historicalAcquiredAt: null },
  { key: 'C', datasetId: '0f322478-e09b-46af-8019-caeaa79678d7', resourceId: '577b3810-49b7-44fd-a5b7-97897bb50f9e', legacy: 'data/raw/fire-rescue-difficult-areas/fire-rescue-difficult-areas.csv', headers: ['項次編號','評分等級','認定項目','行政區編號','地址','場所名稱'], historicalAcquiredAt: '2026-07-03T00:48:59.979Z' },
] as const;
const districts = ['松山區','信義區','大安區','中山區','中正區','大同區','萬華區','文山區','南港區','內湖區','士林區','北投區'];
export const districtNames = Object.fromEntries(districts.map((name, i) => [String(63000010 + i * 10), name]));
export function decodeSource(bytes: Uint8Array, encoding = 'utf-8') {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Source byte limit');
  if (!['utf-8','big5'].includes(encoding.toLowerCase())) throw new Error('Unapproved encoding');
  const text = new TextDecoder(encoding, { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  if (text.includes('\uFFFD') || text.includes('\u0000')) throw new Error('Invalid CSV encoding');
  return text;
}
function validateQuotes(text: string) {
  let state: 'start' | 'plain' | 'quoted' | 'closed' = 'start';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (state === 'quoted') { if (c === '"' && text[i + 1] === '"') i++; else if (c === '"') state = 'closed'; }
    else if (c === ',' || c === '\r' || c === '\n') state = 'start';
    else if (c === '"') { if (state !== 'start') throw new Error('Malformed quote'); state = 'quoted'; }
    else { if (state === 'closed') throw new Error('Quoted suffix'); state = 'plain'; }
  }
  if (state === 'quoted') throw new Error('Unclosed quote');
}
export function parseSource(bytes: Uint8Array, key: SourceKey, encoding = 'utf-8'): Candidate[] {
  const text = decodeSource(bytes, encoding); validateQuotes(text);
  const [header, ...lines] = parseCsv(text), config = CONFIG.find(x => x.key === key)!;
  if (!header || JSON.stringify(header) !== JSON.stringify(config.headers)) throw new Error('Source schema mismatch');
  const sha = hash(bytes), occurrences = new Map<string, number>();
  const result: Candidate[] = lines.flatMap((cells, index): Candidate[] => {
    if (!cells.some(x => x.trim())) return [];
    if (cells.length !== header.length) throw new Error('Malformed row width');
    const original = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    const sequence = original['項次編號'], districtCode = (original['行政區代碼'] ?? original['行政區編號']).trim();
    const district = districtNames[districtCode] ?? '', name = original[key === 'A' ? '列管名稱' : key === 'B' ? '巷道名稱' : '地址'];
    const category = original[key === 'A' ? '列管要件' : key === 'B' ? '分類' : '評分等級'];
    const rowHash = hash(JSON.stringify(original)); const occurrence = (occurrences.get(rowHash) ?? 0) + 1; occurrences.set(rowHash, occurrence);
    const identity = parseRoadIdentity(name), width = widthEvidence(original['寬度'] ?? '');
    const issues: string[] = [];
    if (!sequence.trim()) issues.push('missing-sequence');
    if (!district) issues.push('unknown-district');
    if (!name.trim()) issues.push('missing-name');
    if (!category?.trim()) issues.push('unknown-category');
    if (key === 'A' && !['火災搶救困難地區','囊底路','社區參與','長巷道','火災搶救困難地區及囊底路'].includes(category.trim())) issues.push('unknown-category');
    if (key === 'C' && !/^[1-9]$/.test(original['認定項目'].trim())) issues.push('unknown-recognition');
    if (key === 'B' && !['紅區','黃區'].includes(category.trim())) issues.push('unknown-category');
    if (key === 'C' && !['1','2'].includes(category.trim())) issues.push('unknown-category');
    if (identity.embeddedDistrict && identity.embeddedDistrict !== district) issues.push('district-label-conflict');
    if (!identity.base) issues.push('unparseable-road-label');
    if (!identity.complete) issues.push('incomplete-extent');
    if (identity.broad || identity.intersection) issues.push('broad-or-intersection-address');
    const villages = (original['里別'] ?? '').split(/[、,，\/]/).map(x => x.trim()).filter(Boolean);
    if (villages.length > 1) issues.push('multiple-village-labels');
    if (key === 'B') issues.push(width.status);
    if (key === 'C') issues.push('edition-comparability-gap');
    issues.push('unverified-classification-definition','missing-geographic-evidence');
    const raw = { ...original }; delete raw['聯絡電話'];
    return [{ id: `${key}-${sha.slice(0, 16)}-s${encodeURIComponent(sequence)}-${rowHash.slice(0, 12)}-o${occurrence}`, sourceKey: key, sourceSha256: sha, row: index + 2,
      sequence, districtCode, district, name, place: original['場所名稱'] ?? '', station: original['轄區分隊'] ?? original['分隊名稱'] ?? '',
      villages, category, recognition: original['認定項目'] ?? '', widthRaw: original['寬度'] ?? '', widthNumeric: null, widthUnit: 'unknown',
      identity, raw, issues, tier: documentaryTier(issues), eligible: true }];
  });
  if (!result.length || result.length > 10000) throw new Error('Empty/oversized population');
  const serials = new Map<string, number>(), identities = new Map<string, number>();
  for (const r of result) { serials.set(r.sequence, (serials.get(r.sequence) ?? 0) + 1); const id = `${r.districtCode}|${normalizeRoadText(r.name)}|${normalizeRoadText(r.place)}`; identities.set(id, (identities.get(id) ?? 0) + 1); }
  for (const r of result) {
    if (r.sequence && serials.get(r.sequence)! > 1) r.issues.push('duplicate-sequence');
    if (identities.get(`${r.districtCode}|${normalizeRoadText(r.name)}|${normalizeRoadText(r.place)}`)! > 1) r.issues.push('duplicate-identity');
    r.tier = documentaryTier(r.issues);
  }
  return result;
}
export async function download(url: string, kind: 'catalogue' | 'resource', fetcher: typeof fetch = fetch) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.hostname !== 'data.taipei' || (kind === 'catalogue' ? u.pathname !== '/dataset/detail' || !CONFIG.some(c => c.datasetId === u.searchParams.get('id')) : u.pathname !== '/api/frontstage/tpeod/dataset/resource.download' || !CONFIG.some(c => c.resourceId === u.searchParams.get('rid')))) throw new Error('Unapproved host/resource');
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !response.body || Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('Bounded fetch failed');
  if (!(kind === 'catalogue' ? /text\/html/i : /text\/(csv|plain)|application\/(octet-stream|csv|vnd.ms-excel)/i).test(contentType)) throw new Error('Unexpected content type');
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_BYTES) throw new Error('Download exceeds limit'); chunks.push(value); } } finally { await reader.cancel(); }
  if (!size) throw new Error('Empty download');
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return { bytes, contentType };
}
export async function validateEditions(editions: SourceEdition[]) {
  if (editions.length !== 3 || editions.some((x, i) => x.key !== CONFIG[i].key)) throw new Error('Source registry mismatch');
  const candidates: Candidate[] = [];
  for (const [i, e] of editions.entries()) {
    const config = CONFIG[i];
    if (e.datasetId !== config.datasetId || e.resourceId !== config.resourceId || e.catalogueUrl !== `https://data.taipei/dataset/detail?id=${config.datasetId}` || e.resourceUrl !== `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${config.resourceId}` || !e.filename.startsWith(RAW + '/pending/') || !/^data\/raw\/fire-rescue-access-policy\/pending\/[\d-]+\/[ABC]\.csv$/.test(e.filename) || e.catalogueFile !== e.filename.replace('.csv','-catalogue.html')) throw new Error('Source registry/path mismatch');
    const bytes = await readFile(e.filename), catalogue = await readFile(e.catalogueFile);
    if (hash(bytes) !== e.sha256 || bytes.length !== e.bytes || hash(catalogue) !== e.catalogueSha256) throw new Error('Original-byte integrity mismatch');
    const metadata = catalogueMetadata(new TextDecoder('utf-8', { fatal: true }).decode(catalogue), config.datasetId, config.resourceId);
    if (!/消防局/.test(metadata.publisher) || metadata.publisher !== e.publisher || metadata.title !== e.title || metadata.resourceUpdatedAt !== e.resourceUpdatedAt || metadata.catalogueUpdatedAt !== e.catalogueUpdatedAt || !/^\d{4}-\d\d-\d\dT.*Z$/.test(e.acquiredAt) || e.license !== 'https://data.taipei/rule' || !/text\/(csv|plain)|application\/(octet-stream|csv|vnd.ms-excel)/i.test(e.contentType) || !Number.isFinite(Date.parse(e.acquiredAt)) || new Date(e.acquiredAt).toISOString() !== e.acquiredAt) throw new Error('Missing/mismatched official metadata');
    const rows = parseSource(bytes, e.key, e.encoding);
    if (e.rowCount !== rows.length || JSON.stringify(e.schema) !== JSON.stringify(config.headers)) throw new Error('Source count/schema mismatch');
    candidates.push(...rows);
  }
  return candidates;
}
export async function loadAccepted() {
  const sources: SourceEdition[] = JSON.parse(await readFile(`${RAW}/sources.json`, 'utf8'));
  if (sources.some(x => x.status !== 'accepted')) throw new Error('Unaccepted edition');
  return { sources, candidates: await validateEditions(sources) };
}
export async function stageRefresh() {
  const directory = `${RAW}/pending/${new Date().toISOString().replace(/[^\d]/g, '-')}`;
  await mkdir(directory, { recursive: true }); const sources: SourceEdition[] = [];
  const completed: { source: string; stage: string; filename: string; sha256: string; bytes: number }[] = [];
  try {
    for (const config of CONFIG) {
      const catalogueUrl = `https://data.taipei/dataset/detail?id=${config.datasetId}`, resourceUrl = `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${config.resourceId}`;
      const filename = `${directory}/${config.key}.csv`, catalogueFile = `${directory}/${config.key}-catalogue.html`;
      const cat = await download(catalogueUrl, 'catalogue');
      await writeFile(catalogueFile, cat.bytes); completed.push({ source: config.key, stage: 'catalogue', filename: catalogueFile, sha256: hash(cat.bytes), bytes: cat.bytes.length });
      const metadata = catalogueMetadata(new TextDecoder().decode(cat.bytes), config.datasetId, config.resourceId);
      const incoming = await download(resourceUrl, 'resource');
      await writeFile(filename, incoming.bytes); completed.push({ source: config.key, stage: 'resource', filename, sha256: hash(incoming.bytes), bytes: incoming.bytes.length });
      let encoding = 'utf-8'; try { decodeSource(incoming.bytes); } catch { encoding = 'big5'; decodeSource(incoming.bytes, encoding); }
      const rows = parseSource(incoming.bytes, config.key, encoding), legacy = await readFile(config.legacy);
      let legacyEncoding = 'utf-8'; try { decodeSource(legacy); } catch { legacyEncoding = 'big5'; }
      const old = parseSource(legacy, config.key, legacyEncoding);
      const gitBytes = execFileSync('git', ['show', `HEAD:${config.legacy}`], { maxBuffer: MAX_BYTES });

      sources.push({ key: config.key, datasetId: config.datasetId, resourceId: config.resourceId, title: metadata.title, publisher: metadata.publisher,
        catalogueUrl, resourceUrl, resourceUpdatedAt: metadata.resourceUpdatedAt, catalogueUpdatedAt: metadata.catalogueUpdatedAt, referenceTime: null,
        acquiredAt: new Date().toISOString(), historicalAcquiredAt: config.historicalAcquiredAt, filename, catalogueFile,
        catalogueSha256: hash(cat.bytes), sha256: hash(incoming.bytes), bytes: incoming.bytes.length, encoding, rowCount: rows.length,
        schema: [...config.headers], contentType: incoming.contentType, license: 'https://data.taipei/rule', status: 'pending',
        legacy: { path: config.legacy, sha256: hash(legacy), gitSha256: hash(gitBytes), rows: old.length,
          sameParsedRows: JSON.stringify(rows.map(x => x.raw)) === JSON.stringify(old.map(x => x.raw)), sameHttpBytes: hash(legacy) === hash(incoming.bytes) } });
    }
    await validateEditions(sources); await atomicJson(`${directory}/sources.json`, sources);
    return directory;
  } catch (error) { await atomicJson(`${directory}/failure.json`, { status: 'rejected-refresh', completed, error: String(error) }); throw error; }
}
