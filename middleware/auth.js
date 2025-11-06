const jwt = require('jsonwebtoken');
const { dbGet } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// 驗證 JWT Token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // 從資料庫獲取用戶資訊
    const user = await dbGet(
      'SELECT id, tenant_id, username, full_name, email, role FROM users WHERE id = ? AND status = ?',
      [decoded.userId, 'active']
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// 驗證租戶隔離
const validateTenant = (req, res, next) => {
  const tenantId = req.user.tenant_id;

  // 將 tenant_id 注入到請求中，供後續使用
  req.tenantId = tenantId;

  next();
};

// 角色權限檢查
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// 生成 JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticateToken,
  validateTenant,
  requireRole,
  generateToken
};
