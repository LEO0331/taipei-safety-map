# Policy #12 handoff — 2026-10-26

Current feature: feat-014 complete; user LEO0331 manually created and merged PR #8 (https://github.com/LEO0331/taipei-safety-map/pull/8) at 2026-10-26 17:08:28 Asia/Taipei. Main merge 4e532d697eafb274530d0a1e524f027903a4c4d1; merged feature head 3cc0200. Both remote verify jobs succeeded. The assistant did not merge. Later status-only documentation commits remain on codex/fire-rescue-access-policy-12 outside PR #8; do not open a second PR automatically.

Worktree: managed attachment fire-rescue-access-policy-12/taipei-safety-map. Startup: npm ci then ./init.sh (Git Bash on Windows). Run npm run data:fetch:fire-rescue-access-policy (offline), data:audit:fire-rescue-access-policy, data:build:fire-rescue-access-policy and data:verify:fire-rescue-access-policy. No global fetch:data. Raw source and content-addressed JSON bytes must remain preserved.

Actual accepted editions A/B/C 185/273/411; old explorer stays 185/274/446. Mode A 869 rows, tiers 477/392/0. Sole accepted documentary relationship A6/B116 武昌街1段16巷; operational Mode C and geography remain unavailable. Width numeric research is disabled despite contextual PDF metre labels. Source changes and sequence renumbering are not proof of improvements or removals.

134 tests / 10 files, production build, double reproducible rebuild and bilingual five-width browser QA passed. Snapshot a5354b561746336ecd171478dbd2c429c948055780cdda25c1a6c709c6e86524; exact SHA-256 704b4c9f72a3746b4216aa96a283794c16fc40ae1013a99d9016d96948f6844d. See docs/fire-rescue-access-policy-delivery.md, results.json, performance.json and browser-qa.json for evidence. The temporary QA server's first pointer 503 intentionally tested retry without altering accepted files.

---

# Policy #9 handoff — 2026-10-23

Current feature: feat-013, implemented and locally verified; PR delivery pending authentication. Branch: codex/bridge-inspection-evidence-policy-9; base 0eb4f7c. Branch pushed. PR connector returned HTTP 403; app browser is signed out. No PR exists yet. Once user signs in, create exactly one review PR against main using docs/bridge-policy-pr.md; do not merge.

Startup: npm ci then ./init.sh (Git Bash on Windows). Policy source checks: npm run data:fetch:bridge-policy, data:audit:bridge-policy, data:build:bridge-policy, data:verify:bridge-policy. Fetch is offline verification unless --refresh is explicit.

Actual evidence: A 416 rows/415 groups, B 612 rows; accepted/ambiguous/rejected/unmatched 216/5/18/177; geographic 194; tiers 23/393/0. Seven files/88 tests pass. See docs/bridge-policy-delivery.md and docs/bridge-policy-results.json for exact IDs, hashes, browser results and limitations. Preserve historical source editions; policy raw and snapshot files are byte-preserved by .gitattributes.

No structural safety, overdue status, certified bridge count or administrative boundary certification is available. Stop Vite dev watchers before atomic policy rebuilds on Windows if they lock current.json. No new dependencies.

---

Historical handoff retained below:

# Session Handoff

## Current Objective

- Goal: Maintain a restartable harness and deliver the traffic-violation appeal trends module.
- Current status: Implemented and verified; working-tree changes are unstaged.
- Branch / commit: Current branch; no commit created.

## Completed This Session

- [x] Created harness artifacts and validated them at 100/100.
- [x] Downloaded official Big5 CSV; generated 35 local normalized records for 2026-01 through 2026-07.
- [x] Added customer analytics views, filters, CSV export, data notes, PWA cache entries, and README documentation.

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Build | `npm run build` | Pass | Existing bundle-size warning only. |
| Tests | `npm test` | Pass | 3 files / 35 tests. |
| Data contract | `npm run data:convert:traffic-violation-appeals` | Pass | 35 records; five raw fields preserved. |

## Files Changed

- `src/TrafficViolationAppealTrends.tsx`
- `scripts/convertTrafficViolationAppealTopClauses.ts`
- `public/data/traffic-violation-appeal-top-clauses/`
- `src/App.tsx`, `src/styles.css`, `public/sw.js`, `package.json`, `README.md`
- `AGENTS.md`, `feature_list.json`, `progress.md`, `session-handoff.md`, `init.sh`

## Decisions Made

- Appeal counts are descriptive submitted-appeal statistics only; no legal outcome, fairness, enforcement-quality, or citywide-total claims are permitted.
- The absence of a clause from a Top-5 period is unavailable data, never zero appeals.

## Blockers / Risks

- No functional blocker. The existing production build has a bundle-size warning.

## Next Session Startup

1. Read `AGENTS.md`.
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh` or the documented verification command before editing.

## Recommended Next Step

- Start with `git status --short`, then decide whether to stage/commit the verified changes.

## 2026-10-29 — Civic Explorer handoff

Current work is in managed worktree `C:/Users/LeoLi/.codex/worktrees/civic-explorer/taipei-safety-map`, branch `codex/civic-explorer`, base `4eb42b0`. See `docs/civic-explorer-delivery.md` for architecture, complete mapping, screenshots, actual tests, safety/privacy scope and performance. `bash ./init.sh` passes (140 tests); browser suite passes 151 checks. Feature feat-015 is implemented and verified; manual Draft PR review/merge only. Do not regenerate source datasets or alter either policy implementation as part of Explorer review.

Draft PR: https://github.com/LEO0331/taipei-safety-map/pull/10 — `feat: integrate Civic Explorer into Public Safety Map`. It remains Draft; do not enable auto-merge or merge it. Local implementation/evidence are complete; use live PR checks for remote readiness.
