let _msgChannelId = null;
let _msgOldestId = null;
let _msgHasMore = false;
let _msgSelectMode = false;
let _msgSelected = new Set();

async function renderMessages() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/messages');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const channels = await API.get(`/api/channels/${guildId}`);
    const textChannels = channels.filter(c => [0, 5, 15].includes(c.type));
    const prevChannel = _msgChannelId || '';

    _msgSelectMode = false;
    _msgSelected = new Set();

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('nav.messages') || 'Mesajlar'}</h1>
          <p class="page-subtitle">Kanal mesajlarini goruntule ve yonet</p>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:16px;align-items:center;flex-wrap:wrap">
        <select class="form-select" id="msgChannelSelect" onchange="onMsgChannelChange(this.value)" style="max-width:300px">
          <option value="">Kanal secin...</option>
          ${textChannels.map(c => `<option value="${c.id}" ${c.id===prevChannel?'selected':''}># ${c.name}</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" onclick="refreshMessages()">${svgIcon('list')} Yenile</button>
        <button class="btn btn-secondary btn-sm" id="btnSelectMode" onclick="toggleSelectMode()" style="display:none">Sec</button>
      </div>

      <!-- Toplu islem cubugu -->
      <div id="bulkBar" class="reorder-bar" style="display:none">
        <span class="info"><span id="bulkCount">0</span> mesaj secildi</span>
        <div class="btn-group">
          <button class="btn btn-secondary btn-sm" onclick="bulkSelectAll()">Tumunu Sec</button>
          <button class="btn btn-secondary btn-sm" onclick="bulkDeselectAll()">Secimi Kaldir</button>
          <button class="btn btn-danger btn-sm" onclick="bulkDelete()">Secilileri Sil</button>
          <button class="btn btn-secondary btn-sm" onclick="toggleSelectMode()">Iptal</button>
        </div>
      </div>

      <div id="msgContainer">
        <div class="empty-state">Mesajlari gormek icin bir kanal secin</div>
      </div>
      <div id="aiComposeWrapper"></div>
    `;

    if (prevChannel) onMsgChannelChange(prevChannel);
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function toggleSelectMode() {
  _msgSelectMode = !_msgSelectMode;
  _msgSelected = new Set();

  const btn = document.getElementById('btnSelectMode');
  const bulkBar = document.getElementById('bulkBar');

  if (_msgSelectMode) {
    btn.textContent = 'Secim Modu: ACIK';
    btn.className = 'btn btn-primary btn-sm';
    bulkBar.style.display = 'flex';
  } else {
    btn.textContent = 'Sec';
    btn.className = 'btn btn-secondary btn-sm';
    bulkBar.style.display = 'none';
  }

  // Checkbox'lari goster/gizle
  document.querySelectorAll('.msg-checkbox').forEach(cb => {
    cb.style.display = _msgSelectMode ? 'flex' : 'none';
    cb.querySelector('input').checked = false;
  });
  document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('msg-selected'));

  updateBulkCount();
}

function toggleMsgSelect(checkbox, msgId) {
  if (checkbox.checked) {
    _msgSelected.add(msgId);
    document.getElementById(`msg-${msgId}`)?.classList.add('msg-selected');
  } else {
    _msgSelected.delete(msgId);
    document.getElementById(`msg-${msgId}`)?.classList.remove('msg-selected');
  }
  updateBulkCount();
}

function bulkSelectAll() {
  document.querySelectorAll('.msg-checkbox input').forEach(cb => {
    cb.checked = true;
    const msgId = cb.dataset.msgId;
    _msgSelected.add(msgId);
    document.getElementById(`msg-${msgId}`)?.classList.add('msg-selected');
  });
  updateBulkCount();
}

function bulkDeselectAll() {
  document.querySelectorAll('.msg-checkbox input').forEach(cb => {
    cb.checked = false;
  });
  document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('msg-selected'));
  _msgSelected = new Set();
  updateBulkCount();
}

function updateBulkCount() {
  const el = document.getElementById('bulkCount');
  if (el) el.textContent = _msgSelected.size;
}

async function bulkDelete() {
  const count = _msgSelected.size;
  if (count === 0) { showToast('Mesaj secilmedi', 'error'); return; }
  if (!confirm(`${count} mesaj silinecek. Devam?`)) return;

  const guildId = localStorage.getItem('selectedGuild');
  const channelId = _msgChannelId;
  let deleted = 0;
  let failed = 0;

  // Progress goster
  const bulkBar = document.getElementById('bulkBar');
  const origHtml = bulkBar.innerHTML;
  bulkBar.querySelector('.info').textContent = `Siliniyor... 0/${count}`;

  for (const msgId of _msgSelected) {
    try {
      await API.del(`/api/messages/${guildId}/${channelId}/${msgId}`);
      const el = document.getElementById(`msg-${msgId}`);
      if (el) el.remove();
      deleted++;
    } catch {
      failed++;
    }
    bulkBar.querySelector('.info').textContent = `Siliniyor... ${deleted + failed}/${count}`;

    // Rate limit: 50ms bekle
    if ((deleted + failed) % 3 === 0) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  _msgSelected = new Set();
  updateBulkCount();
  showToast(`${deleted} mesaj silindi${failed > 0 ? `, ${failed} basarisiz` : ''}`);

  // Bar'i geri yukle
  bulkBar.innerHTML = origHtml;
  toggleSelectMode();
}

async function onMsgChannelChange(channelId) {
  if (!channelId) {
    document.getElementById('msgContainer').innerHTML = '<div class="empty-state">Mesajlari gormek icin bir kanal secin</div>';
    document.getElementById('btnSelectMode').style.display = 'none';
    _msgChannelId = null;
    return;
  }
  _msgChannelId = channelId;
  _msgOldestId = null;
  _msgHasMore = false;
  _msgSelectMode = false;
  _msgSelected = new Set();
  document.getElementById('btnSelectMode').style.display = '';
  document.getElementById('bulkBar').style.display = 'none';
  await loadMessages(channelId, false);
}

async function loadMessages(channelId, append = false) {
  const guildId = localStorage.getItem('selectedGuild');
  const container = document.getElementById('msgContainer');
  if (!container) return;

  if (!append) {
    container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  }

  try {
    let url = `/api/messages/${guildId}/${channelId}?limit=50`;
    if (append && _msgOldestId) url += `&before=${_msgOldestId}`;

    const data = await API.get(url);
    _msgHasMore = data.hasMore;

    if (data.messages.length > 0) {
      _msgOldestId = data.messages[0].id;
    }

    if (!append) container.innerHTML = '';

    const existingLoadMore = container.querySelector('.msg-load-more');
    if (existingLoadMore) existingLoadMore.remove();

    const html = renderMessageList(data.messages, channelId);

    if (append) {
      container.insertAdjacentHTML('afterbegin', html);
    } else {
      container.innerHTML = html;
    }

    if (_msgHasMore) {
      container.insertAdjacentHTML('afterbegin', `
        <div class="msg-load-more" style="text-align:center;padding:12px">
          <button class="btn btn-secondary btn-sm" onclick="loadMessages('${channelId}', true)">Daha eski mesajlari yukle</button>
        </div>
      `);
    }

    if (!container.querySelector('.msg-send-bar')) {
      container.insertAdjacentHTML('beforeend', `
        <div class="msg-send-bar">
          <form onsubmit="sendMessage(event,'${channelId}')" style="display:flex;gap:8px;padding:12px 0">
            <input class="form-input" id="msgSendInput" placeholder="Bot olarak mesaj gonder..." autocomplete="off" style="flex:1" />
            <button type="submit" class="btn btn-primary btn-sm">Gonder</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="toggleAICompose('${channelId}')">${svgIcon('cpu')} AI</button>
          </form>
        </div>
      `);
    }

    if (!append) container.scrollTop = container.scrollHeight;

    if (data.messages.length === 0 && !append) {
      container.innerHTML = `
        <div class="empty-state">Bu kanalda mesaj yok</div>
        <div class="msg-send-bar">
          <form onsubmit="sendMessage(event,'${channelId}')" style="display:flex;gap:8px;padding:12px 0">
            <input class="form-input" id="msgSendInput" placeholder="Bot olarak mesaj gonder..." autocomplete="off" style="flex:1" />
            <button type="submit" class="btn btn-primary btn-sm">Gonder</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="toggleAICompose('${channelId}')">${svgIcon('cpu')} AI</button>
          </form>
        </div>
      `;
    }
  } catch(e) {
    container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function renderMessageList(messages, channelId) {
  if (!messages.length) return '';

  let html = '';
  let lastAuthor = null;
  let lastDate = null;

  for (const m of messages) {
    const date = new Date(m.timestamp);
    const dateStr = date.toLocaleDateString('tr-TR');
    const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    if (dateStr !== lastDate) {
      html += `<div class="msg-date-sep"><span>${dateStr}</span></div>`;
      lastDate = dateStr;
      lastAuthor = null;
    }

    const isGrouped = lastAuthor === m.author.id;
    lastAuthor = m.author.id;

    const escapedContent = escapeHtml(m.content || '');
    const formattedContent = formatDiscordContent(escapedContent);
    const isSelected = _msgSelected.has(m.id);

    html += `
      <div class="msg-item ${isGrouped ? 'msg-grouped' : ''} ${m.pinned ? 'msg-pinned' : ''} ${isSelected ? 'msg-selected' : ''}" id="msg-${m.id}">
        <div class="msg-checkbox" style="display:${_msgSelectMode ? 'flex' : 'none'};align-items:center;flex-shrink:0;padding-right:4px">
          <input type="checkbox" data-msg-id="${m.id}" ${isSelected ? 'checked' : ''} onchange="toggleMsgSelect(this,'${m.id}')" style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer" />
        </div>
        ${!isGrouped ? `
          <div class="msg-avatar">
            <img src="${m.author.avatar}" class="avatar" alt="" />
          </div>
        ` : '<div class="msg-avatar-spacer"></div>'}
        <div class="msg-body">
          ${!isGrouped ? `
            <div class="msg-header">
              <span class="msg-author ${m.author.bot ? 'msg-bot' : ''}">${m.author.displayName}</span>
              ${m.author.bot ? '<span class="badge badge-info" style="font-size:9px;padding:1px 5px">BOT</span>' : ''}
              <span class="msg-time">${timeStr}</span>
              ${m.pinned ? '<span class="badge badge-warning" style="font-size:9px;padding:1px 5px">PIN</span>' : ''}
              ${m.editedTimestamp ? '<span class="msg-edited">(duzenlenmis)</span>' : ''}
            </div>
          ` : ''}
          <div class="msg-content">${formattedContent || '<em style="color:var(--text-muted)">icerik yok</em>'}</div>
          ${m.attachments.length > 0 ? `
            <div class="msg-attachments">
              ${m.attachments.map(a => {
                if (a.contentType?.startsWith('image/')) {
                  return `<a href="${a.url}" target="_blank" class="msg-img-attach"><img src="${a.url}" alt="${a.name}" style="max-width:300px;max-height:200px;border-radius:var(--radius-sm)" /></a>`;
                }
                return `<a href="${a.url}" target="_blank" class="msg-file-attach">${svgIcon('archive')} ${a.name} <span class="mono" style="font-size:10px;color:var(--text-muted)">(${formatFileSize(a.size)})</span></a>`;
              }).join('')}
            </div>
          ` : ''}
          ${m.reactions.length > 0 ? `
            <div class="msg-reactions">
              ${m.reactions.map(r => `<span class="msg-reaction">${r.emoji} ${r.count}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="msg-actions">
          <button class="btn btn-ghost btn-xs" onclick="${m.pinned ? `unpinMessage('${channelId}','${m.id}')` : `pinMessage('${channelId}','${m.id}')`}" title="${m.pinned ? 'Sabiti kaldir' : 'Sabitle'}">
            ${m.pinned ? '&#x2716;' : '&#x1F4CC;'}
          </button>
          <button class="btn btn-ghost btn-xs" onclick="deleteMessage('${channelId}','${m.id}')" title="Sil" style="color:var(--danger)">
            &#x2715;
          </button>
        </div>
      </div>
    `;
  }
  return html;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDiscordContent(text) {
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="msg-code-block"><code>$2</code></pre>');
  text = text.replace(/`(.+?)`/g, '<code class="msg-inline-code">$1</code>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  text = text.replace(/@(\S+)/g, '<span class="msg-mention">@$1</span>');
  text = text.replace(/#(\S+)/g, '<span class="msg-channel-mention">#$1</span>');
  text = text.replace(/:(\w+):/g, '<span class="msg-emoji">:$1:</span>');
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color:var(--accent)">$1</a>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

async function deleteMessage(channelId, messageId) {
  if (!confirm('Bu mesaji silmek istediginize emin misiniz?')) return;
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.del(`/api/messages/${guildId}/${channelId}/${messageId}`);
    const el = document.getElementById(`msg-${messageId}`);
    if (el) el.remove();
    showToast('Mesaj silindi');
  } catch(e) { showToast(e.message, 'error'); }
}

async function pinMessage(channelId, messageId) {
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.post(`/api/messages/${guildId}/${channelId}/${messageId}/pin`);
    showToast('Mesaj sabitlendi');
    loadMessages(channelId, false);
  } catch(e) { showToast(e.message, 'error'); }
}

async function unpinMessage(channelId, messageId) {
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.del(`/api/messages/${guildId}/${channelId}/${messageId}/pin`);
    showToast('Sabitleme kaldirildi');
    loadMessages(channelId, false);
  } catch(e) { showToast(e.message, 'error'); }
}

async function sendMessage(e, channelId) {
  e.preventDefault();
  const input = document.getElementById('msgSendInput');
  if (!input?.value.trim()) return;
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.post(`/api/messages/${guildId}/${channelId}/send`, { content: input.value });
    input.value = '';
    loadMessages(channelId, false);
  } catch(e2) { showToast(e2.message, 'error'); }
}

function refreshMessages() {
  if (_msgChannelId) loadMessages(_msgChannelId, false);
}

// ===== AI MESAJ HAZIRLAMA =====
let _aiComposeData = null;

function toggleAICompose(channelId) {
  const wrapper = document.getElementById('aiComposeWrapper');
  if (!wrapper) return;

  if (wrapper.innerHTML.trim()) {
    wrapper.innerHTML = '';
    return;
  }

  wrapper.innerHTML = `
    <div id="aiComposePanel" style="border-top:1px solid var(--border);padding:16px;background:var(--bg-surface)">
      <div style="font-size:14px;font-weight:600;color:var(--text-heading);margin-bottom:12px">${svgIcon('cpu')} AI ile Mesaj Hazirla</div>

      <div class="form-group">
        <label class="form-label">Ne tur bir mesaj istiyorsunuz?</label>
        <textarea class="form-textarea" id="aiComposePrompt" rows="2" placeholder="Ornek: Sunucu kurallari hakkinda sik ve renkli bir duyuru mesaji hazirla. Kurallar: 1. Saygi, 2. Spam yasak, 3. Reklam yasak"></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Resim URL (opsiyonel)</label>
        <input class="form-input" id="aiComposeImage" placeholder="https://ornek.com/resim.png" />
      </div>

      <div class="btn-group" style="margin-bottom:12px">
        <button class="btn btn-primary btn-sm" id="aiComposeBtn" onclick="aiCompose('${channelId}')">Hazirla</button>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('aiComposeWrapper').innerHTML=''">Kapat</button>
      </div>

      <!-- Onizleme -->
      <div id="aiComposePreview"></div>
    </div>
  `);

  document.getElementById('aiComposePrompt').focus();
}

async function aiCompose(channelId) {
  const prompt = document.getElementById('aiComposePrompt')?.value?.trim();
  if (!prompt) { showToast('Ne tur mesaj istediginizi yazin', 'error'); return; }

  const guildId = localStorage.getItem('selectedGuild');
  const btn = document.getElementById('aiComposeBtn');
  const preview = document.getElementById('aiComposePreview');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;margin:0"></div> AI hazirlıyor...';
  preview.innerHTML = '';

  try {
    const res = await API.post(`/api/messages/${guildId}/${channelId}/ai-compose`, { prompt }, { timeout: 600000 });
    if (!res.success) {
      preview.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
      return;
    }

    _aiComposeData = res.data;
    const imageUrl = document.getElementById('aiComposeImage')?.value?.trim();
    if (imageUrl && _aiComposeData.embed) {
      _aiComposeData.embed.image = imageUrl;
    }

    // Onizleme render
    preview.innerHTML = renderEmbedPreview(_aiComposeData) + `
      <div class="btn-group" style="margin-top:12px">
        <button class="btn btn-success btn-sm" onclick="sendAICompose('${channelId}')">Onayla ve Gonder</button>
        <button class="btn btn-secondary btn-sm" onclick="aiCompose('${channelId}')">Tekrar Olustur</button>
      </div>
    `;
  } catch(e) {
    preview.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Hazirla';
  }
}

function renderEmbedPreview(data) {
  if (!data?.embed) return '<div class="alert alert-warning">Embed verisi olusturulamadi</div>';

  const e = data.embed;
  const color = e.color || '#5865f2';

  return `
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Onizleme</div>
    ${data.content ? `<div style="font-size:14px;color:var(--text-primary);margin-bottom:8px">${data.content}</div>` : ''}
    <div class="embed-preview" style="border-left:4px solid ${color};background:var(--bg-card);border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:14px 16px;max-width:520px">
      ${e.author?.name ? `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          ${e.author.icon_url ? `<img src="${e.author.icon_url}" style="width:20px;height:20px;border-radius:50%" />` : ''}
          <span style="font-size:12px;font-weight:600;color:var(--text-primary)">${e.author.name}</span>
        </div>
      ` : ''}
      ${e.title ? `<div style="font-size:15px;font-weight:700;color:var(--accent);margin-bottom:6px">${e.title}</div>` : ''}
      ${e.description ? `<div style="font-size:13.5px;color:var(--text-primary);line-height:1.5;margin-bottom:8px;white-space:pre-wrap">${formatEmbedText(e.description)}</div>` : ''}
      ${e.fields?.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
          ${e.fields.map(f => `
            <div style="flex:${f.inline ? '1' : '1 1 100%'};min-width:${f.inline ? '120px' : '100%'};padding:6px 0">
              <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2px">${f.name}</div>
              <div style="font-size:13px;color:var(--text-secondary)">${formatEmbedText(f.value)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${e.image ? `<img src="${e.image}" style="max-width:100%;border-radius:var(--radius-sm);margin-bottom:8px" onerror="this.style.display='none'" />` : ''}
      ${e.thumbnail ? `<img src="${e.thumbnail}" style="position:absolute;top:14px;right:14px;width:60px;height:60px;border-radius:var(--radius-sm);object-fit:cover" onerror="this.style.display='none'" />` : ''}
      ${e.footer?.text ? `
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);margin-top:4px">
          ${e.footer.icon_url ? `<img src="${e.footer.icon_url}" style="width:16px;height:16px;border-radius:50%" />` : ''}
          <span>${e.footer.text}</span>
          ${e.timestamp ? `<span> • ${new Date().toLocaleDateString('tr-TR')}</span>` : ''}
        </div>
      ` : (e.timestamp ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${new Date().toLocaleDateString('tr-TR')}</div>` : '')}
    </div>
  `;
}

function formatEmbedText(text) {
  if (!text) return '';
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/__(.+?)__/g, '<u>$1</u>');
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  text = text.replace(/`(.+?)`/g, '<code class="msg-inline-code">$1</code>');
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:var(--accent)">$1</a>');
  text = text.replace(/^> (.+)$/gm, '<div style="border-left:3px solid var(--text-muted);padding-left:8px;color:var(--text-muted)">$1</div>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

async function sendAICompose(channelId) {
  if (!_aiComposeData) return;
  const guildId = localStorage.getItem('selectedGuild');
  const imageUrl = document.getElementById('aiComposeImage')?.value?.trim();

  try {
    const res = await API.post(`/api/messages/${guildId}/${channelId}/send-embed`, {
      content: _aiComposeData.content || '',
      embed: _aiComposeData.embed,
      imageUrl: imageUrl || undefined
    });

    if (res.success) {
      showToast('Embed mesaj gonderildi');
      _aiComposeData = null;
      const wrapper = document.getElementById('aiComposeWrapper');
      if (wrapper) wrapper.innerHTML = '';
      loadMessages(channelId, false);
    }
  } catch(e) { showToast(e.message, 'error'); }
}
