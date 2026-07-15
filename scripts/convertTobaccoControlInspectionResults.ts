import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { decodeCsvBuffer, parseCsv, writeJson } from './shared.ts';

type LegalVersion = 'old_law' | 'amended_law' | 'unknown';
type Resource = { name: string; year?: number; legalVersion?: LegalVersion; path: string; downloadUrl: string; downloadedAt?: string | null; failure?: string };
type TobaccoRecord = {
  id: string; module: 'tobacco_control_inspection_results'; sourceResourceName: string; sourceResourceYear?: number;
  legalVersion: LegalVersion; districtName: string; districtCode?: string; inspectionCategory: string; normalizedCategory: string;
  inspectionCount?: number; sourceColumnName: string; sourceValueRaw: string; originalArticleText?: string;
};

const status = JSON.parse(await readFile('data/raw/tobacco-control-inspection-results/fetch-status.json', 'utf8')) as { resources: Resource[] };
const districtNames: globalThis.Record<string, string> = {
  '63000000': '臺北市（全市）',
  '63000010': '松山區', '63000020': '信義區', '63000030': '大安區', '63000040': '中山區', '63000050': '中正區', '63000060': '大同區',
  '63000070': '萬華區', '63000080': '文山區', '63000090': '南港區', '63000100': '內湖區', '63000110': '士林區', '63000120': '北投區',
};
const normalizeHeader = (value: string) => value.replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
const parseCount = (value: string) => {
  const text = value.trim().replace(/,/g, '');
  return /^\d+(?:\.0+)?$/.test(text) && Number(text) >= 0 ? Number(text) : undefined;
};
const categoryFor = (column: string) => {
  if (/第5條|販賣|貨架|郵購|包裝/.test(column)) return 'tobacco_sales';
  if (/廣告|促銷|展示/.test(column)) return 'advertising_and_display';
  if (/禁菸|不得吸菸|吸菸室/.test(column)) return 'prohibited_place_smoking';
  if (/未滿(18|20)歲|年齡/.test(column)) return 'age_restrictions';
  if (/標示|警示/.test(column)) return 'warning_signs';
  if (/吸菸區/.test(column)) return 'smoking_areas';
  if (/菸品|指定菸品.*(廣告|促銷)/.test(column)) return 'tobacco_product_promotion';
  if (/其他/.test(column)) return 'other';
  return 'unknown';
};
const articleFor = (column: string) => column.match(/(依)?菸害防制法第[^、，；;]+/)?.[0] ?? undefined;
const records: TobaccoRecord[] = [];
const schemaResources = [] as Array<{ sourceResourceName: string; headers: string[]; rowCount: number; legalVersion: LegalVersion; sourceResourceYear?: number; encoding: string }>;
const invalidCounts: string[] = [];
const missingDistricts: string[] = [];
for (const resource of status.resources) {
  if (resource.failure) continue;
  const buffer = await readFile(resource.path);
  const text = decodeCsvBuffer(buffer);
  const [headerRow = [], ...rows] = parseCsv(text);
  const headers = headerRow.map(normalizeHeader);
  const legalVersion: LegalVersion = resource.legalVersion ?? (/未滿20歲|指定菸品/.test(headers.join('|')) ? 'amended_law' : /未滿18歲/.test(headers.join('|')) ? 'old_law' : 'unknown');
  const sourceResourceYear = resource.year ?? (Number(resource.name.match(/(\d{3})年度/)?.[1]) || undefined);
  schemaResources.push({ sourceResourceName: resource.name, headers, rowCount: rows.filter((row) => row.some((v) => v.trim())).length, legalVersion, sourceResourceYear, encoding: text.includes('\uFFFD') ? 'unknown' : 'UTF-8-SIG, Big5, or CP950 decoded' });
  const districtIndex = headers.findIndex((header) => /行政區|區別|district/i.test(header));
  for (const row of rows.filter((item) => item.some((value) => value.trim()))) {
    const districtValue = (row[districtIndex] ?? '').trim();
    const districtName = districtNames[districtValue] ?? districtValue;
    if (!districtName || !districtNames[districtValue]) missingDistricts.push(`${resource.name}: ${districtValue || '(blank)'}`);
    for (let index = 0; index < headers.length; index += 1) {
      const sourceColumnName = headers[index];
      if (index === districtIndex || /^(總計|合計|total)$/i.test(sourceColumnName)) continue;
      const sourceValueRaw = (row[index] ?? '').trim();
      const inspectionCount = parseCount(sourceValueRaw);
      if (sourceValueRaw && inspectionCount === undefined) invalidCounts.push(`${resource.name}: ${districtName || '(missing district)'} / ${sourceColumnName} = ${sourceValueRaw}`);
      const id = createHash('sha256').update([resource.name, districtName, sourceColumnName, sourceValueRaw].join('|')).digest('hex').slice(0, 20);
      records.push({ id: `tobacco-${id}`, module: 'tobacco_control_inspection_results', sourceResourceName: resource.name, sourceResourceYear, legalVersion, districtName, districtCode: districtValue === '63000000' ? undefined : (districtNames[districtValue] ? districtValue : undefined), inspectionCategory: sourceColumnName, normalizedCategory: categoryFor(sourceColumnName), inspectionCount, sourceColumnName, sourceValueRaw, originalArticleText: articleFor(sourceColumnName) });
    }
  }
}
const duplicateKeys = new Map<string, number>();
for (const record of records) { const key = [record.sourceResourceName, record.districtName, record.sourceColumnName, record.sourceValueRaw].join('|'); duplicateKeys.set(key, (duplicateKeys.get(key) ?? 0) + 1); }
await writeJson('public/data/tobacco-control-inspection-results/records.json', records);
await writeJson('public/data/tobacco-control-inspection-results/schema-report.json', { generatedAt: new Date().toISOString(), resources: schemaResources, schemaDifferences: schemaResources.map((item) => ({ sourceResourceName: item.sourceResourceName, headersOnlyInThisResource: item.headers.filter((header) => !schemaResources.every((other) => other.headers.includes(header))) })), legalVersionRule: 'Resource metadata is preferred; headers containing 未滿20歲 or 指定菸品 are amended_law and headers containing 未滿18歲 are old_law.', categoryMappingRule: 'Normalized categories are convenience labels only; original column and article wording remain authoritative.' });
const moduleReport = { generatedAt: new Date().toISOString(), inputRows: schemaResources.reduce((sum, item) => sum + item.rowCount, 0), outputRows: records.length, schemaDifferences: schemaResources.map((item) => ({ resource: item.sourceResourceName, headerCount: item.headers.length })), invalidCounts: invalidCounts.slice(0, 100), duplicateRows: [...duplicateKeys].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count })).slice(0, 100), missingDistricts: missingDistricts.slice(0, 100), unmappedCategories: [...new Set(records.filter((record) => record.normalizedCategory === 'unknown').map((record) => record.sourceColumnName))] };
await writeJson('public/data/tobacco-control-inspection-results/conversion-report.json', moduleReport);
const globalReport = await readFile('public/data/conversion-report.json', 'utf8').then((value) => JSON.parse(value) as object).catch(() => ({}));
await writeJson('public/data/conversion-report.json', { ...globalReport, tobaccoControlInspectionResults: moduleReport });
console.log(`Converted ${records.length} tobacco-control inspection records.`);
