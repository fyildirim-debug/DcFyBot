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

    // Link click'lerini yakala
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

// Sidebar + layout render
function renderLayout(content, activePage) {
  const app = document.getElementById('app');
  const selectedGuild = localStorage.getItem('selectedGuild') || '';

  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </div>
          <div class="sidebar-title">
            <h1>FyDCBot</h1>
            <p>v1.0.0</p>
          </div>
        </div>

        <div class="server-selector">
          <select id="guildSelect" class="form-select" onchange="App.selectGuild(this.value)">
            <option value="">Sunucu sec...</option>
          </select>
        </div>

        <nav class="sidebar-nav">
          ${navItem('/dashboard', 'dashboard', svgIcon('home'), activePage)}
          ${navItem('/channels', 'channels', svgIcon('hash'), activePage)}
          ${navItem('/members', 'members', svgIcon('users'), activePage)}
          ${navItem('/roles', 'roles', svgIcon('shield'), activePage)}
          ${navItem('/ai-settings', 'aiSettings', svgIcon('cpu'), activePage)}
          ${navItem('/bot-settings', 'botSettings', svgIcon('settings'), activePage)}
          ${navItem('/plugins', 'plugins', svgIcon('puzzle'), activePage)}
          ${navItem('/backup', 'backup', svgIcon('archive'), activePage)}
          ${navItem('/logs', 'logs', svgIcon('list'), activePage)}
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

  // Sunucu listesini yukle
  App.loadGuilds();
}

function navItem(path, labelKey, icon, active) {
  const isActive = active === path ? 'active' : '';
  return `<a href="${path}" data-link class="nav-item ${isActive}">${icon} ${I18n.t('nav.' + labelKey)}</a>`;
}

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
    logout: '<path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>'
  };
  return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">${icons[name] || ''}</svg>`;
}
