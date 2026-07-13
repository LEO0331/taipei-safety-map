import { readdir, readFile } from 'node:fs/promises';
import type { ConversionReport, VehicleTowingTopRoadSectionRecord, VehicleTowingTopRoadSectionsSummary } from '../src/types.ts';
import { parseCsv, writeJson } from './shared.ts';

const rawDir = 'data/raw/vehicle-towing-top-road-sections';
const source = '臺北市車輛拖吊前十大路段與件數';
const sourceAgency = '臺北市政府警察局交通警察大隊';
const sourcePageUrl = 'https://data.taipei/dataset/detail?id=3a2098a3-0ef1-45d0-9ba6-dccf7dbd865d';
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').replace(/[，、]/g, ',');
const numberOrNull = (value: string) => {
  const cleaned = value.trim().replace(/,/g, '');
  if (!cleaned || !/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const result = Number(cleaned);
  return Number.isFinite(result) ? result : null;
};
const value = (row: Record<string, string>, field: string) => row[field] ?? '';
const csvFiles = (await readdir(rawDir).catch(() => [])).filter((file) => file.endsWith('.csv')).sort();
if (!csvFiles.length) throw new Error(`No CSV files found in ${rawDir}. Run data:fetch:vehicle-towing or place annual CSVs there.`);

const invalidRows: string[] = [];
const duplicateExamples: string[] = [];
const seen = new Set<string>();
async function readTowingCsv(path: string): Promise<Array<Record<string, string>>> {
  const buffer = await readFile(path);
  const utf8 = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
  // Big5 byte sequences can sometimes decode as non-replacement UTF-8 mojibake.
  // Trust UTF-8 only when the required source header survives intact.
  const text = utf8.includes('年度') && utf8.includes('路段名') ? utf8 : new TextDecoder('big5').decode(buffer).replace(/^\uFEFF/, '');
  const [headers = [], ...rows] = parseCsv(text);
  return rows.filter((row) => row.some((cell) => cell.trim())).map((row) => Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ''])));
}
const inputRows: Array<Record<string, string>> = [];
for (const file of csvFiles) inputRows.push(...await readTowingCsv(`${rawDir}/${file}`));
const base: VehicleTowingTopRoadSectionRecord[] = inputRows.flatMap((row, index) => {
  const yearRaw = value(row, '年度');
  const roadSectionName = value(row, '路段名').trim();
  const towingCountRaw = value(row, '筆數');
  const year = numberOrNull(yearRaw);
  const towingCount = numberOrNull(towingCountRaw);
  if (year === null || towingCount === null || !roadSectionName) {
    if (invalidRows.length < 20) invalidRows.push(`row ${index + 1}: 年度=${yearRaw}, 路段名=${roadSectionName}, 筆數=${towingCountRaw}`);
    return [];
  }
  const roadSectionNameNormalized = normalize(roadSectionName);
  const key = `${year}|${roadSectionNameNormalized}`;
  if (seen.has(key)) { if (duplicateExamples.length < 20) duplicateExamples.push(key); return []; }
  seen.add(key);
  return [{
    id: `vehicle-towing-${year}-${index + 1}`, module: 'vehicle_towing_top_road_sections' as const,
    sourceSequenceNumberRaw: value(row, '序號'), sourceSequenceNumber: numberOrNull(value(row, '序號')),
    yearRaw, year, yearNumber: year, cityName: value(row, '縣市').trim(), cityCode: value(row, '縣市代碼').trim(),
    roadSectionName, roadSectionNameNormalized, towingCountRaw, towingCount, towingCountNumber: towingCount,
    rankWithinYear: null, previousYearRank: null, rankChange: null, previousYearTowingCount: null, yearOverYearChange: null,
    appearanceCount: 0, googleMapsQuery: roadSectionName, source, sourceAgency,
  } satisfies VehicleTowingTopRoadSectionRecord];
});
const appearances = new Map<string, number>();
for (const record of base) appearances.set(record.roadSectionNameNormalized, (appearances.get(record.roadSectionNameNormalized) ?? 0) + 1);
const byYear = new Map<number, VehicleTowingTopRoadSectionRecord[]>();
for (const record of base) byYear.set(record.yearNumber!, [...(byYear.get(record.yearNumber!) ?? []), record]);
for (const records of byYear.values()) records.sort((a, b) => b.towingCountNumber! - a.towingCountNumber! || (a.sourceSequenceNumber ?? 0) - (b.sourceSequenceNumber ?? 0)).forEach((record, index) => { record.rankWithinYear = index + 1; record.appearanceCount = appearances.get(record.roadSectionNameNormalized) ?? 0; });
for (const record of base) {
  const previous = byYear.get(record.yearNumber! - 1)?.find((item) => item.roadSectionNameNormalized === record.roadSectionNameNormalized);
  if (previous) { record.previousYearRank = previous.rankWithinYear; record.rankChange = previous.rankWithinYear! - record.rankWithinYear!; record.previousYearTowingCount = previous.towingCountNumber; record.yearOverYearChange = record.towingCountNumber! - previous.towingCountNumber!; }
}
const records = base.sort((a, b) => b.yearNumber! - a.yearNumber! || a.rankWithinYear! - b.rankWithinYear!);
const years = [...byYear.keys()].sort((a, b) => a - b);
const latestYear = years.at(-1) ?? null;
const highest = records.slice().sort((a, b) => b.towingCountNumber! - a.towingCountNumber!)[0];
const mostFrequent = [...appearances.entries()].sort((a, b) => b[1] - a[1])[0];
const summary: VehicleTowingTopRoadSectionsSummary = {
  totalRecords: records.length, years, latestYear,
  latestYearTotalTowingCount: latestYear ? (byYear.get(latestYear) ?? []).reduce((sum, record) => sum + record.towingCountNumber!, 0) : 0,
  latestYearNumberOneRoadSection: latestYear ? byYear.get(latestYear)?.[0]?.roadSectionName ?? null : null,
  roadSectionsAppearingMultipleYears: [...appearances.values()].filter((count) => count > 1).length,
  highestSingleYearTowingCount: highest ? { roadSectionName: highest.roadSectionName, year: highest.yearNumber!, towingCount: highest.towingCountNumber! } : null,
  mostFrequentRoadSection: mostFrequent ? { roadSectionName: records.find((record) => record.roadSectionNameNormalized === mostFrequent[0])!.roadSectionName, appearanceCount: mostFrequent[1] } : null,
  largestYearOverYearIncrease: records.filter((record) => record.yearOverYearChange !== null).sort((a, b) => b.yearOverYearChange! - a.yearOverYearChange!)[0] ?? null,
  largestYearOverYearDecrease: records.filter((record) => record.yearOverYearChange !== null).sort((a, b) => a.yearOverYearChange! - b.yearOverYearChange!)[0] ?? null,
  byYear: years.map((year) => ({ year, totalTowingCount: (byYear.get(year) ?? []).reduce((sum, record) => sum + record.towingCountNumber!, 0), recordCount: byYear.get(year)?.length ?? 0 })),
  roadSectionAppearances: [...appearances.entries()].map(([normalized, appearanceCount]) => ({ roadSectionName: records.find((record) => record.roadSectionNameNormalized === normalized)!.roadSectionName, appearanceCount })).sort((a, b) => b.appearanceCount - a.appearanceCount),
};
const conversion = { inputRows: inputRows.length, outputRows: records.length, duplicateRows: duplicateExamples.length, invalidRows: invalidRows.length, duplicateExamples, invalidRowExamples: invalidRows, encoding: 'UTF-8-SIG with Big5 / CP950 fallback', sourcePageUrl };
await writeJson('public/data/vehicle-towing-top-road-sections.json', records);
await writeJson('public/data/vehicle-towing-top-road-sections-summary.json', summary);
await writeJson('public/data/vehicle-towing-top-road-sections-conversion.json', conversion);
const report = await readFile('public/data/conversion-report.json', 'utf8').then((text) => JSON.parse(text) as ConversionReport).catch(() => ({ generatedAt: new Date().toISOString(), sources: [], shelters: { inputRows: 0, outputRows: 0, validCoordinates: 0, missingCoordinates: 0, outlierCoordinates: 0 }, burglaries: { inputRows: 0, outputRows: 0, recordsWithoutDistrict: 0, dateParseWarnings: 0 } }));
await writeJson('public/data/conversion-report.json', { ...report, generatedAt: new Date().toISOString(), vehicleTowingTopRoadSections: conversion, sources: [...report.sources.filter((item) => item.url !== sourcePageUrl), { name: source, url: sourcePageUrl, downloadUrl: sourcePageUrl, downloadedAt: new Date().toISOString(), encoding: conversion.encoding, notes: 'Annual towing-ranking statistics; no exact locations or enforcement boundaries are inferred.' }] });
console.log(`Converted ${records.length} vehicle towing top-road-section rows.`);
