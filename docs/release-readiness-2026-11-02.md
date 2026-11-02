# Release readiness follow-up — 2026-11-02

Verified baseline: `origin/main` at `8ae4b050355de3fdba6576de6c8275a5d621edf3`, including merged audit PR [#11](https://github.com/LEO0331/taipei-safety-map/pull/11). Explorer PR #10 and bridge-policy PR #6 are already merged; earlier pending-release/authentication handoffs remain as historical records.

This follow-up defers 24 independent dashboard modules until entry. Each uses a localized status fallback. The existing map stays mounted and the navigation, ordinary tab mount/unmount rules, visited policy panels, dataset loading, policy methods and safety boundaries are preserved. No dependency was added or updated.

## Measured production module graph

Measurements sum the entry script and modulepreload JS from `dist/index.html`; gzip uses Node `gzipSync` consistently. Chromium with service workers blocked confirms that module graph is requested at startup and the surgical-directory chunk is requested only on entry.

| Metric | Baseline | Follow-up | Reduction |
| --- | ---: | ---: | ---: |
| Initial JS bytes | 894,614 | 740,142 | 154,472 (17.27%) |
| Initial JS gzip bytes | 241,750 | 207,292 | 34,458 (14.25%) |
| Largest JS chunk | 894,614 | 731,702 | 162,912 |

The remaining main chunk still exceeds Vite's 500 kB warning threshold. Splitting the large inline map/legacy dashboard implementation would require broader component extraction and is deferred. These local byte measurements do not establish real-device latency improvements.

## Offline and release behavior

The build now runs `scripts/buildOfflineAssets.mjs` after Vite. It inserts all 35 emitted JS/CSS paths into the generated service worker and derives its cache identity from asset names and bytes. Generated `dist/` files remain untracked. Installation warms these assets in the background, preserving unvisited-module imports after successful installation, including an offline reload and Explorer entry. This background offline warming downloads all released JS/CSS; the change reduces startup parsing/module execution, not total offline-install transfer.

Cache matching ignores `Vary` only for same-origin, scope-local, hashed JS/CSS paths. This accommodates module requests carrying an `Origin` header while preserving strict matching for JSON data, nonhashed paths and other origins. Deterministic generation/cache invalidation and scope boundaries have regression tests.

Existing policy payloads remain excluded from installation; their first data visit still requires a successful online acquisition. External map tiles and uncached data resources retain their prior connectivity limits. Offline installation must finish successfully before an offline visit; no new live-data or availability guarantee is made.

## Actual verification

- `npm ci --ignore-scripts --no-audit` succeeded from the lockfile.
- `npm test`: **13 files / 145 tests passed**, including current-data bridge identity and new offline build/cache tests.
- `npm run build`: TypeScript, Vite production build and offline asset generation passed; existing size warning remains.
- `npm audit --json`: **zero vulnerabilities**.
- Existing `scripts/verifyCivicExplorer.mjs` run against production with evidence output redirected externally: **151 checks passed**, zero unexpected page errors. Includes navigation, map/filter state, keyboard focus, Explorer failure return, direct policy entry, bilingual layout and multiple widths.
- Additional Chromium suite: all **45 destinations in both languages** (desktop English and 390px Chinese), search/reset/focus, delayed chunk request; zero page errors and local HTTP failures. Fresh service-worker-enabled context cached all **35 JS/CSS files**, loaded the previously unvisited LPG directory with all **81 records** offline, reloaded the map offline and opened Explorer offline.
- `git diff --check` passed. Source/generated data, policy snapshots and lockfile remain identical to baseline. No data fetch/converter was run.

The original checkout remained clean at `568933a5543801f43ea6e0abc15775835caaa2f8`; work is isolated on `codex/reduce-safety-initial-bundle`. This follow-up is prepared as a Draft PR for human review. No merge or deployment is claimed.

Raw local evidence is under `D:/Practice/audit-results/publish-followup/taipei-safety-map/` (`baseline-size.json`, `final-size.json`, build/test/audit logs, `browser.json`, and the existing Explorer suite's saved checks/screenshots). Browser QA is headless desktop/mobile emulation, not a physical-device or assistive-technology certification.
