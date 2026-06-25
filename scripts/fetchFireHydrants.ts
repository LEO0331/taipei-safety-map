import { stat } from 'node:fs/promises';
import { downloadCsv, writeJson } from './shared.ts';

const url =
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=b9f8154d-c627-48a8-b3ef-512ed9cde9e7';
const path = 'data/raw/fire-hydrants/fire-hydrants.csv';

try {
  await downloadCsv(process.argv.find((value) => value.startsWith('http')) ?? url, path, process.argv.includes('--force'));
  const file = await stat(path);
  await writeJson('data/raw/fire-hydrants/fetch-status.json', {
    sourceUrl: url,
    resourceName: '大臺北地區消防栓點位',
    downloadedAt: file.mtime.toISOString(),
    fileSize: file.size,
    encoding: 'UTF-8-SIG',
    failure: null,
  });
} catch (error) {
  const file = await stat(path).catch(() => null);
  await writeJson('data/raw/fire-hydrants/fetch-status.json', {
    sourceUrl: url,
    resourceName: '大臺北地區消防栓點位',
    downloadedAt: file?.mtime.toISOString() ?? null,
    fileSize: file?.size,
    encoding: 'UTF-8-SIG',
    failure: error instanceof Error ? error.message : String(error),
  });
  console.warn('Fire hydrant download failed; using existing generated data.');
}
