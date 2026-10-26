import type { Candidate, RoadIdentity, Relationship } from '../types/fireRescueAccessPolicy';

// Only ASCII compatibility width, whitespace and 台/臺. Parentheses and qualifiers survive.
export const normalizeRoadText = (value: string) => value.replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '').replace(/臺/g, '台');
const numeral = (value: string) => {
  if (/^\d+$/.test(value)) return value.replace(/^0+(?=\d)/, '');
  const digits = '零一二三四五六七八九';
  if (/^[一二三四五六七八九]$/.test(value)) return String(digits.indexOf(value));
  if (/^[一二三四五六七八九]?十[一二三四五六七八九]?$/.test(value)) { const [a, b] = value.split('十'); return String((a ? digits.indexOf(a) : 1) * 10 + (b ? digits.indexOf(b) : 0)); }
  return value;
};
export function parseRoadIdentity(value: string): RoadIdentity {
  const normalized = normalizeRoadText(value).replace(/([零一二三四五六七八九十\d]+)(段|巷|弄)/g, (_, n: string, unit: string) => numeral(n) + unit);
  const embeddedDistrict = normalized.match(/^(?:台北市)?((?:松山|信義|大安|中山|中正|大同|萬華|文山|南港|內湖|士林|北投)區)/)?.[1] ?? null;
  const clean = normalized.replace(/^(?:台北市)?(?:松山|信義|大安|中山|中正|大同|萬華|文山|南港|內湖|士林|北投)區/, '').replace(/^台北市/, '');
  const match = clean.match(/^([^\d,、()及與至之~～\-]+?(?:路|街|大道))(\d+段)?(\d+巷)?(\d+弄)?/);
  const extent = match ? clean.slice(match[0].length) : clean;
  const intersection = /(?:交叉|交會|路口|與|及|、|,)/.test(extent) || (extent.match(/路|街/g)?.length ?? 0) > 0;
  // Hyphenated house subnumbers (e.g. 28-1號) are not an explicit address range.
  const scopeText = extent.replace(/\d+-\d+號/g, '門牌號');
  const broad = /(?:至|到|~|～|\-|全|一帶|周邊|附近|以[東西南北]|兩側|範圍|地區|底|以上|以下)/.test(scopeText);
  return { normalized: clean, embeddedDistrict, base: match?.[1] ?? null, section: match?.[2] ?? null, lane: match?.[3] ?? null,
    alley: match?.[4] ?? null, extent, complete: Boolean(match && !extent), broad, intersection };
}
export const primaryIssues = ['duplicate-sequence', 'missing-sequence', 'missing-name', 'unknown-district', 'unknown-category', 'unknown-recognition', 'district-label-conflict', 'ambiguous-association', 'duplicate-identity'];
export function documentaryTier(issues: string[]): Candidate['tier'] { return issues.some(x => primaryIssues.includes(x)) ? 'A' : issues.length ? 'B' : 'C'; }
export function widthEvidence(value: string) {
  const normalized = normalizeRoadText(value);
  const numericLooking = /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : null;
  // CSV metadata has no unit/method. Separate FD PDF is contextual evidence, not an edition-bound dictionary.
  return { raw: value, numericLooking, admittedNumeric: null, unit: 'unknown' as const,
    status: !normalized ? 'missing-width' : numericLooking === null ? 'ambiguous-width' : 'unverified-width-unit' };
}
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function reconcileAccess(rows: Candidate[]): Relationship[] {
  const result: Relationship[] = [];
  for (const [leftKey, rightKey] of [['A', 'B'], ['A', 'C'], ['B', 'C']] as const) {
    const left = rows.filter(x => x.sourceKey === leftKey), right = rows.filter(x => x.sourceKey === rightKey);
    const edges: Relationship[] = [];
    for (const a of left) {
      const possible = right.filter(b => (a.identity.base && a.identity.base === b.identity.base) ||
        (leftKey === 'A' && rightKey === 'C' && Boolean(a.raw['搶救困難地區場所']?.trim()) &&
          normalizeRoadText(a.raw['搶救困難地區場所']) === normalizeRoadText(b.place)));
      for (const b of possible) {
        const districtAgreement = Boolean(a.district && a.districtCode === b.districtCode && (!a.identity.embeddedDistrict || a.identity.embeddedDistrict === a.district) && (!b.identity.embeddedDistrict || b.identity.embeddedDistrict === b.district));
        const roadAgreement = Boolean(a.identity.complete && b.identity.complete && a.identity.normalized === b.identity.normalized);
        const placeExtent = rightKey !== 'C' || leftKey === 'A' && Boolean(a.raw['搶救困難地區場所']?.trim()) && normalizeRoadText(a.raw['搶救困難地區場所']) === normalizeRoadText(b.place);
        const extentAgreement = roadAgreement && !a.identity.broad && !b.identity.broad && placeExtent;
        const clean = ![...a.issues, ...b.issues].some(x => primaryIssues.includes(x));
        // Exact named road/alley documentation only. Place address containment is never inferred.
        const status = !districtAgreement ? 'rejected' : roadAgreement && extentAgreement && clean ? 'accepted' :
          a.identity.complete && b.identity.complete && !roadAgreement ? 'rejected' : 'ambiguous';
        const reason = !districtAgreement ? 'district-conflict' : status === 'accepted' ? 'exact-complete-label' :
          !clean ? 'source-identity-conflict' : roadAgreement && !extentAgreement ? 'place-extent-not-established' : !a.identity.complete || !b.identity.complete ? 'unknown-or-different-extent' : 'section-lane-alley-conflict';
        edges.push({ id: `${leftKey}${rightKey}:${a.id}:${b.id}`, pair: `${leftKey}/${rightKey}` as Relationship['pair'], leftId: a.id, rightId: b.id,
          alternatives: possible.map(x => x.id).sort(order), comparedFields: [leftKey === 'A' ? '列管名稱' : '巷道名稱', rightKey === 'B' ? '巷道名稱' : '地址', 'districtCode', ...(rightKey === 'C' ? ['搶救困難地區場所', '場所名稱'] : [])],
          districtAgreement, roadAgreement, extentAgreement, method: 'complete-label-and-district-v1', status, reasons: [reason, 'mixed-edition'], mixedEdition: true });
      }
      if (!possible.length) edges.push({ id: `${leftKey}${rightKey}:${a.id}:unmatched`, pair: `${leftKey}/${rightKey}` as Relationship['pair'], leftId: a.id, rightId: null,
        alternatives: [], comparedFields: ['name', 'districtCode'], districtAgreement: false, roadAgreement: false, extentAgreement: false,
        method: 'complete-label-and-district-v1', status: a.identity.base ? 'unmatched' : 'unsupported', reasons: [a.identity.base ? 'no-base-name-counterpart' : 'unparseable-road-identity'], mixedEdition: true });
    }
    // Accept only a one-to-one interpretation. Repeated road/place listings never merge into one asset.
    const provisional = edges.filter(x => x.status === 'accepted');
    const unsettled = edges.filter(x => x.status === 'ambiguous' && x.districtAgreement);
    for (const edge of provisional) if (provisional.filter(x => x.leftId === edge.leftId).length > 1 || provisional.filter(x => x.rightId === edge.rightId).length > 1 || unsettled.some(x => x.leftId === edge.leftId || x.rightId === edge.rightId)) {
      edge.status = 'ambiguous'; edge.reasons = ['multiple-compatible-counterparts', 'mixed-edition'];
    }
    result.push(...edges);
  }
  return result;
}
