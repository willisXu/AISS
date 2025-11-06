const fs = require('fs');
const path = require('path');
const { db } = require('../database/db');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  console.log('🔧 Initializing database...');

  try {
    // 讀取 SQL schema 文件
    const schemaPath = path.join(__dirname, '../database_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 分割 SQL 語句
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // 執行所有 SQL 語句
    for (const statement of statements) {
      await new Promise((resolve, reject) => {
        db.run(statement, (err) => {
          if (err) {
            // 忽略表已存在的錯誤
            if (err.message.includes('already exists')) {
              resolve();
            } else {
              reject(err);
            }
          } else {
            resolve();
          }
        });
      });
    }

    // 創建示範租戶和管理員帳號
    const passwordHash = await bcrypt.hash('admin123', 10);

    // 檢查是否已有租戶
    const existingTenant = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM tenants WHERE tenant_code = ?', ['DEMO001'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingTenant) {
      // 插入示範租戶
      const tenantResult = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO tenants (tenant_code, company_name, contact_person, contact_email, plan_type)
           VALUES (?, ?, ?, ?, ?)`,
          ['DEMO001', '示範連鎖店', '張經理', 'demo@example.com', 'premium'],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      const tenantId = tenantResult;

      // 插入管理員帳號
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (tenant_id, username, password_hash, full_name, email, role)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [tenantId, 'admin', passwordHash, '系統管理員', 'admin@example.com', 'admin'],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // 插入支付方式
      const paymentMethods = [
        ['CASH', '現金'],
        ['CARD', '信用卡'],
        ['TRANSFER', '銀行轉帳'],
        ['MOBILE', '行動支付']
      ];

      for (const [code, name] of paymentMethods) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO payment_methods (tenant_id, method_code, method_name) VALUES (?, ?, ?)',
            [tenantId, code, name],
            (err) => {
              if (err && !err.message.includes('UNIQUE')) reject(err);
              else resolve();
            }
          );
        });
      }

      // 插入費用類別
      const expenseCategories = [
        ['RENT', '租金'],
        ['UTILITY', '水電費'],
        ['SALARY', '薪資'],
        ['MARKETING', '行銷費用'],
        ['MAINTENANCE', '維修費']
      ];

      for (const [code, name] of expenseCategories) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO expense_categories (tenant_id, category_code, category_name) VALUES (?, ?, ?)',
            [tenantId, code, name],
            (err) => {
              if (err && !err.message.includes('UNIQUE')) reject(err);
              else resolve();
            }
          );
        });
      }

      // 插入示範門店
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO stores (tenant_id, store_code, store_name, address, phone)
           VALUES (?, ?, ?, ?, ?)`,
          [tenantId, 'STORE001', '台北總店', '台北市信義區信義路五段7號', '02-1234-5678'],
          (err) => {
            if (err && !err.message.includes('UNIQUE')) reject(err);
            else resolve();
          }
        );
      });

      // 插入示範商品分類
      const categoryResult = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO categories (tenant_id, category_code, category_name, description)
           VALUES (?, ?, ?, ?)`,
          [tenantId, 'CAT001', '飲料', '各式飲料商品'],
          function(err) {
            if (err && !err.message.includes('UNIQUE')) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // 插入示範商品
      const products = [
        ['PRD001', '可口可樂 330ml', 15, 25],
        ['PRD002', '礦泉水 600ml', 10, 20],
        ['PRD003', '咖啡 中杯', 30, 60]
      ];

      for (const [code, name, cost, price] of products) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO products (tenant_id, product_code, product_name, category_id, unit, cost_price, selling_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, code, name, categoryResult, '個', cost, price],
            (err) => {
              if (err && !err.message.includes('UNIQUE')) reject(err);
              else resolve();
            }
          );
        });
      }

      console.log('✅ Database initialized successfully!');
      console.log('📝 Demo tenant created: DEMO001');
      console.log('👤 Admin user created: admin / admin123');
    } else {
      console.log('ℹ️  Database already initialized');
    }

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    db.close();
  }
}

// 執行初始化
initDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
