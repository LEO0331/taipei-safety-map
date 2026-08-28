import { useEffect, useMemo, useState } from 'react';
import type { Language } from './types';

type R = {
  id: string;
  period: string | null;
  year: number | null;
  month: number | null;
  monthlyInspectedBusinesses: number | null;
  annualCumulativeInspections: number | null;
  manufacturers: number | null;
  importers: number | null;
  retailers: number | null;
  undenaturedAlcoholBusinesses: number | null;
  calculatedCategoryTotal: number | null;
  categoryTotalMatchesMonthlyTotal: boolean | null;
  dataQualityWarnings: string[];
  originalValues: Record<string, string>;
};

type M = {
  sourceFileUpdatedAt: string;
  updateFrequency: string;
  dataQuality: Record<string, number>;
};

const base = `${import.meta.env.BASE_URL}data/alcohol-tobacco-business-inspections/`;

const t = (language: Language, zh: string, en: string) => (language === 'zh' ? zh : en);
const num = (value: number | null) => (value === null ? '—' : value.toLocaleString());

const categoryLabels: Record<string, [string, string]> = {
  manufacturers: ['製造業者', 'Manufacturers'],
  importers: ['進口業者', 'Importers'],
  retailers: ['販賣業者', 'Retailers'],
  undenaturedAlcoholBusinesses: ['未變性酒精業者', 'Undenatured alcohol businesses'],
};

const qualityLabels: Record<string, [string, string]> = {
  inputRows: ['來源列數', 'Input rows'],
  outputRows: ['輸出列數', 'Output rows'],
  duplicateSourceRows: ['重複來源列', 'Duplicate source rows'],
  invalidStatisticalMonth: ['統計月份格式異常', 'Invalid statistical month'],
  duplicateMonths: ['重複月份', 'Duplicate months'],
  missingMonthlyInspectionCount: ['缺少當月抽檢家數', 'Missing monthly inspection count'],
  malformedCounts: ['統計數值格式異常', 'Malformed counts'],
  missingOrMalformedCategory: ['類別欄位缺漏或格式異常', 'Missing or malformed category count'],
  categoryTotalMismatch: ['業者類別加總與當月抽檢家數不一致', 'Category total mismatches monthly inspections'],
  cumulativeDecreasedWithinYear: ['同年度累計值逆向下降', 'Cumulative total decreased within the year'],
  cumulativeDeltaMismatch: ['累計增量與當月抽檢家數不一致', 'Cumulative delta mismatches monthly inspections'],
  recordsWithWarnings: ['含品質警示的資料列', 'Records with warnings'],
};

const sourceFieldLabels: Record<string, [string, string]> = {
  統計月份: ['統計月份', 'Statistical month'],
  當月抽檢家數: ['當月抽檢家數', 'Monthly inspections'],
  當年度累計抽檢家數: ['當年度累計抽檢家數', 'Annual cumulative inspections'],
  製造業者: ['製造業者', 'Manufacturers'],
  進口業者: ['進口業者', 'Importers'],
  販賣業者: ['販賣業者', 'Retailers'],
  未變性酒精業者: ['未變性酒精業者', 'Undenatured alcohol businesses'],
};

const labelFromMap = (language: Language, key: string, map: Record<string, [string, string]>) => (map[key] ? t(language, ...map[key]) : key);

function SourceFieldList({ language, values }: { language: Language; values: Record<string, string> }) {
  const entries = Object.entries(values).filter(([, value]) => value);

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

export default function AlcoholTobaccoBusinessInspections({ language }: { language: Language }) {
  const [records, setRecords] = useState<R[]>([]);
  const [meta, setMeta] = useState<M | null>(null);
  const [view, setView] = useState('overview');
  const [year, setYear] = useState('all');
  const [minimum, setMinimum] = useState('');
  const [quality, setQuality] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    Promise.all([fetch(base + 'records.json').then((response) => response.json()), fetch(base + 'metadata.json').then((response) => response.json())]).then(([items, metadata]) => {
      setRecords(items);
      setMeta(metadata);
    });
  }, []);

  const years = [...new Set(records.map((record) => record.year).filter((value): value is number => value !== null))].sort((a, b) => a - b);
  const selectedYear = year === 'all' ? (years.at(-1) ?? null) : Number(year);

  const rows = useMemo(
    () => records.filter((record) => (selectedYear === null || record.year === selectedYear) && (!minimum || (record.monthlyInspectedBusinesses ?? -1) >= Number(minimum)) && (!quality || record.dataQualityWarnings.length > 0)),
    [records, selectedYear, minimum, quality],
  );

  const latest = rows.at(-1);
  const byCategory = [
    { key: 'manufacturers', count: latest?.manufacturers ?? 0 },
    { key: 'importers', count: latest?.importers ?? 0 },
    { key: 'retailers', count: latest?.retailers ?? 0 },
    { key: 'undenaturedAlcoholBusinesses', count: latest?.undenaturedAlcoholBusinesses ?? 0 },
  ];
  const max = Math.max(...rows.map((record) => record.monthlyInspectedBusinesses ?? 0), 1);

  const exportCsv = () => {
    const header = ['Month', 'Monthly inspections', 'Annual cumulative', 'Manufacturers', 'Importers', 'Retailers', 'Undenatured alcohol', 'Calculated category total', 'Validation'];
    const csv = [header, ...rows.map((record) => [record.period ?? '', record.monthlyInspectedBusinesses ?? '', record.annualCumulativeInspections ?? '', record.manufacturers ?? '', record.importers ?? '', record.retailers ?? '', record.undenaturedAlcoholBusinesses ?? '', record.calculatedCategoryTotal ?? '', record.dataQualityWarnings.join(';')])]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv' }));
    anchor.download = 'alcohol-tobacco-business-inspections.csv';
    anchor.click();
  };

  if (!meta) {
    return <main className="status-screen">{t(language, '載入中…', 'Loading…')}</main>;
  }

  const label = (zh: string, en: string) => t(language, zh, en);
  const localizedFrequency = language === 'zh' && meta.updateFrequency.includes('/') ? meta.updateFrequency.split('/')[0].trim() : language === 'en' && meta.updateFrequency.includes('/') ? meta.updateFrequency.split('/').at(-1)?.trim() ?? meta.updateFrequency : meta.updateFrequency;
  const topCategory = [...byCategory].sort((a, b) => b.count - a.count)[0];
  const categoryMax = Math.max(...byCategory.map((item) => item.count), 1);

  const tabs = [
    ['overview', '總覽', 'Overview'],
    ['trend', '每月趨勢', 'Monthly Trend'],
    ['categories', '業者類別', 'Business Categories'],
    ['cumulative', '年度累計', 'Annual Progress'],
    ['comparison', '年度比較', 'Historical Comparison'],
    ['table', '資料表', 'Data Table'],
    ['quality', '資料品質', 'Data Quality'],
    ['notes', '資料說明', 'Data Notes'],
  ];

  return (
    <main className="overview appeal-trends">
      <section className="hero">
        <p className="eyebrow">{label('消費安全 · 菸酒管理', 'Consumer Safety · Tobacco & Alcohol Regulation')}</p>
        <h2>{label('菸酒業者抽檢統計', 'Tobacco and Alcohol Business Inspections')}</h2>
        <p className="notice">{label('本資料為彙整抽檢活動統計，不識別個別業者，也不代表違規、產品安全、業者合規或地理風險。', 'These are aggregate inspection-activity statistics. They do not identify businesses or measure violations, product safety, compliance, or geographic risk.')}</p>
      </section>

      <div className="tabs sub-tabs">
        {tabs.map(([id, zh, en]) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
            {label(zh, en)}
          </button>
        ))}
      </div>

      <section className="filter-panel health-filters">
        <label>
          {label('年度', 'Year')}
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">{label('最新年度', 'Latest year')}</option>
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          {label('最低當月抽檢家數', 'Minimum monthly inspections')}
          <input type="number" min="0" value={minimum} onChange={(event) => setMinimum(event.target.value)} />
        </label>
        <label>
          <input type="checkbox" checked={quality} onChange={(event) => setQuality(event.target.checked)} />
          {label('僅顯示品質警示', 'Data-quality warnings only')}
        </label>
      </section>

      {view === 'overview' && (
        <>
          <section className="summary-grid">
            {[
              [label('最新月份', 'Latest month'), latest?.period ?? '—'],
              [label('最新當月抽檢', 'Latest monthly inspections'), num(latest?.monthlyInspectedBusinesses ?? null)],
              [label('當年累計抽檢', 'Current-year cumulative'), num(latest?.annualCumulativeInspections ?? null)],
              [label('製造業者', 'Manufacturers'), num(latest?.manufacturers ?? null)],
              [label('進口業者', 'Importers'), num(latest?.importers ?? null)],
              [label('販賣業者', 'Retailers'), num(latest?.retailers ?? null)],
              [label('未變性酒精業者', 'Undenatured alcohol businesses'), num(latest?.undenaturedAlcoholBusinesses ?? null)],
              [label('本年最高當月值', 'Peak month'), num(Math.max(...rows.map((record) => record.monthlyInspectedBusinesses ?? 0), 0))],
              [label('本年月平均', 'Year-to-date average'), rows.length ? (rows.reduce((sum, record) => sum + (record.monthlyInspectedBusinesses ?? 0), 0) / rows.length).toFixed(1) : '—'],
              [label('可用月份', 'Months available'), rows.length],
            ].map(([name, value]) => (
              <article className="metric" key={String(name)}>
                <span>{name}</span>
                <strong>{String(value)}</strong>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>{label('動態洞察', 'Insights')}</h3>
            <p>{latest && label(`${latest.period} 有 ${num(latest.monthlyInspectedBusinesses)} 家菸酒業者抽檢紀錄。`, `${latest.period} records ${num(latest.monthlyInspectedBusinesses)} tobacco and alcohol business inspections.`)}</p>
            <p>{topCategory && label(`最新月份以${labelFromMap(language, topCategory.key, categoryLabels)}最多；這只描述抽檢組成，不代表違規風險。`, `The latest month is led by ${labelFromMap(language, topCategory.key, categoryLabels)}; this describes inspection composition, not violation risk.`)}</p>
          </section>
        </>
      )}

      {view === 'trend' && (
        <section className="panel">
          <h3>{label('每月抽檢家數', 'Monthly inspection trend')}</h3>
          {rows.map((record) => (
            <div className="bar-row" key={record.id}>
              <span>{record.period}</span>
              <div>
                <i style={{ width: `${((record.monthlyInspectedBusinesses ?? 0) / max) * 100}%` }} />
              </div>
              <b>{num(record.monthlyInspectedBusinesses)}</b>
            </div>
          ))}
        </section>
      )}

      {view === 'categories' && (
        <section className="panel">
          <h3>{label('最新月份業者類別', 'Latest-month business categories')}</h3>
          {byCategory.map((item) => (
            <div className="bar-row" key={item.key}>
              <span>{labelFromMap(language, item.key, categoryLabels)}</span>
              <div>
                <i style={{ width: `${(item.count / categoryMax) * 100}%` }} />
              </div>
              <b>{item.count.toLocaleString()}</b>
            </div>
          ))}
        </section>
      )}

      {view === 'cumulative' && (
        <section className="panel">
          <h3>{label('年度累計進度', 'Annual cumulative progress')}</h3>
          {rows.map((record) => (
            <div className="bar-row" key={record.id}>
              <span>{record.period}</span>
              <div>
                <i style={{ width: `${((record.annualCumulativeInspections ?? 0) / Math.max(...rows.map((item) => item.annualCumulativeInspections ?? 0), 1)) * 100}%` }} />
              </div>
              <b>{num(record.annualCumulativeInspections)}</b>
            </div>
          ))}
        </section>
      )}

      {view === 'comparison' && (
        <section className="panel">
          <h3>{label('年度比較（由當月值計算）', 'Year comparison (calculated from monthly values)')}</h3>
          {years.map((value) => {
            const list = records.filter((record) => record.year === value && record.monthlyInspectedBusinesses !== null);
            return (
              <p key={value}>
                {value}: {label('年度抽檢總計', 'Annual total')} <strong>{list.reduce((sum, record) => sum + (record.monthlyInspectedBusinesses ?? 0), 0).toLocaleString()}</strong> · {label('平均', 'Average')}{' '}
                {list.length ? (list.reduce((sum, record) => sum + (record.monthlyInspectedBusinesses ?? 0), 0) / list.length).toFixed(1) : '—'}
              </p>
            );
          })}
        </section>
      )}

      {view === 'table' && (
        <section className="panel table-wrap">
          <button onClick={exportCsv}>{label('下載篩選 CSV', 'Download filtered CSV')}</button>
          <table>
            <thead>
              <tr>
                {[label('統計月份', 'Month'), label('當月抽檢家數', 'Monthly'), label('當年度累計抽檢家數', 'Annual cumulative'), label('製造業者', 'Manufacturers'), label('進口業者', 'Importers'), label('販賣業者', 'Retailers'), label('未變性酒精業者', 'Undenatured alcohol businesses'), label('業者類別加總', 'Calculated category total'), label('資料品質', 'Validation')].map((value) => (
                  <th key={value}>{value}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 20, page * 20 + 20).map((record) => (
                <tr key={record.id}>
                  <td>
                    <details>
                      <summary>{record.period ?? '—'}</summary>
                      <SourceFieldList language={language} values={record.originalValues} />
                    </details>
                  </td>
                  <td>{num(record.monthlyInspectedBusinesses)}</td>
                  <td>{num(record.annualCumulativeInspections)}</td>
                  <td>{num(record.manufacturers)}</td>
                  <td>{num(record.importers)}</td>
                  <td>{num(record.retailers)}</td>
                  <td>{num(record.undenaturedAlcoholBusinesses)}</td>
                  <td>{num(record.calculatedCategoryTotal)}</td>
                  <td>{record.dataQualityWarnings.length ? record.dataQualityWarnings.map((item) => labelFromMap(language, item, qualityLabels)).join('、') : t(language, '正常', 'OK')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="filter-panel">
            <button disabled={!page} onClick={() => setPage(page - 1)}>
              {label('上一頁', 'Previous')}
            </button>
            <span>
              {page + 1} / {Math.max(1, Math.ceil(rows.length / 20))}
            </span>
            <button disabled={(page + 1) * 20 >= rows.length} onClick={() => setPage(page + 1)}>
              {label('下一頁', 'Next')}
            </button>
          </div>
        </section>
      )}

      {view === 'quality' && (
        <section className="panel">
          <h3>{label('資料品質', 'Data Quality')}</h3>
          <ul>
            {Object.entries(meta.dataQuality).map(([key, value]) => (
              <li key={key}>
                {labelFromMap(language, key, qualityLabels)}: <strong>{value}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === 'notes' && (
        <section className="panel">
          <h3>{label('資料說明與限制', 'Data notes and limitations')}</h3>
          <p>{label('本資料為財政局按月發布的菸酒業者抽檢家數統計，包含製造、進口、販賣與未變性酒精業者。它不衡量違規、違規率、罰則、產品安全、合規性或執法績效。', 'This dataset contains monthly Department of Finance inspection counts for tobacco and alcohol businesses. It does not measure violations, violation rates, penalties, product safety, compliance, or enforcement performance.')}</p>
          <a href="https://data.taipei/dataset/detail?id=d3f0c616-c57b-4f70-96b4-9c9fa1cfa080" target="_blank" rel="noreferrer">
            {label('官方資料來源', 'Official source')}
          </a>{' '}
          · {label('更新頻率', 'Update frequency')}: {localizedFrequency} · {label('檔案更新', 'File update')}: {meta.sourceFileUpdatedAt}
        </section>
      )}
    </main>
  );
}
