# Policy #12 delivery and verification — 2026-10-26

Implementation is complete in one scoped feature, feat-014. Review PR: **pending creation**; target main; no automatic merge. Baseline main was fetched before editing and reconfirmed on 2026-10-26: `0ee4cb1856d7eaa1ecdff99197fe151bc60c10ea`. Branch: `codex/fire-rescue-access-policy-12`. Work remains isolated in the attached managed worktree; the main checkout is preserved.

## Verified findings

Official A/B/C source URLs, resource UUIDs, resource/catalogue timestamps, original-byte hashes, decoding, byte counts and legacy custody are in [source feasibility](fire-rescue-access-policy-source-feasibility.md), [source audit](fire-rescue-access-policy-source-audit.md) and [results JSON](fire-rescue-access-policy-results.json). Each source has twelve districts. Accepted rows are **185/273/411**, versus historical explorer **185/274/446**. Whole parsed rows unchanged are 185/164/9; B/C sequence renumbering and content changes are preserved in [edition comparison](fire-rescue-access-policy-edition-comparison.json). These changes are not a trend, delisting or improvement finding.

| Pair | Attempted pairs | Accepted | Ambiguous | Rejected | Unmatched left rows | Unsupported left rows |
|---|---:|---:|---:|---:|---:|---:|
| A/B | 281 | 1 | 49 | 231 | 101 | 1 |
| A/C | 593 | 0 | 355 | 238 | 88 | 1 |
| B/C | 624 | 0 | 350 | 274 | 123 | 4 |

Mode A has 869 published-row candidates, documentary tiers **477 A / 392 B / 0 C**. Capacities 5/10/all and both strategies operate on the same filtered population. Strategy overlap is 2/2/869 actual IDs. At five slots balanced selects A2/B2/C1 across two districts; evidence-first A5 across two. At ten slots balanced A4/B3/C3 spans four districts versus evidence-first A10 across two. Full ordered IDs, source/district/tier composition, issue/reason codes, baseline scenarios and sensitivity are in results JSON and the immutable snapshot.

Mode B admits only the exact complete-name A6/B116 documentary relationship, 中正區 武昌街1段16巷. Every capacity and both strategies select the same one; no artificial strategy difference is reported. A/C and B/C have zero accepted relations. Broader ambiguous audit scope never enlarges B eligibility.

Mode C is unavailable: authoritative road-segment crosswalk/geometry, current surveyed clearance/turning restrictions, closures/obstructions, vehicle dimensions and availability, staffing, dispatch history/timestamps and official validation are missing. All geographic evidence remains excluded. Official district GIS exists but is not a record-to-segment crosswalk. Width numeric research is disabled; source labels and raw strings remain visible without fire-risk or passability weights.

Snapshot ID: `fire-rescue-access-policy-v1-a5354b561746336ecd171478dbd2c429c948055780cdda25c1a6c709c6e86524`.

Exact-file SHA-256: `704b4c9f72a3746b4216aa96a283794c16fc40ae1013a99d9016d96948f6844d` (3,353,150 bytes). Original source hashes, canonical documentary-row hashes, historical Git hashes and this snapshot hash are separate objects. Fixed analysis/publication date remains 2026-10-25; final delivery verification occurred 2026-10-26. Acquisition/reference/build times are not conflated.

## Architecture, changed files and simplifications

- Source admission: `scripts/fireRescueAccessPolicySources.ts`, fetch/audit/build/verify/measure scripts, raw CSV/catalogue/context evidence and accepted manifests. Existing shared CSV parser, catalogue metadata extraction and atomic JSON pattern are reused.
- Research model: `src/types/fireRescueAccessPolicy.ts`; identity, scenarios, labels and bounded client loader in `src/lib/fireRescueAccess*.ts` / `loadFireRescueAccessPolicy.ts`.
- UI: `src/FireRescueAccessPolicyDashboard.tsx`, scoped CSS, lazy Preparedness navigation in App.tsx, direct query navigation and on-demand service-worker handling. No new router, GIS layer, dependency or combined risk score.
- Three focused test files cover source admission/recovery, identity/width, scenarios/exports/loading. CI adds `.github/workflows/fire-rescue-access-policy.yml`.
- README EN/ZH, feature tracker, progress and handoff updated. No Policy #9 historical source/report/snapshot or established explorer data is changed.

The main simplifications are evidence gates: no invented geometry, numeric-width classifier, emergency network or severity weights. Ambiguous and unmatched evidence remains auditable; operational unknowns remain unavailable. Row selections paginate by 20, audit entries by 10, and long ID lists render on expansion.

## Command status

| Command / check | Status | Evidence |
|---|---|---|
| npm ci | Passed | Locked 65-package install; zero audit findings, 2026-10-25 |
| ./init.sh baseline | Passed | 7 files / 88 tests; main 0ee4cb1 |
| npm run data:fetch:fire-rescue-access-policy -- --refresh | Passed | Actual original bytes staged, independently audited, then explicit edition-change acceptance |
| default data:fetch:fire-rescue-access-policy | Passed | Offline accepted-edition integrity verification |
| data:audit:fire-rescue-access-policy | Passed | Independent schema/provenance/delta diagnostics |
| data:build:fire-rescue-access-policy | Passed | Content-addressed snapshot and actual findings |
| data:verify:fire-rescue-access-policy | Passed | Three sources/context hashes, exact snapshot, two byte-identical rebuilds and deterministic briefings |
| npm test | Passed | 10 files / 134 tests |
| npm run build | Passed | TypeScript app/node checks and production Vite build; existing large-shell warning remains |
| ./init.sh final | Passed | Build plus 134 tests on 2026-10-26 |
| git diff --check | Passed | Full branch plus staged artifacts; original HTTP trailing whitespace preserved through scoped attributes |
| npm run fetch:data | Not executed | Would refresh unrelated public datasets |
| Separate lint/static analyzer | Not executed | Repository provides no lint script/dependency; TypeScript checks run through build |
| Remote CI / external bot | Pending PR | No remote approval is claimed before it runs |

Early local attempts failed because sandbox Bash could not start, dependencies were not yet installed, and newly introduced test imports crossed the app/node TypeScript boundary. These were corrected and the required commands rerun successfully. A missing await in the new determinism verifier was corrected; both snapshot and exports now verify. No pre-existing test failure remains. One browser-automation call timed out before completion; the page was recovered and final production checks were repeated with bounded actions, rather than counting the timeout as success.

## Automated and independent review evidence

Source tests cover exact original bytes, registry/provenance/schema/encoding/MIME failures, duplicate serials, unknown district/category/recognition, missing name, changed edition, bounded retrieval and retention of downloaded rejected evidence. Rejected refresh leaves both accepted manifest and policy pointer untouched and offline recovery works.

Identity fixtures cover different districts/sections/lanes/alleys, full matches, partial/station-only false positives, embedded district conflicts, intersections/ranges, house subnumbers, repeated places and one-to-many alternatives. Accepted exact edges are blocked by unresolved overlapping alternatives. Width fixtures preserve unknown units and never infer passability.

Scenarios test tier precedence/routine C, 5/10/all, zero/fewer-than-ten, deterministic balancing/representation, duplicate/source mismatch rejection, accepted-only B, unavailable B/C, equal selections, sensitivity IDs, exact-hash-bound exports, CSV formulas/quotes/newlines/controls, client corruption/failure/retry and legacy width-null compatibility. Independent native-agent reviews of source custody, identity, scenarios/security, UI/accessibility and goal verification reported no remaining blocking findings after fixes. No external Cubic review is claimed.

## Actual browser QA

Production bundle served locally in the in-app browser. EN and Traditional Chinese each tested at 320, 390, 768, 1024 and 1440 pixels. All ten cases have no horizontal page overflow, no policy map and no unlabelled controls. Existing app has no theme control, so theme switching is not applicable. Heading hierarchy is h1 → policy h2 → section h3 → record/detail h4; tables have captions, controls have visible labels, status/error regions are announced, keyboard focus is visible, detail receives focus and closing returns focus to its trigger.

Verified: initial explorer, direct policy query, return navigation, preserved Policy #9, source/classification filters (B red=196), capacity changes, both strategies, modes A/B/C, saved sensitivity with labelled actual ID disclosures, ambiguous audit, candidate lineage/selection reasons, 20-card pagination, valid empty result and real JSON/CSV downloads. The final downloaded selected JSON carries the exact current hash and five real source IDs; the empty CSV retains complete provenance. Downloaded artifacts are retained beside this report.

A temporary production QA server intentionally returned 503 for the first policy pointer, without changing accepted files. The localized error appeared; Retry then loaded only the pointer and immutable verified snapshot. Server trace shows **zero Policy #12 data/code requests before entering its view**. Successful policy data entry requires exactly two policy data requests; the deliberate failed pointer is separately counted. No live Taipei API or geocoder request is used by the module. No JavaScript error appeared in final captured logs.

Evidence: [browser QA](fire-rescue-access-policy-browser-qa.json), [request trace](fire-rescue-access-policy-browser-requests.jsonl), [desktop screenshot](fire-rescue-access-policy-desktop.png), [mobile screenshot](fire-rescue-access-policy-mobile.png), [visual verdict](fire-rescue-access-policy-visual-verdict.json), [downloaded JSON](fire-rescue-access-policy-browser-briefing.json), [empty CSV](fire-rescue-access-policy-browser-empty.csv).

## Measured performance

Same Node gzipSync method: baseline shell **891,003 / 239,636 gzip bytes**; final shell **891,824 / 239,823**: +821 / +187 bytes. Vite's separately reported gzip sizes are rounded and use its own compression settings; they are not mixed into this exact-byte comparison. Policy JS **44,965 bytes / 15,461 gzip**; scoped CSS 3,889 / 1,001 gzip. Snapshot **3,353,150 / 163,305 gzip bytes**.

100 local Node runs per configuration: scenario medians 1.64–1.96ms, p95 up to 2.70ms. This measures scenario CPU, not browser render time or public-host latency. All-869 compact JSON/CSV exports are 361,782 / 301,305 bytes. Browser policy DOM was 544 nodes initially and 728 while showing twenty of 196 selected rows; lazy disclosures/pagination bound rendering. Node memory is recorded separately and is not presented as browser retained heap or a leak proof. Mobile interaction and repeated navigation were responsive in actual QA; no fabricated frame-time/memory metric is claimed.

Reproduce local measurements with `npx tsx scripts/measureFireRescueAccessPolicy.ts`; optionally pass `--baseline=PATH_TO_BASELINE_DIST_ASSETS` for same-method baseline bytes. [Raw measurements](fire-rescue-access-policy-performance.json) retain environment, timings and memory limitations. No existing performance budget was weakened; the pre-existing large initial shell warning remains.

## Remaining limitations and Portfolio Case Study 012 material

No common administrative reference cutoff, edition-bound classification dictionary/width measurement method, road-segment crosswalk/geometry or current operational evidence is established. PDF metre labels and historical governing documents provide context without automatically changing CSV semantics. Ratings are source classifications, not fire probability. Recorded width is not current vehicle clearance; shared road names are not physical overlap or connectivity. Source refresh remains staged and explicitly admitted.

Case Study 012 can demonstrate real source acquisition discrepancies (273/411 rather than cached 274/446), Big5 custody, original-vs-Git hashes, Chinese section/lane identity false positives, the single defensible documentary association, honest same-selection B results, tier/source/district strategy tradeoffs, rejected refresh recovery, immutable reproducibility and accessible bilingual evidence UI. This delivery does not modify a separate portfolio project.

Complete documentation: source-feasibility, source-audit, identity-contract, classification-and-width, geographic-evidence, methodology, decision-mvp.zh-TW, results.json, this delivery record, edition comparison, performance and browser evidence. The review PR is for human assessment only; no automatic merge.
