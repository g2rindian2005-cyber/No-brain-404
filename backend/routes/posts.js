// backend/routes/posts.js
const express = require('express');
const router = express.Router();
const { getPosts, getPostBySlug, createPost, updatePost, deletePost, toggleLike, addComment, getStats } = require('../controllers/postController');
const { verifyToken, optionalAuth } = require('../middleware/auth');

router.get('/stats/overview', getStats);
router.get('/', optionalAuth, getPosts);
router.get('/:slug', optionalAuth, getPostBySlug);
router.post('/', verifyToken, createPost);
router.put('/:id', verifyToken, updatePost);
router.delete('/:id', verifyToken, deletePost);
router.post('/:id/like', verifyToken, toggleLike);
router.post('/:id/comments', verifyToken, addComment);

module.exports = router;
