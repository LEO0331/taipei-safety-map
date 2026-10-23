import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { compareScenarios, DEFAULT_ELIGIBILITY, exportScenario, exportScenarioCsv, runScenario, safeCsvCell } from './bridgePolicyScenarios';
import type { PolicySnapshot } from '../types/bridgePolicy';
const pointer = JSON.parse(await readFile('public/data/bridge-policy/current.json', 'utf8'));
const snapshot: PolicySnapshot = JSON.parse(await readFile(`public/data/bridge-policy/${pointer.filename}`, 'utf8'));
describe('Policy decision scenarios on retained real evidence', () => {
  it.each([5, 10, 'all'] as const)('selects deterministic capacity %s', capacity => {
    const result = runScenario(snapshot, capacity, 'evidence-first');
    expect(result.selected).toHaveLength(capacity === 'all' ? 416 : capacity);
    expect(result.selected.map(x => x.id)).toEqual(runScenario({ ...snapshot, inspections: [...snapshot.inspections].reverse() }, capacity, 'evidence-first').selected.map(x => x.id));
    expect(result.selected.slice(0, 5).every(x => x.tier === 'A')).toBe(true);
  });
  it('applies first-match exclusions before selection and supports zero results', () => {
    const result = runScenario(snapshot, 5, 'evidence-first', { ...DEFAULT_ELIGIBILITY, district: 'nonexistent' });
    expect(result.selected).toHaveLength(0); expect(result.exclusions['district-filter']).toBe(416);
    expect(Object.values(result.exclusions).reduce((a, b) => a + b, 0)).toBe(result.excludedCount);
  });
  it('keeps broader identity review separate from geographic certification', () => {
    const broad = runScenario(snapshot, 'all', 'evidence-first', { ...DEFAULT_ELIGIBILITY, population: 'accepted-or-ambiguous' });
    const geographic = runScenario(snapshot, 'all', 'evidence-first', { ...DEFAULT_ELIGIBILITY, population: 'geographic' });
    expect(broad.eligibleCount).toBe(221); expect(geographic.eligibleCount).toBe(194);
    expect(geographic.selected.every(x => x.association.status === 'accepted' && x.geography?.status === 'valid-reference')).toBe(true);
    expect(broad.selected.filter(x => x.association.status === 'ambiguous').every(x => x.geography === null)).toBe(true);
  });
  it('balances administrative representation deterministically', () => {
    const first = runScenario(snapshot, 10, 'evidence-first'), balanced = runScenario(snapshot, 10, 'balanced');
    expect(Object.keys(balanced.districts).length).toBe(10);
    expect(balanced.selected.map(x => x.id)).toEqual(runScenario(snapshot, 10, 'balanced').selected.map(x => x.id));
    expect(compareScenarios(first, balanced).added.length).toBeGreaterThan(0);
  });
  it('compares exact shared/added/removed IDs and rejects different snapshot/method', () => {
    const a = runScenario(snapshot, 5, 'evidence-first'), b = runScenario(snapshot, 10, 'evidence-first');
    expect(compareScenarios(a, b)).toMatchObject({ shared: a.selected.map(x => x.id), removed: [], eligibleChange: 0 });
    expect(compareScenarios(a, a).added).toEqual([]);
    expect(() => compareScenarios(a, { ...b, snapshotId: 'other' })).toThrow('different');
    expect(() => runScenario({ ...snapshot, inspections: [snapshot.inspections[0], snapshot.inspections[0]] }, 5, 'balanced')).toThrow('Duplicate');
  });
  it('gates unavailable geographic mode without fabricated candidates', () => {
    const result = runScenario({ ...snapshot, modes: { A: true, B: false, C: false } }, 5, 'evidence-first', DEFAULT_ELIGIBILITY, 'B');
    expect(result.available).toBe(false); expect(result.selected).toEqual([]);
  });
  it('exports actual selections, evidence limits and original hashes safely', () => {
    const scenario = runScenario(snapshot, 5, 'evidence-first'); const report = exportScenario(snapshot, scenario);
    expect(report.selectedIds).toEqual(scenario.selected.map(x => x.id)); expect(report.sources[0].sha256).toHaveLength(64);
    expect(report.unavailableStructuralMetrics).toContain('load ratings'); expect(report.disclaimer).toContain('not an official');
    expect(exportScenarioCsv(snapshot, scenario)).toContain(snapshot.snapshotId);
    expect(exportScenarioCsv(snapshot, runScenario(snapshot, 5, 'balanced', { ...DEFAULT_ELIGIBILITY, query: 'no-such-source' }))).toContain('provenance_json');
  });
  it.each(['=HYPERLINK("https://evil")', ' +1', '-1', '@cmd', '\t=1', '\rfoo'])('guards CSV formula %s', value => expect(safeCsvCell(value).startsWith('"\'')).toBe(true));
  it('preserves current source identity and tier accounting with zero claimed safe bridges', () => {
    expect(snapshot.diagnostics).toMatchObject({ sourceRowsA: 416, historicalGroupsA: 415, inventoryRowsB: 612, acceptedA: 216, ambiguousA: 5, rejectedA: 18, unmatchedA: 177, acceptedGeography: 194, tierA: 23, tierB: 393, tierC: 0 });
    expect(snapshot.modes.C).toBe(false);
    expect(snapshot.inspections.filter(x => x.association.status !== 'accepted').every(x => x.geography === null)).toBe(true);
  });
});
