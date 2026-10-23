import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { Candidate, InventoryRow } from './types/bridgePolicy';
import type { Language } from './types';

export default function BridgePolicyMap({ selected, inventory, inventoryOnly, language }: { selected: Candidate[]; inventory: InventoryRow[]; inventoryOnly: boolean; language: Language }) {
  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const points = inventoryOnly
    ? inventory.filter(x => x.geography.status === 'valid-reference').slice(0, 200).map(x => ({ id: x.id, name: x.name, point: x.geography.object!, inspection: null }))
    : selected.filter(x => x.association.status === 'accepted' && x.geography?.status === 'valid-reference').slice(0, 200).map(x => ({ id: x.id, name: x.name, point: x.geography!.object!, inspection: x.raw['檢測結果'] }));
  return <>
    <p>{inventoryOnly ? label('灰色：獨立橋梁資產清冊，未附加檢測結果。', 'Grey: independent bridge asset inventory; no inspection result attached.') : label('藍色：已接受本版研究對應的檢測紀錄。', 'Blue: inspection records with accepted within-edition research associations.')} {label('最多顯示 200 個官方物件參考點；不是測量線形或入口，未驗證行政界線。', 'At most 200 official object-reference points; not surveyed alignments or entrances. Administrative boundaries are not validated.')}</p>
    <MapContainer center={[25.05, 121.55]} zoom={11} style={{ height: 380, width: '100%' }} key={inventoryOnly ? 'inventory' : 'selected'}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      {points.map(x => <CircleMarker key={x.id} center={[x.point.latitude, x.point.longitude]} radius={6} pathOptions={{ color: inventoryOnly ? '#64748b' : '#1464a5' }}><Popup><strong>{x.name}</strong><p>{x.id}</p><p>{label('官方物件參考點', 'Official object-reference point')}</p>{x.inspection !== null && <p>{label('來源檢測結果（原文）', 'Published inspection result (original)')}: {x.inspection}</p>}</Popup></CircleMarker>)}
    </MapContainer>
  </>;
}
