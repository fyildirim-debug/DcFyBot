async function renderLogs() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/logs');

  try {
    const logs = await API.get('/api/stats/logs?limit=200');

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('logs.title')}</h1>
          <p class="page-subtitle">${logs.length} kayit</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary btn-sm" onclick="renderLogs()">${svgIcon('list')} ${I18n.t('common.refresh')}</button>
        </div>
      </div>

      <div class="filter-bar">
        <select class="form-select" onchange="filterLogs(this.value,'level')">
          <option value="">${I18n.t('common.all')} ${I18n.t('logs.level')}</option>
          <option value="info">INFO</option>
          <option value="warn">WARN</option>
          <option value="error">ERROR</option>
        </select>
        <select class="form-select" onchange="filterLogs(this.value,'source')">
          <option value="">${I18n.t('common.all')} ${I18n.t('logs.source')}</option>
          <option value="bot">Bot</option>
          <option value="ai">AI</option>
          <option value="web">Web</option>
          <option value="system">System</option>
          <option value="plugins">Plugins</option>
        </select>
      </div>

      <div class="card card-flush">
        <div class="table-wrap" style="max-height:600px;overflow-y:auto">
          <table>
            <thead><tr>
              <th style="width:70px">${I18n.t('logs.level')}</th>
              <th style="width:80px">${I18n.t('logs.source')}</th>
              <th>${I18n.t('logs.message')}</th>
              <th style="width:160px">${I18n.t('logs.timestamp')}</th>
            </tr></thead>
            <tbody id="logsBody">
              ${logs.length === 0
                ? `<tr><td colspan="4"><div class="empty-state">${I18n.t('logs.noLogs')}</div></td></tr>`
                : logs.map(l => `
                  <tr>
                    <td><span class="badge badge-${l.level==='error'?'danger':l.level==='warn'?'warning':'info'}">${l.level.toUpperCase()}</span></td>
                    <td class="mono" style="font-size:12px;color:var(--text-muted)">${l.source}</td>
                    <td style="font-size:13px;max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.message||''}</td>
                    <td class="mono" style="font-size:11px;color:var(--text-muted);white-space:nowrap">${new Date(l.created_at).toLocaleString('tr-TR')}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tehlikeli -->
      <div class="danger-zone">
        <div class="danger-zone-title">${svgIcon('warning')} Tehlikeli Bolge</div>
        <div class="danger-zone-item">
          <div class="desc">
            <strong>${I18n.t('logs.clearLogs')}</strong>
            Tum log kayitlari kalici olarak silinir.
          </div>
          <button class="btn btn-danger btn-sm" onclick="clearAllLogs()">${I18n.t('logs.clearLogs')}</button>
        </div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function filterLogs(value, type) {
  renderLogs();
}

async function clearAllLogs() {
  if (!confirm(I18n.t('logs.clearConfirm'))) return;
  await API.del('/api/stats/logs');
  showToast('Loglar temizlendi');
  renderLogs();
}
