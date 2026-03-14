async function renderChannels() {
  renderLayout('<div class="spinner"></div>', '/channels');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const channels = await API.get(`/api/channels/${guildId}`);
    const types = { 0:'Metin', 2:'Ses', 4:'Kategori', 5:'Duyuru', 13:'Sahne', 15:'Forum' };

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${I18n.t('channels.title')}</h1>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="showCreateChannel()">${I18n.t('channels.create')}</button>
          <button class="btn btn-danger btn-sm" onclick="deleteAllChannels()">${I18n.t('channels.deleteAll')}</button>
        </div>
      </div>
      <div id="channelMsg"></div>
      <div id="createChannelForm" style="display:none" class="card">
        <div class="card-title" style="margin-bottom:12px">${I18n.t('channels.create')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">${I18n.t('channels.name')}</label><input class="form-input" id="newChName" /></div>
          <div class="form-group"><label class="form-label">${I18n.t('channels.type')}</label>
            <select class="form-select" id="newChType">
              <option value="text">${I18n.t('channels.text')}</option>
              <option value="voice">${I18n.t('channels.voice')}</option>
              <option value="category">${I18n.t('channels.category')}</option>
              <option value="announcement">${I18n.t('channels.announcement')}</option>
            </select>
          </div>
        </div>
        <div class="btn-group" style="margin-top:12px">
          <button class="btn btn-primary btn-sm" onclick="createChannel()">${I18n.t('common.create')}</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('createChannelForm').style.display='none'">${I18n.t('common.cancel')}</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>${I18n.t('channels.name')}</th><th>${I18n.t('channels.type')}</th><th>${I18n.t('channels.category')}</th><th>${I18n.t('channels.position')}</th><th>${I18n.t('common.actions')}</th></tr></thead>
            <tbody>
              ${channels.length === 0 ? `<tr><td colspan="5" class="empty-state">${I18n.t('channels.noChannels')}</td></tr>` :
                channels.map(ch => `
                  <tr>
                    <td><strong>#${ch.name}</strong></td>
                    <td><span class="badge badge-info">${types[ch.type]||ch.type}</span></td>
                    <td>${ch.parentName||'-'}</td>
                    <td>${ch.position}</td>
                    <td><button class="btn btn-danger btn-sm" onclick="deleteChannel('${ch.id}')">${I18n.t('common.delete')}</button></td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function showCreateChannel() { document.getElementById('createChannelForm').style.display = 'block'; }

async function createChannel() {
  const guildId = localStorage.getItem('selectedGuild');
  try {
    await API.post(`/api/channels/${guildId}`, {
      name: document.getElementById('newChName').value,
      type: document.getElementById('newChType').value
    });
    renderChannels();
  } catch(e) { document.getElementById('channelMsg').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function deleteChannel(chId) {
  if (!confirm(I18n.t('channels.deleteConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.del(`/api/channels/${guildId}/${chId}`);
  renderChannels();
}

async function deleteAllChannels() {
  if (!confirm(I18n.t('channels.deleteAllConfirm'))) return;
  if (!confirm('EMIN MISINIZ? Bu islem geri alinamaz!')) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.del(`/api/channels/${guildId}`);
  renderChannels();
}
