let _channelData = [];
let _dragState = { dragging: null, changed: false, newOrder: [] };

const DRAG_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`;

async function renderChannels() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/channels');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    _channelData = await API.get(`/api/channels/${guildId}`);
    const channels = _channelData;
    const types = { 0:'Metin', 2:'Ses', 4:'Kategori', 5:'Duyuru', 13:'Sahne', 15:'Forum' };
    const categories = channels.filter(c => c.type === 4);

    // Reset drag state
    _dragState = { dragging: null, changed: false, newOrder: [] };

    // Kanal listesi - kategorili agac yapisi
    let channelListHtml = '';
    for (const ch of channels) {
      const isCategory = ch.type === 4;
      const isChild = !isCategory && ch.parentId;
      const isVoice = [2, 13].includes(ch.type);
      const dragAttr = `draggable="true" data-ch-id="${ch.id}" data-ch-type="${ch.type}" data-ch-parent="${ch.parentId||''}"`;

      if (isCategory) {
        channelListHtml += `
          <tr class="channel-category" ${dragAttr} ondragstart="chDragStart(event)" ondragover="chDragOver(event)" ondragleave="chDragLeave(event)" ondrop="chDrop(event)" ondragend="chDragEnd(event)">
            <td style="padding:14px 16px 6px;border-bottom:none">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="drag-handle">${DRAG_ICON}</span>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:12px;height:12px;color:var(--text-muted)"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                <span style="color:var(--text-muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">${ch.name}</span>
                <span style="font-size:10px;color:var(--text-muted);opacity:0.6">(${channels.filter(c=>c.parentId===ch.id).length})</span>
              </div>
            </td>
            <td style="border-bottom:none"></td>
            <td style="border-bottom:none"></td>
            <td style="text-align:right;border-bottom:none;padding-top:14px">
              <div class="btn-group" style="justify-content:flex-end">
                <button class="btn btn-secondary btn-xs" onclick="editChannel('${ch.id}','${ch.name.replace(/'/g,"\\'")}','${ch.topic||''}','${ch.parentId||''}',${ch.nsfw||false})">${I18n.t('common.edit')}</button>
                <button class="btn btn-secondary btn-xs" onclick="showChannelPerms('${ch.id}','${ch.name.replace(/'/g,"\\'")}')">${I18n.t('channels.permissions') || 'Izinler'}</button>
                <button class="btn btn-danger btn-xs" onclick="deleteChannel('${ch.id}')">${I18n.t('common.delete')}</button>
              </div>
            </td>
          </tr>`;
      } else {
        const indent = isChild ? 'padding-left:36px' : '';
        const icon = isVoice
          ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" style="width:16px;height:16px;color:var(--text-muted);flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"/></svg>`
          : `<span style="color:var(--text-muted);font-size:16px;font-weight:400;width:16px;text-align:center;flex-shrink:0">#</span>`;

        channelListHtml += `
          <tr ${dragAttr} ondragstart="chDragStart(event)" ondragover="chDragOver(event)" ondragleave="chDragLeave(event)" ondrop="chDrop(event)" ondragend="chDragEnd(event)">
            <td style="${indent}">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="drag-handle">${DRAG_ICON}</span>
                ${icon}
                <strong style="font-size:13.5px">${ch.name}</strong>
                ${ch.nsfw ? '<span class="badge badge-danger" style="font-size:9px">NSFW</span>' : ''}
              </div>
              ${ch.topic ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;padding-left:${isChild?'36':'0'}px;margin-left:46px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px">${ch.topic}</div>` : ''}
            </td>
            <td><span class="badge badge-${isVoice?'success':'info'}" style="font-size:10px">${types[ch.type]||ch.type}</span></td>
            <td class="mono" style="color:var(--text-muted);font-size:12px">${ch.position}</td>
            <td style="text-align:right">
              <div class="btn-group" style="justify-content:flex-end">
                <button class="btn btn-secondary btn-xs" onclick="editChannel('${ch.id}','${ch.name.replace(/'/g,"\\'")}','${(ch.topic||'').replace(/'/g,"\\'")}','${ch.parentId||''}',${ch.nsfw||false})">${I18n.t('common.edit')}</button>
                <button class="btn btn-secondary btn-xs" onclick="showChannelPerms('${ch.id}','${ch.name.replace(/'/g,"\\'")}')">${I18n.t('channels.permissions') || 'Izinler'}</button>
                <button class="btn btn-danger btn-xs" onclick="deleteChannel('${ch.id}')">${I18n.t('common.delete')}</button>
              </div>
            </td>
          </tr>`;
      }
    }

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('channels.title')}</h1>
          <p class="page-subtitle">${channels.length} kanal, ${categories.length} kategori — surukle-birak ile sirala</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="showCreateChannel()">${svgIcon('hash')} ${I18n.t('channels.create')}</button>
          <button class="btn btn-secondary btn-sm" onclick="showAIChannelCreate()">${svgIcon('cpu')} AI ile Olustur</button>
        </div>
      </div>

      <!-- Siralama degisti bildirimi -->
      <div id="reorderBar" class="reorder-bar">
        <span class="info">Siralama degisti — kaydetmeyi unutmayin!</span>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="saveReorder()">Siralamayi Kaydet</button>
          <button class="btn btn-secondary btn-sm" onclick="renderChannels()">Iptal</button>
        </div>
      </div>

      <div id="channelMsg"></div>

      <!-- Olustur -->
      <div id="createChannelForm" style="display:none" class="card">
        <div class="card-title" style="margin-bottom:14px">${I18n.t('channels.create')}</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">${I18n.t('channels.name')}</label>
            <input class="form-input" id="newChName" placeholder="genel-sohbet" />
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('channels.type')}</label>
            <select class="form-select" id="newChType">
              <option value="text">${I18n.t('channels.text')}</option>
              <option value="voice">${I18n.t('channels.voice')}</option>
              <option value="category">${I18n.t('channels.category')}</option>
              <option value="announcement">${I18n.t('channels.announcement')}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('channels.category')}</label>
          <select class="form-select" id="newChParent">
            <option value="">Yok</option>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="btn-group" style="margin-top:14px">
          <button class="btn btn-primary btn-sm" onclick="createChannel()">${I18n.t('common.create')}</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('createChannelForm').style.display='none'">${I18n.t('common.cancel')}</button>
        </div>
      </div>

      <!-- Duzenle -->
      <div id="editChannelForm" style="display:none" class="card">
        <div class="card-title" style="margin-bottom:14px">${I18n.t('common.edit')} - <span id="editChCurrentName"></span></div>
        <input type="hidden" id="editChId" />
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">${I18n.t('channels.name')}</label>
            <input class="form-input" id="editChName" />
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('channels.category')}</label>
            <select class="form-select" id="editChParent">
              <option value="">Yok</option>
              ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Konu (Topic)</label>
          <input class="form-input" id="editChTopic" placeholder="Kanal konusu..." />
        </div>
        <div class="form-row" style="margin-bottom:14px">
          <span style="font-size:13px">NSFW</span>
          <button class="toggle" id="editChNsfw" onclick="this.classList.toggle('active')"></button>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="saveEditChannel()">${I18n.t('common.save')}</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('editChannelForm').style.display='none'">${I18n.t('common.cancel')}</button>
        </div>
      </div>

      <!-- AI ile Olustur -->
      <div id="aiChannelForm" style="display:none" class="card">
        <div class="card-title" style="margin-bottom:14px">${svgIcon('cpu')} AI ile Kanal Olustur</div>
        <div class="form-group">
          <label class="form-label">Nasil bir kanal istiyorsunuz?</label>
          <textarea class="form-textarea" id="aiChannelPrompt" rows="2" placeholder="Ornek: Moderatorlerin kullanacagi bir log kanali olustur, sadece yoneticiler gorebilsin."></textarea>
          <p class="form-hint">AI tek bir kanal olusturur. Toplu kanal icin "AI Sunucu Kur" kullanin.</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" id="aiChannelBtn" onclick="aiCreateChannels()">${svgIcon('cpu')} Olustur</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('aiChannelForm').style.display='none'">${I18n.t('common.cancel')}</button>
        </div>
        <div id="aiChannelResult" style="margin-top:12px"></div>
      </div>

      <!-- Kanal Izinleri -->
      <div id="channelPermsForm" style="display:none" class="card">
        <div class="card-title" style="margin-bottom:14px">${I18n.t('channels.permissions') || 'Izinler'} - <span id="permsChName"></span></div>
        <input type="hidden" id="permsChId" />

        <!-- Yeni izin ekle -->
        <div style="display:flex;gap:8px;margin-bottom:14px;align-items:end">
          <div class="form-group" style="flex:1;margin-bottom:0">
            <label class="form-label">Rol Ekle</label>
            <select class="form-select" id="permsAddRole"></select>
          </div>
          <button class="btn btn-primary btn-sm" onclick="addChannelPerm()">Ekle</button>
        </div>

        <!-- Mevcut izinler -->
        <div id="permsListContainer"><div class="spinner"></div></div>

        <div class="btn-group" style="margin-top:14px">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('channelPermsForm').style.display='none'">${I18n.t('common.close')}</button>
        </div>
      </div>

      <!-- Kanal Listesi -->
      <div class="card card-flush">
        <div class="table-wrap" style="max-height:650px;overflow-y:auto">
          <table>
            <thead><tr>
              <th>${I18n.t('channels.name')}</th>
              <th>${I18n.t('channels.type')}</th>
              <th>${I18n.t('channels.position')}</th>
              <th style="text-align:right">${I18n.t('common.actions')}</th>
            </tr></thead>
            <tbody id="channelTbody">
              ${channels.length === 0
                ? `<tr><td colspan="4"><div class="empty-state">${I18n.t('channels.noChannels')}</div></td></tr>`
                : channelListHtml
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="danger-zone">
        <div class="danger-zone-title">${svgIcon('warning')} Tehlikeli Bolge</div>
        <div class="danger-zone-item">
          <div class="desc">
            <strong>${I18n.t('channels.deleteAll')}</strong>
            Sunucudaki tum kanallar kalici olarak silinir. Bu islem geri alinamaz!
          </div>
          <button class="btn btn-danger btn-sm" onclick="deleteAllChannels()">${I18n.t('channels.deleteAll')}</button>
        </div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

// ===== DRAG & DROP =====
function chDragStart(e) {
  const row = e.target.closest('tr');
  if (!row) return;
  _dragState.dragging = row;
  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', row.dataset.chId);
}

function chDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const row = e.target.closest('tr');
  if (!row || row === _dragState.dragging) return;

  // Temizle
  document.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(r => {
    r.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  // Yukari/asagi gosterge
  const rect = row.getBoundingClientRect();
  const mid = rect.top + rect.height / 2;
  if (e.clientY < mid) {
    row.classList.add('drag-over-top');
  } else {
    row.classList.add('drag-over-bottom');
  }
}

function chDragLeave(e) {
  const row = e.target.closest('tr');
  if (row) {
    row.classList.remove('drag-over-top', 'drag-over-bottom');
  }
}

function chDrop(e) {
  e.preventDefault();
  const targetRow = e.target.closest('tr');
  if (!targetRow || !_dragState.dragging || targetRow === _dragState.dragging) return;

  const tbody = document.getElementById('channelTbody');
  const rect = targetRow.getBoundingClientRect();
  const mid = rect.top + rect.height / 2;

  if (e.clientY < mid) {
    tbody.insertBefore(_dragState.dragging, targetRow);
  } else {
    tbody.insertBefore(_dragState.dragging, targetRow.nextSibling);
  }

  // Temizle
  document.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(r => {
    r.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  // Degisim oldu
  _dragState.changed = true;
  document.getElementById('reorderBar').classList.add('visible');
}

function chDragEnd(e) {
  if (_dragState.dragging) {
    _dragState.dragging.classList.remove('dragging');
  }
  document.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(r => {
    r.classList.remove('drag-over-top', 'drag-over-bottom');
  });
  _dragState.dragging = null;
}

async function saveReorder() {
  const guildId = localStorage.getItem('selectedGuild');
  const tbody = document.getElementById('channelTbody');
  const rows = tbody.querySelectorAll('tr[data-ch-id]');

  // Yeni siralama hesapla
  const orders = [];
  let currentParent = null;
  let catPos = 0;
  let chPos = 0;

  rows.forEach(row => {
    const id = row.dataset.chId;
    const type = parseInt(row.dataset.chType);

    if (type === 4) {
      // Kategori
      currentParent = id;
      orders.push({ id, position: catPos++ });
      chPos = 0;
    } else {
      // Kanal - parent'i belirle: eger oncesinde kategori varsa onun altina
      const origParent = row.dataset.chParent;
      orders.push({
        id,
        position: chPos++,
        parent: currentParent || origParent || null
      });
    }
  });

  try {
    const btn = document.querySelector('#reorderBar .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Kaydediliyor...';

    await API.put(`/api/channels/${guildId}/reorder`, { orders });

    showToast('Siralama kaydedildi');
    _dragState.changed = false;
    document.getElementById('reorderBar').classList.remove('visible');

    // Sayfayi yenile (guncellenmis siralamayi goster)
    setTimeout(renderChannels, 500);
  } catch(e) {
    showToast('Siralama hatasi: ' + e.message, 'error');
    const btn = document.querySelector('#reorderBar .btn-primary');
    btn.disabled = false;
    btn.textContent = 'Siralamayi Kaydet';
  }
}

// ===== CRUD =====
function showCreateChannel() {
  document.getElementById('editChannelForm').style.display = 'none';
  document.getElementById('aiChannelForm').style.display = 'none';
  const el = document.getElementById('createChannelForm');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function showAIChannelCreate() {
  document.getElementById('createChannelForm').style.display = 'none';
  document.getElementById('editChannelForm').style.display = 'none';
  const el = document.getElementById('aiChannelForm');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  if (el.style.display === 'block') document.getElementById('aiChannelPrompt').focus();
}

async function aiCreateChannels() {
  const prompt = document.getElementById('aiChannelPrompt')?.value?.trim();
  if (!prompt) { showToast('Lutfen ne istediginizi yazin', 'error'); return; }

  const guildId = localStorage.getItem('selectedGuild');
  const btn = document.getElementById('aiChannelBtn');
  const result = document.getElementById('aiChannelResult');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;margin:0"></div> AI dusunuyor...';
  result.innerHTML = '';

  try {
    const res = await API.post(`/api/channels/${guildId}/ai-create`, { prompt }, { timeout: 600000 });
    if (res.success) {
      result.innerHTML = `<div class="alert alert-success">${res.created.length} kanal olusturuldu: ${res.created.map(c => '<strong>' + c.name + '</strong>').join(', ')}</div>`;
      showToast(`${res.created.length} kanal AI ile olusturuldu`);
      setTimeout(renderChannels, 2000);
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

// ===== KANAL IZINLERI =====
const CH_PERMS = [
  { key: 'ViewChannel', label: 'Kanali Gor' },
  { key: 'SendMessages', label: 'Mesaj Gonder' },
  { key: 'ReadMessageHistory', label: 'Gecmisi Oku' },
  { key: 'AddReactions', label: 'Tepki Ekle' },
  { key: 'AttachFiles', label: 'Dosya Ekle' },
  { key: 'EmbedLinks', label: 'Link Yerlestir' },
  { key: 'UseApplicationCommands', label: 'Komutlar' },
  { key: 'ManageMessages', label: 'Mesaj Yonet' },
  { key: 'ManageChannels', label: 'Kanal Yonet' },
  { key: 'Connect', label: 'Baglan (Ses)' },
  { key: 'Speak', label: 'Konus (Ses)' },
  { key: 'Stream', label: 'Ekran Paylas' },
  { key: 'MentionEveryone', label: 'Herkesi Etiketle' }
];

async function showChannelPerms(channelId, channelName) {
  document.getElementById('createChannelForm').style.display = 'none';
  document.getElementById('editChannelForm').style.display = 'none';
  document.getElementById('aiChannelForm').style.display = 'none';
  document.getElementById('channelPermsForm').style.display = 'block';
  document.getElementById('permsChId').value = channelId;
  document.getElementById('permsChName').textContent = channelName;
  document.getElementById('channelPermsForm').scrollIntoView({ behavior: 'smooth' });
  await loadChannelPerms(channelId);
}

async function loadChannelPerms(channelId) {
  const guildId = localStorage.getItem('selectedGuild');
  const container = document.getElementById('permsListContainer');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const data = await API.get(`/api/channels/${guildId}/${channelId}/permissions`);

    // Rol dropdown
    const select = document.getElementById('permsAddRole');
    select.innerHTML = data.roles.map(r =>
      `<option value="${r.id}">${r.name}</option>`
    ).join('');

    if (data.overwrites.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">Ozel izin ayarlanmamis (sunucu varsayilanlari gecerli)</div>';
      return;
    }

    container.innerHTML = data.overwrites.map(o => `
      <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:6px">
            ${o.type === 0 ? `<span class="role-dot" style="background:${o.color}"></span>` : ''}
            <strong style="font-size:13px">${o.name}</strong>
            <span class="badge badge-neutral" style="font-size:9px">${o.type === 0 ? 'Rol' : 'Uye'}</span>
          </div>
          <button class="btn btn-danger btn-xs" onclick="removeChannelPerm('${channelId}','${o.id}')">Kaldir</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${CH_PERMS.map(p => {
            const isAllow = o.allow.includes(p.key);
            const isDeny = o.deny.includes(p.key);
            const state = isAllow ? 'allow' : isDeny ? 'deny' : 'neutral';
            return `<button class="btn btn-xs perm-toggle perm-${state}" data-perm="${p.key}" data-target="${o.id}" data-channel="${channelId}"
              onclick="cyclePerm(this)" title="${p.label}"
              style="font-size:10px;padding:3px 8px;border-radius:4px;
              ${isAllow ? 'background:var(--success-glow);color:var(--success);border-color:rgba(59,165,92,0.3)' :
                isDeny ? 'background:var(--danger-glow);color:var(--danger);border-color:rgba(237,66,69,0.3)' :
                'background:var(--bg-input);color:var(--text-muted);border-color:var(--border)'}">
              ${isAllow ? '✓' : isDeny ? '✕' : '—'} ${p.label}
            </button>`;
          }).join('')}
        </div>
      </div>
    `).join('');
  } catch(e) {
    container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function cyclePerm(btn) {
  const perm = btn.dataset.perm;
  const targetId = btn.dataset.target;
  const channelId = btn.dataset.channel;
  const guildId = localStorage.getItem('selectedGuild');

  // Durumu cycle: neutral -> allow -> deny -> neutral
  const isAllow = btn.classList.contains('perm-allow');
  const isDeny = btn.classList.contains('perm-deny');

  let newAllow = [], newDeny = [];

  // Mevcut tum butonlari oku
  const allBtns = btn.parentElement.querySelectorAll('.perm-toggle');
  allBtns.forEach(b => {
    const k = b.dataset.perm;
    if (k === perm) {
      // Bu butonu cycle et
      if (!isAllow && !isDeny) { newAllow.push(k); } // neutral -> allow
      else if (isAllow) { newDeny.push(k); } // allow -> deny
      // deny -> neutral (hicbirine ekleme)
    } else {
      if (b.classList.contains('perm-allow')) newAllow.push(k);
      else if (b.classList.contains('perm-deny')) newDeny.push(k);
    }
  });

  try {
    await API.put(`/api/channels/${guildId}/${channelId}/permissions`, {
      targetId, targetType: 0, allow: newAllow, deny: newDeny
    });
    loadChannelPerms(channelId);
  } catch(e) { showToast(e.message, 'error'); }
}

async function addChannelPerm() {
  const channelId = document.getElementById('permsChId').value;
  const roleId = document.getElementById('permsAddRole').value;
  const guildId = localStorage.getItem('selectedGuild');
  if (!roleId) return;

  try {
    await API.put(`/api/channels/${guildId}/${channelId}/permissions`, {
      targetId: roleId, targetType: 0, allow: ['ViewChannel'], deny: []
    });
    showToast('Izin eklendi');
    loadChannelPerms(channelId);
  } catch(e) { showToast(e.message, 'error'); }
}

async function removeChannelPerm(channelId, targetId) {
  if (!confirm('Bu izin ayarini kaldirmak istediginize emin misiniz?')) return;
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.del(`/api/channels/${guildId}/${channelId}/permissions/${targetId}`);
    showToast('Izin kaldirildi');
    loadChannelPerms(channelId);
  } catch(e) { showToast(e.message, 'error'); }
}

function editChannel(id, name, topic, parentId, nsfw) {
  document.getElementById('createChannelForm').style.display = 'none';
  document.getElementById('editChannelForm').style.display = 'block';
  document.getElementById('editChId').value = id;
  document.getElementById('editChCurrentName').textContent = name;
  document.getElementById('editChName').value = name;
  document.getElementById('editChTopic').value = topic;
  document.getElementById('editChParent').value = parentId || '';
  const nsfwToggle = document.getElementById('editChNsfw');
  if (nsfw) nsfwToggle.classList.add('active'); else nsfwToggle.classList.remove('active');
  document.getElementById('editChannelForm').scrollIntoView({ behavior: 'smooth' });
}

async function saveEditChannel() {
  const guildId = localStorage.getItem('selectedGuild');
  const chId = document.getElementById('editChId').value;
  try {
    await API.put(`/api/channels/${guildId}/${chId}`, {
      name: document.getElementById('editChName').value,
      topic: document.getElementById('editChTopic').value,
      parent: document.getElementById('editChParent').value || null,
      nsfw: document.getElementById('editChNsfw').classList.contains('active')
    });
    showToast('Kanal duzenlendi');
    renderChannels();
  } catch(e) { showToast(e.message, 'error'); }
}

async function createChannel() {
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.post(`/api/channels/${guildId}`, {
      name: document.getElementById('newChName').value,
      type: document.getElementById('newChType').value,
      parent: document.getElementById('newChParent').value || undefined
    });
    showToast('Kanal olusturuldu');
    renderChannels();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteChannel(chId) {
  if (!confirm(I18n.t('channels.deleteConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.del(`/api/channels/${guildId}/${chId}`);
  showToast('Kanal silindi');
  renderChannels();
}

async function deleteAllChannels() {
  if (!confirm(I18n.t('channels.deleteAllConfirm'))) return;
  if (!confirm('EMIN MISINIZ? Bu islem geri alinamaz!')) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.del(`/api/channels/${guildId}`);
  showToast('Tum kanallar silindi');
  renderChannels();
}
