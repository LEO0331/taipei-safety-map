# Documentation review method

Policy `policy-9`, version 1; method `bridge-inspection-evidence-review-v1`; analysis date `2026-10-23`. Source editions and acquisition dates are separate from analysis. `src/lib/bridgePolicy.ts` and `bridgePolicyScenarios.ts` own the browser-safe method; reconciliation and geographic work execute offline.

## Candidate and tier rules

All 416 published A rows are documentation-review candidates. Each has an explicit question represented by preserved issue codes. Immutable row identity is separate from 415 within-source groups and any accepted B association.

First matching rule:

1. **Tier A:** malformed or future inspection/maintenance year, missing name, conflicting group evidence, duplicate source sequence, ambiguous identity or rejected identity correspondence.
2. **Tier B:** other documentary questions, including missing inspection/maintenance fields, unmatched identity, unverified interval, geographic exclusion or unverified inspection-result terminology.
3. **Tier C:** routine documentary follow-up when no issue is established.

Actual counts: A=23, B=393, C=0. All result strings remain unverified for engineering classification, so no production row qualifies for C. The zero is intentional. Synthetic tests remain separate from real findings.

Normal maintenance reporting sparsity is a completeness question, not a demonstrated physical defect. Missing cost remains null. Zero means an explicit source zero. No spending, age, dimension or missingness weight is used. Tiers do not grade structural condition.

## Time semantics

`最近一期檢測年度` and `最近一期維護年度` conservatively accept ROC or Gregorian years; raw values remain available. Month/day stay null. Calendar-year difference may be displayed relative to the fixed analysis date. No exact event date or definitive overdue status is calculated. `inspect_rate` means months per inspection, but applicable policy, exemptions, source edition alignment and event timing remain unverified. These sources do not establish statutory compliance or latest actual field activity.

## Eligibility and selection

Filters apply before selection. First exclusion wins: unavailable Mode B → unaccepted geography (when required) → identity population → critical-tier scope → district → authority → search. Exclusion counts sum to excluded rows. Scope options are all A rows, accepted only, accepted-or-ambiguous for documentation only, or accepted plus valid reference coordinates. Broader document eligibility never grants coordinates.

Evidence Gaps First orders tier A/B/C, then stable candidate ID in code-point order. Lexical row IDs, rather than numerical source row order, are intentional tie-breakers. Balanced Administrative Review cycles through published district labels in Unicode order, taking one candidate per group per round, while preserving tier/ID order inside each group. Cross-district source strings remain separate published administrative groups; there are 28 such labels in A. Representation is not maintenance funding equity. Capacity is 5, 10 or all eligible; unused slots remain unused.

Each scenario includes snapshot/method, objective, eligibility, population, first-match exclusions, capacity used, actual ordered IDs, tier/district/authority representation, review issues, assumptions and unavailable engineering metrics. Mode B applies the same method to the 194 accepted geographic documentation records; Mode C remains unavailable.

## Actual strategy results

| Mode / slots | Evidence-first tiers / administrative groups | Balanced tiers / groups | Shared IDs |
|---|---|---|---:|
| A / 5 | 5 A / 2 | 2 A + 3 B / 5 | 0 |
| A / 10 | 10 A / 5 | 4 A + 6 B / 10 | 1 |
| A / all | 23 A + 393 B / 28 | same population / 28 | 416 |
| B / 5 | 5 B / 1 | 5 B / 5 | 0 |
| B / 10 | 10 B / 2 | 10 B / 10 | 2 |
| B / all | 194 B / 12 | same population / 12 | 194 |

Authority representation in every A and B selected set is one published authority, 新建工程處. Full ordered IDs and group counts for all twelve scenarios are in `bridge-policy-results.json`; no illustrative IDs are substituted.

## Sensitivity

At five evidence-first slots, all-source population=416, accepted=216, accepted-or-ambiguous=221, and accepted/geographic=194. Each restricted population replaces all five default selected IDs. Accepted and broader documentation eligibility have the same five top selected IDs; the extra five ambiguous records change the eligible population without changing this selection. Critical-conflicts-only yields 23 eligible A rows and the same first five default IDs. At all capacity, both strategies select identical sets but can order them differently. Comparison returns shared/added/removed IDs and eligible-count change; different snapshot/method comparisons and duplicate candidate identities are rejected.

## Reproducibility and exports

The snapshot content ID hashes the canonical payload, excluding the self-referential snapshotId. The pointer additionally stores SHA-256 of the exact pretty-printed file bytes. Acquisition timestamps are retained from admission, never reset on rebuild. Content-addressed snapshot writes precede an atomic pointer rename. Failure must leave the accepted pointer intact; on Windows stop Vite dev watchers before rebuilding if they lock `current.json`. Never delete the accepted pointer to work around locking.

Browser loads the pointer and named file only on module entry, checks version/name/SHA-256 and fails with a retry state on mismatch. PWA does not precache policy data. The pointer is network-first with verified-file fallback; snapshots use immutable names and are cached on demand. No official API requests occur in the browser.

JSON exports contain actual selected records and provenance. CSV quotes values, prefixes spreadsheet-formula triggers, and includes full provenance once in the first data row (also when selection is empty), avoiding quadratic repeated metadata. Candidate population is capped by source size/10,000 inventory rows; selected export scope capped at 10,000 and UI downloads capped at 20 MB. Neither format is an official order, repair worklist or engineering certification.
