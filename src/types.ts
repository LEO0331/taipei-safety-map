export type CoordinateStatus = 'valid' | 'missing' | 'outlier' | 'unparsed';

export type CoordinateSystem = 'wgs84' | 'twd97_tm2' | 'unknown';
export type SafetyLayer =
  | 'air_raid_shelter'
  | 'emergency_shelter'
  | 'residential_burglary_record'
  | 'aed_location'
  | 'dengue_vector_density'
  | 'evacuation_gate'
  | 'medical_facility'
  | 'fire_hydrant'
  | 'traffic_cctv';

export type LocationPrecision = 'exact' | 'district_centroid' | 'address_only' | 'missing';

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

export type FireHydrantType = 'underground' | 'above_ground' | 'other' | 'unknown';
export type FireHydrantAreaScope =
  | 'taipei_city'
  | 'new_taipei_official_scope'
  | 'new_taipei_other'
  | 'unknown';

export type FireHydrant = {
  id: string;
  layer: 'fire_hydrant';
  sourceSequenceNumber?: number;
  mapSheetNumber?: string;
  hydrantNumber?: string;
  wpid?: string;
  xTwd97?: number;
  yTwd97?: number;
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;
  hydrantTypeRaw?: string;
  hydrantType: FireHydrantType;
  areaRaw?: string;
  city?: string;
  district?: string;
  village?: string;
  areaScope: FireHydrantAreaScope;
  isTaipeiCity: boolean;
  isNewTaipei: boolean;
  source: string;
  sourceAgency: string;
};

export type FireHydrantSummary = {
  totalRecords: number;
  validCoordinateCount: number;
  outlierCoordinateCount: number;
  taipeiCityCount: number;
  newTaipeiCount: number;
  newTaipeiOfficialScopeCount: number;
  newTaipeiOtherCount: number;
  undergroundHydrantCount: number;
  aboveGroundHydrantCount: number;
  otherHydrantTypeCount: number;
  unknownHydrantTypeCount: number;
  cityCount: number;
  districtCount: number;
  villageCount: number;
  byCity: Array<{ city: string; count: number }>;
  byDistrict: Array<{
    city: string;
    district: string;
    count: number;
    undergroundHydrantCount: number;
    aboveGroundHydrantCount: number;
  }>;
  byVillage: Array<{ city: string; district: string; village: string; count: number }>;
  byHydrantType: Array<{ hydrantType: FireHydrantType; hydrantTypeRaw?: string; count: number }>;
  byAreaScope: Array<{ areaScope: FireHydrantAreaScope; count: number }>;
};

export type EmergencyShelterType =
  | 'school'
  | 'library'
  | 'park_green_space'
  | 'activity_center'
  | 'market_parking_lot'
  | 'metro_station'
  | 'sports_facility'
  | 'arts_center'
  | 'military_camp'
  | 'other'
  | 'unknown';

export type DisasterApplicabilityStatus = 'yes' | 'no' | 'backup' | 'old_settlement' | 'unknown';

export type EmergencyShelter = {
  id: string;
  layer: 'emergency_shelter';
  shelterId: string;
  shelterName: string;
  city?: string;
  postalCode?: string;
  district?: string;
  village?: string;
  address?: string;
  shelterTypeRaw?: string;
  shelterType: EmergencyShelterType;
  floodStatus: DisasterApplicabilityStatus;
  earthquakeStatus: DisasterApplicabilityStatus;
  landslideStatus: DisasterApplicabilityStatus;
  tsunamiStatus: DisasterApplicabilityStatus;
  isReliefStation?: boolean;
  hasAccessibleFacilities?: boolean;
  hasIndoorSpace?: boolean;
  hasOutdoorSpace?: boolean;
  servedVillagesRaw?: string;
  servedVillages: string[];
  capacityPeople?: number;
  shelterAreaSqm?: number;
  contactPersonName?: string;
  contactPhone?: string;
  managerName?: string;
  managerPhone?: string;
  notes?: string;
  longitude?: number;
  latitude?: number;
  locationPrecision: LocationPrecision;
  source: string;
  sourceAgency: string;
};

export type EmergencyShelterSummary = {
  totalRecords: number;
  uniqueShelterIdCount: number;
  cityCount: number;
  districtCount: number;
  villageCount: number;
  totalListedCapacityPeople: number;
  totalKnownShelterAreaSqm: number;
  recordsWithCapacity: number;
  recordsWithArea: number;
  reliefStationCount: number;
  accessibleFacilityCount: number;
  indoorShelterCount: number;
  outdoorShelterCount: number;
  byDistrict: Array<{
    district: string;
    count: number;
    totalListedCapacityPeople: number;
    accessibleFacilityCount: number;
    reliefStationCount: number;
    indoorShelterCount: number;
    outdoorShelterCount: number;
    topShelterTypes: Array<{ shelterType: EmergencyShelterType; shelterTypeRaw?: string; count: number }>;
  }>;
  byShelterType: Array<{ shelterType: EmergencyShelterType; shelterTypeRaw?: string; count: number; totalListedCapacityPeople: number }>;
  byDisasterApplicability: {
    flood: Array<{ status: DisasterApplicabilityStatus; count: number }>;
    earthquake: Array<{ status: DisasterApplicabilityStatus; count: number }>;
    landslide: Array<{ status: DisasterApplicabilityStatus; count: number }>;
    tsunami: Array<{ status: DisasterApplicabilityStatus; count: number }>;
  };
};

export type TrafficCctvFacility = {
  id: string;
  layer: 'traffic_cctv';
  sourceSequenceNumber?: number;
  city?: string;
  cameraLocationCodeRaw?: string;
  cameraLocationCode?: string;
  locationDescription?: string;
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;
  source: string;
  sourceAgency: string;
};

export type TrafficCctvSummary = {
  totalRecords: number;
  validCoordinateCount: number;
  missingCoordinateCount: number;
  outlierCoordinateCount: number;
  unparsedCoordinateCount: number;
  cityCount: number;
  byCity: Array<{ city: string; count: number }>;
  coordinateStatus: Array<{ coordinateStatus: CoordinateStatus; count: number }>;
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
  fireHydrantSummary: FireHydrantSummary;
  emergencyShelters: EmergencyShelter[];
  emergencyShelterSummary: EmergencyShelterSummary;
  trafficCctvFacilities: TrafficCctvFacility[];
  trafficCctvSummary: TrafficCctvSummary;
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
  fireHydrants?: {
    inputRows: number;
    outputRows: number;
    duplicateRows: number;
    coordinateConflicts: number;
    validCoordinates: number;
    missingCoordinates: number;
    unparsedCoordinates: number;
    outlierCoordinates: number;
    areaParseWarnings: string[];
    coordinateConflictExamples: string[];
  };
  emergencyShelters?: {
    inputRows: number;
    outputRows: number;
    duplicateRows: number;
    recordsWithoutDistrict: number;
    invalidCapacityExamples: string[];
    invalidAreaExamples: string[];
    unmappedDistrictExamples: string[];
  };
  trafficCctv?: {
    inputRows: number;
    outputRows: number;
    duplicateRows: number;
    validCoordinates: number;
    missingCoordinates: number;
    unparsedCoordinates: number;
    outlierCoordinates: number;
    invalidCoordinateExamples: string[];
    outlierCoordinateExamples: string[];
    duplicateExamples: string[];
  };
  notes: string[];
};
