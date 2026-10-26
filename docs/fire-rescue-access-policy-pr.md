# Add Fire Rescue Access & Narrow Alley Evidence Decision Support (Policy #12)

Target: main. Head: codex/fire-rescue-access-policy-12. Human review only; do not automatically merge.

Create link: https://github.com/LEO0331/taipei-safety-map/pull/new/codex/fire-rescue-access-policy-12

---

Adds an independent bilingual Policy #12 module for administrative review of published fire-access, narrow-alley and difficult-rescue-place evidence.

Actual newly acquired official A/B/C CSV populations are 185/273/411, versus retained explorer editions 185/274/446. Original HTTP bytes, catalogue membership, source deltas and exact hashes are retained independently; existing explorer sources and Policy #9 are preserved.

## Resulting behavior

- Mode A reviews 869 source rows with deterministic documentary tiers (477 A / 392 B / 0 C), 5/10/all capacities, evidence-first and tier-preserving source/district balancing, classification/search filters and actual-ID sensitivity.
- Complete road/section/lane/extent reconciliation accepts one A/B documentary relationship: 武昌街1段16巷. Ambiguous/rejected attempts stay visible. Accepted-only Mode B honestly selects the same one under all capacities and strategies.
- Operational Mode C, compatible geometry and numeric-width research remain unavailable. Raw classifications and widths do not establish current clearance, fire probability, dispatch readiness or road connectivity.
- Lazy integrity-checked local snapshots, bounded failed-refresh recovery, accessible details/focus, paginated audit, and exact-hash-bound JSON/CSV administrative briefings.

## Validation

- npm ci; final ./init.sh; 10 files / 134 tests; TypeScript and production build passed.
- Offline fetch/audit/build/verify; exact source/context hashes, two byte-identical rebuilds and deterministic exports passed.
- Actual production browser QA in EN/ZH at 320/390/768/1024/1440: filters, capacities, modes, labelled sensitivity, details/keyboard focus, pagination, real empty CSV/selected JSON downloads, simulated local failure/retry, direct/return navigation and preserved Policy #9.
- Five independent native-agent review lanes completed with no remaining blockers after regression fixes.
- Initial explorer makes zero Policy #12 code/data requests. Same-method shell increase: 821 bytes / 187 gzip bytes. Policy JS and the 3,353,150-byte snapshot load on entry. Existing shell-size warning remains; no dependencies or performance budget changes.

[Delivery evidence](https://github.com/LEO0331/taipei-safety-map/blob/codex/fire-rescue-access-policy-12/docs/fire-rescue-access-policy-delivery.md) · [Source audit](https://github.com/LEO0331/taipei-safety-map/blob/codex/fire-rescue-access-policy-12/docs/fire-rescue-access-policy-source-audit.md) · [Actual findings and selected IDs](https://github.com/LEO0331/taipei-safety-map/blob/codex/fire-rescue-access-policy-12/docs/fire-rescue-access-policy-results.json) · [Traditional Chinese MVP](https://github.com/LEO0331/taipei-safety-map/blob/codex/fire-rescue-access-policy-12/docs/fire-rescue-access-policy-decision-mvp.zh-TW.md)

Documentary evidence readiness is not operational emergency readiness. Human review only; do not automatically merge.
