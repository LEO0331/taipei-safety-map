import { mkdir, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/tobacco-control-inspection-results';
const force = process.argv.includes('--force');
const datasetUrl = 'https://data.taipei/dataset/detail?id=ccfd61e8-1632-421c-915d-2a09aaf3bed4';
const resources = [
  { name: '114年度菸害防制成果', year: 114, legalVersion: 'amended_law', rid: 'cc167252-9145-456a-bd82-bff830c206ae' },
  { name: '臺北市執行菸害防制法稽查成果-新法', year: undefined, legalVersion: 'amended_law', rid: '99015e4b-7e56-4562-abf9-c3c0fd7b9a8d' },
  { name: '臺北市執行菸害防制法稽查成果-舊法', year: undefined, legalVersion: 'old_law', rid: '558923cd-8539-4ddb-8f80-c737eada4e04' },
] as const;

await mkdir(rawDir, { recursive: true });
const status = [];
for (const resource of resources) {
  const path = `${rawDir}/${resource.rid}.csv`;
  const downloadUrl = `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${resource.rid}`;
  let failure: string | undefined;
  if (force || !(await stat(path).catch(() => null))) {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      await writeFile(path, new Uint8Array(await response.arrayBuffer()));
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
  }
  const file = await stat(path).catch(() => null);
  status.push({ ...resource, path, downloadUrl, downloadedAt: file?.mtime.toISOString() ?? null, fileSize: file?.size, failure });
}
await writeFile(`${rawDir}/fetch-status.json`, `${JSON.stringify({ datasetUrl, fetchedAt: new Date().toISOString(), resources: status }, null, 2)}\n`);
console.log(`Fetched ${status.filter((resource) => resource.downloadedAt).length}/${resources.length} tobacco-control resources.`);
