async function renderBackup() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/backup');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const [chBackups, roleBackups] = await Promise.all([
      API.get(`/api/backup/${guildId}/channels`),
      API.get(`/api/backup/${guildId}/roles`)
    ]);

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('backup.title')}</h1>
          <p class="page-subtitle">Kanal ve yetki yedeklerini yonetin</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="createChannelBackup()">${svgIcon('hash')} Kanal Yedekle</button>
          <button class="btn btn-secondary btn-sm" onclick="createRoleBackup()">${svgIcon('shield')} Rol Yedekle</button>
        </div>
      </div>

      <div id="backupMsg"></div>

      <!-- Kanal Yedekleri -->
      <div class="section-title">${I18n.t('backup.channels')}</div>
      <div class="card card-flush">
        ${chBackups.length === 0
          ? '<div class="empty-state">' + I18n.t('backup.noBackups') + '</div>'
          : `<div class="table-wrap"><table>
            <thead><tr>
              <th>${I18n.t('backup.backupName')}</th>
              <th>Kanal</th>
              <th>${I18n.t('backup.createdAt')}</th>
              <th style="text-align:right">${I18n.t('common.actions')}</th>
            </tr></thead>
            <tbody>
              ${chBackups.map(b => `<tr>
                <td><strong>${b.backup_name}</strong></td>
                <td class="mono">${b.channel_count}</td>
                <td class="mono" style="font-size:12px;color:var(--text-muted)">${new Date(b.created_at).toLocaleString('tr-TR')}</td>
                <td style="text-align:right">
                  <div class="btn-group" style="justify-content:flex-end">
                    <button class="btn btn-success btn-xs" onclick="restoreChannelBackup(${b.id})">${I18n.t('backup.restore')}</button>
                    <button class="btn btn-danger btn-xs" onclick="deleteBackup('channels',${b.id})">${I18n.t('common.delete')}</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`
        }
      </div>

      <!-- Rol Yedekleri -->
      <div class="section-title">${I18n.t('backup.roles')}</div>
      <div class="card card-flush">
        ${roleBackups.length === 0
          ? '<div class="empty-state">' + I18n.t('backup.noBackups') + '</div>'
          : `<div class="table-wrap"><table>
            <thead><tr>
              <th>${I18n.t('backup.backupName')}</th>
              <th>Rol</th>
              <th>${I18n.t('backup.createdAt')}</th>
              <th style="text-align:right">${I18n.t('common.actions')}</th>
            </tr></thead>
            <tbody>
              ${roleBackups.map(b => `<tr>
                <td><strong>${b.backup_name}</strong></td>
                <td class="mono">${b.role_count}</td>
                <td class="mono" style="font-size:12px;color:var(--text-muted)">${new Date(b.created_at).toLocaleString('tr-TR')}</td>
                <td style="text-align:right">
                  <div class="btn-group" style="justify-content:flex-end">
                    <button class="btn btn-success btn-xs" onclick="restoreRoleBackup(${b.id})">${I18n.t('backup.restore')}</button>
                    <button class="btn btn-danger btn-xs" onclick="deleteBackup('roles',${b.id})">${I18n.t('common.delete')}</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`
        }
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function createChannelBackup() {
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/channels`);
  showToast(`${I18n.t('backup.backupSuccess')} (${res.channelCount} kanal)`);
  setTimeout(renderBackup, 1500);
}

async function createRoleBackup() {
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/roles`);
  showToast(`${I18n.t('backup.backupSuccess')} (${res.roleCount} rol)`);
  setTimeout(renderBackup, 1500);
}

async function restoreChannelBackup(id) {
  if (!confirm(I18n.t('backup.restoreConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/channels/${id}/restore`);
  showToast(`${I18n.t('backup.restoreSuccess')} (${res.created}/${res.total})`);
}

async function restoreRoleBackup(id) {
  if (!confirm(I18n.t('backup.restoreConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/roles/${id}/restore`);
  showToast(`${I18n.t('backup.restoreSuccess')} (${res.created}/${res.total})`);
}

async function deleteBackup(type, id) {
  if (!confirm(I18n.t('common.confirmDelete'))) return;
  await API.del(`/api/backup/${type}/${id}`);
  showToast('Yedek silindi');
  renderBackup();
}
