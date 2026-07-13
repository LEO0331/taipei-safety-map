import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/fire-access-route-registry';
const rawPath = `${rawDir}/fire-access-route-registry.csv`;
const statusPath = `${rawDir}/fetch-status.json`;
const sourceUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=351307e4-ffda-4660-ac72-1c4ef3808c38';
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
      throw new Error(`No fire access route registry CSV available after download failure: ${failure}`);
    }
  }
}

const file = await stat(rawPath);
await writeFile(statusPath, `${JSON.stringify({
  sourcePage: 'https://data.taipei/dataset/detail?id=7a800e92-eb22-461f-b29d-8def2127a1bc',
  sourceUrl,
  resourceName: '臺北市消防通道清冊',
  downloadedAt: file.mtime.toISOString(),
  fileSize: file.size,
  encoding: 'UTF-8-SIG with Big5 / CP950 fallback',
  failure,
  notes: failure ? 'Download failed; existing local CSV was retained.' : 'Raw fire access route registry CSV ready for conversion.',
}, null, 2)}\n`);
await readFile(rawPath);
