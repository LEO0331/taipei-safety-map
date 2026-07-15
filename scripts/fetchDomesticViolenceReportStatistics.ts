import { mkdir, stat, writeFile } from 'node:fs/promises';
const rawDir = 'data/raw/domestic-violence-report-statistics'; const path = `${rawDir}/domestic-violence-report-statistics.csv`;
const url = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=cb45bfa3-3262-4862-8505-134fc5458e2f';
await mkdir(rawDir, { recursive: true });
if (process.argv.includes('--force') || !(await stat(path).catch(() => null))) { const response = await fetch(url); if (!response.ok) throw new Error(`CSV download failed: ${response.status}`); await writeFile(path, new Uint8Array(await response.arrayBuffer())); }
const file = await stat(path); await writeFile(`${rawDir}/fetch-status.json`, `${JSON.stringify({ datasetUrl: 'https://data.taipei/dataset/detail?id=a5d42395-b37a-49a8-ab30-09c3e8595d6c', resources: [{ name: '臺北市家暴通報案件數統計資訊', path, url, downloadedAt: file.mtime.toISOString(), fileSize: file.size }] }, null, 2)}\n`);
