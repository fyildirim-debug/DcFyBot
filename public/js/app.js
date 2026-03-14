// FyDCBot - Main App
window._pluginNav = [];

const App = {
  guilds: [],

  async init() {
    // Dili yukle
    const savedLang = localStorage.getItem('lang') || 'tr';
    try {
      await I18n.load(savedLang);
    } catch (e) {
      console.error('Dil yuklenemedi:', e);
    }

    // Versiyon yukle
    try {
      const v = await fetch('/api/version').then(r => r.json());
      window._appVersion = 'v' + v.version;
    } catch { window._appVersion = 'v1.2.0'; }

    // Core route'lari kaydet
    Router.register('/setup', () => SetupPage.render());
    Router.register('/login', () => renderLoginPage());
    Router.register('/dashboard', () => renderDashboard());
    Router.register('/ai-settings', () => renderAISettings());
    Router.register('/bot-settings', () => renderBotSettings());
    Router.register('/channels', () => renderChannels());
    Router.register('/messages', () => renderMessages());
    Router.register('/members', () => renderMembers());
    Router.register('/roles', () => renderRoles());
    Router.register('/plugins', () => renderPlugins());
    Router.register('/backup', () => renderBackup());
    Router.register('/logs', () => renderLogs());
    Router.register('/server-settings', () => renderServerSettings());
    Router.register('/ai-setup', () => renderAISetup());
    Router.register('/system', () => renderSystem());

    Router.register('/', () => App.checkAndRedirect());
    Router.register('/404', () => App.checkAndRedirect());

    // Plugin web registry'yi yukle
    await App.loadPluginRegistry();

    // Baslat
    Router.start();
  },

  async loadPluginRegistry() {
    try {
      const registry = await fetch('/api/plugins/registry').then(r => r.json());
      if (!Array.isArray(registry)) return;

      for (const plugin of registry) {
        // Nav items kaydet
        if (plugin.navItems?.length) {
          window._pluginNav.push(...plugin.navItems.map(n => ({
            ...n,
            pluginName: plugin.name
          })));
        }

        // Plugin page script'lerini dinamik yukle
        if (plugin.pages?.length) {
          for (const pageUrl of plugin.pages) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = pageUrl;
              script.onload = resolve;
              script.onerror = () => { console.warn(`Plugin script yuklenemedi: ${pageUrl}`); resolve(); };
              document.head.appendChild(script);
            });
          }
        }

        // Plugin nav items icin route kaydet
        for (const nav of (plugin.navItems || [])) {
          const handlerName = nav.handler || ('render_plugin_' + plugin.name);
          if (typeof window[handlerName] === 'function') {
            Router.register(nav.path, window[handlerName]);
          } else {
            // Fallback: generic plugin page
            Router.register(nav.path, () => renderGenericPluginPage(plugin.name, nav));
          }
        }
      }
    } catch (e) {
      console.warn('Plugin registry yuklenemedi:', e);
    }
  },

  async checkAndRedirect() {
    try {
      const res = await fetch('/api/setup/status');
      const data = await res.json();
      if (!data.setup_complete) {
        SetupPage.render();
        return;
      }
    } catch {
      SetupPage.render();
      return;
    }

    const token = localStorage.getItem('token');
    if (token) {
      Router.navigate('/dashboard');
    } else {
      Router.navigate('/login');
    }
  },

  async loadGuilds() {
    const select = document.getElementById('guildSelect');
    if (!select) return;

    try {
      const guilds = await API.get('/api/guilds');
      this.guilds = guilds;

      const selectedGuild = localStorage.getItem('selectedGuild');

      // Kayitli sunucu hala listede mi?
      const stillExists = selectedGuild && guilds.some(g => g.id === selectedGuild);
      const activeGuild = stillExists ? selectedGuild : (guilds.length > 0 ? guilds[0].id : '');

      select.innerHTML = '<option value="">Sunucu sec...</option>' +
        guilds.map(g => `<option value="${g.id}" ${g.id === activeGuild ? 'selected' : ''}>${g.name} (${g.memberCount})</option>`).join('');

      // Otomatik sec: kayitli yoksa veya gecersizse ilk sunucuyu sec
      if (activeGuild && activeGuild !== selectedGuild) {
        this.selectGuild(activeGuild);
      } else if (!selectedGuild && guilds.length > 0) {
        this.selectGuild(guilds[0].id);
      }
    } catch (e) { console.warn('Sunucu listesi yuklenemedi:', e); }
  },

  selectGuild(guildId, reload = false) {
    const prev = localStorage.getItem('selectedGuild');
    localStorage.setItem('selectedGuild', guildId);
    const select = document.getElementById('guildSelect');
    if (select) select.value = guildId;

    // Sunucu degistiyse mevcut sayfayi yeniden yukle
    if (reload || (prev && prev !== guildId && guildId)) {
      Router._resolve();
    }
  },

  async inviteBot() {
    try {
      const data = await API.get('/api/guilds/invite');
      if (data.url) {
        window.open(data.url, '_blank', 'width=500,height=800');
        showToast('Davet sayfasi acildi. Ekledikten sonra sayfayi yenileyin.');
      }
    } catch (e) {
      showToast('Davet URL\'si olusturulamadi: ' + e.message, 'error');
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('selectedGuild');
    Router.navigate('/login');
  }
};

// Generic plugin page (fallback - eklenti kendi sayfasini tanimlamadiysa)
function renderGenericPluginPage(pluginName, nav) {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', nav.path);
  document.querySelector('.main-content').innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${nav.label || pluginName}</h1>
    </div>
    <div class="card">
      <p style="color:var(--text-muted)">Bu eklenti henuz bir sayfa tanimlamadi.</p>
    </div>
  `;
}

// Baslat
App.init();
