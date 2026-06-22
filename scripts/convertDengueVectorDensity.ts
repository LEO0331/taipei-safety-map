import { buildDengueDistrictSummaries, countBy } from '../src/lib/safetyData.ts';
import { convertDengueRow, readCsv, writeJson } from './shared.ts';

const path = process.argv[2] ?? 'data/raw/dengue-vector-density/dengue-vector-density.csv';
const rows = await readCsv(path);
const records = rows.map(convertDengueRow);
const districtSummaries = buildDengueDistrictSummaries(records);

await writeJson('public/data/dengue-vector-density-records.json', records);
await writeJson('public/data/dengue-vector-density-summary.json', {
  latestSurveyMonth: records
    .filter((item) => item.surveyYear && item.surveyMonth)
    .map((item) => `${item.surveyYear}-${String(item.surveyMonth).padStart(2, '0')}`)
    .sort()
    .at(-1),
  totalRecords: records.length,
  surveyedHouseholds: records.reduce((sum, item) => sum + (item.surveyedHouseholds ?? 0), 0),
  positiveHouseholds: records.reduce((sum, item) => sum + (item.positiveHouseholds ?? 0), 0),
  inspectedContainersTotal: records.reduce((sum, item) => sum + (item.inspectedContainersTotal ?? 0), 0),
  positiveContainersTotal: records.reduce((sum, item) => sum + (item.positiveContainersTotal ?? 0), 0),
  bySurveyType: countBy(records, (item) => item.surveyType),
  districtSummaries,
});

console.log(`Converted ${records.length} dengue survey rows.`);
