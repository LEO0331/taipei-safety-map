import type { Candidate, Config, Eligibility, Scenario, Selection, Snapshot } from '../types/fireRescueAccessPolicy';
import { normalizeRoadText, primaryIssues } from './fireRescueAccessIdentity';
export const METHOD_ID = 'fire-rescue-access-evidence-review-v1';
export const DEFAULT_ELIGIBILITY: Eligibility = { source: 'all', issue: 'all', district: 'all', category: 'all', query: '' };
export const DEFAULT_CONFIG: Config = { mode: 'A', capacity: 5, strategy: 'evidence-first', eligibility: DEFAULT_ELIGIBILITY };
export const countValues = (values: string[]) => values.reduce<Record<string, number>>((out, value) => { out[value || '(unknown)'] = (out[value || '(unknown)'] ?? 0) + 1; return out; }, {});
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const precedence = (issues: string[]) => Math.min(...issues.map(x => primaryIssues.indexOf(x)).filter(x => x >= 0), primaryIssues.length);
const compare = (a: Selection, b: Selection) => lexical(a.tier, b.tier) || precedence(a.issues) - precedence(b.issues) || lexical(a.id, b.id);
function balance(population: Selection[]) {
  const ordered: Selection[] = [];
  // Global tier precedence; source (or pair) rounds, then district rounds within each source.
  for (const tier of ['A','B','C']) {
    const groups = [...new Set(population.filter(x => x.tier === tier).map(x => x.group))].sort(lexical);
    const queues = groups.map(group => {
      const rows = population.filter(x => x.tier === tier && x.group === group);
      const districts = [...new Set(rows.map(x => x.district))].sort(lexical);
      const lists = districts.map(d => rows.filter(x => x.district === d));
      const queue: Selection[] = [];
      for (let round = 0; lists.some(x => x.length > round); round++) for (const list of lists) if (list[round]) queue.push(list[round]);
      return queue;
    });
    for (let round = 0; queues.some(x => x.length > round); round++) for (const queue of queues) if (queue[round]) ordered.push(queue[round]);
  }
  return ordered;
}
export function validateAccessSnapshot(snapshot: Snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.sources) || !Array.isArray(snapshot.candidates) || !Array.isArray(snapshot.relationships) || !Array.isArray(snapshot.limitations) || snapshot.modes?.A !== true || typeof snapshot.modes?.B !== 'boolean' || snapshot.modes?.C !== false) throw new Error('Invalid snapshot members');
  const text = (x: unknown) => typeof x === 'string';
  const list = (x: unknown): x is string[] => Array.isArray(x) && x.every(text);
  for (const source of snapshot.sources) if (!source || !/^[a-f0-9]{64}$/.test(source.sha256) || !text(source.title) || !text(source.resourceUpdatedAt) || !text(source.catalogueUpdatedAt) || !text(source.acquiredAt) || !text(source.encoding) || !Number.isInteger(source.bytes) || !Number.isInteger(source.rowCount) || !list(source.schema) || !source.legacy || !Number.isInteger(source.legacy.rows) || source.license !== 'https://data.taipei/rule' || !source.catalogueUrl?.startsWith('https://data.taipei/dataset/detail?id=') || !source.resourceUrl?.startsWith('https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=')) throw new Error('Invalid source members');
  for (const row of snapshot.candidates) if (!row || !text(row.id) || !row.id || !['A','B','C'].includes(row.sourceKey) || !['A','B','C'].includes(row.tier) || !text(row.name) || !text(row.place) || !text(row.sequence) || !text(row.districtCode) || !text(row.district) || !text(row.station) || !text(row.category) || !text(row.recognition) || !text(row.widthRaw) || !list(row.issues) || !list(row.villages) || typeof row.eligible !== 'boolean' || !row.identity || !text(row.identity.normalized) || !text(row.identity.extent) || typeof row.identity.complete !== 'boolean' || !row.raw || typeof row.raw !== 'object' || Array.isArray(row.raw) || !Object.values(row.raw).every(text)) throw new Error('Invalid candidate members');
  const byId = new Map(snapshot.candidates.map(x => [x.id,x]));
  for (const edge of snapshot.relationships) {
    if (!edge || !text(edge.id) || !list(edge.alternatives) || !list(edge.reasons) || !list(edge.comparedFields) || !['A/B','A/C','B/C'].includes(edge.pair) || !['accepted','ambiguous','rejected','unmatched','unsupported'].includes(edge.status) || !byId.has(edge.leftId) || edge.rightId !== null && !byId.has(edge.rightId) || edge.alternatives.some(id => !byId.has(id))) throw new Error('Invalid relationship members');
    if (edge.status === 'accepted') { const a = byId.get(edge.leftId)!, b = byId.get(edge.rightId ?? ''); if (!b || edge.pair !== a.sourceKey + '/' + b.sourceKey || a.districtCode !== b.districtCode || !a.district || !edge.districtAgreement || !edge.roadAgreement || !edge.extentAgreement) throw new Error('Invalid accepted relationship'); }
  }
  if (snapshot.policyId !== 'policy-12' || snapshot.methodId !== METHOD_ID || snapshot.sources.length !== 3 || snapshot.sources.some((s, i) => s.status !== 'accepted' || s.key !== ['A','B','C'][i])) throw new Error('Source/method mismatch');
  const ids = snapshot.candidates.map(x => x.id);
  if (new Set(ids).size !== ids.length || new Set(snapshot.relationships.map(x => x.id)).size !== snapshot.relationships.length) throw new Error('Duplicate IDs');
  for (const row of snapshot.candidates) if (!snapshot.sources.some(s => s.key === row.sourceKey && s.sha256 === row.sourceSha256)) throw new Error('Candidate source mismatch');
}
export function runAccessScenario(snapshot: Snapshot, config: Config = DEFAULT_CONFIG): Scenario {
  validateAccessSnapshot(snapshot);
  if (![5,10,'all'].includes(config.capacity) || !['A','B','C'].includes(config.mode) || !['evidence-first','balanced'].includes(config.strategy)) throw new Error('Invalid scenario configuration');
  const byId = new Map(snapshot.candidates.map(x => [x.id, x]));
  const universe: Selection[] = config.mode === 'A' ? snapshot.candidates.map(x => ({ id: x.id, sourceIds: [x.id], group: x.sourceKey, district: x.district || '(unknown)', tier: x.tier, issues: x.issues, reason: 'source-documentation-review' })) :
    config.mode === 'B' && snapshot.modes.B ? snapshot.relationships.filter(x => x.status === 'accepted').map(x => {
      const a = byId.get(x.leftId), b = byId.get(x.rightId ?? '');
      if (!a || !b || !x.districtAgreement || !x.roadAgreement || !x.extentAgreement || !a.eligible || !b.eligible) throw new Error('Invalid accepted relationship');
      return { id: x.id, sourceIds: [a.id, b.id], group: x.pair, district: a.district, tier: 'B', issues: ['mixed-edition-association'], reason: 'accepted-documentary-association-review' };
    }) : [];
  const exclusions: Record<string, number> = {}, filter = config.eligibility;
  const eligible = universe.filter(item => {
    const rows = item.sourceIds.map(id => byId.get(id)!);
    const reason = rows.some(x => !x.eligible) ? 'not-admitted' : filter.source !== 'all' && !rows.some(x => x.sourceKey === filter.source) ? 'source-filter'
      : filter.issue === 'primary' && item.tier !== 'A' ? 'primary-filter'
      : filter.issue === 'documentation' && item.tier !== 'B' ? 'documentation-filter'
      : filter.district !== 'all' && item.district !== filter.district ? 'district-filter'
      : filter.category !== 'all' && !rows.some(x => `${x.sourceKey}:${x.category}` === filter.category) ? 'category-filter'
      : filter.query.trim() && !rows.some(x => normalizeRoadText([x.name,x.place,x.id,x.sequence,x.station].join(' ')).toLowerCase().includes(normalizeRoadText(filter.query).toLowerCase())) ? 'query-filter' : null;
    if (reason) exclusions[reason] = (exclusions[reason] ?? 0) + 1;
    return !reason;
  }).sort(compare);
  const ordered = config.strategy === 'balanced' ? balance(eligible) : eligible;
  const selected = ordered.slice(0, config.capacity === 'all' ? undefined : config.capacity);
  return { ...config, eligibility: { ...filter }, snapshotId: snapshot.snapshotId, methodId: snapshot.methodId,
    sourceHashes: snapshot.sources.map(x => x.sha256), grain: config.mode === 'A' ? 'published-source-row' : 'accepted-relationship',
    available: config.mode === 'A' || config.mode === 'B' && snapshot.modes.B, population: universe.length,
    eligibleCount: eligible.length, eligibleIds: eligible.map(x => x.id).sort(lexical), unselectedCount: eligible.length - selected.length, exclusions, selected,
    tiers: countValues(selected.map(x => x.tier)), districts: countValues(selected.map(x => x.district)),
    sources: countValues(selected.map(x => x.group)) };
}
export function compareAccessScenarios(a: Scenario, b: Scenario) {
  if (a.snapshotId !== b.snapshotId || a.methodId !== b.methodId || a.mode !== b.mode || JSON.stringify(a.sourceHashes) !== JSON.stringify(b.sourceHashes)) throw new Error('Incompatible scenarios');
  const first = new Set(a.selected.map(x => x.id)), second = new Set(b.selected.map(x => x.id));
  return { equivalentPopulation: JSON.stringify(a.eligibleIds) === JSON.stringify(b.eligibleIds),
    shared: [...first].filter(x => second.has(x)), added: [...second].filter(x => !first.has(x)), removed: [...first].filter(x => !second.has(x)), eligibleChange: b.eligibleCount - a.eligibleCount };
}
export function sensitivity(snapshot: Snapshot, config: Config) {
  const base = runAccessScenario(snapshot, config);
  const configs: { label: string; config: Config }[] = [
    ...(['all','A','B','C'] as const).map(source => ({ label: `source-${source}`, config: { ...config, eligibility: { ...config.eligibility, source } } })),
    ...(['all','primary','documentation'] as const).map(issue => ({ label: `issue-${issue}`, config: { ...config, eligibility: { ...config.eligibility, issue } } })),
    ...([5,10,'all'] as const).map(capacity => ({ label: `capacity-${capacity}`, config: { ...config, capacity } })),
    ...(['evidence-first','balanced'] as const).map(strategy => ({ label: strategy, config: { ...config, strategy } })),
  ];
  return configs.map(({ label, config: next }) => { const scenario = runAccessScenario(snapshot, next); return { label, scenario, change: compareAccessScenarios(base, scenario) }; });
}
export async function accessBriefing(snapshot: Snapshot, scenario: Scenario, exactSnapshotHash: string) {
  if (!/^[a-f0-9]{64}$/.test(exactSnapshotHash) || scenario.selected.length > 10000 || JSON.stringify(runAccessScenario(snapshot, scenario)) !== JSON.stringify(scenario)) throw new Error('Invalid source-bound export');
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot, null, 2) + '\n');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (digest !== exactSnapshotHash) throw new Error('Snapshot hash does not bind to export');
  return { title: 'Administrative Fire Access Evidence Briefing / 消防通道行政證據查核摘要', policyId: snapshot.policyId,
    methodId: snapshot.methodId, snapshotId: snapshot.snapshotId, exactSnapshotHash, analysisDate: snapshot.analysisDate,
    sourceVersions: snapshot.sources.map(s => ({ key: s.key, datasetId: s.datasetId, resourceId: s.resourceId, sha256: s.sha256, resourceUpdatedAt: s.resourceUpdatedAt, referenceTime: s.referenceTime })),
    candidateGrain: scenario.grain, mode: scenario.mode, eligibility: scenario.eligibility, capacity: scenario.capacity, strategy: scenario.strategy,
    eligibleCount: scenario.eligibleCount, selectedIds: scenario.selected.map(x => x.id), selectedSourceIds: [...new Set(scenario.selected.flatMap(x => x.sourceIds))],
    selectedRelationshipIds: scenario.mode === 'B' ? scenario.selected.map(x => x.id) : [], selected: scenario.selected,
    districts: scenario.districts, sources: scenario.sources, tiers: scenario.tiers, exclusions: scenario.exclusions,
    relationshipGateExclusions: scenario.mode === 'B' ? countValues(snapshot.relationships.filter(x => x.status !== 'accepted').map(x => x.status)) : {},
    relationshipGateGrain: 'audit pair entries / unmatched left-source rows; separate from source-row filter exclusions',
    limitations: snapshot.limitations };
}
export function safeAccessCsvCell(value: unknown) {
  let text = String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export async function accessBriefingCsv(snapshot: Snapshot, scenario: Scenario, exactHash: string) {
  const report = await accessBriefing(snapshot, scenario, exactHash), provenance = JSON.stringify({ ...report, selected: undefined });
  const header = ['id','source_ids','district','tier','issue_codes','reason','provenance_json'];
  const rows: unknown[][] = report.selected.map((x, i) => [x.id,x.sourceIds.join('|'),x.district,x.tier,x.issues.join('|'),x.reason,i === 0 ? provenance : '']);
  if (!rows.length) rows.push(['','','','','','',provenance]);
  const result = '\uFEFF' + [header,...rows].map(row => row.map(safeAccessCsvCell).join(',')).join('\r\n');
  if (new Blob([result]).size > 20_000_000) throw new Error('Export byte limit');
  return result;
}
export function selectedRows(snapshot: Snapshot, selection: Selection): Candidate[] { return selection.sourceIds.map(id => snapshot.candidates.find(c => c.id === id)!); }
