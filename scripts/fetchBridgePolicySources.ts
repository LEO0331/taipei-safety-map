import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { A_PATH, RAW, SOURCE_CONFIG, boundedDownload, hashBytes, loadAccepted, parseInspectionSource, parseInventorySource, atomicJson, catalogueMetadata } from './bridgePolicySources.ts';
import type { SourceEdition } from '../src/types/bridgePolicy.ts';

const refresh = process.argv.includes('--refresh');
const promote = process.argv.find(x => x.startsWith('--promote='))?.slice(10);
if (promote) {
  if (!/^data\/raw\/bridge-policy\/pending\/[a-f0-9-]+$/.test(promote)) throw new Error('Invalid pending edition path');
  const editions: SourceEdition[] = JSON.parse(await readFile(`${promote}/sources.json`, 'utf8'));
  const retainedA = await readFile(A_PATH);
  const incomingA = await readFile(editions[0].filename);
  if (JSON.stringify(parseInspectionSource(incomingA).map(x => x.raw)) !== JSON.stringify(parseInspectionSource(retainedA).map(x => x.raw))) throw new Error('A edition changed: manual source review required; historical explorer will not be overwritten');
  for (const edition of editions) {
    const bytes = await readFile(edition.filename);
    if (hashBytes(bytes) !== edition.sha256) throw new Error('Pending hash mismatch');
    const catalogue = await readFile(`${promote}/${edition.key}-catalogue.html`, 'utf8');
    const metadata = catalogueMetadata(catalogue, edition.datasetId, edition.resourceId);
    if (edition.resourceUpdatedAt !== metadata.resourceUpdatedAt || edition.catalogueUpdatedAt !== metadata.catalogueUpdatedAt) throw new Error('Pending provenance does not match catalogue');
    if (edition.key === 'A') parseInspectionSource(bytes); else parseInventorySource(bytes);
  }
  // The explicit promotion command is the steward's edition review; schema/IDs were audited first.
  await atomicJson(`${RAW}/sources.json`, editions.map(x => x.key === 'A' ? { ...x, status: 'accepted', historicalOriginalAcquiredAt: null,
    acquisitionPrecision: 'ISO millisecond live download completion; historical original acquisition remains unknown; legacy Git may normalize line endings' } : { ...x, status: 'accepted' }));
  console.log('Promoted validated pending edition; original A bytes preserved.');
} else if (!refresh) {
  const { sources, a, b } = await loadAccepted(); console.log(JSON.stringify({ status: 'verified-retained', sources: sources.map(x => ({ key: x.key, sha256: x.sha256 })), A: a.length, B: b.length }));
} else {
  const acquiredAt = new Date().toISOString();
  const directory = `${RAW}/pending/${acquiredAt.replace(/[^0-9]/g, '-')}`;
  await mkdir(directory, { recursive: true });
  const editions: SourceEdition[] = [];
  try {
    for (const config of SOURCE_CONFIG) {
      const catalogueUrl = `https://data.taipei/dataset/detail?id=${config.datasetId}`;
      const catalogueBytes = await boundedDownload(catalogueUrl);
      const catalogue = new TextDecoder().decode(catalogueBytes);
      await writeFile(`${directory}/${config.key}-catalogue.html`, catalogueBytes);
      const metadata = catalogueMetadata(catalogue, config.datasetId, config.resourceId);
      const resourceUrl = `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${config.resourceId}`;
      const bytes = await boundedDownload(resourceUrl);
      const filename = `${directory}/${config.key}.${config.format.toLowerCase()}`;
      await writeFile(filename, bytes);
      const rows = config.key === 'A' ? parseInspectionSource(bytes) : parseInventorySource(bytes);
      const schema = config.key === 'A' ? Object.keys(rows[0].raw) : Object.keys(rows[0].raw);
      editions.push({ ...config, ...metadata, catalogueUrl, resourceUrl,
        acquiredAt: new Date().toISOString(), acquisitionPrecision: 'ISO millisecond download completion; publisher timestamps separate', filename,
        bytes: bytes.length, sha256: hashBytes(bytes),
        rowCount: rows.length, schema, license: 'https://data.taipei/rule', status: 'pending', errors: [] });
    }
    await atomicJson(`${directory}/sources.json`, editions);
    console.log(`Pending edition: ${directory}. Inspect bytes, schema, identifiers and audit before explicit --promote=${directory}`);
  } catch (error) { await atomicJson(`${directory}/failure.json`, { acquiredAt, error: String(error), status: 'not-admitted' }); throw error; }
}
