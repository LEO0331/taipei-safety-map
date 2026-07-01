import { mkdir, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/fire-department-donation-in-kind-records';
const statusPath = `${rawDir}/fetch-status.json`;
const force = process.argv.includes('--force');
const resources = [
  ['臺北市政府消防局114年度接受各界捐贈實物明細表', 'csv', '7aa42753-8711-4e4b-904e-e33b5f649046'],
  ['臺北市政府消防局113年度接受各界捐贈實物明細表', 'csv', '10fc9b8e-3051-4909-bdbd-076e2d94455f'],
  ['臺北市政府消防局112年度接受各界捐贈實物明細表', 'csv', 'e61ab04e-4e93-4600-8794-aed10f9ab3b3'],
  ['臺北市政府消防局111年度接受各界捐贈實物明細表', 'ods', '47dbc737-c822-4c53-a303-928441b91106'],
  ['臺北市政府消防局110年度接受各界捐贈實物明細表', 'ods', 'a9a87dfa-dd1a-4527-8d52-2b9af4e36ffb'],
] as const;

await mkdir(rawDir, { recursive: true });

const statuses = [];
for (const [name, format, rid] of resources) {
  const safeName = name.replace(/[^\u4e00-\u9fff\w-]+/g, '-');
  const path = `${rawDir}/${safeName}.${format}`;
  const sourceUrl = `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${rid}`;
  let failure: string | null = null;
  if (force || !(await stat(path).catch(() => null))) {
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      await writeFile(path, new Uint8Array(await response.arrayBuffer()));
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
      if (!(await stat(path).catch(() => null))) {
        statuses.push({ name, format, path, sourceUrl, failure, unsupported: format === 'ods' });
        continue;
      }
    }
  }
  const file = await stat(path);
  statuses.push({
    name,
    format,
    path,
    sourceUrl,
    downloadedAt: file.mtime.toISOString(),
    fileSize: file.size,
    encoding: format === 'csv' ? 'UTF-8-SIG' : undefined,
    unsupported: format === 'ods',
    failure,
  });
}

await writeFile(
  statusPath,
  `${JSON.stringify(
    {
      sourcePage: 'https://data.taipei/dataset/detail?id=bcfdd7d7-7edd-441f-a69d-cb77f1ae4352',
      resources: statuses,
      notes: 'CSV resources are converted. ODS resources are downloaded when available and reported as unsupported by the converter.',
    },
    null,
    2,
  )}\n`,
);
