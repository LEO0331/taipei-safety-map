# 臺北市公共安全地圖

[English](README.md) · **繁體中文**

這是一個使用 Vite、React、TypeScript 與 Leaflet 建置的雙語儀表板，用於查詢及探索臺北市公共安全公開資料。它是公開資料參考與歷史分析工具，**不是**即時緊急服務。

## 正確使用方式

- 發生緊急狀況請撥打 **119**，並遵循現場及主管機關指示。
- 使用公開紀錄前，請向主管機關確認資源是否可用、入口、營運狀態、容量、封閉情形及最新指示。
- 歷史紀錄、地圖標記、排名與件數不代表目前安全程度、風險、執法品質、法律結果或個人適用性。
- 本儀表板不建立綜合安全分數，也不從無關資料集推論因果關係。

## 導覽方式

主導覽分為五個分類，避免使用者必須瀏覽過長的平面分頁：

1. **快速探索**：地圖、附近公開資源、概覽與資料說明。
2. **防災與整備**：消防救援通道、步道、淹水、停班停課及應變中心歷史。
3. **健康與設施**：公共衛生、消防安全、液化石油氣、用電設備及捐贈紀錄。
4. **交通與裁決**：交通設備、拖吊、取締、民眾檢舉及申訴統計。
5. **歷史與社區紀錄**：歷史犯罪、家暴通報、重大職災及噪音紀錄。

每個分類會顯示較短的模組列；在小螢幕上可水平捲動，並保留鍵盤操作與目前頁面提示。

## 資料集與限制

儀表板收錄 AED、醫療院所、消防栓、防空及緊急避難處所、疏散門、監視器、科技執法、拖吊、交通申訴、步道、淹水、部分犯罪歷史、登革熱、消防救援等公開名錄、統計與歷史紀錄。

各模組都必須依其資料定義解讀：

- 資源名錄不保證即時可用、可進入、容量或適用性。
- 犯罪及敏感事件使用彙整、模糊或刻意去識別化呈現；不得據此判斷個人、場所、路線或房產。
- 交通申訴資料僅公布每月前五名條款；未上榜不等於零件，件數是提出申訴的統計，不代表申訴結果。
- 淹水、停班停課及步道資料是歷史資訊，不是預報、即時警示、導航或避難指示。
- 沒有官方座標的資料只以名錄或摘要呈現，不會製作虛構地圖標記。

請參閱[儀表板決策支援與設計建議](doc/dashboard-decision-support-and-design.md)，了解資料解讀、營運治理及產品優先事項。

## 本機資料架構

客戶端從 `public/data/` 的靜態 JSON 載入資料，不會在執行期間依賴臺北市開放資料平台。來源快照及轉換程式分別位於 `data/raw/` 與 `scripts/`。

轉換程式必須保留官方原始欄位、保守解析日期與件數、回報資料品質問題，且不得把缺值悄悄改為零。發布資料更新時，應同步發布資料、詮釋資料與 PWA 快取設定。

### 交通違規申訴條款前五名

`traffic_violation_appeal_top_clauses` 使用臺北市交通局裁決所的[違反道路交通管理事件提出申訴條款前 5 名](https://data.taipei/dataset/detail?id=da715207-29e8-4b8d-b680-7fc120211512)資料集。

- 客戶端資料：`public/data/traffic-violation-appeal-top-clauses/records.json` 與 `metadata.json`
- 轉換命令：`npm run data:convert:traffic-violation-appeals`
- 保留欄位：民國年月、排名、條款、條款中文說明及件數
- 西元年月僅在可明確解析時推導；缺值或格式不正確的件數維持缺值

不得由此資料推估全市申訴總數、申訴成功率、完整條款占比、法律風險分數、執法品質排名或法律解釋。

## 開發

```bash
npm install
npm run dev
```

驗證：

```bash
npm run build
npm test
```

資料更新請使用 `package.json` 中各模組的 `data:fetch:*` 及 `data:convert:*` 命令，並在發布前檢查產生的詮釋資料與轉換報告。

## Policy #9 — 橋梁檢測與維護證據查核

於「防災與整備 → 橋梁證據查核（Policy #9）」開啟獨立雙語決策介面，原橋梁目錄保留。A 為 416 筆檢測／維護來源列、415 個來源內分組；B 為 612 筆獨立保存的資產清冊列。保守對帳接受 216 筆本版研究對應，其中 194 筆通過地理文件查核門檻；這不是官方交叉表或結構安全排名。

Mode A 提供文件級別、5／10／全部查核名額、證據缺口優先與平衡行政查核、篩選、實際識別碼比較、來源沿革及安全 JSON／CSV 匯出。Mode B 只接受身分與座標門檻均通過的紀錄；Mode C 不可用。維護缺漏不代表零支出或未維護，公開年度也不能構成確定逾期判定。

政策程式與資料只在進入模組時載入；瀏覽器不呼叫官方資料 API。依序執行 `npm run data:fetch:bridge-policy`、`npm run data:audit:bridge-policy`、`npm run data:build:bridge-policy`、`npm run data:verify:bridge-policy` 及 `./init.sh` 可重現。預設 fetch 僅驗證留存來源；`--refresh` 將新版本放入獨立待審目錄，再明確接受。

詳見[中文決策 MVP](docs/bridge-policy-decision-mvp.zh-TW.md)、[交付與驗證](docs/bridge-policy-delivery.md)、[來源稽核](docs/bridge-policy-source-audit.md)、[身分合約](docs/bridge-policy-identity-contract.md)、[地理證據](docs/bridge-policy-geographic-evidence.md)及[方法與敏感度](docs/bridge-policy-methodology.md)。

## 專案文件

- [AGENTS.md](AGENTS.md)：編碼代理的啟動、範圍及驗證規則
- [feature_list.json](feature_list.json)：功能狀態與證據
- [session-handoff.md](session-handoff.md)：目前交接內容
- [儀表板決策支援建議](doc/dashboard-decision-support-and-design.md)：客戶與資料治理建議
## Policy #12 — 消防通道與狹小巷道證據查核

於「防災與整備 → 消防通道證據查核（Policy #12）」或 `?view=fire-rescue-access-policy` 開啟獨立雙語模組。本次實際取得 A/B/C 為185／273／411筆；原探索模組185／274／446版保留。合計869筆只是行政文件工作量，不是獨立道路或場所數。

Mode A提供文件級別、5／10／全部查核名額、證據缺口優先與來源／行政區平衡策略、來源分類篩選、實際ID敏感度、沿革與安全JSON/CSV摘要。Mode B僅接受一項完整名稱研究對應：武昌街1段16巷；其他歧義／排除皆保留稽核。Mode C及地理證據尚不可用。來源寬度、紅黃標籤與場所等級不代表目前淨空、火災機率或實際救災能力。

程式及快照只於進入政策模組載入，瀏覽器不呼叫官方API或地理編碼。依序執行 `data:fetch:fire-rescue-access-policy`、`data:audit:fire-rescue-access-policy`、`data:build:fire-rescue-access-policy`、`data:verify:fire-rescue-access-policy` 及 `./init.sh` 可重現；以上資料命令均以 `npm run` 執行。預設fetch離線，明確 `--refresh` 才暫存下載，稽核後再明確接受。沒有新增相依套件。

詳見[中文決策 MVP](docs/fire-rescue-access-policy-decision-mvp.zh-TW.md)、[來源可行性](docs/fire-rescue-access-policy-source-feasibility.md)、[來源稽核](docs/fire-rescue-access-policy-source-audit.md)、[身分合約](docs/fire-rescue-access-policy-identity-contract.md)、[分類與寬度](docs/fire-rescue-access-policy-classification-and-width.md)、[地理證據](docs/fire-rescue-access-policy-geographic-evidence.md)、[方法](docs/fire-rescue-access-policy-methodology.md)、[實際結果](docs/fire-rescue-access-policy-results.json)及[交付驗證](docs/fire-rescue-access-policy-delivery.md)。
