import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/emergency-shelters';
const rawPath = `${rawDir}/emergency-shelters.csv`;
const statusPath = `${rawDir}/fetch-status.json`;
const sourceUrl =
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=4c92dbd4-d259-495a-8390-52628119a4dd';
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
      throw new Error(`No emergency shelter CSV available after download failure: ${failure}`);
    }
  }
}

const file = await stat(rawPath);
await writeFile(
  statusPath,
  `${JSON.stringify(
    {
      sourcePage: 'https://data.taipei/dataset/detail?id=aaf97773-3631-40e2-b3cc-da87bf2ce1d5',
      sourceUrl,
      resourceName: '臺北市可供避難收容處所一覽表',
      downloadedAt: file.mtime.toISOString(),
      fileSize: file.size,
      encoding: 'UTF-8-SIG',
      failure,
      notes: failure ? 'Download failed; existing local CSV was retained.' : 'Raw CSV ready for conversion.',
    },
    null,
    2,
  )}\n`,
);

await readFile(rawPath);
