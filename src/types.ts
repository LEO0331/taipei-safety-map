export type CoordinateStatus = 'valid' | 'missing' | 'outlier';

export type CoordinateSystem = 'wgs84' | 'twd97_tm2' | 'unknown';
export type SafetyLayer =
  | 'air_raid_shelter'
  | 'residential_burglary_record'
  | 'aed_location'
  | 'dengue_vector_density'
  | 'evacuation_gate'
  | 'medical_facility';

export type AirRaidShelter = {
  id: string;
  itemNo?: string;
  district: string;
  policePrecinct?: string;
  name?: string;
  village?: string;
  address: string;
  basementInfo?: string;
  capacity: number | null;
  originalX?: number;
  originalY?: number;
  longitude?: number | null;
  latitude?: number | null;
  coordinateStatus: CoordinateStatus;
  coordinateSystem?: CoordinateSystem;
  placeName?: string;
  source: string;
};

export type BurglaryTimePeriod =
  | 'early_morning'
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'unknown';

export type ResidentialBurglaryRecord = {
  id: string;
  sourceId?: string;
  caseType: string;
  occurredDateRaw: string;
  occurredAt?: string;
  year?: number;
  month?: number;
  day?: number;
  timePeriodRaw?: string;
  timePeriod: BurglaryTimePeriod;
  locationText: string;
  district?: string;
  source: string;
};

export type DistrictSafetySummary = {
  district: string;
  latitude: number;
  longitude: number;
  shelterCount: number;
  shelterCapacity: number;
  burglaryRecordCount: number;
  burglaryRecordsByYear: Record<string, number>;
  burglaryRecordsByTimePeriod: Record<BurglaryTimePeriod, number>;
};

export type ShelterMapCluster = {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  capacity: number;
};

export type AedLocation = {
  id: string;
  layer: 'aed_location';
  placeName: string;
  address: string;
  districtCode?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  coordinateStatus: CoordinateStatus;
  placeCategory?: string;
  placeType?: string;
  aedPlacementLocation?: string;
  aedLocationDescription?: string;
  source: string;
};

export type EvacuationGate = {
  id: string;
  layer: 'evacuation_gate';
  riversidePark?: string;
  gateName: string;
  description?: string;
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;
  source: string;
};

export type MedicalFacilityType = 'hospital' | 'clinic';

export type MedicalFacility = {
  id: string;
  layer: 'medical_facility';
  facilityType: MedicalFacilityType;
  facilityName: string;
  medicalCategory?: string;
  address: string;
  districtCode?: string;
  cityCode?: string;
  district?: string;
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;
  source: string;
};

export type MedicalFacilitySummary = {
  totalMedicalFacilities: number;
  hospitalCount: number;
  clinicCount: number;
  validCoordinateCount: number;
  recordsWithoutDistrict: number;
  byDistrict: Array<{
    district: string;
    hospitalCount: number;
    clinicCount: number;
    totalCount: number;
  }>;
  byFacilityType: Array<{ facilityType: MedicalFacilityType; count: number }>;
  byMedicalCategory: Array<{ medicalCategory: string; count: number }>;
};

export type DengueSurveyRecord = {
  id: string;
  layer: 'dengue_vector_density';
  sourceId?: string;
  surveyDateRaw: string;
  surveyDate?: string;
  surveyYear?: number;
  surveyMonth?: number;
  city?: string;
  district: string;
  village?: string;
  surveyType?: string;
  surveyedHouseholds?: number;
  positiveHouseholds?: number;
  inspectedContainersIndoor?: number;
  inspectedContainersOutdoor?: number;
  inspectedContainersTotal?: number;
  positiveContainersIndoor?: number;
  positiveContainersOutdoor?: number;
  positiveContainersTotal?: number;
  breteauIndex?: number;
  breteauLevel?: number;
  containerIndex?: number;
  containerLevel?: number;
  source: string;
};

export type DengueDistrictSummary = {
  district: string;
  latitude: number;
  longitude: number;
  recordCount: number;
  surveyedHouseholds: number;
  positiveHouseholds: number;
  inspectedContainersTotal: number;
  positiveContainersTotal: number;
  averageBreteauIndex?: number;
  maxBreteauIndex?: number;
  maxBreteauLevel?: number;
  averageContainerIndex?: number;
  maxContainerIndex?: number;
  maxContainerLevel?: number;
  topVillagesByBreteauIndex: Array<{ village: string; breteauIndex: number; breteauLevel?: number }>;
  bySurveyType: Array<{ surveyType: string; count: number }>;
};

export type Language = 'zh' | 'en';

export type SafetyDataBundle = {
  shelters: AirRaidShelter[];
  burglaries: ResidentialBurglaryRecord[];
  aeds: AedLocation[];
  evacuationGates: EvacuationGate[];
  medicalFacilities: MedicalFacility[];
  dengueRecords: DengueSurveyRecord[];
  dengueDistrictSummaries: DengueDistrictSummary[];
  districtSummaries: DistrictSafetySummary[];
  conversionReport: ConversionReport;
};

export type ConversionReport = {
  generatedAt: string;
  sources: Array<{
    name: string;
    url: string;
    downloadUrl: string;
    downloadedAt: string | null;
    fileSize?: number;
    encoding?: string;
    notes: string;
  }>;
  shelters: {
    inputRows: number;
    outputRows: number;
    validCoordinates: number;
    missingCoordinates: number;
    outlierCoordinates: number;
  };
  burglaries: {
    inputRows: number;
    outputRows: number;
    recordsWithoutDistrict: number;
    dateParseWarnings: number;
  };
  aeds?: {
    inputRows: number;
    outputRows: number;
    validCoordinates: number;
    missingCoordinates: number;
    outlierCoordinates: number;
    recordsWithoutDistrict: number;
  };
  dengue?: {
    inputRows: number;
    outputRows: number;
    dateParseWarnings: number;
    numericParseWarnings: number;
  };
  evacuationGates?: {
    inputRows: number;
    outputRows: number;
    validCoordinates: number;
    missingCoordinates: number;
    outlierCoordinates: number;
  };
  medicalFacilities?: {
    inputRows: number;
    outputRows: number;
    hospitalCount: number;
    clinicCount: number;
    validCoordinates: number;
    missingCoordinates: number;
    outlierCoordinates: number;
    recordsWithoutDistrict: number;
    unmappedDistrictExamples: string[];
  };
  notes: string[];
};
