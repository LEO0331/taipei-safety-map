import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { loadSafetyData } from './lib/loadSafetyData';
import { loadFireHydrants } from './lib/loadSafetyData';
import {
  TAIPEI_DISTRICT_CENTROIDS,
  TAIPEI_DISTRICTS,
  TIME_PERIODS,
  calculateDistanceMeters,
  buildDengueDistrictSummaries,
  buildShelterMapClusters,
  countBy,
  formatDistance,
  getBurglaryBubbleRadius,
  mostCommonEntry,
} from './lib/safetyData';
import { timePeriodLabels, translations } from './lib/translations';
import type {
  AedLocation,
  AirRaidShelter,
  BurglaryTimePeriod,
  CoordinateStatus,
  DengueDistrictSummary,
  DistrictSafetySummary,
  DisasterApplicabilityStatus,
  EmergencyShelterType,
  EvacuationGate,
  FireHydrant,
  FireHydrantAreaScope,
  FireHydrantType,
  Language,
  MedicalFacility,
  MedicalFacilityType,
  ResidentialBurglaryRecord,
  SafetyDataBundle,
  TrafficCctvFacility,
} from './types';

type Tab = 'map' | 'nearby' | 'burglary' | 'health' | 'overview' | 'notes';
type CapacityRange = 'all' | 'under100' | '100-499' | '500-999' | '1000plus';
type DenseLayer = 'aeds' | 'medical' | 'fireHydrants' | 'airRaidShelters' | 'evacuationGates' | 'cctv';
const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
type MapViewport = {
  bounds: L.LatLngBounds | null;
  zoom: number;
};
type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

const shieldIcon = L.divIcon({
  className: 'shield-marker',
  html: '<span>🛡️</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const aedIcon = L.divIcon({
  className: 'shield-marker aed-marker',
  html: '<span>❤️‍🩹</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const evacuationGateIcon = L.divIcon({
  className: 'shield-marker evacuation-gate-marker',
  html: '<span>🚪</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const hospitalIcon = L.divIcon({
  className: 'shield-marker hospital-marker',
  html: '<span>🏥</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const clinicIcon = L.divIcon({
  className: 'shield-marker clinic-marker',
  html: '<span>⚕️</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const hydrantIcon = L.divIcon({
  className: 'shield-marker hydrant-marker',
  html: '<span>🚰</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
const cctvIcon = L.divIcon({
  className: 'shield-marker cctv-marker',
  html: '<span>📹</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const userIcon = L.divIcon({
  className: 'user-marker',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const taipeiCenter: [number, number] = [25.0478, 121.5319];
const detailedShelterZoom = 15;
const maxDetailedShelterMarkers = 900;
const maxVisibleBurglaryRecords = 100;
const radiusOptions: SelectOption[] = [
  { value: '100', label: '100m' },
  { value: '300', label: '300m' },
  { value: '500', label: '500m' },
  { value: '1000', label: '1km' },
  { value: '2000', label: '2km' },
  { value: '5000', label: '5km' },
];
const hydrantDistrictCentroids: Record<string, { latitude: number; longitude: number }> = {
  ...TAIPEI_DISTRICT_CENTROIDS,
  三重區: { latitude: 25.0615, longitude: 121.4881 },
  中和區: { latitude: 24.9994, longitude: 121.4983 },
  永和區: { latitude: 25.0097, longitude: 121.5148 },
  新店區: { latitude: 24.9676, longitude: 121.5412 },
  汐止區: { latitude: 25.0642, longitude: 121.6587 },
  蘆洲區: { latitude: 25.0855, longitude: 121.4706 },
};
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const capacityOptions: SelectOption<CapacityRange>[] = [
  { value: 'all', label: 'All' },
  { value: 'under100', label: 'Under 100' },
  { value: '100-499', label: '100-499' },
  { value: '500-999', label: '500-999' },
  { value: '1000plus', label: '1,000+' },
];
const disasterStatuses: DisasterApplicabilityStatus[] = ['yes', 'no', 'backup', 'old_settlement', 'unknown'];

function App() {
  const [language, setLanguage] = useState<Language>('zh');
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [data, setData] = useState<SafetyDataBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSafetyData().then(setData).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load data');
    });
  }, []);

  const t = translations[language];

  if (error) {
    return <main className="status-screen">{error}</main>;
  }

  if (!data) {
    return <main className="status-screen">{language === 'zh' ? '載入資料中...' : 'Loading data...'}</main>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Public safety information</p>
          <h1>{t.appTitle}</h1>
          <p>{t.appSubtitle}</p>
        </div>
        <button
          className="language-toggle"
          type="button"
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          aria-label="Toggle language"
        >
          {language === 'zh' ? 'EN' : '中文'}
        </button>
      </header>

      <nav className="tabs" aria-label="Main sections">
        {(
          [
            ['map', t.safetyMap],
            ['nearby', t.nearbyFacilities],
            ['burglary', t.burglaryRecords],
            ['health', t.publicHealth],
            ['overview', t.safetyOverview],
            ['notes', t.dataNotes],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'map' && <SafetyMap data={data} language={language} />}
      {activeTab === 'nearby' && <SafetyMap data={data} language={language} nearbyMode />}
      {activeTab === 'burglary' && <BurglaryRecords data={data} language={language} />}
      {activeTab === 'health' && <PublicHealth data={data} language={language} />}
      {activeTab === 'overview' && <SafetyOverview data={data} language={language} />}
      {activeTab === 'notes' && <DataNotes data={data} language={language} />}

      <footer>{t.footer}</footer>
    </div>
  );
}

function SafetyMap({
  data,
  language,
  nearbyMode = false,
}: {
  data: SafetyDataBundle;
  language: Language;
  nearbyMode?: boolean;
}) {
  const t = translations[language];
  const uiText = localizedUiText[language];
  const [district, setDistrict] = useState('all');
  const [search, setSearch] = useState('');
  const [capacityRange, setCapacityRange] = useState<CapacityRange>('all');
  const [validOnly, setValidOnly] = useState(true);
  const [showShelters, setShowShelters] = useState(false);
  const [showAeds, setShowAeds] = useState(false);
  const [showEvacuationGates, setShowEvacuationGates] = useState(false);
  const [showMedicalFacilities, setShowMedicalFacilities] = useState(false);
  const [showFireHydrants, setShowFireHydrants] = useState(false);
  const [showEmergencyShelters, setShowEmergencyShelters] = useState(false);
  const [showCctvFacilities, setShowCctvFacilities] = useState(false);
  const [showExactHydrants, setShowExactHydrants] = useState(false);
  const [taipeiCityOnlyHydrants, setTaipeiCityOnlyHydrants] = useState(true);
  const [medicalFacilityType, setMedicalFacilityType] = useState<MedicalFacilityType | 'all'>('all');
  const [medicalCategory, setMedicalCategory] = useState('all');
  const [hydrantType, setHydrantType] = useState<FireHydrantType | 'all'>('all');
  const [hydrantCity, setHydrantCity] = useState('all');
  const [hydrantDistrict, setHydrantDistrict] = useState('all');
  const [hydrantVillage, setHydrantVillage] = useState('all');
  const [areaScope, setAreaScope] = useState<FireHydrantAreaScope | 'all'>('all');
  const [emergencyShelterType, setEmergencyShelterType] = useState<EmergencyShelterType | 'all'>('all');
  const [floodStatus, setFloodStatus] = useState<DisasterApplicabilityStatus | 'all'>('all');
  const [earthquakeStatus, setEarthquakeStatus] = useState<DisasterApplicabilityStatus | 'all'>('all');
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [indoorOnly, setIndoorOnly] = useState(false);
  const [outdoorOnly, setOutdoorOnly] = useState(false);
  const [hasEmergencyShelterCapacity, setHasEmergencyShelterCapacity] = useState(false);
  const [servedVillage, setServedVillage] = useState('all');
  const [cctvCity, setCctvCity] = useState('all');
  const [cctvCoordinateStatus, setCctvCoordinateStatus] = useState<CoordinateStatus | 'all'>('valid');
  const [fireHydrants, setFireHydrants] = useState<FireHydrant[] | null>(null);
  const [showBurglaries, setShowBurglaries] = useState(false);
  const [showDengue, setShowDengue] = useState(false);
  const [riversidePark, setRiversidePark] = useState('all');
  const [hasLocationDescription, setHasLocationDescription] = useState(false);
  const [radius, setRadius] = useState(500);
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState<MapViewport>({ bounds: null, zoom: 12 });

  const filteredShelters = useMemo(
    () =>
      data.shelters.filter((shelter) => {
        const haystack = [shelter.name, shelter.placeName, shelter.address, shelter.village]
          .join(' ')
          .toLowerCase();
        const capacity = shelter.capacity ?? 0;
        return (
          (district === 'all' || shelter.district === district) &&
          (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
          (!validOnly || shelter.coordinateStatus === 'valid') &&
          matchesCapacityRange(capacity, capacityRange)
        );
      }),
    [capacityRange, data.shelters, district, search, validOnly],
  );
  const filteredAeds = useMemo(
    () =>
      data.aeds.filter((aed) => {
        const haystack = [
          aed.placeName,
          aed.address,
          aed.aedPlacementLocation,
          aed.aedLocationDescription,
        ]
          .join(' ')
          .toLowerCase();
        return (
          (district === 'all' || aed.district === district) &&
          (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
          (!validOnly || aed.coordinateStatus === 'valid')
        );
      }),
    [data.aeds, district, search, validOnly],
  );
  const riversideParks = useMemo(
    () => [...new Set(data.evacuationGates.flatMap((gate) => (gate.riversidePark ? [gate.riversidePark] : [])))].sort(),
    [data.evacuationGates],
  );
  const filteredEvacuationGates = useMemo(
    () =>
      data.evacuationGates.filter((gate) => {
        const haystack = [gate.gateName, gate.riversidePark, gate.description].join(' ').toLowerCase();
        return (
          (riversidePark === 'all' || gate.riversidePark === riversidePark) &&
          (!hasLocationDescription || Boolean(gate.description)) &&
          (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
          (!validOnly || gate.coordinateStatus === 'valid')
        );
      }),
    [data.evacuationGates, hasLocationDescription, riversidePark, search, validOnly],
  );
  const medicalCategories = useMemo(
    () => [...new Set(data.medicalFacilities.flatMap((item) => (item.medicalCategory ? [item.medicalCategory] : [])))].sort(),
    [data.medicalFacilities],
  );
  const filteredMedicalFacilities = useMemo(
    () =>
      data.medicalFacilities.filter((facility) => {
        const typeLabel = facility.facilityType === 'hospital' ? t.hospital : t.clinic;
        const haystack = [
          facility.facilityName,
          facility.address,
          facility.district,
          facility.medicalCategory,
          typeLabel,
        ]
          .join(' ')
          .toLowerCase();
        return (
          (district === 'all' || facility.district === district) &&
          (medicalFacilityType === 'all' || facility.facilityType === medicalFacilityType) &&
          (medicalCategory === 'all' || facility.medicalCategory === medicalCategory) &&
          (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
          (!validOnly || facility.coordinateStatus === 'valid')
        );
      }),
    [data.medicalFacilities, district, medicalCategory, medicalFacilityType, search, t.clinic, t.hospital, validOnly],
  );
  const filteredFireHydrants = useMemo(() => {
    const records = fireHydrants ?? [];
    const query = search.trim().toLowerCase();
    return records.filter((hydrant) => {
      const haystack = [
        hydrant.wpid,
        hydrant.mapSheetNumber,
        hydrant.hydrantNumber,
        hydrant.city,
        hydrant.district,
        hydrant.village,
        hydrant.areaRaw,
        hydrant.hydrantTypeRaw,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!taipeiCityOnlyHydrants || hydrant.isTaipeiCity) &&
        (hydrantCity === 'all' || hydrant.city === hydrantCity) &&
        (hydrantDistrict === 'all' || hydrant.district === hydrantDistrict) &&
        (hydrantVillage === 'all' || hydrant.village === hydrantVillage) &&
        (hydrantType === 'all' || hydrant.hydrantType === hydrantType) &&
        (areaScope === 'all' || hydrant.areaScope === areaScope) &&
        (!query || haystack.includes(query)) &&
        (!validOnly || hydrant.coordinateStatus === 'valid')
      );
    });
  }, [
    areaScope,
    fireHydrants,
    hydrantCity,
    hydrantDistrict,
    hydrantType,
    hydrantVillage,
    search,
    taipeiCityOnlyHydrants,
    validOnly,
  ]);
  const emergencyShelterTypes = useMemo(
    () => [...new Set(data.emergencyShelters.map((item) => item.shelterType))].sort(),
    [data.emergencyShelters],
  );
  const servedVillages = useMemo(
    () => [...new Set(data.emergencyShelters.flatMap((item) => item.servedVillages))].sort(),
    [data.emergencyShelters],
  );
  const filteredEmergencyShelters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.emergencyShelters.filter((shelter) => {
      const haystack = [
        shelter.shelterId,
        shelter.shelterName,
        shelter.district,
        shelter.village,
        shelter.address,
        shelter.shelterTypeRaw,
        shelter.servedVillages.join(' '),
        shelter.notes,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (district === 'all' || shelter.district === district) &&
        (emergencyShelterType === 'all' || shelter.shelterType === emergencyShelterType) &&
        (floodStatus === 'all' || shelter.floodStatus === floodStatus) &&
        (earthquakeStatus === 'all' || shelter.earthquakeStatus === earthquakeStatus) &&
        (!accessibleOnly || shelter.hasAccessibleFacilities) &&
        (!indoorOnly || shelter.hasIndoorSpace) &&
        (!outdoorOnly || shelter.hasOutdoorSpace) &&
        (!hasEmergencyShelterCapacity || shelter.capacityPeople !== undefined) &&
        (servedVillage === 'all' || shelter.servedVillages.includes(servedVillage)) &&
        (!query || haystack.includes(query)) &&
        (!hasEmergencyShelterCapacity || matchesCapacityRange(shelter.capacityPeople ?? 0, capacityRange))
      );
    });
  }, [
    accessibleOnly,
    capacityRange,
    data.emergencyShelters,
    district,
    earthquakeStatus,
    emergencyShelterType,
    floodStatus,
    hasEmergencyShelterCapacity,
    indoorOnly,
    outdoorOnly,
    search,
    servedVillage,
  ]);
  const cctvCities = useMemo(
    () => [...new Set(data.trafficCctvFacilities.flatMap((item) => (item.city ? [item.city] : [])))].sort(),
    [data.trafficCctvFacilities],
  );
  const filteredCctvFacilities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.trafficCctvFacilities.filter((facility) => {
      const haystack = [
        facility.sourceSequenceNumber,
        facility.city,
        facility.cameraLocationCodeRaw,
        facility.cameraLocationCode,
        facility.locationDescription,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (cctvCity === 'all' || facility.city === cctvCity) &&
        (cctvCoordinateStatus === 'all' || facility.coordinateStatus === cctvCoordinateStatus) &&
        (!query || haystack.includes(query))
      );
    });
  }, [cctvCity, cctvCoordinateStatus, data.trafficCctvFacilities, search]);
  const hydrantCities = useMemo(
    () => [...new Set((fireHydrants ?? []).flatMap((item) => (item.city ? [item.city] : [])))].sort(),
    [fireHydrants],
  );
  const hydrantDistricts = useMemo(
    () =>
      [...new Set((fireHydrants ?? []).flatMap((item) => (item.city === hydrantCity || hydrantCity === 'all') && item.district ? [item.district] : []))].sort(),
    [fireHydrants, hydrantCity],
  );
  const hydrantVillages = useMemo(
    () =>
      [
        ...new Set(
          (fireHydrants ?? []).flatMap((item) =>
            (hydrantDistrict === 'all' || item.district === hydrantDistrict) && item.village ? [item.village] : [],
          ),
        ),
      ].sort(),
    [fireHydrants, hydrantDistrict],
  );

  const nearbyShelters = useMemo(() => {
    if (!userPosition) return [];
    return filteredShelters
      .filter(hasValidCoordinate)
      .map((shelter) => ({
        shelter,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          shelter.latitude,
          shelter.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredShelters, radius, userPosition]);
  const nearbyAeds = useMemo(() => {
    if (!userPosition) return [];
    return filteredAeds
      .filter(hasValidPoint)
      .map((aed) => ({
        aed,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          aed.latitude,
          aed.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredAeds, radius, userPosition]);
  const nearbyEvacuationGates = useMemo(() => {
    if (!userPosition) return [];
    return filteredEvacuationGates
      .filter(hasValidPoint)
      .map((gate) => ({
        gate,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          gate.latitude,
          gate.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredEvacuationGates, radius, userPosition]);
  const nearbyMedicalFacilities = useMemo(() => {
    if (!userPosition) return [];
    return filteredMedicalFacilities
      .filter(hasValidPoint)
      .map((facility) => ({
        facility,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          facility.latitude,
          facility.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredMedicalFacilities, radius, userPosition]);
  const nearbyFireHydrants = useMemo(() => {
    if (!userPosition) return [];
    return filteredFireHydrants
      .filter(hasValidPoint)
      .map((hydrant) => ({
        hydrant,
        distance: calculateDistanceMeters(
          userPosition.latitude,
          userPosition.longitude,
          hydrant.latitude,
          hydrant.longitude,
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredFireHydrants, radius, userPosition]);

  const visibleShelters = useMemo(
    () => filteredShelters.filter(hasValidCoordinate).filter((shelter) => isInViewport(shelter, viewport.bounds)),
    [filteredShelters, viewport.bounds],
  );
  const shouldRenderDetailedShelters =
    viewport.zoom >= detailedShelterZoom || visibleShelters.length <= maxDetailedShelterMarkers;
  const shelterClusters = useMemo(
    () => buildShelterMapClusters(visibleShelters, viewport.zoom),
    [visibleShelters, viewport.zoom],
  );
  const visibleAeds = useMemo(
    () => filteredAeds.filter(hasValidPoint).filter((aed) => isInViewport(aed, viewport.bounds)),
    [filteredAeds, viewport.bounds],
  );
  const shouldRenderDetailedAeds =
    viewport.zoom >= detailedShelterZoom || visibleAeds.length <= maxDetailedShelterMarkers;
  const aedClusters = useMemo(() => buildShelterMapClusters(visibleAeds, viewport.zoom), [visibleAeds, viewport.zoom]);
  const visibleEvacuationGates = useMemo(
    () => filteredEvacuationGates.filter(hasValidPoint).filter((gate) => isInViewport(gate, viewport.bounds)),
    [filteredEvacuationGates, viewport.bounds],
  );
  const evacuationGateClusters = useMemo(
    () => buildShelterMapClusters(visibleEvacuationGates, viewport.zoom),
    [visibleEvacuationGates, viewport.zoom],
  );
  const visibleMedicalFacilities = useMemo(
    () => filteredMedicalFacilities.filter(hasValidPoint).filter((item) => isInViewport(item, viewport.bounds)),
    [filteredMedicalFacilities, viewport.bounds],
  );
  const medicalFacilityClusters = useMemo(
    () => buildShelterMapClusters(visibleMedicalFacilities, viewport.zoom),
    [visibleMedicalFacilities, viewport.zoom],
  );
  const visibleFireHydrants = useMemo(
    () => filteredFireHydrants.filter(hasValidPoint).filter((item) => isInViewport(item, viewport.bounds)),
    [filteredFireHydrants, viewport.bounds],
  );
  const fireHydrantClusters = useMemo(
    () => buildShelterMapClusters(visibleFireHydrants, viewport.zoom),
    [visibleFireHydrants, viewport.zoom],
  );
  const visibleCctvFacilities = useMemo(
    () => filteredCctvFacilities.filter(hasValidPoint).filter((item) => isInViewport(item, viewport.bounds)),
    [filteredCctvFacilities, viewport.bounds],
  );
  const cctvClusters = useMemo(
    () => buildShelterMapClusters(visibleCctvFacilities, viewport.zoom),
    [visibleCctvFacilities, viewport.zoom],
  );
  const hydrantDistrictSummaries = useMemo(
    () =>
      data.fireHydrantSummary.byDistrict
        .filter((item) => (!taipeiCityOnlyHydrants || item.city === '臺北市'))
        .filter((item) => hydrantCity === 'all' || item.city === hydrantCity)
        .filter((item) => hydrantDistrict === 'all' || item.district === hydrantDistrict)
        .flatMap((item) => {
          const centroid = hydrantDistrictCentroids[item.district];
          return centroid ? [{ ...item, ...centroid }] : [];
        }),
    [data.fireHydrantSummary.byDistrict, hydrantCity, hydrantDistrict, taipeiCityOnlyHydrants],
  );
  const emergencyShelterDistrictSummaries = useMemo(
    () =>
      TAIPEI_DISTRICTS.flatMap((name) => {
        const records = filteredEmergencyShelters.filter((item) => item.district === name);
        const centroid = TAIPEI_DISTRICT_CENTROIDS[name];
        if (!records.length || !centroid) return [];
        const topType = mostCommonEntry(countBy(records, (item) => formatEmergencyShelterType(item.shelterType, language)));
        return [{
          district: name,
          ...centroid,
          count: records.length,
          capacity: records.reduce((sum, item) => sum + (item.capacityPeople ?? 0), 0),
          accessible: records.filter((item) => item.hasAccessibleFacilities).length,
          indoor: records.filter((item) => item.hasIndoorSpace).length,
          outdoor: records.filter((item) => item.hasOutdoorSpace).length,
          topType: topType?.[0] ?? '-',
        }];
      }),
    [filteredEmergencyShelters, language],
  );

  async function ensureFireHydrants() {
    if (!fireHydrants) setFireHydrants(await loadFireHydrants());
  }

  function showOnlyDenseLayer(layer: DenseLayer) {
    setShowAeds(layer === 'aeds');
    setShowMedicalFacilities(layer === 'medical');
    setShowFireHydrants(layer === 'fireHydrants');
    setShowShelters(layer === 'airRaidShelters');
    setShowEvacuationGates(layer === 'evacuationGates');
    setShowCctvFacilities(layer === 'cctv');
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setGeoMessage(uiText.geolocationUnsupported);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoMessage(null);
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setGeoMessage(uiText.geolocationDenied),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <main className="workspace">
      <section className="filter-panel">
        <label className="checkbox-row">
          <input type="checkbox" checked={showAeds} onChange={(event) => (event.target.checked ? showOnlyDenseLayer('aeds') : setShowAeds(false))} />
          {t.aedLocations}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showMedicalFacilities}
            onChange={(event) => (event.target.checked ? showOnlyDenseLayer('medical') : setShowMedicalFacilities(false))}
          />
          {t.medicalFacilities}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showFireHydrants}
            onChange={(event) => {
              if (event.target.checked) showOnlyDenseLayer('fireHydrants');
              else setShowFireHydrants(false);
              if (event.target.checked && showExactHydrants) void ensureFireHydrants();
            }}
          />
          {t.fireHydrants}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showShelters}
            onChange={(event) => (event.target.checked ? showOnlyDenseLayer('airRaidShelters') : setShowShelters(false))}
          />
          {t.airRaidShelters}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showEmergencyShelters}
            onChange={(event) => setShowEmergencyShelters(event.target.checked)}
          />
          {t.emergencyShelters}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showEvacuationGates}
            onChange={(event) => (event.target.checked ? showOnlyDenseLayer('evacuationGates') : setShowEvacuationGates(false))}
          />
          {t.evacuationGates}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showCctvFacilities}
            onChange={(event) => (event.target.checked ? showOnlyDenseLayer('cctv') : setShowCctvFacilities(false))}
          />
          {t.cctvFacilities}
        </label>
        {!nearbyMode && (
          <>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showBurglaries}
                onChange={(event) => setShowBurglaries(event.target.checked)}
              />
              {t.burglaryRecords}
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={showDengue} onChange={(event) => setShowDengue(event.target.checked)} />
              {t.dengueVectorDensity}
            </label>
          </>
        )}
        <label>
          {t.district}
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="all">{t.all}</option>
            {TAIPEI_DISTRICTS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {t.search}
          <input
            value={search}
            placeholder={
              showCctvFacilities
                ? t.cctvSearchPlaceholder
                : showEmergencyShelters
                  ? t.emergencyShelterSearchPlaceholder
                  : showFireHydrants
                    ? t.fireHydrantSearchPlaceholder
                    : t.searchPlaceholder
            }
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          {t.cctvFacilities}
          <select value={cctvCity} onChange={(event) => setCctvCity(event.target.value)}>
            <option value="all">{t.all}</option>
            {cctvCities.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label>
          {t.coordinateStatus}
          <select value={cctvCoordinateStatus} onChange={(event) => setCctvCoordinateStatus(event.target.value as CoordinateStatus | 'all')}>
            <option value="all">{t.all}</option>
            <option value="valid">{t.hasValidCoordinates}</option>
            <option value="missing">{t.missingCoordinates}</option>
            <option value="unparsed">{t.unparsedCoordinates}</option>
            <option value="outlier">{t.outlierCoordinates}</option>
          </select>
        </label>
        <label>
          {t.shelterType}
          <select value={emergencyShelterType} onChange={(event) => setEmergencyShelterType(event.target.value as EmergencyShelterType | 'all')}>
            <option value="all">{t.all}</option>
            {emergencyShelterTypes.map((type) => (
              <option key={type} value={type}>{formatEmergencyShelterType(type, language)}</option>
            ))}
          </select>
        </label>
        <label>
          {t.floodApplicable}
          <select value={floodStatus} onChange={(event) => setFloodStatus(event.target.value as DisasterApplicabilityStatus | 'all')}>
            <option value="all">{t.all}</option>
            {disasterStatuses.map((status) => (
              <option key={status} value={status}>{formatDisasterStatus(status, language)}</option>
            ))}
          </select>
        </label>
        <label>
          {t.earthquakeApplicable}
          <select value={earthquakeStatus} onChange={(event) => setEarthquakeStatus(event.target.value as DisasterApplicabilityStatus | 'all')}>
            <option value="all">{t.all}</option>
            {disasterStatuses.map((status) => (
              <option key={status} value={status}>{formatDisasterStatus(status, language)}</option>
            ))}
          </select>
        </label>
        <label>
          {t.servedVillages}
          <select value={servedVillage} onChange={(event) => setServedVillage(event.target.value)}>
            <option value="all">{t.all}</option>
            {servedVillages.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={accessibleOnly} onChange={(event) => setAccessibleOnly(event.target.checked)} />
          {t.accessibleFacilities}
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={indoorOnly} onChange={(event) => setIndoorOnly(event.target.checked)} />
          {t.indoor}
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={outdoorOnly} onChange={(event) => setOutdoorOnly(event.target.checked)} />
          {t.outdoor}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={hasEmergencyShelterCapacity}
            onChange={(event) => setHasEmergencyShelterCapacity(event.target.checked)}
          />
          {t.hasCapacity}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={taipeiCityOnlyHydrants}
            onChange={(event) => setTaipeiCityOnlyHydrants(event.target.checked)}
          />
          {t.taipeiCityOnly}
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showExactHydrants}
            onChange={(event) => {
              setShowExactHydrants(event.target.checked);
              if (event.target.checked) void ensureFireHydrants();
            }}
          />
          {t.showExactFireHydrantPoints}
        </label>
        <label>
          {t.hydrantType}
          <select value={hydrantType} onChange={(event) => setHydrantType(event.target.value as FireHydrantType | 'all')}>
            <option value="all">{t.all}</option>
            <option value="underground">{t.undergroundHydrant}</option>
            <option value="above_ground">{t.aboveGroundHydrant}</option>
          </select>
        </label>
        <label>
          {t.city}
          <select value={hydrantCity} onChange={(event) => setHydrantCity(event.target.value)}>
            <option value="all">{t.all}</option>
            {(hydrantCities.length ? hydrantCities : data.fireHydrantSummary.byCity.map((item) => item.city)).map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label>
          {t.district}
          <select value={hydrantDistrict} onChange={(event) => setHydrantDistrict(event.target.value)}>
            <option value="all">{t.all}</option>
            {(hydrantDistricts.length ? hydrantDistricts : data.fireHydrantSummary.byDistrict.map((item) => item.district)).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {t.village}
          <select value={hydrantVillage} onChange={(event) => setHydrantVillage(event.target.value)}>
            <option value="all">{t.all}</option>
            {hydrantVillages.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {t.areaScope}
          <select value={areaScope} onChange={(event) => setAreaScope(event.target.value as FireHydrantAreaScope | 'all')}>
            <option value="all">{t.all}</option>
            <option value="taipei_city">{t.taipeiCityScope}</option>
            <option value="new_taipei_official_scope">{t.newTaipeiOfficialScope}</option>
            <option value="new_taipei_other">{t.newTaipeiOtherScope}</option>
          </select>
        </label>
        <label>
          {t.medicalFacilityType}
          <select
            value={medicalFacilityType}
            onChange={(event) => setMedicalFacilityType(event.target.value as MedicalFacilityType | 'all')}
          >
            <option value="all">{t.all}</option>
            <option value="hospital">{t.hospitals}</option>
            <option value="clinic">{t.clinics}</option>
          </select>
        </label>
        <label>
          {t.classification}
          <select value={medicalCategory} onChange={(event) => setMedicalCategory(event.target.value)}>
            <option value="all">{t.all}</option>
            {medicalCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          {t.riversidePark}
          <select value={riversidePark} onChange={(event) => setRiversidePark(event.target.value)}>
            <option value="all">{t.all}</option>
            {riversideParks.map((park) => (
              <option key={park}>{park}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={hasLocationDescription}
            onChange={(event) => setHasLocationDescription(event.target.checked)}
          />
          {t.hasLocationDescription}
        </label>
        <label>
          {t.capacityRange}
          <select value={capacityRange} onChange={(event) => setCapacityRange(event.target.value as CapacityRange)}>
            {capacityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === 'all' ? t.all : option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={validOnly} onChange={(event) => setValidOnly(event.target.checked)} />
          {t.validCoordinateOnly}
        </label>
      </section>

      <section className="map-stage">
        <MapContainer center={taipeiCenter} zoom={12} scrollWheelZoom className="map-canvas">
          <MapSizeSync />
          <ViewportTracker onChange={setViewport} />
          <TileLayer
            attribution={tileAttribution}
            url={tileUrl}
          />
          {showShelters && (shouldRenderDetailedShelters
            ? visibleShelters.map((shelter) => (
                <Marker key={shelter.id} position={[shelter.latitude, shelter.longitude]} icon={shieldIcon}>
                  <Popup>
                    <ShelterPopup shelter={shelter} language={language} />
                  </Popup>
                </Marker>
              ))
            : shelterClusters.map((cluster) => (
                <CircleMarker
                  key={cluster.id}
                  center={[cluster.latitude, cluster.longitude]}
                  radius={Math.min(28, 7 + Math.sqrt(cluster.count) * 2.4)}
                  pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.34, weight: 2 }}
                >
                  <Popup>
                    <div className="popup-stack">
                      <strong>{t.airRaidShelters}</strong>
                      <span>
                        {t.recordCount}: {cluster.count.toLocaleString()}
                      </span>
                      <span>
                        {t.capacity}: {cluster.capacity.toLocaleString()}
                      </span>
                    </div>
                  </Popup>
                </CircleMarker>
              )))}
          {showAeds &&
            (shouldRenderDetailedAeds
              ? visibleAeds.map((aed) => (
                  <Marker key={aed.id} position={[aed.latitude, aed.longitude]} icon={aedIcon}>
                    <Popup>
                      <AedPopup aed={aed} language={language} />
                    </Popup>
                  </Marker>
                ))
              : aedClusters.map((cluster) => (
                  <CircleMarker
                    key={`aed-${cluster.id}`}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(25, 7 + Math.sqrt(cluster.count) * 2)}
                    pathOptions={{ color: '#be123c', fillColor: '#fb7185', fillOpacity: 0.34, weight: 2 }}
                  >
                    <Popup>
                      <strong>
                        {t.aedLocations}: {cluster.count.toLocaleString()}
                      </strong>
                    </Popup>
                  </CircleMarker>
                )))}
          {showEvacuationGates &&
            (viewport.zoom >= detailedShelterZoom
              ? visibleEvacuationGates.map((gate) => (
                  <Marker key={gate.id} position={[gate.latitude, gate.longitude]} icon={evacuationGateIcon}>
                    <Popup>
                      <EvacuationGatePopup gate={gate} language={language} />
                    </Popup>
                  </Marker>
                ))
              : evacuationGateClusters.map((cluster) => (
                  <CircleMarker
                    key={`evacuation-gate-${cluster.id}`}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(22, 7 + Math.sqrt(cluster.count) * 2)}
                    pathOptions={{ color: '#1d4ed8', fillColor: '#60a5fa', fillOpacity: 0.34, weight: 2 }}
                  >
                    <Popup>
                      <strong>
                        {t.evacuationGates}: {cluster.count.toLocaleString()}
                      </strong>
                    </Popup>
                  </CircleMarker>
                )))}
          {showMedicalFacilities &&
            (viewport.zoom >= detailedShelterZoom
              ? visibleMedicalFacilities.map((facility) => (
                  <Marker
                    key={facility.id}
                    position={[facility.latitude, facility.longitude]}
                    icon={facility.facilityType === 'hospital' ? hospitalIcon : clinicIcon}
                  >
                    <Popup>
                      <MedicalFacilityPopup facility={facility} language={language} />
                    </Popup>
                  </Marker>
                ))
              : medicalFacilityClusters.map((cluster) => (
                  <CircleMarker
                    key={`medical-${cluster.id}`}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(25, 7 + Math.sqrt(cluster.count) * 2)}
                    pathOptions={{ color: '#7c3aed', fillColor: '#a78bfa', fillOpacity: 0.34, weight: 2 }}
                  >
                    <Popup>
                      <strong>
                        {t.medicalFacilities}: {cluster.count.toLocaleString()}
                      </strong>
                    </Popup>
                  </CircleMarker>
                )))}
          {showFireHydrants &&
            (!showExactHydrants
              ? hydrantDistrictSummaries.map((summary) => (
                  <CircleMarker
                    key={`hydrant-district-${summary.city}-${summary.district}`}
                    center={[summary.latitude, summary.longitude]}
                    radius={Math.min(26, 6 + Math.sqrt(summary.count) / 2)}
                    pathOptions={{ color: '#dc2626', fillColor: '#f87171', fillOpacity: 0.26, weight: 2 }}
                  >
                    <Popup>
                      <div className="popup-stack">
                        <strong>{summary.district}</strong>
                        <span>{t.city}: {summary.city}</span>
                        <span>{t.fireHydrants}: {summary.count.toLocaleString()}</span>
                        <span>{t.undergroundHydrant}: {summary.undergroundHydrantCount.toLocaleString()}</span>
                        <span>{t.aboveGroundHydrant}: {summary.aboveGroundHydrantCount.toLocaleString()}</span>
                        <small>{t.fireHydrantNotice}</small>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))
              : viewport.zoom >= detailedShelterZoom
                ? visibleFireHydrants.map((hydrant) => (
                    <Marker key={hydrant.id} position={[hydrant.latitude, hydrant.longitude]} icon={hydrantIcon}>
                      <Popup>
                        <FireHydrantPopup hydrant={hydrant} language={language} />
                      </Popup>
                    </Marker>
                  ))
                : fireHydrantClusters.map((cluster) => (
                    <CircleMarker
                      key={`hydrant-${cluster.id}`}
                      center={[cluster.latitude, cluster.longitude]}
                      radius={Math.min(24, 7 + Math.sqrt(cluster.count) * 1.8)}
                      pathOptions={{ color: '#dc2626', fillColor: '#f87171', fillOpacity: 0.32, weight: 2 }}
                    >
                      <Popup>
                        <strong>
                          {t.fireHydrants}: {cluster.count.toLocaleString()}
                        </strong>
                      </Popup>
                    </CircleMarker>
                  )))}
          {showEmergencyShelters &&
            emergencyShelterDistrictSummaries.map((summary) => (
              <CircleMarker
                key={`emergency-shelter-${summary.district}`}
                center={[summary.latitude, summary.longitude]}
                radius={Math.min(26, 7 + Math.sqrt(summary.count) * 1.4)}
                pathOptions={{ color: '#9333ea', fillColor: '#c084fc', fillOpacity: 0.28, weight: 2 }}
              >
                <Popup>
                  <div className="popup-stack">
                    <strong>{t.emergencyShelters}</strong>
                    <span>{t.district}: {summary.district}</span>
                    <span>{t.emergencyShelterCount}: {summary.count.toLocaleString()}</span>
                    <span>{t.totalListedCapacity}: {summary.capacity.toLocaleString()}</span>
                    <span>{t.accessibleFacilities}: {summary.accessible.toLocaleString()}</span>
                    <span>{t.indoor}: {summary.indoor.toLocaleString()}</span>
                    <span>{t.outdoor}: {summary.outdoor.toLocaleString()}</span>
                    <span>{t.topShelterType}: {summary.topType}</span>
                    <small>{t.emergencyShelterNoCoordinateNotice}</small>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          {showCctvFacilities &&
            (viewport.zoom >= detailedShelterZoom || visibleCctvFacilities.length <= maxDetailedShelterMarkers
              ? visibleCctvFacilities.map((facility) => (
                  <Marker key={facility.id} position={[facility.latitude, facility.longitude]} icon={cctvIcon}>
                    <Popup>
                      <TrafficCctvPopup facility={facility} language={language} />
                    </Popup>
                  </Marker>
                ))
              : cctvClusters.map((cluster) => (
                  <CircleMarker
                    key={`cctv-${cluster.id}`}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(24, 7 + Math.sqrt(cluster.count) * 1.8)}
                    pathOptions={{ color: '#374151', fillColor: '#9ca3af', fillOpacity: 0.34, weight: 2 }}
                  >
                    <Popup>
                      <strong>
                        {t.cctvFacilities}: {cluster.count.toLocaleString()}
                      </strong>
                    </Popup>
                  </CircleMarker>
                )))}
          {!nearbyMode && showBurglaries && data.districtSummaries.map((summary) => {
            if (!summary.burglaryRecordCount) return null;
            return (
              <CircleMarker
                key={`burglary-${summary.district}`}
                center={[summary.latitude, summary.longitude]}
                radius={getBurglaryBubbleRadius(summary.burglaryRecordCount)}
                pathOptions={{ color: '#b45309', fillColor: '#f59e0b', fillOpacity: 0.28, weight: 2 }}
              >
                <Popup>
                  <DistrictPopup
                    summary={summary}
                    count={summary.burglaryRecordCount}
                    records={data.burglaries}
                    language={language}
                  />
                </Popup>
              </CircleMarker>
            );
          })}
          {!nearbyMode &&
            showDengue &&
            data.dengueDistrictSummaries.map((summary) =>
              summary.recordCount ? (
                <CircleMarker
                  key={`dengue-${summary.district}`}
                  center={[summary.latitude, summary.longitude]}
                  radius={Math.min(22, 6 + Math.sqrt(summary.recordCount))}
                  pathOptions={{ color: '#047857', fillColor: '#34d399', fillOpacity: 0.22, weight: 2 }}
                >
                  <Popup>
                    <DenguePopup summary={summary} language={language} />
                  </Popup>
                </CircleMarker>
              ) : null,
            )}
          {userPosition && (
            <Marker position={[userPosition.latitude, userPosition.longitude]} icon={userIcon}>
              <Popup>{uiText.currentLocation}</Popup>
            </Marker>
          )}
          {userPosition && <FlyTo position={[userPosition.latitude, userPosition.longitude]} />}
        </MapContainer>
      </section>

      <aside className="side-panel">
        <button
          type="button"
          className="primary-action"
          onClick={() => {
            showOnlyDenseLayer('aeds');
            requestLocation();
          }}
        >
          {t.showNearbyAeds}
        </button>
        <button
          type="button"
          onClick={() => {
            showOnlyDenseLayer('airRaidShelters');
            requestLocation();
          }}
        >
          {t.showNearbyShelters}
        </button>
        <button
          type="button"
          onClick={() => {
            showOnlyDenseLayer('evacuationGates');
            requestLocation();
          }}
        >
          {t.showNearbyEvacuationGates}
        </button>
        <button
          type="button"
          onClick={() => {
            setMedicalFacilityType('hospital');
            showOnlyDenseLayer('medical');
            requestLocation();
          }}
        >
          {t.showNearbyHospitals}
        </button>
        <button
          type="button"
          onClick={() => {
            setMedicalFacilityType('clinic');
            showOnlyDenseLayer('medical');
            requestLocation();
          }}
        >
          {t.showNearbyClinics}
        </button>
        <button
          type="button"
          onClick={() => {
            setMedicalFacilityType('all');
            showOnlyDenseLayer('medical');
            requestLocation();
          }}
        >
          {t.showNearbyMedicalFacilities}
        </button>
        <button
          type="button"
          onClick={() => {
            showOnlyDenseLayer('fireHydrants');
            setShowExactHydrants(true);
            void ensureFireHydrants();
            requestLocation();
          }}
        >
          {t.showNearbyFireHydrants}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowEmergencyShelters(true);
            setGeoMessage(t.emergencyShelterDistanceUnavailableNotice);
          }}
        >
          {t.viewEmergencySheltersByNearbyDistrict}
        </button>
        <label>
          {t.nearbyRadius}
          <select value={radius} onChange={(event) => setRadius(Number(event.target.value))}>
            {radiusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {geoMessage && <p className="notice">{geoMessage}</p>}
        <p className="notice">{t.aedEmergencyNotice}</p>
        <p className="notice">{t.emergencyShelterNoCoordinateNotice}</p>
        <h2>{t.emergencyShelterDirectory}</h2>
        <ol className="nearby-list">
          {filteredEmergencyShelters.slice(0, 50).map((shelter) => (
            <li key={shelter.id}>
              <strong>{shelter.shelterName}</strong>
              <span>{shelter.shelterId} · {shelter.district ?? '-'} · {formatEmergencyShelterType(shelter.shelterType, language)}</span>
              <small>{shelter.address ?? '-'}</small>
              <small>{t.capacityPeople}: {shelter.capacityPeople?.toLocaleString() ?? '-'}</small>
              <small>
                {t.flood}: {formatDisasterStatus(shelter.floodStatus, language)} · {t.earthquake}: {formatDisasterStatus(shelter.earthquakeStatus, language)}
              </small>
              {shelter.servedVillages.length > 0 && <small>{t.servedVillages}: {shelter.servedVillages.slice(0, 8).join('、')}</small>}
              {shelter.address && (
                <a href={googleMapsAddressUrl(shelter.address)} target="_blank" rel="noreferrer">
                  {t.openGoogleMaps}
                </a>
              )}
            </li>
          ))}
        </ol>
        <p className="notice">{t.cctvFacilityNotice}</p>
        <h2>{t.trafficCctvFacilities}</h2>
        <ol className="nearby-list">
          {filteredCctvFacilities.slice(0, 50).map((facility) => (
            <li key={facility.id}>
              <strong>{facility.cameraLocationCodeRaw ?? facility.locationDescription ?? t.cctvFacility}</strong>
              <span>{t.sourceSequenceNumber}: {facility.sourceSequenceNumber ?? '-'}</span>
              <small>{t.city}: {facility.city ?? '-'}</small>
              <small>{t.coordinateStatus}: {formatCoordinateStatus(facility.coordinateStatus, language)}</small>
              {facility.coordinateStatus === 'valid' && facility.latitude !== undefined && facility.longitude !== undefined && (
                <a href={googleMapsUrl(facility.latitude, facility.longitude)} target="_blank" rel="noreferrer">
                  {t.openGoogleMaps}
                </a>
              )}
            </li>
          ))}
        </ol>
        <h2>{t.nearbyAeds}</h2>
        <ol className="nearby-list">
          {nearbyAeds.slice(0, 20).map(({ aed, distance }) => (
            <li key={aed.id}>
              <strong>{aed.placeName}</strong>
              <span>{formatDistance(distance, language)}</span>
              <small>{aed.aedPlacementLocation ?? aed.address}</small>
              <a href={googleMapsUrl(aed.latitude, aed.longitude)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
        <p className="notice">{t.fireHydrantNotice}</p>
        <h2>{t.nearbyFireHydrants}</h2>
        <ol className="nearby-list">
          {nearbyFireHydrants.slice(0, 20).map(({ hydrant, distance }) => (
            <li key={hydrant.id}>
              <strong>{hydrant.wpid ?? hydrant.hydrantNumber ?? t.fireHydrant}</strong>
              <span>{formatDistance(distance, language)}</span>
              <small>{hydrant.hydrantType === 'underground' ? t.undergroundHydrant : t.aboveGroundHydrant}</small>
              <small>{[hydrant.city, hydrant.district, hydrant.village].filter(Boolean).join(' ')}</small>
              <a href={googleMapsUrl(hydrant.latitude, hydrant.longitude)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
        <p className="notice">{t.medicalFacilityNotice}</p>
        <h2>{t.nearbyMedicalFacilities}</h2>
        <ol className="nearby-list">
          {nearbyMedicalFacilities.slice(0, 20).map(({ facility, distance }) => (
            <li key={facility.id}>
              <strong>{facility.facilityName}</strong>
              <span>{facility.facilityType === 'hospital' ? t.hospital : t.clinic} · {formatDistance(distance, language)}</span>
              {facility.district && <small>{facility.district}</small>}
              <small>{facility.address}</small>
              {facility.medicalCategory && <small>{t.classification}: {facility.medicalCategory}</small>}
              <a href={googleMapsUrl(facility.latitude, facility.longitude)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
        <p className="notice">{t.evacuationGateNotice}</p>
        <h2>{t.nearbyEvacuationGates}</h2>
        <ol className="nearby-list">
          {nearbyEvacuationGates.slice(0, 20).map(({ gate, distance }) => (
            <li key={gate.id}>
              <strong>{gate.gateName}</strong>
              <span>{formatDistance(distance, language)}</span>
              <small>{gate.riversidePark ?? t.notSpecified}</small>
              {gate.description && <small>{gate.description}</small>}
              <a href={googleMapsUrl(gate.latitude, gate.longitude)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
        <p className="notice">
          {shouldRenderDetailedShelters
            ? `${t.airRaidShelters}: ${visibleShelters.length.toLocaleString()}`
            : `${t.airRaidShelters}: ${visibleShelters.length.toLocaleString()} (${shelterClusters.length.toLocaleString()} clusters)`}
        </p>
        <h2>{t.nearbyShelters}</h2>
        <ol className="nearby-list">
          {nearbyShelters.slice(0, 20).map(({ shelter, distance }) => (
            <li key={shelter.id}>
              <strong>{shelter.placeName || shelter.name || shelter.address}</strong>
              <span>{formatDistance(distance, language)}</span>
              <small>
                {t.capacity}: {shelter.capacity?.toLocaleString() ?? '-'}
              </small>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}

function BurglaryRecords({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const t = translations[language];
  const uiText = localizedUiText[language];
  const [district, setDistrict] = useState('all');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [timePeriod, setTimePeriod] = useState<BurglaryTimePeriod | 'all'>('all');
  const [search, setSearch] = useState('');

  const years = [...new Set(data.burglaries.flatMap((record) => (record.year ? [record.year] : [])))].sort();
  const filtered = data.burglaries.filter((record) => {
    return (
      (district === 'all' || record.district === district) &&
      (year === 'all' || record.year === Number(year)) &&
      (month === 'all' || record.month === Number(month)) &&
      (timePeriod === 'all' || record.timePeriod === timePeriod) &&
      (!search.trim() || record.locationText.includes(search.trim()))
    );
  });
  const countsByDistrict = countBy(filtered, (record) => record.district);
  const visibleRecords = filtered.slice(0, maxVisibleBurglaryRecords);

  return (
    <main className="workspace burglary-layout">
      <section className="filter-panel">
        <label>
          {t.district}
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="all">{t.all}</option>
            {TAIPEI_DISTRICTS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {t.occurredDate}
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">{t.all}</option>
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          {uiText.month}
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="all">{t.all}</option>
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.timePeriod}
          <select
            value={timePeriod}
            onChange={(event) => setTimePeriod(event.target.value as BurglaryTimePeriod | 'all')}
          >
            <option value="all">{timePeriodLabels[language].all}</option>
            {TIME_PERIODS.map((period) => (
              <option key={period} value={period}>
                {timePeriodLabels[language][period]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.search}
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </section>

      <section className="map-stage">
        <MapContainer center={taipeiCenter} zoom={12} scrollWheelZoom className="map-canvas">
          <MapSizeSync />
          <TileLayer
            attribution={tileAttribution}
            url={tileUrl}
          />
          {data.districtSummaries.map((summary) => {
            const count = countsByDistrict[summary.district] ?? 0;
            if (!count) return null;
            return (
              <CircleMarker
                key={summary.district}
                center={[summary.latitude, summary.longitude]}
                radius={getBurglaryBubbleRadius(count)}
                pathOptions={{ color: '#b45309', fillColor: '#f59e0b', fillOpacity: 0.38, weight: 2 }}
              >
                <Popup>
                  <DistrictPopup summary={summary} count={count} records={filtered} language={language} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </section>

      <aside className="side-panel">
        <p className="notice">{t.recordsAreAggregated}</p>
        <h2>{t.recordCount}: {filtered.length.toLocaleString()}</h2>
        {filtered.length > visibleRecords.length && (
          <p className="notice">
            {language === 'zh'
              ? `列表先顯示前 ${visibleRecords.length.toLocaleString()} 筆，請使用篩選縮小範圍。`
              : `Showing the first ${visibleRecords.length.toLocaleString()} records. Use filters to narrow the list.`}
          </p>
        )}
        <RankingTable counts={countsByDistrict} label={t.district} valueLabel={t.recordCount} />
        <div className="record-list">
          {visibleRecords.map((record) => (
            <article key={record.id}>
              <strong>{record.locationText}</strong>
              <span>
                {record.district ?? '-'} · {record.occurredAt ?? record.occurredDateRaw} ·{' '}
                {timePeriodLabels[language][record.timePeriod]}
              </span>
            </article>
          ))}
        </div>
      </aside>
    </main>
  );
}

function PublicHealth({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const t = translations[language];
  const [district, setDistrict] = useState('all');
  const [month, setMonth] = useState('all');
  const [surveyType, setSurveyType] = useState('all');
  const [positiveOnly, setPositiveOnly] = useState(false);
  const surveyTypes = [...new Set(data.dengueRecords.flatMap((item) => (item.surveyType ? [item.surveyType] : [])))];
  const filtered = data.dengueRecords.filter(
    (item) =>
      (district === 'all' || item.district === district) &&
      (month === 'all' || item.surveyMonth === Number(month)) &&
      (surveyType === 'all' || item.surveyType === surveyType) &&
      (!positiveOnly || (item.positiveHouseholds ?? 0) > 0 || (item.positiveContainersTotal ?? 0) > 0),
  );
  const summaries = buildDengueDistrictSummaries(filtered);
  const breteauValues = filtered.flatMap((item) => (item.breteauIndex === undefined ? [] : [item.breteauIndex]));
  const containerValues = filtered.flatMap((item) => (item.containerIndex === undefined ? [] : [item.containerIndex]));

  return (
    <main className="overview">
      <section className="filter-panel health-filters">
        <label>
          {t.district}
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="all">{t.all}</option>
            {TAIPEI_DISTRICTS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {localizedUiText[language].month}
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="all">{t.all}</option>
            {monthOptions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          {t.surveyType}
          <select value={surveyType} onChange={(event) => setSurveyType(event.target.value)}>
            <option value="all">{t.all}</option>
            {surveyTypes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={positiveOnly} onChange={(event) => setPositiveOnly(event.target.checked)} />
          {language === 'zh' ? '僅顯示陽性紀錄' : 'Positive records only'}
        </label>
      </section>
      <p className="notice">{t.dengueMapNotice}</p>
      <section className="summary-grid">
        <Metric label={t.dengueSurveyRecordCount} value={filtered.length.toLocaleString()} />
        <Metric
          label={t.surveyedHouseholds}
          value={filtered.reduce((sum, item) => sum + (item.surveyedHouseholds ?? 0), 0).toLocaleString()}
        />
        <Metric
          label={t.positiveHouseholds}
          value={filtered.reduce((sum, item) => sum + (item.positiveHouseholds ?? 0), 0).toLocaleString()}
        />
        <Metric label={t.averageBreteauIndex} value={formatAverage(breteauValues)} />
        <Metric label={t.averageContainerIndex} value={formatAverage(containerValues)} />
      </section>
      <section className="public-health-grid">
        <div className="map-stage">
          <MapContainer center={taipeiCenter} zoom={11} scrollWheelZoom className="map-canvas">
            <MapSizeSync />
            <TileLayer
              attribution={tileAttribution}
              url={tileUrl}
            />
            {summaries.map((summary) =>
              summary.recordCount ? (
                <CircleMarker
                  key={summary.district}
                  center={[summary.latitude, summary.longitude]}
                  radius={Math.min(25, 7 + Math.sqrt(summary.recordCount) * 1.2)}
                  pathOptions={{ color: '#047857', fillColor: '#34d399', fillOpacity: 0.3, weight: 2 }}
                >
                  <Popup>
                    <DenguePopup summary={summary} language={language} />
                  </Popup>
                </CircleMarker>
              ) : null,
            )}
          </MapContainer>
        </div>
        <div className="health-table">
          <p className="notice">{t.dengueSurveyInterpretationNotice}</p>
          <table>
            <thead>
              <tr>
                <th>{t.district}</th>
                <th>{t.village}</th>
                <th>{t.surveyType}</th>
                <th>{t.breteauIndex}</th>
                <th>{t.containerIndex}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((item) => (
                <tr key={item.id}>
                  <td>{item.district}</td>
                  <td>{item.village ?? '-'}</td>
                  <td>{item.surveyType ?? '-'}</td>
                  <td>{item.breteauIndex ?? '-'}</td>
                  <td>{item.containerIndex ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function SafetyOverview({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const t = translations[language];
  const totalCapacity = data.shelters.reduce((sum, shelter) => sum + (shelter.capacity ?? 0), 0);
  const shelterDistricts = data.districtSummaries.reduce<Record<string, number>>((counts, summary) => {
    counts[summary.district] = summary.shelterCount;
    return counts;
  }, {});
  const shelterCapacity = data.districtSummaries.reduce<Record<string, number>>((counts, summary) => {
    counts[summary.district] = summary.shelterCapacity;
    return counts;
  }, {});
  const burglaryByYear = countBy(data.burglaries, (record) => (record.year ? String(record.year) : undefined));
  const burglaryByMonth = countBy(data.burglaries, (record) => (record.month ? String(record.month) : undefined));
  const burglaryByPeriod = countBy(data.burglaries, (record) => timePeriodLabels[language][record.timePeriod]);
  const burglaryByDistrict = countBy(data.burglaries, (record) => record.district);
  const topCapacity = mostCommonEntry(shelterCapacity);
  const topBurglary = mostCommonEntry(burglaryByDistrict);
  const commonPeriod = mostCommonEntry(burglaryByPeriod);
  const latest = [...data.burglaries]
    .filter((record) => record.year && record.month)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.month ?? 0) - (a.month ?? 0))[0];
  const aedByDistrict = countBy(data.aeds, (item) => item.district);
  const hospitals = data.medicalFacilities.filter((item) => item.facilityType === 'hospital');
  const clinics = data.medicalFacilities.filter((item) => item.facilityType === 'clinic');
  const hospitalsByDistrict = countBy(hospitals, (item) => item.district);
  const clinicsByDistrict = countBy(clinics, (item) => item.district);
  const medicalFacilitiesByDistrict = countBy(data.medicalFacilities, (item) => item.district);
  const medicalFacilitiesByType = {
    [t.hospitals]: hospitals.length,
    [t.clinics]: clinics.length,
  };
  const medicalCoordinateAvailability = {
    [t.hasValidCoordinates]: data.medicalFacilities.filter((item) => item.coordinateStatus === 'valid').length,
    [t.invalidCoordinates]: data.medicalFacilities.filter((item) => item.coordinateStatus !== 'valid').length,
  };
  const hydrantSummary = data.fireHydrantSummary;
  const hydrantsByCity = Object.fromEntries(hydrantSummary.byCity.map((item) => [item.city, item.count]));
  const hydrantsByDistrict = Object.fromEntries(hydrantSummary.byDistrict.map((item) => [`${item.city} ${item.district}`, item.count]));
  const hydrantsByType = {
    [t.undergroundHydrant]: hydrantSummary.undergroundHydrantCount,
    [t.aboveGroundHydrant]: hydrantSummary.aboveGroundHydrantCount,
  };
  const hydrantsByScope = Object.fromEntries(
    hydrantSummary.byAreaScope.map((item) => [formatAreaScope(item.areaScope, language), item.count]),
  );
  const hydrantCoordinateStatus = {
    [t.hasValidCoordinates]: hydrantSummary.validCoordinateCount,
    [t.invalidCoordinates]: hydrantSummary.totalRecords - hydrantSummary.validCoordinateCount,
  };
  const topHydrantDistrict = [...hydrantSummary.byDistrict].sort((a, b) => b.count - a.count)[0];
  const topHydrantVillage = Object.fromEntries(
    [...hydrantSummary.byVillage]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((item) => [`${item.city} ${item.district} ${item.village}`, item.count]),
  );
  const emergencyShelterSummary = data.emergencyShelterSummary;
  const emergencySheltersByDistrict = Object.fromEntries(
    emergencyShelterSummary.byDistrict.map((item) => [item.district, item.count]),
  );
  const emergencyCapacityByDistrict = Object.fromEntries(
    emergencyShelterSummary.byDistrict.map((item) => [item.district, item.totalListedCapacityPeople]),
  );
  const emergencySheltersByType = Object.fromEntries(
    emergencyShelterSummary.byShelterType.map((item) => [formatEmergencyShelterType(item.shelterType, language), item.count]),
  );
  const emergencyCapacityByType = Object.fromEntries(
    emergencyShelterSummary.byShelterType.map((item) => [
      formatEmergencyShelterType(item.shelterType, language),
      item.totalListedCapacityPeople,
    ]),
  );
  const accessibleSheltersByDistrict = Object.fromEntries(
    emergencyShelterSummary.byDistrict.map((item) => [item.district, item.accessibleFacilityCount]),
  );
  const reliefStationsByDistrict = Object.fromEntries(
    emergencyShelterSummary.byDistrict.map((item) => [item.district, item.reliefStationCount]),
  );
  const indoorOutdoorShelters = {
    [t.indoor]: emergencyShelterSummary.indoorShelterCount,
    [t.outdoor]: emergencyShelterSummary.outdoorShelterCount,
  };
  const disasterApplicability = Object.fromEntries(
    emergencyShelterSummary.byDisasterApplicability.flood.map((item) => [
      `${t.flood} ${formatDisasterStatus(item.status, language)}`,
      item.count,
    ]),
  );
  const topEmergencyShelterDistrict = [...emergencyShelterSummary.byDistrict].sort((a, b) => b.count - a.count)[0];
  const topEmergencyCapacityDistrict = [...emergencyShelterSummary.byDistrict].sort((a, b) => b.totalListedCapacityPeople - a.totalListedCapacityPeople)[0];
  const topEmergencyShelterType = [...emergencyShelterSummary.byShelterType].sort((a, b) => b.count - a.count)[0];
  const cctvSummary = data.trafficCctvSummary;
  const cctvByCity = Object.fromEntries(cctvSummary.byCity.map((item) => [item.city, item.count]));
  const cctvCoordinateStatus = Object.fromEntries(
    cctvSummary.coordinateStatus.map((item) => [formatCoordinateStatus(item.coordinateStatus, language), item.count]),
  );
  const gatesByRiversidePark = countBy(data.evacuationGates, (item) => item.riversidePark);
  const topRiversidePark = mostCommonEntry(gatesByRiversidePark);
  const riversideParkAvailability = {
    [t.hasRiversidePark]: data.evacuationGates.filter((item) => item.riversidePark).length,
    [t.withoutRiversidePark]: data.evacuationGates.filter((item) => !item.riversidePark).length,
  };
  const locationDescriptionAvailability = {
    [t.hasLocationDescription]: data.evacuationGates.filter((item) => item.description).length,
    [t.withoutLocationDescription]: data.evacuationGates.filter((item) => !item.description).length,
  };
  const dengueByDistrict = data.dengueDistrictSummaries.reduce<Record<string, number>>((counts, item) => {
    counts[item.district] = item.recordCount;
    return counts;
  }, {});
  const latestDengueMonth = data.dengueRecords
    .flatMap((item) => (item.surveyYear && item.surveyMonth ? [`${item.surveyYear}-${String(item.surveyMonth).padStart(2, '0')}`] : []))
    .sort()
    .at(-1);

  return (
    <main className="overview">
      <section className="summary-grid">
        <Metric label={t.totalShelters} value={data.shelters.length.toLocaleString()} />
        <Metric label={t.totalShelterCapacity} value={totalCapacity.toLocaleString()} />
        <Metric label={t.topShelterCapacityDistrict} value={topCapacity?.[0] ?? '-'} />
        <Metric label={t.totalBurglaryRecords} value={data.burglaries.length.toLocaleString()} />
        <Metric label={t.latestBurglaryMonth} value={latest ? `${latest.year}-${String(latest.month).padStart(2, '0')}` : '-'} />
        <Metric label={t.mostCommonBurglaryTimePeriod} value={commonPeriod?.[0] ?? '-'} />
        <Metric label={t.topBurglaryDistrict} value={topBurglary?.[0] ?? '-'} />
        <Metric
          label={t.recordsWithDistrict}
          value={data.burglaries.filter((record) => record.district).length.toLocaleString()}
        />
        <Metric label={t.aedLocationCount} value={data.aeds.length.toLocaleString()} />
        <Metric label={t.fireHydrantCount} value={hydrantSummary.totalRecords.toLocaleString()} />
        <Metric label={t.taipeiCityHydrantCount} value={hydrantSummary.taipeiCityCount.toLocaleString()} />
        <Metric label={t.newTaipeiHydrantCount} value={hydrantSummary.newTaipeiCount.toLocaleString()} />
        <Metric label={t.undergroundHydrantCount} value={hydrantSummary.undergroundHydrantCount.toLocaleString()} />
        <Metric label={t.aboveGroundHydrantCount} value={hydrantSummary.aboveGroundHydrantCount.toLocaleString()} />
        <Metric label={t.topDistrictByHydrantCount} value={topHydrantDistrict ? `${topHydrantDistrict.city} ${topHydrantDistrict.district}` : '-'} />
        <Metric label={t.topHydrantType} value={hydrantSummary.undergroundHydrantCount >= hydrantSummary.aboveGroundHydrantCount ? t.undergroundHydrant : t.aboveGroundHydrant} />
        <Metric label={t.villagesCovered} value={hydrantSummary.villageCount.toLocaleString()} />
        <Metric label={t.emergencyShelterCount} value={emergencyShelterSummary.totalRecords.toLocaleString()} />
        <Metric label={t.totalListedCapacity} value={emergencyShelterSummary.totalListedCapacityPeople.toLocaleString()} />
        <Metric label={t.shelterTypesCovered} value={emergencyShelterSummary.byShelterType.length.toLocaleString()} />
        <Metric label={t.accessibleShelterCount} value={emergencyShelterSummary.accessibleFacilityCount.toLocaleString()} />
        <Metric label={t.reliefStationCount} value={emergencyShelterSummary.reliefStationCount.toLocaleString()} />
        <Metric label={t.indoorShelterCount} value={emergencyShelterSummary.indoorShelterCount.toLocaleString()} />
        <Metric label={t.outdoorShelterCount} value={emergencyShelterSummary.outdoorShelterCount.toLocaleString()} />
        <Metric label={t.topDistrictByShelterCount} value={topEmergencyShelterDistrict?.district ?? '-'} />
        <Metric label={t.topDistrictByListedCapacity} value={topEmergencyCapacityDistrict?.district ?? '-'} />
        <Metric label={t.topShelterType} value={topEmergencyShelterType ? formatEmergencyShelterType(topEmergencyShelterType.shelterType, language) : '-'} />
        <Metric label={t.cctvFacilityCount} value={cctvSummary.totalRecords.toLocaleString()} />
        <Metric label={t.cctvValidCoordinateCount} value={cctvSummary.validCoordinateCount.toLocaleString()} />
        <Metric label={t.cctvCityCount} value={cctvSummary.cityCount.toLocaleString()} />
        <Metric label={t.cctvCoordinateOutlierCount} value={cctvSummary.outlierCoordinateCount.toLocaleString()} />
        <Metric label={t.medicalFacilityCount} value={data.medicalFacilities.length.toLocaleString()} />
        <Metric label={t.hospitalCount} value={hospitals.length.toLocaleString()} />
        <Metric label={t.clinicCount} value={clinics.length.toLocaleString()} />
        <Metric
          label={t.medicalFacilitiesWithValidCoordinates}
          value={data.medicalFacilities.filter((item) => item.coordinateStatus === 'valid').length.toLocaleString()}
        />
        <Metric label={t.topDistrictByHospitalCount} value={mostCommonEntry(hospitalsByDistrict)?.[0] ?? '-'} />
        <Metric label={t.topDistrictByClinicCount} value={mostCommonEntry(clinicsByDistrict)?.[0] ?? '-'} />
        <Metric
          label={t.topDistrictByMedicalFacilityCount}
          value={mostCommonEntry(medicalFacilitiesByDistrict)?.[0] ?? '-'}
        />
        <Metric label={t.evacuationGateCount} value={data.evacuationGates.length.toLocaleString()} />
        <Metric
          label={t.evacuationGatesWithValidCoordinates}
          value={data.evacuationGates.filter((item) => item.coordinateStatus === 'valid').length.toLocaleString()}
        />
        <Metric
          label={t.riversideParksWithEvacuationGates}
          value={Object.keys(gatesByRiversidePark).length.toLocaleString()}
        />
        <Metric label={t.topRiversideParkByGateCount} value={topRiversidePark?.[0] ?? t.notSpecified} />
        <Metric
          label={t.recordsWithLocationDescription}
          value={data.evacuationGates.filter((item) => item.description).length.toLocaleString()}
        />
        <Metric label={t.latestDengueSurveyMonth} value={latestDengueMonth ?? '-'} />
        <Metric label={t.dengueSurveyRecordCount} value={data.dengueRecords.length.toLocaleString()} />
      </section>
      <section className="chart-grid">
        <BarChart title={t.sheltersByDistrict} values={shelterDistricts} />
        <BarChart title={t.shelterCapacityByDistrict} values={shelterCapacity} />
        <BarChart title={t.burglaryRecordsByYear} values={burglaryByYear} />
        <BarChart title={t.burglaryRecordsByMonth} values={burglaryByMonth} />
        <BarChart title={t.burglaryRecordsByTimePeriod} values={burglaryByPeriod} />
        <BarChart title={t.burglaryRecordsByDistrict} values={burglaryByDistrict} />
        <BarChart title={t.aedLocationsByDistrict} values={aedByDistrict} />
        <BarChart title={t.fireHydrantsByCity} values={hydrantsByCity} />
        <BarChart title={t.fireHydrantsByDistrict} values={hydrantsByDistrict} />
        <BarChart title={t.fireHydrantsByHydrantType} values={hydrantsByType} />
        <BarChart title={t.fireHydrantsByAreaScope} values={hydrantsByScope} />
        <BarChart title={t.topVillagesByHydrantCount} values={topHydrantVillage} />
        <BarChart title={t.fireHydrantCoordinateStatus} values={hydrantCoordinateStatus} />
        <BarChart title={t.emergencySheltersByDistrict} values={emergencySheltersByDistrict} />
        <BarChart title={t.listedCapacityByDistrict} values={emergencyCapacityByDistrict} />
        <BarChart title={t.emergencySheltersByType} values={emergencySheltersByType} />
        <BarChart title={t.listedCapacityByShelterType} values={emergencyCapacityByType} />
        <BarChart title={t.accessibleSheltersByDistrict} values={accessibleSheltersByDistrict} />
        <BarChart title={t.indoorOutdoorShelters} values={indoorOutdoorShelters} />
        <BarChart title={t.reliefStationsByDistrict} values={reliefStationsByDistrict} />
        <BarChart title={t.disasterApplicabilityDistribution} values={disasterApplicability} />
        <BarChart title={t.cctvFacilitiesByCity} values={cctvByCity} />
        <BarChart title={t.cctvCoordinateStatus} values={cctvCoordinateStatus} />
        <BarChart title={t.hospitalsByDistrict} values={hospitalsByDistrict} />
        <BarChart title={t.clinicsByDistrict} values={clinicsByDistrict} />
        <BarChart title={t.medicalFacilitiesByDistrict} values={medicalFacilitiesByDistrict} />
        <BarChart title={t.medicalFacilitiesByType} values={medicalFacilitiesByType} />
        <BarChart title={t.medicalFacilityCoordinateAvailability} values={medicalCoordinateAvailability} />
        <BarChart title={t.evacuationGatesByRiversidePark} values={gatesByRiversidePark} />
        <BarChart title={t.riversideParkAvailability} values={riversideParkAvailability} />
        <BarChart title={t.locationDescriptionAvailability} values={locationDescriptionAvailability} />
        <BarChart title={t.dengueSurveyRecordsByDistrict} values={dengueByDistrict} />
        <ComparisonChart title={t.shelterCapacityVsBurglaryRecords} summaries={data.districtSummaries} notice={t.noCausationNotice} />
      </section>
    </main>
  );
}

function DataNotes({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const t = translations[language];
  return (
    <main className="notes">
      <h2>{t.dataNotes}</h2>
      <p>{t.dataDisclaimer}</p>
      <p>{t.burglaryPrivacyNotice}</p>
      <p>{t.shelterAvailabilityNotice}</p>
      <p>{t.evacuationGateDataNote}</p>
      <p>{t.medicalFacilityDataNote}</p>
      <p>{t.fireHydrantDataNote}</p>
      <p>{t.emergencyShelterDataNote}</p>
      <p>{t.emergencyShelterUseNote}</p>
      <p>{t.cctvDataNote}</p>
      <p>{t.cctvLiveImageApplicationNote}</p>
      <dl>
        {data.conversionReport.sources.map((source) => (
          <div key={source.name}>
            <dt>{source.name}</dt>
            <dd>
              <a href={source.url}>{source.url}</a>
              <span>{source.notes}</span>
            </dd>
          </div>
        ))}
      </dl>
    </main>
  );
}

function ShelterPopup({ shelter, language }: { shelter: AirRaidShelter; language: Language }) {
  const t = translations[language];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${shelter.latitude},${shelter.longitude}`;
  return (
    <div className="popup-stack">
      <strong>{t.airRaidShelters}</strong>
      <span>{t.district}: {shelter.district}</span>
      <span>{t.policePrecinct}: {shelter.policePrecinct ?? '-'}</span>
      <span>{t.name}: {shelter.name ?? '-'}</span>
      <span>{t.placeName}: {shelter.placeName ?? '-'}</span>
      <span>{t.address}: {shelter.address}</span>
      <span>{t.village}: {shelter.village ?? '-'}</span>
      <span>{t.basementInfo}: {shelter.basementInfo ?? '-'}</span>
      <span>{t.capacity}: {shelter.capacity?.toLocaleString() ?? '-'}</span>
      <a href={mapsUrl} target="_blank" rel="noreferrer">
        {t.openGoogleMaps}
      </a>
    </div>
  );
}

function AedPopup({ aed, language }: { aed: AedLocation; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.aedLocation}</strong>
      <span>{aed.placeName}</span>
      <span>{t.address}: {aed.address}</span>
      {aed.district && <span>{t.district}: {aed.district}</span>}
      {aed.placeCategory && <span>{t.placeCategory}: {aed.placeCategory}</span>}
      {aed.placeType && <span>{t.placeType}: {aed.placeType}</span>}
      {aed.aedPlacementLocation && <span>{t.aedPlacementLocation}: {aed.aedPlacementLocation}</span>}
      {aed.aedLocationDescription && <span>{t.aedLocationDescription}: {aed.aedLocationDescription}</span>}
      <span className="notice">{t.aedEmergencyNotice}</span>
      {aed.latitude !== undefined && aed.longitude !== undefined && (
        <a href={googleMapsUrl(aed.latitude, aed.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function EvacuationGatePopup({ gate, language }: { gate: EvacuationGate; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.evacuationGate}</strong>
      <span>{t.riversidePark}: {gate.riversidePark ?? t.notSpecified}</span>
      <span>{t.gateName}: {gate.gateName}</span>
      {gate.description && <span>{t.locationDescription}: {gate.description}</span>}
      <span className="notice">{t.evacuationGateNotice}</span>
      {gate.latitude !== undefined && gate.longitude !== undefined && (
        <a href={googleMapsUrl(gate.latitude, gate.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function MedicalFacilityPopup({ facility, language }: { facility: MedicalFacility; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.medicalFacility}</strong>
      <span>{t.medicalFacilityType}: {facility.facilityType === 'hospital' ? t.hospital : t.clinic}</span>
      <span>{t.institutionName}: {facility.facilityName}</span>
      {facility.district && <span>{t.district}: {facility.district}</span>}
      <span>{t.address}: {facility.address}</span>
      {facility.medicalCategory && <span>{t.classification}: {facility.medicalCategory}</span>}
      <span className="notice">{t.medicalFacilityNotice}</span>
      {facility.latitude !== undefined && facility.longitude !== undefined && (
        <a href={googleMapsUrl(facility.latitude, facility.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function FireHydrantPopup({ hydrant, language }: { hydrant: FireHydrant; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.fireHydrant}</strong>
      {hydrant.wpid && <span>{t.wpid}: {hydrant.wpid}</span>}
      {hydrant.mapSheetNumber && <span>{t.mapSheetNumber}: {hydrant.mapSheetNumber}</span>}
      {hydrant.hydrantNumber && <span>{t.hydrantNumber}: {hydrant.hydrantNumber}</span>}
      <span>{t.hydrantType}: {hydrant.hydrantType === 'underground' ? t.undergroundHydrant : t.aboveGroundHydrant}</span>
      {hydrant.city && <span>{t.city}: {hydrant.city}</span>}
      {hydrant.district && <span>{t.district}: {hydrant.district}</span>}
      {hydrant.village && <span>{t.village}: {hydrant.village}</span>}
      {hydrant.areaRaw && <span>{t.areaRaw}: {hydrant.areaRaw}</span>}
      {hydrant.longitude !== undefined && <span>{t.wgs84Longitude}: {hydrant.longitude}</span>}
      {hydrant.latitude !== undefined && <span>{t.wgs84Latitude}: {hydrant.latitude}</span>}
      {hydrant.xTwd97 !== undefined && <span>{t.xTwd97}: {hydrant.xTwd97}</span>}
      {hydrant.yTwd97 !== undefined && <span>{t.yTwd97}: {hydrant.yTwd97}</span>}
      <span className="notice">{t.fireHydrantNotice}</span>
      {hydrant.latitude !== undefined && hydrant.longitude !== undefined && (
        <a href={googleMapsUrl(hydrant.latitude, hydrant.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function TrafficCctvPopup({ facility, language }: { facility: TrafficCctvFacility; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.cctvFacility}</strong>
      <span>{t.sourceSequenceNumber}: {facility.sourceSequenceNumber ?? '-'}</span>
      <span>{t.city}: {facility.city ?? '-'}</span>
      <span>{t.cameraLocationCode}: {facility.cameraLocationCodeRaw ?? '-'}</span>
      {facility.longitude !== undefined && <span>{t.wgs84Longitude}: {facility.longitude}</span>}
      {facility.latitude !== undefined && <span>{t.wgs84Latitude}: {facility.latitude}</span>}
      <span className="notice">{t.cctvPopupNotice}</span>
      {facility.latitude !== undefined && facility.longitude !== undefined && (
        <a href={googleMapsUrl(facility.latitude, facility.longitude)} target="_blank" rel="noreferrer">
          {t.openGoogleMaps}
        </a>
      )}
    </div>
  );
}

function DenguePopup({ summary, language }: { summary: DengueDistrictSummary; language: Language }) {
  const t = translations[language];
  return (
    <div className="popup-stack">
      <strong>{t.dengueVectorDensity}</strong>
      <span>{t.district}: {summary.district}</span>
      <span>{t.recordCount}: {summary.recordCount}</span>
      <span>{t.surveyedHouseholds}: {summary.surveyedHouseholds}</span>
      <span>{t.positiveHouseholds}: {summary.positiveHouseholds}</span>
      <span>{t.positiveContainersTotal}: {summary.positiveContainersTotal}</span>
      <span>{t.averageBreteauIndex}: {formatOptional(summary.averageBreteauIndex)}</span>
      <span>{t.averageContainerIndex}: {formatOptional(summary.averageContainerIndex)}</span>
      <small>{t.dengueMapNotice}</small>
    </div>
  );
}

function DistrictPopup({
  summary,
  count,
  records,
  language,
}: {
  summary: DistrictSafetySummary;
  count: number;
  records: ResidentialBurglaryRecord[];
  language: Language;
}) {
  const t = translations[language];
  const districtRecords = records.filter((record) => record.district === summary.district);
  const common = mostCommonEntry(countBy(districtRecords, (record) => timePeriodLabels[language][record.timePeriod]));
  const years = districtRecords.flatMap((record) => (record.year ? [record.year] : []));
  return (
    <div className="popup-stack">
      <strong>{summary.district}</strong>
      <span>{t.recordCount}: {count}</span>
      <span>{t.mostCommonBurglaryTimePeriod}: {common?.[0] ?? '-'}</span>
      <span>
        {t.occurredDate}: {years.length ? `${Math.min(...years)}-${Math.max(...years)}` : '-'}
      </span>
      <span>{t.airRaidShelters}: {summary.shelterCount}</span>
      <span>{t.capacity}: {summary.shelterCapacity.toLocaleString()}</span>
    </div>
  );
}

function FlyTo({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 15);
  }, [map, position]);
  return null;
}

function ViewportTracker({ onChange }: { onChange: (viewport: MapViewport) => void }) {
  const map = useMapEvents({
    moveend: () => onChange({ bounds: map.getBounds(), zoom: map.getZoom() }),
    zoomend: () => onChange({ bounds: map.getBounds(), zoom: map.getZoom() }),
  });

  useEffect(() => {
    onChange({ bounds: map.getBounds(), zoom: map.getZoom() });
  }, [map, onChange]);

  return null;
}

function MapSizeSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const syncSize = () => map.invalidateSize({ animate: false, pan: false });
    const frame = requestAnimationFrame(syncSize);
    const observer = new ResizeObserver(syncSize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function BarChart({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).filter(([, value]) => value > 0);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <article className="chart">
      <h2>{title}</h2>
      {entries.map(([label, value]) => (
        <div className="bar-row" key={label}>
          <span>{label}</span>
          <div>
            <i style={{ width: `${(value / max) * 100}%` }} />
          </div>
          <b>{value.toLocaleString()}</b>
        </div>
      ))}
    </article>
  );
}

function ComparisonChart({
  title,
  summaries,
  notice,
}: {
  title: string;
  summaries: DistrictSafetySummary[];
  notice: string;
}) {
  const maxCapacity = Math.max(1, ...summaries.map((summary) => summary.shelterCapacity));
  const maxRecords = Math.max(1, ...summaries.map((summary) => summary.burglaryRecordCount));
  return (
    <article className="chart">
      <h2>{title}</h2>
      <p className="notice">{notice}</p>
      {summaries
        .filter((summary) => summary.shelterCapacity || summary.burglaryRecordCount)
        .map((summary) => (
          <div className="comparison-row" key={summary.district}>
            <span>{summary.district}</span>
            <div>
              <i className="capacity-bar" style={{ width: `${(summary.shelterCapacity / maxCapacity) * 100}%` }} />
              <i className="record-bar" style={{ width: `${(summary.burglaryRecordCount / maxRecords) * 100}%` }} />
            </div>
          </div>
        ))}
    </article>
  );
}

function RankingTable({ counts, label, valueLabel }: { counts: Record<string, number>; label: string; valueLabel: string }) {
  return (
    <table>
      <thead>
        <tr>
          <th>{label}</th>
          <th>{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{count}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

function hasValidCoordinate(
  shelter: AirRaidShelter,
): shelter is AirRaidShelter & { latitude: number; longitude: number } {
  return shelter.coordinateStatus === 'valid' && typeof shelter.latitude === 'number' && typeof shelter.longitude === 'number';
}

function hasValidPoint<T extends { coordinateStatus: string; latitude?: number; longitude?: number }>(
  item: T,
): item is T & { latitude: number; longitude: number } {
  return item.coordinateStatus === 'valid' && typeof item.latitude === 'number' && typeof item.longitude === 'number';
}

function isInViewport(shelter: { latitude: number; longitude: number }, bounds: L.LatLngBounds | null): boolean {
  return !bounds || bounds.pad(0.2).contains([shelter.latitude, shelter.longitude]);
}

function matchesCapacityRange(capacity: number, range: CapacityRange): boolean {
  if (range === 'all') return true;
  if (range === 'under100') return capacity < 100;
  if (range === '100-499') return capacity >= 100 && capacity <= 499;
  if (range === '500-999') return capacity >= 500 && capacity <= 999;
  return capacity >= 1000;
}

function googleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function googleMapsAddressUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function formatAverage(values: number[]): string {
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : '-';
}

function formatOptional(value: number | undefined): string {
  return value === undefined ? '-' : value.toFixed(2);
}

function formatAreaScope(scope: FireHydrantAreaScope, language: Language): string {
  const t = translations[language];
  if (scope === 'taipei_city') return t.taipeiCityScope;
  if (scope === 'new_taipei_official_scope') return t.newTaipeiOfficialScope;
  if (scope === 'new_taipei_other') return t.newTaipeiOtherScope;
  return t.unknownScope;
}

function formatEmergencyShelterType(type: EmergencyShelterType, language: Language): string {
  const t = translations[language];
  const labels: Record<EmergencyShelterType, string> = {
    school: t.schoolShelter,
    library: t.libraryShelter,
    park_green_space: t.parkGreenSpaceShelter,
    activity_center: t.activityCenterShelter,
    market_parking_lot: t.marketParkingLotShelter,
    metro_station: t.metroStationShelter,
    sports_facility: t.sportsFacilityShelter,
    arts_center: t.artsCenterShelter,
    military_camp: t.militaryCampShelter,
    other: t.other,
    unknown: t.unknown,
  };
  return labels[type];
}

function formatDisasterStatus(status: DisasterApplicabilityStatus, language: Language): string {
  const t = translations[language];
  const labels: Record<DisasterApplicabilityStatus, string> = {
    yes: t.applicableYes,
    no: t.applicableNo,
    backup: t.backup,
    old_settlement: t.oldSettlement,
    unknown: t.unknown,
  };
  return labels[status];
}

function formatCoordinateStatus(status: CoordinateStatus, language: Language): string {
  const t = translations[language];
  const labels: Record<CoordinateStatus, string> = {
    valid: t.hasValidCoordinates,
    missing: t.missingCoordinates,
    unparsed: t.unparsedCoordinates,
    outlier: t.outlierCoordinates,
  };
  return labels[status];
}

const localizedUiText: Record<
  Language,
  {
    currentLocation: string;
    geolocationDenied: string;
    geolocationUnsupported: string;
    month: string;
  }
> = {
  zh: {
    currentLocation: '目前位置',
    geolocationDenied: '無法取得您的位置，請確認定位權限。',
    geolocationUnsupported: '此瀏覽器不支援定位。',
    month: '月份',
  },
  en: {
    currentLocation: 'Current location',
    geolocationDenied: 'Unable to get your location. Please check location permission.',
    geolocationUnsupported: 'Geolocation is not supported.',
    month: 'Month',
  },
};

export default App;
