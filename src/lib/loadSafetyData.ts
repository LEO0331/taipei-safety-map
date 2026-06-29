import type {
  AedLocation,
  AirRaidShelter,
  BicycleTheftRecord,
  BicycleTheftSummary,
  ConversionReport,
  DengueDistrictSummary,
  DengueSurveyRecord,
  DistrictSafetySummary,
  EmergencyShelter,
  EmergencyShelterSummary,
  EvacuationGate,
  FireHydrant,
  FireHydrantSummary,
  MedicalFacility,
  NaturalDisasterSuspensionEventGroup,
  NaturalDisasterSuspensionSummary,
  NaturalDisasterWorkSchoolSuspensionRecord,
  ResidentialBurglaryRecord,
  SafetyDataBundle,
  TrafficCctvFacility,
  TrafficCctvSummary,
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
  const [
    shelters,
    burglaries,
    bicycleThefts,
    aeds,
    evacuationGates,
    medicalFacilities,
    emergencyShelters,
    trafficCctvFacilities,
    naturalDisasterSuspensionRecords,
    naturalDisasterSuspensionEventGroups,
    dengueRecords,
    dashboard,
    conversionReport,
  ] = await Promise.all([
    loadJson<AirRaidShelter[]>('air-raid-shelters.json'),
    loadJson<ResidentialBurglaryRecord[]>('residential-burglary-records.json'),
    loadJson<BicycleTheftRecord[]>('bicycle-theft-records.json'),
    loadJson<AedLocation[]>('aed-locations.json'),
    loadJson<EvacuationGate[]>('evacuation-gates.json'),
    loadJson<MedicalFacility[]>('medical-facilities.json'),
    loadJson<EmergencyShelter[]>('emergency-shelters.json'),
    loadJson<TrafficCctvFacility[]>('traffic-cctv-facilities.json'),
    loadJson<NaturalDisasterWorkSchoolSuspensionRecord[]>('natural-disaster-work-school-suspension-records.json'),
    loadJson<NaturalDisasterSuspensionEventGroup[]>('natural-disaster-work-school-suspension-event-groups.json'),
    loadJson<DengueSurveyRecord[]>('dengue-vector-density-records.json'),
    loadJson<{
      districtSummaries: DistrictSafetySummary[];
      dengueDistrictSummaries: DengueDistrictSummary[];
      fireHydrantSummary: FireHydrantSummary;
      emergencyShelterSummary: EmergencyShelterSummary;
      trafficCctvSummary: TrafficCctvSummary;
      bicycleTheftSummary: BicycleTheftSummary;
      naturalDisasterSuspensionSummary: NaturalDisasterSuspensionSummary;
    }>('safety-dashboard-summary.json'),
    loadJson<ConversionReport>('conversion-report.json'),
  ]);

  return {
    shelters,
    burglaries,
    bicycleThefts,
    bicycleTheftSummary: dashboard.bicycleTheftSummary,
    aeds,
    evacuationGates,
    medicalFacilities,
    emergencyShelters,
    trafficCctvFacilities,
    fireHydrantSummary: dashboard.fireHydrantSummary,
    emergencyShelterSummary: dashboard.emergencyShelterSummary,
    trafficCctvSummary: dashboard.trafficCctvSummary,
    naturalDisasterSuspensionRecords,
    naturalDisasterSuspensionSummary: dashboard.naturalDisasterSuspensionSummary,
    naturalDisasterSuspensionEventGroups,
    dengueRecords,
    dengueDistrictSummaries: dashboard.dengueDistrictSummaries,
    districtSummaries: dashboard.districtSummaries,
    conversionReport,
  };
}

export async function loadFireHydrants(): Promise<FireHydrant[]> {
  return loadJson<FireHydrant[]>('fire-hydrants.json');
}
