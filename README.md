# 連鎖店管理 SaaS 系統

一個完整的多租戶連鎖店管理系統POC，支援進銷存管理、金流管理等功能。

## 功能特色

### 🏢 多租戶架構
- 完整的租戶隔離機制
- 獨立的資料存儲空間
- 靈活的權限管理系統

### 📦 進銷存管理
- **商品管理**：商品資料、分類管理、價格設定
- **庫存管理**：即時庫存追蹤、庫存警報、盤點功能
- **採購管理**：採購訂單、供應商管理、收貨處理
- **銷售管理**：銷售訂單、客戶資料、訂單追蹤

### 💰 金流管理
- **收支管理**：收入/支出記錄、支付方式管理
- **費用管理**：費用記錄、審批流程、費用分類
- **報表分析**：銷售報表、庫存報表、財務報表

### 📊 數據分析
- 即時儀表板
- 熱銷商品分析
- 門店銷售排名
- 財務績效追蹤

## 技術架構

### 後端
- **Runtime**: Node.js
- **框架**: Express.js
- **數據庫**: SQLite (適合POC和小型部署)
- **認證**: JWT (JSON Web Tokens)
- **密碼加密**: bcryptjs

### 前端
- **技術**: 純 HTML/CSS/JavaScript
- **UI框架**: 自定義CSS (無需編譯)
- **圖示**: Font Awesome
- **部署**: 靜態文件，可部署至 GitHub Pages

## 快速開始

### 安裝依賴

```bash
npm install
```

### 初始化數據庫

```bash
npm run init-db
```

這將創建數據庫並插入示範數據：
- 租戶代碼: `DEMO001`
- 使用者名稱: `admin`
- 密碼: `admin123`

### 啟動服務器

```bash
npm start
```

或使用開發模式（自動重啟）：

```bash
npm run dev
```

服務器將在 http://localhost:3000 啟動

### 訪問系統

1. 打開瀏覽器訪問 http://localhost:3000
2. 使用示範帳號登入：
   - 租戶代碼: `DEMO001`
   - 帳號: `admin`
   - 密碼: `admin123`

## 項目結構

```
AISS/
├── database/                 # 數據庫相關
│   ├── db.js                # 數據庫連接
│   └── store.db             # SQLite 數據庫文件
├── middleware/              # Express 中間件
│   └── auth.js             # 認證中間件
├── routes/                  # API 路由
│   ├── auth.js             # 認證 API
│   ├── stores.js           # 門店管理 API
│   ├── products.js         # 商品管理 API
│   ├── inventory.js        # 庫存管理 API
│   ├── purchases.js        # 採購管理 API
│   ├── sales.js            # 銷售管理 API
│   ├── payments.js         # 支付管理 API
│   ├── expenses.js         # 費用管理 API
│   └── reports.js          # 報表 API
├── public/                  # 前端靜態文件
│   ├── css/
│   │   └── style.css       # 全局樣式
│   ├── js/
│   │   └── api.js          # API 客戶端
│   ├── index.html          # 儀表板
│   ├── login.html          # 登入頁面
│   ├── products.html       # 商品管理
│   ├── inventory.html      # 庫存管理
│   ├── sales.html          # 銷售管理
│   └── ...                 # 其他頁面
├── scripts/
│   └── init-db.js          # 數據庫初始化腳本
├── database_schema.sql      # 數據庫架構定義
├── server.js               # Express 服務器
├── package.json            # 項目配置
└── README.md              # 本文件
```

## 數據庫設計

系統採用多租戶架構，所有數據表都包含 `tenant_id` 欄位以實現租戶隔離。

### 核心表格

- **tenants**: 租戶資料
- **users**: 用戶資料
- **stores**: 門店資料
- **categories**: 商品分類
- **products**: 商品資料
- **inventory**: 庫存資料
- **suppliers**: 供應商資料
- **purchase_orders**: 採購訂單
- **purchase_order_items**: 採購訂單明細
- **sales_orders**: 銷售訂單
- **sales_order_items**: 銷售訂單明細
- **inventory_transactions**: 庫存異動記錄
- **payment_methods**: 支付方式
- **payments**: 支付記錄
- **expense_categories**: 費用分類
- **expenses**: 費用記錄

詳細的數據庫架構請參考 `database_schema.sql` 文件。

## API 文檔

### 認證 API

- `POST /api/auth/login` - 用戶登入
- `GET /api/auth/me` - 獲取當前用戶資訊
- `POST /api/auth/change-password` - 修改密碼

### 門店管理 API

- `GET /api/stores` - 獲取門店列表
- `GET /api/stores/:id` - 獲取單個門店
- `POST /api/stores` - 創建門店
- `PUT /api/stores/:id` - 更新門店
- `DELETE /api/stores/:id` - 刪除門店

### 商品管理 API

- `GET /api/products` - 獲取商品列表
- `GET /api/products/:id` - 獲取單個商品
- `POST /api/products` - 創建商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 刪除商品
- `GET /api/products/categories/all` - 獲取所有分類

### 庫存管理 API

- `GET /api/inventory` - 獲取庫存列表
- `GET /api/inventory/alerts` - 獲取庫存警報
- `PUT /api/inventory/:id` - 更新庫存設定
- `POST /api/inventory/stock-take` - 庫存盤點
- `GET /api/inventory/transactions` - 獲取庫存異動記錄

### 採購管理 API

- `GET /api/purchases` - 獲取採購訂單列表
- `GET /api/purchases/:id` - 獲取單個採購訂單
- `POST /api/purchases` - 創建採購訂單
- `POST /api/purchases/:id/receive` - 確認收貨
- `GET /api/purchases/suppliers/all` - 獲取供應商列表

### 銷售管理 API

- `GET /api/sales` - 獲取銷售訂單列表
- `GET /api/sales/:id` - 獲取單個銷售訂單
- `POST /api/sales` - 創建銷售訂單
- `GET /api/sales/stats/daily` - 獲取銷售統計

### 報表 API

- `GET /api/reports/dashboard` - 獲取儀表板數據
- `GET /api/reports/sales` - 獲取銷售報表
- `GET /api/reports/inventory` - 獲取庫存報表
- `GET /api/reports/financial` - 獲取財務報表

完整的API文檔請參考各路由文件中的實現。

## 部署

### 本地部署

```bash
# 安裝依賴
npm install

# 初始化數據庫
npm run init-db

# 啟動服務器
npm start
```

### Docker 部署（可選）

```dockerfile
# Dockerfile 示例
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run init-db
EXPOSE 3000
CMD ["npm", "start"]
```

### 環境變數

創建 `.env` 文件（參考 `.env.example`）：

```
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-key
DB_PATH=./database/store.db
CORS_ORIGIN=*
```

## 安全性建議

⚠️ **這是一個POC系統，不建議直接用於生產環境。**

如果要用於生產環境，請注意：

1. 更改 JWT_SECRET 為強密碼
2. 啟用 HTTPS
3. 實施更嚴格的 CORS 政策
4. 添加請求速率限制
5. 實施更完善的錯誤處理
6. 考慮使用 PostgreSQL 或 MySQL 替代 SQLite
7. 添加數據備份機制
8. 實施審計日誌
9. 加強密碼策略

## 開發路線圖

- [ ] 完善所有頁面的 CRUD 功能
- [ ] 添加數據可視化圖表
- [ ] 實施角色權限細分
- [ ] 添加批量操作功能
- [ ] 實施數據導入/導出
- [ ] 添加通知系統
- [ ] 實施移動端響應式設計優化
- [ ] 添加多語言支持

## 授權

MIT License

## 聯繫方式

如有問題或建議，請提交 Issue。

---

**注意**: 這是一個 POC (Proof of Concept) 系統，主要用於展示功能和架構。在生產環境使用前，請進行充分的測試和安全加固。
