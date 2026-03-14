async function renderPlugins() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/plugins');

  const plugins = [
    { name: 'github', version: '1.0.0', description: 'GitHub commit ve event takibi. Repository push, PR ve issue bildirimlerini Discord kanalina gonderir.', enabled: false, icon: 'list' },
    { name: 'rss', version: '1.0.0', description: 'RSS feed takibi ve bildirimi. Blog, haber ve diger kaynaklari otomatik izler.', enabled: false, icon: 'hash' },
    { name: 'captcha', version: '1.0.0', description: 'Captcha ile uye dogrulama. Yeni uyelerin bot olmadigini dogrular ve rol atar.', enabled: false, icon: 'shield' }
  ];

  document.querySelector('.main-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${I18n.t('plugins.title')}</h1>
        <p class="page-subtitle">${plugins.length} eklenti mevcut</p>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))">
      ${plugins.map(p => `
        <div class="plugin-card">
          <div class="plugin-card-head">
            <div style="display:flex;align-items:center;gap:8px">
              ${svgIcon(p.icon)}
              <strong>${p.name}</strong>
            </div>
            <span class="badge badge-neutral mono">v${p.version}</span>
          </div>
          <p>${p.description}</p>
          <div class="btn-group">
            <button class="btn btn-sm ${p.enabled ? 'btn-danger' : 'btn-success'}" onclick="togglePlugin('${p.name}')">
              ${p.enabled ? I18n.t('plugins.disable') : I18n.t('plugins.enable')}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="configurePlugin('${p.name}')">
              ${svgIcon('settings')} ${I18n.t('plugins.configure')}
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function togglePlugin(name) {
  showToast('Eklenti sistemi yapilandiriliyor...', 'success');
}

function configurePlugin(name) {
  showToast('Eklenti ayarlari yakinda!', 'success');
}
