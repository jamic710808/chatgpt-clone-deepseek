# Vercel 部署檢討與錯誤紀錄 (Postmortem)

**紀錄日期**：2026-04-16  
**專案名稱**：DeepSeek Clone (FastAPI + React/Vite)  
**部署目標**：Vercel (Serverless Function + Vercel Postgres)

---

## 1. 部署過程概述
本次目標是將原本基於本地 SQLite 與分離式架構的 DeepSeek Clone 整合為單一部署的 Vercel 專案。為適應 Serverless 環境，我們將前端 API 請求導向 `/api/` 路由，並將後端資料庫遷移至 **Vercel Postgres**。

在推送程式碼與 Vercel 自動構建的過程中，我們總共遭遇了 3 個阻礙部署的致命錯誤。以下將逐一還原發生原因、解決方案與未來的防範建議。

---

## 2. 錯誤紀錄與分析

### ❌ 錯誤 1：TypeScript 嚴格編譯失敗 (前端)
**【現象】**
Vercel 執行 `pnpm run build` 時失敗，回報 `exit code 2`。
錯誤訊息：
```text
src/components/MessageItem.tsx(1,16): error TS6133: 'Bot' is declared but its value is never read.
src/components/MessageList.tsx(2,10): error TS6133: 'MessageSquareText' is declared but its value is never read.
```

**【發生原因】**
在開發過程中可能因為 UI 調整引入了元件，但後續未實際使用（如 `Bot` 與 `MessageSquareText` icon）。由於 Vite 模板預設啟用了嚴格的 TypeScript 檢查 (`tsc -b`)，任何未使用的變數或匯入都會被視為編譯錯誤並中斷打包流程。

**【解決方案】**
進入對應的檔案，將第 1、第 2 行的無效匯入 (unused imports) 刪除，並在本地運行 `pnpm tsc -b` 驗證綠燈後再推送。

---

### ❌ 錯誤 2：遺漏依賴套件 ModuleNotFoundError (後端)
**【現象】**
Vercel 部署成功後，呼叫 `/api/health` 卻得到 `500 FUNCTION_INVOCATION_FAILED` 錯誤。查看 Vercel Logs 後發現：
```text
ModuleNotFoundError: No module named 'aiosqlite'
```

**【發生原因】**
雖然我們為上了雲端已經改用 PostgreSQL 連線（依賴 `asyncpg`），但 `api/database.py` 中保留了本地開發的回落機制（Fallback）：
`DATABASE_URL = raw_url or "sqlite+aiosqlite:///./chat.db"`
即使在 Vercel 執行時並不會真正連線到 SQLite，SQLAlchemy 引擎在初始化與載入方言時，仍會掃描相應的 Driver。由於 `api/requirements.txt` 中漏加了 `aiosqlite`，導致 Python 啟動立刻崩潰。

**【解決方案】**
在 `api/requirements.txt` 中補上 `aiosqlite==0.19.0`，確保無論是連接雲端還是執行初始宣告，所有被提及的資料庫驅動都在環境中。

---

### ❌ 錯誤 3：asyncpg 不支援 SSLMode 參數 (資料庫連線)
**【現象】**
補上 `aiosqlite` 後，Python 終於成功啟動，但在真正連線資料庫時再次崩潰。Vercel Logs 顯示：
```text
TypeError: connect() got an unexpected keyword argument 'sslmode'
```

**【發生原因】**
Vercel 自動產生並注入的環境變數 `POSTGRES_URL`，其字串結尾通常會帶有安全參數查詢，例如：
`postgresql://user:pass@host:5432/db?sslmode=require`
然而，Python 的非同步驅動程式 `asyncpg` 並不支援直接透過 URL 的 query parameter 來解析 `sslmode`。SQLAlchemy 發現這個多餘的參數後將其強行傳給 `connect()`，因而觸發 `TypeError`。

**【解決方案】**
在 `api/database.py` 的初始化階段，寫入手動過濾邏輯：剖析 `raw_url` 並強制移除 `?sslmode=require` 與任何 `sslmode` 相關字串。

---

## 3. 防範與改進建議 (Action Items)

為了避免日後在部署階段反覆踩坑，建議採取以下 3 點預防措施：

1. **部署前務必執行本地靜態檢查**
   在進行 `git commit` 或 `git push` 前，先在終端機跑一次 `npm run build`（或 `pnpm tsc -b`）。更進階的作法是在專案中配置 **husky** 與 **lint-staged**，讓程式在 `git commit` 當下自動執行 Lint 與 Type Check，不合格的代碼直接禁止提交。

2. **嚴格分離開發與生產環境的資料庫邏輯**
   若生產環境使用 PostgreSQL，本機開發卻用 SQLite，極易引發各種方言上的語法錯誤或依賴遺漏。建議：
   - 解決依賴問題：可用 `try...except` 將 SQLite 的載入包裝起來，生產環境就不會因為缺少模組而阻斷執行。
   - 升級開發環境：透過 **Docker** 在本地跑一個 PostgreSQL 容器，讓開發與生產的資料庫引擎保持一致，及早暴露 `sslmode` 這種連線字串問題。

3. **連線字串的強健性 (Robustness) 處理**
   未來在接收由 PaaS 平台（如 Vercel, Heroku, Supabase）動態注入的 Database URL 時，最好統一使用 `urllib.parse` 來標準化解析與修改 query parameters，取代單純的字串 `.replace()` 操作，這能大幅降低處理各種變形字串時出錯的機率。
