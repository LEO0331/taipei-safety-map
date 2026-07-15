import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { decodeCsvBuffer, parseCsv, writeJson } from './shared.ts';

type DomesticRecord = { id: string; timeRaw: string; year: number | null; month: number | null; districtName: string; villageName: string; villageCode: string; ageGroup: string; sex: string; caseType: string; reportCount: number | null; originalValues: Record<string, string> };
const raw = await readFile('data/raw/domestic-violence-report-statistics/domestic-violence-report-statistics.csv');
const [head = [], ...rows] = parseCsv(decodeCsvBuffer(raw)); const headers = head.map((value) => value.replace(/^\uFEFF/, '').trim());
const find = (pattern: RegExp) => headers.findIndex((header) => pattern.test(header));
const indexes = { time: find(/^時間$|日期|年月/), district: find(/^區$|行政區/), village: find(/^村里$|里別/), villageCode: find(/村里代碼|里代碼/), age: find(/年齡/), sex: find(/性別/), type: find(/案件類型|類型/), count: find(/^總計$|件數|案件數/) };
const missingHeaders = Object.entries(indexes).filter(([, index]) => index < 0).map(([name]) => name);
if (missingHeaders.length) throw new Error(`Domestic-violence CSV is missing required headers: ${missingHeaders.join(', ')}. Found: ${headers.join(', ')}`);
const invalidDates: string[] = [], invalidCounts: string[] = [], missingGeography: string[] = []; const records: DomesticRecord[] = []; const duplicates = new Map<string, number>();
for (const [rowIndex, row] of rows.filter((item) => item.some((value) => value.trim())).entries()) {
  const values = Object.fromEntries(headers.map((header, index) => [header, (row[index] ?? '').trim()])); const timeRaw = row[indexes.time] ?? '';
  const match = timeRaw.match(/(\d{3,4})\D+(\d{1,2})|^(\d{3,4})(\d{2})$/); const rawYear = Number(match?.[1] ?? match?.[3]); const month = Number(match?.[2] ?? match?.[4]); const year = rawYear ? (rawYear < 1911 ? rawYear + 1911 : rawYear) : null;
  if (!year || !month || month < 1 || month > 12) invalidDates.push(timeRaw); const countRaw = (row[indexes.count] ?? '').replace(/,/g, '').trim(); const reportCount = /^\d+$/.test(countRaw) && Number(countRaw) >= 0 ? Number(countRaw) : null; if (countRaw && reportCount === null) invalidCounts.push(countRaw);
  const districtName = row[indexes.district] ?? '', villageName = row[indexes.village] ?? '', villageCode = row[indexes.villageCode] ?? ''; if (!districtName || !villageName || !villageCode) missingGeography.push(`${districtName}|${villageName}|${villageCode}`);
  const key = [timeRaw, districtName, villageCode, row[indexes.age] ?? '', row[indexes.sex] ?? '', row[indexes.type] ?? ''].join('|'); const ordinal = (duplicates.get(key) ?? 0) + 1; duplicates.set(key, ordinal); if (ordinal > 1) continue;
  records.push({ id: `dv-${createHash('sha256').update(`${key}|${ordinal}|${rowIndex}`).digest('hex').slice(0, 20)}`, timeRaw, year: year && month ? year : null, month: year && month ? month : null, districtName, villageName, villageCode, ageGroup: row[indexes.age] ?? '', sex: row[indexes.sex] ?? '', caseType: row[indexes.type] ?? '', reportCount, originalValues: values });
}
const report = { generatedAt: new Date().toISOString(), headers, inputRows: rows.length, outputRows: records.length, invalidDates: invalidDates.slice(0, 100), invalidCounts: invalidCounts.slice(0, 100), duplicateRows: [...duplicates].filter(([, count]) => count > 1).slice(0, 100), missingGeographicFields: missingGeography.slice(0, 100), unknownCategories: [...new Set(records.filter((record) => !record.ageGroup || !record.sex || !record.caseType).map((record) => `${record.ageGroup}|${record.sex}|${record.caseType}`))] };
await writeJson('public/data/domestic-violence-report-statistics/records.json', records); await writeJson('public/data/domestic-violence-report-statistics/conversion-report.json', report); const global = await readFile('public/data/conversion-report.json', 'utf8').then((value) => JSON.parse(value) as object).catch(() => ({})); await writeJson('public/data/conversion-report.json', { ...global, domesticViolenceReportStatistics: report });
