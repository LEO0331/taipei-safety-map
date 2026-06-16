import type { ConversionReport, DistrictSafetySummary, SafetyDataBundle } from '../types';
import type { AirRaidShelter, ResidentialBurglaryRecord } from '../types';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(`${DATA_BASE}/${path}`);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loadSafetyData(): Promise<SafetyDataBundle> {
  const [shelters, burglaries, dashboard, conversionReport] = await Promise.all([
    loadJson<AirRaidShelter[]>('air-raid-shelters.json'),
    loadJson<ResidentialBurglaryRecord[]>('residential-burglary-records.json'),
    loadJson<{ districtSummaries: DistrictSafetySummary[] }>('safety-dashboard-summary.json'),
    loadJson<ConversionReport>('conversion-report.json'),
  ]);

  return {
    shelters,
    burglaries,
    districtSummaries: dashboard.districtSummaries,
    conversionReport,
  };
}
