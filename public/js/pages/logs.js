async function renderLogs() {
  renderLayout('<div class="spinner"></div>', '/logs');

  try {
    const logs = await API.get('/api/stats/logs?limit=200');

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${I18n.t('logs.title')}</h1>
        <button class="btn btn-danger btn-sm" onclick="clearAllLogs()">${I18n.t('logs.clearLogs')}</button>
      </div>
      <div class="filter-bar">
        <select class="form-select" style="width:auto" onchange="filterLogs(this.value,'level')">
          <option value="">${I18n.t('common.all')} ${I18n.t('logs.level')}</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <select class="form-select" style="width:auto" onchange="filterLogs(this.value,'source')">
          <option value="">${I18n.t('common.all')} ${I18n.t('logs.source')}</option>
          <option value="bot">Bot</option>
          <option value="ai">AI</option>
          <option value="web">Web</option>
          <option value="system">System</option>
          <option value="plugins">Plugins</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="renderLogs()">${I18n.t('common.refresh')}</button>
      </div>
      <div class="card">
        <div class="table-wrap" style="max-height:600px;overflow-y:auto">
          <table>
            <thead><tr><th>${I18n.t('logs.level')}</th><th>${I18n.t('logs.source')}</th><th>${I18n.t('logs.message')}</th><th>${I18n.t('logs.timestamp')}</th></tr></thead>
            <tbody id="logsBody">
              ${logs.length === 0 ? `<tr><td colspan="4" class="empty-state">${I18n.t('logs.noLogs')}</td></tr>` :
                logs.map(l => `
                  <tr>
                    <td><span class="badge badge-${l.level==='error'?'danger':l.level==='warn'?'warning':'info'}">${l.level}</span></td>
                    <td style="color:var(--text-muted)">${l.source}</td>
                    <td style="font-size:13px;max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.message||''}</td>
                    <td style="font-size:12px;color:var(--text-muted);white-space:nowrap">${new Date(l.created_at).toLocaleString('tr-TR')}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function filterLogs(value, type) {
  // Basit filtre - sayfayi yeniden yukle
  renderLogs();
}

async function clearAllLogs() {
  if (!confirm(I18n.t('logs.clearConfirm'))) return;
  await API.del('/api/stats/logs');
  renderLogs();
}
