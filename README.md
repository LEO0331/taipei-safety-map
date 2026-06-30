# Taipei Public Safety Map / 台北公共安全地圖

A mobile-first bilingual Vite + React + TypeScript + Leaflet app for public safety information in Taipei.

The app combines AED locations, medical facilities, fire hydrants, air-raid shelters, emergency shelters, evacuation gates, CCTV equipment locations, police CCTV installation-location records, historical residential burglary records, bicycle theft records, motorcycle theft records, dengue vector-density survey results, and historical natural-disaster work/school suspension messages. It does not provide real-time availability, remaining shelter capacity, live CCTV video, medical advice, fire-response instructions, evacuation instructions, current closure status, forecasts, crime-risk scoring, route-safety guarantees, privacy or legal advice, insurance advice, theft-prevention advice, crime prediction, or outbreak-risk prediction.

Fire & emergency facilities: AEDs, medical facilities, and fire hydrants / 消防與緊急設施：AED、醫療院所與消防栓

Shelters & disaster response facilities: air-raid shelters, emergency shelters, and evacuation gates / 避難與災害應變設施：防空避難設備、避難收容處所與疏散門

Traffic monitoring facilities: CCTV equipment locations / 交通監控設施：CCTV設備點位

Public safety infrastructure: police CCTV installation-location records / 公共安全設施：警察局錄影監視系統設置區位

Crime records and public safety: historical bicycle and motorcycle theft records with district, time-band, and fuzzy-location summaries / 治安紀錄與生活安全：自行車與機車竊盜歷史紀錄、行政區、發生時段與模糊地點彙總

Disaster information history: historical natural-disaster work/school suspension messages / 災害資訊歷史：歷次天然災害停止上班上課訊息

## Data Sources

- `北市警政APP_防空避難設備位置`: public shelter facilities with coordinates and capacity.
- `臺北市住宅竊盜點位資訊`: historical residential burglary records. Source location text is pre-blurred to avoid exposing personally identifiable information.
- `臺北市自行車竊盜點位資訊`: historical bicycle theft records with CP950 / Big5-family encoding, compact ROC dates, incident time bands, and pre-fuzzed location text.
- `臺北市機車竊盜點位資訊`: historical motorcycle theft records with CP950 / Big5-family encoding, compact ROC dates, incident time bands, and pre-fuzzed location text.
- `臺北市AED自動體外心臟去顫器設置地點`: public AED placement locations with coordinates and placement descriptions.
- `臺北市登革熱病媒蚊密度調查結果`: public-health survey results aggregated by district and village.
- `臺北市疏散門資訊`: WGS84 evacuation-gate location records with riverside park, name, and location description.
- `臺北市公私立醫療院所`: separate hospital and clinic resources with WGS84 coordinates.
- `大臺北地區消防栓分布點位圖`: Greater Taipei hydrant records from 北水處 with WGS84 and TWD97 coordinates.
- `臺北市可供避難收容處所一覽表`: UTF-8-SIG emergency shelter directory with disaster applicability, listed capacity, area, served villages, and public contact fields.
- `臺北市CCTV設施`: Big5 / CP950 traffic CCTV equipment locations with sequence number, city, camera location/code, and WGS84 coordinates.
- `臺北市政府警察局錄影監視系統設置區位`: UTF-8-SIG police CCTV installation-location records with city/county code, sequence number, police unit, installation address, and camera direction. The source has no official coordinates.
- `臺北市歷次天然災害停止上班上課訊息`: UTF-8-SIG historical natural-disaster work/school suspension messages with ROC year/month/day, disaster name, and preserved official decision text.

Burglary records are never geocoded to exact household-level markers. The app uses district-level aggregation, blurred location text, and fixed district centroids.

Bicycle theft records are never geocoded to exact markers. The app parses compact ROC dates, incident time bands, district, village, road names, and address ranges, then shows district centroid bubbles, road summaries, and fuzzy-location buckets. It does not represent current crime risk, exact incident addresses, route safety, legal advice, or theft-prevention advice.

Motorcycle theft records are never geocoded to exact markers. The app parses compact ROC dates, incident time bands, district, village, road names, and address ranges, then shows district centroid bubbles, road summaries, and fuzzy-location buckets. It does not represent current crime risk, exact incident addresses, route safety, legal advice, insurance advice, or theft-prevention advice.

Dengue survey records do not include coordinates. The app uses district centroids for aggregate bubbles and never represents them as exact village or survey locations. The Breteau index generally represents positive water-holding containers per 100 surveyed households; the container index generally represents the proportion of inspected containers that were positive. Refer to official public-health sources for interpretation.

Emergency shelter records do not include coordinates. The app shows district-level bubbles using Taipei district centroids, renders a searchable directory, and links addresses to Google Maps lookup. It does not automatically geocode, claim real-time opening status, show remaining capacity, or replace official evacuation instructions. Contact and manager fields stay in normalized JSON but are not shown in default cards.

Nearby AED, hospital, clinic, fire-hydrant, air-raid shelter, and evacuation-gate searches use browser geolocation and Haversine distance. Emergency shelters use district/address lookup until verified coordinates are added. Fire hydrant records do not represent real-time availability, fire-response deployment, or on-site accessibility.

CCTV records are shown as traffic monitoring infrastructure points only. The app parses WGS84 coordinates and validates them against Taipei bounds, but does not provide live video access, camera direction, monitoring coverage, camera-feed links, crime-prevention claims, or safety scores. Live traffic image value-added use requires separate official application and usage under the authority rules.

Police CCTV installation-location records are shown as district-level summaries and an address-based directory only. The app parses district and road text from installation addresses but does not geocode, show exact markers, provide live video, infer field of view, or claim real-time operational status.

Natural-disaster suspension records are a no-coordinate history module. Conversion parses ROC dates to Gregorian dates, classifies disaster type from the disaster name, classifies suspension messages heuristically, preserves the raw official message text, and groups events by year plus disaster name. The module does not provide real-time closure status, forecasts, current disaster status, emergency instructions, route safety, or evacuation guidance.

## Local Workflow

```bash
npm install
npm run fetch:data
npm run convert:data
npm run dev
```

Useful commands:

```bash
npm test
npm run build
npm run preview
```

`npm run fetch:data` downloads CSV files into `data/raw/safety/`. Existing raw files are reused unless `--force` is passed:

```bash
npm run fetch:data -- --force
```

`npm run convert:data` regenerates JSON files in `public/data/`.

Uploaded AED and dengue CSVs are read from:

```txt
data/raw/aed-locations/aed-locations.csv
data/raw/dengue-vector-density/dengue-vector-density.csv
data/raw/evacuation-gates/evacuation-gates.csv
data/raw/medical-facilities/hospitals.csv
data/raw/medical-facilities/clinics.csv
data/raw/fire-hydrants/fire-hydrants.csv
data/raw/emergency-shelters/emergency-shelters.csv
data/raw/traffic-cctv/traffic-cctv.csv
data/raw/police-cctv-installation-locations/police-cctv-installation-locations.csv
data/raw/natural-disaster-work-school-suspension-records/natural-disaster-work-school-suspension-records.csv
data/raw/bicycle-theft-records/bicycle-theft-records.csv
data/raw/motorcycle-theft-records/motorcycle-theft-records.csv
```

## Coordinate Handling

Air-raid shelter coordinates are detected as WGS84 when they look like longitude/latitude pairs. TWD97 TM2 / EPSG:3826 coordinates are converted to WGS84 with `proj4`. Medical hospital and clinic CSVs are decoded as Big5 / CP950 with UTF-8 fallback. Fire hydrant CSVs are UTF-8-SIG with Big5 fallback, preserve TWD97 coordinates, classify underground / above-ground hydrants, and validate WGS84 coordinates against Greater Taipei bounds.

Emergency shelter CSVs are UTF-8-SIG with Big5 fallback. Conversion parses `Y` / `N` / `備用` / `老舊聚落`, listed capacity, area, shelter type, served villages, accessibility, indoor/outdoor flags, and relief-station flags. Optional verified coordinates can be added later through `public/data/emergency-shelter-locations.json`; the app does not geocode addresses automatically.

CCTV CSVs are Big5 / CP950 with UTF-8 fallback. Conversion parses `流水號`, `縣市`, `攝影機編號位置` / `攝影機編號`, and WGS84 longitude/latitude. Missing, unparsed, and outlier coordinates are reported and are not rendered as exact markers.

Police CCTV installation-location CSVs are UTF-8-SIG with Big5 fallback. Conversion parses `縣市別代碼`, `編號`, `所屬單位`, `安裝地址`, and `攝影方向`; it extracts district and road text where practical, but never geocodes or creates exact device points.

Natural-disaster suspension CSVs are UTF-8-SIG with Big5 fallback. Conversion parses `民國年`, `月`, `日`, `天然災害名稱`, and `臺北市停止上班上課情形`; raw decision text is preserved exactly and classification is only an auxiliary filter.

Bicycle theft CSVs are CP950 / Big5-family with UTF-8-SIG fallback. Conversion parses `編號`, `案類`, compact ROC `發生日期`, `發生時段`, and fuzzy `發生地點`; it extracts district, village, road, and address-range text where practical, but never geocodes or creates exact incident points.

Motorcycle theft CSVs are CP950 / Big5-family with UTF-8-SIG fallback. Conversion parses `編號`, `案類`, compact ROC `發生日期`, `發生時段`, and fuzzy `發生地點`; it extracts district, village, road, and address-range text where practical, but never geocodes or creates exact incident points.

`fire-hydrants.json` is intentionally not precached because it is large. The app caches `fire-hydrant-summary.json` and lazy-loads exact hydrant points only when the hydrant layer or nearby hydrant lookup is used.

## Deployment

The GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys the Vite app to GitHub Pages on pushes to `main`.

In repository settings, enable Pages with `GitHub Actions` as the source.

## Disclaimer

This site presents public AED, medical-facility, fire-hydrant, air-raid shelter, emergency shelter, evacuation-gate, and CCTV equipment records, historical burglary records, and dengue vector-density survey results. Fire hydrant, emergency shelter, and CCTV records do not represent real-time availability, fire-response deployment, shelter opening status, remaining capacity, CCTV live video, monitoring coverage, on-site accessibility, or official evacuation instructions. In an emergency, call 119 and follow official authorities and on-site command.
