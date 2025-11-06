const express = require('express');
const router = express.Router();
const { dbGet, dbAll } = require('../database/db');
const { authenticateToken, validateTenant } = require('../middleware/auth');

router.use(authenticateToken);
router.use(validateTenant);

// 儀表板摘要
router.get('/dashboard', async (req, res) => {
  try {
    const { start_date, end_date, store_id } = req.query;

    // 銷售統計
    let salesSql = `
      SELECT
        COUNT(*) as total_orders,
        SUM(final_amount) as total_revenue
      FROM sales_orders
      WHERE tenant_id = ? AND status = 'completed'
    `;
    const salesParams = [req.tenantId];

    if (start_date) {
      salesSql += ' AND order_date >= ?';
      salesParams.push(start_date);
    }

    if (end_date) {
      salesSql += ' AND order_date <= ?';
      salesParams.push(end_date);
    }

    if (store_id) {
      salesSql += ' AND store_id = ?';
      salesParams.push(store_id);
    }

    const salesStats = await dbGet(salesSql, salesParams);

    // 採購統計
    let purchaseSql = `
      SELECT
        COUNT(*) as total_orders,
        SUM(total_amount) as total_cost
      FROM purchase_orders
      WHERE tenant_id = ? AND status IN ('approved', 'received')
    `;
    const purchaseParams = [req.tenantId];

    if (start_date) {
      purchaseSql += ' AND order_date >= ?';
      purchaseParams.push(start_date);
    }

    if (end_date) {
      purchaseSql += ' AND order_date <= ?';
      purchaseParams.push(end_date);
    }

    if (store_id) {
      purchaseSql += ' AND store_id = ?';
      purchaseParams.push(store_id);
    }

    const purchaseStats = await dbGet(purchaseSql, purchaseParams);

    // 費用統計
    let expenseSql = `
      SELECT SUM(amount) as total_expenses
      FROM expenses
      WHERE tenant_id = ? AND status IN ('approved', 'paid')
    `;
    const expenseParams = [req.tenantId];

    if (start_date) {
      expenseSql += ' AND expense_date >= ?';
      expenseParams.push(start_date);
    }

    if (end_date) {
      expenseSql += ' AND expense_date <= ?';
      expenseParams.push(end_date);
    }

    if (store_id) {
      expenseSql += ' AND store_id = ?';
      expenseParams.push(store_id);
    }

    const expenseStats = await dbGet(expenseSql, expenseParams);

    // 庫存警報數量
    const inventoryAlerts = await dbGet(
      `SELECT COUNT(*) as alert_count
       FROM inventory
       WHERE tenant_id = ? AND quantity <= min_stock_level`,
      [req.tenantId]
    );

    // 熱銷商品 Top 5
    let topProductsSql = `
      SELECT
        p.product_name,
        SUM(soi.quantity) as total_quantity,
        SUM(soi.subtotal) as total_revenue
      FROM sales_order_items soi
      JOIN sales_orders so ON soi.sales_order_id = so.id
      JOIN products p ON soi.product_id = p.id
      WHERE so.tenant_id = ? AND so.status = 'completed'
    `;
    const topProductsParams = [req.tenantId];

    if (start_date) {
      topProductsSql += ' AND so.order_date >= ?';
      topProductsParams.push(start_date);
    }

    if (end_date) {
      topProductsSql += ' AND so.order_date <= ?';
      topProductsParams.push(end_date);
    }

    if (store_id) {
      topProductsSql += ' AND so.store_id = ?';
      topProductsParams.push(store_id);
    }

    topProductsSql += ' GROUP BY p.id, p.product_name ORDER BY total_quantity DESC LIMIT 5';

    const topProducts = await dbAll(topProductsSql, topProductsParams);

    // 各門店銷售排名
    let storeRankingSql = `
      SELECT
        s.store_name,
        COUNT(so.id) as order_count,
        SUM(so.final_amount) as total_revenue
      FROM sales_orders so
      JOIN stores s ON so.store_id = s.id
      WHERE so.tenant_id = ? AND so.status = 'completed'
    `;
    const storeRankingParams = [req.tenantId];

    if (start_date) {
      storeRankingSql += ' AND so.order_date >= ?';
      storeRankingParams.push(start_date);
    }

    if (end_date) {
      storeRankingSql += ' AND so.order_date <= ?';
      storeRankingParams.push(end_date);
    }

    storeRankingSql += ' GROUP BY s.id, s.store_name ORDER BY total_revenue DESC';

    const storeRanking = await dbAll(storeRankingSql, storeRankingParams);

    res.json({
      sales: {
        totalOrders: salesStats.total_orders || 0,
        totalRevenue: salesStats.total_revenue || 0
      },
      purchase: {
        totalOrders: purchaseStats.total_orders || 0,
        totalCost: purchaseStats.total_cost || 0
      },
      expenses: {
        totalExpenses: expenseStats.total_expenses || 0
      },
      profit: {
        gross: (salesStats.total_revenue || 0) - (purchaseStats.total_cost || 0),
        net: (salesStats.total_revenue || 0) - (purchaseStats.total_cost || 0) - (expenseStats.total_expenses || 0)
      },
      inventory: {
        alertCount: inventoryAlerts.alert_count || 0
      },
      topProducts,
      storeRanking
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// 銷售報表
router.get('/sales', async (req, res) => {
  try {
    const { start_date, end_date, store_id, group_by = 'day' } = req.query;

    let dateFormat;
    switch (group_by) {
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    let sql = `
      SELECT
        strftime('${dateFormat}', order_date) as period,
        COUNT(*) as order_count,
        SUM(total_amount) as total_amount,
        SUM(discount_amount) as discount_amount,
        SUM(final_amount) as final_amount
      FROM sales_orders
      WHERE tenant_id = ? AND status = 'completed'
    `;
    const params = [req.tenantId];

    if (start_date) {
      sql += ' AND order_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND order_date <= ?';
      params.push(end_date);
    }

    if (store_id) {
      sql += ' AND store_id = ?';
      params.push(store_id);
    }

    sql += ' GROUP BY period ORDER BY period DESC';

    const report = await dbAll(sql, params);
    res.json(report);
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ error: 'Failed to get sales report' });
  }
});

// 庫存報表
router.get('/inventory', async (req, res) => {
  try {
    const { store_id, category_id } = req.query;

    let sql = `
      SELECT
        i.id,
        p.product_code,
        p.product_name,
        c.category_name,
        s.store_name,
        i.quantity,
        i.min_stock_level,
        i.max_stock_level,
        p.cost_price,
        p.selling_price,
        (i.quantity * p.cost_price) as inventory_value,
        CASE
          WHEN i.quantity <= i.min_stock_level THEN 'low'
          WHEN i.quantity >= i.max_stock_level THEN 'high'
          ELSE 'normal'
        END as stock_status
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN stores s ON i.store_id = s.id
      WHERE i.tenant_id = ?
    `;
    const params = [req.tenantId];

    if (store_id) {
      sql += ' AND i.store_id = ?';
      params.push(store_id);
    }

    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }

    sql += ' ORDER BY s.store_name, c.category_name, p.product_name';

    const report = await dbAll(sql, params);

    // 計算總庫存價值
    const totalValue = report.reduce((sum, item) => sum + (item.inventory_value || 0), 0);

    res.json({
      items: report,
      summary: {
        totalItems: report.length,
        totalValue: totalValue,
        lowStockItems: report.filter(item => item.stock_status === 'low').length,
        highStockItems: report.filter(item => item.stock_status === 'high').length
      }
    });
  } catch (error) {
    console.error('Get inventory report error:', error);
    res.status(500).json({ error: 'Failed to get inventory report' });
  }
});

// 財務報表
router.get('/financial', async (req, res) => {
  try {
    const { start_date, end_date, store_id } = req.query;

    // 銷售收入
    let salesSql = `
      SELECT SUM(final_amount) as total
      FROM sales_orders
      WHERE tenant_id = ? AND status = 'completed'
    `;
    const salesParams = [req.tenantId];

    if (start_date) {
      salesSql += ' AND order_date >= ?';
      salesParams.push(start_date);
    }

    if (end_date) {
      salesSql += ' AND order_date <= ?';
      salesParams.push(end_date);
    }

    if (store_id) {
      salesSql += ' AND store_id = ?';
      salesParams.push(store_id);
    }

    const salesRevenue = await dbGet(salesSql, salesParams);

    // 採購成本
    let purchaseSql = `
      SELECT SUM(total_amount) as total
      FROM purchase_orders
      WHERE tenant_id = ? AND status IN ('approved', 'received')
    `;
    const purchaseParams = [req.tenantId];

    if (start_date) {
      purchaseSql += ' AND order_date >= ?';
      purchaseParams.push(start_date);
    }

    if (end_date) {
      purchaseSql += ' AND order_date <= ?';
      purchaseParams.push(end_date);
    }

    if (store_id) {
      purchaseSql += ' AND store_id = ?';
      purchaseParams.push(store_id);
    }

    const purchaseCost = await dbGet(purchaseSql, purchaseParams);

    // 費用支出（按類別）
    let expenseSql = `
      SELECT
        ec.category_name,
        SUM(e.amount) as total
      FROM expenses e
      JOIN expense_categories ec ON e.expense_category_id = ec.id
      WHERE e.tenant_id = ? AND e.status IN ('approved', 'paid')
    `;
    const expenseParams = [req.tenantId];

    if (start_date) {
      expenseSql += ' AND e.expense_date >= ?';
      expenseParams.push(start_date);
    }

    if (end_date) {
      expenseSql += ' AND e.expense_date <= ?';
      expenseParams.push(end_date);
    }

    if (store_id) {
      expenseSql += ' AND e.store_id = ?';
      expenseParams.push(store_id);
    }

    expenseSql += ' GROUP BY ec.category_name';

    const expensesByCategory = await dbAll(expenseSql, expenseParams);
    const totalExpenses = expensesByCategory.reduce((sum, item) => sum + (item.total || 0), 0);

    const revenue = salesRevenue.total || 0;
    const cost = purchaseCost.total || 0;
    const expenses = totalExpenses;
    const grossProfit = revenue - cost;
    const netProfit = grossProfit - expenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue * 100).toFixed(2) : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue * 100).toFixed(2) : 0;

    res.json({
      revenue,
      cost,
      expenses,
      expensesByCategory,
      grossProfit,
      netProfit,
      grossMargin,
      netMargin
    });
  } catch (error) {
    console.error('Get financial report error:', error);
    res.status(500).json({ error: 'Failed to get financial report' });
  }
});

module.exports = router;
