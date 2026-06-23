import type {
  AedLocation,
  AirRaidShelter,
  ConversionReport,
  DengueDistrictSummary,
  DengueSurveyRecord,
  DistrictSafetySummary,
  EvacuationGate,
  MedicalFacility,
  ResidentialBurglaryRecord,
  SafetyDataBundle,
} from '../types';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(`${DATA_BASE}/${path}`);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loadSafetyData(): Promise<SafetyDataBundle> {
  const [shelters, burglaries, aeds, evacuationGates, medicalFacilities, dengueRecords, dashboard, conversionReport] = await Promise.all([
    loadJson<AirRaidShelter[]>('air-raid-shelters.json'),
    loadJson<ResidentialBurglaryRecord[]>('residential-burglary-records.json'),
    loadJson<AedLocation[]>('aed-locations.json'),
    loadJson<EvacuationGate[]>('evacuation-gates.json'),
    loadJson<MedicalFacility[]>('medical-facilities.json'),
    loadJson<DengueSurveyRecord[]>('dengue-vector-density-records.json'),
    loadJson<{
      districtSummaries: DistrictSafetySummary[];
      dengueDistrictSummaries: DengueDistrictSummary[];
    }>('safety-dashboard-summary.json'),
    loadJson<ConversionReport>('conversion-report.json'),
  ]);

  return {
    shelters,
    burglaries,
    aeds,
    evacuationGates,
    medicalFacilities,
    dengueRecords,
    dengueDistrictSummaries: dashboard.dengueDistrictSummaries,
    districtSummaries: dashboard.districtSummaries,
    conversionReport,
  };
}
