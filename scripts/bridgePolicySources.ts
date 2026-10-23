import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { decodeCsvBuffer, parseCsv } from './shared.ts';
import { identityGroup } from '../src/lib/bridgePolicyIdentity.ts';
import { parsePolicyCost, parsePolicyYear, ANALYSIS_DATE } from '../src/lib/bridgePolicy.ts';
import { validateGeography } from '../src/lib/bridgePolicyGeography.ts';
import type { InspectionRow, InventoryRow, SourceEdition } from '../src/types/bridgePolicy.ts';

export const RAW = 'data/raw/bridge-policy';
export const A_PATH = 'data/raw/bridge-inspection-maintenance/records.csv';
export const MAX_BYTES = 5_000_000;
export const hashBytes = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export const REQUIRED_A = ['序號', '橋梁名稱', '轄區', '管轄單位', '管轄單位機關代碼', '最近一期檢測年度', '檢測結果', '最近一期維護年度', '委託維修單位', '年度維修經費金額', '維修結果'];
export const REQUIRED_B = ['ID', 'non_bridge', 'bridge_id', 'bridge_name', 'adm', 'section', 'CountyCode', 'AreaCode', 'inspect_rate', 'Longitude_start', 'Latitude_start', 'Longitude_end', 'Latitude_end', 'Obj_Longitude', 'Obj_Latitude'];
export const DISTRICTS = ['松山區', '信義區', '大安區', '中山區', '中正區', '大同區', '萬華區', '文山區', '南港區', '內湖區', '士林區', '北投區'];
export const SOURCE_CONFIG = [
  { key: 'A', datasetId: '27135efa-d43e-406d-a3e4-fcb07efb3982', title: '臺北市橋梁檢測及維修資料', resourceId: '9a1f7632-67e1-4d81-bcb0-6a6b4c721868', resourceUpdatedAt: '2025-06-23T15:55:02+08:00', catalogueUpdatedAt: '2026-09-22T19:09:08+08:00', format: 'CSV' },
  { key: 'B', datasetId: '866a9982-0a63-421f-b120-9144fc6ce732', title: '臺北市橋梁資訊', resourceId: '68d6c971-d077-4578-a52e-e42db765f861', resourceUpdatedAt: '2025-12-16T09:41:34+08:00', catalogueUpdatedAt: '2026-09-22T19:13:04+08:00', format: 'JSON' },
] as const;

export function catalogueMetadata(html: string, datasetId: string, resourceId: string) {
  const script = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!script) throw new Error('Catalogue metadata envelope changed');
  const graph = JSON.parse(script[1]) as unknown[];
  const nodes = graph.filter((x): x is Record<string, number> => Boolean(x) && typeof x === 'object' && !Array.isArray(x));
  const dataset = nodes.find(x => graph[x.pid] === datasetId && 'resources' in x);
  const resource = nodes.find(x => graph[x.rid] === resourceId && 'file_name' in x);
  if (!dataset || !resource || !(graph[dataset.resources] as number[]).some(index => graph[index] === resource)) throw new Error('Catalogue/resource relationship missing');
  const timestamp = (value: unknown) => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) throw new Error('Unknown publisher timestamp precision'); return value.replace(' ', 'T') + '+08:00'; };
  return { resourceUpdatedAt: timestamp(graph[resource.last_modified]), catalogueUpdatedAt: timestamp(graph[dataset.metadata_changed]),
    originalFilename: String(graph[resource.file_name]), encoding: String(graph[resource.encoding]),
    refreshFrequency: String(graph[dataset.update_freq_desc]), title: String(graph[dataset.title]), publisher: String(graph[dataset.maintainer_organization_name]) };
}

export function checkSize(bytes: Uint8Array) { if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Empty or oversized source'); }
export function verifyHash(bytes: Uint8Array, expected: string) { checkSize(bytes); if (hashBytes(bytes) !== expected) throw new Error('Source hash mismatch'); }
export function parseInspectionSource(bytes: Uint8Array): InspectionRow[] {
  checkSize(bytes);
  const text = decodeCsvBuffer(bytes);
  if (text.includes('\uFFFD')) throw new Error('Undecodable CSV');
  // Validate RFC-style quote placement before using the existing shared parser.
  let state: 'start' | 'plain' | 'quoted' | 'closed' = 'start';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (state === 'quoted') {
      if (char === '"' && text[i + 1] === '"') i++;
      else if (char === '"') state = 'closed';
    } else if (char === ',' || char === '\n' || char === '\r') state = 'start';
    else if (char === '"') { if (state !== 'start') throw new Error('Malformed CSV quote placement'); state = 'quoted'; }
    else { if (state === 'closed') throw new Error('Malformed CSV quoted suffix'); state = 'plain'; }
  }
  if (state === 'quoted') throw new Error('Malformed CSV quote');
  const [header, ...rows] = parseCsv(text);
  if (!header || new Set(header).size !== header.length || REQUIRED_A.some(x => !header.includes(x))) throw new Error('CSV schema drift / duplicate headers');
  const sha = hashBytes(bytes);
  const result = rows.flatMap((values, index): InspectionRow[] => {
    if (!values.some(x => x.trim())) return [];
    if (values.length !== header.length) throw new Error(`Malformed CSV row ${index + 2}`);
    const raw = Object.fromEntries(header.map((key, i) => [key, values[i]]));
    const inspectionYear = parsePolicyYear(raw['最近一期檢測年度']);
    const maintenanceYear = parsePolicyYear(raw['最近一期維護年度']);
    const cost = parsePolicyCost(raw['年度維修經費金額']);
    const issues: string[] = [];
    for (const [key, code] of [['橋梁名稱', 'name'], ['轄區', 'district'], ['管轄單位', 'authority'], ['最近一期檢測年度', 'inspection-year'], ['最近一期維護年度', 'maintenance-year'], ['檢測結果', 'inspection-result'], ['維修結果', 'maintenance-result'], ['年度維修經費金額', 'maintenance-cost']]) if (!raw[key].trim()) issues.push(`missing-${code}`);
    for (const [field, year, code] of [[raw['最近一期檢測年度'], inspectionYear, 'inspection-year'], [raw['最近一期維護年度'], maintenanceYear, 'maintenance-year']] as const) {
      if (field.trim() && year === null) issues.push(`malformed-${code}`);
      if (year !== null && year > Number(ANALYSIS_DATE.slice(0, 4))) issues.push(`future-${code}`);
    }
    if (raw['年度維修經費金額'].trim() && cost === null) issues.push('malformed-maintenance-cost');
    const name = raw['橋梁名稱'].trim(), district = raw['轄區'].trim(), authority = raw['管轄單位'].trim();
    return [{ id: `A-${sha.slice(0, 16)}-r${index + 2}-${hashBytes(JSON.stringify(raw)).slice(0, 12)}`, row: index + 2,
      sequence: raw['序號'], group: identityGroup(name, district, authority), name, district, authority, inspectionYear, maintenanceYear, cost, raw, issues }];
  });
  for (const row of result) {
    if (row.sequence && result.filter(x => x.sequence === row.sequence).length > 1) row.issues.push('duplicate-sequence');
    const group = result.filter(x => x.group === row.group);
    if (new Set(group.map(x => JSON.stringify([x.inspectionYear, x.raw['檢測結果'], x.maintenanceYear, x.cost, x.raw['維修結果']]))).size > 1) row.issues.push('conflicting-group-records');
  }
  return result;
}
export function parseInventorySource(bytes: Uint8Array): InventoryRow[] {
  checkSize(bytes);
  const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!Array.isArray(parsed) || !parsed.length || parsed.length > 10000) throw new Error('Inventory envelope / empty array drift');
  const rows = parsed as Record<string, unknown>[];
  if (rows.some(row => !row || typeof row !== 'object' || REQUIRED_B.some(key => !(key in row)))) throw new Error('Inventory schema drift');
  const text = (v: unknown) => v === null || v === undefined ? '' : String(v).trim();
  const sha = hashBytes(bytes);
  return rows.map((raw, index) => {
    const sourceId = text(raw.ID), bridgeId = text(raw.bridge_id), issues: string[] = [];
    if (!sourceId) issues.push('missing-ID');
    if (sourceId && !/^\d+$/.test(sourceId)) issues.push('malformed-ID');
    if (raw.bridge_id !== null && typeof raw.bridge_id !== 'string') issues.push('malformed-bridge-id');
    if (sourceId && rows.filter(x => text(x.ID) === sourceId).length > 1) issues.push('duplicate-ID');
    if (!bridgeId) issues.push('missing-bridge-id');
    if (bridgeId && rows.filter(x => text(x.bridge_id) === bridgeId).length > 1) issues.push('duplicate-bridge-id');
    if (!text(raw.bridge_name)) issues.push('missing-name');
    if (!text(raw.section)) issues.push('missing-authority');
    if (text(raw.non_bridge) !== '橋梁') issues.push('non-bridge-category');
    for (const key of ['total_length', 'width_max', 'width_min']) if (text(raw[key]) && (!Number.isFinite(Number(raw[key])) || Number(raw[key]) < 0 || Number(raw[key]) > (key === 'total_length' ? 15000 : 200))) issues.push(`suspicious-${key}`);
    const district = DISTRICTS[Array.from({ length: 12 }, (_, i) => String(63000010 + i * 10)).indexOf(text(raw.AreaCode))] ?? '';
    const interval = Number(raw.inspect_rate);
    const intervalMonths = text(raw.inspect_rate) && Number.isFinite(interval) && interval > 0 && interval <= 120 ? interval : null;
    if (intervalMonths === null) issues.push('unverified-interval');
    const geography = validateGeography(raw, district);
    if (issues.includes('non-bridge-category')) { geography.status = 'excluded'; geography.level = 'none'; geography.issues.push('outside-bridge-category'); }
    return { id: `B-${sha.slice(0, 16)}-r${index + 1}`, row: index + 1, sourceId, bridgeId, name: text(raw.bridge_name), district,
      authority: text(raw.section), intervalMonths, raw, issues, geography };
  });
}

export async function boundedDownload(url: string, fetcher: typeof fetch = fetch): Promise<Uint8Array> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'data.taipei') throw new Error('Unapproved source host');
  const response = await fetcher(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok || Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error(`Source retrieval failed: ${response.status}`);
  if (!response.body) throw new Error('Empty source body');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > MAX_BYTES) throw new Error('Oversized source stream'); chunks.push(value); } }
  finally { await reader.cancel(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  checkSize(bytes); return bytes;
}
export async function atomicJson(path: string, value: unknown, replace = rename) {
  await mkdir(dirname(path), { recursive: true });
  const pending = `${path}.tmp`;
  await writeFile(pending, JSON.stringify(value, null, 2) + '\n');
  await replace(pending, path);
}
export async function loadAccepted() {
  const sources: SourceEdition[] = JSON.parse(await readFile(`${RAW}/sources.json`, 'utf8'));
  if (sources[0]?.key !== 'A' || sources[0].status !== 'accepted' || (sources[1] && !['accepted', 'unavailable'].includes(sources[1].status))) throw new Error('Unadmitted source manifest');
  const a = await readFile(sources[0].filename); verifyHash(a, sources[0].sha256);
  const b = sources[1]?.status === 'accepted' ? await readFile(sources[1].filename) : null;
  if (b) verifyHash(b, sources[1].sha256);
  return { sources, a: parseInspectionSource(a), b: b ? parseInventorySource(b) : [] };
}
