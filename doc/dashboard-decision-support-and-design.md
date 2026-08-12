# Dashboard Decision Support and Design Advisory

## Executive position

This dashboard is useful as a public-data discovery, preparedness, and historical trend-monitoring product for Taipei. It supports a resident, analyst, community organisation, or public-service team who needs to find a published facility, inspect a documented historical pattern, or understand which official dataset is relevant.

It must not be positioned as an emergency command console, a live availability service, a navigation product, a risk prediction system, or a ranking of neighbourhoods, organisations, laws, or public agencies. The data is drawn from separate public sources with different coverage, update dates, geographic precision, and collection purposes. Combining them into a single score or causal narrative would be misleading.

The current product already makes many of these limits clear in module notices and source notes. That is a material strength. The next design decisions should make the limits actionable at the point where a user decides what to do.

## What customers can use it for now

| Decision or task | Responsible dashboard use | Required confirmation outside the dashboard |
| --- | --- | --- |
| Find an AED, hydrant, medical facility, shelter, or evacuation gate | Discover a published location or directory entry and open the official or text-map reference | Live availability, access, opening status, capacity, and the official emergency instruction |
| Prepare for a neighbourhood meeting or facilities audit | Identify public-record coverage gaps, repeated historical records, and datasets worth discussing with the responsible agency | Current site conditions, asset maintenance, and local operational plans |
| Investigate historical traffic, towing, enforcement, or appeal patterns | Compare only the published time period and source definition, then formulate a question for the responsible authority | Current enforcement practice, legal interpretation, outcomes, or causal explanations |
| Review historic flooding, trail, or disaster information | Use the historic record as an input to preparedness and source discovery | Forecasts, warnings, closure status, route access, and on-site safety conditions |
| Explore crime or occupational-safety records | Use aggregate and deliberately fuzzy historic data to understand published patterns | Individual risk, present conditions, business safety, or a route/premises recommendation |

## Decision-support guardrails

### 1. Separate lookup, monitoring, and emergency modes

The product should present three clearly different user intents at the top level:

1. **Find a published resource** — location or directory lookup with an explicit "verify before relying" prompt.
2. **Explore historical records** — trends, filters, and source coverage with an explicit date range.
3. **Emergency guidance** — a short, highly visible handoff to `119` and official authority channels rather than a map-based recommendation.

This separation prevents a common and consequential error: treating a historical map marker as an operationally available resource. The existing notices say this in prose; intent-based entry points would make the correct action easier.

### 2. Make freshness a first-class decision control

Every module should expose a compact, consistent freshness block:

- source publisher and official source link;
- source coverage period and source-file update date;
- local ingestion/conversion time;
- refresh frequency where known;
- a plain-language status: `historical`, `periodic`, `directory`, or `unknown freshness`.

Do not use a green/red freshness badge unless the upstream service level is documented. A timestamp is evidence; a status colour implies a reliability guarantee. For datasets without a trustworthy update date, say so plainly and direct users to the source authority.

### 3. Keep comparisons descriptive and denominator-aware

The dashboard correctly avoids claiming that a record count equals risk, safety, enforcement quality, or service availability. Preserve that boundary when adding executive summaries:

- Never compare raw counts across districts without showing the underlying denominator and coverage period.
- Do not compare records produced by different reporting systems as if they measure the same phenomenon.
- Do not infer cause from co-located maps or similarly timed series.
- Do not create a combined "safety score", "danger score", police-performance score, or property-risk score.

Where a comparison is still useful, label it as a source-record comparison and provide the source definition beside the chart. The existing no-causation warning on cross-dataset comparisons should remain mandatory.

### 4. Protect people and organisations from unintended targeting

The project already uses aggregate, blurred, fuzzy, or non-geocoded views for sensitive records. Continue this approach.

- Do not add exact household, victim, incident, or vulnerable-person locations.
- Do not build a searchable watchlist of businesses, donors, residents, or alleged offenders.
- Do not convert historical occupational or noise records into claims about a premises’ current safety or compliance.
- Review every new table export for personal names, telephone numbers, addresses, and re-identification risk before making it customer-downloadable.

## High-value product improvements

### P0 — make the data contract visible and consistent

Add a shared `Data status` pattern to every module rather than relying on module-specific prose alone. It should state what the source measures, what it does not measure, the period, and the next authoritative action. This is the highest-return usability and risk-reduction change because the application spans emergency facilities, enforcement, public health, crime, and disaster history.

### P0 — protect critical user journeys from incomplete loading

The primary application loads a large bundle of local data before rendering the main experience (`src/lib/loadSafetyData.ts`). A failed or slow asset currently produces a single error state. Provide per-module loading and failure states, a retry action, and a source link where possible. A user should still be able to access an available directory or static note when an unrelated dataset fails to load.

### P1 — reduce decision fatigue in the main navigation

`src/App.tsx` contains a long flat tab list spanning very different tasks. Group the navigation by intent: `Emergency resources`, `Preparedness and environment`, `Traffic and administration`, `Historical records`, and `Data notes`. Keep a search or quick-access panel for frequent lookups. This will help users reach the right dataset without reading every label.

### P1 — formalise source monitoring and release gates

Static JSON is a sound customer-facing architecture, but it requires an operational data steward. Before publishing a data refresh:

1. download and preserve the source snapshot;
2. run the converter and data-quality checks;
3. compare record count, field schema, coverage period, and invalid-row counts with the previous release;
4. review material deltas; and
5. publish the refreshed data, metadata, and PWA cache version together.

Use a release note for schema changes or missing months. Do not silently substitute zero, backfill an unverified value, or reuse an old map coordinate as if it were current.

### P1 — test the customer-critical data paths

The current automated suite is small relative to the number of dataset converters and customer modules. Add focused regression tests for:

- malformed or shifted CSV headers;
- Big5/CP950 and UTF-8 decoding fallback;
- ROC-date and month parsing;
- coordinate bounds and no-geocoding safeguards;
- null versus zero handling in trend modules;
- PWA cache entries for every locally fetched JSON file;
- bilingual labels and keyboard navigation for filters, tables, and notices.

### P2 — improve accessibility for maps and dense tables

Leaflet maps should always have a comparable accessible directory, list, or table with the same essential information. Ensure map marker information is keyboard reachable and that a screen-reader user can complete a resource lookup without interacting with the map. For wide data tables, provide responsive card/list alternatives, visible focus states, descriptive table captions, and export a filtered data view rather than forcing horizontal scroll.

### P2 — publish a decision catalogue, not just a dataset catalogue

The README accurately describes data sources and limitations. Add a short customer-facing guide that starts from a question:

- "I need emergency help now" → call 119 and follow official instructions.
- "I need to check a published nearby resource" → use lookup, then verify availability.
- "I need a historic public record" → use the relevant trend/directory module and cite the source period.
- "I need a forecast, legal outcome, current road status, or safety recommendation" → this dashboard is not the source; link to the responsible official service.

## Dataset-specific advisory notes

### Emergency-resource directories

AED, medical, hydrant, shelter, and evacuation-gate data is most valuable for preparedness, source discovery, and non-emergency lookup. It cannot establish real-time availability, entrance access, staffing, usable capacity, or suitability for an incident. Place the verification step next to every "open map" or "nearby" action.

### Traffic, enforcement, and appeal statistics

Traffic equipment, towing, reported-violation, and appeal datasets answer different questions. Keep them separate in navigation and language. In particular, the appeal module publishes only the top five appeal clauses for each period. It cannot show total citywide appeals, success rates, full clause shares, or the appeal count for an absent clause. A high count is a submitted-appeal statistic, not evidence of an incorrect ticket, improper enforcement, or an unfair law.

### Crime, occupational, and noise histories

These records need the strongest anti-stigma framing. They are historic source records with location and reporting limitations, not a current condition or a recommendation about a person, business, street, or property. Continue to favour aggregate/fuzzy views and avoid route advice or premises-level rankings.

### Flooding, trails, and disaster histories

Historic geometry and messages are valuable for education and preparedness. They are not a forecast, warning, closure status, safe route, or evacuation instruction. A future enhancement should link each history view to the responsible live warning service, but must label that service as external and time-sensitive.

## Measurable success criteria

Measure whether the dashboard helps customers make safer, more accurate decisions without increasing overconfidence:

- percentage of resource lookups that expose a source date and verification prompt;
- percentage of datasets with a validated refresh metadata record;
- number of converter/schema anomalies caught before release;
- task-completion success for keyboard-only and screen-reader resource lookup;
- reduction in users selecting a historical module when they report needing real-time emergency information;
- support feedback indicating whether users understood data period, coverage, and limitations.

Do not treat clicks, map-marker views, or the number of displayed datasets as evidence of decision quality.

## Consultant recommendation

Invest first in a consistent data-status/verification pattern, resilient per-module loading, and intent-based navigation. These changes improve real-world usefulness across all sources while preserving the project’s most important principle: public data should inform questions and preparation, not manufacture certainty about a live emergency, legal outcome, safety level, or individual risk.
