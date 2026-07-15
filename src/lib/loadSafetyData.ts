import type {
  AedLocation,
  DomesticViolenceReportRecord,
  DomesticViolenceReportSummary,
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
  FireDepartmentDonationInKindRecord,
  FireDepartmentDonationInKindSummary,
  FireRescueDifficultAreaRecord,
  FireRescueDifficultAreaSummary,
  FireAccessRouteRegistryRecord,
  FireAccessRouteRegistrySummary,
  FireHydrant,
  FireHydrantSummary,
  HistoricalFloodingRecord,
  HistoricalFloodingSummary,
  ManagedHikingTrailRecord,
  ManagedHikingTrailSummary,
  MedicalFacility,
  MotorcycleTheftRecord,
  MotorcycleTheftSummary,
  NaturalDisasterSuspensionEventGroup,
  NaturalDisasterSuspensionSummary,
  NaturalDisasterWorkSchoolSuspensionRecord,
  PoliceCctvInstallationLocationRecord,
  PoliceCctvInstallationLocationSummary,
  ResidentialBurglaryRecord,
  SafetyDataBundle,
  SmartTrafficEnforcementEquipmentRecord,
  SmartTrafficEnforcementEquipmentSummary,
  StreetRandomSnatchIncidentRecord,
  StreetRandomSnatchIncidentSummary,
  TrafficCctvFacility,
  TrafficCctvSummary,
  TobaccoControlInspectionRecord,
  TobaccoControlInspectionSummary,
  VehicleTowingTopRoadSectionRecord,
  VehicleTowingTopRoadSectionsSummary,
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
    domesticViolenceReportStatistics,
    domesticViolenceReportSummary,
    tobaccoControlInspectionResults,
    tobaccoControlInspectionSummary,
    burglaries,
    bicycleThefts,
    motorcycleThefts,
    streetRandomSnatchIncidents,
    policeCctvInstallationLocations,
    fireDepartmentDonationInKindRecords,
    managedHikingTrails,
    fireRescueDifficultAreas,
    fireAccessRouteRegistry,
    fireAccessRouteRegistrySummary,
    aeds,
    evacuationGates,
    medicalFacilities,
    emergencyShelters,
    trafficCctvFacilities,
    smartTrafficEnforcementEquipment,
    vehicleTowingTopRoadSections,
    naturalDisasterSuspensionRecords,
    naturalDisasterSuspensionEventGroups,
    historicalFloodingRecords,
    dengueRecords,
    dashboard,
    vehicleTowingTopRoadSectionsSummary,
    conversionReport,
  ] = await Promise.all([
    loadJson<AirRaidShelter[]>('air-raid-shelters.json'),
    loadJson<DomesticViolenceReportRecord[]>('domestic-violence-report-statistics/records.json'),
    loadJson<DomesticViolenceReportSummary>('domestic-violence-report-statistics/summary.json'),
    loadJson<TobaccoControlInspectionRecord[]>('tobacco-control-inspection-results/records.json'),
    loadJson<TobaccoControlInspectionSummary>('tobacco-control-inspection-results/summary.json'),
    loadJson<ResidentialBurglaryRecord[]>('residential-burglary-records.json'),
    loadJson<BicycleTheftRecord[]>('bicycle-theft-records.json'),
    loadJson<MotorcycleTheftRecord[]>('motorcycle-theft-records.json'),
    loadJson<StreetRandomSnatchIncidentRecord[]>('street-random-snatch-incidents.json'),
    loadJson<PoliceCctvInstallationLocationRecord[]>('police-cctv-installation-locations.json'),
    loadJson<FireDepartmentDonationInKindRecord[]>('fire-department-donation-in-kind-records.json'),
    loadJson<ManagedHikingTrailRecord[]>('managed-hiking-trails.json'),
    loadJson<FireRescueDifficultAreaRecord[]>('fire-rescue-difficult-areas.json'),
    loadJson<FireAccessRouteRegistryRecord[]>('fire-access-route-registry.json'),
    loadJson<FireAccessRouteRegistrySummary>('fire-access-route-registry-summary.json'),
    loadJson<AedLocation[]>('aed-locations.json'),
    loadJson<EvacuationGate[]>('evacuation-gates.json'),
    loadJson<MedicalFacility[]>('medical-facilities.json'),
    loadJson<EmergencyShelter[]>('emergency-shelters.json'),
    loadJson<TrafficCctvFacility[]>('traffic-cctv-facilities.json'),
    loadJson<SmartTrafficEnforcementEquipmentRecord[]>('smart-traffic-enforcement-equipment.json'),
    loadJson<VehicleTowingTopRoadSectionRecord[]>('vehicle-towing-top-road-sections.json'),
    loadJson<NaturalDisasterWorkSchoolSuspensionRecord[]>('natural-disaster-work-school-suspension-records.json'),
    loadJson<NaturalDisasterSuspensionEventGroup[]>('natural-disaster-work-school-suspension-event-groups.json'),
    loadJson<HistoricalFloodingRecord[]>('historical-flooding-records.json'),
    loadJson<DengueSurveyRecord[]>('dengue-vector-density-records.json'),
    loadJson<{
      districtSummaries: DistrictSafetySummary[];
      dengueDistrictSummaries: DengueDistrictSummary[];
      fireHydrantSummary: FireHydrantSummary;
      emergencyShelterSummary: EmergencyShelterSummary;
      trafficCctvSummary: TrafficCctvSummary;
      smartTrafficEnforcementEquipmentSummary: SmartTrafficEnforcementEquipmentSummary;
      bicycleTheftSummary: BicycleTheftSummary;
      motorcycleTheftSummary: MotorcycleTheftSummary;
      streetRandomSnatchIncidentSummary: StreetRandomSnatchIncidentSummary;
      policeCctvInstallationLocationSummary: PoliceCctvInstallationLocationSummary;
      fireDepartmentDonationInKindSummary: FireDepartmentDonationInKindSummary;
      managedHikingTrailSummary: ManagedHikingTrailSummary;
      fireRescueDifficultAreaSummary: FireRescueDifficultAreaSummary;
      naturalDisasterSuspensionSummary: NaturalDisasterSuspensionSummary;
      historicalFloodingSummary: HistoricalFloodingSummary;
    }>('safety-dashboard-summary.json'),
    loadJson<VehicleTowingTopRoadSectionsSummary>('vehicle-towing-top-road-sections-summary.json'),
    loadJson<ConversionReport>('conversion-report.json'),
  ]);

  return {
    shelters,
    domesticViolenceReportStatistics,
    domesticViolenceReportSummary,
    tobaccoControlInspectionResults,
    tobaccoControlInspectionSummary,
    burglaries,
    bicycleThefts,
    bicycleTheftSummary: dashboard.bicycleTheftSummary,
    motorcycleThefts,
    motorcycleTheftSummary: dashboard.motorcycleTheftSummary,
    streetRandomSnatchIncidents,
    streetRandomSnatchIncidentSummary: dashboard.streetRandomSnatchIncidentSummary,
    policeCctvInstallationLocations,
    policeCctvInstallationLocationSummary: dashboard.policeCctvInstallationLocationSummary,
    fireDepartmentDonationInKindRecords,
    fireDepartmentDonationInKindSummary: dashboard.fireDepartmentDonationInKindSummary,
    managedHikingTrails,
    managedHikingTrailSummary: dashboard.managedHikingTrailSummary,
    fireRescueDifficultAreas,
    fireRescueDifficultAreaSummary: dashboard.fireRescueDifficultAreaSummary,
    fireAccessRouteRegistry,
    fireAccessRouteRegistrySummary,
    aeds,
    evacuationGates,
    medicalFacilities,
    emergencyShelters,
    trafficCctvFacilities,
    fireHydrantSummary: dashboard.fireHydrantSummary,
    emergencyShelterSummary: dashboard.emergencyShelterSummary,
    trafficCctvSummary: dashboard.trafficCctvSummary,
    smartTrafficEnforcementEquipment,
    smartTrafficEnforcementEquipmentSummary: dashboard.smartTrafficEnforcementEquipmentSummary,
    vehicleTowingTopRoadSections,
    vehicleTowingTopRoadSectionsSummary,
    naturalDisasterSuspensionRecords,
    naturalDisasterSuspensionSummary: dashboard.naturalDisasterSuspensionSummary,
    naturalDisasterSuspensionEventGroups,
    historicalFloodingRecords,
    historicalFloodingSummary: dashboard.historicalFloodingSummary,
    dengueRecords,
    dengueDistrictSummaries: dashboard.dengueDistrictSummaries,
    districtSummaries: dashboard.districtSummaries,
    conversionReport,
  };
}

export async function loadFireHydrants(): Promise<FireHydrant[]> {
  return loadJson<FireHydrant[]>('fire-hydrants.json');
}
