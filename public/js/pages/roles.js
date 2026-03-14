// Discord izin tanimlari - kategorili
const PERM_CATEGORIES = {
  'Genel Sunucu Izinleri': [
    { key: 'Administrator', label: 'Yonetici', desc: 'Tum izinlere sahip olur, kanal izinlerini gecersiz kilar', danger: true },
    { key: 'ViewAuditLog', label: 'Denetim Logunu Gor', desc: 'Sunucu denetim logunu goruntuler' },
    { key: 'ViewGuildInsights', label: 'Sunucu Istatistikleri', desc: 'Sunucu istatistiklerini goruntuler' },
    { key: 'ManageGuild', label: 'Sunucuyu Yonet', desc: 'Sunucu ayarlarini degistirebilir' },
    { key: 'ManageRoles', label: 'Rolleri Yonet', desc: 'Rolleri olusturabilir, duzenleyebilir, silebilir' },
    { key: 'ManageChannels', label: 'Kanallari Yonet', desc: 'Kanal olusturabilir, duzenleyebilir, silebilir' },
    { key: 'ManageWebhooks', label: 'Webhooklari Yonet', desc: 'Webhook olusturabilir, duzenleyebilir, silebilir' },
    { key: 'ManageEmojisAndStickers', label: 'Emoji ve Cikartma Yonet', desc: 'Ozel emoji ve cikartma ekler/siler' },
    { key: 'ManageGuildExpressions', label: 'Ifadeleri Yonet', desc: 'Sunucu ifadelerini yonetir' },
    { key: 'ViewChannel', label: 'Kanallari Gor', desc: 'Kanallari ve mesajlari goruntuler' },
    { key: 'CreateInstantInvite', label: 'Davet Olustur', desc: 'Sunucuya davet baglantisi olusturur' }
  ],
  'Uye Izinleri': [
    { key: 'KickMembers', label: 'Uyeleri At', desc: 'Uyeleri sunucudan atar', danger: true },
    { key: 'BanMembers', label: 'Uyeleri Yasakla', desc: 'Uyeleri kalici olarak yasaklar', danger: true },
    { key: 'ModerateMembers', label: 'Uyeleri Yonet (Timeout)', desc: 'Uyeleri susturabilir (timeout)' },
    { key: 'ChangeNickname', label: 'Takma Ad Degistir', desc: 'Kendi takma adini degistirebilir' },
    { key: 'ManageNicknames', label: 'Takma Adlari Yonet', desc: 'Diger uyelerin takma adlarini degistirir' },
    { key: 'MentionEveryone', label: 'Herkesi Etiketle', desc: '@everyone ve @here kullanabilir' }
  ],
  'Metin Kanali Izinleri': [
    { key: 'SendMessages', label: 'Mesaj Gonder', desc: 'Metin kanallarinda mesaj gonderir' },
    { key: 'SendMessagesInThreads', label: 'Konu Basliklarinda Mesaj', desc: 'Konu basliklarinda mesaj gonderir' },
    { key: 'CreatePublicThreads', label: 'Herkese Acik Konu Olustur', desc: 'Herkese acik konu basliklari olusturur' },
    { key: 'CreatePrivateThreads', label: 'Ozel Konu Olustur', desc: 'Ozel konu basliklari olusturur' },
    { key: 'EmbedLinks', label: 'Baglanti Yerlestir', desc: 'Zengin icerikleri embed olarak gosterir' },
    { key: 'AttachFiles', label: 'Dosya Ekle', desc: 'Mesajlara dosya ekleyebilir' },
    { key: 'AddReactions', label: 'Tepki Ekle', desc: 'Mesajlara emoji tepkisi ekler' },
    { key: 'UseExternalEmojis', label: 'Dis Emoji Kullan', desc: 'Diger sunuculardaki emojileri kullanir' },
    { key: 'UseExternalStickers', label: 'Dis Cikartma Kullan', desc: 'Diger sunuculardaki cikartmalari kullanir' },
    { key: 'ReadMessageHistory', label: 'Mesaj Gecmisini Oku', desc: 'Eski mesajlari goruntuler' },
    { key: 'ManageMessages', label: 'Mesajlari Yonet', desc: 'Baskalarinin mesajlarini silebilir, sabitleyebilir' },
    { key: 'ManageThreads', label: 'Konulari Yonet', desc: 'Konu basliklarini duzenler, siler, arsivler' },
    { key: 'UseApplicationCommands', label: 'Uygulama Komutlari', desc: 'Slash komutlarini kullanabilir' },
    { key: 'SendTTSMessages', label: 'TTS Mesaj Gonder', desc: 'Sesli okunan mesaj gonderir' },
    { key: 'SendVoiceMessages', label: 'Sesli Mesaj Gonder', desc: 'Sesli mesaj gonderir' }
  ],
  'Ses Kanali Izinleri': [
    { key: 'Connect', label: 'Baglan', desc: 'Ses kanalina baglanabilir' },
    { key: 'Speak', label: 'Konus', desc: 'Ses kanalinda konusabilir' },
    { key: 'Stream', label: 'Ekran Paylas', desc: 'Ses kanalinda ekran paylasir' },
    { key: 'UseVAD', label: 'Ses Algilama', desc: 'Ses etkinligi algilama kullanir (bas-konus yerine)' },
    { key: 'PrioritySpeaker', label: 'Oncelikli Konusma', desc: 'Diger uyelerin sesi kisitlanir' },
    { key: 'MuteMembers', label: 'Uyeleri Sustur', desc: 'Ses kanalinda uyeleri susturur' },
    { key: 'DeafenMembers', label: 'Uyeleri Sagir Et', desc: 'Uyelerin ses duymasini engeller' },
    { key: 'MoveMembers', label: 'Uyeleri Tasi', desc: 'Uyeleri baska ses kanalina tasir' },
    { key: 'UseEmbeddedActivities', label: 'Etkinlik Kullan', desc: 'Ses kanalinda etkinlik baslatir' },
    { key: 'UseSoundboard', label: 'Ses Tahtasi', desc: 'Ses tahtasini kullanabilir' }
  ]
};

async function renderRoles() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/roles');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const roles = await API.get(`/api/roles/${guildId}`);
    const filtered = roles.filter(r => r.name !== '@everyone');

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('roles.title')}</h1>
          <p class="page-subtitle">${filtered.length} rol</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="showCreateRole()">${svgIcon('shield')} ${I18n.t('roles.create')}</button>
          <button class="btn btn-secondary btn-sm" onclick="showAIRoleCreate()">${svgIcon('cpu')} AI ile Olustur</button>
          <button class="btn btn-secondary btn-sm" onclick="backupRoles()">${svgIcon('archive')} ${I18n.t('roles.backupRoles')}</button>
        </div>
      </div>

      <div id="roleMsg"></div>

      <!-- Olustur -->
      <div id="createRoleForm" style="display:none" class="card" style="padding:0">
        <div style="padding:20px;border-bottom:1px solid var(--border)">
          <div class="card-title">${I18n.t('roles.create')}</div>
        </div>

        <div style="display:flex;border-bottom:1px solid var(--border)">
          <button class="btn btn-ghost" id="createTabGeneral" onclick="switchCreateRoleTab('general')" style="border-radius:0;border-bottom:2px solid var(--accent);flex:1">Genel</button>
          <button class="btn btn-ghost" id="createTabPerms" onclick="switchCreateRoleTab('perms')" style="border-radius:0;flex:1;color:var(--text-muted)">Izinler</button>
        </div>

        <div id="createRoleTabGeneral" style="padding:20px">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">${I18n.t('roles.name')}</label>
              <input class="form-input" id="newRoleName" placeholder="Moderator" />
            </div>
            <div class="form-group">
              <label class="form-label">${I18n.t('roles.color')}</label>
              <input class="form-input" type="color" id="newRoleColor" value="#5865f2" style="height:40px;padding:4px" />
            </div>
          </div>
          <div class="form-row" style="margin:12px 0">
            <div>
              <span style="font-size:13px;font-weight:500">${I18n.t('roles.hoisted')}</span>
              <p style="font-size:11px;color:var(--text-muted)">Uye listesinde ayri gosterilir</p>
            </div>
            <button class="toggle" id="newRoleHoist" onclick="this.classList.toggle('active')"></button>
          </div>
          <div class="form-row" style="margin-bottom:14px">
            <div>
              <span style="font-size:13px;font-weight:500">${I18n.t('roles.mentionable')}</span>
              <p style="font-size:11px;color:var(--text-muted)">Herkes bu rolu etiketleyebilir</p>
            </div>
            <button class="toggle" id="newRoleMention" onclick="this.classList.toggle('active')"></button>
          </div>
        </div>

        <div id="createRoleTabPerms" style="display:none;padding:20px;max-height:500px;overflow-y:auto">
          ${renderPermCategories('new_')}
        </div>

        <div style="padding:16px 20px;border-top:1px solid var(--border)">
          <div class="btn-group">
            <button class="btn btn-primary btn-sm" onclick="createRole()">${I18n.t('common.create')}</button>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('createRoleForm').style.display='none'">${I18n.t('common.cancel')}</button>
          </div>
        </div>
      </div>

      <!-- Duzenle -->
      <div id="editRoleForm" style="display:none" class="card" style="padding:0">
        <div style="padding:20px;border-bottom:1px solid var(--border)">
          <div class="card-title">${I18n.t('common.edit')} - <span id="editRoleCurrentName"></span></div>
        </div>
        <input type="hidden" id="editRoleId" />
        <input type="hidden" id="editRolePermsOriginal" />

        <!-- Tab: Genel / Izinler -->
        <div style="display:flex;border-bottom:1px solid var(--border)">
          <button class="btn btn-ghost" id="tabGeneral" onclick="switchRoleTab('general')" style="border-radius:0;border-bottom:2px solid var(--accent);flex:1">Genel</button>
          <button class="btn btn-ghost" id="tabPerms" onclick="switchRoleTab('perms')" style="border-radius:0;flex:1;color:var(--text-muted)">Izinler</button>
        </div>

        <!-- Genel Tab -->
        <div id="roleTabGeneral" style="padding:20px">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">${I18n.t('roles.name')}</label>
              <input class="form-input" id="editRoleName" />
            </div>
            <div class="form-group">
              <label class="form-label">${I18n.t('roles.color')}</label>
              <input class="form-input" type="color" id="editRoleColor" style="height:40px;padding:4px" />
            </div>
          </div>
          <div class="form-row" style="margin:12px 0">
            <div>
              <span style="font-size:13px;font-weight:500">${I18n.t('roles.hoisted')}</span>
              <p style="font-size:11px;color:var(--text-muted)">Uye listesinde ayri gosterilir</p>
            </div>
            <button class="toggle" id="editRoleHoist" onclick="this.classList.toggle('active')"></button>
          </div>
          <div class="form-row" style="margin-bottom:14px">
            <div>
              <span style="font-size:13px;font-weight:500">${I18n.t('roles.mentionable')}</span>
              <p style="font-size:11px;color:var(--text-muted)">Herkes bu rolu etiketleyebilir</p>
            </div>
            <button class="toggle" id="editRoleMention" onclick="this.classList.toggle('active')"></button>
          </div>
        </div>

        <!-- Izinler Tab -->
        <div id="roleTabPerms" style="display:none;padding:20px;max-height:500px;overflow-y:auto">
          ${renderPermCategories()}
        </div>

        <div style="padding:16px 20px;border-top:1px solid var(--border)">
          <div class="btn-group">
            <button class="btn btn-primary btn-sm" onclick="saveEditRole()">${I18n.t('common.save')}</button>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('editRoleForm').style.display='none'">${I18n.t('common.cancel')}</button>
          </div>
        </div>
      </div>

      <!-- AI ile Olustur -->
      <div id="aiRoleForm" style="display:none" class="card">
        <div class="card-title" style="margin-bottom:14px">${svgIcon('cpu')} AI ile Rol Olustur</div>
        <div class="form-group">
          <label class="form-label">Ne tur roller istiyorsunuz?</label>
          <textarea class="form-textarea" id="aiRolePrompt" rows="3" placeholder="Ornek: Bir topluluk sunucusu icin roller olustur. Kurucu, yonetici, moderator, VIP uye ve normal uye rolleri olsun. Her birinin yetkileri uygun sekilde ayarlansin."></textarea>
          <p class="form-hint">Rollerin yetkilerini, renklerini ve hiyerarsisini detayli anlatabilirsiniz.</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" id="aiRoleBtn" onclick="aiCreateRoles()">${svgIcon('cpu')} Olustur</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('aiRoleForm').style.display='none'">${I18n.t('common.cancel')}</button>
        </div>
        <div id="aiRoleResult" style="margin-top:12px"></div>
      </div>

      <!-- Tablo -->
      <div class="card card-flush">
        <div class="table-wrap" style="max-height:600px;overflow-y:auto">
          <table>
            <thead><tr>
              <th>${I18n.t('roles.name')}</th>
              <th>${I18n.t('roles.color')}</th>
              <th>${I18n.t('roles.memberCount')}</th>
              <th>${I18n.t('roles.position')}</th>
              <th style="text-align:right">${I18n.t('common.actions')}</th>
            </tr></thead>
            <tbody>
              ${filtered.map(r => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <span class="role-dot" style="background:${r.color}"></span>
                      <strong>${r.name}</strong>
                      ${r.managed ? '<span class="badge badge-neutral" style="font-size:9px">BOT</span>' : ''}
                      ${r.hoisted ? '<span class="badge badge-info" style="font-size:9px">AYRI</span>' : ''}
                      ${r.permissions?.includes('Administrator') ? '<span class="badge badge-danger" style="font-size:9px">ADMIN</span>' : ''}
                    </div>
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:6px">
                      <span style="width:16px;height:16px;border-radius:3px;background:${r.color};display:inline-block"></span>
                      <span class="mono" style="font-size:12px;color:var(--text-muted)">${r.color}</span>
                    </div>
                  </td>
                  <td class="mono">${r.memberCount}</td>
                  <td class="mono" style="color:var(--text-muted)">${r.position}</td>
                  <td style="text-align:right">
                    ${r.managed
                      ? '<span style="color:var(--text-muted);font-size:12px">-</span>'
                      : `<div class="btn-group" style="justify-content:flex-end">
                          <button class="btn btn-secondary btn-xs" onclick="editRole('${r.id}','${r.name.replace(/'/g,"\\'")}','${r.color}',${r.hoisted},${r.mentionable},${JSON.stringify(r.permissions||[]).replace(/"/g,'&quot;')})">${I18n.t('common.edit')}</button>
                          <button class="btn btn-danger btn-xs" onclick="deleteRole('${r.id}')">${I18n.t('common.delete')}</button>
                        </div>`
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function renderPermCategories(prefix = '') {
  let html = '';
  for (const [category, perms] of Object.entries(PERM_CATEGORIES)) {
    html += `<div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">${category}</div>`;
    for (const p of perms) {
      html += `
      <div class="perm-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;color:${p.danger ? 'var(--danger)' : 'var(--text-primary)'}">${p.label}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:1px">${p.desc}</div>
        </div>
        <button class="toggle" id="${prefix}perm_${p.key}" onclick="togglePerm(this,'${p.key}')" style="margin-left:12px"></button>
      </div>`;
    }
    html += '</div>';
  }
  return html;
}

function switchRoleTab(tab) {
  const general = document.getElementById('roleTabGeneral');
  const perms = document.getElementById('roleTabPerms');
  const tabGenBtn = document.getElementById('tabGeneral');
  const tabPermBtn = document.getElementById('tabPerms');

  if (tab === 'general') {
    general.style.display = 'block';
    perms.style.display = 'none';
    tabGenBtn.style.borderBottom = '2px solid var(--accent)';
    tabGenBtn.style.color = 'var(--text-primary)';
    tabPermBtn.style.borderBottom = '2px solid transparent';
    tabPermBtn.style.color = 'var(--text-muted)';
  } else {
    general.style.display = 'none';
    perms.style.display = 'block';
    tabPermBtn.style.borderBottom = '2px solid var(--accent)';
    tabPermBtn.style.color = 'var(--text-primary)';
    tabGenBtn.style.borderBottom = '2px solid transparent';
    tabGenBtn.style.color = 'var(--text-muted)';
  }
}

function togglePerm(btn, key) {
  btn.classList.toggle('active');
  // Admin tiklaninca uyari
  if (key === 'Administrator' && btn.classList.contains('active')) {
    if (!confirm('UYARI: Yonetici izni tum izinleri verir ve kanal izinlerini gecersiz kilar. Devam?')) {
      btn.classList.remove('active');
    }
  }
}

function switchCreateRoleTab(tab) {
  const general = document.getElementById('createRoleTabGeneral');
  const perms = document.getElementById('createRoleTabPerms');
  const tabGenBtn = document.getElementById('createTabGeneral');
  const tabPermBtn = document.getElementById('createTabPerms');

  if (tab === 'general') {
    general.style.display = 'block';
    perms.style.display = 'none';
    tabGenBtn.style.borderBottom = '2px solid var(--accent)';
    tabGenBtn.style.color = 'var(--text-primary)';
    tabPermBtn.style.borderBottom = '2px solid transparent';
    tabPermBtn.style.color = 'var(--text-muted)';
  } else {
    general.style.display = 'none';
    perms.style.display = 'block';
    tabPermBtn.style.borderBottom = '2px solid var(--accent)';
    tabPermBtn.style.color = 'var(--text-primary)';
    tabGenBtn.style.borderBottom = '2px solid transparent';
    tabGenBtn.style.color = 'var(--text-muted)';
  }
}

function showAIRoleCreate() {
  document.getElementById('createRoleForm').style.display = 'none';
  document.getElementById('editRoleForm').style.display = 'none';
  const el = document.getElementById('aiRoleForm');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  if (el.style.display === 'block') document.getElementById('aiRolePrompt').focus();
}

async function aiCreateRoles() {
  const prompt = document.getElementById('aiRolePrompt')?.value?.trim();
  if (!prompt) { showToast('Lutfen ne istediginizi yazin', 'error'); return; }

  const guildId = localStorage.getItem('selectedGuild');
  const btn = document.getElementById('aiRoleBtn');
  const result = document.getElementById('aiRoleResult');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;margin:0"></div> AI dusunuyor...';
  result.innerHTML = '';

  try {
    const res = await API.post(`/api/roles/${guildId}/ai-create`, { prompt }, { timeout: 600000 });
    if (res.success) {
      result.innerHTML = `<div class="alert alert-success">${res.created.length} rol olusturuldu: ${res.created.map(r => '<strong style="color:'+r.color+'">' + r.name + '</strong>').join(', ')}</div>`;
      showToast(`${res.created.length} rol AI ile olusturuldu`);
      setTimeout(renderRoles, 2000);
    } else {
      result.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
    }
  } catch(e) {
    result.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${svgIcon('cpu')} Olustur`;
  }
}

function showCreateRole() {
  document.getElementById('editRoleForm').style.display = 'none';
  document.getElementById('aiRoleForm').style.display = 'none';
  const el = document.getElementById('createRoleForm');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  if (el.style.display === 'block') switchCreateRoleTab('general');
}

function editRole(id, name, color, hoisted, mentionable, currentPerms) {
  document.getElementById('createRoleForm').style.display = 'none';
  document.getElementById('editRoleForm').style.display = 'block';
  document.getElementById('editRoleId').value = id;
  document.getElementById('editRoleCurrentName').textContent = name;
  document.getElementById('editRoleName').value = name;
  document.getElementById('editRoleColor').value = color === '#000000' ? '#5865f2' : color;

  const hoistToggle = document.getElementById('editRoleHoist');
  const mentionToggle = document.getElementById('editRoleMention');
  if (hoisted) hoistToggle.classList.add('active'); else hoistToggle.classList.remove('active');
  if (mentionable) mentionToggle.classList.add('active'); else mentionToggle.classList.remove('active');

  // Izinleri ayarla
  for (const [, perms] of Object.entries(PERM_CATEGORIES)) {
    for (const p of perms) {
      const toggle = document.getElementById(`perm_${p.key}`);
      if (toggle) {
        if (currentPerms.includes(p.key)) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }
      }
    }
  }

  switchRoleTab('general');
  document.getElementById('editRoleForm').scrollIntoView({ behavior: 'smooth' });
}

function getSelectedPerms(prefix = '') {
  const perms = [];
  for (const [, permList] of Object.entries(PERM_CATEGORIES)) {
    for (const p of permList) {
      const toggle = document.getElementById(`${prefix}perm_${p.key}`);
      if (toggle?.classList.contains('active')) {
        perms.push(p.key);
      }
    }
  }
  return perms;
}

async function saveEditRole() {
  const guildId = localStorage.getItem('selectedGuild');
  const roleId = document.getElementById('editRoleId').value;
  try {
    await API.put(`/api/roles/${guildId}/${roleId}`, {
      name: document.getElementById('editRoleName').value,
      color: document.getElementById('editRoleColor').value,
      hoist: document.getElementById('editRoleHoist').classList.contains('active'),
      mentionable: document.getElementById('editRoleMention').classList.contains('active'),
      permissions: getSelectedPerms()
    });
    showToast('Rol duzenlendi');
    renderRoles();
  } catch(e) { showToast(e.message, 'error'); }
}

async function createRole() {
  const guildId = localStorage.getItem('selectedGuild');
  const perms = getSelectedPerms('new_');
  try {
    await API.post(`/api/roles/${guildId}`, {
      name: document.getElementById('newRoleName').value,
      color: document.getElementById('newRoleColor').value,
      hoist: document.getElementById('newRoleHoist').classList.contains('active'),
      mentionable: document.getElementById('newRoleMention').classList.contains('active'),
      permissions: perms.length > 0 ? perms : undefined
    });
    showToast('Rol olusturuldu');
    renderRoles();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteRole(roleId) {
  if (!confirm(I18n.t('common.confirmDelete'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.del(`/api/roles/${guildId}/${roleId}`);
  showToast('Rol silindi');
  renderRoles();
}

async function backupRoles() {
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/roles`);
  showToast(`${I18n.t('backup.backupSuccess')} (${res.roleCount} rol)`);
}
