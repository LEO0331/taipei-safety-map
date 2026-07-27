import { useMemo, useState } from 'react';
import type { Language, LpgFacilityRecord } from './types';

const categoryLabels: Record<string, string> = {
  filling: '分裝場',
  storage: '儲存場',
  cylinder_inspection: '驗瓶場',
  gas_retailer: '瓦斯行',
  other: '其他／未分類',
};

export default function LpgFacilitiesAndGasRetailers({ records, language }: { records: LpgFacilityRecord[]; language: Language }) {
  const [district, setDistrict] = useState('all');
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');
  const districts = useMemo(() => [...new Set(records.map((record) => record.districtName).filter(Boolean))].sort(), [records]);
  const types = useMemo(() => [...new Set(records.map((record) => record.category))], [records]);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return records.filter((record) => (district === 'all' || record.districtName === district)
      && (type === 'all' || record.category === type)
      && (!search || `${record.name} ${record.address} ${record.purpose}`.toLowerCase().includes(search)));
  }, [district, type, query, records]);
  const title = language === 'zh' ? '液化石油氣場所與瓦斯行清冊' : 'LPG Facilities and Bottled Gas Businesses';

  return <main className="overview tobacco-control">
    <section className="hero"><p className="eyebrow">Taipei Fire Department · Official directory</p><h2>{title}</h2><p className="notice">{language === 'zh' ? '依官方清冊呈現場所基本資料；地址僅供文字查詢，未進行座標化、地圖標記或安全風險推論。' : 'Official directory only. Addresses support text lookup; this page does not geocode, map facilities, or infer risk.'}</p></section>
    <section className="filter-panel health-filters">
      <label>{language === 'zh' ? '行政區' : 'District'}<select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="all">{language === 'zh' ? '全部' : 'All'}</option>{districts.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>{language === 'zh' ? '場所類別' : 'Type'}<select value={type} onChange={(event) => setType(event.target.value)}><option value="all">{language === 'zh' ? '全部' : 'All'}</option>{types.map((item) => <option key={item} value={item}>{categoryLabels[item] ?? item}</option>)}</select></label>
      <label>{language === 'zh' ? '關鍵字' : 'Search'}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === 'zh' ? '名稱、地址或用途' : 'Name, address, or purpose'} /></label>
    </section>
    <section className="summary-grid"><article className="metric"><span>{language === 'zh' ? '目前顯示' : 'Shown'}</span><strong>{filtered.length}</strong></article><article className="metric"><span>{language === 'zh' ? '清冊總數' : 'Directory total'}</span><strong>{records.length}</strong></article>{types.map((item) => <article className="metric" key={item}><span>{categoryLabels[item] ?? item}</span><strong>{records.filter((record) => record.category === item).length}</strong></article>)}</section>
    <section className="panel table-wrap"><table><thead><tr>{['名稱', '用途名稱', '行政區', '地址', '查詢'].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td>{record.name || '-'}</td><td>{record.purpose || '-'}</td><td>{record.districtName || '-'}</td><td>{record.address || '-'}</td><td>{record.address ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.address)}`} target="_blank" rel="noreferrer">{language === 'zh' ? '以地址文字查詢' : 'Text lookup'}</a> : '-'}</td></tr>)}</tbody></table>{filtered.length === 0 && <p>{language === 'zh' ? '沒有符合條件的資料。' : 'No matching records.'}</p>}</section>
  </main>;
}
