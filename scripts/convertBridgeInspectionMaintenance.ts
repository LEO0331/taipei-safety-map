import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { decodeCsvBuffer, parseCsv, writeJson } from './shared.ts';

const sourcePageUrl = 'https://data.taipei/dataset/detail?id=27135efa-d43e-406d-a3e4-fcb07efb3982';
const sourceFile = 'data/raw/bridge-inspection-maintenance/records.csv';
const [header = [], ...rows] = parseCsv(decodeCsvBuffer(await readFile(sourceFile)));
const columns = header.map((value) => value.replace(/^\uFEFF/, '').trim());
const required = ['序號', '橋梁名稱', '轄區', '管轄單位', '管轄單位機關代碼', '最近一期檢測年度', '檢測結果', '最近一期維護年度', '委託維修單位', '年度維修經費金額', '維修結果'];
if (required.some((name) => !columns.includes(name))) throw new Error(`Unexpected bridge CSV schema: ${columns.join(', ')}`);
const clean = (value: string | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
const normalizeName = (value: string) => value.replace(/[（）()\s　]/g, '').replace(/臺/g, '台').toLowerCase();
const parseYear = (raw: string) => {
  const match = raw.replace(/[\s,，]/g, '').match(/^(\d{2,4})(?:年)?$/); if (!match) return null;
  const sourceYear = Number(match[1]); const year = sourceYear < 1911 ? sourceYear + 1911 : sourceYear;
  return year >= 1900 && year <= 2100 ? year : null;
};
const parseMoney = (raw: string) => {
  const value = raw.replace(/[\s,，]|NT\$|元/gi, '');
  return /^\d+(?:\.\d+)?$/.test(value) && Number(value) >= 0 ? Number(value) : null;
};
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
const exactRows = new Set<string>(); const duplicateRows: number[] = [];
const records = rows.flatMap((row, index) => {
  const originalValues = Object.fromEntries(columns.map((name, columnIndex) => [name, clean(row[columnIndex])]));
  if (!Object.values(originalValues).some(Boolean)) return [];
  const signature = JSON.stringify(originalValues); if (exactRows.has(signature)) { duplicateRows.push(index + 2); return []; } exactRows.add(signature);
  const bridgeName = originalValues['橋梁名稱']; const inspectionYearRaw = originalValues['最近一期檢測年度']; const maintenanceYearRaw = originalValues['最近一期維護年度']; const maintenanceCostRaw = originalValues['年度維修經費金額'];
  const inspectionYear = parseYear(inspectionYearRaw); const maintenanceYear = parseYear(maintenanceYearRaw); const maintenanceCost = parseMoney(maintenanceCostRaw);
  const warnings = [!bridgeName && 'missingBridgeName', !originalValues['轄區'] && 'missingDistrict', !inspectionYearRaw && 'missingInspectionYear', inspectionYearRaw && inspectionYear === null && 'malformedInspectionYear', !originalValues['檢測結果'] && 'missingInspectionResult', !maintenanceYearRaw && 'missingMaintenanceYear', maintenanceYearRaw && maintenanceYear === null && 'malformedMaintenanceYear', !maintenanceCostRaw && 'missingMaintenanceCost', maintenanceCostRaw && maintenanceCost === null && 'malformedMaintenanceCost', !originalValues['維修結果'] && 'missingMaintenanceResult'].filter(Boolean) as string[];
  return [{ id: originalValues['序號'] ? `bridge-${originalValues['序號']}` : `bridge-${hash(originalValues)}`, module: 'bridge_inspection_maintenance', sourceSequenceNumber: originalValues['序號'], bridgeName, bridgeNameNormalized: normalizeName(bridgeName), district: originalValues['轄區'], authority: originalValues['管轄單位'], authorityCode: originalValues['管轄單位機關代碼'], inspectionYearRaw, inspectionYear, inspectionResultRaw: originalValues['檢測結果'], inspectionResult: originalValues['檢測結果'], maintenanceYearRaw, maintenanceYear, maintenanceUnit: originalValues['委託維修單位'], maintenanceCostRaw, maintenanceCost, maintenanceResultRaw: originalValues['維修結果'], maintenanceResult: originalValues['維修結果'], hasMaintenanceRecord: Boolean(maintenanceYear || maintenanceCost !== null || originalValues['維修結果']), dataQualityWarnings: warnings, originalValues, sourceRowNumber: index + 2 }];
});
const bridgeKeys = new Set(records.map((record) => `${record.bridgeNameNormalized}|${record.district}|${record.authority}`));
const dataQuality = { inputRows: rows.filter((row) => row.some((value) => clean(value))).length, outputRows: records.length, uniqueBridges: bridgeKeys.size, duplicateExactRows: duplicateRows.length, missingInspectionYear: records.filter((record) => !record.inspectionYear).length, missingInspectionResult: records.filter((record) => !record.inspectionResult).length, missingMaintenanceYear: records.filter((record) => !record.maintenanceYear).length, missingMaintenanceCost: records.filter((record) => record.maintenanceCost === null).length, missingMaintenanceResult: records.filter((record) => !record.maintenanceResult).length, malformedYears: records.filter((record) => record.dataQualityWarnings.some((warning) => warning.includes('malformed') && warning.includes('Year'))).length, malformedMaintenanceCosts: records.filter((record) => record.dataQualityWarnings.includes('malformedMaintenanceCost')).length };
await writeJson('public/data/bridge-inspection-maintenance/records.json', records);
await writeJson('public/data/bridge-inspection-maintenance/metadata.json', { module: 'bridge_inspection_maintenance', datasetId: '27135efa-d43e-406d-a3e4-fcb07efb3982', datasetTitle: '臺北市橋梁檢測及維修資料', sourcePageUrl, sourceAgency: '臺北市政府工務局新建工程處', sourceFileUpdatedAt: '2025-06-23T15:55:02+08:00', metadataUpdatedAt: '2026-07-07T14:20:25+08:00', localRefreshAt: new Date().toISOString(), recordCount: records.length, uniqueBridgeCount: bridgeKeys.size, fields: columns, coordinateCoverage: { matched: 0, total: bridgeKeys.size, note: 'The source contains no coordinates or bridge geometry, and no reliable existing project join was found. No bridge locations are mapped.' }, dataQuality, limitations: 'This source is a published bridge inspection and maintenance record. Older inspection information is not a safety classification; maintenance spending does not measure danger; and a maintenance record does not by itself establish a structural problem.' });
console.log(`Converted ${records.length} bridge records for ${bridgeKeys.size} unique bridges.`);
