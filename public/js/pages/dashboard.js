async function renderDashboard() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/dashboard');

  try {
    const [stats, logs] = await Promise.all([
      API.get('/api/stats'),
      API.get('/api/stats/logs?limit=10')
    ]);

    const upH = Math.floor((stats.uptime||0) / 3600000);
    const upM = Math.floor(((stats.uptime||0) % 3600000) / 60000);

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('dashboard.title')}</h1>
          <p class="page-subtitle">${I18n.t('dashboard.systemInfo')}</p>
        </div>
        <span class="badge ${stats.botOnline ? 'badge-success' : 'badge-danger'}">
          <span class="badge-dot ${stats.botOnline ? 'online' : 'offline'}"></span>
          ${stats.botOnline ? I18n.t('dashboard.online') : I18n.t('dashboard.offline')}
        </span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--accent-glow);color:var(--accent)">
            ${svgIcon('server')}
          </div>
          <div class="stat-label">${I18n.t('dashboard.totalServers')}</div>
          <div class="stat-value">${stats.guildCount || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--success-glow);color:var(--success)">
            ${svgIcon('users')}
          </div>
          <div class="stat-label">${I18n.t('dashboard.totalMembers')}</div>
          <div class="stat-value">${stats.memberCount || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--warning-glow);color:var(--warning)">
            ${svgIcon('hash')}
          </div>
          <div class="stat-label">${I18n.t('dashboard.totalMessages')}</div>
          <div class="stat-value">${stats.totalMessages || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--info-glow);color:var(--info)">
            ${svgIcon('cpu')}
          </div>
          <div class="stat-label">${I18n.t('dashboard.aiRequests')}</div>
          <div class="stat-value">${stats.totalAIRequests || 0}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card card-flush">
          <div class="card-header">
            <span class="card-title">${I18n.t('dashboard.systemInfo')}</span>
            <span class="badge badge-neutral mono">${upH}h ${upM}m</span>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="info-label">${I18n.t('dashboard.uptime')}</span>
              <span class="info-value mono">${upH}h ${upM}m</span>
            </div>
            <div class="info-row">
              <span class="info-label">AI</span>
              <span class="info-value">${stats.ai?.enabled
                ? `<span class="badge badge-success">${stats.ai.provider}</span> <span class="mono" style="font-size:12px;color:var(--text-muted)">${stats.ai.model}</span>`
                : `<span class="badge badge-neutral">${I18n.t('ai.disabled')}</span>`}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${I18n.t('dashboard.totalServers')}</span>
              <span class="info-value mono">${stats.guildCount || 0}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Komutlar</span>
              <span class="info-value mono">${stats.totalCommands || 0}</span>
            </div>
          </div>
        </div>

        <div class="card card-flush">
          <div class="card-header">
            <span class="card-title">${I18n.t('dashboard.recentActivity')}</span>
            <a href="/logs" data-link class="btn btn-ghost btn-xs">${I18n.t('common.all')}</a>
          </div>
          <div class="card-body" style="padding:0">
            ${logs.length === 0
              ? '<div class="empty-state" style="padding:24px">' + I18n.t('logs.noLogs') + '</div>'
              : '<div style="max-height:280px;overflow-y:auto">' + logs.map(l => `
                <div style="padding:8px 20px;border-bottom:1px solid var(--border-subtle);display:flex;gap:8px;align-items:center">
                  <span class="badge badge-${l.level === 'error' ? 'danger' : l.level === 'warn' ? 'warning' : 'info'}" style="font-size:10px">${l.level}</span>
                  <span style="font-size:11px;color:var(--text-muted);font-family:'Fira Code',monospace">${l.source}</span>
                  <span style="font-size:12.5px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.message?.substring(0,60) || ''}</span>
                </div>
              `).join('') + '</div>'
            }
          </div>
        </div>
      </div>

    `;
  } catch (e) {
    document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}
