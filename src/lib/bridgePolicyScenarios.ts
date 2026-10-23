import type { Candidate, Eligibility, PolicySnapshot, Scenario } from '../types/bridgePolicy';
import { countValues } from './bridgePolicy';

export const DEFAULT_ELIGIBILITY: Eligibility = { population: 'all', issues: 'all', district: 'all', authority: 'all', query: '' };
const compare = (a: Candidate, b: Candidate) => a.tier < b.tier ? -1 : a.tier > b.tier ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
export function runScenario(snapshot: PolicySnapshot, capacity: Scenario['capacity'], strategy: Scenario['strategy'], eligibility = DEFAULT_ELIGIBILITY, mode: Scenario['mode'] = 'A'): Scenario {
  if (new Set(snapshot.inspections.map(x => x.id)).size !== snapshot.inspections.length) throw new Error('Duplicate candidate identity');
  const exclusions: Record<string, number> = {};
  const eligible = snapshot.inspections.filter(c => {
    const reason = mode === 'B' && !snapshot.modes.B ? 'mode-B-unavailable'
      : (mode === 'B' || eligibility.population === 'geographic') && (c.association.status !== 'accepted' || c.geography?.status !== 'valid-reference') ? 'geography-not-accepted'
      : eligibility.population === 'accepted' && c.association.status !== 'accepted' ? 'identity-not-accepted'
      : eligibility.population === 'accepted-or-ambiguous' && !['accepted', 'ambiguous'].includes(c.association.status) ? 'identity-outside-broader-scope'
      : eligibility.issues === 'critical' && c.tier !== 'A' ? 'outside-critical-tier'
      : eligibility.district !== 'all' && c.district !== eligibility.district ? 'district-filter'
      : eligibility.authority !== 'all' && c.authority !== eligibility.authority ? 'authority-filter'
      : eligibility.query.trim() && ![c.name, c.id, c.sequence].join(' ').toLowerCase().includes(eligibility.query.trim().toLowerCase()) ? 'search-filter' : null;
    if (reason) exclusions[reason] = (exclusions[reason] ?? 0) + 1;
    return !reason;
  }).sort(compare);
  let ordered = eligible;
  if (strategy === 'balanced') {
    const groups = [...new Set(eligible.map(x => x.district || '(unknown)'))].sort();
    const queues = groups.map(group => eligible.filter(x => (x.district || '(unknown)') === group));
    ordered = [];
    for (let round = 0; queues.some(q => q.length > round); round++) for (const queue of queues) if (queue[round]) ordered.push(queue[round]);
  }
  const selected = ordered.slice(0, capacity === 'all' ? ordered.length : capacity);
  return { snapshotId: snapshot.snapshotId, methodId: snapshot.methodId, mode, capacity, strategy, eligibility: { ...eligibility },
    eligibleCount: eligible.length, excludedCount: snapshot.inspections.length - eligible.length, exclusions, selected,
    tiers: countValues(selected.map(x => x.tier)), districts: countValues(selected.map(x => x.district)),
    authorities: countValues(selected.map(x => x.authority)), available: mode === 'A' || snapshot.modes.B };
}
export function compareScenarios(a: Scenario, b: Scenario) {
  if (a.snapshotId !== b.snapshotId || a.methodId !== b.methodId) throw new Error('Cannot compare different snapshots or methods');
  const first = new Set(a.selected.map(x => x.id)), second = new Set(b.selected.map(x => x.id));
  return { shared: [...first].filter(x => second.has(x)), added: [...second].filter(x => !first.has(x)), removed: [...first].filter(x => !second.has(x)), eligibleChange: b.eligibleCount - a.eligibleCount };
}
export function exportScenario(snapshot: PolicySnapshot, scenario: Scenario) {
  if (snapshot.snapshotId !== scenario.snapshotId || scenario.selected.length > 10000) throw new Error('Invalid export scope');
  return { policyId: snapshot.policyId, version: snapshot.version, objective: 'administrative documentation review',
    snapshotId: snapshot.snapshotId, methodId: snapshot.methodId, analysisDate: snapshot.analysisDate, sources: snapshot.sources,
    mode: scenario.mode, capacity: scenario.capacity, capacityUsed: scenario.selected.length, strategy: scenario.strategy,
    eligibility: scenario.eligibility, candidatePopulation: snapshot.inspections.length, eligibleCount: scenario.eligibleCount,
    exclusionCounts: scenario.exclusions, selectedIds: scenario.selected.map(x => x.id),
    selected: scenario.selected.map(c => ({ id: c.id, row: c.row, sequence: c.sequence, name: c.name, district: c.district,
      authority: c.authority, tier: c.tier, issueCodes: c.issues, inventoryId: c.inventoryId, bridgeId: c.bridgeId,
      associationType: c.association.type, coordinateEvidence: c.geography?.level ?? 'none' })),
    assumptions: snapshot.assumptions, unavailableStructuralMetrics: snapshot.unavailableMetrics,
    disclaimer: 'Research documentation review only; not an official inspection order, repair worklist, safety ranking or engineering certification.' };
}
export function safeCsvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function exportScenarioCsv(snapshot: PolicySnapshot, scenario: Scenario) {
  const report = exportScenario(snapshot, scenario);
  // Repeat provenance on each row, including the zero-selection case.
  const provenance = { ...report, selected: undefined };
  const header = ['candidate_id', 'source_row', 'bridge_name', 'tier', 'issues', 'inventory_id', 'association_type', 'coordinate_evidence', 'provenance_json'];
  const rows: unknown[][] = report.selected.map((c, index) => [c.id, c.row, c.name, c.tier, c.issueCodes.join('|'), c.inventoryId, c.associationType, c.coordinateEvidence, index === 0 ? JSON.stringify(provenance) : '']);
  if (!rows.length) rows.push(['', '', '', '', '', '', '', '', JSON.stringify(provenance)]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(safeCsvCell).join(',')).join('\r\n');
}
