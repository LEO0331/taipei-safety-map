# Policy #12 source custody and admission

| Source | Official catalogue | Resource ID | Resource update (+08:00) | Catalogue update (+08:00) | Rows | Bytes | Encoding |
|---|---|---|---|---|---:|---:|---|
| A | [臺北市政府消防局消防通道清冊](https://data.taipei/dataset/detail?id=7a800e92-eb22-461f-b29d-8def2127a1bc) | 351307e4-ffda-4660-ac72-1c4ef3808c38 | 2024-08-01T10:22:27+08:00 | 2025-12-09T10:45:56+08:00 | 185 | 20055 | utf-8 |
| B | [臺北市狹小巷道清冊(紅黃區)](https://data.taipei/dataset/detail?id=95c2eed3-8253-4dce-bf8e-1d6a01517514) | cd4ec60e-8d53-48a5-bbf1-9ec1f2afc20b | 2026-08-03T09:26:14+08:00 | 2026-08-03T09:26:35+08:00 | 273 | 13191 | big5 |
| C | [臺北市火災搶救困難地區](https://data.taipei/dataset/detail?id=0f322478-e09b-46af-8019-caeaa79678d7) | 577b3810-49b7-44fd-a5b7-97897bb50f9e | 2026-08-03T09:32:19+08:00 | 2026-08-03T09:32:36+08:00 | 411 | 27013 | utf-8 |

- A original HTTP bytes SHA-256: `873c138fbc367b3123412785c2d1492fa7f4b2d1f73b4788f40587ce77145797`. Retained working-copy SHA-256: `873c138fbc367b3123412785c2d1492fa7f4b2d1f73b4788f40587ce77145797`; historical Git bytes: `4261930446273dcdbe60c2b3c131be339bbfa8ffecb72932be7582df35e38b7e`.
- B original HTTP bytes SHA-256: `d1882db87b8d0bc3e27f3bb74ec7c604446becc80d2f0f3e1e90d817e4eccb00`. Retained working-copy SHA-256: `fbea2c987a7daa912d3882adf032cf8dbee19b4a2df120abba23bced25b6a440`; historical Git bytes: `9417a2845e51ce92fead5ed9c179d22d115810904f27ab420a58204660b2c770`.
- C original HTTP bytes SHA-256: `a8ff6929d2f53438e50a94b7d0abbdc983f0300ef54b6e87b82596c349287049`. Retained working-copy SHA-256: `ae78fb217f341c02cacdab41d15ee7fe3802c4ad2ee980f10580c5789369b383`; historical Git bytes: `ae78fb217f341c02cacdab41d15ee7fe3802c4ad2ee980f10580c5789369b383`.

Accepted manifest: `data/raw/fire-rescue-access-policy/sources.json`. Newly acquired CSV and exact catalogue HTML are under `pending/2026-10-25-01-20-08-515-/`; the directory records staging, not effective source time. Each original HTTP object has a separately calculated SHA-256, byte size, content type, decoding and acquiredAt. Catalogue HTML is independently hashed. `.gitattributes` disables normalization for policy evidence and immutable JSON.

A live acquisition completed 2026-10-25T01:20:09.125Z; B 01:20:09.577Z; C 01:20:10.072Z. Historical retained metadata reports A 2026-07-13T03:45:26.913Z and C 2026-07-03T00:48:59.979Z; B acquisition time is unknown. Historical metadata is not proof of original HTTP bytes: original historical byte objects are unavailable. Git and working-copy hashes are labelled separately, particularly where newline normalization changes them. A happens to match the newly downloaded bytes. New byte identity is independently measured rather than backfilled into historical provenance.

Resource update, catalogue update, original acquisition, historical acquisition, converter build execution, fixed analysis date and snapshot publication are different facts. referenceTime remains null for all sources; source rows have no proven common effective cutoff or survey dates. The deterministic analysis/publication date is 2026-10-25. Actual build execution times belong in verification logs, not a changing timestamp in the content-addressed payload.

## Edition deltas

| Source | Retained rows | Accepted | Whole parsed rows unchanged | Incoming-only | Retained-only |
|---|---:|---:|---:|---:|---:|
| A | 185 | 185 | 185 | 0 | 0 |
| B | 274 | 273 | 164 | 109 | 110 |
| C | 446 | 411 | 9 | 402 | 437 |

Whole-row equality includes source sequence and documentary fields; sequence renumbering contributes heavily to differences. Incoming-only/retained-only is a documentary set comparison, not a removed-place or new-road classification. Safe published comparison omits contact phone fields; exact source bytes preserve all columns. Canonical parsed-row SHA is separately reported in the comparison JSON; it is neither an original HTTP nor snapshot hash.

## Commands and fail-safe behavior

`npm run data:fetch:fire-rescue-access-policy` verifies retained accepted sources **offline**. Explicit `--refresh` permits only known HTTPS data.taipei dataset/resource URLs, rejects redirects, checks MIME types, uses 30-second request timeouts and a streaming 5 MB ceiling. Completed bounded catalogue/resource downloads are written before decoding or parsing; failed refresh records hashes/paths and a failure record. It cannot advance the accepted source manifest or policy pointer.

Inspect `npm run data:audit:fire-rescue-access-policy -- --pending=PATH`, then explicitly promote with `--promote=PATH`. Changed parsed editions additionally require `--accept-edition-change`. This delivery inspected and accepted B/C changes independently, leaving explorer originals untouched. Promotion revalidates source registry/order, exact paths, hashes, byte size, expected schemas, catalogue membership/publisher/title/timestamps, official license, valid canonical acquisition time, CSV content type, row count and strict UTF-8 or Big5 decoding.

CSV headers must match the source-specific schema exactly. Duplicate headers, schema drift, invalid decoding, malformed quote placement or row width reject the source. Missing names, district mismatches, repeated sequences and unknown classification/recognition vocabularies remain stable documentation candidates, with Tier A issues that prevent accepted joins. Unknown values are never silently remapped. The observed A vocabulary and C 1–9 code validation are lexical checks, not a verified severity dictionary.

All 869 accepted rows remain Mode A eligible; zero source-row exclusions. Source completeness diagnostics distinguish optional fields (all B notes empty) from core missing identifiers. No missing value becomes zero. All original A phone values remain in the original CSV; generated public snapshots and briefings omit them.

Contextual official pages were independently retained under `context/` with exact hashes and acquisition dates in `context/references.json`. They are labelled context-only and do not grant row-level classification semantics, PDF-to-CSV unit binding or geographic eligibility. No credentials are retained. Default verification also checks those retained context hashes.
