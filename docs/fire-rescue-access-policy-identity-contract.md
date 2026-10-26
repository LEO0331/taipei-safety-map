# Policy #12 identity contract v1

Method: `fire-rescue-access-evidence-review-v1`. No universal road or asset key is invented.

| Statistical unit | Meaning and boundary |
|---|---|
| A source row | Published administrative fire-access listing; not necessarily a surveyed road segment |
| B source row | Published alley listing with original red/yellow and width strings |
| C source row | Published difficult-rescue place/address description; may span buildings or areas |
| Named road | Documentary name; not an entire physical alignment by assumption |
| Named alley | Complete section/lane/alley name; not interchangeable with its parent road |
| Address range | Published extent description, never collapsed to a guessed point |
| Road section | Explicit 段 or described section, retained rather than erased |
| Physical segment | Requires authoritative geometry/segment ID; unavailable here |
| Village | District-bound documentary label; multiple labels split with raw text retained |
| Fire station/service district | Published administrative station label; no dispatch availability or polygon inferred |
| Building/place | Original place string may repeat; no unique physical building implied |
| Operational rescue path | Requires independent operational evidence; unavailable |

Row IDs use source key, accepted full source SHA held in sourceSha256 (16-character edition prefix in the ID), original sequence, original full-row SHA prefix and occurrence suffix. Parsed CSV record number is separate. Full manifest hashes and uniqueness checks protect reconstruction; prefixes are not accepted as standalone evidence. Identical occurrences stay distinct. Names and source sequence alone never establish cross-edition identity.

Normalize only full-width ASCII, whitespace, 臺/台 and explicitly recognized section/lane/alley numerals (Arabic or validated Chinese 1–99). Arbitrarily large Arabic components retain digit strings, avoiding floating-point collisions. Preserve road base, section, lane, alley, address number/subnumber, range, parentheses and side qualifiers. Hyphenated house subnumbers such as 28-1號 are not explicit ranges. The embedded textual district is retained and must agree with the published code before matching. No fuzzy, substring, station, village, proximity or geocoder join is used.

## Candidate-pair and acceptance rules

Audit A/B, A/C and B/C separately. Potential pairs share an exact base-road name or an explicit A difficult-place text matching C's published place name. This broad search creates audit questions; it does not certify a relationship. Every attempted edge records IDs, compared fields, district/complete-road/extent agreement, all alternative right candidates, method, reasons and mixed-edition caveat. A left row without any possible candidate has an unmatched/unsupported audit row. Right-only rows remain separately counted in quality.pairs; statuses are not physical-asset totals.

A/B acceptance requires valid same district, exact complete normalized section/lane/alley label, no residual extent qualifier and a clean one-to-one interpretation. A/C additionally requires explicit matching A difficult-place text and C place evidence; B/C lacks such a place-extent crosswalk and cannot gain acceptance merely through a building's address. All source-C addresses with house numbers, ranges or unknown extents remain unaccepted. An exact edge is blocked if another accepted or unresolved same-district alternative shares either endpoint. Deterministically rejected different-lane or wrong-district alternatives are visible but do not manufacture identity.

| Pair | Attempted real pairs | Accepted | Ambiguous | Rejected | Left rows without candidate | Unsupported left identity |
|---|---:|---:|---:|---:|---:|---:|
| A/B | 281 | 1 | 49 | 231 | 101 | 1 |
| A/C | 593 | 0 | 355 | 238 | 88 | 1 |
| B/C | 624 | 0 | 350 | 274 | 123 | 4 |

The sole accepted relationship is A6/B116, 中正區 武昌街1段16巷: `AB:A-873c138fbc367b31-s6-689c86c8f283-o1:B-d1882db87b8d0bc3-s116-aa2526288a45-o1`. It means complete-name documentary correspondence in these editions, not measured shared segment extent or network connectivity. Source A's description does not establish that a whole B alley is currently clear.

Actual ambiguity examples: A1 永春街 has C address extents that do not establish a unique road/place identity. A31/C85 both mention 基隆路3段155巷, but C place 空軍眷村 lacks an explicit unique A place linkage; the reason is place-extent-not-established. Same-base/different-lane rejected examples and every alternative are retained in the snapshot.

Actual multi-village row A7: 臨沂街（52號至信義路口）, raw 文祥里、三愛里; derived labels are documentary labels only. Actual area row C19 城中市場: 武昌街1段16及22巷一帶. No point geometry is assigned. All exact example IDs and raw evidence are in results.json.
