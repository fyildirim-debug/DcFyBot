async function renderSystem() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/system');

  try {
    const stats = await API.get('/api/stats');
    const upH = Math.floor((stats.uptime||0) / 3600000);
    const upM = Math.floor(((stats.uptime||0) % 3600000) / 60000);

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Sistem Yonetimi</h1>
          <p class="page-subtitle">Sistem durumu ve fabrika ayarlari</p>
        </div>
      </div>

      <!-- Sistem Durumu -->
      <div class="section-title">Sistem Durumu</div>
      <div class="card">
        <div class="info-row">
          <span class="info-label">Bot Durumu</span>
          <span class="badge ${stats.botOnline ? 'badge-success' : 'badge-danger'}">
            <span class="badge-dot ${stats.botOnline ? 'online' : 'offline'}"></span>
            ${stats.botOnline ? I18n.t('dashboard.online') : I18n.t('dashboard.offline')}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">${I18n.t('dashboard.uptime')}</span>
          <span class="info-value mono">${upH}h ${upM}m</span>
        </div>
        <div class="info-row">
          <span class="info-label">Sunucu Sayisi</span>
          <span class="info-value mono">${stats.guildCount || 0}</span>
        </div>
        <div class="info-row">
          <span class="info-label">AI</span>
          <span class="info-value">${stats.ai?.enabled
            ? `<span class="badge badge-success">${stats.ai.provider} / ${stats.ai.model}</span>`
            : `<span class="badge badge-neutral">${I18n.t('ai.disabled')}</span>`
          }</span>
        </div>
        <div class="info-row">
          <span class="info-label">Veritabani</span>
          <span class="badge badge-success">PostgreSQL - Bagli</span>
        </div>
      </div>

      <!-- Bot Kontrol -->
      <div class="section-title">Bot Kontrol</div>
      <div class="card">
        <div class="danger-zone-item">
          <div class="desc">
            <strong>${I18n.t('bot.restart')}</strong>
            Discord baglantisi kesilir ve yeniden kurulur. Ayarlar korunur.
          </div>
          <button class="btn btn-secondary btn-sm" onclick="restartBot()">${svgIcon('settings')} ${I18n.t('bot.restart')}</button>
        </div>
      </div>

      <!-- Fabrika Ayarlari -->
      <div class="danger-zone" style="margin-top:40px">
        <div class="danger-zone-title">${svgIcon('warning')} Fabrika Ayarlari</div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
          Bu islemler geri alinamaz. Devam etmeden once yedek almaniz onerilir.
        </p>

        <div class="danger-zone-item">
          <div class="desc">
            <strong>Loglari Temizle</strong>
            Tum log kayitlari kalici olarak silinir. Sistem loglari sifirlanir.
          </div>
          <button class="btn btn-danger btn-sm" onclick="systemClearLogs()">Loglari Temizle</button>
        </div>

        <div class="danger-zone-item">
          <div class="desc">
            <strong>Yedekleri Temizle</strong>
            Tum kanal ve yetki yedekleri kalici olarak silinir.
          </div>
          <button class="btn btn-danger btn-sm" onclick="systemClearBackups()">Yedekleri Temizle</button>
        </div>

        <div class="danger-zone-item" style="border-bottom:none;padding-bottom:0">
          <div class="desc">
            <strong style="color:var(--danger)">Full Factory Reset</strong>
            TUM veriler silinir: ayarlar, kullanicilar, loglar, yedekler, eklenti verileri.
            Bot kurulum ekranina doner ve sifirdan yapilandirilmasi gerekir.
          </div>
          <button class="btn btn-danger btn-sm" onclick="factoryReset()" style="white-space:nowrap">Factory Reset</button>
        </div>
      </div>
    `;
  } catch(e) {
    document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function restartBot() {
  if (!confirm('Bot yeniden baslatilacak. Devam?')) return;
  try {
    await API.post('/api/settings/bot/restart');
    showToast('Bot yeniden baslatiliyor...');
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function systemClearLogs() {
  if (!confirm('Tum log kayitlari silinecek. Devam?')) return;
  try {
    await API.del('/api/stats/logs');
    showToast('Loglar temizlendi');
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function systemClearBackups() {
  if (!confirm('Tum yedekler silinecek. Devam?')) return;
  try {
    await API.post('/api/settings/clear-backups', {});
    showToast('Yedekler temizlendi');
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function factoryReset() {
  if (!confirm('FULL FACTORY RESET!\n\nTUM veriler silinecek:\n- Ayarlar\n- Kullanicilar\n- Loglar\n- Yedekler\n- Eklenti verileri\n\nBot kurulum ekranina donecek.\nDevam etmek istiyor musunuz?')) return;

  const input = prompt('Onaylamak icin SIFIRLA yazin:');
  if (input !== 'SIFIRLA') {
    showToast('Factory reset iptal edildi.', 'error');
    return;
  }

  try {
    const res = await API.post('/api/settings/reset', { confirm: 'SIFIRLA' });
    if (res.success) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('selectedGuild');
      alert('Factory reset tamamlandi.\nKurulum ekranina yonlendiriliyorsunuz.');
      window.location.href = '/';
    } else {
      showToast('Hata: ' + (res.error || 'Bilinmeyen hata'), 'error');
    }
  } catch (e) {
    showToast('Factory reset hatasi: ' + e.message, 'error');
  }
}
