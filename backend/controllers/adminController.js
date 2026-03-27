// backend/controllers/adminController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const [[{ totalPosts }]] = await db.query('SELECT COUNT(*) AS totalPosts FROM posts');
    const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ pendingPosts }]] = await db.query('SELECT COUNT(*) AS pendingPosts FROM posts WHERE is_approved=0');
    const [[{ totalComments }]] = await db.query('SELECT COUNT(*) AS totalComments FROM comments');
    const [[{ bannedUsers }]] = await db.query('SELECT COUNT(*) AS bannedUsers FROM users WHERE is_banned=1');
    const [[{ totalViews }]] = await db.query('SELECT COALESCE(SUM(views),0) AS totalViews FROM posts');

    // Recent posts
    const [recentPosts] = await db.query(
      `SELECT p.id, p.title, p.slug, p.is_approved, p.is_featured, p.views, p.created_at,
              u.username, c.name AS category_name
       FROM posts p JOIN users u ON p.user_id=u.id JOIN categories c ON p.category_id=c.id
       ORDER BY p.created_at DESC LIMIT 10`
    );

    // Recent users
    const [recentUsers] = await db.query(
      'SELECT id, username, email, role, is_banned, reputation, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );

    res.json({
      success: true,
      stats: { totalPosts, totalUsers, pendingPosts, totalComments, bannedUsers, totalViews },
      recentPosts,
      recentUsers,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];

    if (search) { where += ' AND (username LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (role) { where += ' AND role = ?'; params.push(role); }

    const [users] = await db.query(
      `SELECT id, username, email, full_name, role, is_active, is_banned, reputation, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${where}`, params);

    res.json({ success: true, users, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { role, is_banned, is_active } = req.body;
    if (req.params.id == req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot modify your own admin account' });
    }
    await db.query('UPDATE users SET role=?, is_banned=?, is_active=? WHERE id=?', [role, is_banned, is_active, req.params.id]);
    res.json({ success: true, message: 'User updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    if (req.params.id == req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/posts
const getPosts = async (req, res) => {
  try {
    const { search, approved, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];

    if (search) { where += ' AND p.title LIKE ?'; params.push(`%${search}%`); }
    if (approved !== undefined) { where += ' AND p.is_approved=?'; params.push(parseInt(approved)); }

    const [posts] = await db.query(
      `SELECT p.id, p.title, p.slug, p.is_approved, p.is_featured, p.is_published,
              p.views, p.likes, p.created_at, u.username, c.name AS category_name
       FROM posts p JOIN users u ON p.user_id=u.id JOIN categories c ON p.category_id=c.id
       ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM posts p JOIN users u ON p.user_id=u.id JOIN categories c ON p.category_id=c.id ${where}`,
      params
    );

    res.json({ success: true, posts, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/admin/posts/:id
const updatePost = async (req, res) => {
  try {
    const { is_approved, is_featured, is_published } = req.body;
    await db.query('UPDATE posts SET is_approved=?, is_featured=?, is_published=? WHERE id=?', [is_approved, is_featured, is_published, req.params.id]);
    res.json({ success: true, message: 'Post updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/admin/posts/:id
const deletePost = async (req, res) => {
  try {
    await db.query('DELETE FROM posts WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET/POST/PUT/DELETE /api/admin/categories
const getCategories = async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY sort_order ASC');
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description, icon, color, sort_order } = req.body;
    const slugify = require('slugify');
    const slug = slugify(name, { lower: true, strict: true });
    await db.query('INSERT INTO categories (name, slug, description, icon, color, sort_order) VALUES (?,?,?,?,?,?)',
      [name, slug, description, icon || 'fa-code', color || '#6366f1', sort_order || 0]);
    res.status(201).json({ success: true, message: 'Category created' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, description, icon, color, sort_order, is_active } = req.body;
    await db.query('UPDATE categories SET name=?, description=?, icon=?, color=?, sort_order=?, is_active=? WHERE id=?',
      [name, description, icon, color, sort_order, is_active, req.params.id]);
    res.json({ success: true, message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboard, getUsers, updateUser, deleteUser, getPosts, updatePost, deletePost, getCategories, createCategory, updateCategory };
