const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database/db');
const { authenticateToken, validateTenant, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(validateTenant);

// 獲取庫存列表
router.get('/', async (req, res) => {
  try {
    const { store_id } = req.query;
    let sql = `
      SELECT i.*, p.product_code, p.product_name, p.unit,
             s.store_code, s.store_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN stores s ON i.store_id = s.id
      WHERE i.tenant_id = ?
    `;
    const params = [req.tenantId];

    if (store_id) {
      sql += ' AND i.store_id = ?';
      params.push(store_id);
    }

    sql += ' ORDER BY s.store_name, p.product_name';

    const inventory = await dbAll(sql, params);
    res.json(inventory);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// 獲取庫存不足警報
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await dbAll(
      `SELECT i.*, p.product_code, p.product_name, s.store_name
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       JOIN stores s ON i.store_id = s.id
       WHERE i.tenant_id = ? AND i.quantity <= i.min_stock_level
       ORDER BY i.quantity ASC`,
      [req.tenantId]
    );

    res.json(alerts);
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({ error: 'Failed to get inventory alerts' });
  }
});

// 更新庫存設定
router.put('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { min_stock_level, max_stock_level } = req.body;

    await dbRun(
      `UPDATE inventory
       SET min_stock_level = ?, max_stock_level = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND tenant_id = ?`,
      [min_stock_level, max_stock_level, req.params.id, req.tenantId]
    );

    res.json({ message: 'Inventory settings updated successfully' });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// 庫存盤點
router.post('/stock-take', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { store_id, product_id, actual_quantity, notes } = req.body;

    // 獲取當前庫存
    const currentInventory = await dbGet(
      'SELECT * FROM inventory WHERE tenant_id = ? AND store_id = ? AND product_id = ?',
      [req.tenantId, store_id, product_id]
    );

    if (!currentInventory) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }

    const difference = actual_quantity - currentInventory.quantity;

    // 更新庫存
    await dbRun(
      `UPDATE inventory
       SET quantity = ?, last_stock_take = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [actual_quantity, currentInventory.id]
    );

    // 記錄庫存異動
    if (difference !== 0) {
      await dbRun(
        `INSERT INTO inventory_transactions
         (tenant_id, store_id, product_id, transaction_type, quantity,
          before_quantity, after_quantity, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.tenantId, store_id, product_id, 'adjustment', difference,
         currentInventory.quantity, actual_quantity, notes || 'Stock take adjustment', req.user.id]
      );
    }

    res.json({ message: 'Stock take completed successfully' });
  } catch (error) {
    console.error('Stock take error:', error);
    res.status(500).json({ error: 'Failed to complete stock take' });
  }
});

// 獲取庫存異動記錄
router.get('/transactions', async (req, res) => {
  try {
    const { store_id, product_id, start_date, end_date } = req.query;

    let sql = `
      SELECT it.*, p.product_code, p.product_name, s.store_name,
             u.full_name as created_by_name
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      JOIN stores s ON it.store_id = s.id
      LEFT JOIN users u ON it.created_by = u.id
      WHERE it.tenant_id = ?
    `;
    const params = [req.tenantId];

    if (store_id) {
      sql += ' AND it.store_id = ?';
      params.push(store_id);
    }

    if (product_id) {
      sql += ' AND it.product_id = ?';
      params.push(product_id);
    }

    if (start_date) {
      sql += ' AND DATE(it.transaction_date) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(it.transaction_date) <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY it.transaction_date DESC LIMIT 100';

    const transactions = await dbAll(sql, params);
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

module.exports = router;
