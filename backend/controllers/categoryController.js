// backend/controllers/categoryController.js
const db = require('../config/db');

// GET /api/categories
const getCategories = async (req, res) => {
  try {
    const [categories] = await db.query(
      'SELECT id, name, slug, description, icon, color, post_count FROM categories WHERE is_active=1 ORDER BY sort_order ASC'
    );
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/categories/:slug
const getCategoryBySlug = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories WHERE slug=? AND is_active=1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getCategories, getCategoryBySlug };
