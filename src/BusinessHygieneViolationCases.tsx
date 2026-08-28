import { useEffect, useMemo, useState } from 'react';
import type { Language } from './types';

type RecordItem = {
  id: string;
  sourceSequenceNumber: string;
  dateRaw: string;
  date: string | null;
  gregorianYear: number | null;
  month: number | null;
  violationDescription: string;
  fineAmountTwd: number | null;
  penaltyNote: string;
  violationKeywords: string[];
  penaltyReferences: string[];
  hasValidFine: boolean;
  hasPenaltyNote: boolean;
  dataQualityWarnings: string[];
  originalValues: Record<string, string>;
};

type Metadata = {
  recordCount: number;
  latestValidDate: string | null;
  sourceFileUpdatedAt: string;
  metadataUpdatedAt: string;
  dataQuality: Record<string, number>;
};

const base = `${import.meta.env.BASE_URL}data/business-hygiene-violation-cases/`;

const categoryLabels: Record<string, [string, string]> = {
  water_quality: ['水質', 'Water quality'],
  staff_hygiene: ['從業人員衛生', 'Staff hygiene'],
  pest_control: ['病媒防治', 'Pest control'],
  cleaning_disinfection: ['清潔／消毒', 'Cleaning / disinfection'],
  sanitation_equipment: ['衛生設備', 'Sanitation equipment'],
  administrative: ['管理／紀錄', 'Administrative'],
  other: ['其他（依文字分類）', 'Other (text-derived)'],
  unknown: ['未分類', 'Unknown'],
};

const qualityLabels: Record<string, [string, string]> = {
  inputRows: ['來源列數', 'Input rows'],
  outputRows: ['輸出列數', 'Output rows'],
  exactDuplicateRows: ['完全重複列', 'Exact duplicate rows'],
  missingSequenceNumber: ['缺少來源項次', 'Missing source sequence number'],
  duplicateSequenceNumbers: ['重複來源項次', 'Duplicate source sequence numbers'],
  malformedDate: ['日期格式異常', 'Malformed date'],
  missingViolationDescription: ['缺少違規情節', 'Missing violation description'],
  missingFineAmount: ['缺少罰鍰金額', 'Missing fine amount'],
  malformedFineAmount: ['罰鍰金額格式異常', 'Malformed fine amount'],
  missingPenaltyNote: ['缺少罰則註記', 'Missing penalty note'],
  unusuallyLargeFine: ['異常偏大罰鍰', 'Unusually large fine'],
  unknownDerivedCategory: ['無法歸類的文字分類', 'Unknown derived category'],
};

const sourceFieldLabels: Record<string, [string, string]> = {
  項次: ['項次', 'Source sequence number'],
  日期: ['日期', 'Source date'],
  違規情節: ['違規情節', 'Violation circumstances'],
  罰鍰金額數: ['罰鍰金額數', 'Fine amount'],
  罰則註記: ['罰則註記', 'Penalty note'],
};

const t = (language: Language, zh: string, en: string) => (language === 'zh' ? zh : en);

const money = (value: number | null) =>
  value === null ? '—' : value.toLocaleString('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 });

const median = (items: number[]) => {
  const sorted = [...items].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

const grouped = <T,>(items: T[], key: (item: T) => string, value: (item: T) => number = () => 1) =>
  Object.entries(
    items.reduce<Record<string, number>>((all, item) => ({ ...all, [key(item)]: (all[key(item)] ?? 0) + value(item) }), {}),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

const labelFromMap = (language: Language, value: string, map: Record<string, [string, string]>) =>
  map[value] ? t(language, ...map[value]) : value;

const renderListLabel = (language: Language, label: string, value: string) =>
  `${label}${language === 'zh' ? '：' : ': '}${value || '—'}`;

function SourceFieldList({
  language,
  values,
}: {
  language: Language;
  values: Record<string, string>;
}) {
  const entries = Object.entries(values).filter(([, value]) => value);
  if (!entries.length) {
    return <p>{t(language, '沒有原始欄位內容。', 'No source fields available.')}</p>;
  }

  return (
    <ul>
      {entries.map(([key, value]) => (
        <li key={key}>{renderListLabel(language, labelFromMap(language, key, sourceFieldLabels), value)}</li>
      ))}
    </ul>
  );
}

export default function BusinessHygieneViolationCases({ language }: { language: Language }) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [view, setView] = useState('overview');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [category, setCategory] = useState('all');
  const [fine, setFine] = useState('all');
  const [note, setNote] = useState('all');
  const [reference, setReference] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'date' | 'fine'>('date');
  const [page, setPage] = useState(0);

  useEffect(() => {
    Promise.all([fetch(base + 'records.json').then((response) => response.json()), fetch(base + 'metadata.json').then((response) => response.json())]).then(
      ([items, meta]) => {
        setRecords(items);
        setMetadata(meta);
      },
    );
  }, []);

  const years = [...new Set(records.map((record) => record.gregorianYear).filter((value): value is number => value !== null))].sort();
  const categories = [...new Set(records.flatMap((record) => record.violationKeywords))].sort();
  const references = [...new Set(records.flatMap((record) => record.penaltyReferences))].sort();

  const rows = useMemo(
    () =>
      records
        .filter(
          (record) =>
            (year === 'all' || String(record.gregorianYear) === year) &&
            (month === 'all' || String(record.month) === month) &&
            (category === 'all' || record.violationKeywords.includes(category)) &&
            (fine === 'all' || (fine === 'valid' ? record.hasValidFine : !record.hasValidFine)) &&
            (note === 'all' || (note === 'yes' ? record.hasPenaltyNote : !record.hasPenaltyNote)) &&
            (reference === 'all' || record.penaltyReferences.includes(reference)) &&
            (!query ||
              [record.sourceSequenceNumber, record.dateRaw, record.violationDescription, record.penaltyNote, ...record.penaltyReferences]
                .join(' ')
                .toLowerCase()
                .includes(query.toLowerCase())),
        )
        .sort((a, b) => (sort === 'fine' ? (b.fineAmountTwd ?? -1) - (a.fineAmountTwd ?? -1) : (b.date ?? '').localeCompare(a.date ?? ''))),
    [records, year, month, category, fine, note, reference, query, sort],
  );

  const fines = rows.flatMap((record) => (record.fineAmountTwd === null ? [] : [record.fineAmountTwd]));
  const categoryData = grouped(rows.flatMap((record) => record.violationKeywords), (value) => value);
  const monthly = grouped(
    rows.filter((record) => record.date),
    (record) => record.date!.slice(0, 7),
  );
  const refData = grouped(rows.flatMap((record) => record.penaltyReferences), (value) => value);
  const maxFine = Math.max(...fines, 0);
  const topCategory = categoryData[0];

  const exportCsv = () => {
    const header = ['Source sequence number', 'Source date', 'Gregorian date (derived)', 'Violation circumstances', 'Derived category', 'Fine TWD', 'Penalty note', 'Extracted references', 'Data quality'];
    const content = [header, ...rows.map((record) => [record.sourceSequenceNumber, record.dateRaw, record.date ?? '', record.violationDescription, record.violationKeywords.join('; '), record.fineAmountTwd ?? '', record.penaltyNote, record.penaltyReferences.join('; '), record.dataQualityWarnings.join('; ')])]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }));
    link.download = 'business-hygiene-violation-cases.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };

  if (!metadata) {
    return <main className="status-screen">{t(language, '載入中…', 'Loading…')}</main>;
  }

  const tabs = [
    ['overview', '執法概覽', 'Enforcement Overview'],
    ['trends', '違規趨勢', 'Violation Trends'],
    ['types', '違規類型', 'Violation Types'],
    ['fines', '罰鍰分析', 'Fine Analysis'],
    ['references', '罰則依據', 'Penalty References'],
    ['directory', '案件清單', 'Case Directory'],
    ['quality', '資料品質', 'Data Quality'],
    ['notes', '資料說明', 'Data Notes'],
  ];

  return (
    <main className="overview appeal-trends">
      <section className="hero">
        <p className="eyebrow">{t(language, '公共衛生 · 營業衛生 · 歷史裁處', 'Public Health · Business Hygiene · Historical Enforcement')}</p>
        <h2>{t(language, '營業衛生違規案件', 'Business Hygiene Violation Cases')}</h2>
        <p className="notice">
          {t(
            language,
            '本資料為臺北市政府衛生局已確認的歷史行政裁處紀錄；不表示目前違規、目前衛生狀況、後續結果或罰鍰繳納狀態。',
            'These are historical confirmed administrative enforcement records. They do not establish a current violation, hygiene condition, subsequent outcome, or fine-payment status.',
          )}
        </p>
      </section>

      <div className="tabs sub-tabs">
        {tabs.map(([id, zh, en]) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
            {t(language, zh, en)}
          </button>
        ))}
      </div>

      <section className="filter-panel health-filters">
        <Filter language={language} label={t(language, '年份（推導）', 'Gregorian year (derived)')} value={year} set={setYear} options={years.map(String)} />
        <Filter language={language} label={t(language, '月份', 'Month')} value={month} set={setMonth} options={Array.from({ length: 12 }, (_, index) => String(index + 1))} />
        <Filter language={language} label={t(language, '文字分類', 'Text-derived category')} value={category} set={setCategory} options={categories} display={(value) => labelFromMap(language, value, categoryLabels)} />
        <Filter language={language} label={t(language, '罰鍰', 'Fine')} value={fine} set={setFine} options={['valid', 'missing']} display={(value) => t(language, value === 'valid' ? '有效金額' : '缺漏／無效金額', value === 'valid' ? 'Valid fine' : 'Missing / invalid fine')} />
        <Filter language={language} label={t(language, '罰則註記', 'Penalty note')} value={note} set={setNote} options={['yes', 'no']} display={(value) => t(language, value === 'yes' ? '有' : '無', value === 'yes' ? 'Present' : 'Missing')} />
        <Filter language={language} label={t(language, '法規參照', 'Penalty reference')} value={reference} set={setReference} options={references} />
        <label className="search-field">
          {t(language, '搜尋', 'Search')}
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder={t(language, '項次、日期、違規情節或罰則註記', 'ID, date, violation text, or penalty note')}
          />
        </label>
      </section>

      {view === 'overview' && (
        <>
          <section className="summary-grid">
            {[
              [t(language, '來源紀錄數', 'Source records'), rows.length],
              [t(language, '有效日期案件', 'Valid dated cases'), rows.filter((record) => record.date).length],
              [t(language, '最新來源案件日期', 'Latest source-recorded case date'), rows.filter((record) => record.date).map((record) => record.date).sort().at(-1) ?? '—'],
              [t(language, '來源記載罰鍰總額', 'Total source-recorded fines'), money(fines.reduce((sum, value) => sum + value, 0))],
              [t(language, '罰鍰中位數', 'Median fine'), money(median(fines))],
              [t(language, '平均罰鍰', 'Average fine'), money(fines.length ? fines.reduce((sum, value) => sum + value, 0) / fines.length : null)],
              [t(language, '最高罰鍰', 'Maximum fine'), money(maxFine || null)],
              [t(language, '有違規情節', 'Cases with violation description'), rows.filter((record) => record.violationDescription).length],
              [t(language, '有罰則註記', 'Cases with penalty note'), rows.filter((record) => record.hasPenaltyNote).length],
              [t(language, '衍生分類數', 'Unique derived categories'), categoryData.length],
              [t(language, '資源更新', 'Resource update'), metadata.sourceFileUpdatedAt],
            ].map(([name, value]) => (
              <article className="metric" key={String(name)}>
                <span>{name}</span>
                <strong>{String(value)}</strong>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>{t(language, '資料觀察', 'Insights')}</h3>
            <p>
              {topCategory &&
                t(
                  language,
                  `目前篩選結果中，最常見的違規文字分類為「${labelFromMap(language, topCategory.name, categoryLabels)}」，出現於 ${topCategory.count} 件。`,
                  `The most frequent violation-text category in the current results is ${labelFromMap(language, topCategory.name, categoryLabels)}, appearing in ${topCategory.count} cases.`,
                )}
            </p>
            <p>
              {t(
                language,
                `有效罰鍰金額 ${fines.length} 筆；中位數為 ${money(median(fines))}。金額分布是來源記載，並非衛生風險嚴重度。`,
                `There are ${fines.length} valid source-recorded fines; the median is ${money(median(fines))}. Fine amounts are not a measure of hygiene-risk severity.`,
              )}
            </p>
          </section>
        </>
      )}

      {view === 'trends' && <Bars title={t(language, '每月案件數', 'Cases by month')} data={monthly} />}
      {view === 'types' && <Bars title={t(language, '依違規文字衍生分類的案件數', 'Cases by text-derived violation category')} data={categoryData.map((item) => ({ ...item, name: labelFromMap(language, item.name, categoryLabels) }))} />}
      {view === 'fines' && (
        <Bars
          title={t(language, '依文字分類的來源記載罰鍰', 'Source-recorded fines by text-derived category')}
          prefix="NT$"
          data={categoryData.map((item) => ({
            name: labelFromMap(language, item.name, categoryLabels),
            count: rows.filter((record) => record.violationKeywords.includes(item.name)).reduce((sum, record) => sum + (record.fineAmountTwd ?? 0), 0),
          }))}
        />
      )}
      {view === 'references' && <Bars title={t(language, '常見罰則參照', 'Most frequent extracted penalty references')} data={refData} />}

      {view === 'directory' && (
        <section className="panel table-wrap">
          <div className="filter-panel">
            <button onClick={exportCsv}>{t(language, '下載篩選後 CSV', 'Download filtered CSV')}</button>
            <button onClick={() => setSort(sort === 'date' ? 'fine' : 'date')}>
              {t(language, sort === 'date' ? '依罰鍰排序' : '依日期排序', sort === 'date' ? 'Sort by fine' : 'Sort by date')}
            </button>
          </div>

          <table>
            <thead>
              <tr>
                {[t(language, '項次／ID', 'Source ID'), t(language, '日期', 'Date'), t(language, '推導日期', 'Gregorian date'), t(language, '違規情節', 'Violation circumstances'), t(language, '衍生分類', 'Derived category'), t(language, '罰鍰', 'Fine'), t(language, '罰則註記', 'Penalty note'), t(language, '法規參照', 'References'), t(language, '資料品質', 'Data quality')].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 15, page * 15 + 15).map((record) => (
                <tr key={record.id}>
                  <td>
                    <details>
                      <summary>{record.sourceSequenceNumber || '—'}</summary>
                      <SourceFieldList language={language} values={record.originalValues} />
                    </details>
                  </td>
                  <td>{record.dateRaw || '—'}</td>
                  <td>{record.date ?? '—'}</td>
                  <td>
                    <details>
                      <summary>
                        {record.violationDescription.slice(0, 55) || '—'}
                        {record.violationDescription.length > 55 ? '…' : ''}
                      </summary>
                      {record.violationDescription}
                    </details>
                  </td>
                  <td>{record.violationKeywords.map((value) => labelFromMap(language, value, categoryLabels)).join(', ')}</td>
                  <td>{money(record.fineAmountTwd)}</td>
                  <td>
                    <details>
                      <summary>
                        {record.penaltyNote.slice(0, 35) || '—'}
                        {record.penaltyNote.length > 35 ? '…' : ''}
                      </summary>
                      {record.penaltyNote}
                    </details>
                  </td>
                  <td>{record.penaltyReferences.join('; ') || '—'}</td>
                  <td>{record.dataQualityWarnings.length ? record.dataQualityWarnings.map((value) => labelFromMap(language, value, qualityLabels)).join('、') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="filter-panel">
            <button disabled={!page} onClick={() => setPage(page - 1)}>
              {t(language, '上一頁', 'Previous')}
            </button>
            <span>
              {page + 1} / {Math.max(1, Math.ceil(rows.length / 15))}
            </span>
            <button disabled={(page + 1) * 15 >= rows.length} onClick={() => setPage(page + 1)}>
              {t(language, '下一頁', 'Next')}
            </button>
          </div>
        </section>
      )}

      {view === 'quality' && (
        <section className="panel">
          <h3>{t(language, '資料品質', 'Data Quality')}</h3>
          <p>{t(language, '資料轉換不會靜默修改來源內容；缺失、格式錯誤與重複檢查如下。', 'The conversion does not silently modify source content. Missing, malformed, and duplicate checks are listed below.')}</p>
          <ul>
            {Object.entries(metadata.dataQuality).map(([name, value]) => (
              <li key={name}>
                {labelFromMap(language, name, qualityLabels)}: <strong>{value}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === 'notes' && (
        <section className="panel">
          <h3>{t(language, '資料說明', 'Data Notes')}</h3>
          <p>{t(language, '來源欄位均以字串保存。民國日期僅在完整且可驗證時推導為西元日期；罰鍰僅解析明確的非負金額。文字分類與法規參照皆為透明的分析轉換，原始違規情節與罰則註記始終可在案件清單中查看。', 'All source fields are preserved as strings. ROC dates are converted only when complete and valid, and only clearly non-negative monetary amounts are parsed. Text categories and penalty references are transparent analytical transformations; complete source text remains available in the directory.')}</p>
          <p>{t(language, '本模組不提供地圖：公開來源沒有可供繪製的權威座標。', 'This module has no map layer: the published source provides no authoritative coordinates for mapping.')}</p>
          <a href="https://data.taipei/dataset/detail?id=cbeb7c62-85c8-4e1f-9d5e-bcb43339196b" target="_blank" rel="noreferrer">
            {t(language, '官方資料來源', 'Official data source')}
          </a>{' '}
          · {t(language, '詮釋資料更新', 'Metadata updated')}: {metadata.metadataUpdatedAt}
        </section>
      )}
    </main>
  );
}

function Filter({
  language,
  label,
  value,
  set,
  options,
  display = (item: string) => item,
}: {
  language: Language;
  label: string;
  value: string;
  set: (value: string) => void;
  options: string[];
  display?: (value: string) => string;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => set(event.target.value)}>
        <option value="all">{t(language, '全部', 'All')}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {display(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Bars({ title, data, prefix = '' }: { title: string; data: { name: string; count: number }[]; prefix?: string }) {
  const max = Math.max(...data.map((item) => item.count), 1);
  return (
    <section className="panel">
      <h3>{title}</h3>
      {data
        .filter((item) => item.count)
        .map((item) => (
          <div className="bar-row" key={item.name}>
            <span>{item.name}</span>
            <div>
              <i style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
            <b>
              {prefix}
              {item.count.toLocaleString()}
            </b>
          </div>
        ))}
    </section>
  );
}
