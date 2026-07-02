export type CoordinateStatus = 'valid' | 'missing' | 'outlier' | 'unparsed';

export type CoordinateSystem = 'wgs84' | 'twd97_tm2' | 'unknown';
export type SafetyLayer =
  | 'air_raid_shelter'
  | 'emergency_shelter'
  | 'residential_burglary_record'
  | 'bicycle_theft_records'
  | 'motorcycle_theft_record'
  | 'aed_location'
  | 'dengue_vector_density'
  | 'evacuation_gate'
  | 'medical_facility'
  | 'fire_hydrant'
  | 'traffic_cctv'
  | 'police_cctv_installation_location'
  | 'fire_department_donation_in_kind_records'
  | 'managed_hiking_trails'
  | 'natural_disaster_work_school_suspension_records';

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

export type BicycleTheftCaseType = 'bicycle_theft' | 'other' | 'unknown';
export type MotorcycleTheftCaseType = 'motorcycle_theft' | 'other' | 'unknown';
export type IncidentTimeOfDayCategory =
  | 'late_night'
  | 'early_morning'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'cross_midnight'
  | 'unknown';
export type BicycleTheftLocationPrecision =
  | 'district_centroid'
  | 'fuzzy_address_text'
  | 'road_or_segment_level'
  | 'unknown';
export type BicycleTheftLocationFuzzinessLevel =
  | 'address_range'
  | 'road_or_area_text'
  | 'facility_or_landmark_text'
  | 'district_only'
  | 'unknown';

export type BicycleTheftRecord = {
  id: string;
  module: 'bicycle_theft_records';
  sourceRecordNumber?: number;
  caseTypeRaw?: string;
  caseType: BicycleTheftCaseType;
  incidentDateRaw?: string;
  rocYear?: number;
  year?: number;
  month?: number;
  day?: number;
  date?: string;
  monthKey?: string;
  quarter?: string;
  weekday?: number;
  incidentTimeBandRaw?: string;
  incidentTimeBand?: string;
  timeBandStartHour?: number;
  timeBandEndHour?: number;
  crossesMidnight: boolean;
  timeOfDayCategory: IncidentTimeOfDayCategory;
  incidentLocationRaw?: string;
  locationTextNormalized?: string;
  district?: string;
  village?: string;
  roadName?: string;
  locationFuzzinessLevel: BicycleTheftLocationFuzzinessLevel;
  hasAddressRange: boolean;
  addressRangeText?: string;
  locationBucketKey?: string;
  eventGroupKey?: string;
  locationPrecision: BicycleTheftLocationPrecision;
  latitude?: number;
  longitude?: number;
  source: string;
  sourceAgency: string;
};

export type BicycleTheftSummary = {
  totalRecords: number;
  uniqueFuzzyLocationCount: number;
  minDate?: string;
  maxDate?: string;
  minYear?: number;
  maxYear?: number;
  districtCount: number;
  recordsWithParsedDistrict: number;
  recordsWithParsedRoadName: number;
  recordsWithAddressRange: number;
  byYear: Array<{ year: number; recordCount: number }>;
  byMonth: Array<{ month: number; recordCount: number }>;
  byYearMonth: Array<{ monthKey: string; recordCount: number }>;
  byDistrict: Array<{
    district: string;
    recordCount: number;
    topTimeOfDayCategories: Array<{ timeOfDayCategory: IncidentTimeOfDayCategory; count: number }>;
  }>;
  byIncidentTimeBand: Array<{ incidentTimeBand: string; recordCount: number }>;
  byTimeOfDayCategory: Array<{ timeOfDayCategory: IncidentTimeOfDayCategory; recordCount: number }>;
  byRoadName: Array<{ roadName: string; recordCount: number }>;
  byLocationBucket: Array<{
    locationBucketKey: string;
    district?: string;
    roadName?: string;
    sampleLocationText?: string;
    recordCount: number;
  }>;
  latestRecords: BicycleTheftRecord[];
};

export type MotorcycleTheftRecord = Omit<BicycleTheftRecord, 'module' | 'caseType'> & {
  module: 'motorcycle_theft_record';
  caseType: MotorcycleTheftCaseType;
};

export type MotorcycleTheftSummary = Omit<BicycleTheftSummary, 'latestRecords'> & {
  latestRecords: MotorcycleTheftRecord[];
};

export type PublicSafetyInfrastructureLocationPrecision =
  | 'address_only'
  | 'district_centroid'
  | 'unparsed_address'
  | 'missing';

export type PoliceCctvInstallationLocationRecord = {
  id: string;
  safetyLayer: 'police_cctv_installation_location';
  cityCountyCode?: string;
  cityCountyCodeNormalized?: string;
  sourceSequenceNumber?: string;
  policeUnit?: string;
  policeUnitNormalized?: string;
  installationAddress?: string;
  installationAddressNormalized?: string;
  cameraDirection?: string;
  cameraDirectionNormalized?: string;
  district?: string;
  roadName?: string;
  hasInstallationAddress: boolean;
  hasCameraDirection: boolean;
  hasParsedDistrict: boolean;
  hasParsedRoadName: boolean;
  locationPrecision: PublicSafetyInfrastructureLocationPrecision;
  latitude?: number;
  longitude?: number;
  googleMapsQuery?: string;
  sourceRecordHash: string;
  source: string;
  sourceAgency: string;
};

export type PoliceCctvInstallationLocationSummary = {
  totalRecords: number;
  districtCount: number;
  policeUnitCount: number;
  uniqueInstallationAddressCount: number;
  uniqueCameraDirectionCount: number;
  recordsWithInstallationAddress: number;
  recordsWithCameraDirection: number;
  recordsWithParsedDistrict: number;
  recordsWithParsedRoadName: number;
  byDistrict: Array<{
    district: string;
    recordCount: number;
    policeUnitBreakdown: Array<{ policeUnit: string; count: number }>;
  }>;
  byPoliceUnit: Array<{ policeUnit: string; count: number; districtCount: number }>;
  byRoadName: Array<{ roadName: string; count: number }>;
  byCameraDirectionKeyword: Array<{ keyword: string; count: number }>;
  locationParsingQuality: {
    parsedDistrict: number;
    unparsedDistrict: number;
    parsedRoadName: number;
    addressOnly: number;
    missingAddress: number;
  };
};

export type FireDepartmentDonationItemCategory =
  | 'medical_or_rescue_equipment'
  | 'protective_equipment'
  | 'vehicle_or_transport'
  | 'electronics_or_communication'
  | 'food_or_daily_supplies'
  | 'training_or_education_materials'
  | 'cash_equivalent_or_voucher'
  | 'other_goods'
  | 'unknown';

export type FireDepartmentDonationPurposeCategory =
  | 'firefighting'
  | 'emergency_medical_service'
  | 'disaster_prevention'
  | 'public_education'
  | 'staff_support'
  | 'general_fire_department_use'
  | 'other'
  | 'unknown';

export type FireDepartmentDonationInKindRecord = {
  id: string;
  module: 'fire_department_donation_in_kind_records';
  resourceName?: string;
  resourceYearRaw?: string;
  resourceRocYear?: number;
  resourceYear?: number;
  sourceSequenceNumber?: number;
  yearRaw?: string;
  rocYear?: number;
  year?: number;
  monthRaw?: string;
  month?: number;
  dayRaw?: string;
  day?: number;
  donationDate?: string;
  donationMonthKey?: string;
  donationQuarter?: string;
  donorName?: string;
  donorNameNormalized?: string;
  donatedItem?: string;
  donatedItemNormalized?: string;
  donatedItemCategory: FireDepartmentDonationItemCategory;
  donationPurpose?: string;
  donationPurposeNormalized?: string;
  donationPurposeCategory: FireDepartmentDonationPurposeCategory;
  hasMedicalOrRescueKeyword: boolean;
  hasProtectiveEquipmentKeyword: boolean;
  hasVehicleOrTransportKeyword: boolean;
  hasElectronicsOrCommunicationKeyword: boolean;
  hasFoodOrSuppliesKeyword: boolean;
  hasTrainingOrEducationKeyword: boolean;
  possibleReceivingUnit?: string;
  sourceRecordHash: string;
  source: string;
  sourceAgency: string;
};

export type FireDepartmentDonationInKindSummary = {
  totalRecords: number;
  minYear?: number;
  maxYear?: number;
  latestYear?: number;
  minDonationDate?: string;
  maxDonationDate?: string;
  uniqueDonorCount: number;
  uniqueDonatedItemCount: number;
  uniqueDonationPurposeCount: number;
  recordsWithDonationDate: number;
  recordsWithDonorName: number;
  recordsWithDonatedItem: number;
  recordsWithDonationPurpose: number;
  byYear: Array<{ year: number; recordCount: number; uniqueDonorCount: number; uniqueDonatedItemCount: number }>;
  byMonth: Array<{ donationMonthKey: string; recordCount: number }>;
  byDonor: Array<{ donorName: string; recordCount: number; firstYear?: number; latestYear?: number }>;
  byDonatedItemCategory: Array<{ donatedItemCategory: FireDepartmentDonationItemCategory; count: number }>;
  byDonationPurposeCategory: Array<{ donationPurposeCategory: FireDepartmentDonationPurposeCategory; count: number }>;
  topDonatedItems: Array<{ donatedItem: string; count: number }>;
  topDonationPurposes: Array<{ donationPurpose: string; count: number }>;
  resourceBreakdown: Array<{ resourceName: string; recordCount: number }>;
  dataQuality: {
    missingDateCount: number;
    missingDonorNameCount: number;
    missingDonatedItemCount: number;
    missingDonationPurposeCount: number;
    unsupportedResourceCount: number;
  };
};

export type HikingTrailGradeCategory = 'family_friendly' | 'moderate' | 'challenging' | 'unknown';
export type HikingTrailLengthCategory = 'under_500m' | '500m_to_1km' | '1km_to_2km' | '2km_to_3km' | 'over_3km' | 'unknown';
export type HikingTrailWalkingTimeCategory = 'under_15min' | '15_to_30min' | '30_to_60min' | '60_to_90min' | 'over_90min' | 'unknown';
export type MobileSignalConditionCategory = 'available' | 'partial' | 'poor' | 'unavailable' | 'unknown';
export type PortableToiletLocationCategory = 'none' | 'start_point' | 'end_point' | 'start_and_end_point' | 'other' | 'unknown';
export type WheelchairAccessibleSlopeCategory = 'none_or_not_applicable' | 'under_5_percent' | '5_to_8_percent' | 'over_8_percent' | 'unknown';

export type ManagedHikingTrailRecord = {
  id: string;
  module: 'managed_hiking_trails';
  sourceSequenceNumber?: number;
  district?: string;
  districtNormalized?: string;
  trailRouteName?: string;
  trailRouteNameNormalized?: string;
  totalLengthMeters?: number;
  lengthCategory: HikingTrailLengthCategory;
  oneWayWalkingTimeMinutes?: number;
  walkingTimeCategory: HikingTrailWalkingTimeCategory;
  trailGradeRaw?: string;
  trailGrade?: string;
  trailGradeCategory: HikingTrailGradeCategory;
  startPointName?: string;
  startPointNameNormalized?: string;
  startLongitude?: number;
  startLatitude?: number;
  startCoordinateStatus: CoordinateStatus;
  hasValidStartCoordinate: boolean;
  startPointHasStairsRaw?: string;
  startPointHasStairs: boolean | null;
  endPointName?: string;
  endPointNameNormalized?: string;
  endLongitude?: number;
  endLatitude?: number;
  endCoordinateStatus: CoordinateStatus;
  hasValidEndCoordinate: boolean;
  endPointHasStairsRaw?: string;
  endPointHasStairs: boolean | null;
  hasBothValidCoordinates: boolean;
  startEndDistanceMeters?: number;
  approximateConnectorGeoJson?: {
    type: 'LineString';
    coordinates: [[number, number], [number, number]];
    properties: { approximation: true; note: string };
  };
  trailheadHasRoadblockRaw?: string;
  trailheadHasRoadblock: boolean | null;
  wheelchairSuitableRaw?: string;
  wheelchairSuitable: boolean | null;
  wheelchairAccessibleAverageSlopeRaw?: string;
  wheelchairAccessibleAverageSlope?: number;
  wheelchairAccessibleSlopeCategory: WheelchairAccessibleSlopeCategory;
  wheelchairAccessibleLengthMeters?: number;
  mobileSignalConditionRaw?: string;
  mobileSignalCondition?: string;
  mobileSignalConditionCategory: MobileSignalConditionCategory;
  hasPortableToiletRaw?: string;
  hasPortableToilet: boolean | null;
  portableToiletLocationRaw?: string;
  portableToiletLocation?: string;
  portableToiletLocationCategory: PortableToiletLocationCategory;
  hasAccessibleToiletRaw?: string;
  hasAccessibleToilet: boolean | null;
  startPointMapQuery?: string;
  endPointMapQuery?: string;
  sourceRecordHash: string;
  source: string;
  sourceAgency: string;
};

export type ManagedHikingTrailSummary = {
  totalRecords: number;
  totalLengthMeters: number;
  totalLengthKilometers: number;
  minLengthMeters?: number;
  maxLengthMeters?: number;
  averageLengthMeters?: number;
  minWalkingTimeMinutes?: number;
  maxWalkingTimeMinutes?: number;
  averageWalkingTimeMinutes?: number;
  districtCount: number;
  trailGradeCount: number;
  recordsWithValidStartCoordinate: number;
  recordsWithValidEndCoordinate: number;
  recordsWithBothValidCoordinates: number;
  startPointStairCount: number;
  endPointStairCount: number;
  trailheadRoadblockCount: number;
  wheelchairSuitableCount: number;
  portableToiletCount: number;
  accessibleToiletCount: number;
  mobileSignalAvailableCount: number;
  byDistrict: Array<{ district: string; trailCount: number; totalLengthMeters: number; averageLengthMeters?: number; averageWalkingTimeMinutes?: number; wheelchairSuitableCount: number; portableToiletCount: number; accessibleToiletCount: number }>;
  byTrailGrade: Array<{ trailGrade: string; trailGradeCategory: HikingTrailGradeCategory; count: number; totalLengthMeters: number }>;
  byLengthCategory: Array<{ lengthCategory: HikingTrailLengthCategory; count: number }>;
  byWalkingTimeCategory: Array<{ walkingTimeCategory: HikingTrailWalkingTimeCategory; count: number }>;
  byMobileSignalCondition: Array<{ mobileSignalConditionCategory: MobileSignalConditionCategory; count: number }>;
  byPortableToiletLocation: Array<{ portableToiletLocationCategory: PortableToiletLocationCategory; count: number }>;
  longestTrails: Array<{ trailRouteName: string; district?: string; totalLengthMeters?: number; oneWayWalkingTimeMinutes?: number }>;
  shortestTrails: Array<{ trailRouteName: string; district?: string; totalLengthMeters?: number; oneWayWalkingTimeMinutes?: number }>;
  dataQuality: {
    missingTrailRouteNameCount: number;
    missingDistrictCount: number;
    invalidLengthCount: number;
    invalidWalkingTimeCount: number;
    invalidStartCoordinateCount: number;
    invalidEndCoordinateCount: number;
    duplicateTrailRouteNameCount: number;
    duplicateStartPointCount: number;
    duplicateEndPointCount: number;
    duplicateFallbackKeyCount: number;
  };
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

export type NaturalDisasterType =
  | 'typhoon'
  | 'heavy_rain'
  | 'earthquake'
  | 'tsunami_warning'
  | 'cold_wave'
  | 'other'
  | 'unknown';

export type WorkSchoolSuspensionDecisionCategory =
  | 'citywide_full_suspension'
  | 'citywide_partial_day_suspension'
  | 'standard_met'
  | 'standard_not_met'
  | 'normal_work_school'
  | 'normal_with_local_exceptions'
  | 'school_only_suspension'
  | 'local_or_area_suspension'
  | 'mixed_or_unclear'
  | 'unknown';

export type WorkOrSchoolSuspensionStatus =
  | 'suspended'
  | 'normal'
  | 'partial_day_suspended'
  | 'local_exception'
  | 'school_only'
  | 'standard_met'
  | 'standard_not_met'
  | 'mixed_or_unclear'
  | 'unknown';

export type SuspensionMessageKeywordTag =
  | 'citywide'
  | 'school_only'
  | 'local_area'
  | 'mountain_area'
  | 'partial_day'
  | 'normal'
  | 'standard_met'
  | 'standard_not_met'
  | 'work_suspension'
  | 'school_suspension'
  | 'other'
  | 'unknown';

export type NaturalDisasterWorkSchoolSuspensionRecord = {
  id: string;
  module: 'natural_disaster_work_school_suspension_records';
  rocYear?: number;
  year?: number;
  month?: number;
  day?: number;
  date?: string;
  dateDisplay?: string;
  monthKey?: string;
  quarter?: string;
  disasterName?: string;
  disasterNameNormalized?: string;
  disasterType: NaturalDisasterType;
  suspensionMessageRaw?: string;
  decisionCategory: WorkSchoolSuspensionDecisionCategory;
  workSuspensionStatus: WorkOrSchoolSuspensionStatus;
  schoolSuspensionStatus: WorkOrSchoolSuspensionStatus;
  isCitywide: boolean;
  isPartialDay: boolean;
  hasLocalException: boolean;
  hasSchoolOnlyException: boolean;
  hasMountainAreaException: boolean;
  hasNormalWorkSchool: boolean;
  hasSuspension: boolean;
  mentionedDistricts: string[];
  mentionedSchoolsOrAreas: string[];
  messageKeywordTags: SuspensionMessageKeywordTag[];
  eventGroupKey: string;
  source: string;
  sourceAgency: string;
};

export type NaturalDisasterSuspensionEventGroup = {
  eventGroupKey: string;
  disasterName: string;
  disasterNameNormalized: string;
  disasterType: NaturalDisasterType;
  startDate?: string;
  endDate?: string;
  recordCount: number;
  years: number[];
  decisionCategories: Array<{ decisionCategory: WorkSchoolSuspensionDecisionCategory; count: number }>;
  records: NaturalDisasterWorkSchoolSuspensionRecord[];
};

export type NaturalDisasterSuspensionSummary = {
  totalRecords: number;
  uniqueDisasterNameCount: number;
  eventGroupCount: number;
  minDate?: string;
  maxDate?: string;
  minYear?: number;
  maxYear?: number;
  byYear: Array<{
    year: number;
    recordCount: number;
    eventGroupCount: number;
    citywideFullSuspensionCount: number;
    normalWorkSchoolCount: number;
    localExceptionCount: number;
  }>;
  byMonth: Array<{ month: number; recordCount: number }>;
  byDisasterType: Array<{ disasterType: NaturalDisasterType; count: number; eventGroupCount: number }>;
  byDecisionCategory: Array<{ decisionCategory: WorkSchoolSuspensionDecisionCategory; count: number }>;
  byDisasterName: Array<{
    disasterName: string;
    disasterType: NaturalDisasterType;
    count: number;
    firstDate?: string;
    lastDate?: string;
  }>;
  byMentionedDistrict: Array<{ district: string; count: number }>;
  latestRecords: NaturalDisasterWorkSchoolSuspensionRecord[];
  notableMultiDayEvents: Array<{
    disasterName: string;
    disasterType: NaturalDisasterType;
    startDate?: string;
    endDate?: string;
    recordCount: number;
  }>;
};

export type Language = 'zh' | 'en';

export type SafetyDataBundle = {
  shelters: AirRaidShelter[];
  burglaries: ResidentialBurglaryRecord[];
  bicycleThefts: BicycleTheftRecord[];
  bicycleTheftSummary: BicycleTheftSummary;
  motorcycleThefts: MotorcycleTheftRecord[];
  motorcycleTheftSummary: MotorcycleTheftSummary;
  policeCctvInstallationLocations: PoliceCctvInstallationLocationRecord[];
  policeCctvInstallationLocationSummary: PoliceCctvInstallationLocationSummary;
  fireDepartmentDonationInKindRecords: FireDepartmentDonationInKindRecord[];
  fireDepartmentDonationInKindSummary: FireDepartmentDonationInKindSummary;
  managedHikingTrails: ManagedHikingTrailRecord[];
  managedHikingTrailSummary: ManagedHikingTrailSummary;
  aeds: AedLocation[];
  evacuationGates: EvacuationGate[];
  medicalFacilities: MedicalFacility[];
  fireHydrantSummary: FireHydrantSummary;
  emergencyShelters: EmergencyShelter[];
  emergencyShelterSummary: EmergencyShelterSummary;
  trafficCctvFacilities: TrafficCctvFacility[];
  trafficCctvSummary: TrafficCctvSummary;
  naturalDisasterSuspensionRecords: NaturalDisasterWorkSchoolSuspensionRecord[];
  naturalDisasterSuspensionSummary: NaturalDisasterSuspensionSummary;
  naturalDisasterSuspensionEventGroups: NaturalDisasterSuspensionEventGroup[];
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
  naturalDisasterSuspensions?: {
    inputRows: number;
    outputRows: number;
    dateParseWarnings: string[];
    invalidNumberExamples: string[];
    duplicateRows: number;
    duplicateExamples: string[];
    mixedOrUnclearExamples: string[];
  };
  bicycleThefts?: {
    inputRows: number;
    outputRows: number;
    duplicateRows: number;
    dateParseWarnings: string[];
    timeBandParseWarnings: string[];
    locationParseWarnings: string[];
    duplicateExamples: string[];
  };
  motorcycleThefts?: {
    inputRows: number;
    outputRows: number;
    duplicateRows: number;
    dateParseWarnings: string[];
    timeBandParseWarnings: string[];
    locationParseWarnings: string[];
    duplicateExamples: string[];
  };
  policeCctvInstallationLocations?: {
    inputRows: number;
    outputRows: number;
    duplicateRows: number;
    duplicateSequenceNumbers: string[];
    duplicateAddresses: string[];
    duplicatePoliceUnitAddresses: string[];
    addressParseWarnings: string[];
  };
  fireDepartmentDonations?: {
    inputRows: number;
    outputRows: number;
    unsupportedResources: string[];
    invalidYearExamples: string[];
    invalidDateExamples: string[];
    duplicateDonorNames: string[];
    duplicateFallbackKeys: string[];
  };
  managedHikingTrails?: {
    inputRows: number;
    outputRows: number;
    duplicatePrimaryKeys: string[];
    duplicateFallbackKeys: string[];
    duplicateTrailRouteNames: string[];
    duplicateStartPoints: string[];
    duplicateEndPoints: string[];
    duplicateCoordinatePairs: string[];
    invalidCoordinateExamples: string[];
    slopeParseWarnings: string[];
  };
  notes: string[];
};
