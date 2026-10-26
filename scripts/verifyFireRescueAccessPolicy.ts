import { readFile } from 'node:fs/promises';
import { buildAccessSnapshot, resultsFor } from './buildFireRescueAccessPolicySnapshot.ts';
import { hash, OUTPUT, loadAccepted } from './fireRescueAccessPolicySources.ts';
import { accessBriefing, accessBriefingCsv, DEFAULT_CONFIG, runAccessScenario } from '../src/lib/fireRescueAccessScenarios.ts';
await loadAccepted();
const context = JSON.parse(await readFile('data/raw/fire-rescue-access-policy/context/references.json','utf8'));
for (const ref of context) { if (!/^data\/raw\/fire-rescue-access-policy\/context\/[a-z-]+\.html$/.test(ref.filename) || hash(await readFile(ref.filename)) !== ref.sha256) throw new Error('Context provenance mismatch'); }
const before = await readFile(`${OUTPUT}/current.json`);
const pointer = JSON.parse(before.toString()), original = await readFile(`${OUTPUT}/${pointer.filename}`);
if (hash(original) !== pointer.sha256) throw new Error('Snapshot exact hash mismatch');
const one = await buildAccessSnapshot(), two = await buildAccessSnapshot();
if (!original.equals(await readFile(`${OUTPUT}/${two.pointer.filename}`)) || !before.equals(await readFile(`${OUTPUT}/current.json`)) || one.pointer.sha256 !== two.pointer.sha256) throw new Error('Nonreproducible rebuild');
const scenario = runAccessScenario(two.snapshot, DEFAULT_CONFIG);
const json = JSON.stringify(await accessBriefing(two.snapshot, scenario, pointer.sha256)), csv = await accessBriefingCsv(two.snapshot, scenario, pointer.sha256);
if (json !== JSON.stringify(await accessBriefing(two.snapshot, scenario,pointer.sha256)) || csv !== await accessBriefingCsv(two.snapshot,scenario,pointer.sha256)) throw new Error('Nondeterministic briefing');
const results = JSON.parse(await readFile('docs/fire-rescue-access-policy-results.json','utf8'));
if (JSON.stringify(results) !== JSON.stringify(resultsFor(two.snapshot,two.pointer))) throw new Error('Stale results');
console.log(JSON.stringify({ status: 'passed', originalSources: 3, snapshotHash: pointer.sha256, byteIdenticalRebuilds: 2, deterministicBriefings: true, jsonBytes: Buffer.byteLength(json), csvBytes: Buffer.byteLength(csv) }));
