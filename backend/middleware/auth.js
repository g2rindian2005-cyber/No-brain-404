// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Verify JWT Token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB
    const [rows] = await db.query(
      'SELECT id, username, email, role, is_active, is_banned FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    if (!user.is_active || user.is_banned) {
      return res.status(403).json({ success: false, message: 'Account suspended or banned' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

// Optional auth (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [rows] = await db.query(
        'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
        [decoded.id]
      );
      if (rows.length && rows[0].is_active) {
        req.user = rows[0];
      }
    }
  } catch (err) {
    // Silently ignore token errors for optional auth
  }
  next();
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Moderator or Admin
const modOrAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Moderator access required' });
  }
  next();
};

module.exports = { verifyToken, optionalAuth, adminOnly, modOrAdmin };
