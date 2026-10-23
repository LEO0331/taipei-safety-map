import { expect, it, describe } from 'vitest';
import { reconcileBridges, normalizeBridgeName } from './bridgePolicyIdentity';
import { classifyCandidate } from './bridgePolicy';
import type { InspectionRow, InventoryRow } from '../types/bridgePolicy';
const a = (patch: Partial<InspectionRow> = {}): InspectionRow => ({ id: 'A1', row: 2, sequence: '1', group: 'g', name: '臺橋(東)', district: '文山區', authority: '新建工程處', inspectionYear: 2024, maintenanceYear: null, cost: null, raw: {}, issues: [], ...patch });
const b = (patch: Partial<InventoryRow> = {}): InventoryRow => ({ id: 'B1', row: 1, sourceId: '1', bridgeId: 'G1', name: '臺橋(東)', district: '文山區', authority: '新建工程處', intervalMonths: 24, raw: {}, issues: [], geography: { object: { latitude: 25.05, longitude: 121.5 }, start: null, end: null, status: 'valid-reference', issues: [], level: 'published-object-reference', boundaryValidated: false }, ...patch });
describe('Conservative identity reconciliation (synthetic)', () => {
  it('accepts exact and normalized unique composites, including blank bridge_id with unique ID', () => {
    expect(reconcileBridges([a()], [b()])[0].type).toBe('exact-composite');
    expect(reconcileBridges([a()], [b({ name: '台橋（東）', bridgeId: '' })])[0]).toMatchObject({ status: 'accepted', type: 'normalized-composite' });
  });
  it('preserves direction, numbering, suffixes and parentheses', () => {
    for (const value of ['臺橋(西)', '臺橋(東)2', '臺橋東', '臺橋(東)匝道']) expect(reconcileBridges([a()], [b({ name: value })])[0].status).toBe('unmatched');
    expect(normalizeBridgeName('台 橋（東）')).toBe('台橋(東)');
    expect(normalizeBridgeName('橋①')).not.toBe(normalizeBridgeName('橋1'));
  });
  it('keeps one-to-many and many-to-one ambiguous', () => {
    expect(reconcileBridges([a()], [b(), b({ id: 'B2', sourceId: '2' })])[0].status).toBe('ambiguous');
    expect(reconcileBridges([a(), a({ id: 'A2' })], [b()]).every(x => x.status === 'ambiguous' && x.inventoryId === null)).toBe(true);
  });
  it.each(['duplicate-ID', 'duplicate-bridge-id', 'missing-ID'])('blocks identifier issue %s', issue => expect(reconcileBridges([a()], [b({ issues: [issue] })])[0].status).toBe('ambiguous'));
  it('rejects conflicting districts or authorities, including missing identity fields', () => {
    for (const patch of [{ district: '士林區' }, { authority: '水利工程處' }, { district: '' }, { authority: '' }]) expect(reconcileBridges([a(patch)], [b()])[0].status).toBe('rejected');
  });
  it('never transfers coordinates for rejected or ambiguous associations', () => {
    for (const assets of [[b({ authority: '水利工程處' })], [b(), b({ id: 'B2' })]]) {
      const row = a(); const association = reconcileBridges([row], assets)[0];
      expect(classifyCandidate(row, association, assets).geography).toBeNull();
      expect(classifyCandidate(row, association, assets).inventoryId).toBeNull();
    }
  });
  it('does not use point similarity to associate different names', () => expect(reconcileBridges([a()], [b({ name: '另一座橋' })])[0].status).toBe('unmatched'));
  it('applies conflict tier before completeness and preserves raw results', () => {
    const row = a({ issues: ['missing-maintenance-year', 'malformed-inspection-year'] });
    expect(classifyCandidate(row, reconcileBridges([row], [b()])[0], [b()]).tier).toBe('A');
    expect(classifyCandidate(a(), reconcileBridges([a()], [b()])[0], [b()]).tier).toBe('B');
  });
});
