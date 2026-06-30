import { stat } from 'node:fs/promises';
import { countBy } from '../src/lib/safetyData.ts';
import type { IncidentTimeOfDayCategory, MotorcycleTheftSummary } from '../src/types.ts';
import { convertMotorcycleTheftRow, readCsv, writeJson } from './shared.ts';

const path = process.argv[2] ?? 'data/raw/motorcycle-theft-records/motorcycle-theft-records.csv';
const rows = await readCsv(path);
const records = rows.map(convertMotorcycleTheftRow).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
const duplicateExamples: string[] = [];
const seen = new Set<string>();

for (const record of records) {
  const key = String(record.sourceRecordNumber ?? '') || [record.caseTypeRaw, record.incidentDateRaw, record.incidentTimeBandRaw, record.incidentLocationRaw].join('|');
  if (seen.has(key) && duplicateExamples.length < 10) duplicateExamples.push(key);
  seen.add(key);
}

const years = [...new Set(records.flatMap((record) => (record.year ? [record.year] : [])))].sort((a, b) => a - b);
const dated = records.filter((record) => record.date);
const buckets = Object.entries(countBy(records, (record) => record.locationBucketKey)).map(([locationBucketKey, recordCount]) => {
  const matching = records.filter((record) => record.locationBucketKey === locationBucketKey);
  return {
    locationBucketKey,
    district: matching[0]?.district,
    roadName: matching[0]?.roadName,
    sampleLocationText: matching[0]?.incidentLocationRaw,
    recordCount,
    firstDate: matching.flatMap((record) => (record.date ? [record.date] : [])).sort()[0],
    latestDate: matching.flatMap((record) => (record.date ? [record.date] : [])).sort().at(-1),
    topTimeBand: Object.entries(countBy(matching, (record) => record.incidentTimeBand)).sort((a, b) => b[1] - a[1])[0]?.[0],
  };
});
const summary: MotorcycleTheftSummary = {
  totalRecords: records.length,
  uniqueFuzzyLocationCount: new Set(records.flatMap((record) => (record.locationTextNormalized ? [record.locationTextNormalized] : []))).size,
  minDate: dated[0]?.date,
  maxDate: dated.at(-1)?.date,
  minYear: years[0],
  maxYear: years.at(-1),
  districtCount: new Set(records.flatMap((record) => (record.district ? [record.district] : []))).size,
  recordsWithParsedDistrict: records.filter((record) => record.district).length,
  recordsWithParsedRoadName: records.filter((record) => record.roadName).length,
  recordsWithAddressRange: records.filter((record) => record.hasAddressRange).length,
  byYear: years.map((year) => ({ year, recordCount: records.filter((record) => record.year === year).length })),
  byMonth: Object.entries(countBy(records, (record) => (record.month ? String(record.month) : undefined))).map(([month, recordCount]) => ({
    month: Number(month),
    recordCount,
  })),
  byYearMonth: Object.entries(countBy(records, (record) => record.monthKey)).map(([monthKey, recordCount]) => ({ monthKey, recordCount })),
  byDistrict: Object.entries(countBy(records, (record) => record.district)).map(([district, recordCount]) => {
    const matching = records.filter((record) => record.district === district);
    return {
      district,
      recordCount,
      topTimeOfDayCategories: Object.entries(countBy(matching, (record) => record.timeOfDayCategory))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([timeOfDayCategory, count]) => ({ timeOfDayCategory: timeOfDayCategory as IncidentTimeOfDayCategory, count })),
    };
  }),
  byIncidentTimeBand: Object.entries(countBy(records, (record) => record.incidentTimeBand)).map(([incidentTimeBand, recordCount]) => ({
    incidentTimeBand,
    recordCount,
  })),
  byTimeOfDayCategory: Object.entries(countBy(records, (record) => record.timeOfDayCategory)).map(([timeOfDayCategory, recordCount]) => ({
    timeOfDayCategory: timeOfDayCategory as IncidentTimeOfDayCategory,
    recordCount,
  })),
  byRoadName: Object.entries(countBy(records, (record) => record.roadName))
    .map(([roadName, recordCount]) => ({ roadName, recordCount }))
    .sort((a, b) => b.recordCount - a.recordCount),
  byLocationBucket: buckets.sort((a, b) => b.recordCount - a.recordCount),
  latestRecords: [...records].reverse().slice(0, 10),
};
const file = await stat(path).catch(() => null);

await writeJson('public/data/motorcycle-theft-records.json', records);
await writeJson('public/data/motorcycle-theft-summary.json', summary);
await writeJson('public/data/motorcycle-theft-location-buckets.json', buckets.sort((a, b) => b.recordCount - a.recordCount));
await writeJson('public/data/motorcycle-theft-conversion.json', {
  inputRows: rows.length,
  outputRows: records.length,
  fileSize: file?.size,
  encoding: 'CP950 / Big5 with UTF-8-SIG fallback',
  duplicateRows: duplicateExamples.length,
  dateParseWarnings: records.filter((record) => !record.date).map((record) => record.id),
  timeBandParseWarnings: records.filter((record) => record.timeOfDayCategory === 'unknown').map((record) => record.incidentTimeBandRaw ?? record.id),
  locationParseWarnings: records.filter((record) => !record.district).slice(0, 10).map((record) => record.incidentLocationRaw ?? record.id),
  duplicateExamples,
});

console.log(`Converted ${records.length} motorcycle theft rows.`);
