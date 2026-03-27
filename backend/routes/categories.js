// backend/routes/categories.js
const express = require('express');
const router = express.Router();
const { getCategories, getCategoryBySlug } = require('../controllers/categoryController');

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

module.exports = router;
