# 快速開始指南

## 🎯 3 分鐘快速啟動

### 前置需求
- Node.js 16+ （[下載地址](https://nodejs.org/)）
- Git（[下載地址](https://git-scm.com/)）

### 快速啟動步驟

#### Windows 用戶：
```bash
# 1. 克隆倉庫
git clone https://github.com/willisXu/AISS.git
cd AISS

# 2. 切換到功能分支
git checkout claude/saas-chain-store-system-011CUqnNKWgvR1facfDAxDto

# 3. 安裝依賴
npm install

# 4. 初始化數據庫
npm run init-db

# 5. 啟動系統
npm start
```

#### Mac/Linux 用戶：
```bash
# 1. 克隆倉庫
git clone https://github.com/willisXu/AISS.git
cd AISS

# 2. 切換到功能分支
git checkout claude/saas-chain-store-system-011CUqnNKWgvR1facfDAxDto

# 3. 使用快速啟動腳本（一鍵啟動）
chmod +x start.sh
./start.sh
```

### 訪問系統

系統啟動後，在瀏覽器打開：
```
http://localhost:3000
```

### 登入資訊

- **租戶代碼**: `DEMO001`
- **使用者名稱**: `admin`
- **密碼**: `admin123`

---

## 🌐 部署到雲端（可選）

### 方式 1: Railway.app（推薦）

1. 訪問 [railway.app](https://railway.app)
2. 使用 GitHub 登入
3. 點擊 "New Project"
4. 選擇 "Deploy from GitHub repo"
5. 選擇 `willisXu/AISS` 倉庫
6. 選擇分支 `claude/saas-chain-store-system-011CUqnNKWgvR1facfDAxDto`
7. 等待部署完成（約 2-3 分鐘）
8. 點擊生成的網址即可訪問

**Railway 會自動：**
- ✅ 檢測 Node.js 環境
- ✅ 安裝依賴
- ✅ 初始化數據庫
- ✅ 啟動服務器
- ✅ 提供 HTTPS 網址

---

### 方式 2: Render.com（免費）

1. 訪問 [render.com](https://render.com)
2. 使用 GitHub 登入
3. 點擊 "New +" → "Web Service"
4. 連接 GitHub 倉庫
5. 設定：
   - **Name**: `saas-chain-store`
   - **Branch**: `claude/saas-chain-store-system-011CUqnNKWgvR1facfDAxDto`
   - **Build Command**: `npm install && npm run init-db`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
6. 點擊 "Create Web Service"
7. 等待部署（約 5 分鐘）

完成後會得到網址，例如：
```
https://saas-chain-store-xxxx.onrender.com
```

---

### 方式 3: Vercel（適合靜態部署）

Vercel 主要用於靜態網站，但也可以部署 Node.js API：

1. 安裝 Vercel CLI：
```bash
npm i -g vercel
```

2. 在項目目錄下執行：
```bash
vercel
```

3. 按照提示完成部署

---

## 🔧 常見問題

### Q1: 無法啟動服務器
**解決方法：**
```bash
# 檢查 Node.js 版本（需要 16+）
node -v

# 檢查 3000 端口是否被佔用
# Windows:
netstat -ano | findstr :3000

# Mac/Linux:
lsof -i :3000

# 如果端口被佔用，可以修改 .env 文件中的 PORT
```

### Q2: 數據庫初始化失敗
**解決方法：**
```bash
# 刪除舊的數據庫
rm -f database/store.db

# 重新初始化
npm run init-db
```

### Q3: 登入失敗
**檢查項目：**
- ✅ 租戶代碼是否正確：`DEMO001`
- ✅ 使用者名稱是否正確：`admin`
- ✅ 密碼是否正確：`admin123`
- ✅ 數據庫是否正確初始化

### Q4: 如何重置系統
```bash
# 停止服務器（Ctrl+C）

# 刪除數據庫
rm -f database/store.db

# 重新初始化
npm run init-db

# 重新啟動
npm start
```

---

## 📱 功能導覽

系統包含以下功能模組：

| 模組 | 路徑 | 說明 |
|------|------|------|
| 儀表板 | `/` 或 `/index.html` | 即時統計、銷售分析 |
| 門店管理 | `/stores.html` | 門店資料管理 |
| 商品管理 | `/products.html` | 商品 CRUD、分類管理 |
| 庫存管理 | `/inventory.html` | 庫存查詢、警報 |
| 採購管理 | `/purchases.html` | 採購訂單管理 |
| 銷售管理 | `/sales.html` | 銷售訂單查詢 |
| 收支管理 | `/payments.html` | 收支記錄 |
| 費用管理 | `/expenses.html` | 費用管理 |
| 報表分析 | `/reports.html` | 各類報表 |

---

## 🔑 示範數據

系統初始化後包含以下示範數據：

### 商品
- 可口可樂 330ml（成本 $15，售價 $25）
- 礦泉水 600ml（成本 $10，售價 $20）
- 咖啡 中杯（成本 $30，售價 $60）

### 門店
- 台北總店（台北市信義區信義路五段7號）

### 商品分類
- 飲料

### 支付方式
- 現金、信用卡、銀行轉帳、行動支付

### 費用類別
- 租金、水電費、薪資、行銷費用、維修費

---

## 🚀 下一步

1. **探索系統**：登入後瀏覽各個功能模組
2. **新增數據**：嘗試新增商品、門店等
3. **測試 API**：查看 `README.md` 中的 API 文檔
4. **自訂功能**：根據需求修改代碼

---

## 💡 技術支援

如有問題，請查看：
- [README.md](README.md) - 完整文檔
- [database_schema.sql](database_schema.sql) - 數據庫設計
- GitHub Issues - 提交問題或建議

---

## 📞 聯繫方式

遇到問題？
1. 查看本文檔的「常見問題」章節
2. 查看 [README.md](README.md) 的詳細說明
3. 在 GitHub 提交 Issue

祝使用愉快！🎉
