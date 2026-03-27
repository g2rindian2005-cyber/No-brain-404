// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { verifyToken, adminOnly } = require('../middleware/auth');
const {
  getDashboard, getUsers, updateUser, deleteUser,
  getPosts, updatePost, deletePost,
  getCategories, createCategory, updateCategory
} = require('../controllers/adminController');

router.use(verifyToken, adminOnly);

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/posts', getPosts);
router.put('/posts/:id', updatePost);
router.delete('/posts/:id', deletePost);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);

module.exports = router;
