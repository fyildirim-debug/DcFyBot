// FyDCBot - Main App
const App = {
  guilds: [],

  async init() {
    // Dili yukle
    const savedLang = localStorage.getItem('lang') || 'tr';
    await I18n.load(savedLang);

    // Route'lari kaydet
    Router.register('/setup', () => SetupPage.render());
    Router.register('/login', () => renderLoginPage());
    Router.register('/dashboard', () => renderDashboard());
    Router.register('/ai-settings', () => renderAISettings());
    Router.register('/bot-settings', () => renderBotSettings());
    Router.register('/channels', () => renderChannels());
    Router.register('/members', () => renderMembers());
    Router.register('/roles', () => renderRoles());
    Router.register('/plugins', () => renderPlugins());
    Router.register('/backup', () => renderBackup());
    Router.register('/logs', () => renderLogs());

    // Varsayilan route
    Router.register('/', async () => {
      // Setup kontrol
      try {
        const res = await fetch('/api/setup/status');
        const data = await res.json();

        if (!data.setup_complete) {
          Router.navigate('/setup');
          return;
        }
      } catch {
        // DB yoksa setup
        Router.navigate('/setup');
        return;
      }

      // Auth kontrol
      const token = localStorage.getItem('token');
      if (token) {
        Router.navigate('/dashboard');
      } else {
        Router.navigate('/login');
      }
    });

    // Baslat
    Router.start();
  },

  async loadGuilds() {
    const select = document.getElementById('guildSelect');
    if (!select) return;

    try {
      const guilds = await API.get('/api/guilds');
      this.guilds = guilds;

      const selectedGuild = localStorage.getItem('selectedGuild');

      select.innerHTML = '<option value="">Sunucu sec...</option>' +
        guilds.map(g => `<option value="${g.id}" ${g.id === selectedGuild ? 'selected' : ''}>${g.name} (${g.memberCount})</option>`).join('');

      // Tek sunucu varsa otomatik sec
      if (guilds.length === 1 && !selectedGuild) {
        this.selectGuild(guilds[0].id);
      }
    } catch {}
  },

  selectGuild(guildId) {
    localStorage.setItem('selectedGuild', guildId);
    const select = document.getElementById('guildSelect');
    if (select) select.value = guildId;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('selectedGuild');
    Router.navigate('/login');
  }
};

// Baslat
App.init();
