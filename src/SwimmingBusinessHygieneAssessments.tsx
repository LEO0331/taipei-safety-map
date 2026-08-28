import { useEffect, useMemo, useState } from 'react';
import type { Language } from './types';

type Validity = 'valid' | 'expiring_soon' | 'expired' | 'unknown';

type RecordItem = {
  id: string;
  businessName: string;
  businessAddress: string;
  districtName: string;
  applicationCategory: string;
  assessmentResult: string;
  validUntilRaw: string;
  validUntil: string | null;
  validityStatus: Validity;
  externalMapQuery: string;
  originalValues: Record<string, string>;
};

type Metadata = {
  sourceFileUpdatedAt: string;
  metadataUpdatedAt: string;
  dataQuality: Record<string, number>;
};

const base = `${import.meta.env.BASE_URL}data/swimming-business-hygiene-assessments/`;

const validityLabels: Record<Validity, [string, string]> = {
  valid: ['依來源日期仍在有效期內', 'Within recorded validity period'],
  expiring_soon: ['90 天內到期', 'Expires within 90 days'],
  expired: ['依來源日期已到期', 'Past recorded validity date'],
  unknown: ['有效日期不明', 'Validity date unknown'],
};

const qualityLabels: Record<string, [string, string]> = {
  inputRows: ['來源列數', 'Input rows'],
  outputRows: ['輸出列數', 'Output rows'],
  exactDuplicateRows: ['完全重複列', 'Exact duplicate rows'],
  missingBusinessName: ['缺少業者名稱', 'Missing business name'],
  missingAddress: ['缺少營業場所地址', 'Missing address'],
  unresolvedDistrict: ['無法解析行政區', 'Unresolved district'],
  missingApplicationCategory: ['缺少報名類別', 'Missing application category'],
  missingAssessmentResult: ['缺少評核結果', 'Missing assessment result'],
  malformedValidityDate: ['有效日期格式異常', 'Malformed validity date'],
};

const sourceFieldLabels: Record<string, [string, string]> = {
  報名類別: ['報名類別', 'Application category'],
  業者名稱: ['業者名稱', 'Business name'],
  營業場所地址: ['營業場所地址', 'Business address'],
  評核結果: ['評核結果', 'Assessment result'],
  有效日期: ['有效日期', 'Valid-until date'],
};

const t = (language: Language, zh: string, en: string) => (language === 'zh' ? zh : en);

const group = (records: RecordItem[], key: (record: RecordItem) => string) =>
  Object.entries(records.reduce<Record<string, number>>((all, record) => ({ ...all, [key(record)]: (all[key(record)] ?? 0) + 1 }), {}));

const labelFromMap = (language: Language, value: string, map: Record<string, [string, string]>) =>
  map[value] ? t(language, ...map[value]) : value;

function SourceFieldList({ language, values }: { language: Language; values: Record<string, string> }) {
  const entries = Object.entries(values).filter(([, value]) => value);
  if (!entries.length) {
    return <p>{t(language, '沒有原始欄位內容。', 'No source fields available.')}</p>;
  }

  return (
    <ul>
      {entries.map(([key, value]) => (
        <li key={key}>
          {labelFromMap(language, key, sourceFieldLabels)}
          {language === 'zh' ? '：' : ': '}
          {value}
        </li>
      ))}
    </ul>
  );
}

export default function SwimmingBusinessHygieneAssessments({ language }: { language: Language }) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('all');
  const [result, setResult] = useState('all');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('find');

  useEffect(() => {
    Promise.all([fetch(base + 'records.json').then((response) => response.json()), fetch(base + 'metadata.json').then((response) => response.json())]).then(([items, meta]) => {
      setRecords(items);
      setMetadata(meta);
    });
  }, []);

  const rows = useMemo(
    () =>
      records.filter(
        (record) =>
          (district === 'all' || record.districtName === district) &&
          (result === 'all' || record.assessmentResult === result) &&
          (status === 'all' || record.validityStatus === status) &&
          [record.businessName, record.businessAddress, record.districtName, record.assessmentResult, record.applicationCategory].join(' ').toLowerCase().includes(query.toLowerCase()),
      ),
    [records, district, result, status, query],
  );

  const choices = (key: keyof RecordItem) => [...new Set(records.map((record) => record[key]).filter(Boolean) as string[])].sort();

  const download = () => {
    const csv = [
      ['Business', 'Category', 'Result', 'Valid until', 'Status', 'District', 'Address'],
      ...rows.map((record) => [record.businessName, record.applicationCategory, record.assessmentResult, record.validUntilRaw, validityLabels[record.validityStatus][1], record.districtName, record.businessAddress]),
    ]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv' }));
    anchor.download = 'swimming-assessments.csv';
    anchor.click();
  };

  if (!metadata) {
    return <main className="status-screen">{t(language, '載入中…', 'Loading…')}</main>;
  }

  return (
    <main className="overview appeal-trends">
      <section className="hero">
        <p className="eyebrow">{t(language, '公共衛生 · 營業衛生 · 運動場館', 'Public Health · Business Hygiene · Sports Facilities')}</p>
        <h2>{t(language, '游泳業衛生自主管理評核', 'Swimming Facility Hygiene Assessments')}</h2>
        <p className="notice">{t(language, '本資料為行政評核紀錄，不代表即時水質、設施安全、目前營業或政府推薦。', 'Administrative assessment records only; not real-time water quality, safety, operation, or endorsement.')}</p>
      </section>

      <div className="tabs sub-tabs">
        {[
          ['find', '尋找游泳場所', 'Find a Swimming Facility'],
          ['overview', '評核概覽', 'Assessment Overview'],
          ['directory', '場所清冊', 'Facility Directory'],
          ['results', '評核結果', 'Assessment Results'],
          ['quality', '資料品質', 'Data Quality'],
          ['notes', '資料說明', 'Data Notes'],
        ].map(([id, zh, en]) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
            {t(language, zh, en)}
          </button>
        ))}
      </div>

      <section className="filter-panel health-filters">
        <Select language={language} label={t(language, '行政區', 'District')} value={district} setValue={setDistrict} options={choices('districtName')} />
        <Select language={language} label={t(language, '評核結果', 'Assessment result')} value={result} setValue={setResult} options={choices('assessmentResult')} />
        <Select language={language} label={t(language, '有效狀態', 'Recorded validity status')} value={status} setValue={setStatus} options={Object.keys(validityLabels)} />
      </section>

      <label className="search-field">
        {t(language, '搜尋游泳場所', 'Find a facility')}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t(language, '業者名稱、地址或行政區', 'Business, address, or district')} />
      </label>

      {view === 'find' && (
        <>
          <section className="summary-grid">
            {[
              [t(language, '符合條件紀錄', 'Matching records'), rows.length],
              [t(language, '不同業者', 'Unique businesses'), new Set(rows.map((record) => record.businessName)).size],
              [t(language, '依來源日期有效', 'Within recorded validity'), rows.filter((record) => record.validityStatus === 'valid').length],
            ].map(([name, value]) => (
              <article className="metric" key={String(name)}>
                <span>{name}</span>
                <strong>{String(value)}</strong>
              </article>
            ))}
          </section>

          {rows.map((record) => (
            <section className="panel" key={record.id}>
              <h3>{record.businessName || '—'}</h3>
              <p>
                {t(language, '衛生自主管理評核結果：', 'Assessment result: ')}
                <strong>{record.assessmentResult || '—'}</strong>
              </p>
              <p>
                {t(language, '有效日期：', 'Valid until: ')}
                {record.validUntil || '—'} · {t(language, ...validityLabels[record.validityStatus])}
              </p>
              <p>
                {record.districtName || '—'} · {record.businessAddress || '—'}
              </p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.externalMapQuery)}`} target="_blank" rel="noreferrer">
                {t(language, '外部地圖查詢', 'External map lookup')}
              </a>
            </section>
          ))}
        </>
      )}

      {view === 'overview' && <Bars title={t(language, '行政區紀錄分布', 'Records by district')} data={group(rows, (record) => record.districtName || '—')} />}
      {view === 'results' && <Bars title={t(language, '官方評核結果分布', 'Official assessment result distribution')} data={group(rows, (record) => record.assessmentResult || '—')} />}

      {view === 'directory' && (
        <section className="panel table-wrap">
          <button onClick={download}>{t(language, '下載篩選 CSV', 'Download filtered CSV')}</button>
          <table>
            <thead>
              <tr>
                {[t(language, '業者', 'Business'), t(language, '報名類別', 'Category'), t(language, '評核結果', 'Result'), t(language, '有效日期', 'Valid until'), t(language, '有效狀態', 'Status'), t(language, '行政區', 'District'), t(language, '地址', 'Address')].map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((record) => (
                <tr key={record.id}>
                  <td>
                    <details>
                      <summary>{record.businessName || '—'}</summary>
                      <SourceFieldList language={language} values={record.originalValues} />
                    </details>
                  </td>
                  <td>{record.applicationCategory || '—'}</td>
                  <td>{record.assessmentResult || '—'}</td>
                  <td>{record.validUntilRaw || '—'}</td>
                  <td>{t(language, ...validityLabels[record.validityStatus])}</td>
                  <td>{record.districtName || '—'}</td>
                  <td>{record.businessAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {view === 'quality' && (
        <section className="panel">
          <h3>{t(language, '資料品質', 'Data Quality')}</h3>
          <ul>
            {Object.entries(metadata.dataQuality).map(([key, value]) => (
              <li key={key}>
                {labelFromMap(language, key, qualityLabels)}: <strong>{value}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === 'notes' && (
        <section className="panel">
          <p>{t(language, '有效狀態僅依來源日期計算，並非即時資格查核。地址僅供外部文字地圖查詢，未自動地理編碼。', 'Validity status is calculated from the source date only, not live verification. Addresses are external text map lookups only; no automatic geocoding.')}</p>
        </section>
      )}
    </main>
  );
}

function Select({
  language,
  label,
  value,
  setValue,
  options,
}: {
  language: Language;
  label: string;
  value: string;
  setValue: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => setValue(event.target.value)}>
        <option value="all">{t(language, '全部', 'All')}</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {validityLabels[option as Validity] ? t(language, ...validityLabels[option as Validity]) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Bars({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(...data.map(([, count]) => count), 1);
  return (
    <section className="panel">
      <h3>{title}</h3>
      {data.map(([name, count]) => (
        <div className="bar-row" key={name}>
          <span>{name}</span>
          <div>
            <i style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <b>{count}</b>
        </div>
      ))}
    </section>
  );
}
