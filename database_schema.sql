-- ============================================
-- 連鎖店管理 SaaS 系統數據庫設計
-- 支援多租戶、進銷存、金流管理
-- ============================================

-- 租戶表（多租戶核心）
CREATE TABLE tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    plan_type VARCHAR(20) DEFAULT 'basic', -- basic, premium, enterprise
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用戶表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL, -- admin, manager, staff, viewer
    status VARCHAR(20) DEFAULT 'active', -- active, inactive
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, username)
);

-- 門店表
CREATE TABLE stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    store_code VARCHAR(50) NOT NULL,
    store_name VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    manager_id INTEGER,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (manager_id) REFERENCES users(id),
    UNIQUE(tenant_id, store_code)
);

-- 商品分類表
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    parent_id INTEGER,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (parent_id) REFERENCES categories(id),
    UNIQUE(tenant_id, category_code)
);

-- 商品表
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    category_id INTEGER,
    description TEXT,
    unit VARCHAR(20), -- 單位：個、箱、公斤等
    cost_price DECIMAL(10, 2) DEFAULT 0,
    selling_price DECIMAL(10, 2) DEFAULT 0,
    barcode VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, discontinued
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    UNIQUE(tenant_id, product_code)
);

-- 庫存表（各門店庫存）
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 0,
    min_stock_level DECIMAL(10, 2) DEFAULT 0, -- 最低庫存警戒
    max_stock_level DECIMAL(10, 2) DEFAULT 0, -- 最高庫存
    last_stock_take DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(tenant_id, store_id, product_id)
);

-- 供應商表
CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    supplier_code VARCHAR(50) NOT NULL,
    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    address TEXT,
    payment_terms TEXT, -- 付款條件
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, supplier_code)
);

-- 採購單表
CREATE TABLE purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    store_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, approved, received, cancelled
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(tenant_id, order_number)
);

-- 採購單明細表
CREATE TABLE purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    received_quantity DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 銷售單表
CREATE TABLE sales_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    store_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    total_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid
    status VARCHAR(20) DEFAULT 'completed', -- draft, completed, cancelled, refunded
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(tenant_id, order_number)
);

-- 銷售單明細表
CREATE TABLE sales_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    subtotal DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 庫存異動記錄表
CREATE TABLE inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- purchase, sale, transfer_in, transfer_out, adjustment, return
    reference_type VARCHAR(20), -- purchase_order, sales_order, transfer, adjustment
    reference_id INTEGER,
    quantity DECIMAL(10, 2) NOT NULL, -- 正數為入庫，負數為出庫
    unit_price DECIMAL(10, 2),
    before_quantity DECIMAL(10, 2),
    after_quantity DECIMAL(10, 2),
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_by INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 支付方式表
CREATE TABLE payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    method_code VARCHAR(50) NOT NULL,
    method_name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, method_code)
);

-- 支付記錄表
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    payment_number VARCHAR(50) NOT NULL,
    payment_type VARCHAR(20) NOT NULL, -- income, expense
    reference_type VARCHAR(20), -- sales_order, purchase_order, other
    reference_id INTEGER,
    store_id INTEGER,
    payment_method_id INTEGER,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, cancelled
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(tenant_id, payment_number)
);

-- 費用類別表
CREATE TABLE expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, category_code)
);

-- 費用記錄表
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    expense_number VARCHAR(50) NOT NULL,
    store_id INTEGER,
    expense_category_id INTEGER NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    receipt_url VARCHAR(500), -- 收據圖片URL
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, paid
    created_by INTEGER,
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    UNIQUE(tenant_id, expense_number)
);

-- 索引優化
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_stores_tenant ON stores(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_inventory_tenant_store ON inventory(tenant_id, store_id);
CREATE INDEX idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_sales_orders_tenant ON sales_orders(tenant_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_inventory_transactions_tenant ON inventory_transactions(tenant_id);

-- 插入初始數據
INSERT INTO tenants (tenant_code, company_name, contact_person, contact_email, plan_type)
VALUES ('DEMO001', '示範連鎖店', '張經理', 'demo@example.com', 'premium');

INSERT INTO users (tenant_id, username, password_hash, full_name, email, role)
VALUES (1, 'admin', '$2b$10$XYZ...', '系統管理員', 'admin@example.com', 'admin');

INSERT INTO payment_methods (tenant_id, method_code, method_name) VALUES
(1, 'CASH', '現金'),
(1, 'CARD', '信用卡'),
(1, 'TRANSFER', '銀行轉帳'),
(1, 'MOBILE', '行動支付');

INSERT INTO expense_categories (tenant_id, category_code, category_name) VALUES
(1, 'RENT', '租金'),
(1, 'UTILITY', '水電費'),
(1, 'SALARY', '薪資'),
(1, 'MARKETING', '行銷費用'),
(1, 'MAINTENANCE', '維修費');
