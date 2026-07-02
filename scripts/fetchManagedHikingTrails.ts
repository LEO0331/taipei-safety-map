import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/managed-hiking-trails';
const rawPath = `${rawDir}/managed-hiking-trails.csv`;
const statusPath = `${rawDir}/fetch-status.json`;
const sourceUrl =
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=0d1d7db3-efc1-40d1-ad24-5a1a1f88e06b';
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
      throw new Error(`No managed hiking trail CSV available after download failure: ${failure}`);
    }
  }
}

const file = await stat(rawPath);
await writeFile(
  statusPath,
  `${JSON.stringify(
    {
      sourcePage: 'https://data.taipei/dataset/detail?id=b5726297-d172-4ba7-b5c4-31de38e184e1',
      sourceUrl,
      resourceName: '列管登山步道',
      downloadedAt: file.mtime.toISOString(),
      fileSize: file.size,
      encoding: 'Big5 / CP950 with UTF-8-SIG fallback',
      failure,
      notes: failure ? 'Download failed; existing local CSV was retained.' : 'Raw managed hiking trail CSV ready for conversion.',
    },
    null,
    2,
  )}\n`,
);

await readFile(rawPath);
