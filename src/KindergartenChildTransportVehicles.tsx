import { useEffect, useMemo, useState } from 'react';
import type { Language } from './types';

type R = {
  id: string;
  sourceSequenceNumber: string;
  districtName: string;
  ownership: 'public' | 'private' | 'other' | 'unknown';
  ownershipRaw: string;
  kindergartenName: string;
  licensePlateDisplay: string;
  manufacturerModel: string;
  manufactureYear: number | null;
  manufacturePeriod: string | null;
  vehicleAgeYears: number | null;
  dataQualityWarnings: string[];
  originalValues: Record<string, string>;
};

type M = {
  sourceFileUpdatedAt: string;
  dataQuality: Record<string, number>;
};

const base = `${import.meta.env.BASE_URL}data/kindergarten-child-transport-vehicles/`;
const t = (language: Language, zh: string, en: string) => (language === 'zh' ? zh : en);

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

const qualityLabels: Record<string, [string, string]> = {
  inputRows: ['來源列數', 'Input rows'],
  outputRows: ['輸出列數', 'Output rows'],
  duplicateSourceRows: ['重複來源列', 'Duplicate source rows'],
  missingKindergarten: ['缺少園名', 'Missing kindergarten'],
  missingDistrict: ['缺少行政區', 'Missing district'],
  unknownOwnership: ['公私立無法判讀', 'Unknown ownership'],
  missingLicensePlate: ['缺少車牌號碼', 'Missing license plate'],
  missingManufacturerModel: ['缺少廠牌型號', 'Missing manufacturer/model'],
  malformedManufactureDate: ['出廠年月格式異常', 'Malformed manufacture date'],
  malformedVehicleAge: ['車齡格式異常', 'Malformed vehicle age'],
  duplicateLicensePlates: ['重複車牌', 'Duplicate license plates'],
  duplicateSequenceNumbers: ['重複序號', 'Duplicate sequence numbers'],
  recordsWithWarnings: ['含品質警示的資料列', 'Records with warnings'],
};

const sourceFieldLabels: Record<string, [string, string]> = {
  序號: ['序號', 'Sequence'],
  縣市: ['縣市', 'City'],
  鄉鎮市: ['鄉鎮市', 'District'],
  公私立: ['公私立', 'Ownership'],
  園名: ['園名', 'Kindergarten'],
  車牌號碼: ['車牌號碼', 'License plate'],
  廠牌型號: ['廠牌型號', 'Manufacturer/model'],
  出廠年月: ['出廠年月', 'Manufacture period'],
  '使用年限【統計數值】': ['使用年限', 'Recorded vehicle age'],
};

const labelFromMap = (language: Language, key: string, map: Record<string, [string, string]>) => (map[key] ? t(language, ...map[key]) : key);

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

export default function KindergartenChildTransportVehicles({ language }: { language: Language }) {
  const [records, setRecords] = useState<R[]>([]);
  const [meta, setMeta] = useState<M | null>(null);
  const [view, setView] = useState('overview');
  const [district, setDistrict] = useState('all');
  const [ownership, setOwnership] = useState('all');
  const [query, setQuery] = useState('');
  const [warnings, setWarnings] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    Promise.all([fetch(base + 'records.json').then((response) => response.json()), fetch(base + 'metadata.json').then((response) => response.json())]).then(([items, metadata]) => {
      setRecords(items);
      setMeta(metadata);
    });
  }, []);

  const districts = useMemo(() => [...new Set(records.map((record) => record.districtName).filter(Boolean))].sort(), [records]);
  const rows = useMemo(
    () =>
      records.filter(
        (record) =>
          (district === 'all' || record.districtName === district) &&
          (ownership === 'all' || record.ownership === ownership) &&
          (!warnings || record.dataQualityWarnings.length > 0) &&
          (!query || [record.kindergartenName, record.districtName, record.manufacturerModel, record.sourceSequenceNumber].join(' ').toLowerCase().includes(query.toLowerCase())),
      ),
    [records, district, ownership, warnings, query],
  );

  const ages = rows.flatMap((record) => (record.vehicleAgeYears === null ? [] : [record.vehicleAgeYears]));
  const byDistrict = districts.map((name) => ({ name, count: rows.filter((record) => record.districtName === name).length })).filter((item) => item.count).sort((a, b) => b.count - a.count);
  const models = Object.entries(rows.reduce<Record<string, number>>((all, record) => {
    if (record.manufacturerModel) {
      all[record.manufacturerModel] = (all[record.manufacturerModel] ?? 0) + 1;
    }
    return all;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const exportCsv = () => {
    const head = ['Sequence', 'District', 'Ownership', 'Kindergarten', 'Vehicle identifier (masked)', 'Manufacturer/model', 'Manufacture period', 'Source-recorded age', 'Warnings'];
    const blob = new Blob(
      [
        `\uFEFF${[head, ...rows.map((record) => [record.sourceSequenceNumber, record.districtName, record.ownershipRaw, record.kindergartenName, record.licensePlateDisplay, record.manufacturerModel, record.manufacturePeriod ?? '', record.vehicleAgeYears ?? '', record.dataQualityWarnings.join(';')])]
          .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
          .join('\n')}`,
      ],
      { type: 'text/csv' },
    );
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'kindergarten-child-transport-vehicles-historical.csv';
    anchor.click();
  };

  if (!meta) {
    return <main className="status-screen">{t(language, '載入中…', 'Loading…')}</main>;
  }

  const label = (zh: string, en: string) => t(language, zh, en);

  return (
    <main className="overview appeal-trends">
      <section className="hero">
        <p className="eyebrow">{label('兒童安全 · 校園交通 · 歷史清冊', 'Child Safety · School Transport · Historical Registry')}</p>
        <h2>{label('幼兒園幼童專用車歷史清冊', 'Kindergarten Child Transport Vehicles')}</h2>
        <p className="notice">{label('歷史資料提示：目前公開檔案為 109 學年度第 1 學期的幼童專用車行政紀錄；不代表車輛今日仍由該園使用、營運、通過檢驗或符合現行規範。', 'Historical data notice: this file represents child-transport vehicles recorded for Academic Year 109, Semester 1. It is not a list of vehicles confirmed to remain in use today.')}</p>
      </section>

      <div className="tabs sub-tabs">
        {[
          ['overview', '歷史總覽', 'Historical Overview'],
          ['directory', '園所與車輛名錄', 'Directory'],
          ['district', '行政區分布', 'District Distribution'],
          ['ownership', '公私立比較', 'Public vs Private'],
          ['age', '車齡與製造年', 'Vehicle Age'],
          ['models', '廠牌與型號', 'Manufacturers & Models'],
          ['quality', '資料品質', 'Data Quality'],
          ['notes', '資料說明', 'Data Notes'],
        ].map(([key, zh, en]) => (
          <button className={view === key ? 'active' : ''} onClick={() => setView(key)} key={key}>
            {label(zh, en)}
          </button>
        ))}
      </div>

      <section className="filter-panel health-filters">
        <label>
          {label('行政區', 'District')}
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="all">{label('全部', 'All')}</option>
            {districts.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          {label('公私立', 'Ownership')}
          <select value={ownership} onChange={(event) => setOwnership(event.target.value)}>
            <option value="all">{label('全部', 'All')}</option>
            <option value="public">{label('公立', 'Public')}</option>
            <option value="private">{label('私立', 'Private')}</option>
            <option value="other">{label('其他', 'Other')}</option>
          </select>
        </label>
        <label className="search-field">
          {label('搜尋', 'Search')}
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={label('園名、行政區、廠牌型號或序號', 'Kindergarten, district, model, or sequence')} />
        </label>
        <label>
          <input type="checkbox" checked={warnings} onChange={(event) => setWarnings(event.target.checked)} />
          {label('僅顯示品質警示', 'Data-quality warnings only')}
        </label>
      </section>

      {view === 'overview' && (
        <>
          <section className="summary-grid">
            {[
              [label('車輛紀錄', 'Vehicle records'), rows.length],
              [label('不重複幼兒園', 'Unique kindergartens'), new Set(rows.map((record) => record.kindergartenName).filter(Boolean)).size],
              [label('涵蓋行政區', 'Districts'), new Set(rows.map((record) => record.districtName).filter(Boolean)).size],
              [label('公立車輛紀錄', 'Public records'), rows.filter((record) => record.ownership === 'public').length],
              [label('私立車輛紀錄', 'Private records'), rows.filter((record) => record.ownership === 'private').length],
              [label('車齡中位數', 'Median source-recorded age'), median(ages) ?? '—'],
              [label('最高來源車齡', 'Oldest source-recorded age'), ages.length ? Math.max(...ages) : '—'],
              [label('檔案更新日', 'Source file update'), meta.sourceFileUpdatedAt],
            ].map(([key, value]) => (
              <article className="metric" key={String(key)}>
                <span>{key}</span>
                <strong>{String(value)}</strong>
              </article>
            ))}
          </section>
          <section className="panel">
            <h3>{label('動態洞察', 'Insights')}</h3>
            <p>{label(`篩選結果中，私立園所車輛紀錄占 ${rows.length ? Math.round((rows.filter((record) => record.ownership === 'private').length / rows.length) * 100) : 0}%；此為當期行政紀錄的組成，不能推論現今運輸依賴程度。`, `Private-kindergarten records represent ${rows.length ? Math.round((rows.filter((record) => record.ownership === 'private').length / rows.length) * 100) : 0}% of this filtered historical snapshot; it does not show present-day transport dependence.`)}</p>
            <p>{byDistrict[0] && label(`${byDistrict[0].name} 在目前篩選中有最多車輛紀錄（${byDistrict[0].count} 筆）。`, `${byDistrict[0].name} has the most vehicle records in the current filter (${byDistrict[0].count}).`)}</p>
          </section>
        </>
      )}

      {view === 'district' && <Bars title={label('各行政區車輛紀錄', 'Vehicle records by district')} data={byDistrict} />}
      {view === 'ownership' && <Bars title={label('公私立組成', 'Public vs private composition')} data={['public', 'private', 'other', 'unknown'].map((item) => ({ name: label(item === 'public' ? '公立' : item === 'private' ? '私立' : item === 'other' ? '其他' : '未知', item === 'public' ? 'Public' : item === 'private' ? 'Private' : item === 'other' ? 'Other' : 'Unknown'), count: rows.filter((record) => record.ownership === item).length }))} />}
      {view === 'models' && <Bars title={label('常見廠牌與型號（前 10）', 'Most common manufacturer/model strings (Top 10)')} data={models.map(([name, count]) => ({ name, count }))} />}
      {view === 'age' && <Bars title={label('製造年份時間軸', 'Manufacturing-year timeline')} data={Object.entries(rows.reduce<Record<string, number>>((all, record) => { if (record.manufactureYear) { all[record.manufactureYear] = (all[record.manufactureYear] ?? 0) + 1; } return all; }, {})).sort((a, b) => Number(a[0]) - Number(b[0])).map(([name, count]) => ({ name, count }))} />}

      {view === 'directory' && (
        <section className="panel table-wrap">
          <button onClick={exportCsv}>{label('下載篩選 CSV（車牌遮罩）', 'Download filtered CSV (masked identifiers)')}</button>
          <table>
            <thead>
              <tr>
                {[label('序號', 'ID'), label('幼兒園', 'Kindergarten'), label('公私立', 'Ownership'), label('行政區', 'District'), label('車輛識別碼', 'Vehicle identifier'), label('廠牌型號', 'Manufacturer & model'), label('出廠年月', 'Manufacture period'), label('來源車齡', 'Source-recorded age'), label('資料品質', 'Data quality')].map((item) => (
                  <th key={item}>{item}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 20, page * 20 + 20).map((record) => (
                <tr key={record.id}>
                  <td>
                    <details>
                      <summary>{record.sourceSequenceNumber}</summary>
                      <SourceFieldList language={language} values={record.originalValues} />
                    </details>
                  </td>
                  <td>{record.kindergartenName}</td>
                  <td>{record.ownershipRaw}</td>
                  <td>{record.districtName}</td>
                  <td>{record.licensePlateDisplay || '—'}</td>
                  <td>{record.manufacturerModel || '—'}</td>
                  <td>{record.manufacturePeriod ?? '—'}</td>
                  <td>{record.vehicleAgeYears ?? '—'}</td>
                  <td>{record.dataQualityWarnings.length ? record.dataQualityWarnings.map((item) => labelFromMap(language, item, qualityLabels)).join('、') : '—'}</td>
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
          <p>{label('本資料集為臺北市公私立幼兒園 109 學年度第 1 學期之幼童專用車歷史行政清冊。園名、車輛識別碼、型號、出廠年月與來源車齡，均只反映該期間紀錄。', 'This is a historical registry of child-transport vehicles associated with Taipei public and private kindergartens for Academic Year 109, Semester 1. Names, vehicle identifiers, models, manufacture periods, and ages reflect that administrative period only.')}</p>
          <p>{label('不應據此判定目前使用、檢驗、保險、駕駛資格、行車安全或園所推薦。請向園所、教育局與主管機關確認現況。', 'It does not establish current use, inspection, insurance, driver qualifications, safety, or recommendations. Confirm current information with the kindergarten, Department of Education, and relevant authorities.')}</p>
          <a href="https://data.taipei/dataset/detail?id=a25d8830-f643-41f9-a4ab-8722da91cc1f" target="_blank" rel="noreferrer">
            {label('官方資料來源', 'Official source')}
          </a>
        </section>
      )}
    </main>
  );
}

function Bars({ title, data }: { title: string; data: { name: string; count: number }[] }) {
  const max = Math.max(...data.map((item) => item.count), 1);
  return (
    <section className="panel">
      <h3>{title}</h3>
      {data.map((item) => (
        <div className="bar-row" key={item.name}>
          <span>{item.name}</span>
          <div>
            <i style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <b>{item.count.toLocaleString()}</b>
        </div>
      ))}
    </section>
  );
}
