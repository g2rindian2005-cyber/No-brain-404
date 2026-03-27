// =========================================
// TechSolve - Main Frontend JavaScript
// =========================================

// ─── Theme Management ─────────────────────
const initTheme = () => {
  const saved = localStorage.getItem('ts_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
};

const updateThemeIcon = (theme) => {
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
};

const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ts_theme', next);
  updateThemeIcon(next);
};

document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
initTheme();

// ─── Auth Helpers ─────────────────────────
const getToken = () => localStorage.getItem('ts_token');
const getUser = () => {
  const u = localStorage.getItem('ts_user');
  return u ? JSON.parse(u) : null;
};
const isLoggedIn = () => !!getToken();

const logout = () => {
  localStorage.removeItem('ts_token');
  localStorage.removeItem('ts_user');
  window.location.href = '/';
};

// ─── API Helpers ──────────────────────────
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(window.API_URL + endpoint, opts);
    return await res.json();
  } catch (err) {
    console.error('API request failed:', err);
    return { success: false, message: 'Network error' };
  }
};

const authRequest = async (endpoint, method = 'GET', body = null) => {
  try {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(window.API_URL + endpoint, opts);
    if (res.status === 401) { logout(); return null; }
    return await res.json();
  } catch (err) {
    console.error('Auth request failed:', err);
    return { success: false, message: 'Network error' };
  }
};

// ─── Auth UI Setup ─────────────────────────
const setupAuthUI = () => {
  const user = getUser();
  const authArea = document.getElementById('authArea');
  const userMenu = document.getElementById('userMenu');

  if (!authArea || !userMenu) return;

  if (user && isLoggedIn()) {
    authArea.classList.add('hidden');
    userMenu.classList.remove('hidden');

    const nameEl = document.getElementById('userNameDisplay');
    if (nameEl) nameEl.textContent = user.username;

    const avatarEl = document.getElementById('userAvatarImg');
    if (avatarEl) {
      avatarEl.src = user.avatar || '/images/default-avatar.svg';
      avatarEl.alt = user.username;
    }

    const adminItems = document.getElementById('adminMenuItems');
    if (adminItems && user.role === 'admin') adminItems.classList.remove('hidden');

    // Update mobile menu
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
      mobileMenu.innerHTML = `
        <a href="/">Home</a>
        <a href="/submit">Share Solution</a>
        <a href="/profile">My Profile</a>
        ${user.role === 'admin' ? '<a href="/admin">Admin Panel</a>' : ''}
        <a href="#" id="mobileLogout">Logout</a>`;
      document.getElementById('mobileLogout')?.addEventListener('click', e => { e.preventDefault(); logout(); });
    }
  } else {
    authArea.classList.remove('hidden');
    userMenu.classList.add('hidden');
  }
};

// Dropdown toggle
document.getElementById('userAvatarBtn')?.addEventListener('click', () => {
  document.getElementById('dropdownMenu')?.classList.toggle('open');
});
document.addEventListener('click', e => {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('userAvatarBtn');
  if (menu && !menu.contains(e.target) && !btn?.contains(e.target)) {
    menu.classList.remove('open');
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', e => { e.preventDefault(); logout(); });
document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
  document.getElementById('mobileMenu')?.classList.toggle('open');
});

setupAuthUI();

// ─── Load Category Nav ─────────────────────
const loadCategoryNav = async () => {
  const navInner = document.getElementById('categoryNavInner');
  const footerCats = document.getElementById('footerCategories');
  if (!navInner) return;

  const res = await apiRequest('/categories');
  if (!res.success) return;

  const currentPath = window.location.pathname;
  res.categories.forEach(c => {
    const a = document.createElement('a');
    a.href = '/category/' + c.slug;
    a.className = 'cat-link' + (currentPath === '/category/' + c.slug ? ' active' : '');
    a.innerHTML = `<i class="fa-solid ${c.icon}"></i> ${escHtml(c.name)}`;
    a.style.setProperty('--cat-color', c.color);
    navInner.appendChild(a);

    if (footerCats) {
      const fa = document.createElement('a');
      fa.href = '/category/' + c.slug;
      fa.textContent = c.name;
      footerCats.appendChild(fa);
    }
  });
};

loadCategoryNav();

// ─── Search Suggestions ───────────────────
let searchTimeout;
const globalSearch = document.getElementById('globalSearch');
const suggestions = document.getElementById('searchSuggestions');

globalSearch?.addEventListener('input', function() {
  clearTimeout(searchTimeout);
  const q = this.value.trim();
  if (q.length < 2) { suggestions?.classList.remove('active'); return; }

  searchTimeout = setTimeout(async () => {
    const res = await apiRequest('/posts?search=' + encodeURIComponent(q) + '&limit=5');
    if (!res.success || !res.posts.length) { suggestions?.classList.remove('active'); return; }

    suggestions.innerHTML = res.posts.map(p => `
      <a class="suggestion-item" href="/post/${p.slug}">
        <i class="fa-solid fa-magnifying-glass" style="color:var(--text3)"></i>
        <div>
          <div style="font-weight:600;font-size:0.88rem">${escHtml(p.title.substring(0, 60))}</div>
          <div style="font-size:0.75rem;color:var(--text3)">${escHtml(p.category_name)}</div>
        </div>
      </a>`).join('');
    suggestions.classList.add('active');
  }, 300);
});

document.addEventListener('click', e => {
  if (!globalSearch?.contains(e.target)) suggestions?.classList.remove('active');
});

// ─── Post Card Renderer ───────────────────
const postCard = (p) => {
  const diffColors = { beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#ef4444' };
  const dc = diffColors[p.difficulty] || '#6366f1';
  const tags = p.tags ? p.tags.split(',').slice(0, 3).map(t => `<span class="tag">#${escHtml(t.trim())}</span>`).join('') : '';

  return `
    <a href="/post/${p.slug}" class="post-card">
      <div class="post-card-header">
        <div class="post-card-meta">
          <span class="cat-badge" style="background:${p.category_color}20;color:${p.category_color}">
            <i class="fa-solid ${p.category_icon || 'fa-code'}"></i> ${escHtml(p.category_name)}
          </span>
          <span class="difficulty-badge" style="background:${dc}20;color:${dc}">${p.difficulty}</span>
          ${p.is_featured ? '<span class="cat-badge" style="background:#f59e0b20;color:#f59e0b">⭐ Featured</span>' : ''}
        </div>
        <h3 class="post-card-title">${escHtml(p.title)}</h3>
      </div>
      <div class="post-card-body">
        <p class="post-card-excerpt">${escHtml(p.problem_description.substring(0, 140))}...</p>
        <div class="post-card-tags">${tags}</div>
      </div>
      <div class="post-card-footer">
        <div class="author-mini">
          <img src="/images/default-avatar.svg" alt="${escHtml(p.username)}" />
          <span>${escHtml(p.username)}</span>
        </div>
        <div class="post-stats">
          <span><i class="fa-solid fa-eye"></i> ${(p.views || 0).toLocaleString()}</span>
          <span><i class="fa-solid fa-heart"></i> ${p.likes || 0}</span>
          <span><i class="fa-solid fa-comment"></i> ${p.comment_count || 0}</span>
        </div>
      </div>
    </a>`;
};

// ─── Toast Notifications ──────────────────
const showToast = (message, type = 'success') => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}"></i> ${escHtml(message)}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
};

// ─── Pagination Renderer ──────────────────
const renderPagination = (containerId, pagination, loadFn) => {
  const el = document.getElementById(containerId);
  if (!el || !pagination) return;

  const { page, pages } = pagination;
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = '';
  if (page > 1) html += `<button class="page-btn" onclick="${loadFn.name}(${page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;

  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="${loadFn.name}(${i})">${i}</button>`;
  }

  if (page < pages) html += `<button class="page-btn" onclick="${loadFn.name}(${page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
  el.innerHTML = html;
};

// ─── Utility: HTML Escape ─────────────────
const escHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
