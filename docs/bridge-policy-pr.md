# Prepared pull request

Delivery status: implementation and local verification complete; branch pushed. No PR has been created. The GitHub connector returned HTTP 403 (`Resource not accessible by integration`), and the app browser is signed out. Normal browser sign-in or connector PR permission is required to finish creation. Automatic approval review rejected credential-helper extraction/reuse; that command was not executed.

Compare/create page: <https://github.com/LEO0331/taipei-safety-map/compare/main...codex/bridge-inspection-evidence-policy-9?expand=1>

Base: `main`. Head: `codex/bridge-inspection-evidence-policy-9`.

Title: **Add evidence-aware bridge inspection and maintenance decision support (Policy #9)**

## Prepared description

Add a separate lazy bilingual administrative bridge evidence-review POC beside the preserved historical directory. Reviewers can compare evidence-first and district-balanced 5/10/all-slot scenarios, inspect source-row lineage and accepted-only geographic evidence, and download actual JSON/CSV decisions. Structural-safety prediction remains unavailable.

- A: 416 source rows / 415 within-source groups. B: 612 inventory rows, 157 blank bridge IDs and 51 rows sharing repeated nonblank IDs.
- Research associations: 216 accepted, five ambiguous, 18 rejected, 177 unmatched; 194 pass identity plus geographic screening. No official crosswalk or physical bridge count is claimed.
- Documentary tiers: 23 A / 393 B / zero C. Missing maintenance fields are not zero/absent work; year-only dates never establish overdue status.
- Original bytes/catalogues, historical/live acquisition lineage, immutable snapshots, explicit pending-edition promotion and formula-safe exports are retained. No dependencies or Portfolio edits.

Validation: `npm ci`, `init.sh`, TypeScript/build and 88 tests pass; source fetch/audit/build commands executed; two byte-identical rebuilds verified. Production Pages-base desktop/mobile Chinese/English, pagination, geography gates, real downloads, legacy directory and explorer retention verified with no console errors. Zero policy requests before entry; four on entry. Independent review fixes cover malformed quotes, incomplete endpoint contradictions and Ubuntu harness permissions.

Snapshot: `bridge-policy-v1-3198380697811e454554c9c19a9c16ebf82019e7e07c4b8699099aa4bb74273a`. File SHA-256: `a580fb3356a84fc86fe4c4f4a811f115f490769ff15700bec5b69f88008b7782`. See `docs/bridge-policy-delivery.md` and `docs/bridge-policy-results.json` for source hashes, exact selected IDs, methods, actual browser/performance evidence and limitations. Existing large main bundle warning remains; full offline upgrade simulation and public-host latency are not claimed.

**Review only. Do not automatically merge.**
