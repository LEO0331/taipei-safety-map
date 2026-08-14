# Session Progress Log

## Current State

**Last Updated:** 2026-08-14 Asia/Taipei
**Session ID:** Codex desktop
**Active Feature:** feat-009 - Business hygiene violation cases

## Status

### What's Done

- [x] Created and validated the repository-local coding-agent harness (100/100).
- [x] Implemented and verified the Traffic Violation Appeal Trends module from local official data.

### What's Done

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
