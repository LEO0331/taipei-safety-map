# Bridge identity contract v1

Implementation: `src/lib/bridgePolicyIdentity.ts`, `scripts/bridgePolicySources.ts`. Candidate grain is a published inspection/maintenance source row, not a physical bridge. IDs include source-byte SHA prefix, original parsed CSV record number and canonical raw-field hash. Duplicate occurrences retain different row numbers. Inventory rows retain edition hash + array index independently from government `ID` and `bridge_id`.

## Precedence and exclusions

1. No authoritative A↔B identifier/crosswalk is established: zero government-confirmed associations.
2. Names normalize full-width ASCII variants, whitespace and 臺/台. Broader compatibility normalization is deliberately avoided (橋① stays distinct from 橋1). Parentheses, directions, numbering and suffixes remain distinguishing. Blank names cannot match.
3. Require identical normalized names, identical published district, and compatible responsible agency. The only authority alias removes the full 臺北市政府工務局 prefix; broad city-level `adm` is never sufficient. A cross-district string is not silently collapsed into one B `AreaCode`.
4. Exactly one compatible candidate with a valid unique source `ID`, and no duplicate nonblank `bridge_id`, can be accepted. A blank `bridge_id` alone does not reject a unique row-level research association.
5. Multiple compatible candidates or invalid/repeated identifiers remain ambiguous. If another A row considers the same B candidate, an otherwise accepted association is blocked as many-to-one. No fuzzy match or point-distance match is used.
6. Same normalized name but conflicting district/authority is rejected for linkage, with candidate IDs retained for clarification. No name counterpart remains unmatched. Unaccepted records receive no inventory ID, interval or coordinates.

Accepted means **within-edition research association**, not government-certified correspondence. Name-based composites cannot establish longitudinal identity or independent physical asset counts. Future contract changes require a method/version review and new snapshot.

## Actual reconciliation matrix

| A status | A rows | Accepted B rows | Coordinates transferable |
|---|---:|---:|---|
| Accepted composite | 216 | 216 | Only after independent geographic gate |
| Ambiguous | 5 | 0 | No |
| Rejected district/authority | 18 | 0 | No |
| No name counterpart | 177 | 0 | No |
| Total | 416 | 216 | 194 geographic-eligible A rows |

396 B rows have no accepted association. Of these, 374 have no normalized-name candidate anywhere in A; the remaining rows participated in rejected/ambiguous candidate sets. There are two A rows with multiple named candidates and one otherwise-acceptable A row blocked because its inventory candidate is reused. These diagnostics count A rows meeting each condition and can overlap; they are not physical bridge counts. The snapshot's `audit.crosswalk` contains every candidate and reason, and `inventory` preserves all B-only rows.

## Real examples

All examples refer to the A/B source hashes in the source audit. Full raw fields, exact IDs and review issues are retained in `bridge-policy-results.json`.

| Example | Source reference | Research conclusion / review question |
|---|---|---|
| 安泰橋 | A sequence 23, row 24; `A-3b6d39373759036e-r24-f1f96df831e2` | Accepted B association and object coordinate; verify inspection terminology and published maintenance completeness. Tier B, not a safety grade. |
| 康樂橋 | A sequence 22, row 23; `A-3b6d39373759036e-r23-55ef191cfb27` | Ambiguous; ask which inventory identity is intended. No inspection marker. |
| 社教館人行地下道 | A sequence 1, row 2; `A-3b6d39373759036e-r2-36df6d8a6a09` | No name counterpart; missing cost remains null. Ask whether source scope or naming accounts for the gap. |
| 中正橋 | A sequence 310, row 311; `A-3b6d39373759036e-r311-52c915771af8` | Missing published inspection year; request documentary clarification, not an overdue determination. |
| 水源高架匝道C | B row 1, ID 45551, bridge_id D021 | Inventory-only example; duplicate bridge ID flag. No inspection result attached. Ask for identifier scope and counterpart evidence. |
| 康忠橋 | A sequence 62, row 63; `A-3b6d39373759036e-r63-0bad12bad031` | Identity accepted but inventory category excludes bridge geography; preserve documentary review and ask about category semantics. |

The interface exposes district/authority, raw official fields, source editions, candidate IDs, evidence tier, geographic status and limitations in candidate details. No example recommends repair or closure.
