import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { decodeCsvBuffer, parseCsv, writeJson } from './shared.ts';

const sourcePageUrl = 'https://data.taipei/dataset/detail?id=cbeb7c62-85c8-4e1f-9d5e-bcb43339196b';
const sourceFile = 'data/raw/business-hygiene-violation-cases/records.csv';
const [header = [], ...rows] = parseCsv(decodeCsvBuffer(await readFile(sourceFile)));
const columns = header.map((value) => value.replace(/^\uFEFF/, '').trim());
const column = (name: string) => columns.indexOf(name);
const fields = {
  sequence: column('項次'), date: column('日期'), description: column('違規情節'), fine: column('罰鍰金額數'), note: column('罰則註記'),
};
if (Object.values(fields).some((index) => index < 0)) throw new Error(`Unexpected business-hygiene CSV schema: ${columns.join(', ')}`);
const clean = (value: string | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
const parseDate = (raw: string) => {
  const match = raw.match(/^(\d{3,4})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{1,2})$/);
  if (!match) return null;
  const sourceYear = Number(match[1]); const year = sourceYear < 1911 ? sourceYear + 1911 : sourceYear;
  const month = Number(match[2]); const day = Number(match[3]); const date = new Date(Date.UTC(year, month - 1, day));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, rocYear: sourceYear < 1911 ? sourceYear : null, gregorianYear: year, month }
    : null;
};
const parseFine = (raw: string) => {
  const value = raw.replace(/[,，\s]|NT\$/gi, '');
  return /^\d+(?:\.\d+)?$/.test(value) && Number(value) >= 0 ? Number(value) : null;
};
type Category = 'facility_hygiene' | 'sanitation_equipment' | 'staff_hygiene' | 'cleaning_disinfection' | 'water_quality' | 'pest_control' | 'administrative' | 'other' | 'unknown';
const classify = (description: string): Category[] => {
  const rules: Array<[Category, RegExp]> = [
    ['water_quality', /水質|餘氯|大腸桿菌|菌落/], ['staff_hygiene', /從業人員|健康檢查|體檢/], ['pest_control', /病媒|蟲|鼠/],
    ['cleaning_disinfection', /清洗|消毒|發霉|黴|清潔/], ['sanitation_equipment', /急救箱|冷卻水塔|設備/], ['administrative', /衛生管理|自主管理|紀錄|證書|標示|應變措施/],
  ];
  const matches = rules.filter(([, expression]) => expression.test(description)).map(([category]) => category);
  return matches.length ? matches : description ? ['other'] : ['unknown'];
};
const references = (note: string) => [...new Set(note.match(/(?:臺北[市巿]營業衛生管理自治條例|臺北市營業衛生管理自治條例事件統一裁罰基準)第\d+條(?:第\d+項)?(?:第\d+款)?|第\d+點第\d+項/g) ?? [])];
const exactRows = new Set<string>(); const exactDuplicateRows: number[] = [];
const records = rows.flatMap((row, index) => {
  const originalValues = Object.fromEntries(columns.map((name, columnIndex) => [name, clean(row[columnIndex])]));
  if (!Object.values(originalValues).some(Boolean)) return [];
  const signature = JSON.stringify(originalValues); if (exactRows.has(signature)) { exactDuplicateRows.push(index + 2); return []; } exactRows.add(signature);
  const sourceSequenceNumber = originalValues['項次']; const dateRaw = originalValues['日期']; const parsedDate = parseDate(dateRaw);
  const violationDescriptionRaw = originalValues['違規情節']; const fineAmountRaw = originalValues['罰鍰金額數']; const fineAmountTwd = parseFine(fineAmountRaw);
  const penaltyNoteRaw = originalValues['罰則註記']; const warnings = [
    !sourceSequenceNumber && 'missingSequenceNumber', dateRaw && !parsedDate && 'malformedDate', !violationDescriptionRaw && 'missingViolationDescription',
    !fineAmountRaw && 'missingFineAmount', fineAmountRaw && fineAmountTwd === null && 'malformedFineAmount', !penaltyNoteRaw && 'missingPenaltyNote',
    fineAmountTwd !== null && fineAmountTwd > 100000 && 'unusuallyLargeFine',
  ].filter(Boolean) as string[];
  return [{ id: sourceSequenceNumber ? `business-hygiene-${sourceSequenceNumber}-${dateRaw}` : `business-hygiene-${hash(originalValues)}`, module: 'business_hygiene_violation_cases', sourceSequenceNumber,
    dateRaw, date: parsedDate?.date ?? null, rocYear: parsedDate?.rocYear ?? null, gregorianYear: parsedDate?.gregorianYear ?? null, month: parsedDate?.month ?? null,
    violationDescriptionRaw, violationDescription: violationDescriptionRaw, fineAmountRaw, fineAmountTwd, penaltyNoteRaw, penaltyNote: penaltyNoteRaw,
    violationKeywords: classify(violationDescriptionRaw), penaltyReferences: references(penaltyNoteRaw), hasValidDate: Boolean(parsedDate), hasValidFine: fineAmountTwd !== null,
    hasViolationDescription: Boolean(violationDescriptionRaw), hasPenaltyNote: Boolean(penaltyNoteRaw), dataQualityWarnings: warnings, originalValues, sourceRowNumber: index + 2 }];
});
const count = (predicate: (record: typeof records[number]) => boolean) => records.filter(predicate).length;
const categoryCounts = records.flatMap((record) => record.violationKeywords).reduce<Record<string, number>>((totals, key) => ({ ...totals, [key]: (totals[key] ?? 0) + 1 }), {});
const duplicateSequenceNumbers = Object.values(records.reduce<Record<string, number>>((totals, record) => ({ ...totals, ...(record.sourceSequenceNumber ? { [record.sourceSequenceNumber]: (totals[record.sourceSequenceNumber] ?? 0) + 1 } : {}) }), {})).filter((value) => value > 1).length;
const validFines = records.flatMap((record) => record.fineAmountTwd === null ? [] : [record.fineAmountTwd]);
await writeJson('public/data/business-hygiene-violation-cases/records.json', records);
await writeJson('public/data/business-hygiene-violation-cases/metadata.json', { module: 'business_hygiene_violation_cases', datasetId: 'cbeb7c62-85c8-4e1f-9d5e-bcb43339196b', datasetTitle: '臺北市違反台北市營業衛生管理自治條例違規案件', resourceTitle: '臺北市政府衛生局113年1-10月營業衛生相關法規違規裁處確定案件一覽表', sourcePageUrl, sourceAgency: '臺北市政府衛生局', sourceFileUpdatedAt: '2025-06-16T13:13:42+08:00', metadataUpdatedAt: '2026-07-13T16:14:44+08:00', ingestionDate: new Date().toISOString().slice(0, 10), historical: true, fields: columns, recordCount: records.length, earliestValidDate: records.filter((record) => record.date).map((record) => record.date).sort()[0] ?? null, latestValidDate: records.filter((record) => record.date).map((record) => record.date).sort().at(-1) ?? null, validFineCount: validFines.length, invalidFineCount: records.length - validFines.length, totalParsedFineAmount: validFines.reduce((total, value) => total + value, 0), derivedCategoryCounts: categoryCounts, dataQuality: { inputRows: rows.filter((row) => row.some((value) => clean(value))).length, outputRows: records.length, exactDuplicateRows: exactDuplicateRows.length, missingSequenceNumber: count((record) => record.dataQualityWarnings.includes('missingSequenceNumber')), duplicateSequenceNumbers, malformedDate: count((record) => record.dataQualityWarnings.includes('malformedDate')), missingViolationDescription: count((record) => record.dataQualityWarnings.includes('missingViolationDescription')), missingFineAmount: count((record) => record.dataQualityWarnings.includes('missingFineAmount')), malformedFineAmount: count((record) => record.dataQualityWarnings.includes('malformedFineAmount')), missingPenaltyNote: count((record) => record.dataQualityWarnings.includes('missingPenaltyNote')), unusuallyLargeFine: count((record) => record.dataQualityWarnings.includes('unusuallyLargeFine')), unknownDerivedCategory: count((record) => record.violationKeywords.includes('unknown')) } });
console.log(`Converted ${records.length} business hygiene violation records.`);
