const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('../database/db');
const { generateToken, authenticateToken } = require('../middleware/auth');

// 登入
router.post('/login', async (req, res) => {
  try {
    const { tenantCode, username, password } = req.body;

    if (!tenantCode || !username || !password) {
      return res.status(400).json({ error: 'Tenant code, username and password are required' });
    }

    // 查找租戶
    const tenant = await dbGet(
      'SELECT id FROM tenants WHERE tenant_code = ? AND status = ?',
      [tenantCode, 'active']
    );

    if (!tenant) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 查找用戶
    const user = await dbGet(
      'SELECT id, tenant_id, username, password_hash, full_name, email, role FROM users WHERE tenant_id = ? AND username = ? AND status = ?',
      [tenant.id, username, 'active']
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 驗證密碼
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 更新最後登入時間
    await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // 生成 token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 獲取當前用戶資訊
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet(
      `SELECT u.id, u.tenant_id, u.username, u.full_name, u.email, u.role,
              t.tenant_code, t.company_name
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// 修改密碼
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    // 獲取當前用戶
    const user = await dbGet(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    // 驗證舊密碼
    const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    // 更新密碼
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await dbRun(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
