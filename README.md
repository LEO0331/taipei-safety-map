# Taipei Public Safety Map / 台北公共安全地圖

A mobile-first bilingual Vite + React + TypeScript + Leaflet app for public safety information in Taipei.

The app combines AED locations, air-raid shelters, historical residential burglary records, and dengue vector-density survey results. It does not provide real-time availability, crime prediction, or outbreak-risk prediction.

## Data Sources

- `北市警政APP_防空避難設備位置`: public shelter facilities with coordinates and capacity.
- `臺北市住宅竊盜點位資訊`: historical residential burglary records. Source location text is pre-blurred to avoid exposing personally identifiable information.
- `臺北市AED自動體外心臟去顫器設置地點`: public AED placement locations with coordinates and placement descriptions.
- `臺北市登革熱病媒蚊密度調查結果`: public-health survey results aggregated by district and village.

Burglary records are never geocoded to exact household-level markers. The app uses district-level aggregation, blurred location text, and fixed district centroids.

Dengue survey records do not include coordinates. The app uses district centroids for aggregate bubbles and never represents them as exact village or survey locations. The Breteau index generally represents positive water-holding containers per 100 surveyed households; the container index generally represents the proportion of inspected containers that were positive. Refer to official public-health sources for interpretation.

Nearby AED and shelter searches use browser geolocation and Haversine distance. AED locations do not represent real-time availability; in an emergency call 119 and follow official first-aid guidance and AED voice prompts.

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
```

## Coordinate Handling

Shelter coordinates are detected as WGS84 when they look like longitude/latitude pairs. TWD97 TM2 / EPSG:3826 coordinates are converted to WGS84 with `proj4`. Coordinates outside broad Taipei bounds are reported and excluded from map markers.

## Deployment

The GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys the Vite app to GitHub Pages on pushes to `main`.

In repository settings, enable Pages with `GitHub Actions` as the source.

## Disclaimer

This site presents public AED and shelter locations, historical burglary records, and dengue vector-density survey results. AED and shelter availability must be verified with official sources and on-site notices. Burglary data does not represent real-time risk or prediction. Dengue survey data does not represent real-time outbreak risk or case distribution.
