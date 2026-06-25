import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/traffic-cctv';
const rawPath = `${rawDir}/traffic-cctv.csv`;
const statusPath = `${rawDir}/fetch-status.json`;
const sourceUrl =
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=d317a3c4-5621-4591-9cee-93334611e03e';
const force = process.argv.includes('--force');

await mkdir(rawDir, { recursive: true });

let failure: string | null = null;
if (force || !(await stat(rawPath).catch(() => null))) {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    await writeFile(rawPath, new Uint8Array(await response.arrayBuffer()));
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    if (!(await stat(rawPath).catch(() => null))) {
      throw new Error(`No CCTV CSV available after download failure: ${failure}`);
    }
  }
}

const file = await stat(rawPath);
await writeFile(
  statusPath,
  `${JSON.stringify(
    {
      sourcePage: 'https://data.taipei/dataset/detail?id=50a5c4ec-9515-4c30-b83f-30b66e37053d',
      sourceUrl,
      resourceName: '臺北市CCTV設施',
      downloadedAt: file.mtime.toISOString(),
      fileSize: file.size,
      encoding: 'Big5 / CP950',
      failure,
      notes: failure ? 'Download failed; existing local CSV was retained.' : 'Raw CCTV CSV ready for conversion.',
    },
    null,
    2,
  )}\n`,
);

await readFile(rawPath);
