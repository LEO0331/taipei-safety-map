import { stat } from 'node:fs/promises';
import { downloadCsv, writeJson } from './shared.ts';

const resources = [
  {
    name: 'hospitals',
    url: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=04a3d195-ee97-467a-b066-e471ff99d15d',
    path: 'data/raw/medical-facilities/hospitals.csv',
  },
  {
    name: 'clinics',
    url: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=3a02af7d-8c33-46c1-8226-c12a11610f6b',
    path: 'data/raw/medical-facilities/clinics.csv',
  },
];

const statuses = [];
for (const resource of resources) {
  try {
    await downloadCsv(resource.url, resource.path, process.argv.includes('--force'));
    const file = await stat(resource.path);
    statuses.push({
      name: resource.name,
      sourceUrl: resource.url,
      downloadedAt: file.mtime.toISOString(),
      fileSize: file.size,
      encoding: 'Big5 / CP950',
      failure: null,
    });
  } catch (error) {
    const file = await stat(resource.path).catch(() => null);
    statuses.push({
      name: resource.name,
      sourceUrl: resource.url,
      downloadedAt: file?.mtime.toISOString() ?? null,
      fileSize: file?.size,
      encoding: 'Big5 / CP950',
      failure: error instanceof Error ? error.message : String(error),
    });
  }
}

await writeJson('data/raw/medical-facilities/fetch-status.json', statuses);
