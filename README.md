# Taipei Public Safety Map

**English** · [繁體中文](README-zh.md)

A bilingual Vite, React, TypeScript, and Leaflet dashboard for discovering and exploring Taipei public-safety datasets. It is a public-data reference and historical-analysis tool, not a live emergency service.

## Use the dashboard responsibly

- For an emergency, call **119** and follow official on-site instructions.
- Verify availability, access, operating status, capacity, closures, and instructions with the responsible authority before relying on a published record.
- Historic records, map markers, rankings, and counts do not establish current safety, risk, enforcement quality, legal outcomes, or personal suitability.
- The dashboard never creates a combined safety score or infers causation from unrelated datasets.

## Navigation

The main navigation is organised into five categories so customers can find a relevant subject without scanning a long flat tab strip:

1. **Explore** — map, nearby published resources, overview, and data notes.
2. **Preparedness** — fire-rescue access, trails, flooding, closures, and emergency-operations history.
3. **Health & facilities** — public-health, fire-safety, LPG, electrical-business, and donation records.
4. **Traffic & adjudication** — traffic equipment, towing, enforcement, reported violations, and appeal statistics.
5. **Historical records** — historic crime, domestic-violence reports, occupational accidents, and noise records.

Each category exposes a short, scrollable module row. This keeps the hierarchy usable on small screens while maintaining keyboard-accessible buttons and a visible active destination.

## Datasets and limits

The dashboard includes published directories, statistics, and historical records for AEDs, medical facilities, hydrants, shelters, evacuation gates, CCTV, traffic-enforcement equipment, towing, traffic appeals, trails, flooding, selected crime histories, dengue surveys, fire-rescue records, and other public-safety subjects.

Each module preserves its own scope and limitations. Examples:

- Resource directories do not prove real-time availability, access, capacity, or suitability.
- Crime and sensitive incident records use aggregate, fuzzy, or deliberately blurred representations; do not use them to judge people, premises, routes, or property.
- Traffic appeal data contains only the published Top 5 clauses each month. An absent clause is unavailable, not zero; counts are submissions, not appeal outcomes.
- Kindergarten child-transport vehicles are a historical Academic Year 109, Semester 1 administrative snapshot. They do not establish a vehicle's current use, inspection, insurance, safety, or a kindergarten's current transport service. Vehicle identifiers are masked in the directory and filtered export.
- Soil and water conservation violation cases cover historical administrative enforcement records through 2022. Cadastral references are not geocoded and do not establish a parcel's current legal, development, ownership, or safety status.
- Historical flooding, closures, and trail data are not forecasts, live warnings, navigation, or evacuation instructions.
- Non-geographic sources remain directories or summaries; they are not converted into invented map markers.

See [dashboard decision-support advice](doc/dashboard-decision-support-and-design.md) for recommended interpretation, operational governance, and product priorities.

## Local data architecture

The customer-facing app reads generated static JSON from `public/data/`; it does not require a live Taipei Open Data request at runtime. Source snapshots and conversion scripts are stored under `data/raw/` and `scripts/`.

Converters must preserve raw official fields, parse dates and counts conservatively, report quality issues, and avoid silently replacing missing values with zero. The production release should publish updated records, metadata, and PWA cache entries together.

### Traffic-violation appeal Top-5 clauses

`traffic_violation_appeal_top_clauses` uses the official Taipei City Traffic Adjudication Office dataset, [Top 5 clauses for traffic-violation appeals](https://data.taipei/dataset/detail?id=da715207-29e8-4b8d-b680-7fc120211512).

- Customer assets: `public/data/traffic-violation-appeal-top-clauses/records.json` and `metadata.json`
- Converter: `npm run data:convert:traffic-violation-appeals`
- Source fields preserved: ROC period, rank, clause, Chinese clause description, and appeal count
- Derived Gregorian periods use monthly precision only; malformed or missing counts remain missing

Do not calculate citywide appeal totals, appeal success rates, full clause shares, legal-risk scores, enforcement-quality rankings, or legal interpretations from this source.

### Kindergarten child-transport vehicles

`kindergarten_child_transport_vehicles` uses the official Taipei Department of Education dataset, [臺北市公私立幼兒園幼童專用車清冊](https://data.taipei/dataset/detail?id=a25d8830-f643-41f9-a4ab-8722da91cc1f).

- Customer assets: `public/data/kindergarten-child-transport-vehicles/records.json` and `metadata.json`
- Converter: `npm run data:convert:kindergarten-child-transport-vehicles`
- Represented period: Academic Year 109, Semester 1; file update: 2024-08-07
- Source fields are retained as strings, including sequence number and license plate. The directory masks plates by default; raw source fields are available only in the expandable record detail.
- Manufacture date parsing accepts only the unambiguous month-year format present in this source. Source-recorded vehicle age is never overwritten by a calculated age.

Do not interpret vehicle age as current safety, rank kindergartens, infer current ownership or operations, or create a map, route, inspection, insurance, or driver profile from this dataset.

### Soil and water conservation violations

`soil_water_conservation_violations` uses the official Taipei Geotechnical Engineering Office dataset, [臺北市水土保持法違規案件](https://data.taipei/dataset/detail?id=e7b8404d-3742-4157-98fd-e101b40ba5c7).

- Customer assets: `public/data/soil-water-conservation-violations/records.json` and `metadata.json`
- Converter: `npm run data:convert:soil-water-conservation-violations`
- Published coverage: 1996-01-05 through 2022-12-31; source file update: 2025-03-13
- The module preserves raw case, date, cadastral, area, suspension, and fine fields. It parses only unambiguous dates and non-negative numeric amounts.

This is historical enforcement data, not a current-violation map, legal opinion, property due-diligence service, ownership record, or land-development recommendation.

## Development

```bash
npm install
npm run dev
```

Verification:

```bash
npm run build
npm test
```

For data refreshes, use the module-specific `data:fetch:*` and `data:convert:*` commands in `package.json`. Check the generated metadata and conversion reports before publishing.

## Project guidance

- [AGENTS.md](AGENTS.md) — coding-agent startup, scope, and verification rules
- [feature_list.json](feature_list.json) — feature state and evidence
- [session-handoff.md](session-handoff.md) — current restart context
- [Dashboard decision-support advisory](doc/dashboard-decision-support-and-design.md) — customer and governance recommendations
