export type SourceEdition = {
  key: 'A' | 'B'; datasetId: string; title: string; publisher: string;
  catalogueUrl: string; resourceId: string; resourceUrl: string;
  resourceUpdatedAt: string; catalogueUpdatedAt: string; acquiredAt: string | null;
  acquisitionPrecision: string; filename: string; originalFilename: string; format: string; bytes: number;
  sha256: string; encoding: string; rowCount: number; schema: string[];
  license: string; refreshFrequency: string; status: 'accepted' | 'pending' | 'unavailable'; errors: string[];
  historicalOriginalAcquiredAt?: null; historicalGitBlobSha256?: string;
};
export type InspectionRow = {
  id: string; row: number; sequence: string; group: string; name: string;
  district: string; authority: string; inspectionYear: number | null;
  maintenanceYear: number | null; cost: number | null;
  raw: Record<string, string>; issues: string[];
};
export type Point = { longitude: number; latitude: number };
export type GeographicEvidence = {
  status: 'valid-reference' | 'excluded'; object: Point | null; start: Point | null;
  end: Point | null; issues: string[]; boundaryValidated: false;
  level: 'published-object-reference' | 'none';
};
export type InventoryRow = {
  id: string; row: number; sourceId: string; bridgeId: string; name: string;
  district: string; authority: string; intervalMonths: number | null;
  raw: Record<string, unknown>; issues: string[]; geography: GeographicEvidence;
};
export type Association = {
  inspectionId: string; status: 'accepted' | 'ambiguous' | 'rejected' | 'unmatched';
  type: 'exact-composite' | 'normalized-composite' | 'none';
  inventoryId: string | null; candidates: string[]; reasons: string[];
};
export type Candidate = InspectionRow & {
  tier: 'A' | 'B' | 'C'; association: Association; inventoryId: string | null;
  bridgeId: string | null; intervalMonths: number | null;
  geography: GeographicEvidence | null;
};
export type PolicySnapshot = {
  policyId: 'policy-9'; version: 1; methodId: string; snapshotId: string;
  analysisDate: string; sources: SourceEdition[];
  inspections: Candidate[]; inventory: InventoryRow[];
  diagnostics: Record<string, number>; audit: Record<string, unknown>;
  modes: { A: boolean; B: boolean; C: false };
  assumptions: string[]; unavailableMetrics: string[];
};
export type Eligibility = {
  population: 'all' | 'accepted' | 'accepted-or-ambiguous' | 'geographic';
  issues: 'all' | 'critical'; district: string; authority: string; query: string;
};
export type Scenario = {
  snapshotId: string; methodId: string; mode: 'A' | 'B';
  capacity: 5 | 10 | 'all'; strategy: 'evidence-first' | 'balanced';
  eligibility: Eligibility; eligibleCount: number; excludedCount: number;
  exclusions: Record<string, number>; selected: Candidate[];
  tiers: Record<string, number>; districts: Record<string, number>;
  authorities: Record<string, number>; available: boolean;
};
