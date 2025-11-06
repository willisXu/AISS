const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../database/db');
const { authenticateToken, validateTenant, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(validateTenant);

// 獲取所有商品
router.get('/', async (req, res) => {
  try {
    const { category_id, status } = req.query;
    let sql = `
      SELECT p.*, c.category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.tenant_id = ?
    `;
    const params = [req.tenantId];

    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY p.created_at DESC';

    const products = await dbAll(sql, params);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// 獲取單個商品
router.get('/:id', async (req, res) => {
  try {
    const product = await dbGet(
      `SELECT p.*, c.category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ? AND p.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// 創建商品
router.post('/', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const {
      product_code, product_name, category_id, description,
      unit, cost_price, selling_price, barcode
    } = req.body;

    const result = await dbRun(
      `INSERT INTO products
       (tenant_id, product_code, product_name, category_id, description,
        unit, cost_price, selling_price, barcode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId, product_code, product_name, category_id, description,
       unit, cost_price, selling_price, barcode]
    );

    res.status(201).json({ id: result.id, message: 'Product created successfully' });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Product code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
});

// 更新商品
router.put('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const {
      product_name, category_id, description, unit,
      cost_price, selling_price, barcode, status
    } = req.body;

    await dbRun(
      `UPDATE products
       SET product_name = ?, category_id = ?, description = ?, unit = ?,
           cost_price = ?, selling_price = ?, barcode = ?, status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND tenant_id = ?`,
      [product_name, category_id, description, unit, cost_price, selling_price,
       barcode, status, req.params.id, req.tenantId]
    );

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// 刪除商品
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await dbRun(
      'DELETE FROM products WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.tenantId]
    );

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// 獲取商品分類
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await dbAll(
      'SELECT * FROM categories WHERE tenant_id = ? AND status = ? ORDER BY category_name',
      [req.tenantId, 'active']
    );
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// 創建商品分類
router.post('/categories', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { category_code, category_name, parent_id, description } = req.body;

    const result = await dbRun(
      `INSERT INTO categories (tenant_id, category_code, category_name, parent_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [req.tenantId, category_code, category_name, parent_id, description]
    );

    res.status(201).json({ id: result.id, message: 'Category created successfully' });
  } catch (error) {
    console.error('Create category error:', error);
    if (error.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Category code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
});

module.exports = router;
