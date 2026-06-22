import { downloadCsv } from './shared.ts';

await downloadCsv(
  process.argv.find((value) => value.startsWith('http')),
  'data/raw/dengue-vector-density/dengue-vector-density.csv',
  process.argv.includes('--force'),
);
