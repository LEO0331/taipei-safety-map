# Policy #9 implementation plan

Base: `0eb4f7cb65ff7ae15ebeb7717965dfce8ded7873`, fetched origin/main 2026-10-23. Clean starting tree. Baseline `npm ci` then Git Bash `./init.sh`: build passed, 35 tests passed; existing large bundle warning. No new dependencies.

1. Preserve existing A bytes and explorer; retain official catalog evidence and independently acquire B with hash/provenance. Refresh goes to pending, never silently replaces accepted bytes.
2. Audit schema, source identities, year/money parsing, inventory identifiers and coordinates. Keep source row populations distinct from within-source groups and physical bridges.
3. Implement conservative, collision-tested name + district + authority research associations. Reject unresolved/multiple/reused candidates; publish all diagnostics.
4. Build deterministic content-addressed snapshot, review candidates, first-match evidence tiers, eligibility filters, 5/10/all capacity, evidence-first and district round-robin selection, comparison and safe exports.
5. Add lazy bilingual dashboard adjacent to preserved explorer, bounded map and pagination. Preserve explorer state when entering policy. Gate Mode B by accepted geographic evidence and keep Mode C unavailable.
6. Test edge cases and real source invariants, regenerate twice for deterministic equality, run init.sh and diff checks, browser QA desktop/mobile/languages/exports, record actual sizes and timings.
7. Publish audit/contracts/methodology/Chinese decision MVP/delivery evidence, update only feat-013 and continuity artifacts. Commit with Lore trailers, open exactly one PR against main; do not merge.

Verification includes source integrity/refresh failures, ambiguous identities never receiving coordinates, year-only uncertainty, missing versus zero, deterministic selection/comparison, lazy payload and PWA edition handling. Unsupported official crosswalk, boundary validation, safety ratings and overdue status remain explicitly unavailable.
