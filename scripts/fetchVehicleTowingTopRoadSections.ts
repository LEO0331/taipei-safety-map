import { mkdir, writeFile } from 'node:fs/promises';

const rawDir = 'data/raw/vehicle-towing-top-road-sections';
const sourcePageUrl = 'https://data.taipei/dataset/detail?id=3a2098a3-0ef1-45d0-9ba6-dccf7dbd865d';
const resources = [
  ['112', '2922a205-35c7-4de8-a934-978eafd9fc6b'],
  ['111', 'ddda6e8d-0348-4427-93cb-d918cab43154'],
  ['110', '46f6df86-c3eb-4072-9c71-5bfba7278624'],
  ['109', '40df1af7-2b56-4db2-8463-e3f72a796607'],
  ['108', '92fc8fe7-09d0-413b-b044-aa1a80cfffbb'],
] as const;

await mkdir(rawDir, { recursive: true });
const results = await Promise.all(resources.map(async ([year, rid]) => {
  const url = `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${rid}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    await writeFile(`${rawDir}/${year}.csv`, bytes);
    return { year, url, file: `${year}.csv`, fileSize: bytes.length, failure: null };
  } catch (error) {
    return { year, url, file: `${year}.csv`, fileSize: null, failure: error instanceof Error ? error.message : String(error) };
  }
}));
await writeFile(`${rawDir}/fetch-status.json`, `${JSON.stringify({ sourcePageUrl, downloadedAt: new Date().toISOString(), encoding: 'UTF-8-SIG with Big5 / CP950 fallback', resources: results }, null, 2)}\n`);
const failures = results.filter((item) => item.failure);
if (failures.length) throw new Error(`Unable to fetch ${failures.length} towing CSV file(s); existing local files were retained.`);
console.log(`Fetched ${results.length} vehicle towing top-road-section CSV files.`);
