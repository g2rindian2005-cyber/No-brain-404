// frontend/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Inject global vars to all views
app.use((req, res, next) => {
  res.locals.API_URL = API_URL;
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.get('/', (req, res) => res.render('home', { title: 'TechSolve - Community Problem Solving' }));
app.get('/login', (req, res) => res.render('login', { title: 'Login - TechSolve', layout: 'auth-layout' }));
app.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up - TechSolve', layout: 'auth-layout' }));
app.get('/category/:slug', (req, res) => res.render('category', { title: 'Category - TechSolve', slug: req.params.slug }));
app.get('/post/:slug', (req, res) => res.render('post', { title: 'Post - TechSolve', slug: req.params.slug }));
app.get('/submit', (req, res) => res.render('submit', { title: 'Share Your Solution - TechSolve' }));
app.get('/profile', (req, res) => res.render('profile', { title: 'My Profile - TechSolve' }));
app.get('/search', (req, res) => res.render('search', { title: 'Search Results - TechSolve', query: req.query.q || '' }));
app.get('/admin', (req, res) => res.render('admin/dashboard', { title: 'Admin Dashboard - TechSolve', layout: 'admin-layout' }));
app.get('/admin/users', (req, res) => res.render('admin/users', { title: 'Manage Users - TechSolve', layout: 'admin-layout' }));
app.get('/admin/posts', (req, res) => res.render('admin/posts', { title: 'Manage Posts - TechSolve', layout: 'admin-layout' }));
app.get('/admin/categories', (req, res) => res.render('admin/categories', { title: 'Manage Categories - TechSolve', layout: 'admin-layout' }));

// 404
app.use((req, res) => res.status(404).render('404', { title: '404 - TechSolve' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌐 TechSolve Frontend running at http://localhost:${PORT}`);
});
