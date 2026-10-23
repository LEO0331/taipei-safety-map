# Geographic evidence contract

Implementation: `src/lib/bridgePolicyGeography.ts`, `src/BridgePolicyMap.tsx`.

B exposes `Obj_Longitude`/`Obj_Latitude` separately from `Longitude_start`/`Latitude_start` and `Longitude_end`/`Latitude_end`. Official catalogue labels and actual 121.x/25.x values support a longitude/latitude decimal-degree display interpretation. The catalogue does not explicitly certify a CRS/datum or explain how the object point was derived; this remains a limitation. No coordinate transformation or surveyed precision claim is made.

The object point is displayed as an **official published object-reference point**, not necessarily bridge center, entrance, accessible approach or surveyed alignment. Endpoints are retained for audit, not displayed as an authoritative polyline. No geometry is invented from names, roads or district centroids.

## Screening rules

- Numeric scalar values must be finite, with longitude 119–123 and latitude 21–26. Reversed axes, empty, null, arrays and booleans cannot become points.
- Object reference must also fall within the broad Taipei screening range longitude 121.4–121.7, latitude 24.9–25.3.
- Published CountyCode must be 63000 and AreaCode must map to one of twelve Taipei district labels. This checks source coding, not actual administrative containment.
- Every available object/endpoint pair is independently checked; an object-to-endpoint distance over 12 km or endpoint pair over 15 km is flagged and excluded. Missing endpoints remain recorded limitations and do not disqualify an otherwise coherent object-reference point.
- These deliberately broad, approximate metric thresholds detect gross contradictions only. No authoritative city/district polygon is used, and `boundaryValidated` is always false. Subtle district/point discrepancies remain unresolved.
- `non_bridge` other than 橋梁 is excluded from the bridge map while retained in the inventory audit. A correspondence with such a row may still be useful for documentary category clarification.
- Duplicate object locations are reported separately; they are not automatically merged or rejected.

## Actual results

All 612 inventory rows have plausible object/start/end coordinate pairs and recognized Taipei administrative codes in this edition. Thirty-two category exclusions (28 culverts, four other objects) leave 580 inventory reference points eligible for the separate inventory layer. There are three duplicate object-coordinate groups of two rows each.

216 A rows pass identity reconciliation; 22 link to excluded categories and 194 pass the combined geography gate. Thus the matched reference population is 216, with 194/216 geographic eligible; overall A coordinate coverage is 194/416. No geometry is transferred for the other 200 A rows. Geographic scenario B uses these 194 documentation records and remains a research association, not an official crosswalk.

Example geographic exclusion: B row 25, ID 28769, 青礐橋, 北投區, 大地工程處, category 箱涵. Coordinates are numerically plausible but the object is intentionally excluded from the requested bridge map. `bridge-policy-results.json` retains its exact source edition and raw fields. Review question: does the asset classification explain its scope? Exclusion does not imply unsafe or unmaintained.

## Display and accessibility

Blue markers attach an inspection's original result only through an accepted association and geographic screening. Grey inventory markers show inventory-only data, even when an independent association happens to exist elsewhere. Ambiguous/rejected A rows cannot create inspection markers. Invalid/excluded B rows remain in the audit list.

Map layer is capped at 200 points. Scenario candidate cards paginate by 20; inventory text equivalent uses the same first 200 points and paginates by 20. Full inventory and exclusions are available in the audit snapshot. Base tiles use the existing OpenStreetMap service and attribution. There is no heatmap, structural-condition layer or estimated exposure measure.
