import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { hash, loadAccepted, atomicJson, OUTPUT } from './fireRescueAccessPolicySources.ts';
import { reconcileAccess, documentaryTier, normalizeRoadText, widthEvidence } from '../src/lib/fireRescueAccessIdentity.ts';
import { countValues, METHOD_ID, runAccessScenario, DEFAULT_CONFIG, compareAccessScenarios, sensitivity } from '../src/lib/fireRescueAccessScenarios.ts';
import type { Snapshot, Candidate } from '../src/types/fireRescueAccessPolicy.ts';

export async function createAccessPayload() {
  const { sources, candidates } = await loadAccepted();
  const relationships = reconcileAccess(candidates);
  const ambiguous = new Set(relationships.filter(x => x.status === 'ambiguous').flatMap(x => [x.leftId, x.rightId]));
  const accepted = new Set(relationships.filter(x => x.status === 'accepted').flatMap(x => [x.leftId, x.rightId]));
  for (const row of candidates) {
    if (ambiguous.has(row.id)) row.issues.push('ambiguous-association');
    if (accepted.has(row.id)) row.issues.push('mixed-edition-association');
    if (!relationships.some(x => x.rightId !== null && (x.leftId === row.id || x.rightId === row.id))) row.issues.push('unmatched-association');
    row.tier = documentaryTier(row.issues);
  }
  const sourceQuality = Object.fromEntries(sources.map(source => {
    const rows = candidates.filter(x => x.sourceKey === source.key);
    const duplicates = (values: string[]) => Object.fromEntries(Object.entries(countValues(values.filter(Boolean))).filter(([, n]) => n > 1));
    return [source.key, { acceptedRows: rows.length, retainedRows: source.legacy.rows, districts: countValues(rows.map(x => x.district)),
      categories: countValues(rows.map(x => x.category)), recognition: source.key === 'C' ? countValues(rows.map(x => x.recognition)) : {},
      stationLabels: new Set(rows.map(x => x.station).filter(Boolean)).size, villageRawLabels: new Set(rows.map(x => x.raw['里別']).filter(Boolean)).size,
      multiVillageRows: rows.filter(x => x.villages.length > 1).length, derivedVillageLabels: new Set(rows.flatMap(x => x.villages)).size,
      missingFields: Object.fromEntries(source.schema.filter(k => k !== '聯絡電話').map(k => [k, rows.filter(x => !x.raw[k]?.trim()).length])),
      duplicateSequences: duplicates(rows.map(x => x.sequence)), duplicateNames: duplicates(rows.map(x => normalizeRoadText(x.place || x.name))),
      duplicateAddresses: duplicates(rows.map(x => normalizeRoadText(x.name))),
      broadOrIntersectionRows: rows.filter(x => x.identity.broad || x.identity.intersection).length,
      rangeOrAreaRows: rows.filter(x => x.identity.broad).length, intersectionRows: rows.filter(x => x.identity.intersection).length,
      rawWidthByCategory: source.key === 'B' ? Object.fromEntries([...new Set(rows.map(x => x.category))].map(category => [category,countValues(rows.filter(x => x.category === category).map(x => x.widthRaw))])) : {},
      widthStatus: source.key === 'B' ? countValues(rows.map(x => widthEvidence(x.widthRaw).status)) : {},
      numericWidthAdmitted: 0, officialGeographyAdmitted: 0, excludedRows: rows.filter(x => !x.eligible).length,
      issues: countValues(rows.flatMap(x => x.issues)) }];
  }));
  const pairQuality = Object.fromEntries((['A/B','A/C','B/C'] as const).map(pair => {
    const edges = relationships.filter(x => x.pair === pair), [a,b] = pair.split('/');
    return [pair, { auditEntries: edges.length, attemptedPairs: edges.filter(x => x.rightId !== null).length,
      statuses: countValues(edges.map(x => x.status)), reasons: countValues(edges.flatMap(x => x.reasons)),
      leftPopulation: candidates.filter(x => x.sourceKey === a).length, rightPopulation: candidates.filter(x => x.sourceKey === b).length,
      leftWithoutAccepted: candidates.filter(x => x.sourceKey === a && !edges.some(e => e.leftId === x.id && e.status === 'accepted')).length,
      rightWithoutAccepted: candidates.filter(x => x.sourceKey === b && !edges.some(e => e.rightId === x.id && e.status === 'accepted')).length,
      rightWithoutAttempt: candidates.filter(x => x.sourceKey === b && !edges.some(e => e.rightId === x.id)).length }];
  }));
  return { schemaVersion: 1 as const, policyId: 'policy-12' as const, methodId: METHOD_ID, analysisDate: '2026-10-25', publicationDate: '2026-10-25',
    sources, candidates, relationships, quality: { sources: sourceQuality, pairs: pairQuality, tiers: countValues(candidates.map(x => x.tier)),
      widthNumericResearch: 'disabled: CSV unit/survey semantics not edition-bound to contextual PDF',
      timeContract: 'mixed-edition documentary research; no verified shared reference cutoff',
      acquisitionNotes: 'C HTTP payload has 411 rows; cached catalogue text previously described 446. B HTTP has 273 versus retained 274. Resource update timestamps are not content identities.' },
    modes: { A: true as const, B: relationships.some(x => x.status === 'accepted'), C: false as const },
    limitations: [
      'Documentary evidence readiness is not operational emergency readiness. No current passability, dispatch, response-time or fire-risk conclusion is available.',
      'Mixed-edition documentary research: A 2024 resource, B/C 2026 resources; effective reference periods and actual survey dates are unknown.',
      'Published rows are administrative listings, not counts of unique roads, buildings or physical road segments.',
      'Exact complete-label associations are conservative research correspondence, not official connectivity, overlap, adjacency or a government crosswalk.',
      'Red/yellow, rating and recognition labels are preserved without hazard weights; contextual official definitions are not an edition-bound coding dictionary.',
      'Width cells lack units and measurement method in this CSV contract. A separate official PDF uses metres; compatibility remains unproven. Numeric research is disabled; width is never vehicle clearance.',
      'No compatible source geometry or operational evidence is admitted. District grouping uses published codes, without polygon validation.',
      'Historical edition count differences and reordered sequence numbers do not establish removals, improvements, closures or a trend.',
      'Tier A/B/C denotes documentary review only. Balanced selection retains global tier precedence, then source/pair rounds and district rounds in code-point order.',
    ] };
}
export async function buildAccessSnapshot() {
  const content = await createAccessPayload();
  const provisional: Snapshot = { ...content, snapshotId: 'prepublication' };
  const compact = (scenario: ReturnType<typeof runAccessScenario>) => ({ config: { mode: scenario.mode, capacity: scenario.capacity, strategy: scenario.strategy, eligibility: scenario.eligibility }, eligibleCount: scenario.eligibleCount, selectedIds: scenario.selected.map(x => x.id), tiers: scenario.tiers, sources: scenario.sources, districts: scenario.districts, exclusions: scenario.exclusions });
  const baseline = { scenarios: (['A','B'] as const).flatMap(mode => ([5,10,'all'] as const).flatMap(capacity => (['evidence-first','balanced'] as const).map(strategy => compact(runAccessScenario(provisional, { ...DEFAULT_CONFIG, mode, capacity, strategy }))))),
    sensitivity: sensitivity(provisional, DEFAULT_CONFIG).map(x => ({ label: x.label, result: compact(x.scenario), change: x.change })) };
  const payload = { ...content, baseline }, snapshotId = `fire-rescue-access-policy-v1-${hash(JSON.stringify(payload))}`;
  const snapshot: Snapshot = { ...payload, snapshotId };
  const bytes = Buffer.from(JSON.stringify(snapshot, null, 2) + '\n');
  if (bytes.length > 5_000_000) throw new Error('Snapshot budget exceeded');
  const filename = `${snapshotId}.json`; await mkdir(OUTPUT, { recursive: true });
  try { const existing = await readFile(`${OUTPUT}/${filename}`); if (!existing.equals(bytes)) throw new Error('Immutable snapshot collision'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; await writeFile(`${OUTPUT}/${filename}`, bytes, { flag: 'wx' }); }
  const confirmed = await readFile(`${OUTPUT}/${filename}`); if (!confirmed.equals(bytes)) throw new Error('Incomplete publication');
  const pointer = { schemaVersion: 1, snapshotId, filename, sha256: hash(bytes), bytes: bytes.length };
  await atomicJson(`${OUTPUT}/current.json`, pointer);
  return { snapshot, pointer };
}
export function resultsFor(snapshot: Snapshot, pointer: { sha256: string; bytes: number }) {
  const scenarios = (['A','B'] as const).flatMap(mode => ([5,10,'all'] as const).flatMap(capacity => (['evidence-first','balanced'] as const).map(strategy => runAccessScenario(snapshot, { ...DEFAULT_CONFIG, mode, capacity, strategy }))));
  const overlap = (['A','B'] as const).flatMap(mode => ([5,10,'all'] as const).map(capacity => {
    const [a,b] = scenarios.filter(x => x.mode === mode && x.capacity === capacity); return { mode, capacity, ...compareAccessScenarios(a,b) };
  }));
  const examples: Record<string, Candidate | undefined> = {
    sourceA: snapshot.candidates.find(x => x.sourceKey === 'A'), sourceB: snapshot.candidates.find(x => x.sourceKey === 'B'), sourceC: snapshot.candidates.find(x => x.sourceKey === 'C'),
    multipleVillages: snapshot.candidates.find(x => x.villages.length > 1), range: snapshot.candidates.find(x => x.sourceKey === 'C' && x.identity.broad && /至|到|~|～|一帶|周邊|附近|地區|路口/.test(x.identity.extent)),
    ambiguous: snapshot.candidates.find(x => x.issues.includes('ambiguous-association')),
  };
  return { snapshotId: snapshot.snapshotId, exactSnapshotHash: pointer.sha256, bytes: pointer.bytes, analysisDate: snapshot.analysisDate,
    sources: snapshot.sources, quality: snapshot.quality, modes: snapshot.modes, scenarios, strategyOverlap: overlap,
    sensitivity: sensitivity(snapshot, DEFAULT_CONFIG), examples,
    acceptedExample: snapshot.relationships.find(x => x.status === 'accepted') ?? null,
    rejectedExample: snapshot.relationships.find(x => x.status === 'rejected' && x.reasons.includes('section-lane-alley-conflict')) ?? null,
    modeCBlockers: ['authoritative road-segment crosswalk','current surveyed geometry and clearance','vehicle dimensions and maneuverability','closures and obstructions','staffing and vehicle availability','dispatch history and timestamps','official operational validation'],
    limitations: snapshot.limitations };
}
if (process.argv[1]?.replaceAll('\\','/').endsWith('/buildFireRescueAccessPolicySnapshot.ts')) {
  const { snapshot, pointer } = await buildAccessSnapshot();
  await atomicJson('docs/fire-rescue-access-policy-results.json', resultsFor(snapshot,pointer));
  console.log(JSON.stringify({ ...pointer, quality: snapshot.quality }, null, 2));
}
