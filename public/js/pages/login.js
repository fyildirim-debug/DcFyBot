function renderLoginPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="setup-logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
        </div>
        <h2 class="setup-title" style="margin-bottom:8px">${I18n.t('auth.loginTitle')}</h2>
        <p class="setup-desc">${I18n.t('common.login')}</p>

        <form id="loginForm" onsubmit="handleLogin(event)">
          <div id="loginError" class="alert alert-danger" style="display:none"></div>
          <div class="form-group">
            <label class="form-label">${I18n.t('auth.username')}</label>
            <input class="form-input" id="loginUser" required />
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('auth.password')}</label>
            <input class="form-input" type="password" id="loginPass" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px" id="loginBtn">
            ${I18n.t('auth.loginButton')}
          </button>
        </form>
      </div>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  btn.disabled = true;
  err.style.display = 'none';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('loginUser').value,
        password: document.getElementById('loginPass').value
      })
    });

    const data = await res.json();
    if (!res.ok) {
      err.textContent = data.error || I18n.t('auth.loginError');
      err.style.display = 'block';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    Router.navigate('/dashboard');
  } catch {
    err.textContent = I18n.t('errors.networkError');
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
}
