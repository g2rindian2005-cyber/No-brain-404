-- =============================================
-- TechSolve Database Schema
-- Run this on your AWS RDS MySQL instance
-- =============================================

CREATE DATABASE IF NOT EXISTS techsolve_db;
USE techsolve_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  avatar VARCHAR(255) DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  role ENUM('user','moderator','admin') DEFAULT 'user',
  is_active TINYINT(1) DEFAULT 1,
  is_banned TINYINT(1) DEFAULT 0,
  reputation INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'fa-code',
  color VARCHAR(20) DEFAULT '#6366f1',
  post_count INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts (Problems/Solutions) Table
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(300) UNIQUE NOT NULL,
  problem_description TEXT NOT NULL,
  solution TEXT NOT NULL,
  category_id INT NOT NULL,
  user_id INT NOT NULL,
  tags VARCHAR(500) DEFAULT NULL,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  is_featured TINYINT(1) DEFAULT 0,
  is_approved TINYINT(1) DEFAULT 1,
  difficulty ENUM('beginner','intermediate','advanced') DEFAULT 'intermediate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FULLTEXT KEY ft_search (title, problem_description, solution, tags)
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  is_approved TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Likes Table (prevent duplicate likes)
CREATE TABLE IF NOT EXISTS post_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_bookmark (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tags Table (for analytics)
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  usage_count INT DEFAULT 0
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('comment','like','mention','system') NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  related_post_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Seed Default Categories
-- =============================================
INSERT INTO categories (name, slug, description, icon, color, sort_order) VALUES
('DevOps Issues', 'devops', 'CI/CD, Docker, Kubernetes, Jenkins, pipelines and infrastructure problems', 'fa-server', '#f59e0b', 1),
('Developer Issues', 'developer', 'Programming bugs, code errors, frameworks and development challenges', 'fa-code', '#6366f1', 2),
('Cybersecurity Issues', 'cybersecurity', 'Security vulnerabilities, penetration testing, firewall and encryption issues', 'fa-shield-halved', '#ef4444', 3),
('Data Science Issues', 'data-science', 'Machine learning, AI models, data preprocessing and statistical problems', 'fa-brain', '#8b5cf6', 4),
('SAP Issues', 'sap', 'SAP ERP, ABAP, HANA, Basis and module-specific configuration problems', 'fa-building', '#10b981', 5),
('Data Analyst Issues', 'data-analyst', 'SQL queries, Excel, Tableau, Power BI and data visualization problems', 'fa-chart-bar', '#3b82f6', 6),
('System Administrator Issues', 'sysadmin', 'Linux, Windows Server, network config, user management and OS issues', 'fa-terminal', '#f97316', 7),
('Cloud Issues', 'cloud', 'AWS, Azure, GCP infrastructure, billing and cloud service problems', 'fa-cloud', '#06b6d4', 8),
('Database Issues', 'database', 'MySQL, PostgreSQL, MongoDB, query optimization and DB administration', 'fa-database', '#84cc16', 9),
('Networking Issues', 'networking', 'TCP/IP, DNS, VPN, firewall rules and network troubleshooting', 'fa-network-wired', '#ec4899', 10);

-- =============================================
-- Seed Admin User (password: Admin@123456)
-- Change password immediately after setup!
-- =============================================
INSERT INTO users (username, email, password, full_name, role, reputation)
VALUES ('admin', 'admin@techsolve.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Platform Admin', 'admin', 9999);
