import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/fire-rescue-difficult-areas';
const rawPath = `${rawDir}/fire-rescue-difficult-areas.csv`;
const statusPath = `${rawDir}/fetch-status.json`;
const sourceUrl =
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=577b3810-49b7-44fd-a5b7-97897bb50f9e';
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
      throw new Error(`No fire rescue difficult area CSV available after download failure: ${failure}`);
    }
  }
}

const file = await stat(rawPath);
await writeFile(
  statusPath,
  `${JSON.stringify(
    {
      sourcePage: 'https://data.taipei/dataset/detail?id=0f322478-e09b-46af-8019-caeaa79678d7',
      sourceUrl,
      resourceName: '臺北市火災搶救困難地區場所清冊',
      downloadedAt: file.mtime.toISOString(),
      fileSize: file.size,
      encoding: 'UTF-8-SIG with Big5 / CP950 fallback',
      failure,
      notes: failure ? 'Download failed; existing local CSV was retained.' : 'Raw fire rescue difficult area CSV ready for conversion.',
    },
    null,
    2,
  )}\n`,
);

await readFile(rawPath);
