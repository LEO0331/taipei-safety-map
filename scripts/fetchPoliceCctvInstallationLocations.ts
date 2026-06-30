import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/police-cctv-installation-locations';
const rawPath = `${rawDir}/police-cctv-installation-locations.csv`;
const statusPath = `${rawDir}/fetch-status.json`;
const sourceUrl =
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=5929d4ff-b7c5-4fa1-94e3-9d45576e8f37';
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
      throw new Error(`No police CCTV installation-location CSV available after download failure: ${failure}`);
    }
  }
}

const file = await stat(rawPath);
await writeFile(
  statusPath,
  `${JSON.stringify(
    {
      sourcePage: 'https://data.taipei/dataset/detail?id=e9b913ee-6df8-4663-bee5-aef6729d4389',
      sourceUrl,
      resourceName: '臺北市政府警察局錄影監視系統設置區位資料',
      downloadedAt: file.mtime.toISOString(),
      fileSize: file.size,
      encoding: 'UTF-8-SIG',
      failure,
      notes: failure ? 'Download failed; existing local CSV was retained.' : 'Raw police CCTV installation-location CSV ready for conversion.',
    },
    null,
    2,
  )}\n`,
);

await readFile(rawPath);
