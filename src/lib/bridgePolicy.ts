import type { Candidate, InspectionRow, Association, InventoryRow } from '../types/bridgePolicy';

export const METHOD_ID = 'bridge-inspection-evidence-review-v1';
export const ANALYSIS_DATE = '2026-10-23';
export function parsePolicyYear(raw: string): number | null {
  const match = raw.replace(/[\s,，]/g, '').match(/^(\d{2,4})(?:年)?$/);
  if (!match) return null;
  const n = Number(match[1]), year = n < 1911 ? n + 1911 : n;
  return year >= 1900 && year <= 2100 ? year : null;
}
export function parsePolicyCost(raw: string): number | null {
  const value = raw.replace(/[\s,，]|NT\$|元/gi, '');
  return /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) ? Number(value) : null;
}
export const criticalIssues = new Set(['malformed-inspection-year', 'malformed-maintenance-year', 'future-inspection-year', 'future-maintenance-year', 'conflicting-group-records', 'duplicate-sequence', 'missing-name', 'ambiguous-identity', 'rejected-identity']);
export function classifyCandidate(row: InspectionRow, association: Association, inventory: InventoryRow[]): Candidate {
  const asset = association.status === 'accepted' ? inventory.find(x => x.id === association.inventoryId) : undefined;
  const issues = [...row.issues];
  if (association.status === 'ambiguous') issues.push('ambiguous-identity');
  if (association.status === 'rejected') issues.push('rejected-identity');
  if (association.status === 'unmatched') issues.push('unmatched-identity');
  // Official terminology and interval applicability are not independently certified.
  issues.push('result-terminology-unverified');
  if (!asset?.intervalMonths) issues.push('interval-unverified');
  if (asset?.geography.status === 'excluded') issues.push('geographic-evidence-excluded');
  const tier = issues.some(x => criticalIssues.has(x)) ? 'A' : issues.length ? 'B' : 'C';
  return { ...row, issues, tier, association, inventoryId: asset?.id ?? null,
    bridgeId: asset?.bridgeId || null, intervalMonths: asset?.intervalMonths ?? null,
    geography: asset?.geography ?? null };
}
export const countValues = (values: string[]) => values.reduce<Record<string, number>>((counts, key) => { counts[key || '(unknown)'] = (counts[key || '(unknown)'] ?? 0) + 1; return counts; }, {});
export function yearEvidence(year: number | null, analysisDate = ANALYSIS_DATE) {
  return { publishedYear: year, calendarYearDifference: year === null ? null : Number(analysisDate.slice(0, 4)) - year,
    month: null, day: null, overdue: null };
}
