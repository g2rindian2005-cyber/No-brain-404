// =========================================
// TechSolve - Admin Panel JavaScript
// =========================================

// ─── Admin Auth Guard ─────────────────────
const checkAdminAuth = () => {
  const user = getUser();
  const token = getToken();

  if (!token || !user) {
    document.getElementById('adminPageContent').classList.add('hidden');
    document.getElementById('adminAuthGuard').classList.remove('hidden');
    return false;
  }

  if (user.role !== 'admin') {
    document.getElementById('adminPageContent').innerHTML = `
      <div class="auth-guard-msg">
        <i class="fa-solid fa-ban"></i>
        <h2>Access Denied</h2>
        <p>You do not have admin privileges.</p>
        <a href="/" class="btn-primary">Go Home</a>
      </div>`;
    return false;
  }

  // Show user info
  const infoEl = document.getElementById('adminUserInfo');
  if (infoEl) infoEl.textContent = `Logged in as ${user.username}`;

  return true;
};

// ─── Admin API Helper ─────────────────────
const adminRequest = async (endpoint, method = 'GET', body = null) => {
  const token = getToken();
  if (!token) { window.location.href = '/login'; return null; }

  try {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(window.API_URL + endpoint, opts);
    if (res.status === 401 || res.status === 403) {
      showToast('Session expired or access denied. Please login again.', 'error');
      setTimeout(() => window.location.href = '/login', 1500);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('Admin request failed:', err);
    showToast('Network error. Please try again.', 'error');
    return null;
  }
};

// ─── Sidebar Toggle ───────────────────────
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  const sidebar = document.getElementById('adminSidebar');
  sidebar.classList.toggle('open');
  sidebar.classList.toggle('collapsed');
});

// ─── Admin Logout ─────────────────────────
document.getElementById('adminLogout')?.addEventListener('click', (e) => {
  e.preventDefault();
  logout();
});

// ─── Init Admin ───────────────────────────
checkAdminAuth();
