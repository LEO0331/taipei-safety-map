# Session Progress Log

## Current State

**Last Updated:** 2026-08-17 Asia/Taipei
**Session ID:** Codex desktop
**Active Feature:** feat-010 - Medical safety and welfare customer views

## Status

### What's Done

- [x] Created and validated the repository-local coding-agent harness (100/100).
- [x] Implemented and verified the Traffic Violation Appeal Trends module from local official data.

### What's Done

- [x] Added customer-facing local-static medical and welfare views, including the Diabetes Health Promotion Institutions directory.
  - Details: source-preserving converter, health navigation, level/search filters, external map lookup, and PWA cache coverage for 28 official institutions.
  - Verification: `npm run data:convert:diabetes-health-institutions`, `npm run build`, and `npm test` (35 tests) passed on 2026-08-17.

- [x] Added the historical kindergarten child-transport vehicle registry and fleet-analysis module.
  - Details: official 109-1 source converted to 262 locally served records with masking, filters, directory, descriptive charts, data-quality view, historical notices, PWA cache coverage, and README attribution.
  - Verification: `npm run build`, `npm test` (35 tests), and `git diff --check` passed on 2026-08-13.
- [x] Added historical Soil and Water Conservation Act violation analytics.
  - Details: 1,994 official records are served locally with source-preserving conversion, historical coverage notice, filters, descriptive charts, data-quality reporting, raw source details, CSV export, and no parcel-level mapping.
  - Verification: `npm run build`, `npm test` (35 tests), and `git diff --check` passed on 2026-08-13.
- [x] Added Tobacco and Alcohol Business Inspections analytics.
  - Details: 79 official monthly aggregate records are locally served with yearly views, category composition, cumulative progress, CSV export, source-preserving conversion, and data-quality reporting.
  - Verification: `npm run build`, `npm test` (35 tests), and `git diff --check` passed on 2026-08-13.
- [x] Added Business Hygiene Violation Cases dashboard.
  - Details: 47 official historical cases are locally served with source-preserving conversion, conservative ROC-date and fine parsing, text-derived categories, penalty-reference extraction, linked filters, CSV export, raw-text details, data-quality reporting, and no map layer.
  - Verification: `npm run build` and `npm test` (35 tests) passed on 2026-08-14.

### What's Next

1. Read this file and `session-handoff.md` before modifying the current worktree.
2. Re-run `npm run build` and `npm test` after code or data-converter changes.

## Blockers / Risks

- [ ] Build emits the existing >500 kB bundle-size warning; it does not fail the build.
- [ ] The historical source is not a current fleet, inspection, or safety registry; refresh only when the publisher provides a new resource.
- [ ] The water-conservation enforcement source ends in 2022; never treat the module as a current parcel-status lookup.
- [ ] Inspection statistics are aggregate activity data; do not use them to infer business-level violations, compliance, safety, or enforcement effectiveness.
- [ ] Business-hygiene cases are historical records; do not infer current conditions, payment status, appeal status, business identity beyond the source text, or locations from descriptions.
- [ ] Address-only datasets remain directories with external map links until authoritative, provenance-preserving coordinates are available; do not add inferred markers or nearby distances.

## Decisions Made

- **Local static data for appeal analytics**: The customer UI reads generated JSON, not the Taipei API at runtime.
  - Context: Keeps the module reliable offline and preserves a reproducible source snapshot.
  - Alternatives considered: Live API fetch was excluded by module requirements.

## Files Modified This Session

- `src/TrafficViolationAppealTrends.tsx` - customer-facing analytics views and safeguards.
- `scripts/convertTrafficViolationAppealTopClauses.ts` - Big5 source conversion and quality checks.
- `public/data/traffic-violation-appeal-top-clauses/*` - generated local records and metadata.
- `AGENTS.md`, `feature_list.json`, `session-handoff.md`, `init.sh` - agent harness.
- `src/KindergartenChildTransportVehicles.tsx`, `src/App.tsx` - historical registry UI and navigation.
- `scripts/convertKindergartenChildTransportVehicles.ts`, `data/raw/kindergarten-child-transport-vehicles/records.csv` - source-preserving conversion.
- `public/data/kindergarten-child-transport-vehicles/*`, `public/sw.js`, `README.md` - generated assets, offline cache, and documentation.
- `src/SoilWaterConservationViolations.tsx`, `scripts/convertSoilWaterConservationViolations.ts`, `data/raw/soil-water-conservation-violations/records.csv`, `public/data/soil-water-conservation-violations/*` - historical enforcement module and static data.
- `src/AlcoholTobaccoBusinessInspections.tsx`, `scripts/convertAlcoholTobaccoBusinessInspections.ts`, `data/raw/alcohol-tobacco-business-inspections/records.csv`, `public/data/alcohol-tobacco-business-inspections/*` - aggregate monthly inspection module and static data.
- `src/BusinessHygieneViolationCases.tsx`, `scripts/convertBusinessHygieneViolationCases.ts`, `data/raw/business-hygiene-violation-cases/records.csv`, `public/data/business-hygiene-violation-cases/*`, `public/sw.js` - historical business-hygiene enforcement dashboard, static data, and PWA cache entries.

## Evidence of Completion

- [x] Tests pass: `npm test` — 3 files, 35 tests passed (2026-08-12).
- [x] Type/build check clean: `npm run build` passed (2026-08-12).
- [x] Data contract: converter produced 35 JSON records with five preserved raw source fields.

## Notes for Next Session

The PWA cache version was bumped to v13 for the two new appeal JSON files. Do not reinterpret missing Top-5 appearances as zero appeals.
# 2026-08-28 — Bridge inspection and maintenance

- Added the locally sourced Taipei bridge inspection and maintenance converter and analytical dashboard.
- The official resource has no coordinates, geometry, or reliable existing-project geographic join, so no bridge markers are created.
- Verified: `npm run data:convert:bridge-inspection-maintenance` (416 records / 415 unique bridges), `npm run build`, and `npm test` (35 tests) all passed.

# 2026-08-28 — Dashboard UX consistency

- Major category buttons now navigate to the category's first module, preventing stale content from the previous category.
- Completed Traditional Chinese / English UI labels for the reported emergency, medical, fire, traffic, occupational, noise, and welfare modules.
- Fire Rescue Difficult Areas KPIs and charts now use the same filtered records as its directory.
- Applied responsive card grids to the antivenom, diabetes-health, and swimming-facility directories; aligned the welfare module with the shared hero/filter/metric/table structure.
- Confirmed in the rendered dashboard that no customer-facing map API-key message is present and external text-map links do not require an application API key.
- Verified: `npm run build`; `npm test` (35 tests); browser checks for navigation, language switching, filtered Fire Rescue summaries/charts, responsive directory columns, and absence of an API-key warning.

# 2026-08-28 — Map tile watermark

- Replaced the shared CARTO tile URL with the keyless OpenStreetMap tile service and corrected attribution.
- Browser screenshot confirms that the map renders without the `API KEY REQUIRED` watermark.
- Verified: `npm run build`; `npm test` (35 tests).

# 2026-08-28 — Dashboard filter and Chinese-mode consistency

- Removed the unused 基礎設施安全 navigation category and its unreachable bridge module route.
- Updated filter-driven dashboard summaries/charts to use the active result set for theft, police CCTV, smart enforcement, towing, fire donations, fire access, fire rescue, flooding, closure records, and domestic-violence views.
- Added record-driven filters and readable Chinese violation categories to 檢舉交通違規; converted remaining quality views in the targeted health modules from raw JSON/key dumps into label/value lists.
- Verified: `npm run build`; `npm test` (35 tests).

# 2026-08-28 — Refresh recovery and final Chinese audit

- Service-worker navigation requests are network-first with offline shell fallback, skip waiting, immediate client claim, and cache-bypassed worker updates. This prevents a stale cached HTML shell from referencing deleted deploy assets after refresh.
- Traffic Appeal and Kindergarten table details and data-quality views now render readable localized field labels instead of raw JSON or metadata keys.
- Verified production preview renders before and after a full browser refresh; `npm run build`; `npm test` (35 tests).

# 2026-10-23 — Policy #9 bridge evidence review (feat-013)

- Verified latest main 0eb4f7c; baseline init.sh passed (35 tests) after npm ci.
- Independently acquired official catalogue/source evidence; historical explorer remains unchanged. A 416 source rows / 415 groups; B 612 rows. Explicit Git byte-preservation handles legacy CSV newline normalization without inventing original acquisition provenance.
- Conservative reconciliation: 216 accepted research associations, 5 ambiguous, 18 rejected, 177 unmatched. Geographic gate: 194 A records; inventory layer 580 bridge reference points. Tiers A/B/C: 23/393/0; structural mode unavailable.
- Added lazy bilingual dashboard, deterministic 5/10/all scenarios, district balancing, sensitivity, accepted-only inspection map, 20-row pagination, full lineage and JSON/CSV exports.
- Verified seven files / 88 tests, TypeScript/production build, diff checks, deterministic double rebuild, desktop/mobile Chinese/English, maps, zero-candidate state, actual downloads and explorer retention. Independent review fixes covered malformed quotes and partial endpoint contradictions.
- Snapshot 3198380697811e454554c9c19a9c16ebf82019e7e07c4b8699099aa4bb74273a; full evidence and limitations in docs/bridge-policy-delivery.md.
- Remaining: official crosswalk, exact event dates, engineering classifications, interval applicability, administrative polygons and safety metrics remain unavailable. Existing large main-bundle warning remains. Windows Vite dev file watchers may prevent atomic pointer rename; stop dev servers, retain old pointer on failure.
- Branch codex/bridge-inspection-evidence-policy-9; deliver one PR against main, do not merge.

- Delivery blocker: branch pushed through 687b252, but PR connector returned 403 and app browser is signed out. No PR created. Credential-helper extraction was rejected by automatic approval review and was not executed. Prepared PR title/body: docs/bridge-policy-pr.md. User authentication requested; no code/testing work remains.
# 2026-10-26 — Policy #12 fire rescue access evidence review (feat-014)

- Continued the 2026-10-25 implementation on codex/fire-rescue-access-policy-12; fetched main remains 0ee4cb1856d7eaa1ecdff99197fe151bc60c10ea. Independent managed worktree preserves the main checkout.
- Accepted actual official original bytes A/B/C 185/273/411, versus retained explorer 185/274/446. A/C UTF-8; B Big5. Raw CSV/catalogue/context hashes and explicit staged acceptance preserve source provenance; no explorer source or Policy #9 snapshot changes.
- A/B attempted 281: accepted 1, ambiguous 49, rejected 231; A/C 593: accepted 0, ambiguous 355, rejected 238; B/C 624: accepted 0, ambiguous 350, rejected 274. Unmatched and unsupported left rows/right-only populations are separately audited.
- Mode A 869 source-row candidates, tiers 477/392/0. Deterministic 5/10/all and tier-preserving source/district balancing; strategy overlap 2/2/869. Mode B only A6/B116 武昌街1段16巷; both strategies select the same one. No geometry, numerical width research or operational Mode C admitted.
- Final snapshot content ID a5354b561746336ecd171478dbd2c429c948055780cdda25c1a6c709c6e86524; exact-file SHA-256 704b4c9f72a3746b4216aa96a283794c16fc40ae1013a99d9016d96948f6844d. Double rebuild is byte-identical; source-bound deterministic JSON/CSV with actual hash validation.
- 134 tests / 10 files and TypeScript/production build passed. Independent source, identity, scenarios, UI and goal-verification reviews have no remaining blockers after regression fixes. Production browser QA: EN/ZH at 320/390/768/1024/1440; modes, filters, pagination, detail/focus, labelled sensitivity, empty/selected downloads, local failure/retry, direct/return navigation and Policy #9. No policy requests on initial explorer shell. Final screenshots and request trace retained under docs.
- Same-method shell change +821 bytes / +187 gzip bytes; policy JS 44,965 bytes / 15,461 gzip; snapshot 3,353,150 bytes / 163,305 gzip. Node scenario median ~1.64–1.96ms over 100 runs/config; these are local CPU, not browser render or public-host guarantees. Existing shell-size warning remains.
- Remaining evidence limits: unknown effective cutoffs, no edition-bound width/survey/code dictionary, no compatible road geometry/crosswalk or current operational evidence. Documented conservative gates; no operational claims. Delivery/PR status follows below when complete.

- Delivery status 2026-10-26: all five scoped Lore commits pushed. Initial automatic push review was resolved after read-only verification of the exact requested public repository, admin/push rights and attached scope. GitHub PR connector then returned 403 Resource not accessible by integration. In-app GitHub browser is signed out; native Edge control stopped because current URL could not be verified reliably. No PR created and no merge attempted. Prepared title/body/manual link: docs/fire-rescue-access-policy-pr.md. PR CI has not run; feature remains in-progress for external delivery only. User explicitly confirmed they will merge themselves.
