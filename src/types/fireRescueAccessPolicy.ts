export type SourceKey = 'A' | 'B' | 'C';
export type Tier = 'A' | 'B' | 'C';
export type SourceEdition = {
  key: SourceKey; datasetId: string; resourceId: string; title: string; publisher: string;
  catalogueUrl: string; resourceUrl: string; resourceUpdatedAt: string; catalogueUpdatedAt: string;
  referenceTime: string | null; acquiredAt: string; historicalAcquiredAt: string | null;
  filename: string; catalogueFile: string; catalogueSha256: string; sha256: string; bytes: number;
  encoding: string; rowCount: number; schema: string[]; contentType: string; license: string;
  status: 'pending' | 'accepted'; legacy: { path: string; sha256: string; gitSha256: string; rows: number; sameParsedRows: boolean; sameHttpBytes: boolean };
};
export type RoadIdentity = {
  normalized: string; embeddedDistrict: string | null; base: string | null; section: string | null; lane: string | null; alley: string | null;
  extent: string; complete: boolean; broad: boolean; intersection: boolean;
};
export type Candidate = {
  id: string; sourceKey: SourceKey; sourceSha256: string; row: number; sequence: string;
  districtCode: string; district: string; name: string; place: string; station: string; villages: string[];
  category: string; recognition: string; widthRaw: string; widthNumeric: number | null; widthUnit: 'unknown';
  identity: RoadIdentity; raw: Record<string, string>; issues: string[]; tier: Tier; eligible: boolean;
};
export type Relationship = {
  id: string; pair: 'A/B' | 'A/C' | 'B/C'; leftId: string; rightId: string | null;
  alternatives: string[]; comparedFields: string[]; districtAgreement: boolean; roadAgreement: boolean;
  extentAgreement: boolean; method: string; status: 'accepted' | 'ambiguous' | 'rejected' | 'unmatched' | 'unsupported';
  reasons: string[]; mixedEdition: true;
};
export type Snapshot = {
  schemaVersion: 1; policyId: 'policy-12'; methodId: string; analysisDate: string; publicationDate: string;
  snapshotId: string; sources: SourceEdition[]; candidates: Candidate[]; relationships: Relationship[];
  baseline?: Record<string, unknown>; quality: Record<string, unknown>; limitations: string[]; modes: { A: true; B: boolean; C: false };
};
export type Eligibility = {
  source: 'all' | SourceKey; issue: 'all' | 'primary' | 'documentation'; district: string; category: string; query: string;
};
export type Config = { mode: 'A' | 'B' | 'C'; capacity: 5 | 10 | 'all'; strategy: 'evidence-first' | 'balanced'; eligibility: Eligibility };
export type Selection = { id: string; sourceIds: string[]; group: string; district: string; tier: Tier; issues: string[]; reason: string };
export type Scenario = Config & {
  snapshotId: string; methodId: string; sourceHashes: string[]; grain: 'published-source-row' | 'accepted-relationship';
  available: boolean; population: number; eligibleCount: number; unselectedCount: number;
  eligibleIds: string[]; exclusions: Record<string, number>; selected: Selection[];
  tiers: Record<string, number>; districts: Record<string, number>; sources: Record<string, number>;
};
