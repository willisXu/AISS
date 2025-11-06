const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun, db } = require('../database/db');
const { authenticateToken, validateTenant } = require('../middleware/auth');

router.use(authenticateToken);
router.use(validateTenant);

// 獲取銷售單列表
router.get('/', async (req, res) => {
  try {
    const { store_id, start_date, end_date, payment_status } = req.query;

    let sql = `
      SELECT so.*, s.store_name, u.full_name as created_by_name
      FROM sales_orders so
      JOIN stores s ON so.store_id = s.id
      LEFT JOIN users u ON so.created_by = u.id
      WHERE so.tenant_id = ?
    `;
    const params = [req.tenantId];

    if (store_id) {
      sql += ' AND so.store_id = ?';
      params.push(store_id);
    }

    if (start_date) {
      sql += ' AND so.order_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND so.order_date <= ?';
      params.push(end_date);
    }

    if (payment_status) {
      sql += ' AND so.payment_status = ?';
      params.push(payment_status);
    }

    sql += ' ORDER BY so.order_date DESC, so.created_at DESC';

    const orders = await dbAll(sql, params);
    res.json(orders);
  } catch (error) {
    console.error('Get sales orders error:', error);
    res.status(500).json({ error: 'Failed to get sales orders' });
  }
});

// 獲取單個銷售單
router.get('/:id', async (req, res) => {
  try {
    const order = await dbGet(
      `SELECT so.*, s.store_name
       FROM sales_orders so
       JOIN stores s ON so.store_id = s.id
       WHERE so.id = ? AND so.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    // 獲取銷售單明細
    const items = await dbAll(
      `SELECT soi.*, p.product_code, p.product_name, p.unit
       FROM sales_order_items soi
       JOIN products p ON soi.product_id = p.id
       WHERE soi.sales_order_id = ?`,
      [req.params.id]
    );

    order.items = items;
    res.json(order);
  } catch (error) {
    console.error('Get sales order error:', error);
    res.status(500).json({ error: 'Failed to get sales order' });
  }
});

// 創建銷售單
router.post('/', async (req, res) => {
  const {
    order_number, store_id, order_date, customer_name, customer_phone,
    items, discount_amount = 0, tax_amount = 0, notes
  } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    try {
      // 計算總金額
      const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const final_amount = total_amount - discount_amount + tax_amount;

      // 插入銷售單
      db.run(
        `INSERT INTO sales_orders
         (tenant_id, order_number, store_id, order_date, customer_name, customer_phone,
          total_amount, discount_amount, tax_amount, final_amount, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.tenantId, order_number, store_id, order_date, customer_name, customer_phone,
         total_amount, discount_amount, tax_amount, final_amount, notes, req.user.id],
        function(err) {
          if (err) throw err;

          const orderId = this.lastID;

          // 插入銷售單明細並更新庫存
          items.forEach(item => {
            // 插入明細
            db.run(
              `INSERT INTO sales_order_items
               (sales_order_id, product_id, quantity, unit_price, discount, subtotal)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [orderId, item.product_id, item.quantity, item.unit_price,
               item.discount || 0, item.quantity * item.unit_price - (item.discount || 0)]
            );

            // 獲取當前庫存
            db.get(
              'SELECT * FROM inventory WHERE tenant_id = ? AND store_id = ? AND product_id = ?',
              [req.tenantId, store_id, item.product_id],
              (err, inventory) => {
                if (inventory) {
                  const newQuantity = inventory.quantity - item.quantity;

                  // 更新庫存
                  db.run(
                    `UPDATE inventory
                     SET quantity = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [newQuantity, inventory.id]
                  );

                  // 記錄庫存異動
                  db.run(
                    `INSERT INTO inventory_transactions
                     (tenant_id, store_id, product_id, transaction_type, reference_type,
                      reference_id, quantity, unit_price, before_quantity, after_quantity,
                      created_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [req.tenantId, store_id, item.product_id, 'sale', 'sales_order',
                     orderId, -item.quantity, item.unit_price, inventory.quantity,
                     newQuantity, req.user.id]
                  );
                }
              }
            );
          });

          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to create sales order' });
            }
            res.status(201).json({ id: orderId, message: 'Sales order created successfully' });
          });
        }
      );
    } catch (error) {
      db.run('ROLLBACK');
      console.error('Create sales order error:', error);
      res.status(500).json({ error: 'Failed to create sales order' });
    }
  });
});

// 更新支付狀態
router.patch('/:id/payment-status', async (req, res) => {
  try {
    const { payment_status } = req.body;

    await dbRun(
      `UPDATE sales_orders
       SET payment_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND tenant_id = ?`,
      [payment_status, req.params.id, req.tenantId]
    );

    res.json({ message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// 銷售統計（按日期範圍）
router.get('/stats/daily', async (req, res) => {
  try {
    const { start_date, end_date, store_id } = req.query;

    let sql = `
      SELECT
        DATE(order_date) as date,
        COUNT(*) as order_count,
        SUM(final_amount) as total_revenue
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

    sql += ' GROUP BY DATE(order_date) ORDER BY date DESC';

    const stats = await dbAll(sql, params);
    res.json(stats);
  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({ error: 'Failed to get sales statistics' });
  }
});

module.exports = router;
