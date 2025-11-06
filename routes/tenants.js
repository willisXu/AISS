const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database/db');
const { authenticateToken, validateTenant, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(validateTenant);

// 獲取當前租戶資訊
router.get('/current', async (req, res) => {
  try {
    const tenant = await dbGet(
      'SELECT * FROM tenants WHERE id = ?',
      [req.tenantId]
    );
    res.json(tenant);
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to get tenant info' });
  }
});

// 更新租戶資訊（僅管理員）
router.put('/current', requireRole('admin'), async (req, res) => {
  try {
    const { company_name, contact_person, contact_email, contact_phone } = req.body;

    await dbRun(
      `UPDATE tenants
       SET company_name = ?, contact_person = ?, contact_email = ?, contact_phone = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [company_name, contact_person, contact_email, contact_phone, req.tenantId]
    );

    res.json({ message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

module.exports = router;
