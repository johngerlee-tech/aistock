# 🚀 個人專屬 AI 投資資訊站 - Cloudflare Pages 雲端部署教學手冊

本專案已完成針對 **Cloudflare Pages 全球邊緣網路 (Edge Network)** 的專屬優化，具備：
1. **全球免費 CDN 加速與自動 HTTPS 安全憑證**。
2. **內建 Serverless Edge Functions (`functions/api/quote.js`)**：直接在邊緣伺服器反向代理台灣證交所 (TWSE) 與櫃買中心 (TPEx) 的盤中即時報價，**100% 徹底解決瀏覽器端 CORS 跨域封鎖問題**！
3. **安全防護標頭 (`_headers`) 與 SPA 路由 (`_redirects`)**。

您可以依照個人習慣選擇以下任一方式將網站上傳至 Cloudflare：

---

## 方式一：網頁拖曳直接上傳 (Direct Upload) - 30秒完成、最簡單

適合不想安裝 Git 或命令列工具的使用者。

### 操作步驟：
1. 開啟並登入 [Cloudflare 控制台](https://dash.cloudflare.com/)（若無帳號可免費註冊）。
2. 在左側選單點選 **「Workers 和 Pages (Workers & Pages)」**。
3. 點擊右上角 **「建立 (Create application)」** ➔ 選擇 **「Pages」** 分頁。
4. 選擇 **「上傳資產 (Upload assets)」**。
5. 設定專案名稱（例如：`my-ai-stock` 或 `tw-stock-station`）。
6. **上傳檔案**：
   - 直接將您電腦中的 `AI股票資訊站` 資料夾拖入上傳區塊（或先壓縮為 `.zip` 後拖入）。
   - 請確認根目錄包含：`index.html`、`_headers`、`_redirects` 以及 `functions/` 資料夾。
7. 點擊 **「部署網站 (Deploy site)」**。
8. 稍等數秒後，即可獲得免費的專屬二級網域（例如：`https://my-ai-stock.pages.dev`）！隨時隨地用手機或電腦瀏覽器皆可開啟。

---

## 方式二：GitHub 自動連動部署 (推薦、自動啟用 Edge Functions 即時 API)

若您有 GitHub 帳號，此方式可在每次更新程式碼時自動更新網站，且完整支援邊緣即時報價代理。

### 操作步驟：
1. 在 GitHub 建立一個新的儲存庫（Repository，可設為 Private 私人）。
2. 將本專案資料夾推送到該 GitHub 儲存庫：
   ```bash
   git init
   git add .
   git commit -m "Initial commit of AI Stock Station"
   git branch -M main
   git remote add origin https://github.com/<您的GitHub帳號>/<您的儲存庫名稱>.git
   git push -u origin main
   ```
3. 前往 Cloudflare 控制台 ➔ **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ 選擇 **「連線到 Git (Connect to Git)」**。
4. 授權並選取您的 GitHub 儲存庫。
5. **建置設定 (Build Settings)**：
   - **Framework preset (架構預設)**：選擇 `None`
   - **Build command (建置命令)**：留空（不需填寫）
   - **Build output directory (輸出目錄)**：填寫 `/` 或留空
6. 點擊 **「Save and Deploy (儲存並部署)」**。
7. 部署完成後，Cloudflare 會自動辨識 `/functions/api/quote.js`，開啟網頁即可享受自動盤中即時報價！

---

## 方式三：使用 Wrangler CLI 命令列部署 (適合開發者)

若您已安裝 Node.js，可直接在專案目錄使用 Cloudflare 官方命令列工具發布：

```bash
# 1. 登入 Cloudflare
npx wrangler login

# 2. 一鍵發布到 Cloudflare Pages
npx wrangler pages deploy . --project-name=my-ai-stock
```

---

## ☁️ 關鍵升級：建立 Cloudflare D1 雲端資料庫（達成跨電腦免匯出自動同步）

若希望在家裡電腦與公司電腦之間**免手動匯出/匯入 CSV**，持股部位、研究備註與安全 PIN 碼隨時自動即時同步，請依照以下步驟啟用 D1 資料庫綁定：

### 視覺化啟用步驟（最推薦、30秒完成）：
1. 登入 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 在左側選單點擊 **「Storage & Databases」** ➔ 選擇 **「D1 SQL Database」**。
3. 點擊 **「Create database (建立資料庫)」**：
   - 資料庫名稱填寫：`aistock_db`
   - 點擊 **Create** 即可（零門檻：系統首次連線會自動建表，不需手動寫 SQL！）。
4. 前往左側選單 **「Workers & Pages」** ➔ 點擊您的 Pages 專案名稱（例如 `my-ai-stock`）。
5. 點擊頂部分頁 **「Settings (設定)」** ➔ 選擇左側 **「Functions」**。
6. 向下滾動找到 **「D1 database bindings (D1 資料庫綁定)」** ➔ 點擊 **「Add binding (新增綁定)」**：
   - **Variable name (變數名稱)**：務必填寫大寫 `DB`
   - **D1 database (選取資料庫)**：下拉選擇剛剛建立的 `aistock_db`
7. 點擊 **Save (儲存)**。
8. 重新點擊 **Deploy** 或推送一次更新，即刻享有全球邊緣毫秒級資料庫多端自動即時同步！

---

## 💡 部署至 Cloudflare 後的核心優勢

| 功能項目 | 本機檔案直接開啟 (`file://`) | 部署至 Cloudflare Pages (`https://`) |
| :--- | :--- | :--- |
| **隨處跨裝置使用** | 僅限目前這台電腦 | 手位、平板、公司電腦、筆電隨時開啟 |
| **多端自動同步** | 不支援（各電腦獨立） | **串接 Cloudflare D1 (5GB 免費)，家裡與公司自動即時同步** |
| **盤中即時報價** | 受瀏覽器 CORS 限制需安全模擬 | **自動透過 Cloudflare 邊緣節點代理 MIS，100% 真實即時成交價** |
| **自選股資料保存** | 儲存於本機瀏覽器 LocalStorage | **雙重保險：本地 LocalStorage 快取 + D1 雲端永久儲存** |
| **自訂網域** | 不支援 | 支援免費綁定個人自訂網域 (如 `stock.yourname.com`) |
| **連線速度** | 本地磁碟 | 全球 300+ 邊緣節點 CDN 快取極速開啟 |

---

## 常用操作指引

- **更新持股清單**：在網頁點擊「**📥 智慧匯入 / 匯出**」，支援上傳券商庫存或自訂 CSV。
- **盤中即時刷新**：網頁右上角勾選「**盤中自動刷新(30s)**」，系統將在開盤時段每 30 秒自動更新報價與漲跌損益。
- **雲端即時同步**：頂部「**D1 雲端**」按鈕會顯示連線狀態，所有持股變更、研究筆記與密碼修改均會自動在背景毫秒級同步至雲端 D1！
