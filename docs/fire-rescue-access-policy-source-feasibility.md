# Policy #12 source feasibility — 2026-10-25

The three official CSV populations are admitted independently: **A 185, B 273, C 411**. The retained explorer populations remain 185/274/446. No map or operational model is admitted. Mode A works from all 869 source rows; Mode B has one accepted documentary association; Mode C is unavailable.

| Source | Official catalogue | Verified resource ID | Resource update (+08:00) | Catalogue update (+08:00) | Admitted rows | Original bytes | Decoding |
|---|---|---|---|---|---:|---:|---|
| A | [臺北市政府消防局消防通道清冊](https://data.taipei/dataset/detail?id=7a800e92-eb22-461f-b29d-8def2127a1bc) | 351307e4-ffda-4660-ac72-1c4ef3808c38 | 2024-08-01T10:22:27+08:00 | 2025-12-09T10:45:56+08:00 | 185 | 20055 | utf-8 |
| B | [臺北市狹小巷道清冊(紅黃區)](https://data.taipei/dataset/detail?id=95c2eed3-8253-4dce-bf8e-1d6a01517514) | cd4ec60e-8d53-48a5-bbf1-9ec1f2afc20b | 2026-08-03T09:26:14+08:00 | 2026-08-03T09:26:35+08:00 | 273 | 13191 | big5 |
| C | [臺北市火災搶救困難地區](https://data.taipei/dataset/detail?id=0f322478-e09b-46af-8019-caeaa79678d7) | 577b3810-49b7-44fd-a5b7-97897bb50f9e | 2026-08-03T09:32:19+08:00 | 2026-08-03T09:32:36+08:00 | 411 | 27013 | utf-8 |

Publisher for all three: 臺北市政府消防局. Catalogue SSR graphs establish resource membership, title, publisher, filename and separate update timestamps. Resource B was independently resolved from its actual catalogue graph, rather than derived from the dataset UUID. [Government Open Data License v1](https://data.taipei/rule) permits derivative reuse with attribution; the dashboard and exports retain publisher/source provenance.

The HTTP bytes, not search-engine summaries, establish the accepted population. Cached web extraction described C as the historical 446 population. Direct bounded download returned 411, consistent with the current [Fire Department attachment page](https://www.119.gov.taipei/cp.aspx?n=E4260BBA73F88EC6). B similarly has 273 rather than retained 274. Same catalogue timestamps do not establish same content. Never infer improvements, removals, resolved rescue difficulty or a two-year trend from count subtraction.

All sources have twelve represented districts and no missing core fields or repeated source sequences in these accepted editions. A has 127 exact raw village strings, 126 trimmed categories, six multi-village rows, 126 derived village labels and 34 station labels. Those counts describe labels, not certified village identities, polygons, operational station assignments or rescue coverage.

B: 196 紅區 / 77 黃區; all 273 width cells are numeric-looking text. Numeric width research remains disabled because the CSV lacks unit/survey semantics bound to its edition, despite separate official PDF metre context. C: source ratings 1=81 / 2=330, nine observed recognition codes; 397 distinct published place strings. The conservative text detector identifies 95 area/range/intersection descriptions (66 range/area; 46 multi-road/intersection; overlap allowed). These are parser diagnostics, not surveyed location counts. Historical 81 broad-address diagnostics used an older population/detector and are not a directly comparable trend.

Admission and limitations: [source audit](fire-rescue-access-policy-source-audit.md), [classification/width](fire-rescue-access-policy-classification-and-width.md), [geography](fire-rescue-access-policy-geographic-evidence.md), [identity contract](fire-rescue-access-policy-identity-contract.md). Complete real rows and IDs are in the immutable snapshot; exact changes are in [edition comparison](fire-rescue-access-policy-edition-comparison.json).
