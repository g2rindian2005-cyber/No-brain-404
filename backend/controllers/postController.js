// backend/controllers/postController.js
const db = require('../config/db');
const slugify = require('slugify');

// GET /api/posts  - list with search, filter, pagination
const getPosts = async (req, res) => {
  try {
    const { search, category, tag, difficulty, sort = 'latest', page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE p.is_published = 1 AND p.is_approved = 1';

    if (search) {
      where += ` AND MATCH(p.title, p.problem_description, p.solution, p.tags) AGAINST(? IN BOOLEAN MODE)`;
      params.push(`${search}*`);
    }
    if (category) {
      where += ` AND c.slug = ?`;
      params.push(category);
    }
    if (tag) {
      where += ` AND p.tags LIKE ?`;
      params.push(`%${tag}%`);
    }
    if (difficulty) {
      where += ` AND p.difficulty = ?`;
      params.push(difficulty);
    }

    const orderMap = {
      latest: 'p.created_at DESC',
      popular: 'p.views DESC',
      likes: 'p.likes DESC',
      oldest: 'p.created_at ASC',
    };
    const orderBy = orderMap[sort] || orderMap.latest;

    const sql = `
      SELECT p.id, p.title, p.slug, p.problem_description, p.tags,
             p.views, p.likes, p.difficulty, p.is_featured, p.created_at,
             c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon, c.color AS category_color,
             u.username, u.avatar, u.reputation,
             (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id AND cm.is_approved = 1) AS comment_count
      FROM posts p
      JOIN categories c ON p.category_id = c.id
      JOIN users u ON p.user_id = u.id
      ${where}
      ORDER BY p.is_featured DESC, ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) AS total FROM posts p
      JOIN categories c ON p.category_id = c.id
      ${where}
    `;

    params.push(parseInt(limit), offset);
    const [posts] = await db.query(sql, params);

    const countParams = params.slice(0, -2); // remove limit/offset
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('getPosts error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/posts/:slug
const getPostBySlug = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon, c.color AS category_color,
              u.username, u.avatar, u.bio AS user_bio, u.reputation
       FROM posts p
       JOIN categories c ON p.category_id = c.id
       JOIN users u ON p.user_id = u.id
       WHERE p.slug = ? AND p.is_published = 1`,
      [req.params.slug]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: 'Post not found' });

    // Increment view count
    await db.query('UPDATE posts SET views = views + 1 WHERE id = ?', [rows[0].id]);

    // Get comments
    const [comments] = await db.query(
      `SELECT cm.*, u.username, u.avatar, u.reputation
       FROM comments cm JOIN users u ON cm.user_id = u.id
       WHERE cm.post_id = ? AND cm.is_approved = 1
       ORDER BY cm.created_at ASC`,
      [rows[0].id]
    );

    // Related posts
    const [related] = await db.query(
      `SELECT p.id, p.title, p.slug, p.views, p.likes, p.created_at,
              c.name AS category_name, c.color AS category_color, u.username
       FROM posts p JOIN categories c ON p.category_id = c.id JOIN users u ON p.user_id = u.id
       WHERE p.category_id = ? AND p.id != ? AND p.is_published = 1
       ORDER BY p.views DESC LIMIT 4`,
      [rows[0].category_id, rows[0].id]
    );

    res.json({ success: true, post: rows[0], comments, related });
  } catch (err) {
    console.error('getPostBySlug error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/posts
const createPost = async (req, res) => {
  try {
    const { title, problem_description, solution, category_id, tags, difficulty } = req.body;
    if (!title || !problem_description || !solution || !category_id) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    let slug = slugify(title, { lower: true, strict: true });
    // Ensure unique slug
    const [exist] = await db.query('SELECT id FROM posts WHERE slug LIKE ?', [`${slug}%`]);
    if (exist.length) slug = `${slug}-${Date.now()}`;

    const [result] = await db.query(
      `INSERT INTO posts (title, slug, problem_description, solution, category_id, user_id, tags, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, problem_description, solution, category_id, req.user.id, tags || null, difficulty || 'intermediate']
    );

    // Update category post count
    await db.query('UPDATE categories SET post_count = post_count + 1 WHERE id = ?', [category_id]);

    res.status(201).json({ success: true, message: 'Solution published!', slug, id: result.insertId });
  } catch (err) {
    console.error('createPost error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/posts/:id
const updatePost = async (req, res) => {
  try {
    const { title, problem_description, solution, tags, difficulty } = req.body;
    const [post] = await db.query('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (!post.length) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await db.query(
      'UPDATE posts SET title=?, problem_description=?, solution=?, tags=?, difficulty=? WHERE id=?',
      [title, problem_description, solution, tags, difficulty, req.params.id]
    );
    res.json({ success: true, message: 'Post updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/posts/:id
const deletePost = async (req, res) => {
  try {
    const [post] = await db.query('SELECT user_id, category_id FROM posts WHERE id = ?', [req.params.id]);
    if (!post.length) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await db.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    await db.query('UPDATE categories SET post_count = GREATEST(post_count - 1, 0) WHERE id = ?', [post[0].category_id]);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/posts/:id/like
const toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [existing] = await db.query('SELECT id FROM post_likes WHERE post_id=? AND user_id=?', [postId, userId]);

    if (existing.length) {
      await db.query('DELETE FROM post_likes WHERE post_id=? AND user_id=?', [postId, userId]);
      await db.query('UPDATE posts SET likes = GREATEST(likes-1, 0) WHERE id=?', [postId]);
      return res.json({ success: true, liked: false, message: 'Like removed' });
    } else {
      await db.query('INSERT INTO post_likes (post_id, user_id) VALUES (?,?)', [postId, userId]);
      await db.query('UPDATE posts SET likes = likes+1 WHERE id=?', [postId]);
      return res.json({ success: true, liked: true, message: 'Post liked' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/posts/:id/comments
const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Comment must be at least 5 characters' });
    }
    const [result] = await db.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?,?,?)',
      [req.params.id, req.user.id, content.trim()]
    );

    const [comment] = await db.query(
      `SELECT cm.*, u.username, u.avatar FROM comments cm JOIN users u ON cm.user_id=u.id WHERE cm.id=?`,
      [result.insertId]
    );
    res.status(201).json({ success: true, comment: comment[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/posts/stats/overview  
const getStats = async (req, res) => {
  try {
    const [[{ totalPosts }]] = await db.query('SELECT COUNT(*) AS totalPosts FROM posts WHERE is_published=1');
    const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users WHERE role != "admin"');
    const [[{ totalCategories }]] = await db.query('SELECT COUNT(*) AS totalCategories FROM categories WHERE is_active=1');
    const [[{ totalViews }]] = await db.query('SELECT COALESCE(SUM(views),0) AS totalViews FROM posts');
    const [trending] = await db.query(
      `SELECT p.title, p.slug, p.views, p.likes, u.username, c.color AS category_color, c.name AS category_name
       FROM posts p JOIN users u ON p.user_id=u.id JOIN categories c ON p.category_id=c.id
       WHERE p.is_published=1 ORDER BY p.views DESC LIMIT 5`
    );
    res.json({ success: true, stats: { totalPosts, totalUsers, totalCategories, totalViews }, trending });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getPosts, getPostBySlug, createPost, updatePost, deletePost, toggleLike, addComment, getStats };
