import { readFile } from 'node:fs/promises';
import { loadAccepted, atomicJson, hashBytes } from './bridgePolicySources.ts';
import { reconcileBridges } from '../src/lib/bridgePolicyIdentity.ts';
import { ANALYSIS_DATE, METHOD_ID, classifyCandidate, countValues } from '../src/lib/bridgePolicy.ts';
import type { PolicySnapshot } from '../src/types/bridgePolicy.ts';

const { sources, a, b } = await loadAccepted();
const crosswalk = reconcileBridges(a, b);
const candidates = a.map((row, index) => classifyCandidate(row, crosswalk[index], b));
const associated = new Set(crosswalk.filter(x => x.status === 'accepted').map(x => x.inventoryId));
const status = countValues(crosswalk.map(x => x.status));
const historicalGroups = new Set(a.map(x => `${x.name.replace(/[（）()\s　]/g, '').replace(/臺/g, '台').toLowerCase()}|${x.district}|${x.authority}`)).size;
const payload = {
  policyId: 'policy-9' as const, version: 1 as const, methodId: METHOD_ID, analysisDate: ANALYSIS_DATE,
  sources, inspections: candidates, inventory: b,
  diagnostics: { sourceRowsA: a.length, historicalGroupsA: historicalGroups, conservativeGroupsA: new Set(a.map(x => x.group)).size,
    inventoryRowsB: b.length, distinctSourceIdsB: new Set(b.map(x => x.sourceId).filter(Boolean)).size,
    distinctBridgeIdsB: new Set(b.map(x => x.bridgeId).filter(Boolean)).size,
    uniqueValidBridgeIdsB: b.filter(x => x.bridgeId && !x.issues.includes('duplicate-bridge-id')).length,
    missingBridgeIdsB: b.filter(x => !x.bridgeId).length,
    acceptedA: status.accepted ?? 0, acceptedB: associated.size, ambiguousA: status.ambiguous ?? 0,
    rejectedA: status.rejected ?? 0, unmatchedA: status.unmatched ?? 0,
    unassociatedB: b.filter(x => !associated.has(x.id)).length,
    noNameCounterpartB: b.filter(x => !crosswalk.some(c => c.candidates.includes(x.id))).length,
    oneToMany: crosswalk.filter(x => x.candidates.length > 1).length,
    manyToOne: crosswalk.filter(x => x.reasons.includes('inventory-reused-by-inspection-rows')).length,
    validInventoryGeography: b.filter(x => x.geography.status === 'valid-reference').length,
    acceptedGeography: candidates.filter(x => x.geography?.status === 'valid-reference').length,
    tierA: candidates.filter(x => x.tier === 'A').length, tierB: candidates.filter(x => x.tier === 'B').length, tierC: candidates.filter(x => x.tier === 'C').length },
  audit: { inspectionIssues: countValues(a.flatMap(x => x.issues)), inventoryIssues: countValues(b.flatMap(x => x.issues)),
    geographicIssues: countValues(b.flatMap(x => x.geography.issues)), authoritiesB: countValues(b.map(x => x.authority)),
    categoriesB: countValues(b.map(x => String(x.raw.non_bridge))), intervalMonthsB: countValues(b.map(x => String(x.raw.inspect_rate))),
    duplicateNamesB: Object.fromEntries(Object.entries(countValues(b.map(x => x.name))).filter(([, n]) => n > 1)),
    duplicateObjectPointsB: Object.fromEntries(Object.entries(countValues(b.filter(x => x.geography.object).map(x => JSON.stringify(x.geography.object)))).filter(([, n]) => n > 1)),
    crosswalk },
  modes: { A: true, B: candidates.some(x => x.geography?.status === 'valid-reference'), C: false as const },
  assumptions: ['Research associations apply only to these source editions; no official crosswalk is established.',
    'Object-reference points are published coordinate evidence, not surveyed alignments, entrances or district polygon validation.',
    'Inspection month/day and statutory interval applicability are unknown. Calendar-year differences do not establish overdue status.',
    'Missing maintenance fields are reporting completeness questions, not proof of absent work or zero spending.',
    'All result terminology remains unverified for engineering classification. Tiers are documentary review categories.',
    'Balanced review is district round-robin in Unicode order, with tier/ID order within each district.'],
  unavailableMetrics: ['structural condition ratings', 'component defects', 'engineering reports', 'load ratings', 'design capacity', 'deterioration history', 'work completion', 'policy exemptions', 'live restrictions and field status'],
};
const snapshotId = `bridge-policy-v1-${hashBytes(JSON.stringify(payload))}`;
const snapshot: PolicySnapshot = { ...payload, snapshotId };
const output = `public/data/bridge-policy/${snapshotId}.json`;
await atomicJson(output, snapshot);
// Confirm complete content exists before advancing the current pointer.
const bytes = await readFile(output);
JSON.parse(bytes.toString());
await atomicJson('public/data/bridge-policy/current.json', { version: 1, snapshotId, filename: `${snapshotId}.json`, sha256: hashBytes(bytes) });
console.log(JSON.stringify({ snapshotId, sha256: hashBytes(bytes), bytes: bytes.length, ...snapshot.diagnostics }, null, 2));
