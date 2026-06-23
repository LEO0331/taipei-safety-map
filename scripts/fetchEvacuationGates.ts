import { stat } from 'node:fs/promises';
import { downloadCsv, writeJson } from './shared.ts';

const officialUrl =
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=47cffd30-3527-45af-b709-6f76772e3cfb';
const rawPath = 'data/raw/evacuation-gates/evacuation-gates.csv';

try {
  await downloadCsv(
    process.argv.find((value) => value.startsWith('http')) ?? officialUrl,
    rawPath,
    process.argv.includes('--force'),
  );
  const file = await stat(rawPath);
  await writeJson('data/raw/evacuation-gates/fetch-status.json', {
    sourceUrl: officialUrl,
    downloadedAt: file.mtime.toISOString(),
    fileSize: file.size,
    encoding: 'UTF-8-SIG',
    failure: null,
  });
} catch (error) {
  const file = await stat(rawPath).catch(() => null);
  await writeJson('data/raw/evacuation-gates/fetch-status.json', {
    sourceUrl: officialUrl,
    downloadedAt: file?.mtime.toISOString() ?? null,
    fileSize: file?.size,
    encoding: 'UTF-8-SIG',
    failure: error instanceof Error ? error.message : String(error),
  });
  console.warn('Evacuation-gate download failed; using existing generated data.');
}
