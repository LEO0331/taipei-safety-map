import { downloadCsv } from './shared.ts';

await downloadCsv(
  process.argv.find((value) => value.startsWith('http')),
  'data/raw/aed-locations/aed-locations.csv',
  process.argv.includes('--force'),
);
