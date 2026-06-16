import { countBy } from '../src/lib/safetyData.ts';
import { loadConvertedData, sources, writeJson } from './shared.ts';

const { shelters, burglaries, districtSummaries } = await loadConvertedData();

await writeJson('public/data/safety-dashboard-summary.json', { districtSummaries });
await writeJson('public/data/conversion-report.json', {
  generatedAt: new Date().toISOString(),
  sources: [
    {
      name: sources.shelters.name,
      url: sources.shelters.pageUrl,
      downloadUrl: sources.shelters.downloadUrl,
      downloadedAt: null,
      notes: 'Generated from local raw CSV when scripts are run.',
    },
    {
      name: sources.burglaries.name,
      url: sources.burglaries.pageUrl,
      downloadUrl: sources.burglaries.downloadUrl,
      downloadedAt: null,
      notes: 'Burglary addresses are pre-blurred by the data source and are aggregated in the app.',
    },
  ],
  shelters: {
    inputRows: shelters.length,
    outputRows: shelters.length,
    validCoordinates: shelters.filter((shelter) => shelter.coordinateStatus === 'valid').length,
    missingCoordinates: shelters.filter((shelter) => shelter.coordinateStatus === 'missing').length,
    outlierCoordinates: shelters.filter((shelter) => shelter.coordinateStatus === 'outlier').length,
  },
  burglaries: {
    inputRows: burglaries.length,
    outputRows: burglaries.length,
    recordsWithoutDistrict: burglaries.filter((record) => !record.district).length,
    dateParseWarnings: burglaries.filter((record) => !record.year).length,
  },
  notes: [
    'Residential burglary records remain blurred and are never geocoded into exact household-level markers.',
    `Burglary time periods: ${Object.keys(countBy(burglaries, (record) => record.timePeriod)).join(', ')}`,
  ],
});

console.log('Built safety dashboard summaries.');
