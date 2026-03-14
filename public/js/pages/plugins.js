async function renderPlugins() {
  renderLayout('<div class="spinner"></div>', '/plugins');

  // Plugin listesi simdilik statik
  const plugins = [
    { name: 'github', version: '1.0.0', description: 'GitHub commit ve event takibi', enabled: false },
    { name: 'rss', version: '1.0.0', description: 'RSS feed takibi ve bildirimi', enabled: false },
    { name: 'captcha', version: '1.0.0', description: 'Captcha ile uye dogrulama', enabled: false }
  ];

  document.querySelector('.main-content').innerHTML = `
    <div class="page-header"><h1 class="page-title">${I18n.t('plugins.title')}</h1></div>
    <div class="stats-grid">
      ${plugins.map(p => `
        <div class="card" style="margin-bottom:0">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <strong>${p.name}</strong>
            <span class="badge badge-info">v${p.version}</span>
          </div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">${p.description}</p>
          <div class="btn-group">
            <button class="btn btn-sm ${p.enabled?'btn-danger':'btn-success'}" onclick="alert('Eklenti yapilandirmasi yakinda!')">${p.enabled ? I18n.t('plugins.disable') : I18n.t('plugins.enable')}</button>
            <button class="btn btn-sm btn-secondary" onclick="alert('Eklenti ayarlari yakinda!')">${I18n.t('plugins.configure')}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
