import { TIME_PERIODS, countBy } from '../src/lib/safetyData.ts';
import { convertBurglaryRow, readCsv, sources, writeJson } from './shared.ts';

const rows = await readCsv(sources.burglaries.rawPath);
const burglaries = rows.map(convertBurglaryRow);

await writeJson('public/data/residential-burglary-records.json', burglaries);
await writeJson('public/data/residential-burglary-summary.json', {
  totalRecords: burglaries.length,
  recordsWithDistrict: burglaries.filter((record) => record.district).length,
  latestRecordMonth: latestMonth(burglaries),
  byYear: countBy(burglaries, (record) => (record.year ? String(record.year) : undefined)),
  byMonth: countBy(burglaries, (record) => (record.month ? String(record.month) : undefined)),
  byTimePeriod: TIME_PERIODS.reduce<Record<string, number>>((counts, period) => {
    counts[period] = burglaries.filter((record) => record.timePeriod === period).length;
    return counts;
  }, {}),
  byDistrict: countBy(burglaries, (record) => record.district),
});

console.log(`Converted ${burglaries.length} burglary rows.`);

function latestMonth(records: Array<{ year?: number; month?: number }>): string | null {
  const latest = records
    .filter((record) => record.year && record.month)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.month ?? 0) - (a.month ?? 0))[0];
  return latest ? `${latest.year}-${String(latest.month).padStart(2, '0')}` : null;
}
