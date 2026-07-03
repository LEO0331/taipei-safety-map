import { mkdir, stat, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/street-random-snatch-incidents';
const rawPath = `${rawDir}/street-random-snatch-incidents.csv`;
const statusPath = `${rawDir}/fetch-status.json`;
const sourcePageUrl = 'https://data.taipei/dataset/detail?id=404ca667-bcc4-4f3b-9217-fdcc1da400b2';
const sourceUrl = '';

await mkdir(rawDir, { recursive: true });

const existing = await stat(rawPath).catch(() => null);
if (!existing) throw new Error(`Place the CSV at ${rawPath}. Source page: ${sourcePageUrl}`);

const file = await stat(rawPath);
await writeFile(
  statusPath,
  `${JSON.stringify(
    {
      sourcePageUrl,
      sourceUrl,
      downloadedAt: new Date().toISOString(),
      fileSize: file.size,
      encoding: 'CP950 / Big5 with UTF-8-SIG fallback',
      failure: null,
    },
    null,
    2,
  )}\n`,
);

console.log(`Street random snatch CSV ready at ${rawPath}.`);
