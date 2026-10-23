# Policy #9 delivery evidence

Base: `0eb4f7cb65ff7ae15ebeb7717965dfce8ded7873` (latest `origin/main` fetched before edits). Branch: `codex/bridge-inspection-evidence-policy-9`, pushed. Implementation and local verification are complete; the required PR is currently blocked by connector permission (HTTP 403) and a signed-out browser. No PR has been created or merged. [Prepared PR and authentication handoff](bridge-policy-pr.md) contains the exact title/description and compare link. Portfolio repository was not changed.

The feature is `feat-013`; its delivery remains in progress until the PR exists, and older in-progress feature records are preserved. Existing bridge CSV and explorer JSON/metadata retain their established contract. The historical converter was executed again: 416 rows / 415 groups, records unchanged; its timestamp-only metadata change was restored.

## Result and artifacts

- Sources: A `27135efa-d43e-406d-a3e4-fcb07efb3982`, B `866a9982-0a63-421f-b120-9144fc6ce732`. Resource editions 2025-06-23 and 2025-12-16; exact timestamps, filenames, URLs and hashes in [source audit](bridge-policy-source-audit.md).
- Population: 416 A rows, 415 within-source groups; 612 B rows, 413 distinct nonblank bridge IDs, 157 blank bridge IDs. Physical bridge totals remain unknown.
- Reconciliation: 216 accepted, five ambiguous, 18 rejected, 177 without a name counterpart; 396 B rows without an accepted association. Zero authoritative crosswalks. [Identity contract](bridge-policy-identity-contract.md).
- Geography: 580 inventory rows pass coordinate/category screening; 194 A rows pass identity plus geography. Thirty-two non-bridge categories excluded. No administrative boundary/CRS certification. [Geographic contract](bridge-policy-geographic-evidence.md).
- Candidate tiers: 23 A, 393 B, zero C. Mode A complete; Mode B enabled for 194 research associations; Mode C unavailable for lack of engineering evidence. Year-only values never become exact dates or overdue findings.
- 5/10/all slots and both strategies work, including zero results, filtering, exact source IDs, comparisons and export. Actual ordered IDs for every scenario and all real examples: [machine-readable results](bridge-policy-results.json). [Methodology and sensitivity](bridge-policy-methodology.md).
- [Traditional Chinese decision MVP](bridge-policy-decision-mvp.zh-TW.md) covers policy users, evidence units, gates, actual results, engineering and limitations.

Snapshot ID: `bridge-policy-v1-3198380697811e454554c9c19a9c16ebf82019e7e07c4b8699099aa4bb74273a`.

Exact file SHA-256: `a580fb3356a84fc86fe4c4f4a811f115f490769ff15700bec5b69f88008b7782`.

Source hashes: A `3b6d39373759036e725412474636ea328828297902990ca319452893e05121ee`; B `f9626b5f21bc392fbb3199962749d14daf73aa7840057346b648999c8cb49910`. Historical A acquisition remains unknown; independently acquired live policy A and historical Git newline lineage are explicitly separate. Policy source/output files disable Git newline normalization.

## Architecture and changes

`scripts/bridgePolicySources.ts` supplies strict parsers, bounded fetch, catalogue membership and atomic JSON writes. `fetchBridgePolicySources.ts` stages refreshes and explicitly promotes validated editions; `auditBridgePolicySources.ts` audits accepted bytes; `buildBridgePolicySnapshot.ts` reconciles and publishes immutable snapshots; `verifyBridgePolicy.ts` checks deterministic rebuilding and measures local scenarios/exports.

`src/types/bridgePolicy.ts` defines contracts; pure `bridgePolicyIdentity`, `bridgePolicyGeography`, `bridgePolicy` and `bridgePolicyScenarios` modules implement conservative evidence rules. `loadBridgePolicy` checks content-addressed payload integrity. `BridgePolicyDashboard`, `BridgePolicyMap` and scoped CSS provide bilingual UI and bounded maps. App lazy imports preserve the map and visited bridge directory/filter state. PWA v21 acquires policy assets on demand with a network-first pointer and named snapshot cache. A PR workflow runs offline source checks and `init.sh`; deployment workflow is unchanged.

Simplifications: reused the existing CSV decoder/parser after strict validation, existing language type, React navigation, Leaflet and base path; no dependencies, router, weighted risk model, coordinate inference or shared dashboard refactor were added. Core calculations occur offline; browser scenarios filter/order only the retained candidates.

## Verification actually executed

Baseline: `npm ci`, then Git Bash `./init.sh`: build passed, 35 tests passed. Initially missing local dependencies were repaired before feature edits. Final suite: seven test files / 88 tests passed; TypeScript and production build passed. The existing main bundle warning remains (~891 KB minified), while the policy dashboard is separate (~34 KB minified / 12 KB gzip). No separate lint script exists; TypeScript, Vitest and `git diff --check` supply static/test checks.

Independent read-only review found malformed balanced CSV quote handling and partial-endpoint distance checks; both were corrected with regression assertions. Tests cover source hash/size/schema/network failures, atomic pointer failure, raw/zero/year semantics, identifier collisions, unaccepted associations without coordinates, geographic limits, deterministic selection, eligibility, balanced representation, incompatible comparisons and CSV formula protection.

`data:verify:bridge-policy` rebuilt twice with byte-identical current pointer and snapshot. Final snapshot is 1,912,829 bytes / 142,453 bytes gzip. Local 100-iteration balanced scenario mean is about 0.21 ms (latest exact value in results). All-selected JSON export 245,553 bytes; CSV 107,549 bytes. These are local Node/preview measurements, not public-host latency guarantees.

Production browser QA used `/taipei-safety-map/` with matching `GITHUB_ACTIONS=true` build/preview configuration. Verified Traditional Chinese and English; desktop and 390×844 mobile; Mode A and eligible Mode B; empty B critical-only filter; unavailable Mode C; capacities 5/10/all; both strategies; source detail; matched and independent inventory map; 20-record pagination; legacy bridge directory; preserved explorer search `松山`; no console errors in the verification tab. Full unavailable Mode B is unit-tested with a synthetic insufficient-evidence snapshot, not falsely claimed as an observed production state.

The mobile comparison table initially widened the page; scoped grid constraints fixed it. Recheck measured document width = viewport width (375 CSS pixels excluding scrollbar), visual verdict 95/100. Evidence screenshots: [mobile](bridge-policy-mobile.png), [desktop](bridge-policy-desktop.png).

Actual final-edition browser downloads at 10 balanced slots: JSON 11,182 bytes and CSV 7,263 bytes; downloaded content had ten real selected IDs and the final snapshot hash. A fresh production tab verified the final snapshot ID and had no console errors. No externally hosted production performance or accessibility assistive-device certification is claimed.

Same-origin request counts were measured with a temporary local HTTP proxy, including service-worker installation and excluding third-party tiles. Initial page: 130 requests, zero policy payload/chunk requests. First policy entry: four requests (dashboard CSS/JS, current pointer, named snapshot); all successful. A final-edition follow-up likewise recorded four policy requests and the final 142,453-byte gzip snapshot. [Network evidence](bridge-policy-browser-network.json) records exact captured paths/bytes/timings and measurement scope. Desktop/mobile snapshots were captured on that production preview. PWA's incompatible-edition failure path is enforced in code; full offline deployment-upgrade simulation was not executed.

## Reproduce

```bash
npm ci
npm run data:fetch:bridge-policy
npm run data:audit:bridge-policy
npm run data:build:bridge-policy
npm run data:verify:bridge-policy
./init.sh
git diff --check
```

On Windows use Git Bash for `./init.sh`. Stop Vite **dev** servers before atomic snapshot replacement if its file watcher locks `current.json`; an EPERM deliberately leaves the accepted pointer intact. Production preview did not lock the source pointer. To inspect Pages paths build and preview with `GITHUB_ACTIONS=true`; otherwise Vite preview assumes `/`.

Refresh is deliberate: `npm run data:fetch:bridge-policy -- --refresh`, inspect the printed pending directory/schema/IDs/changes, then explicitly run its printed `--promote=...`. A changed inspection edition needs a separate versioning review; promotion never overwrites the historical explorer. CI requires no official-site connectivity.

## Remaining limitations / Case Study 009

No certified physical-bridge counts, official A↔B crosswalk, complete inspection dates, verified engineering terminology, interval applicability, district polygon checks, surveyed geometry, current maintenance history or safety predictions. Exact names may miss valid real-world correspondences; rejection is preferred to invented coverage. Balanced groups include cross-district source labels, not certified geography.

Future Portfolio Case Study 009 can use the official-byte lineage, 416-versus-415 unit distinction, bridge-ID missingness/collisions, accepted-only geographic gate, five-slot strategy disagreement, real exclusions, independent review regressions and deterministic performance evidence. Additional official crosswalk/report acquisition would be a separate evidence expansion. This PR contains no Portfolio edits and must remain open for review.
