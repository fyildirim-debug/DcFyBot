async function renderBackup() {
  renderLayout('<div class="spinner"></div>', '/backup');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const [chBackups, roleBackups] = await Promise.all([
      API.get(`/api/backup/${guildId}/channels`),
      API.get(`/api/backup/${guildId}/roles`)
    ]);

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${I18n.t('backup.title')}</h1>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="createChannelBackup()">${I18n.t('backup.channels')} - ${I18n.t('backup.createBackup')}</button>
          <button class="btn btn-secondary btn-sm" onclick="createRoleBackup()">${I18n.t('backup.roles')} - ${I18n.t('backup.createBackup')}</button>
        </div>
      </div>
      <div id="backupMsg"></div>

      <div class="card">
        <div class="card-header"><span class="card-title">${I18n.t('backup.channels')}</span></div>
        ${chBackups.length === 0 ? `<div class="empty-state">${I18n.t('backup.noBackups')}</div>` : `
          <div class="table-wrap"><table><thead><tr><th>${I18n.t('backup.backupName')}</th><th>Kanal</th><th>${I18n.t('backup.createdAt')}</th><th>${I18n.t('common.actions')}</th></tr></thead><tbody>
            ${chBackups.map(b => `<tr>
              <td><strong>${b.backup_name}</strong></td>
              <td>${b.channel_count}</td>
              <td style="font-size:12px">${new Date(b.created_at).toLocaleString('tr-TR')}</td>
              <td><div class="btn-group">
                <button class="btn btn-success btn-sm" onclick="restoreChannelBackup(${b.id})">${I18n.t('backup.restore')}</button>
                <button class="btn btn-danger btn-sm" onclick="deleteBackup('channels',${b.id})">${I18n.t('common.delete')}</button>
              </div></td>
            </tr>`).join('')}
          </tbody></table></div>`}
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">${I18n.t('backup.roles')}</span></div>
        ${roleBackups.length === 0 ? `<div class="empty-state">${I18n.t('backup.noBackups')}</div>` : `
          <div class="table-wrap"><table><thead><tr><th>${I18n.t('backup.backupName')}</th><th>Rol</th><th>${I18n.t('backup.createdAt')}</th><th>${I18n.t('common.actions')}</th></tr></thead><tbody>
            ${roleBackups.map(b => `<tr>
              <td><strong>${b.backup_name}</strong></td>
              <td>${b.role_count}</td>
              <td style="font-size:12px">${new Date(b.created_at).toLocaleString('tr-TR')}</td>
              <td><div class="btn-group">
                <button class="btn btn-success btn-sm" onclick="restoreRoleBackup(${b.id})">${I18n.t('backup.restore')}</button>
                <button class="btn btn-danger btn-sm" onclick="deleteBackup('roles',${b.id})">${I18n.t('common.delete')}</button>
              </div></td>
            </tr>`).join('')}
          </tbody></table></div>`}
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function createChannelBackup() {
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/channels`);
  document.getElementById('backupMsg').innerHTML = `<div class="alert alert-success">${I18n.t('backup.backupSuccess')} (${res.channelCount} kanal)</div>`;
  setTimeout(renderBackup, 1500);
}

async function createRoleBackup() {
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/roles`);
  document.getElementById('backupMsg').innerHTML = `<div class="alert alert-success">${I18n.t('backup.backupSuccess')} (${res.roleCount} rol)</div>`;
  setTimeout(renderBackup, 1500);
}

async function restoreChannelBackup(id) {
  if (!confirm(I18n.t('backup.restoreConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/channels/${id}/restore`);
  document.getElementById('backupMsg').innerHTML = `<div class="alert alert-success">${I18n.t('backup.restoreSuccess')} (${res.created}/${res.total})</div>`;
}

async function restoreRoleBackup(id) {
  if (!confirm(I18n.t('backup.restoreConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/roles/${id}/restore`);
  document.getElementById('backupMsg').innerHTML = `<div class="alert alert-success">${I18n.t('backup.restoreSuccess')} (${res.created}/${res.total})</div>`;
}

async function deleteBackup(type, id) {
  if (!confirm(I18n.t('common.confirmDelete'))) return;
  await API.del(`/api/backup/${type}/${id}`);
  renderBackup();
}
