// Simple SPA router
const Router = {
  _routes: {},
  _currentPage: null,

  register(path, handler) {
    this._routes[path] = handler;
  },

  navigate(path) {
    history.pushState({}, '', path);
    this._resolve();
  },

  _resolve() {
    const path = window.location.pathname;
    const handler = this._routes[path] || this._routes['/404'];

    if (handler) {
      this._currentPage = path;
      handler();
    }
  },

  init() {
    window.addEventListener('popstate', () => this._resolve());

    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href') || link.dataset.link);
      }
    });
  },

  start() {
    this.init();
    this._resolve();
  }
};

// SVG Icons (Heroicons outline)
function svgIcon(name) {
  const icons = {
    home: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
    hash: '<path stroke-linecap="round" stroke-linejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>',
    users: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
    shield: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
    cpu: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>',
    settings: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
    puzzle: '<path stroke-linecap="round" stroke-linejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>',
    archive: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>',
    list: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>',
    logout: '<path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>',
    warning: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
    server: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>',
    check: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>',
    chat: '<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>'
  };
  return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">${icons[name] || ''}</svg>`;
}

// Sidebar layout with grouped navigation
function renderLayout(content, activePage) {
  const app = document.getElementById('app');
  const selectedGuild = localStorage.getItem('selectedGuild') || '';
  const activeGuild = (App.guilds || []).find(g => g.id === selectedGuild);

  // Logo: secili sunucunun ikonu veya varsayilan
  const logoHtml = activeGuild?.icon
    ? `<img src="${activeGuild.icon}" style="width:38px;height:38px;border-radius:var(--radius);object-fit:cover" />`
    : `<div class="sidebar-logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg></div>`;
  const titleName = activeGuild?.name || 'DcFyBot';

  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          ${logoHtml}
          <div class="sidebar-title">
            <h1>${titleName}</h1>
            <p>${window._appVersion || 'v1.2.0'}</p>
          </div>
        </div>

        <div class="server-selector">
          <select id="guildSelect" class="form-select" onchange="App.selectGuild(this.value, true)">
            <option value="">Sunucu sec...</option>
          </select>
          <button class="btn btn-ghost btn-xs" onclick="App.inviteBot()" style="width:100%;margin-top:6px;justify-content:center;font-size:11px;color:var(--accent)">+ Sunucuya Ekle</button>
        </div>

        <nav class="sidebar-nav">
          ${navItem('/dashboard', 'dashboard', 'home', activePage)}

          <div class="nav-section"><span class="nav-section-label">${I18n.t('nav.channels') || 'Sunucu'}</span></div>
          ${navItem('/channels', 'channels', 'hash', activePage)}
          ${navItem('/messages', 'messages', 'chat', activePage)}
          ${navItem('/members', 'members', 'users', activePage)}
          ${navItem('/roles', 'roles', 'shield', activePage)}

          <div class="nav-section"><span class="nav-section-label">Sunucu Ayarlari</span></div>
          ${navItem('/server-settings', 'serverSettings', 'server', activePage)}
          ${navItem('/word-filter', 'wordFilter', 'shield', activePage)}
          ${navItem('/ai-setup', 'aiSetup', 'cpu', activePage)}

          <div class="nav-section"><span class="nav-section-label">${I18n.t('common.settings') || 'Ayarlar'}</span></div>
          ${navItem('/ai-settings', 'aiSettings', 'cpu', activePage)}
          ${navItem('/bot-settings', 'botSettings', 'settings', activePage)}
          ${navItem('/plugins', 'plugins', 'puzzle', activePage)}

          ${window._pluginNav && window._pluginNav.length > 0 ? `
            <div class="nav-section"><span class="nav-section-label">Eklenti Sayfalari</span></div>
            ${window._pluginNav.map(n => navItem(n.path, n.labelKey || n.pluginName, n.icon || 'puzzle', activePage)).join('')}
          ` : ''}

          <div class="nav-section"><span class="nav-section-label">${I18n.t('common.actions') || 'Sistem'}</span></div>
          ${navItem('/backup', 'backup', 'archive', activePage)}
          ${navItem('/logs', 'logs', 'list', activePage)}
          ${navItem('/versions', 'versions', 'archive', activePage)}
          ${navItem('/system', 'system', 'server', activePage)}
        </nav>

        <div class="sidebar-footer">
          <button class="nav-item" onclick="App.logout()">
            ${svgIcon('logout')}
            ${I18n.t('common.logout')}
          </button>
        </div>
      </aside>

      <main class="main-content">
        ${content}
      </main>
    </div>
  `;

  App.loadGuilds();
}

function navItem(path, labelKey, iconName, active) {
  const isActive = active === path ? 'active' : '';
  return `<a href="${path}" data-link class="nav-item ${isActive}">${svgIcon(iconName)} ${I18n.t('nav.' + labelKey)}</a>`;
}

// Toast notification
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
