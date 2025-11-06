const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun, db } = require('../database/db');
const { authenticateToken, validateTenant, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(validateTenant);

// 獲取採購單列表
router.get('/', async (req, res) => {
  try {
    const { store_id, status, start_date, end_date } = req.query;

    let sql = `
      SELECT po.*, s.store_name, sup.supplier_name, u.full_name as created_by_name
      FROM purchase_orders po
      JOIN stores s ON po.store_id = s.id
      JOIN suppliers sup ON po.supplier_id = sup.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.tenant_id = ?
    `;
    const params = [req.tenantId];

    if (store_id) {
      sql += ' AND po.store_id = ?';
      params.push(store_id);
    }

    if (status) {
      sql += ' AND po.status = ?';
      params.push(status);
    }

    if (start_date) {
      sql += ' AND po.order_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND po.order_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY po.order_date DESC, po.created_at DESC';

    const orders = await dbAll(sql, params);
    res.json(orders);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Failed to get purchase orders' });
  }
});

// 獲取單個採購單
router.get('/:id', async (req, res) => {
  try {
    const order = await dbGet(
      `SELECT po.*, s.store_name, sup.supplier_name, sup.contact_person, sup.contact_phone
       FROM purchase_orders po
       JOIN stores s ON po.store_id = s.id
       JOIN suppliers sup ON po.supplier_id = sup.id
       WHERE po.id = ? AND po.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // 獲取採購單明細
    const items = await dbAll(
      `SELECT poi.*, p.product_code, p.product_name, p.unit
       FROM purchase_order_items poi
       JOIN products p ON poi.product_id = p.id
       WHERE poi.purchase_order_id = ?`,
      [req.params.id]
    );

    order.items = items;
    res.json(order);
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ error: 'Failed to get purchase order' });
  }
});

// 創建採購單
router.post('/', requireRole('admin', 'manager'), async (req, res) => {
  const { order_number, store_id, supplier_id, order_date, expected_delivery_date, items, notes } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    try {
      // 計算總金額
      const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      // 插入採購單
      db.run(
        `INSERT INTO purchase_orders
         (tenant_id, order_number, store_id, supplier_id, order_date,
          expected_delivery_date, total_amount, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.tenantId, order_number, store_id, supplier_id, order_date,
         expected_delivery_date, total_amount, notes, req.user.id],
        function(err) {
          if (err) throw err;

          const orderId = this.lastID;

          // 插入採購單明細
          const stmt = db.prepare(
            `INSERT INTO purchase_order_items
             (purchase_order_id, product_id, quantity, unit_price, subtotal)
             VALUES (?, ?, ?, ?, ?)`
          );

          items.forEach(item => {
            stmt.run(orderId, item.product_id, item.quantity, item.unit_price,
                    item.quantity * item.unit_price);
          });

          stmt.finalize();

          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to create purchase order' });
            }
            res.status(201).json({ id: orderId, message: 'Purchase order created successfully' });
          });
        }
      );
    } catch (error) {
      db.run('ROLLBACK');
      console.error('Create purchase order error:', error);
      res.status(500).json({ error: 'Failed to create purchase order' });
    }
  });
});

// 更新採購單狀態
router.patch('/:id/status', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;

    await dbRun(
      `UPDATE purchase_orders
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND tenant_id = ?`,
      [status, req.params.id, req.tenantId]
    );

    res.json({ message: 'Purchase order status updated successfully' });
  } catch (error) {
    console.error('Update purchase order status error:', error);
    res.status(500).json({ error: 'Failed to update purchase order status' });
  }
});

// 確認收貨
router.post('/:id/receive', requireRole('admin', 'manager', 'staff'), async (req, res) => {
  const { items, actual_delivery_date } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    try {
      // 獲取採購單資訊
      db.get(
        'SELECT * FROM purchase_orders WHERE id = ? AND tenant_id = ?',
        [req.params.id, req.tenantId],
        (err, order) => {
          if (err || !order) {
            db.run('ROLLBACK');
            return res.status(404).json({ error: 'Purchase order not found' });
          }

          // 更新採購單狀態
          db.run(
            `UPDATE purchase_orders
             SET status = ?, actual_delivery_date = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            ['received', actual_delivery_date, req.params.id]
          );

          // 更新採購單明細的已收貨數量
          items.forEach(item => {
            db.run(
              `UPDATE purchase_order_items
               SET received_quantity = received_quantity + ?
               WHERE id = ?`,
              [item.received_quantity, item.id]
            );

            // 獲取當前庫存
            db.get(
              'SELECT * FROM inventory WHERE tenant_id = ? AND store_id = ? AND product_id = ?',
              [req.tenantId, order.store_id, item.product_id],
              (err, inventory) => {
                if (inventory) {
                  // 更新庫存
                  const newQuantity = inventory.quantity + item.received_quantity;
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
                    [req.tenantId, order.store_id, item.product_id, 'purchase',
                     'purchase_order', req.params.id, item.received_quantity,
                     item.unit_price, inventory.quantity, newQuantity, req.user.id]
                  );
                } else {
                  // 創建新的庫存記錄
                  db.run(
                    `INSERT INTO inventory (tenant_id, store_id, product_id, quantity)
                     VALUES (?, ?, ?, ?)`,
                    [req.tenantId, order.store_id, item.product_id, item.received_quantity],
                    function() {
                      // 記錄庫存異動
                      db.run(
                        `INSERT INTO inventory_transactions
                         (tenant_id, store_id, product_id, transaction_type, reference_type,
                          reference_id, quantity, unit_price, before_quantity, after_quantity,
                          created_by)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [req.tenantId, order.store_id, item.product_id, 'purchase',
                         'purchase_order', req.params.id, item.received_quantity,
                         item.unit_price, 0, item.received_quantity, req.user.id]
                      );
                    }
                  );
                }
              }
            );
          });

          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to receive purchase order' });
            }
            res.json({ message: 'Purchase order received successfully' });
          });
        }
      );
    } catch (error) {
      db.run('ROLLBACK');
      console.error('Receive purchase order error:', error);
      res.status(500).json({ error: 'Failed to receive purchase order' });
    }
  });
});

// 獲取供應商列表
router.get('/suppliers/all', async (req, res) => {
  try {
    const suppliers = await dbAll(
      'SELECT * FROM suppliers WHERE tenant_id = ? AND status = ? ORDER BY supplier_name',
      [req.tenantId, 'active']
    );
    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Failed to get suppliers' });
  }
});

// 創建供應商
router.post('/suppliers', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { supplier_code, supplier_name, contact_person, contact_phone, contact_email, address, payment_terms } = req.body;

    const result = await dbRun(
      `INSERT INTO suppliers
       (tenant_id, supplier_code, supplier_name, contact_person, contact_phone,
        contact_email, address, payment_terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId, supplier_code, supplier_name, contact_person, contact_phone,
       contact_email, address, payment_terms]
    );

    res.status(201).json({ id: result.id, message: 'Supplier created successfully' });
  } catch (error) {
    console.error('Create supplier error:', error);
    if (error.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Supplier code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }
});

module.exports = router;
