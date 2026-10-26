# Administrative evidence review method

Policy policy-12; method fire-rescue-access-evidence-review-v1; fixed analysis/publication date 2026-10-25. The objective is documentary investigation under limited capacity. No numerical risk/impact weights are defined.

## Candidate grain and deterministic precedence

Mode A admits one candidate per accepted source row: 185 A + 273 B + 411 C = 869 administrative documentary candidates. This sum is not a physical-road/place total. All rows have reconstructable provenance and stable IDs. Malformed identity fields are retained for review rather than silently discarded; schema/byte-provenance failures reject an edition before publication.

First matching tier wins. Tier A primary codes in stable precedence: duplicate-sequence, missing-sequence, missing-name, unknown-district, unknown-category, unknown-recognition, district-label-conflict, ambiguous-association, duplicate-identity. Tier B is any remaining documentary issue: incomplete extent, multiple villages, unknown unit/dictionary, source comparability, absent geographic evidence or unmatched association. Tier C has no identified material issue. Real counts **A=477 / B=392 / C=0**. C=0 arises from ubiquitous missing edition-bound dictionary/geographic evidence; routine C remains tested on separate synthetic fixtures. No tier is forced to contain rows.

Mode A Evidence Gaps First orders tier A/B/C, then primary issue precedence, then source-bound ID in code-point order. IDs deliberately sort lexically, not numerically by sequence. Balanced Administrative Review retains global tier precedence, then cycles source A/B/C and district queues in code-point order, preserving issue/ID ordering inside each district. This fixed hierarchy improves source/district representation without claiming funding fairness or rescue optimization.

Mode B's grain is one accepted relationship, never a certified road segment. Only the single A6/B116 documentary match is currently eligible. Its follow-up question is mixed-edition comparability; relationship Tier B applies independently of an endpoint's unrelated cross-source questions. Evidence Questions First uses issue/ID order; balanced uses pair then district rounds. No accepted associations produces a valid unavailable/zero result. An explicitly unavailable B mode cannot select anything.

Mode C is always unavailable: no authoritative operational geometry/crosswalk, current clearance/obstruction measurements, vehicle/personnel availability, dispatch history or validation standard has been admitted. It produces no recommendation or selected operational candidate.

## Eligibility and capacity

Source, issue tier, district, original source classification and text filters apply before selection. The first exclusion reason is retained: unadmitted row → source → issue → district → category → text. Both strategies use exactly the same filtered population. Capacities are 5, 10 or all eligible. Unused capacity remains unused. Unknown categories are not assigned hazard weights. Ambiguous/rejected/unsupported joins remain visible in the audit, never in Mode B selection.

| Capacity | Strategy | Eligible | Selected | Tiers | Sources | District labels |
|---|---|---:|---:|---|---|---:|
| 5 | evidence-first | 869 | 5 | {"A":5} | {"A":5} | 2 |
| 5 | balanced | 869 | 5 | {"A":5} | {"A":2,"B":2,"C":1} | 2 |
| 10 | evidence-first | 869 | 10 | {"A":10} | {"A":10} | 2 |
| 10 | balanced | 869 | 10 | {"A":10} | {"A":4,"B":3,"C":3} | 4 |
| all | evidence-first | 869 | 869 | {"A":477,"B":392} | {"A":185,"B":273,"C":411} | 12 |
| all | balanced | 869 | 869 | {"A":477,"B":392} | {"A":185,"B":273,"C":411} | 12 |

Mode A overlap between strategies: 5 slots = 2 shared IDs; 10 slots = 2; all = all 869, potentially different order. At five slots balanced source composition is A2/B2/C1 versus evidence-first A5. At ten slots balanced A4/B3/C3 spans four districts; evidence-first A10 spans two. Mode B both strategies and every capacity select the same one relationship; no artificial strategy difference is invented.

Default evidence-first five selected IDs:

- `A-873c138fbc367b31-s1-14ef98c124eb-o1`
- `A-873c138fbc367b31-s10-253ac0e3b7d5-o1`
- `A-873c138fbc367b31-s100-50472be412f2-o1`
- `A-873c138fbc367b31-s101-9e3818800fc1-o1`
- `A-873c138fbc367b31-s102-2bf1009b036d-o1`

All ordered IDs, representation, exclusions and baseline scenarios are in [results.json](fire-rescue-access-policy-results.json) and the immutable snapshot baseline. Actual examples include A1 永春街, B1 齊東街82巷, C1 喜來登大飯店, A7 multi-village 臨沂街（52號至信義路口）, C19 城中市場 and accepted 武昌街1段16巷. All remain documentary, not field-condition findings.

## Sensitivity

Compare actual supported source scopes (all/185 A/273 B/411 C), issue scopes (all/477 primary/392 documentation), capacities and strategies. Each comparison returns exact shared, added and removed IDs, eligible-population change, representation and explicit equivalentPopulation. Different source populations are never treated as equivalent merely because five selections happen to coincide. Snapshot/method/source-hash or mode mismatches reject comparison. Broader ambiguous relationship audit scope never enlarges accepted B selection. Width/geometry sensitivity is unavailable rather than fabricated.

## Immutable publication and briefings

Source bytes/catalogue HTML and acceptance timestamps remain fixed. The content ID hashes the deterministic payload, excluding snapshotId. The atomic pointer separately hashes the exact pretty-printed snapshot bytes. Baseline scenarios and sensitivity contain actual IDs without recursive hash dependencies. Existing content-addressed files cannot be overwritten with different bytes. Complete file validation precedes pointer rename; a failed refresh/build leaves the previous pointer available. Stop Vite on Windows if file watchers lock an atomic rename; never delete the accepted pointer as a workaround.

Browser loading is lazy: pointer plus one immutable snapshot, bounded streams, SHA-256/size/name/version checks and member/source/reference validation before rendering. Failures show a localized retry state. The service worker never precaches policy data; current.json is network-first, immutable files on demand. No live Taipei API or third-party geocoder runs in the client.

Briefings are labelled Administrative Fire Access Evidence Briefing / 消防通道行政證據查核摘要. Export re-runs the exact scenario and recomputes exact-file SHA-256 before producing JSON/CSV. Fields include policy/method/snapshot/hash, source editions, analysis date, grain/mode/eligibility/capacity/strategy, actual source/relationship IDs, issues, reasons, representation, exclusions and limitations. Phone fields are omitted. CSV quotes comma/quote/newline content, strips nontext controls and prefixes leading formula characters after whitespace/control normalization. Empty exports retain provenance. Limits: 10,000 selected rows and 20 MB. Evidence ID lists render only when expanded; source selections paginate by 20, relationship audit by 10.
