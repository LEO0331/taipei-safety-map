export const accessIssueLabels: Record<string, [string,string]> = {
  'unknown-recognition': ['未知認定代碼','Unknown recognition code'], 'district-label-conflict': ['名稱行政區與代碼衝突','Embedded district/code conflict'], 'place-extent-not-established': ['場所範圍證據未建立','Place extent evidence not established'],
  'duplicate-sequence': ['重複來源序號','Duplicate source sequence'], 'missing-sequence': ['缺少來源序號','Missing source sequence'],
  'missing-name': ['缺少核心名稱','Missing core name'], 'unknown-district': ['無法查證行政區代碼','Unverified district code'],
  'unknown-category': ['未知來源分類','Unknown source classification'], 'ambiguous-association': ['潛在對應身分／範圍歧義','Potential association identity/extent ambiguity'],
  'duplicate-identity': ['重複文件名稱組合','Repeated documentary identity'], 'incomplete-extent': ['路段／地址範圍待釐清','Extent requires clarification'],
  'broad-or-intersection-address': ['廣域／範圍／路口描述','Area, range or intersection description'], 'multiple-village-labels': ['多里別文件標籤','Multiple village document labels'],
  'unparseable-road-label': ['未能解析單一道路名稱','No single parsed road identity'], 'unverified-width-unit': ['寬度單位及測量語意未與本版連結','Width unit/method not bound to this edition'],
  'missing-width': ['缺少寬度原值','Missing width text'], 'ambiguous-width': ['寬度原值格式歧義','Ambiguous width text'],
  'unverified-classification-definition': ['缺少本版分類字典','No edition-bound classification dictionary'],
  'missing-geographic-evidence': ['未接受相容地理證據','No admitted compatible geography'], 'edition-comparability-gap': ['留存版與本版不同、參考期未知','Changed retained edition; reference cutoff unknown'],
  'mixed-edition-association': ['混合版本研究對應','Mixed-edition research association'], 'unmatched-association': ['無潛在跨來源名稱對應','No potential cross-source name counterpart'],
  'district-conflict': ['行政區不一致','District conflict'], 'exact-complete-label': ['完整道路／巷弄名稱一致','Exact complete road/alley label'],
  'section-lane-alley-conflict': ['路段／巷／弄不一致','Section, lane or alley conflict'], 'unknown-or-different-extent': ['範圍未知或不相容','Unknown or incompatible extent'],
  'source-identity-conflict': ['來源身分衝突','Source identity conflict'], 'multiple-compatible-counterparts': ['多筆相容候選','Multiple compatible counterparts'],
  'no-base-name-counterpart': ['無同主路名候選','No base-road counterpart'], 'unparseable-road-identity': ['不支援的道路識別','Unsupported road identity'], 'mixed-edition': ['混合版本文件研究','Mixed-edition documentary research'],
  'source-filter': ['來源篩選','Source filter'], 'primary-filter': ['非主要衝突級別','Outside primary tier'], 'documentation-filter': ['非文件缺口級別','Outside documentation tier'],
  'district-filter': ['行政區篩選','District filter'], 'category-filter': ['來源分類篩選','Source-category filter'], 'query-filter': ['搜尋篩選','Search filter'], 'not-admitted': ['來源未接受','Source not admitted'],
};
export const accessSourceLabels = { A: ['消防通道清冊','Fire Access Route Registry'], B: ['狹小巷道清冊','Narrow Alley Registry'], C: ['火災搶救困難地區場所','Difficult Rescue Places'] };
export const accessStatusLabels = { accepted: ['接受的研究對應','Accepted research association'], ambiguous: ['歧義待查核','Ambiguous'], rejected: ['排除的對應','Rejected'], unmatched: ['無候選對應','Unmatched'], unsupported: ['識別證據不足','Unsupported identity'] };
