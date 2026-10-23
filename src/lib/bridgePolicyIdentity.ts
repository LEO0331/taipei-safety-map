import type { Association, InspectionRow, InventoryRow } from '../types/bridgePolicy';

// Preserve parentheses, directions, sequence numbers and suffixes.
export const normalizeBridgeName = (value: string) => value.replace(/[\uFF01-\uFF5E]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '').replace(/臺/g, '台');
export const normalizeAuthority = (value: string) => value.replace(/^臺北市政府工務局/, '').replace(/^台北市政府工務局/, '').trim();
export const identityGroup = (name: string, district: string, authority: string) =>
  [normalizeBridgeName(name), district.trim(), normalizeAuthority(authority)].join('|');

export function reconcileBridges(a: InspectionRow[], b: InventoryRow[]): Association[] {
  const results: Association[] = a.map(row => {
    const named = row.name ? b.filter(asset => normalizeBridgeName(asset.name) === normalizeBridgeName(row.name)) : [];
    const compatible = named.filter(asset => row.district && row.authority &&
      asset.district === row.district && normalizeAuthority(asset.authority) === normalizeAuthority(row.authority));
    const base = { inspectionId: row.id, inventoryId: null, type: 'none' as const };
    if (!named.length) return { ...base, status: 'unmatched', candidates: [], reasons: ['no-name-counterpart'] };
    if (!compatible.length) return { ...base, status: 'rejected', candidates: named.map(x => x.id), reasons: ['district-or-authority-conflict'] };
    if (compatible.length > 1 || compatible.some(x => x.issues.some(issue => ['duplicate-ID', 'duplicate-bridge-id', 'missing-ID', 'malformed-ID', 'malformed-bridge-id'].includes(issue)))) {
      return { ...base, status: 'ambiguous', candidates: compatible.map(x => x.id), reasons: ['multiple-or-conflicting-inventory-identities'] };
    }
    return { ...base, status: 'accepted', inventoryId: compatible[0].id,
      type: row.name === compatible[0].name ? 'exact-composite' : 'normalized-composite',
      candidates: [compatible[0].id], reasons: ['unique-name-district-authority-within-editions'] };
  });
  // No many-to-one association, even if A records appear to describe the same asset.
  for (const result of results) {
    if (result.status === 'accepted' && results.filter(x => x.candidates.includes(result.inventoryId!)).length > 1) {
      result.status = 'ambiguous'; result.reasons = ['inventory-reused-by-inspection-rows'];
    }
  }
  for (const result of results) if (result.status !== 'accepted') { result.inventoryId = null; result.type = 'none'; }
  return results;
}
