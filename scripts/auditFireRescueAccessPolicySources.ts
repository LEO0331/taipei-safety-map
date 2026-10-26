import { readFile, writeFile } from 'node:fs/promises';
import { CONFIG, RAW, decodeSource, hash, parseSource, validateEditions } from './fireRescueAccessPolicySources.ts';
import type { SourceEdition } from '../src/types/fireRescueAccessPolicy.ts';
const path = process.argv.find(x => x.startsWith('--pending='))?.slice(10) ?? RAW;
const sources: SourceEdition[] = JSON.parse(await readFile(`${path}/sources.json`, 'utf8'));
const candidates = await validateEditions(sources);
const diagnostics = [];
for (const e of sources) {
  const current = candidates.filter(x => x.sourceKey === e.key), bytes = await readFile(CONFIG.find(x => x.key === e.key)!.legacy);
  let encoding = 'utf-8'; try { decodeSource(bytes); } catch { encoding = 'big5'; }
  const old = parseSource(bytes, e.key, encoding);
  const canonical = (row: typeof current[number]) => JSON.stringify(row.raw);
  const before = new Set(old.map(canonical)), after = new Set(current.map(canonical));
  diagnostics.push({ source: e.key, originalHash: e.sha256, canonicalRowHash: hash(JSON.stringify(current.map(x => x.raw))),
    acceptedRows: current.length, retainedRows: old.length, unchangedRows: current.filter(x => before.has(canonical(x))).length,
    incomingOnly: current.filter(x => !before.has(canonical(x))).map(x => ({ sequence: x.sequence, name: x.name, raw: x.raw })),
    retainedOnly: old.filter(x => !after.has(canonical(x))).map(x => ({ sequence: x.sequence, name: x.name, raw: x.raw })),
    issues: Object.fromEntries([...new Set(current.flatMap(x => x.issues))].map(issue => [issue, current.filter(x => x.issues.includes(issue)).length])) });
}
await writeFile('docs/fire-rescue-access-policy-edition-comparison.json', JSON.stringify(diagnostics, null, 2) + '\n');
console.log(JSON.stringify(diagnostics.map(x => ({ source: x.source, rows: x.acceptedRows, retained: x.retainedRows, unchanged: x.unchangedRows, incomingOnly: x.incomingOnly.length, retainedOnly: x.retainedOnly.length, issues: x.issues })), null, 2));
