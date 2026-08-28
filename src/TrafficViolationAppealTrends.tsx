import { useEffect, useMemo, useState } from 'react';
import type { Language } from './types';

type AppealRecord = {
  id: string;
  rocYearMonthRaw: string;
  period: string | null;
  rank: number | null;
  clauseCode: string;
  clauseDescription: string;
  appealCount: number | null;
  hasValidPeriod: boolean;
  hasValidRank: boolean;
  hasValidCount: boolean;
  originalValues: globalThis.Record<string, string>;
};

type Metadata = {
  latestPeriod: string | null;
  validMonths: string[];
  uniqueClauses: number;
  recordCount: number;
  sourceFileUpdateDate: string;
  metadataUpdateDate: string;
  monthlyCompleteness: { period: string; validRankedRows: number; complete: boolean }[];
  dataQuality: globalThis.Record<string, number>;
};

const BASE = `${import.meta.env.BASE_URL}data/traffic-violation-appeal-top-clauses/`;

const t = (language: Language, zh: string, en: string) => (language === 'zh' ? zh : en);

const priorPeriod = (period: string) => {
  const [year, month] = period.split('-').map(Number);
  return `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}`;
};

const previous = (record: AppealRecord, rows: AppealRecord[]) => (record.period ? rows.find((item) => item.period === priorPeriod(record.period!) && item.clauseCode === record.clauseCode) : undefined);
const move = (record: AppealRecord, rows: AppealRecord[]) => {
  const prior = previous(record, rows);
  return prior?.rank !== null && prior?.rank !== undefined && record.rank !== null ? prior.rank - record.rank : null;
};

const qualityLabels: Record<string, [string, string]> = {
  invalidPeriod: ['期間格式異常', 'Invalid period'],
  missingRank: ['缺少排名', 'Missing rank'],
  rankOutsideTopFive: ['排名超出前五名', 'Rank outside top five'],
  missingClauseCode: ['缺少條款代碼', 'Missing clause code'],
  missingClauseDescription: ['缺少條款中文說明', 'Missing clause description'],
  malformedCount: ['件數格式異常', 'Malformed count'],
  negativeCount: ['件數為負值', 'Negative count'],
  duplicatePeriodClauseRows: ['同期間與條款重複列', 'Duplicate period-clause rows'],
  duplicateRankWithinMonth: ['同月份排名重複', 'Duplicate ranks within month'],
  samePeriodRankMultipleClauses: ['同月份同排名對應多條款', 'Same period rank mapped to multiple clauses'],
  conflictingClauseDescriptions: ['同條款中文說明不一致', 'Conflicting clause descriptions'],
  monthsFewerThanFive: ['單月少於五筆前五名資料', 'Months with fewer than five rows'],
  monthsMoreThanFive: ['單月多於五筆前五名資料', 'Months with more than five rows'],
  unexpectedMonthlyGaps: ['期間中有非預期缺月', 'Unexpected monthly gaps'],
};

const sourceFieldLabels: Record<string, [string, string]> = {
  民國年月: ['民國年月', 'ROC period'],
  排名: ['排名', 'Rank'],
  條款: ['條款', 'Clause'],
  條款中文說明: ['條款中文說明', 'Clause description'],
  件數: ['件數', 'Appeals'],
};

const columnText = {
  zh: ['民國年月', '西元期間（推導）', '排名', '條款', '中文說明', '件數', '前期排名', '排名變動', '前期件數', '件數變化'],
  en: ['ROC period', 'Gregorian period (derived)', 'Rank', 'Clause', 'Chinese description', 'Appeals', 'Previous rank', 'Rank movement', 'Previous count', 'Appeal change'],
} as const;

const persistentColumnText = {
  zh: ['條款', '出現月份數', '涵蓋比例', '平均排名', '最佳排名', '最新排名', '累計件數'],
  en: ['Clause', 'Months', 'Share', 'Average rank', 'Best rank', 'Latest rank', 'Recorded appeals'],
} as const;

const labelFromMap = (language: Language, key: string, map: Record<string, [string, string]>) => (map[key] ? t(language, ...map[key]) : key);
const clauseLabel = (record: Pick<AppealRecord, 'clauseCode' | 'clauseDescription'>) => `${record.clauseCode}｜${record.clauseDescription}`;

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

export default function TrafficViolationAppealTrends({ language }: { language: Language }) {
  const [records, setRecords] = useState<AppealRecord[]>([]);
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [view, setView] = useState('overview');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rank, setRank] = useState('all');
  const [clause, setClause] = useState('all');
  const [query, setQuery] = useState('');
  const [valid, setValid] = useState(false);
  const [latestOnly, setLatestOnly] = useState(false);
  const [persistent, setPersistent] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    Promise.all([fetch(`${BASE}records.json`).then((response) => response.json()), fetch(`${BASE}metadata.json`).then((response) => response.json())]).then(([items, metadata]) => {
      setRecords(items);
      setMeta(metadata);
    });
  }, []);

  const periods = useMemo(() => [...new Set(records.filter((record) => record.hasValidPeriod && record.period).map((record) => record.period!))].sort(), [records]);
  const latest = periods.at(-1) ?? '';
  const clauses = useMemo(() => [...new Set(records.map((record) => record.clauseCode).filter(Boolean))].sort(), [records]);
  const clauseDescriptions = useMemo(() => Object.fromEntries(records.map((record) => [record.clauseCode, record.clauseDescription])), [records]);
  const appearances = useMemo(() => Object.fromEntries(clauses.map((item) => [item, records.filter((record) => record.clauseCode === item && record.hasValidPeriod && record.hasValidRank).length])), [clauses, records]);

  const rows = useMemo(
    () =>
      records.filter(
        (record) =>
          (!from || (record.period ?? '') >= from) &&
          (!to || (record.period ?? '') <= to) &&
          (rank === 'all' || String(record.rank) === rank) &&
          (clause === 'all' || record.clauseCode === clause) &&
          (!valid || record.hasValidCount) &&
          (!latestOnly || record.period === latest) &&
          (!persistent || (appearances[record.clauseCode] ?? 0) > 1) &&
          (!query || [record.clauseCode, record.clauseDescription, record.rocYearMonthRaw, record.period].join(' ').toLowerCase().includes(query.toLowerCase())),
      ),
    [records, from, to, rank, clause, valid, latestOnly, persistent, query, latest, appearances],
  );

  const byPeriod = useMemo(
    () => Object.fromEntries(periods.map((period) => [period, rows.filter((record) => record.period === period && record.hasValidRank).sort((a, b) => (a.rank ?? 9) - (b.rank ?? 9))])),
    [periods, rows],
  ) as globalThis.Record<string, AppealRecord[]>;

  const latestRows = byPeriod[latest] ?? [];
  const total = latestRows.reduce((sum, record) => sum + (record.appealCount ?? 0), 0);
  const first = latestRows.find((record) => record.rank === 1);
  const previousRows = byPeriod[priorPeriod(latest)] ?? [];

  const persistentRows = clauses
    .map((item) => {
      const list = records.filter((record) => record.clauseCode === item && record.hasValidPeriod && record.hasValidRank);
      return {
        clause: item,
        list,
        months: list.length,
        average: list.reduce((sum, record) => sum + (record.rank ?? 0), 0) / Math.max(1, list.length),
        best: Math.min(...list.map((record) => record.rank ?? 99)),
        latest: list.find((record) => record.period === latest)?.rank ?? null,
        total: list.reduce((sum, record) => sum + (record.appealCount ?? 0), 0),
      };
    })
    .filter((item) => item.months)
    .sort((a, b) => b.months - a.months || a.average - b.average);

  const most = persistentRows[0];
  const changes = latestRows.flatMap((record) => {
    const prior = previous(record, records);
    return prior?.appealCount !== null && prior?.appealCount !== undefined && record.appealCount !== null ? [{ record, delta: record.appealCount - prior.appealCount }] : [];
  });
  const biggest = changes.sort((a, b) => b.delta - a.delta)[0];
  const retained = latestRows.filter((record) => previousRows.some((item) => item.clauseCode === record.clauseCode)).length;

  const label = (zh: string, en: string) => t(language, zh, en);
  const formatMonth = (period: string) => (period ? `${period}${language === 'zh' ? '（西元推導）' : ' (derived)'}` : '—');

  const nav = [
    ['overview', '總覽', 'Overview'],
    ['latest', '最新前五名', 'Latest Top 5'],
    ['trends', '條款趨勢', 'Clause Trends'],
    ['ranking', '排名歷程', 'Ranking History'],
    ['persistent', '持續上榜', 'Persistent Clauses'],
    ['compare', '每月比較', 'Monthly Comparison'],
    ['table', '資料表', 'Data Table'],
    ['quality', '資料品質', 'Data Quality'],
    ['notes', '資料說明', 'Data Notes'],
  ];

  const exportCsv = () => {
    const header = ['ROC period', 'Gregorian period (derived)', 'Rank', 'Clause', 'Chinese description', 'Appeals'];
    const blob = new Blob(
      [
        `\uFEFF${[header, ...rows.map((record) => [record.rocYearMonthRaw, record.period ?? '', record.rank ?? '', record.clauseCode, record.clauseDescription, record.appealCount ?? ''])]
          .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
          .join('\n')}`,
      ],
      { type: 'text/csv;charset=utf-8' },
    );
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'traffic-violation-appeal-top-clauses.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
  };

  if (!meta) {
    return <main className="status-screen">{label('載入申訴統計中…', 'Loading appeal statistics…')}</main>;
  }

  return (
    <main className="overview appeal-trends">
      <section className="hero">
        <p className="eyebrow">{label('交通安全 · 裁決與申訴統計', 'Traffic Safety · Adjudication & Appeal Statistics')}</p>
        <h2>{label('道路交通管理事件申訴條款趨勢', 'Traffic Violation Appeal Trends')}</h2>
        <p>{label('以每月公布的前五名條款描述申訴提交統計趨勢。', 'Submitted-appeal trends from the five clauses published each month by Taipei City’s Traffic Adjudication Office.')}</p>
        <p className="notice">{label('每期僅公布申訴件數前五名條款；未列入前五名不代表申訴件數為零。', 'This dataset publishes only the five clauses with the most appeals for each period. A clause absent from the Top 5 does not mean it received zero appeals.')}</p>
      </section>

      <div className="tabs sub-tabs">
        {nav.map(([key, zh, en]) => (
          <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>
            {label(zh, en)}
          </button>
        ))}
      </div>

      <section className="filter-panel health-filters">
        <label>
          {label('起始期間', 'From')}
          <select value={from} onChange={(event) => setFrom(event.target.value)}>
            <option value="">{label('全部', 'All')}</option>
            {periods.map((period) => (
              <option key={period}>{period}</option>
            ))}
          </select>
        </label>
        <label>
          {label('結束期間', 'To')}
          <select value={to} onChange={(event) => setTo(event.target.value)}>
            <option value="">{label('全部', 'All')}</option>
            {periods.map((period) => (
              <option key={period}>{period}</option>
            ))}
          </select>
        </label>
        <label>
          {label('排名', 'Rank')}
          <select value={rank} onChange={(event) => setRank(event.target.value)}>
            <option value="all">{label('全部', 'All')}</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          {label('條款', 'Clause')}
          <select value={clause} onChange={(event) => setClause(event.target.value)}>
            <option value="all">{label('全部', 'All')}</option>
            {clauses.map((item) => (
              <option key={item} value={item}>
                {clauseLabel({ clauseCode: item, clauseDescription: clauseDescriptions[item] ?? '' })}
              </option>
            ))}
          </select>
        </label>
        <label className="search-field">
          {label('搜尋', 'Search')}
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={label('條款、說明或期間', 'Clause, description, or period')} />
        </label>
        <label>
          <input type="checkbox" checked={valid} onChange={(event) => setValid(event.target.checked)} />
          {label('有效件數', 'Valid count')}
        </label>
        <label>
          <input type="checkbox" checked={latestOnly} onChange={(event) => setLatestOnly(event.target.checked)} />
          {label('最新前五名', 'Latest Top 5')}
        </label>
        <label>
          <input type="checkbox" checked={persistent} onChange={(event) => setPersistent(event.target.checked)} />
          {label('多月出現', 'Persistent clause')}
        </label>
      </section>

      {view === 'overview' && (
        <>
          <section className="summary-grid">
            {[
              [label('最新月份', 'Latest month'), formatMonth(latest)],
              [label('公布前五名條款申訴件數', 'Appeals across the published top five clauses'), total.toLocaleString()],
              [label('第 1 名條款', 'Latest #1 clause'), first?.clauseCode ?? '—'],
              [label('第 1 名件數', 'Latest #1 appeal count'), first?.appealCount?.toLocaleString() ?? '—'],
              [label('不重複條款', 'Unique clauses'), meta.uniqueClauses],
              [label('多月出現條款', 'Clauses appearing in multiple months'), persistentRows.filter((item) => item.months > 1).length],
              [label('最大月增件數', 'Largest month-over-month increase'), biggest ? `${biggest.record.clauseCode} +${biggest.delta}` : '—'],
              [label('最持續上榜條款', 'Most persistent clause'), most?.clause ?? '—'],
              [label('資料更新日', 'Dataset update date'), meta.sourceFileUpdateDate],
            ].map(([key, value]) => (
              <article className="metric" key={String(key)}>
                <span>{key}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>
          <section className="panel">
            <h3>{label('動態洞察', 'Insights')}</h3>
            <p>{most && label(`${most.clause} 出現在 ${most.months}/${periods.length} 個有效月份，平均排名 ${most.average.toFixed(1)}，最佳排名第 ${most.best} 名。`, `${most.clause} appears in ${most.months}/${periods.length} valid months, with average rank ${most.average.toFixed(1)} and best rank #${most.best}.`)}</p>
            <p>{previousRows.length ? label(`與前一曆月比較，${retained} / 5 個條款保留在前五名。`, `${retained} / 5 clauses remained in the Top 5 from the prior calendar month.`) : label('前一曆月未發布資料，不進行前期比較。', 'The prior calendar month is not published, so no previous-period comparison is shown.')}</p>
          </section>
        </>
      )}

      {view === 'latest' && (
        <section className="panel">
          <h3>
            {label('最新公布前五名', 'Latest published Top 5')} · {formatMonth(latest)}
          </h3>
          {latestRows.map((record) => {
            const prior = previous(record, records);
            const rankMove = move(record, records);
            return (
              <div className="bar-row" key={record.id}>
                <span>
                  #{record.rank} · <strong>{record.clauseCode}</strong>
                  <small>{record.clauseDescription}</small>
                </span>
                <div>
                  <i style={{ width: `${((record.appealCount ?? 0) / Math.max(...latestRows.map((item) => item.appealCount ?? 0), 1)) * 100}%` }} />
                </div>
                <b>
                  {record.appealCount?.toLocaleString() ?? '—'}
                  <small>{prior ? `${label('前期', 'Prev.')}: #${prior.rank} · ${prior.appealCount?.toLocaleString() ?? '—'} · ${rankMove === null ? '—' : rankMove > 0 ? `↑ ${rankMove}` : rankMove < 0 ? `↓ ${-rankMove}` : '→'}` : label('未列入前期前五名', 'Not in published Top 5')}</small>
                </b>
              </div>
            );
          })}
        </section>
      )}

      {view === 'trends' && <Trend language={language} rows={rows} periods={periods} clauses={clauses} clauseDescriptions={clauseDescriptions} />}

      {view === 'ranking' && (
        <section className="panel table-wrap">
          <h3>{label('排名歷程（未上榜月份留白）', 'Ranking history (unranked months remain blank)')}</h3>
          <table>
            <thead>
              <tr>
                <th>{label('條款', 'Clause')}</th>
                {periods.map((period) => (
                  <th key={period}>{period}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clauses.map((item) => (
                <tr key={item}>
                  <td>{clauseLabel({ clauseCode: item, clauseDescription: clauseDescriptions[item] ?? '' })}</td>
                  {periods.map((period) => (
                    <td key={period}>{records.find((record) => record.period === period && record.clauseCode === item)?.rank ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {view === 'persistent' && (
        <section className="panel table-wrap">
          <h3>{label('持續上榜條款', 'Persistent Top-5 clauses')}</h3>
          <table>
            <thead>
              <tr>
                {persistentColumnText[language].map((item) => (
                  <th key={item}>{item}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {persistentRows.map((item) => (
                <tr key={item.clause}>
                  <td>{clauseLabel({ clauseCode: item.clause, clauseDescription: clauseDescriptions[item.clause] ?? '' })}</td>
                  <td>{item.months}</td>
                  <td>{((item.months / periods.length) * 100).toFixed(1)}%</td>
                  <td>{item.average.toFixed(1)}</td>
                  <td>#{item.best}</td>
                  <td>{item.latest ? `#${item.latest}` : '—'}</td>
                  <td>{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {view === 'compare' && (
        <section className="panel table-wrap">
          <h3>{label('每月前五名組成與比較', 'Monthly Top-5 composition and comparison')}</h3>
          <table>
            <thead>
              <tr>
                <th>{label('月份', 'Month')}</th>
                <th>{label('前五名條款', 'Top 5 clauses')}</th>
                <th>{label('前五名件數', 'Published top-five appeals')}</th>
                <th>{label('前五名留存', 'Top-5 retention')}</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const current = byPeriod[period] ?? [];
                const prior = byPeriod[priorPeriod(period)] ?? [];
                return (
                  <tr key={period}>
                    <td>{formatMonth(period)}</td>
                    <td>{current.map((record) => clauseLabel(record)).join(' · ')}</td>
                    <td>{current.reduce((sum, record) => sum + (record.appealCount ?? 0), 0).toLocaleString()}</td>
                    <td>{prior.length ? `${current.filter((record) => prior.some((item) => item.clauseCode === record.clauseCode)).length} / 5` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {view === 'table' && (
        <section className="panel table-wrap">
          <div className="filter-panel">
            <h3>{label('資料表', 'Data Table')}</h3>
            <button onClick={exportCsv}>{label('下載篩選 CSV', 'Download filtered CSV')}</button>
          </div>
          <table>
            <thead>
              <tr>
                {columnText[language].map((item) => (
                  <th key={item}>{item}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 10, page * 10 + 10).map((record) => {
                const prior = previous(record, records);
                const rankMove = move(record, records);
                return (
                  <tr key={record.id}>
                    <td>
                      <details>
                        <summary>{record.rocYearMonthRaw}</summary>
                        <SourceFieldList language={language} values={record.originalValues} />
                      </details>
                    </td>
                    <td>{record.period ?? '—'}</td>
                    <td>{record.rank ?? '—'}</td>
                    <td>{record.clauseCode || '—'}</td>
                    <td>{record.clauseDescription || '—'}</td>
                    <td>{record.appealCount?.toLocaleString() ?? '—'}</td>
                    <td>{prior?.rank ?? label('未列入前五名', 'Not in Top 5')}</td>
                    <td>{rankMove === null ? '—' : rankMove > 0 ? `↑ ${rankMove}` : rankMove < 0 ? `↓ ${-rankMove}` : '→'}</td>
                    <td>{prior?.appealCount?.toLocaleString() ?? '—'}</td>
                    <td>{prior?.appealCount !== null && prior?.appealCount !== undefined && record.appealCount !== null ? `${record.appealCount - prior.appealCount}${prior.appealCount > 0 ? ` (${((record.appealCount / prior.appealCount - 1) * 100).toFixed(1)}%)` : ''}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="filter-panel">
            <button disabled={!page} onClick={() => setPage(page - 1)}>
              {label('上一頁', 'Previous')}
            </button>
            <span>
              {page + 1} / {Math.max(1, Math.ceil(rows.length / 10))}
            </span>
            <button disabled={(page + 1) * 10 >= rows.length} onClick={() => setPage(page + 1)}>
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
          <p>{meta.monthlyCompleteness.map((item) => `${item.period}: ${language === 'zh' ? `有效排名 ${item.validRankedRows}/5` : `${item.validRankedRows}/5 ranked rows`}`).join(' · ')}</p>
        </section>
      )}

      {view === 'notes' && (
        <section className="panel">
          <h3>{label('資料說明與限制', 'Data notes and limitations')}</h3>
          <p>{label('本資料是交通事件裁決所公布的申訴提交統計，不代表申訴成功、罰單錯誤、執法不當或法律結論。', 'Counts are submitted-appeal statistics; they do not establish successful appeals, incorrect tickets, improper enforcement, or legal outcomes.')}</p>
          <p>{label('未列入前五名不代表零件；本模組不估計全市申訴總數、成功率或完整分布，也不提供法律建議。', 'Not in Top 5 is not zero. This module does not estimate citywide totals, success rates, complete distributions, or provide legal advice.')}</p>
          <a href="https://data.taipei/dataset/detail?id=da715207-29e8-4b8d-b680-7fc120211512" target="_blank" rel="noreferrer">
            {label('官方資料來源', 'Official source')}
          </a>{' '}
          · {label('檔案更新日', 'File update')}: {meta.sourceFileUpdateDate}
        </section>
      )}
    </main>
  );
}

function Trend({
  language,
  rows,
  periods,
  clauses,
  clauseDescriptions,
}: {
  language: Language;
  rows: AppealRecord[];
  periods: string[];
  clauses: string[];
  clauseDescriptions: Record<string, string>;
}) {
  const [selected, setSelected] = useState<string[]>(clauses.slice(0, 5));
  const max = Math.max(...rows.filter((record) => selected.includes(record.clauseCode)).map((record) => record.appealCount ?? 0), 1);

  return (
    <section className="panel table-wrap">
      <h3>{t(language, '申訴件數趨勢（未列入前五名為無資料，不是零）', 'Appeal-count trends (not in Top 5 means unavailable, not zero)')}</h3>
      <div className="filter-panel">
        {clauses.map((item) => (
          <label key={item}>
            <input type="checkbox" checked={selected.includes(item)} disabled={!selected.includes(item) && selected.length >= 5} onChange={(event) => setSelected((value) => (event.target.checked ? [...value, item] : value.filter((entry) => entry !== item)))} />
            {`${item}｜${clauseDescriptions[item] ?? ''}`}
          </label>
        ))}
      </div>
      <svg className="appeal-chart" viewBox="0 0 800 260">
        <line x1="50" y1="220" x2="770" y2="220" stroke="currentColor" />
        {selected.map((item, index) => {
          const color = ['#0f766e', '#2563eb', '#b45309', '#be123c', '#7c3aed'][index];
          const points = periods
            .map((period, step) => {
              const record = rows.find((entry) => entry.period === period && entry.clauseCode === item);
              return record?.appealCount !== null && record?.appealCount !== undefined ? `${50 + (step * 720) / Math.max(1, periods.length - 1)},${220 - (record.appealCount / max) * 185}` : '';
            })
            .join(' ');
          return (
            <g key={item}>
              <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
              <text x="60" y={35 + index * 18} fill={color}>
                {item}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
