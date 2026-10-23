import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { hashBytes } from './bridgePolicySources.ts';
import { compareScenarios, DEFAULT_ELIGIBILITY, exportScenario, exportScenarioCsv, runScenario } from '../src/lib/bridgePolicyScenarios.ts';
import type { PolicySnapshot } from '../src/types/bridgePolicy.ts';

const before = await readFile('public/data/bridge-policy/current.json');
const pointer = JSON.parse(before.toString());
const first = await readFile(`public/data/bridge-policy/${pointer.filename}`);
for (let i = 0; i < 2; i++) execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/buildBridgePolicySnapshot.ts'], { stdio: 'pipe' });
if (!before.equals(await readFile('public/data/bridge-policy/current.json')) || !first.equals(await readFile(`public/data/bridge-policy/${pointer.filename}`))) throw new Error('Non-deterministic snapshot');
const snapshot: PolicySnapshot = JSON.parse(first.toString());
const scenarios = (['A', 'B'] as const).flatMap(mode => ([5, 10, 'all'] as const).flatMap(capacity => (['evidence-first', 'balanced'] as const).map(strategy => {
  const result = runScenario(snapshot, capacity, strategy, DEFAULT_ELIGIBILITY, mode);
  const alternative = runScenario(snapshot, capacity, strategy === 'balanced' ? 'evidence-first' : 'balanced', DEFAULT_ELIGIBILITY, mode);
  return { mode, capacity, strategy, eligible: result.eligibleCount, selectedIds: result.selected.map(x => x.id),
    tiers: result.tiers, districts: result.districts, authorities: result.authorities, strategyDifference: compareScenarios(result, alternative) };
})));
const base = runScenario(snapshot, 5, 'evidence-first');
const sensitivity = (['all', 'accepted', 'accepted-or-ambiguous', 'geographic'] as const).map(population => {
  const result = runScenario(snapshot, 5, 'evidence-first', { ...DEFAULT_ELIGIBILITY, population });
  return { population, eligible: result.eligibleCount, selectedIds: result.selected.map(x => x.id), difference: compareScenarios(base, result) };
});
const started = performance.now();
for (let i = 0; i < 100; i++) runScenario(snapshot, 10, 'balanced');
const scenarioMeanMs = (performance.now() - started) / 100;
const all = runScenario(snapshot, 'all', 'evidence-first');
const jsonBytes = Buffer.byteLength(JSON.stringify(exportScenario(snapshot, all), null, 2));
const csvBytes = Buffer.byteLength(exportScenarioCsv(snapshot, all));
const assets = (await readdir('dist/assets')).filter(x => x.startsWith('BridgePolicyDashboard') || x.startsWith('BridgePolicyMap'));
const lazyAssets = await Promise.all(assets.map(async filename => { const bytes = await readFile(`dist/assets/${filename}`); return { filename, bytes: bytes.length, gzipBytes: gzipSync(bytes).length }; }));
const example = (kind: string, candidate: PolicySnapshot['inspections'][number] | undefined) => ({ kind, count: candidate ? 1 : 0, example: candidate ?? null });
const examples = [example('accepted', snapshot.inspections.find(x => x.association.status === 'accepted')),
  example('ambiguous', snapshot.inspections.find(x => x.association.status === 'ambiguous')),
  example('unmatched-inspection', snapshot.inspections.find(x => x.association.status === 'unmatched')),
  example('missing-inspection-year', snapshot.inspections.find(x => x.inspectionYear === null)),
  example('missing-maintenance-cost', snapshot.inspections.find(x => x.cost === null)),
  example('accepted-geography', snapshot.inspections.find(x => x.geography?.status === 'valid-reference')),
  example('excluded-geography', snapshot.inspections.find(x => x.geography?.status === 'excluded'))];
const report = { snapshotId: snapshot.snapshotId, snapshotSha256: hashBytes(first), bytes: first.length, gzipBytes: gzipSync(first).length,
  analysisDate: snapshot.analysisDate, methodId: snapshot.methodId, sources: snapshot.sources,
  diagnostics: snapshot.diagnostics, deterministicRebuilds: 2, lazyAssets, benchmark: { scope: 'local Node.js; not public-host or browser guarantee', iterations: 100, scenarioMeanMs, allJsonExportBytes: jsonBytes, allCsvExportBytes: csvBytes },
  scenarios, sensitivity, examples,
  unmatchedInventoryExample: snapshot.inventory.find(x => !snapshot.inspections.some(c => c.inventoryId === x.id)),
  excludedInventoryExample: snapshot.inventory.find(x => x.geography.status === 'excluded') };
await writeFile('docs/bridge-policy-results.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ snapshotId: report.snapshotId, snapshotSha256: report.snapshotSha256, bytes: report.bytes, gzipBytes: report.gzipBytes, benchmark: report.benchmark, deterministicRebuilds: 2 }, null, 2));
