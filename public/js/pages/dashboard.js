async function renderDashboard() {
  renderLayout('<div class="spinner"></div>', '/dashboard');

  try {
    const [stats, logs] = await Promise.all([
      API.get('/api/stats'),
      API.get('/api/stats/logs?limit=10')
    ]);

    const upH = Math.floor((stats.uptime||0) / 3600000);
    const upM = Math.floor(((stats.uptime||0) % 3600000) / 60000);

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${I18n.t('dashboard.title')}</h1>
        <button class="btn btn-danger btn-sm" onclick="resetDatabase()">${I18n.t('common.reset')} DB</button>
        <span class="badge ${stats.botOnline ? 'badge-success' : 'badge-danger'}">
          <span class="badge-dot ${stats.botOnline ? 'online' : 'offline'}"></span>
          ${stats.botOnline ? I18n.t('dashboard.online') : I18n.t('dashboard.offline')}
        </span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="icon" style="background:var(--accent-light)">
            ${svgIcon('home')}
          </div>
          <div class="label">${I18n.t('dashboard.totalServers')}</div>
          <div class="value">${stats.guildCount || 0}</div>
        </div>
        <div class="stat-card">
          <div class="icon" style="background:var(--success-bg)">
            ${svgIcon('users')}
          </div>
          <div class="label">${I18n.t('dashboard.totalMembers')}</div>
          <div class="value">${stats.memberCount || 0}</div>
        </div>
        <div class="stat-card">
          <div class="icon" style="background:var(--warning-bg)">
            ${svgIcon('hash')}
          </div>
          <div class="label">${I18n.t('dashboard.totalMessages')}</div>
          <div class="value">${stats.totalMessages || 0}</div>
        </div>
        <div class="stat-card">
          <div class="icon" style="background:rgba(235,69,158,0.1)">
            ${svgIcon('cpu')}
          </div>
          <div class="label">${I18n.t('dashboard.aiRequests')}</div>
          <div class="value">${stats.totalAIRequests || 0}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">${I18n.t('dashboard.systemInfo')}</span>
          </div>
          <table>
            <tr><td style="color:var(--text-secondary)">${I18n.t('dashboard.uptime')}</td><td>${upH}h ${upM}m</td></tr>
            <tr><td style="color:var(--text-secondary)">AI</td><td>${stats.ai?.enabled ? `${stats.ai.provider} (${stats.ai.model})` : I18n.t('ai.disabled')}</td></tr>
            <tr><td style="color:var(--text-secondary)">${I18n.t('dashboard.totalServers')}</td><td>${stats.guildCount || 0}</td></tr>
            <tr><td style="color:var(--text-secondary)">${I18n.t('nav.commands') || 'Komutlar'}</td><td>${stats.totalCommands || 0}</td></tr>
          </table>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">${I18n.t('dashboard.recentActivity')}</span>
          </div>
          ${logs.length === 0 ? '<div class="empty-state" style="padding:20px">' + I18n.t('logs.noLogs') + '</div>' :
            '<div style="max-height:300px;overflow-y:auto">' + logs.map(l => `
              <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center">
                <span class="badge badge-${l.level === 'error' ? 'danger' : l.level === 'warn' ? 'warning' : 'info'}" style="font-size:11px">${l.level}</span>
                <span style="font-size:12px;color:var(--text-muted)">[${l.source}]</span>
                <span style="font-size:13px;flex:1">${l.message?.substring(0,80) || ''}</span>
              </div>
            `).join('') + '</div>'
          }
        </div>
      </div>
    `;
  } catch (e) {
    document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function resetDatabase() {
  if (!confirm('TUM VERITABANI SIFIRLANACAK!\n\nTum ayarlar, loglar, yedekler silinecek.\nKurulum ekranina yonlendirileceksiniz.\n\nDevam etmek istiyor musunuz?')) return;

  const input = prompt('Onaylamak icin SIFIRLA yazin:');
  if (input !== 'SIFIRLA') {
    alert('Sifirlama iptal edildi.');
    return;
  }

  try {
    const res = await API.post('/api/settings/reset', { confirm: 'SIFIRLA' });
    if (res.success) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('selectedGuild');
      alert('Veritabani sifirlandi. Kurulum ekranina yonlendiriliyorsunuz.');
      window.location.href = '/';
    } else {
      alert('Hata: ' + (res.error || 'Bilinmeyen hata'));
    }
  } catch (e) {
    alert('Sifirlama hatasi: ' + e.message);
  }
}
