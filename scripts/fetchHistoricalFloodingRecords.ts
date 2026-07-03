import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawDir = 'data/raw/historical-flooding-records';
const pageUrl = 'https://data.taipei/dataset/detail?id=8377b584-81e9-432d-b902-5b4e9978e6bc';
const source = '臺北市水利處歷史積水紀錄圖';

async function main() {
  await mkdir(rawDir, { recursive: true });
  const force = process.argv.includes('--force');
  const existing = (await readdir(rawDir).catch(() => [])).filter((file) => file.endsWith('.kml'));
  if (existing.length && !force) {
    const file = existing[0];
    const info = await stat(path.join(rawDir, file));
    await writeFile(path.join(rawDir, 'fetch-status.json'), `${JSON.stringify({ source, pageUrl, file, fileSize: info.size, downloadedAt: null, failure: null, notes: 'Existing local KML reused; pass --force to refresh.' }, null, 2)}\n`);
    console.log(`Reused local historical flooding KML: ${file}`);
    return;
  }
  let failure: string | null = null;
  try {
    const html = await fetch(pageUrl).then((response) => response.text());
    const url = html.match(/https:\/\/data\.taipei\/api\/frontstage\/tpeod\/dataset\/resource\.download\?rid=[^"' <]+/)?.[0]
      ?? html.match(/https:\/\/data\.taipei\/api\/v1\/dataset\/[^"' <]+/)?.[0];
    if (!url) throw new Error('No KML download URL found on dataset page.');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const file = 'historical-flooding-records.kml';
    await writeFile(path.join(rawDir, file), bytes);
    await writeFile(path.join(rawDir, 'fetch-status.json'), `${JSON.stringify({ source, pageUrl, sourceUrl: url, file, fileSize: bytes.byteLength, downloadedAt: new Date().toISOString(), failure: null, notes: 'Downloaded official KML resource.' }, null, 2)}\n`);
    console.log(`Fetched historical flooding KML: ${file}`);
    return;
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  const fallback = (await readdir(rawDir).catch(() => [])).find((file) => file.endsWith('.kml'));
  if (!fallback) throw new Error(`Historical flooding KML fetch failed and no local fallback exists: ${failure}`);
  const info = await stat(path.join(rawDir, fallback));
  await writeFile(path.join(rawDir, 'fetch-status.json'), `${JSON.stringify({ source, pageUrl, file: fallback, fileSize: info.size, downloadedAt: null, failure, notes: 'Download failed; existing local KML was retained.' }, null, 2)}\n`);
  console.warn(`Historical flooding KML fetch failed; reused ${fallback}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
