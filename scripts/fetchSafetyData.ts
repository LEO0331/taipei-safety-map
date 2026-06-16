import { mkdir, stat, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { RAW_DIR, sources, writeJson } from './shared.ts';

const force = process.argv.includes('--force');

async function downloadIfNeeded(source: { name: string; downloadUrl: string; rawPath: string }) {
  await mkdir(RAW_DIR, { recursive: true });
  if (!force) {
    const existing = await stat(source.rawPath).catch(() => null);
    if (existing) {
      return {
        name: source.name,
        path: source.rawPath,
        downloadedAt: null,
        fileSize: existing.size,
        notes: `${basename(source.rawPath)} already exists; pass --force to download again.`,
      };
    }
  }

  const response = await fetch(source.downloadUrl);
  if (!response.ok) {
    throw new Error(`Download failed for ${source.name}: ${response.status} ${response.statusText}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(source.rawPath, bytes);
  return {
    name: source.name,
    path: source.rawPath,
    downloadedAt: new Date().toISOString(),
    fileSize: bytes.byteLength,
    notes: 'Downloaded CSV resource.',
  };
}

const results = await Promise.all([downloadIfNeeded(sources.shelters), downloadIfNeeded(sources.burglaries)]);
await writeJson(`${RAW_DIR}/download-report.json`, {
  generatedAt: new Date().toISOString(),
  sources: results,
});

console.log(`Fetched ${results.length} safety datasets.`);
