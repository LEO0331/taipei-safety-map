import { readFile } from 'node:fs/promises';
import { RAW, atomicJson, loadAccepted, stageRefresh, validateEditions } from './fireRescueAccessPolicySources.ts';
import type { SourceEdition } from '../src/types/fireRescueAccessPolicy.ts';
const promote = process.argv.find(x => x.startsWith('--promote='))?.slice(10);
if (promote) {
  if (!/^data\/raw\/fire-rescue-access-policy\/pending\/[\d-]+$/.test(promote)) throw new Error('Invalid pending path');
  const sources: SourceEdition[] = JSON.parse(await readFile(`${promote}/sources.json`, 'utf8'));
  if (sources.some(x => !x.filename.startsWith(promote + '/'))) throw new Error('Pending directory mismatch');
  await validateEditions(sources);
  if (sources.some(x => !x.legacy.sameParsedRows) && !process.argv.includes('--accept-edition-change')) throw new Error('Changed rows require explicit --accept-edition-change after audit');
  await atomicJson(`${RAW}/sources.json`, sources.map(x => ({ ...x, status: 'accepted' })));
  console.log('Accepted validated source editions. Explorer originals preserved.');
} else if (process.argv.includes('--refresh')) console.log(`Staged: ${await stageRefresh()}. Audit before --promote=PATH; changed rows also require --accept-edition-change.`);
else { const { sources } = await loadAccepted(); console.log(JSON.stringify({ status: 'verified-offline', sources: sources.map(x => ({ key: x.key, rows: x.rowCount, sha256: x.sha256 })) }, null, 2)); }
