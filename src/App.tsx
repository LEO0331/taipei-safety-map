import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { loadSafetyData } from './lib/loadSafetyData';
import {
  TAIPEI_DISTRICTS,
  TIME_PERIODS,
  calculateDistanceMeters,
  buildShelterMapClusters,
  countBy,
  formatDistance,
  getBurglaryBubbleRadius,
  mostCommonEntry,
} from './lib/safetyData';
import { timePeriodLabels, translations } from './lib/translations';
import type {
  AirRaidShelter,
  BurglaryTimePeriod,
  DistrictSafetySummary,
  Language,
  ResidentialBurglaryRecord,
  SafetyDataBundle,
} from './types';

type Tab = 'shelter' | 'burglary' | 'overview' | 'notes';
type CapacityRange = 'all' | 'under100' | '100-499' | '500-999' | '1000plus';
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
  { value: '300', label: '300m' },
  { value: '500', label: '500m' },
  { value: '1000', label: '1km' },
  { value: '2000', label: '2km' },
];
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const capacityOptions: SelectOption<CapacityRange>[] = [
  { value: 'all', label: 'All' },
  { value: 'under100', label: 'Under 100' },
  { value: '100-499', label: '100-499' },
  { value: '500-999', label: '500-999' },
  { value: '1000plus', label: '1,000+' },
];

function App() {
  const [language, setLanguage] = useState<Language>('zh');
  const [activeTab, setActiveTab] = useState<Tab>('shelter');
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
            ['shelter', t.shelterMap],
            ['burglary', t.burglaryRecords],
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

      {activeTab === 'shelter' && <ShelterMap data={data} language={language} />}
      {activeTab === 'burglary' && <BurglaryRecords data={data} language={language} />}
      {activeTab === 'overview' && <SafetyOverview data={data} language={language} />}
      {activeTab === 'notes' && <DataNotes data={data} language={language} />}

      <footer>{t.footer}</footer>
    </div>
  );
}

function ShelterMap({ data, language }: { data: SafetyDataBundle; language: Language }) {
  const t = translations[language];
  const uiText = localizedUiText[language];
  const [district, setDistrict] = useState('all');
  const [search, setSearch] = useState('');
  const [capacityRange, setCapacityRange] = useState<CapacityRange>('all');
  const [validOnly, setValidOnly] = useState(true);
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

  function requestNearbyShelters() {
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
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {shouldRenderDetailedShelters
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
              ))}
          {data.districtSummaries.map((summary) => {
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
          {userPosition && (
            <Marker position={[userPosition.latitude, userPosition.longitude]} icon={userIcon}>
              <Popup>{uiText.currentLocation}</Popup>
            </Marker>
          )}
          {userPosition && <FlyTo position={[userPosition.latitude, userPosition.longitude]} />}
        </MapContainer>
      </section>

      <aside className="side-panel">
        <button type="button" className="primary-action" onClick={requestNearbyShelters}>
          {t.showNearbyShelters}
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
        <p className="notice">
          {shouldRenderDetailedShelters
            ? `${t.airRaidShelters}: ${visibleShelters.length.toLocaleString()}`
            : `${t.airRaidShelters}: ${visibleShelters.length.toLocaleString()} (${shelterClusters.length.toLocaleString()} clusters)`}
        </p>
        <h2>{t.nearbyShelters}</h2>
        <ol className="nearby-list">
          {nearbyShelters.map(({ shelter, distance }) => (
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
      </section>
      <section className="chart-grid">
        <BarChart title={t.sheltersByDistrict} values={shelterDistricts} />
        <BarChart title={t.shelterCapacityByDistrict} values={shelterCapacity} />
        <BarChart title={t.burglaryRecordsByYear} values={burglaryByYear} />
        <BarChart title={t.burglaryRecordsByMonth} values={burglaryByMonth} />
        <BarChart title={t.burglaryRecordsByTimePeriod} values={burglaryByPeriod} />
        <BarChart title={t.burglaryRecordsByDistrict} values={burglaryByDistrict} />
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
    geolocationDenied: '無法取得目前位置。',
    geolocationUnsupported: '此瀏覽器不支援定位。',
    month: '月份',
  },
  en: {
    currentLocation: 'Current location',
    geolocationDenied: 'Unable to access current location.',
    geolocationUnsupported: 'Geolocation is not supported.',
    month: 'Month',
  },
};

export default App;
