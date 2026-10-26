import { describe,it,expect } from 'vitest';
import { documentaryTier, normalizeRoadText, parseRoadIdentity, reconcileAccess, widthEvidence } from './fireRescueAccessIdentity';
import type { Candidate } from '../types/fireRescueAccessPolicy';
export const row = (sourceKey: Candidate['sourceKey'], name: string, id = sourceKey as string, districtCode = '63000050'): Candidate => ({ id,sourceKey,sourceSha256:sourceKey.repeat(64),row:2,sequence:id,districtCode,district:districtCode === '63000050' ? '中正區' : '大安區',name,place:'',station:'相同分隊',villages:[],category:'紅區',recognition:'',widthRaw:'',widthNumeric:null,widthUnit:'unknown',identity:parseRoadIdentity(name),raw:{},issues:[],tier:'C',eligible:true });
describe('conservative road identity', () => {
  it('normalizes approved variants and preserves all differentiating extent', () => {
    expect(parseRoadIdentity('臺北市中正區 忠孝東路一段４９巷').normalized).toBe('忠孝東路1段49巷');
    expect(normalizeRoadText('臺①路')).toBe('台①路');
    expect(parseRoadIdentity('中山路十一段二十巷').section).toBe('11段');
    for (const text of ['忠孝東路1段49巷2弄1至9號','中山路(南側)','齊東街與忠孝東路交叉口']) expect(parseRoadIdentity(text).complete).toBe(false);
    expect(parseRoadIdentity('中山路1號至9號').broad).toBe(true);
    expect(parseRoadIdentity('杭州南路1段28-1號').broad).toBe(false);
    expect(parseRoadIdentity('中山路與民權路口').intersection).toBe(true);
  });
  it('accepts only exact one-to-one complete A/B labels', () => {
    expect(reconcileAccess([row('A','齊東街82巷'),row('B','齊東街８２巷')]).find(x => x.pair === 'A/B')?.status).toBe('accepted');
  });
  it.each([['忠孝東路1段49巷','忠孝東路2段49巷'],['齊東街','齊東街82巷'],['齊東街82巷','齊東街83巷'],['齊東街82巷1弄','齊東街82巷2弄']])('rejects incompatible section/lane/alley %s vs %s',(a,b) => {
    expect(reconcileAccess([row('A',a),row('B',b)])[0].status).toBe('rejected');
  });
  it('rejects district mismatches, partial names and station-only similarities', () => {
    expect(reconcileAccess([row('A','齊東街'),row('B','齊東街','B','63000030')])[0].reasons).toContain('district-conflict');
    expect(reconcileAccess([row('A','忠孝東路'),row('B','忠孝路')])[0].status).toBe('unmatched');
  });
  it('keeps one-to-many and many-to-one alternatives ambiguous', () => {
    for (const rows of [[row('A','齊東街'),row('B','齊東街','b1'),row('B','齊東街','b2')],[row('A','齊東街','a1'),row('A','齊東街','a2'),row('B','齊東街')]]) expect(reconcileAccess(rows).filter(x => x.rightId).every(x => x.status === 'ambiguous')).toBe(true);
  });
  it('does not equate a building, repeated place name, address range or intersection with a road', () => {
    for (const address of ['齊東街1號','齊東街1至99號','齊東街與忠孝東路口','齊東街']) {
      const c = row('C',address); c.place='集合住宅';
      expect(reconcileAccess([row('A','齊東街'),row('B','齊東街'),c]).filter(x => x.pair !== 'A/B').every(x => x.status !== 'accepted')).toBe(true);
    }
    expect(reconcileAccess([row('A','大樓一帶')])[0].status).toBe('unsupported');
  });
  it('supports explicit unique A/C documentary place evidence without inferring geometry', () => {
    const a = row('A','齊東街'), c = row('C','齊東街'); a.raw['搶救困難地區場所']='磚木造平房'; c.place='磚木造平房';
    expect(reconcileAccess([a,c]).find(x => x.pair === 'A/C')?.status).toBe('accepted');
  });
  it('blocks an exact edge when an unresolved overlapping alternative exists', () => {
    const edges = reconcileAccess([row('A','齊東街82巷'),row('B','齊東街82巷','b1'),row('B','齊東街82巷部分路段','b2')]);
    expect(edges.some(x => x.status === 'accepted')).toBe(false);
  });
  it('preserves embedded district conflicts and large numeral identity', () => {
    expect(reconcileAccess([row('A','大安區齊東街82巷'),row('B','中正區齊東街82巷')])[0].status).toBe('rejected');
    expect(parseRoadIdentity('齊東街9007199254740992巷').normalized).not.toBe(parseRoadIdentity('齊東街9007199254740993巷').normalized);
  });
  it('defines tier precedence and a valid routine tier without hazard weights', () => {
    expect(documentaryTier([])).toBe('C'); expect(documentaryTier(['missing-geographic-evidence'])).toBe('B');
    expect(documentaryTier(['missing-geographic-evidence','duplicate-sequence'])).toBe('A');
  });
});
describe('width contract', () => {
  it.each(['2.9','3','', '2.5–4','2.9m','2.9公尺'])('preserves %s without operational/numeric admission', value => {
    const evidence = widthEvidence(value); expect(evidence.raw).toBe(value); expect(evidence.admittedNumeric).toBe(null); expect(evidence.unit).toBe('unknown'); expect(evidence).not.toHaveProperty('passable');
  });
});
