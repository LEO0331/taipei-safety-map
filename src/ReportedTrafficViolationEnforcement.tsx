import { useEffect, useMemo, useState } from 'react';
import type { Language } from './types';

type Summary = { total: number; years: Array<number | null> };
type RecordItem = {
  id: string;
  year: number | null;
  month: number | null;
  timeRaw: string;
  districtName: string;
  roadName: string;
  lawRaw: string;
  violationFactRaw: string;
  violationCategory: string;
};

const base = `${import.meta.env.BASE_URL}data/reported-traffic-violation-enforcement/`;
const t = (language: Language, zh: string, en: string) => (language === 'zh' ? zh : en);

function categoryLabel(value: string, language: Language) {
  if (value === 'double_parking') {
    return t(language, '併排停車', 'Double parking');
  }

  if (value === 'illegal_parking') {
    return t(language, '違規停車', 'Illegal parking');
  }

  if (value === 'other') {
    return t(language, '其他交通違規', 'Other traffic violations');
  }

  return language === 'zh' ? value.replaceAll('_', ' ') : value;
}

function aggregate(rows: RecordItem[], getName: (record: RecordItem) => string) {
  const counts = new Map<string, number>();

  for (const record of rows) {
    const name = getName(record).trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hant'));
}

export default function ReportedTrafficViolationEnforcement({ language }: { language: Language }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [year, setYear] = useState('all');
  const [district, setDistrict] = useState('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(base + 'summary.json').then((response) => response.json()),
      fetch(base + 'records-page-001.json').then((response) => response.json()),
    ]).then(([nextSummary, nextRecords]) => {
      setSummary(nextSummary);
      setRecords(nextRecords);
    });
  }, []);

  const years = useMemo(
    () =>
      [...new Set(records.map((record) => record.year).filter((value): value is number => value !== null))].sort(
        (a, b) => a - b,
      ),
    [records],
  );

  const districts = useMemo(
    () => [...new Set(records.map((record) => record.districtName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [records],
  );

  const categories = useMemo(
    () => [...new Set(records.map((record) => record.violationCategory).filter(Boolean))].sort(),
    [records],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      if (year !== 'all' && String(record.year) !== year) {
        return false;
      }

      if (district !== 'all' && record.districtName !== district) {
        return false;
      }

      if (category !== 'all' && record.violationCategory !== category) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        record.roadName,
        record.districtName,
        record.lawRaw,
        record.violationFactRaw,
        record.violationCategory,
        categoryLabel(record.violationCategory, 'zh'),
        categoryLabel(record.violationCategory, 'en'),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [records, year, district, category, query]);

  const districtData = useMemo(
    () => aggregate(filtered, (record) => record.districtName || t(language, '未標示行政區', 'Unspecified district')),
    [filtered, language],
  );

  const categoryData = useMemo(
    () => aggregate(filtered, (record) => categoryLabel(record.violationCategory, language)),
    [filtered, language],
  );

  const roadData = useMemo(
    () => aggregate(filtered, (record) => record.roadName || t(language, '未標示道路', 'Unspecified road')).slice(0, 20),
    [filtered, language],
  );

  const maxDistrictCount = Math.max(...districtData.map((item) => item.count), 1);
  const filteredYears = [...new Set(filtered.map((record) => record.year).filter((value): value is number => value !== null))].sort(
    (a, b) => a - b,
  );
  const summaryYears = summary?.years?.filter((value): value is number => value !== null) ?? [];

  if (!summary) {
    return <main className="status-screen">{t(language, '載入檢舉交通違規資料中…', 'Loading reported traffic violations…')}</main>;
  }

  return (
    <main className="overview tobacco-control">
      <section className="hero">
        <p className="eyebrow">{t(language, '交通違規 · 民眾檢舉', 'Traffic Violations · Public Reports')}</p>
        <h2>{t(language, '民眾檢舉交通違規裁罰紀錄', 'Reported Traffic Violation Enforcement Records')}</h2>
        <p className="notice">
          {t(
            language,
            '圖表、統計與資料表會依目前篩選條件同步更新；此為歷史裁罰紀錄，非即時違規、執法位置或道路危險程度。',
            'Charts, metrics, and tables update together with the current filters. These are historical penalized reports, not real-time violations, enforcement locations, or road danger.',
          )}
        </p>
      </section>

      <section className="filter-panel health-filters">
        <label>
          {t(language, '年度', 'Year')}
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">{t(language, '全部', 'All')}</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(language, '行政區', 'District')}
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="all">{t(language, '全部', 'All')}</option>
            {districts.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(language, '違規類別', 'Violation category')}
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">{t(language, '全部', 'All')}</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {categoryLabel(value, language)}
              </option>
            ))}
          </select>
        </label>

        <label className="search-field">
          {t(language, '搜尋', 'Search')}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(language, '道路、行政區、違規事實、法規或類別', 'Road, district, violation, law, or category')}
          />
        </label>
      </section>

      <section className="summary-grid">
        {[
          [t(language, '符合條件紀錄', 'Matching records'), filtered.length.toLocaleString()],
          [t(language, '已載入明細', 'Loaded detail rows'), records.length.toLocaleString()],
          [t(language, '篩選年度', 'Filtered years'), filteredYears.length ? filteredYears.join(', ') : '—'],
          [t(language, '篩選行政區', 'Filtered districts'), new Set(filtered.map((record) => record.districtName).filter(Boolean)).size.toLocaleString()],
          [
            t(language, '篩選違規類別', 'Filtered categories'),
            new Set(filtered.map((record) => record.violationCategory).filter(Boolean)).size.toLocaleString(),
          ],
          [t(language, '官方總筆數', 'Official total records'), summary.total.toLocaleString()],
          [t(language, '官方資料年度', 'Official dataset years'), summaryYears.length ? summaryYears.join(', ') : '—'],
        ].map(([name, value]) => (
          <article className="metric" key={String(name)}>
            <span>{name}</span>
            <strong>{String(value)}</strong>
          </article>
        ))}
      </section>

      <section className="panel">
        <h3>{t(language, '行政區比較', 'District comparison')}</h3>
        {districtData.map((item) => (
          <div className="bar-row" key={item.name}>
            <span>{item.name}</span>
            <div>
              <i style={{ width: `${(item.count / maxDistrictCount) * 100}%` }} />
            </div>
            <b>{item.count.toLocaleString()}</b>
          </div>
        ))}
        {districtData.length === 0 && <p>{t(language, '沒有符合條件的資料。', 'No matching records.')}</p>}
      </section>

      <section className="panel">
        <h3>{t(language, '違規類別', 'Violation categories')}</h3>
        {categoryData.map((item) => (
          <p key={item.name}>
            {item.name}: {item.count.toLocaleString()}
          </p>
        ))}
        {categoryData.length === 0 && <p>{t(language, '沒有符合條件的資料。', 'No matching records.')}</p>}
      </section>

      <section className="panel">
        <h3>{t(language, '道路名稱彙整', 'Aggregated road-name statistics')}</h3>
        {roadData.map((item) => (
          <p key={item.name}>
            {item.name}: {item.count.toLocaleString()}
          </p>
        ))}
        {roadData.length === 0 && <p>{t(language, '沒有符合條件的資料。', 'No matching records.')}</p>}
      </section>

      <section className="panel table-wrap">
        <p>{t(language, '符合條件的詳細紀錄', 'Matching detailed records')}: {filtered.length.toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              {[
                t(language, '年度', 'Year'),
                t(language, '月份', 'Month'),
                t(language, '時間', 'Time'),
                t(language, '行政區', 'District'),
                t(language, '道路', 'Road'),
                t(language, '違規事實', 'Violation fact'),
                t(language, '法規代碼', 'Law code'),
                t(language, '違規類別', 'Violation category'),
              ].map((name) => (
                <th key={name}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id}>
                <td>{record.year ?? '—'}</td>
                <td>{record.month ?? '—'}</td>
                <td>{record.timeRaw || '—'}</td>
                <td>{record.districtName || '—'}</td>
                <td>{record.roadName || '—'}</td>
                <td>{record.violationFactRaw || '—'}</td>
                <td>{record.lawRaw || '—'}</td>
                <td>{categoryLabel(record.violationCategory, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p>{t(language, '沒有符合條件的資料。', 'No matching records.')}</p>}
      </section>
    </main>
  );
}
