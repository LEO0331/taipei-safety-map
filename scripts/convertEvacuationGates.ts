import { countBy } from '../src/lib/safetyData.ts';
import { convertEvacuationGateRow, readCsv, writeJson } from './shared.ts';

const path = process.argv[2] ?? 'data/raw/evacuation-gates/evacuation-gates.csv';
const rows = await readCsv(path);
const gates = rows.map(convertEvacuationGateRow);

await writeJson('public/data/evacuation-gates.json', gates);
await writeJson('public/data/evacuation-gate-summary.json', {
  totalRecords: gates.length,
  validCoordinates: gates.filter((item) => item.coordinateStatus === 'valid').length,
  missingCoordinates: gates.filter((item) => item.coordinateStatus === 'missing').length,
  outlierCoordinates: gates.filter((item) => item.coordinateStatus === 'outlier').length,
  recordsWithRiversidePark: gates.filter((item) => item.riversidePark).length,
  recordsWithLocationDescription: gates.filter((item) => item.description).length,
  byRiversidePark: countBy(gates, (item) => item.riversidePark),
});

console.log(`Converted ${gates.length} evacuation gate rows.`);
