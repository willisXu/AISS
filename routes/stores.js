const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database/db');
const { authenticateToken, validateTenant, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(validateTenant);

// 獲取所有門店
router.get('/', async (req, res) => {
  try {
    const stores = await dbAll(
      `SELECT s.*, u.full_name as manager_name
       FROM stores s
       LEFT JOIN users u ON s.manager_id = u.id
       WHERE s.tenant_id = ?
       ORDER BY s.created_at DESC`,
      [req.tenantId]
    );
    res.json(stores);
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Failed to get stores' });
  }
});

// 獲取單個門店
router.get('/:id', async (req, res) => {
  try {
    const store = await dbGet(
      `SELECT s.*, u.full_name as manager_name
       FROM stores s
       LEFT JOIN users u ON s.manager_id = u.id
       WHERE s.id = ? AND s.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json(store);
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ error: 'Failed to get store' });
  }
});

// 創建門店（僅管理員和經理）
router.post('/', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { store_code, store_name, address, phone, manager_id } = req.body;

    const result = await dbRun(
      `INSERT INTO stores (tenant_id, store_code, store_name, address, phone, manager_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.tenantId, store_code, store_name, address, phone, manager_id]
    );

    res.status(201).json({ id: result.id, message: 'Store created successfully' });
  } catch (error) {
    console.error('Create store error:', error);
    if (error.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Store code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create store' });
    }
  }
});

// 更新門店
router.put('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { store_name, address, phone, manager_id, status } = req.body;

    await dbRun(
      `UPDATE stores
       SET store_name = ?, address = ?, phone = ?, manager_id = ?, status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND tenant_id = ?`,
      [store_name, address, phone, manager_id, status, req.params.id, req.tenantId]
    );

    res.json({ message: 'Store updated successfully' });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// 刪除門店
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await dbRun(
      'DELETE FROM stores WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.tenantId]
    );

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

module.exports = router;
