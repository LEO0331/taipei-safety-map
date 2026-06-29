import { stat } from 'node:fs/promises';
import { countBy } from '../src/lib/safetyData.ts';
import type {
  NaturalDisasterSuspensionEventGroup,
  NaturalDisasterSuspensionSummary,
  WorkSchoolSuspensionDecisionCategory,
} from '../src/types.ts';
import { convertNaturalDisasterSuspensionRow, readCsv, writeJson } from './shared.ts';

const path = process.argv[2] ?? 'data/raw/natural-disaster-work-school-suspension-records/natural-disaster-work-school-suspension-records.csv';
const rows = await readCsv(path);
const records = rows.map(convertNaturalDisasterSuspensionRow).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
const byGroup = new Map<string, NaturalDisasterSuspensionEventGroup>();
const duplicateKeys = new Set<string>();
const duplicateExamples: string[] = [];

for (const record of records) {
  const duplicateKey = [record.date, record.disasterName, record.suspensionMessageRaw].join('|');
  if (duplicateKeys.has(duplicateKey) && duplicateExamples.length < 10) duplicateExamples.push(duplicateKey);
  duplicateKeys.add(duplicateKey);
  const group =
    byGroup.get(record.eventGroupKey) ??
    {
      eventGroupKey: record.eventGroupKey,
      disasterName: record.disasterName ?? 'unknown',
      disasterNameNormalized: record.disasterNameNormalized ?? 'unknown',
      disasterType: record.disasterType,
      recordCount: 0,
      years: [],
      decisionCategories: [],
      records: [],
    };
  group.records.push(record);
  group.recordCount = group.records.length;
  group.years = [...new Set(group.records.flatMap((item) => (item.year ? [item.year] : [])))].sort();
  group.startDate = group.records.flatMap((item) => (item.date ? [item.date] : [])).sort()[0];
  group.endDate = group.records.flatMap((item) => (item.date ? [item.date] : [])).sort().at(-1);
  group.decisionCategories = Object.entries(countBy(group.records, (item) => item.decisionCategory)).map(
    ([decisionCategory, count]) => ({ decisionCategory: decisionCategory as WorkSchoolSuspensionDecisionCategory, count }),
  );
  byGroup.set(record.eventGroupKey, group);
}

const groups = [...byGroup.values()].sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
const dated = records.filter((item) => item.date);
const years = [...new Set(records.flatMap((item) => (item.year ? [item.year] : [])))].sort((a, b) => a - b);
const byDisasterName = Object.entries(countBy(records, (item) => item.disasterName)).map(([disasterName, count]) => {
  const matching = records.filter((item) => item.disasterName === disasterName);
  return {
    disasterName,
    disasterType: matching[0]?.disasterType ?? 'unknown',
    count,
    firstDate: matching.flatMap((item) => (item.date ? [item.date] : [])).sort()[0],
    lastDate: matching.flatMap((item) => (item.date ? [item.date] : [])).sort().at(-1),
  };
});
const summary: NaturalDisasterSuspensionSummary = {
  totalRecords: records.length,
  uniqueDisasterNameCount: new Set(records.flatMap((item) => (item.disasterName ? [item.disasterName] : []))).size,
  eventGroupCount: groups.length,
  minDate: dated[0]?.date,
  maxDate: dated.at(-1)?.date,
  minYear: years[0],
  maxYear: years.at(-1),
  byYear: years.map((year) => {
    const yearRecords = records.filter((item) => item.year === year);
    return {
      year,
      recordCount: yearRecords.length,
      eventGroupCount: new Set(yearRecords.map((item) => item.eventGroupKey)).size,
      citywideFullSuspensionCount: yearRecords.filter((item) => item.decisionCategory === 'citywide_full_suspension').length,
      normalWorkSchoolCount: yearRecords.filter((item) => item.decisionCategory === 'normal_work_school').length,
      localExceptionCount: yearRecords.filter((item) => item.hasLocalException).length,
    };
  }),
  byMonth: Object.entries(countBy(records, (item) => (item.month ? String(item.month) : undefined))).map(([month, recordCount]) => ({
    month: Number(month),
    recordCount,
  })),
  byDisasterType: Object.entries(countBy(records, (item) => item.disasterType)).map(([disasterType, count]) => ({
    disasterType: disasterType as NaturalDisasterSuspensionSummary['byDisasterType'][number]['disasterType'],
    count,
    eventGroupCount: new Set(records.filter((item) => item.disasterType === disasterType).map((item) => item.eventGroupKey)).size,
  })),
  byDecisionCategory: Object.entries(countBy(records, (item) => item.decisionCategory)).map(([decisionCategory, count]) => ({
    decisionCategory: decisionCategory as WorkSchoolSuspensionDecisionCategory,
    count,
  })),
  byDisasterName: byDisasterName.sort((a, b) => b.count - a.count),
  byMentionedDistrict: Object.entries(countBy(records.flatMap((item) => item.mentionedDistricts), (district) => district)).map(
    ([district, count]) => ({ district, count }),
  ),
  latestRecords: [...records].reverse().slice(0, 10),
  notableMultiDayEvents: groups
    .filter((group) => group.recordCount > 1)
    .sort((a, b) => b.recordCount - a.recordCount)
    .slice(0, 12)
    .map((group) => ({
      disasterName: group.disasterName,
      disasterType: group.disasterType,
      startDate: group.startDate,
      endDate: group.endDate,
      recordCount: group.recordCount,
    })),
};
const file = await stat(path).catch(() => null);

await writeJson('public/data/natural-disaster-work-school-suspension-records.json', records);
await writeJson('public/data/natural-disaster-work-school-suspension-summary.json', summary);
await writeJson('public/data/natural-disaster-work-school-suspension-event-groups.json', groups);
await writeJson('public/data/natural-disaster-work-school-suspension-conversion.json', {
  inputRows: rows.length,
  outputRows: records.length,
  fileSize: file?.size,
  encoding: 'UTF-8-SIG with Big5 fallback',
  dateParseWarnings: records.filter((item) => !item.date).map((item) => item.id),
  invalidNumberExamples: records.filter((item) => !item.rocYear || !item.month || !item.day).slice(0, 10).map((item) => item.id),
  duplicateRows: duplicateExamples.length,
  duplicateExamples,
  mixedOrUnclearExamples: records.filter((item) => item.decisionCategory === 'mixed_or_unclear').slice(0, 10).map((item) => item.suspensionMessageRaw),
});

console.log(`Converted ${records.length} natural disaster suspension rows.`);
