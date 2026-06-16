# Taipei Public Safety Map / 台北公共安全地圖

A mobile-first bilingual Vite + React + TypeScript + Leaflet app for public safety information in Taipei.

The app combines public air-raid shelter locations with historical residential burglary records. It is not a crime prediction product, does not show real-time risk, and does not score neighborhoods.

## Data Sources

- `北市警政APP_防空避難設備位置`: public shelter facilities with coordinates and capacity.
- `臺北市住宅竊盜點位資訊`: historical residential burglary records. Source location text is pre-blurred to avoid exposing personally identifiable information.

Burglary records are never geocoded to exact household-level markers. The app uses district-level aggregation, blurred location text, and fixed district centroids.

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

## Coordinate Handling

Shelter coordinates are detected as WGS84 when they look like longitude/latitude pairs. TWD97 TM2 / EPSG:3826 coordinates are converted to WGS84 with `proj4`. Coordinates outside broad Taipei bounds are reported and excluded from map markers.

## Deployment

The GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys the Vite app to GitHub Pages on pushes to `main`.

In repository settings, enable Pages with `GitHub Actions` as the source.

## Disclaimer

This site presents public air-raid shelter locations and historical residential burglary records. Burglary locations are pre-blurred by the data source; this site does not provide household-level location, crime prediction, or real-time risk assessment. Actual shelter availability, entrance location, and capacity should be verified with official sources and on-site notices.
