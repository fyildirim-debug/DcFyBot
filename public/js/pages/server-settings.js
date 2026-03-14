async function renderServerSettings() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/server-settings');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const g = await API.get(`/api/guilds/${guildId}/details`);

    const verLevels = { 0: 'Yok', 1: 'Dusuk', 2: 'Orta', 3: 'Yuksek', 4: 'Cok Yuksek' };
    const boostTiers = { 0: '-', 1: 'Seviye 1', 2: 'Seviye 2', 3: 'Seviye 3' };

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Sunucu Ayarlari</h1>
          <p class="page-subtitle">${g.name}</p>
        </div>
      </div>

      <div class="settings-layout">
        <div>
          <!-- Sunucu Bilgileri -->
          <div class="section-title">Sunucu Bilgileri</div>
          <div class="card">
            <div style="display:flex;gap:16px;align-items:center;margin-bottom:16px">
              ${g.icon
                ? `<img src="${g.icon}" style="width:64px;height:64px;border-radius:var(--radius);border:2px solid var(--border)" />`
                : `<div style="width:64px;height:64px;border-radius:var(--radius);background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff">${g.name.charAt(0)}</div>`
              }
              <div>
                <div style="font-size:18px;font-weight:700;color:var(--text-heading)">${g.name}</div>
                <div class="mono" style="font-size:11px;color:var(--text-muted)">${g.id}</div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Sunucu Adi</label>
              <input class="form-input" id="serverName" value="${g.name}" />
            </div>
            <div class="form-group">
              <label class="form-label">Aciklama</label>
              <textarea class="form-textarea" id="serverDesc" rows="2" placeholder="Sunucu aciklamasi...">${g.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Dogrulama Seviyesi</label>
              <select class="form-select" id="serverVerification">
                ${[0,1,2,3,4].map(v => `<option value="${v}" ${g.verificationLevel===v?'selected':''}>${verLevels[v]}</option>`).join('')}
              </select>
              <p class="form-hint">Yeni uyelerin mesaj gonderebilmesi icin gereken dogrulama</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="saveServerSettings()">${svgIcon('check')} Kaydet</button>
            <div id="serverMsg" style="margin-top:8px"></div>
          </div>

          <!-- Davet Linkleri -->
          <div class="section-title">Davet Linkleri</div>
          <div class="card">
            <div class="btn-group" style="margin-bottom:12px">
              <button class="btn btn-primary btn-sm" onclick="createServerInvite()">Yeni Davet Olustur</button>
            </div>
            ${g.invites.length === 0
              ? '<div style="color:var(--text-muted);font-size:13px">Aktif davet linki yok</div>'
              : `<div class="table-wrap"><table>
                <thead><tr><th>Link</th><th>Kullanan</th><th>Olusturan</th><th style="text-align:right">Islem</th></tr></thead>
                <tbody>
                  ${g.invites.map(i => `<tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px">
                        <span class="mono" style="font-size:12px;color:var(--accent)">${i.url}</span>
                        <button class="btn btn-ghost btn-xs" onclick="navigator.clipboard.writeText('${i.url}');showToast('Kopyalandi')" title="Kopyala">&#x1F4CB;</button>
                      </div>
                    </td>
                    <td class="mono" style="font-size:12px">${i.uses}${i.maxUses ? '/'+i.maxUses : ''}</td>
                    <td style="font-size:12px;color:var(--text-muted)">${i.inviter}</td>
                    <td style="text-align:right">
                      <button class="btn btn-danger btn-xs" onclick="deleteServerInvite('${i.code}')">Sil</button>
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table></div>`
            }
          </div>

          <!-- Bot Bilgisi -->
          <div class="section-title">Bot Bilgisi (Bu Sunucuda)</div>
          <div class="card">
            <div style="display:flex;gap:16px;align-items:center;margin-bottom:16px">
              ${g.bot.avatar
                ? `<img src="${g.bot.avatar}" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--accent)" />`
                : `<div style="width:48px;height:48px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">B</div>`
              }
              <div>
                <div style="font-size:15px;font-weight:600;color:var(--text-heading)">${g.bot.displayName || g.bot.username}</div>
                <div style="font-size:12px;color:var(--text-muted)">@${g.bot.username}</div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Bot Takma Adi (Bu Sunucuda)</label>
              <input class="form-input" id="botNickname" value="${g.bot.nickname || ''}" placeholder="${g.bot.username}" />
              <p class="form-hint">Bos birakirsaniz orijinal adi kullanilir</p>
            </div>
            <div class="info-row">
              <span class="info-label">Katilma Tarihi</span>
              <span class="info-value mono" style="font-size:12px">${g.bot.joinedAt ? new Date(g.bot.joinedAt).toLocaleDateString('tr-TR') : '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Roller</span>
              <span class="info-value">${g.bot.roles.map(r => `<span class="badge badge-neutral" style="font-size:10px"><span class="role-dot" style="background:${r.color}"></span>${r.name}</span>`).join(' ') || '-'}</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="saveBotNickname()" style="margin-top:12px">${svgIcon('check')} Kaydet</button>
            <div id="botNickMsg" style="margin-top:8px"></div>
          </div>
        </div>

          <!-- Yasakli Kelimeler -->
          <div class="section-title">Yasakli Kelimeler</div>
          <div class="card">
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Mesajlarda tespit edilen yasakli kelimelere otomatik islem uygulanir. Yoneticiler filtreden muaftir.</p>

            <!-- Ekleme Formu -->
            <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:14px">
              <div class="form-grid">
                <div class="form-group" style="margin-bottom:8px">
                  <label class="form-label">Kelime / Ifade</label>
                  <input class="form-input" id="wfWord" placeholder="yasakli kelime..." />
                </div>
                <div class="form-group" style="margin-bottom:8px">
                  <label class="form-label">Eslesme Tipi</label>
                  <select class="form-select" id="wfMatchType">
                    <option value="contains">Iceriyor</option>
                    <option value="word">Tam Kelime</option>
                    <option value="exact">Tam Eslesme</option>
                    <option value="startswith">Ile Basliyor</option>
                    <option value="endswith">Ile Bitiyor</option>
                    <option value="regex">Regex</option>
                  </select>
                </div>
              </div>
              <div class="form-grid">
                <div class="form-group" style="margin-bottom:8px">
                  <label class="form-label">Islem</label>
                  <select class="form-select" id="wfAction" onchange="onWfActionChange()">
                    <option value="delete">Mesaji Sil</option>
                    <option value="censor">Sansurle (****)</option>
                    <option value="warn">Uyar (silme)</option>
                    <option value="timeout">Sustur + Sil</option>
                    <option value="kick">At + Sil</option>
                    <option value="ban">Yasakla + Sil</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:8px" id="wfDurationGroup" style="display:none">
                  <label class="form-label">Susturma Suresi (dk)</label>
                  <input class="form-input mono" type="number" id="wfDuration" value="5" min="1" max="40320" />
                </div>
              </div>
              <div class="form-group" style="margin-bottom:8px">
                <label class="form-label">Uyari Mesaji (kullaniciya gosterilir)</label>
                <input class="form-input" id="wfWarnMsg" placeholder="Bu kelimeyi kullanamazsiniz..." />
              </div>
              <button class="btn btn-primary btn-sm" onclick="addWordFilter()">Ekle</button>
            </div>

            <!-- Liste -->
            <div id="wordFilterList"><div class="spinner"></div></div>
          </div>

        <!-- Sag: Sunucu Detaylari -->
        <div class="guide-panel">
          <div class="guide-panel-title">
            ${svgIcon('server')}
            Sunucu Detaylari
          </div>

          <div class="info-row">
            <span class="info-label">Uye</span>
            <span class="info-value mono">${g.memberCount}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kanal</span>
            <span class="info-value mono">${g.channelCount}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Rol</span>
            <span class="info-value mono">${g.roleCount}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Emoji</span>
            <span class="info-value mono">${g.emojiCount}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Boost</span>
            <span class="info-value">${g.boostCount} <span style="color:var(--text-muted);font-size:11px">(${boostTiers[g.boostTier]})</span></span>
          </div>
          <div class="info-row">
            <span class="info-label">Dogrulama</span>
            <span class="info-value">${verLevels[g.verificationLevel]}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Sahip</span>
            <span class="info-value" style="font-size:12px">${g.ownerName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Olusturulma</span>
            <span class="info-value mono" style="font-size:11px">${new Date(g.createdAt).toLocaleDateString('tr-TR')}</span>
          </div>

          ${g.features.length > 0 ? `
          <div style="margin-top:16px">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Ozellikler</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${g.features.map(f => `<span class="badge badge-neutral" style="font-size:9px">${f.replace(/_/g,' ')}</span>`).join('')}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    // Yasakli kelimeleri yukle
    loadWordFilters();
    onWfActionChange();
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function saveServerSettings() {
  const guildId = localStorage.getItem('selectedGuild');
  try {
    const res = await API.put(`/api/guilds/${guildId}/settings`, {
      name: document.getElementById('serverName').value,
      description: document.getElementById('serverDesc').value,
      verificationLevel: parseInt(document.getElementById('serverVerification').value)
    });
    if (res.warning) {
      document.getElementById('serverMsg').innerHTML = `<div class="alert alert-warning">${res.warning}</div>`;
    } else {
      showToast('Sunucu ayarlari kaydedildi');
    }
    // Sidebar sunucu listesini guncelle
    App.loadGuilds();
  } catch(e) { showToast(e.message, 'error'); }
}

async function saveBotNickname() {
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.put(`/api/guilds/${guildId}/settings`, {
      botNickname: document.getElementById('botNickname').value
    });
    showToast('Bot takma adi guncellendi');
  } catch(e) { showToast(e.message, 'error'); }
}

async function createServerInvite() {
  const guildId = localStorage.getItem('selectedGuild');
  try {
    const res = await API.post(`/api/guilds/${guildId}/invite/create`, {});
    showToast('Davet olusturuldu: ' + res.url);
    renderServerSettings();
  } catch(e) { showToast(e.message, 'error'); }
}

// ===== YASAKLI KELIMELER =====
const ACTION_LABELS = {
  delete: 'Sil', censor: 'Sansurle', warn: 'Uyar',
  timeout: 'Sustur', kick: 'At', ban: 'Yasakla'
};
const ACTION_COLORS = {
  delete: 'danger', censor: 'warning', warn: 'info',
  timeout: 'danger', kick: 'danger', ban: 'danger'
};
const MATCH_LABELS = {
  contains: 'Iceriyor', word: 'Tam Kelime', exact: 'Tam Eslesme',
  startswith: 'Basliyor', endswith: 'Bitiyor', regex: 'Regex'
};

function onWfActionChange() {
  const action = document.getElementById('wfAction')?.value;
  const durGroup = document.getElementById('wfDurationGroup');
  if (durGroup) durGroup.style.display = action === 'timeout' ? 'block' : 'none';
}

async function loadWordFilters() {
  const guildId = localStorage.getItem('selectedGuild');
  const container = document.getElementById('wordFilterList');
  if (!container || !guildId) return;

  try {
    const filters = await API.get(`/api/wordfilter/${guildId}`);
    if (!filters.length) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">Henuz yasakli kelime eklenmedi</div>';
      return;
    }

    container.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Kelime</th><th>Eslesme</th><th>Islem</th><th>Durum</th><th style="text-align:right">Islemler</th></tr></thead>
      <tbody>
        ${filters.map(f => `<tr${!f.enabled?' style="opacity:0.5"':''}>
          <td><strong class="mono">${f.word}</strong></td>
          <td><span class="badge badge-neutral" style="font-size:10px">${MATCH_LABELS[f.match_type] || f.match_type}</span></td>
          <td>
            <span class="badge badge-${ACTION_COLORS[f.action]}" style="font-size:10px">${ACTION_LABELS[f.action] || f.action}</span>
            ${f.action === 'timeout' && f.action_duration ? `<span class="mono" style="font-size:10px;color:var(--text-muted)"> ${f.action_duration}dk</span>` : ''}
          </td>
          <td>
            <button class="toggle ${f.enabled?'active':''}" onclick="toggleWordFilter(${f.id},${!f.enabled})" style="transform:scale(0.8)"></button>
          </td>
          <td style="text-align:right">
            <button class="btn btn-danger btn-xs" onclick="deleteWordFilter(${f.id})">Sil</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function addWordFilter() {
  const guildId = localStorage.getItem('selectedGuild');
  const word = document.getElementById('wfWord')?.value?.trim();
  if (!word) { showToast('Kelime bos olamaz', 'error'); return; }

  try {
    await API.post(`/api/wordfilter/${guildId}`, {
      word,
      match_type: document.getElementById('wfMatchType').value,
      action: document.getElementById('wfAction').value,
      action_duration: parseInt(document.getElementById('wfDuration')?.value) || 5,
      warn_message: document.getElementById('wfWarnMsg')?.value || ''
    });
    document.getElementById('wfWord').value = '';
    document.getElementById('wfWarnMsg').value = '';
    showToast('Yasakli kelime eklendi');
    loadWordFilters();
  } catch(e) { showToast(e.message, 'error'); }
}

async function toggleWordFilter(id, enabled) {
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.put(`/api/wordfilter/${guildId}/${id}`, { enabled });
    loadWordFilters();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteWordFilter(id) {
  if (!confirm('Bu yasakli kelimeyi silmek istediginize emin misiniz?')) return;
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.del(`/api/wordfilter/${guildId}/${id}`);
    showToast('Yasakli kelime silindi');
    loadWordFilters();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteServerInvite(code) {
  if (!confirm('Bu davet linkini silmek istediginize emin misiniz?')) return;
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.del(`/api/guilds/${guildId}/invite/${code}`);
    showToast('Davet silindi');
    renderServerSettings();
  } catch(e) { showToast(e.message, 'error'); }
}
