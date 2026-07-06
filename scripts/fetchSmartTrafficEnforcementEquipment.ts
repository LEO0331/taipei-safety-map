import { mkdir, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/smart-traffic-enforcement-equipment';
const rawPath = `${rawDir}/smart-traffic-enforcement-equipment.csv`;
const statusPath = `${rawDir}/fetch-status.json`;
const sourcePageUrl = 'https://data.taipei/dataset/detail?id=986fa73e-c470-4ebf-9f35-3a1c9d2a8788';

await mkdir(rawDir, { recursive: true });
const file = await stat(rawPath).catch(() => null);
if (!file) throw new Error(`Place the CSV at ${rawPath}. Source page: ${sourcePageUrl}`);

await writeFile(
  statusPath,
  `${JSON.stringify(
    {
      sourcePageUrl,
      downloadedAt: new Date().toISOString(),
      fileSize: file.size,
      encoding: 'UTF-8-SIG with Big5 / CP950 fallback',
      failure: null,
    },
    null,
    2,
  )}\n`,
);

console.log(`Smart traffic enforcement equipment CSV ready at ${rawPath}.`);
