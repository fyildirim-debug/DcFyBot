async function renderPlugins() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/plugins');

  const guildId = localStorage.getItem('selectedGuild');

  // Captcha durumunu DB'den cek
  let captchaSettings = null;
  if (guildId) {
    try {
      captchaSettings = await API.get(`/api/plugins/captcha/settings/${guildId}`);
    } catch {}
  }

  const plugins = [
    { name: 'captcha', version: '2.0.0', description: 'Captcha ile uye dogrulama. Yeni uyeler dogrulanmadan hicbir kanali goremez. Buton, matematik veya kod dogrulama.', enabled: captchaSettings?.enabled || false, icon: 'shield', configurable: true },
    { name: 'github', version: '1.0.0', description: 'GitHub commit ve event takibi. Repository push, PR ve issue bildirimlerini Discord kanalina gonderir.', enabled: false, icon: 'list', configurable: false },
    { name: 'rss', version: '1.0.0', description: 'RSS feed takibi ve bildirimi. Blog, haber ve diger kaynaklari otomatik izler.', enabled: false, icon: 'hash', configurable: false }
  ];

  document.querySelector('.main-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${I18n.t('plugins.title')}</h1>
        <p class="page-subtitle">${plugins.length} eklenti mevcut</p>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))">
      ${plugins.map(p => `
        <div class="card" style="padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:10px">
              ${svgIcon(p.icon)}
              <strong style="font-size:16px;text-transform:capitalize">${p.name}</strong>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge ${p.enabled ? 'badge-success' : 'badge-neutral'}">${p.enabled ? 'Aktif' : 'Deaktif'}</span>
              <span class="badge badge-neutral mono">v${p.version}</span>
            </div>
          </div>
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px;line-height:1.5">${p.description}</p>
          <div class="btn-group">
            ${p.configurable ? `
              <button class="btn btn-sm btn-primary" onclick="configurePlugin('${p.name}')">
                ${svgIcon('settings')} Ayarla
              </button>
            ` : `
              <button class="btn btn-sm btn-secondary" disabled>
                ${svgIcon('settings')} Yakinda
              </button>
            `}
          </div>
        </div>
      `).join('')}
    </div>

    <div id="plugin-config-area"></div>
  `;
}

async function configurePlugin(name) {
  if (name === 'captcha') {
    await renderCaptchaConfig();
  }
}

async function renderCaptchaConfig() {
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) {
    showToast('Sunucu secin', 'error');
    return;
  }

  const area = document.getElementById('plugin-config-area');
  area.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';

  let settings, roles, channels, pending;
  try {
    [settings, roles, channels, pending] = await Promise.all([
      API.get(`/api/plugins/captcha/settings/${guildId}`),
      API.get(`/api/roles/${guildId}`),
      API.get(`/api/channels/${guildId}`),
      API.get(`/api/plugins/captcha/pending/${guildId}`)
    ]);
  } catch (err) {
    area.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    return;
  }

  const textChannels = (channels || []).filter(c => c.type === 0 || c.type === 'GUILD_TEXT');

  area.innerHTML = `
    <div style="margin-top:24px">
      <div class="page-header">
        <div>
          <h2 class="page-title">${svgIcon('shield')} Captcha Yapilandirmasi</h2>
          <p class="page-subtitle">Uye dogrulama sistemi ayarlari</p>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="document.getElementById('plugin-config-area').innerHTML=''">Kapat</button>
      </div>

      <!-- Otomatik Kurulum -->
      <div class="card" style="padding:20px;margin-bottom:16px;border-left:3px solid var(--accent)">
        <h3 class="section-title">Otomatik Kurulum</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
          "Dogrulanmamis" ve "Dogrulanmis" rollerini, "dogrulama" kanalini otomatik olusturur.
          Tum diger kanallarda @everyone erisimini kapatir, sadece Dogrulanmis rolu erisebilir.
        </p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
          <label style="font-size:13px;color:var(--text-muted)">Dogrulama Tipi:</label>
          <select id="captcha-auto-type" class="form-input" style="width:200px">
            <option value="button">Buton Tiklama</option>
            <option value="math">Matematik Sorusu</option>
            <option value="code">Kod Girisi</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="captchaAutoSetup()">
          ${svgIcon('shield')} Otomatik Kur ve Aktif Et
        </button>
        ${settings.auto_setup_done ? '<span class="badge badge-success" style="margin-left:8px">Kurulum yapildi</span>' : ''}
      </div>

      <!-- Manuel Ayarlar -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <h3 class="section-title">Manuel Ayarlar</h3>

        <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div class="form-group">
              <label class="form-label">Durum</label>
              <label class="toggle-switch">
                <input type="checkbox" id="captcha-enabled" ${settings.enabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">Dogrulama Tipi</label>
              <select id="captcha-type" class="form-input">
                <option value="button" ${settings.type === 'button' ? 'selected' : ''}>Buton Tiklama</option>
                <option value="math" ${settings.type === 'math' ? 'selected' : ''}>Matematik Sorusu</option>
                <option value="code" ${settings.type === 'code' ? 'selected' : ''}>Kod Girisi</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Zaman Asimi (dakika)</label>
              <input type="number" id="captcha-timeout" class="form-input" value="${settings.timeout_minutes || 5}" min="1" max="60">
            </div>

            <div class="form-group">
              <label class="form-label">Sure Dolunca At</label>
              <label class="toggle-switch">
                <input type="checkbox" id="captcha-kick" ${settings.kick_on_timeout ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div>
            <div class="form-group">
              <label class="form-label">Dogrulanmis Rolu</label>
              <select id="captcha-verified-role" class="form-input">
                <option value="">Sec...</option>
                ${(roles || []).map(r => `<option value="${r.id}" ${settings.verified_role_id === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Dogrulanmamis Rolu</label>
              <select id="captcha-unverified-role" class="form-input">
                <option value="">Sec...</option>
                ${(roles || []).map(r => `<option value="${r.id}" ${settings.unverified_role_id === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Dogrulama Kanali</label>
              <select id="captcha-channel" class="form-input">
                <option value="">Sec...</option>
                ${textChannels.map(c => `<option value="${c.id}" ${settings.verification_channel_id === c.id ? 'selected' : ''}># ${c.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Log Kanali (opsiyonel)</label>
              <select id="captcha-log-channel" class="form-input">
                <option value="">Yok</option>
                ${textChannels.map(c => `<option value="${c.id}" ${settings.log_channel_id === c.id ? 'selected' : ''}># ${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div style="margin-top:16px">
          <div class="form-group">
            <label class="form-label">Karsilama Mesaji (opsiyonel)</label>
            <textarea id="captcha-welcome-msg" class="form-input" rows="2" placeholder="Merhaba! Dogrulamanizi tamamlayin...">${settings.welcome_message || ''}</textarea>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="form-group">
              <label class="form-label">Basari Mesaji</label>
              <input type="text" id="captcha-success-msg" class="form-input" value="${settings.success_message || ''}" placeholder="Dogrulama basarili! Hosgeldiniz.">
            </div>
            <div class="form-group">
              <label class="form-label">Basarisiz Mesaji</label>
              <input type="text" id="captcha-fail-msg" class="form-input" value="${settings.fail_message || ''}" placeholder="Dogrulama basarisiz. Deneme hakkiniz bitti.">
            </div>
          </div>
        </div>

        <button class="btn btn-success" onclick="saveCaptchaSettings()" style="margin-top:12px">
          ${svgIcon('save')} Kaydet
        </button>
      </div>

      <!-- Bekleyen Dogrulamalar -->
      ${pending && pending.length > 0 ? `
        <div class="card" style="padding:20px;margin-bottom:16px">
          <h3 class="section-title">Bekleyen Dogrulamalar (${pending.length})</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Kullanici ID</th>
                <th>Tip</th>
                <th>Deneme</th>
                <th>Bitis</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              ${pending.map(p => `
                <tr>
                  <td class="mono">${p.user_id}</td>
                  <td>${p.code === 'button' ? 'Buton' : 'Metin'}</td>
                  <td>${p.attempts || 0}/${p.max_attempts || 3}</td>
                  <td>${new Date(p.expires_at).toLocaleTimeString('tr-TR')}</td>
                  <td>
                    <button class="btn btn-sm btn-success" onclick="manualVerify('${p.user_id}')">Dogrula</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Tehlikeli Bolge -->
      <div class="danger-zone">
        <h3 class="section-title" style="color:var(--danger)">Tehlikeli Bolge</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
          Captcha'yi kapatir, tum kanal izinlerini sifirlar ve dogrulanmamis uyeleri dogrular.
        </p>
        <button class="btn btn-danger" onclick="captchaDisable()">
          Captcha Kapat ve Izinleri Sifirla
        </button>
      </div>
    </div>
  `;
}

async function captchaAutoSetup() {
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) return;

  if (!confirm('Otomatik kurulum tum kanallarin izinlerini degistirecektir.\n\n- "Dogrulanmamis" rolu olusturulacak\n- "Dogrulanmis" rolu olusturulacak\n- "dogrulama" kanali olusturulacak\n- Tum kanallardan @everyone erisimi kapatilacak\n- Sadece Dogrulanmis rolu kanallari gorebilecek\n\nDevam etmek istiyor musunuz?')) return;

  const type = document.getElementById('captcha-auto-type')?.value || 'button';

  showToast('Otomatik kurulum baslatildi...', 'info');

  try {
    const res = await API.post(`/api/plugins/captcha/auto-setup/${guildId}`, { type });
    if (res.success) {
      showToast('Otomatik kurulum tamamlandi! Captcha aktif.', 'success');
      await renderCaptchaConfig();
    } else {
      showToast('Hata: ' + (res.error || 'Bilinmeyen'), 'error');
    }
  } catch (err) {
    showToast('Kurulum hatasi: ' + err.message, 'error');
  }
}

async function saveCaptchaSettings() {
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) return;

  const data = {
    enabled: document.getElementById('captcha-enabled').checked,
    type: document.getElementById('captcha-type').value,
    verified_role_id: document.getElementById('captcha-verified-role').value || null,
    unverified_role_id: document.getElementById('captcha-unverified-role').value || null,
    verification_channel_id: document.getElementById('captcha-channel').value || null,
    log_channel_id: document.getElementById('captcha-log-channel').value || null,
    timeout_minutes: parseInt(document.getElementById('captcha-timeout').value) || 5,
    kick_on_timeout: document.getElementById('captcha-kick').checked,
    welcome_message: document.getElementById('captcha-welcome-msg').value,
    success_message: document.getElementById('captcha-success-msg').value,
    fail_message: document.getElementById('captcha-fail-msg').value
  };

  try {
    await API.put(`/api/plugins/captcha/settings/${guildId}`, data);
    showToast('Captcha ayarlari kaydedildi', 'success');
  } catch (err) {
    showToast('Kaydetme hatasi: ' + err.message, 'error');
  }
}

async function manualVerify(userId) {
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) return;

  try {
    await API.delete(`/api/plugins/captcha/pending/${guildId}/${userId}`);
    showToast('Uye dogrulandi', 'success');
    await renderCaptchaConfig();
  } catch (err) {
    showToast('Hata: ' + err.message, 'error');
  }
}

async function captchaDisable() {
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) return;

  if (!confirm('Captcha kapatilacak:\n\n- Tum kanal izinleri sifirlanacak\n- Dogrulanmamis uyeler otomatik dogrulanacak\n- Bekleyen dogrulamalar silinecek\n\nDevam?')) return;

  try {
    await API.post(`/api/plugins/captcha/disable/${guildId}`);
    showToast('Captcha kapatildi, izinler sifirlandi', 'success');
    await renderCaptchaConfig();
  } catch (err) {
    showToast('Hata: ' + err.message, 'error');
  }
}
