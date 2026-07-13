import { readFile } from 'node:fs/promises';
import { writeJson } from './shared.ts';

const moduleConversion = JSON.parse(await readFile('public/data/fire-access-route-registry-conversion.json', 'utf8')) as {
  inputRows: number;
  outputRows: number;
  duplicateSequenceNumbers: string[];
  unknownDistrictCodes: string[];
  missingFields: Record<string, number>;
};
const report: Record<string, unknown> = await readFile('public/data/conversion-report.json', 'utf8')
  .then((value) => JSON.parse(value) as Record<string, unknown>)
  .catch(() => ({}));
await writeJson('public/data/conversion-report.json', {
  ...report,
  generatedAt: new Date().toISOString(),
  fireAccessRouteRegistry: moduleConversion,
  notes: [
    ...((Array.isArray(report.notes) ? report.notes : []) as string[]),
    'Fire access route registry records have no confirmed coordinates or route geometry and are shown only as district/village summaries and text lookup records.',
  ],
});
console.log('Merged fire access route registry data-quality report.');
