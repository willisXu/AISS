const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database/db');
const { authenticateToken, validateTenant, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(validateTenant);

// 獲取費用記錄
router.get('/', async (req, res) => {
  try {
    const { store_id, category_id, status, start_date, end_date } = req.query;

    let sql = `
      SELECT e.*, ec.category_name, s.store_name,
             u1.full_name as created_by_name, u2.full_name as approved_by_name
      FROM expenses e
      JOIN expense_categories ec ON e.expense_category_id = ec.id
      LEFT JOIN stores s ON e.store_id = s.id
      LEFT JOIN users u1 ON e.created_by = u1.id
      LEFT JOIN users u2 ON e.approved_by = u2.id
      WHERE e.tenant_id = ?
    `;
    const params = [req.tenantId];

    if (store_id) {
      sql += ' AND e.store_id = ?';
      params.push(store_id);
    }

    if (category_id) {
      sql += ' AND e.expense_category_id = ?';
      params.push(category_id);
    }

    if (status) {
      sql += ' AND e.status = ?';
      params.push(status);
    }

    if (start_date) {
      sql += ' AND e.expense_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND e.expense_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';

    const expenses = await dbAll(sql, params);
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// 獲取單個費用記錄
router.get('/:id', async (req, res) => {
  try {
    const expense = await dbGet(
      `SELECT e.*, ec.category_name, s.store_name
       FROM expenses e
       JOIN expense_categories ec ON e.expense_category_id = ec.id
       LEFT JOIN stores s ON e.store_id = s.id
       WHERE e.id = ? AND e.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Failed to get expense' });
  }
});

// 創建費用記錄
router.post('/', async (req, res) => {
  try {
    const {
      expense_number, store_id, expense_category_id, amount,
      expense_date, description, receipt_url
    } = req.body;

    const result = await dbRun(
      `INSERT INTO expenses
       (tenant_id, expense_number, store_id, expense_category_id, amount,
        expense_date, description, receipt_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId, expense_number, store_id, expense_category_id, amount,
       expense_date, description, receipt_url, req.user.id]
    );

    res.status(201).json({ id: result.id, message: 'Expense created successfully' });
  } catch (error) {
    console.error('Create expense error:', error);
    if (error.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Expense number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create expense' });
    }
  }
});

// 更新費用記錄
router.put('/:id', async (req, res) => {
  try {
    const {
      store_id, expense_category_id, amount, expense_date,
      description, receipt_url
    } = req.body;

    await dbRun(
      `UPDATE expenses
       SET store_id = ?, expense_category_id = ?, amount = ?, expense_date = ?,
           description = ?, receipt_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND tenant_id = ? AND status = 'pending'`,
      [store_id, expense_category_id, amount, expense_date, description,
       receipt_url, req.params.id, req.tenantId]
    );

    res.json({ message: 'Expense updated successfully' });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// 審批費用
router.patch('/:id/approve', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body; // approved or rejected

    await dbRun(
      `UPDATE expenses
       SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND tenant_id = ?`,
      [status, req.user.id, req.params.id, req.tenantId]
    );

    res.json({ message: `Expense ${status} successfully` });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
});

// 標記費用為已支付
router.patch('/:id/pay', requireRole('admin', 'manager'), async (req, res) => {
  try {
    await dbRun(
      `UPDATE expenses
       SET status = 'paid', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND tenant_id = ? AND status = 'approved'`,
      [req.params.id, req.tenantId]
    );

    res.json({ message: 'Expense marked as paid' });
  } catch (error) {
    console.error('Pay expense error:', error);
    res.status(500).json({ error: 'Failed to mark expense as paid' });
  }
});

// 獲取費用分類
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await dbAll(
      'SELECT * FROM expense_categories WHERE tenant_id = ? AND status = ? ORDER BY category_name',
      [req.tenantId, 'active']
    );
    res.json(categories);
  } catch (error) {
    console.error('Get expense categories error:', error);
    res.status(500).json({ error: 'Failed to get expense categories' });
  }
});

// 費用統計
router.get('/stats/summary', async (req, res) => {
  try {
    const { start_date, end_date, store_id } = req.query;

    let sql = `
      SELECT
        ec.category_name,
        SUM(e.amount) as total_amount,
        COUNT(*) as count
      FROM expenses e
      JOIN expense_categories ec ON e.expense_category_id = ec.id
      WHERE e.tenant_id = ? AND e.status IN ('approved', 'paid')
    `;
    const params = [req.tenantId];

    if (start_date) {
      sql += ' AND e.expense_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND e.expense_date <= ?';
      params.push(end_date);
    }

    if (store_id) {
      sql += ' AND e.store_id = ?';
      params.push(store_id);
    }

    sql += ' GROUP BY ec.category_name ORDER BY total_amount DESC';

    const stats = await dbAll(sql, params);
    res.json(stats);
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({ error: 'Failed to get expense statistics' });
  }
});

module.exports = router;
