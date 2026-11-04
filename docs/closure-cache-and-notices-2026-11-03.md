# Closure corrections — 2026-11-03

Baseline: `origin/main` at `11fb56a170d2d64bde05532cab4585801271d1b4`. Work is isolated on `codex/safety-cache-and-notices`. These corrections are committed/pushed for review; no new PR, merge or deployment is performed in this closure step.

## Cache ownership

The deployed worker's activation handler previously deleted every cache except its current cache, including sibling applications sharing the same hosting origin. Activation now removes only this application's recognized versioned names (`taipei-safety-map-v<number>` and its 16-hex content-version suffix), retaining the current cache, other applications and lookalike names. Old v1/v21/v22 caches remain eligible for cleanup.

A unit regression executes the actual worker source. A separate production-browser regression seeds real CacheStorage in an isolated browser profile before worker installation: three old application caches are removed; five sibling/lookalike caches remain with their sentinel contents. No production browser storage was touched.

## Distributed licenses and notices

`npm run build` now runs `scripts/buildThirdPartyNotices.mjs` between Vite and the offline asset generator. It inventories the exact installed versions of all nine non-development lockfile packages, checks their versions against the lockfile, and reproduces their license/notice files verbatim. Missing notice files or version mismatches fail the build.

| Installed package | Version | Declared license |
| --- | --- | --- |
| @react-leaflet/core | 3.0.0 | Hippocratic-2.1 |
| leaflet | 1.9.4 | BSD-2-Clause |
| mgrs | 1.0.0 | MIT |
| proj4 | 2.20.9 | MIT |
| react | 19.2.7 | MIT |
| react-dom | 19.2.7 | MIT |
| react-leaflet | 5.0.0 | Hippocratic-2.1 |
| scheduler | 0.27.0 | MIT |
| wkt-parser | 1.5.5 | MIT |

Generated `dist/THIRD_PARTY_NOTICES.txt` includes those full texts plus the project MIT license and Civic Explorer source/adaptation attribution. `dist/THIRD_PARTY_NOTICES.json` records package versions, declared terms, notice filenames and SHA-256 hashes. Both are build artifacts, not tracked customer data. A localized footer link exposes the text document. A UTF-8 BOM keeps smart quotes and other Unicode readable when the static server omits a charset; the included license texts remain verbatim.

The notice document is precached and has its own offline navigation response, so its link opens the notice text rather than an app-shell fallback. Notice bytes also participate in the release cache fingerprint. All 35 built JS/CSS files retain their existing precache behavior. This distributes the distinct installed terms; it does not relicense dependencies or certify the applicability of every use under Hippocratic or other terms.

## Actual verification

- Baseline: 145 tests passed; production build passed.
- Final `npm test`: **148 tests / 14 files passed**. Regressions cover actual worker cleanup, strict JSON/cross-origin cache matching, offline notice navigation, deterministic asset/cache versioning, notice-driven invalidation, and exact installed runtime/project notice reproduction.
- `npm run build`: TypeScript, Vite, nine-package license generation and 35-asset offline generation passed. The existing >500 kB chunk warning remains.
- `npm audit --json`: **zero vulnerabilities**; dependency versions and lockfile unchanged.
- Production Chromium: all **45 Explorer destinations in English and Chinese** (desktop and 390px mobile), five categories, search/reset, keyboard/focus return, map node/filter preservation, overview charts, research deep link, refresh and all four same-name bridge histories passed. No JavaScript page errors, failed requests or local HTTP failures; service-worker-disabled navigation testing reports only the expected Playwright warning.
- Real generated-worker browser test: three old owned caches removed; all five foreign/lookalike caches and their contents preserved; all 35 JS/CSS files and notices installed. Unvisited LPG directory displayed all **81 records** offline, and offline notice popup, full reload and Explorer passed with zero page errors. Online notice content contains all installed license texts verbatim; the offline plain-text document matches after normal browser newline decoding.
- `git diff --check` passed. `data/`, `public/data/`, policy analysis, dependency versions and `package-lock.json` remain identical to baseline. No data fetch/conversion was run.

External reproducible scripts, logs, inventory and screenshots are under `D:/Practice/audit-results/closure-fixes/taipei-safety-map/`. Browser checks use isolated headless desktop/mobile emulation. No physical-device, assistive-technology or legal certification is claimed. Existing data interpretation and first-visit policy connectivity limits remain.
