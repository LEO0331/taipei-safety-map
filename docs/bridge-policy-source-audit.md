# Policy #9 source audit — 2026-10-23

Publisher: 臺北市政府工務局新建工程處. Both catalogues identify the Government Open Data License v1, irregular refresh, UTF-8 resources. Attribution and licensing reference: <https://data.taipei/rule>. Full metadata, schemas, byte counts and retained paths are in `data/raw/bridge-policy/sources.json` and `bridge-policy-results.json`.

| Contract | Inspection/maintenance A | Asset inventory B |
|---|---|---|
| Dataset ID | 27135efa-d43e-406d-a3e4-fcb07efb3982 | 866a9982-0a63-421f-b120-9144fc6ce732 |
| Catalogue | [A](https://data.taipei/dataset/detail?id=27135efa-d43e-406d-a3e4-fcb07efb3982) | [B](https://data.taipei/dataset/detail?id=866a9982-0a63-421f-b120-9144fc6ce732) |
| Resource ID | 9a1f7632-67e1-4d81-bcb0-6a6b4c721868 | 68d6c971-d077-4578-a52e-e42db765f861 |
| File | bridge-chk-mnt.csv | Bridges.json |
| Resource updated (Taiwan) | 2025-06-23 15:55:02 | 2025-12-16 09:41:34 |
| Catalogue metadata updated (Taiwan) | 2026-09-22 19:09:08 | 2026-09-22 19:13:04 |
| Bytes / source rows | 47,974 / 416 | 561,387 / 612 |
| Live policy acquisition | 2026-10-23T04:03:31.388Z | 2026-10-23T04:03:32.360Z |

A SHA-256: `3b6d39373759036e725412474636ea328828297902990ca319452893e05121ee`.

B SHA-256: `f9626b5f21bc392fbb3199962749d14daf73aa7840057346b648999c8cb49910`.

Historical A's original acquisition time remains unknown. Live A re-download completed `2026-10-23T04:03:31.388Z`; its bytes equal the Windows working-copy CSV. The historical Git blob has LF-normalized SHA-256 `ee4afe5592522651403d2d6173f59620884857b1d5129b83498b4eab0e3701fc` (47,557 bytes), while the actual live resource has CRLF and the hash above. Parsed original fields are identical across these newline representations. Do not claim the unknown original download's bytes or acquisition date from Git checkout behavior. The policy accepts the independently downloaded A file with its actual acquisition time and stores historical lineage separately; it never rewrites the legacy source metadata as newly acquired. `.gitattributes` disables newline normalization for policy raw files and content-addressed outputs. Existing explorer source and generated files remain unchanged. HTML catalogue evidence and both newly downloaded files are retained under `data/raw/bridge-policy/pending/2026-10-23-04-03-30-793-/`. The directory name records acquisition staging; `sources.json` is the explicit acceptance pointer.

## Acquisition and admission

`npm run data:fetch:bridge-policy` is offline by default and verifies accepted bytes. `--refresh` performs four bounded requests (catalogue and resource for each dataset); HTTPS and exact `data.taipei` host only, redirects rejected, 30 second timeout per request, streaming 5 MB ceiling. Failure records go into the pending edition and never advance accepted sources. The SSR catalogue graph must identify the dataset, resource and membership; source/resource timestamps, encoding and original filenames come from that graph, not configuration guesses.

Inspect schema, identifiers, edition deltas and exclusions before running the printed `--promote=data/raw/bridge-policy/pending/...` command. Promotion rechecks hashes, schemas, catalogue membership and timestamps. A changed A edition is deliberately refused until a separate historical-source versioning decision is made. No source bytes are silently overwritten. B can be marked unavailable in the acceptance manifest (with errors and known metadata retained); `loadAccepted` then builds Mode A without B, and geographic mode is gated.

## A diagnostics

416 source rows; 415 historical composite groups and 415 conservative groups. Neither group count certifies distinct physical bridges. All 11 original fields are preserved. No blank names/districts/authorities, duplicate sequence numbers, missing inspection results, missing maintenance results, malformed years or malformed/negative cost fields were found. One inspection year, 314 maintenance years and 317 cost fields are missing. Two rows in one apparent group have conflicting published documentary values. All rows remain in the policy population, including repeated groups.

CSV header uniqueness, required columns, quote placement, row width, UTF-8/Big5 decoding and replacement characters are checked before conversion. Raw source text remains separate from parsed year/cost values. Empty cost is null; explicit published zero alone becomes zero.

## B diagnostics

612 rows and 612 distinct `ID` values; 455 rows have nonblank `bridge_id`, comprising 413 distinct values. 404 rows carry a unique nonblank bridge ID; 51 rows share nine repeated nonblank bridge IDs. 157 rows have blank bridge IDs. No missing/duplicate source `ID`, missing name/authority, invalid interval or suspicious dimension flag was found in this edition. `ID` and `bridge_id` have separate semantics. No physical bridge total is inferred.

Management sections: 新建工程處 427; 大地工程處 31; 水利工程處 153; 公園路燈工程管理處 1. Categories: 橋梁 580, 箱涵 28, 其他 4. Published `inspect_rate`: 12 months on 57 rows, 24 months on 555 rows. Applicability to any particular inspection event remains unverified.

Two repeated names: 民權橋 and 康樂橋, each twice. Three repeated object-reference point pairs, each on two rows. Duplicate coordinates are audited, not treated as proof of one physical asset or an identity crosswalk. All rows preserve raw fields and row indexes in the snapshot.

## Additional context excluded from joins

One bounded visit each on 2026-10-23: [NCO bridge information](https://nco.gov.taipei/News.aspx?n=E150D8278BFA8D52&sms=79B5F59149C69A28) was accessible and listed bridge inventory/inspection documents; no complete machine-readable A↔B crosswalk or dataset reuse/schema contract was established. [BMS guest inventory](https://bridge.nco.taipei/bms2/guest/bridge/inventory.aspx) was inaccessible to the research tool; contents and license remain unverified. Neither was crawled or incorporated into associations. An [official Taipei district-code reference](https://www-ws.gov.taipei/001/Upload/358/relfile/17859/9283859/657348e8-04fe-4c1c-8ec3-6d48de33cf6b.pdf) corroborates the twelve `AreaCode` labels; it supplies no bridge crosswalk or boundary geometry.
