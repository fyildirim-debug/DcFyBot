async function renderRoles() {
  renderLayout('<div class="spinner"></div>', '/roles');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const roles = await API.get(`/api/roles/${guildId}`);

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${I18n.t('roles.title')}</h1>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="showCreateRole()">${I18n.t('roles.create')}</button>
          <button class="btn btn-secondary btn-sm" onclick="backupRoles()">${I18n.t('roles.backupRoles')}</button>
        </div>
      </div>
      <div id="roleMsg"></div>
      <div id="createRoleForm" style="display:none" class="card">
        <div class="card-title" style="margin-bottom:12px">${I18n.t('roles.create')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">${I18n.t('roles.name')}</label><input class="form-input" id="newRoleName" /></div>
          <div class="form-group"><label class="form-label">${I18n.t('roles.color')}</label><input class="form-input" type="color" id="newRoleColor" value="#5865f2" /></div>
        </div>
        <div class="btn-group" style="margin-top:12px">
          <button class="btn btn-primary btn-sm" onclick="createRole()">${I18n.t('common.create')}</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('createRoleForm').style.display='none'">${I18n.t('common.cancel')}</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>${I18n.t('roles.name')}</th><th>${I18n.t('roles.color')}</th><th>${I18n.t('roles.memberCount')}</th><th>${I18n.t('roles.position')}</th><th>${I18n.t('common.actions')}</th></tr></thead>
            <tbody>
              ${roles.filter(r => r.name !== '@everyone').map(r => `
                <tr>
                  <td><span class="role-dot" style="background:${r.color}"></span><strong>${r.name}</strong>${r.managed?' <span class="badge badge-warning" style="font-size:10px">Bot</span>':''}</td>
                  <td><span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${r.color};vertical-align:middle"></span> ${r.color}</td>
                  <td>${r.memberCount}</td>
                  <td>${r.position}</td>
                  <td>${r.managed?'-':`<button class="btn btn-danger btn-sm" onclick="deleteRole('${r.id}')">${I18n.t('common.delete')}</button>`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function showCreateRole() { document.getElementById('createRoleForm').style.display = 'block'; }

async function createRole() {
  const guildId = localStorage.getItem('selectedGuild');
  await API.post(`/api/roles/${guildId}`, {
    name: document.getElementById('newRoleName').value,
    color: document.getElementById('newRoleColor').value
  });
  renderRoles();
}

async function deleteRole(roleId) {
  if (!confirm(I18n.t('common.confirmDelete'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.del(`/api/roles/${guildId}/${roleId}`);
  renderRoles();
}

async function backupRoles() {
  const guildId = localStorage.getItem('selectedGuild');
  const res = await API.post(`/api/backup/${guildId}/roles`);
  document.getElementById('roleMsg').innerHTML = `<div class="alert alert-success">${I18n.t('backup.backupSuccess')} (${res.roleCount} rol)</div>`;
}
