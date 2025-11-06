#!/bin/bash

# 快速啟動腳本
echo "🚀 啟動連鎖店管理系統..."
echo ""

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未安裝 Node.js"
    echo "請先安裝 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 檢查是否已安裝依賴
if [ ! -d "node_modules" ]; then
    echo "📦 正在安裝依賴..."
    npm install
    echo ""
fi

# 檢查數據庫是否存在
if [ ! -f "database/store.db" ]; then
    echo "🗄️  正在初始化數據庫..."
    npm run init-db
    echo ""
fi

# 啟動服務器
echo "🎉 系統啟動中..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  連鎖店管理系統 POC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 訪問地址: http://localhost:3000"
echo "📝 登入資訊:"
echo "   租戶代碼: DEMO001"
echo "   帳號: admin"
echo "   密碼: admin123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 啟動服務器
npm start
