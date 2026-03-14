const WF_ACTION_LABELS = {
  delete: 'Mesaji Sil', warn: 'Uyar',
  timeout: 'Sustur + Sil', kick: 'At + Sil', ban: 'Yasakla + Sil'
};
const WF_ACTION_COLORS = {
  delete: 'danger', warn: 'info',
  timeout: 'danger', kick: 'danger', ban: 'danger'
};
const WF_MATCH_LABELS = {
  contains: 'Iceriyor', word: 'Tam Kelime', exact: 'Tam Eslesme',
  startswith: 'Ile Basliyor', endswith: 'Ile Bitiyor', regex: 'Regex'
};

async function renderWordFilter() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/word-filter');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const filters = await API.get(`/api/wordfilter/${guildId}`);
    const list = Array.isArray(filters) ? filters : [];

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Yasakli Kelimeler</h1>
          <p class="page-subtitle">${list.length} kural tanimli</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="toggleWfForm()">Yeni Ekle</button>
      </div>

      <div class="settings-layout">
        <div>
          <!-- Ekleme Formu -->
          <div id="wfAddForm" style="display:none" class="card">
            <div class="card-title" style="margin-bottom:14px">Yasakli Kelime Ekle</div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Kelime / Ifade</label>
                <input class="form-input" id="wfWord" placeholder="yasakli kelime..." />
              </div>
              <div class="form-group">
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
              <div class="form-group">
                <label class="form-label">Islem</label>
                <select class="form-select" id="wfAction" onchange="onWfActionChange2()">
                  <option value="delete">Mesaji Sil</option>
                  <option value="warn">Uyar (silmeden)</option>
                  <option value="timeout">Sustur + Sil</option>
                  <option value="kick">Sunucudan At + Sil</option>
                  <option value="ban">Kalici Yasakla + Sil</option>
                </select>
              </div>
              <div class="form-group" id="wfDurationGroup" style="display:none">
                <label class="form-label">Susturma Suresi (dk)</label>
                <input class="form-input mono" type="number" id="wfDuration" value="5" min="1" max="40320" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Uyari Mesaji</label>
              <input class="form-input" id="wfWarnMsg" placeholder="Bu kelimeyi kullanamazsiniz..." />
              <p class="form-hint">Kullaniciya DM ve kanal icinde gecici mesaj olarak gosterilir</p>
            </div>
            <div class="btn-group">
              <button class="btn btn-primary btn-sm" onclick="addWf()">Ekle</button>
              <button class="btn btn-secondary btn-sm" onclick="document.getElementById('wfAddForm').style.display='none'">Iptal</button>
            </div>
          </div>

          <!-- Liste -->
          <div class="card card-flush">
            ${list.length === 0
              ? '<div class="empty-state">Henuz yasakli kelime eklenmedi</div>'
              : `<div class="table-wrap"><table>
                <thead><tr>
                  <th>Kelime</th>
                  <th>Eslesme</th>
                  <th>Islem</th>
                  <th>Uyari</th>
                  <th>Durum</th>
                  <th style="text-align:right">Islemler</th>
                </tr></thead>
                <tbody>
                  ${list.map(f => `<tr${!f.enabled?' style="opacity:0.4"':''}>
                    <td><strong class="mono">${f.word}</strong></td>
                    <td><span class="badge badge-neutral" style="font-size:10px">${WF_MATCH_LABELS[f.match_type] || f.match_type}</span></td>
                    <td>
                      <span class="badge badge-${WF_ACTION_COLORS[f.action]}" style="font-size:10px">${WF_ACTION_LABELS[f.action] || f.action}</span>
                      ${f.action === 'timeout' && f.action_duration ? `<span class="mono" style="font-size:10px;color:var(--text-muted)"> ${f.action_duration}dk</span>` : ''}
                    </td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--text-muted)">${f.warn_message || '-'}</td>
                    <td>
                      <button class="toggle ${f.enabled?'active':''}" onclick="toggleWf(${f.id},${!f.enabled})" style="transform:scale(0.8)"></button>
                    </td>
                    <td style="text-align:right">
                      <button class="btn btn-danger btn-xs" onclick="deleteWf(${f.id})">Sil</button>
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table></div>`
            }
          </div>
        </div>

        <!-- Sag: Rehber -->
        <div class="guide-panel">
          <div class="guide-panel-title">${svgIcon('shield')} Nasil Calisir?</div>

          <div class="guide-step">
            <div class="guide-step-num">1</div>
            <div class="guide-step-title">Kelime Ekle</div>
            <div class="guide-step-desc">Yasaklamak istediginiz kelime veya ifadeyi girin.</div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">2</div>
            <div class="guide-step-title">Eslesme Tipi Sec</div>
            <div class="guide-step-desc"><strong>Iceriyor:</strong> mesajin herhangi yerinde<br><strong>Tam Kelime:</strong> bagimsiz kelime olarak<br><strong>Regex:</strong> duzensiz ifade</div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">3</div>
            <div class="guide-step-title">Islem Belirle</div>
            <div class="guide-step-desc"><strong>Sil:</strong> mesaj silinir + uyari<br><strong>Uyar:</strong> mesaj kalir, uyari verilir<br><strong>Sustur:</strong> mesaj silinir + kullanici susturulur<br><strong>At/Yasakla:</strong> mesaj silinir + agir islem</div>
          </div>

          <div class="guide-info-box">
            <div class="guide-info-box-title">${svgIcon('warning')} Bilgi</div>
            <div class="guide-info-item">Yoneticiler filtreden muaftir</div>
            <div class="guide-info-item">Her islemde kullaniciya DM gonderilir</div>
            <div class="guide-info-item">Uyarilar sadece kullaniciya gorunur (auto-delete)</div>
            <div class="guide-info-item">Filtre 60sn cache ile performanslidir</div>
          </div>
        </div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function toggleWfForm() {
  const el = document.getElementById('wfAddForm');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function onWfActionChange2() {
  const action = document.getElementById('wfAction')?.value;
  const g = document.getElementById('wfDurationGroup');
  if (g) g.style.display = action === 'timeout' ? 'block' : 'none';
}

async function addWf() {
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
    showToast('Yasakli kelime eklendi');
    renderWordFilter();
  } catch(e) { showToast(e.message, 'error'); }
}

async function toggleWf(id, enabled) {
  const guildId = localStorage.getItem('selectedGuild');
  await API.put(`/api/wordfilter/${guildId}/${id}`, { enabled });
  renderWordFilter();
}

async function deleteWf(id) {
  if (!confirm('Silmek istediginize emin misiniz?')) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.del(`/api/wordfilter/${guildId}/${id}`);
  showToast('Silindi');
  renderWordFilter();
}
