const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database/db');
const { authenticateToken, validateTenant, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(validateTenant);

// 獲取支付記錄
router.get('/', async (req, res) => {
  try {
    const { payment_type, start_date, end_date, store_id } = req.query;

    let sql = `
      SELECT p.*, pm.method_name, s.store_name, u.full_name as created_by_name
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.tenant_id = ?
    `;
    const params = [req.tenantId];

    if (payment_type) {
      sql += ' AND p.payment_type = ?';
      params.push(payment_type);
    }

    if (start_date) {
      sql += ' AND p.payment_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND p.payment_date <= ?';
      params.push(end_date);
    }

    if (store_id) {
      sql += ' AND p.store_id = ?';
      params.push(store_id);
    }

    sql += ' ORDER BY p.payment_date DESC, p.created_at DESC';

    const payments = await dbAll(sql, params);
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// 獲取單個支付記錄
router.get('/:id', async (req, res) => {
  try {
    const payment = await dbGet(
      `SELECT p.*, pm.method_name, s.store_name
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE p.id = ? AND p.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to get payment' });
  }
});

// 創建支付記錄
router.post('/', async (req, res) => {
  try {
    const {
      payment_number, payment_type, reference_type, reference_id,
      store_id, payment_method_id, amount, payment_date, description
    } = req.body;

    const result = await dbRun(
      `INSERT INTO payments
       (tenant_id, payment_number, payment_type, reference_type, reference_id,
        store_id, payment_method_id, amount, payment_date, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId, payment_number, payment_type, reference_type, reference_id,
       store_id, payment_method_id, amount, payment_date, description, req.user.id]
    );

    // 如果是銷售訂單的付款，更新訂單的支付狀態
    if (reference_type === 'sales_order' && reference_id) {
      const order = await dbGet(
        'SELECT final_amount FROM sales_orders WHERE id = ?',
        [reference_id]
      );

      if (order) {
        const totalPaid = await dbGet(
          `SELECT SUM(amount) as total FROM payments
           WHERE reference_type = 'sales_order' AND reference_id = ? AND status = 'completed'`,
          [reference_id]
        );

        let paymentStatus = 'pending';
        if (totalPaid.total >= order.final_amount) {
          paymentStatus = 'paid';
        } else if (totalPaid.total > 0) {
          paymentStatus = 'partial';
        }

        await dbRun(
          'UPDATE sales_orders SET payment_status = ? WHERE id = ?',
          [paymentStatus, reference_id]
        );
      }
    }

    res.status(201).json({ id: result.id, message: 'Payment created successfully' });
  } catch (error) {
    console.error('Create payment error:', error);
    if (error.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Payment number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create payment' });
    }
  }
});

// 獲取支付方式
router.get('/methods/all', async (req, res) => {
  try {
    const methods = await dbAll(
      'SELECT * FROM payment_methods WHERE tenant_id = ? AND status = ?',
      [req.tenantId, 'active']
    );
    res.json(methods);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

// 收支統計
router.get('/stats/summary', async (req, res) => {
  try {
    const { start_date, end_date, store_id } = req.query;

    let sql = `
      SELECT
        payment_type,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM payments
      WHERE tenant_id = ? AND status = 'completed'
    `;
    const params = [req.tenantId];

    if (start_date) {
      sql += ' AND payment_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND payment_date <= ?';
      params.push(end_date);
    }

    if (store_id) {
      sql += ' AND store_id = ?';
      params.push(store_id);
    }

    sql += ' GROUP BY payment_type';

    const stats = await dbAll(sql, params);

    const summary = {
      income: stats.find(s => s.payment_type === 'income') || { total_amount: 0, count: 0 },
      expense: stats.find(s => s.payment_type === 'expense') || { total_amount: 0, count: 0 }
    };

    summary.net = summary.income.total_amount - summary.expense.total_amount;

    res.json(summary);
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Failed to get payment statistics' });
  }
});

module.exports = router;
