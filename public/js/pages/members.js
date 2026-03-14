async function renderMembers() {
  renderLayout('<div class="spinner"></div>', '/members');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const members = await API.get(`/api/members/${guildId}`);

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${I18n.t('members.title')} (${members.length})</h1>
      </div>
      <div id="memberMsg"></div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>${I18n.t('members.username')}</th><th>${I18n.t('members.nickname')}</th><th>${I18n.t('members.roles')}</th><th>${I18n.t('members.joinedAt')}</th><th>${I18n.t('common.actions')}</th></tr></thead>
            <tbody>
              ${members.filter(m => !m.bot).map(m => `
                <tr>
                  <td style="display:flex;align-items:center;gap:8px">
                    <img src="${m.avatar}" width="28" height="28" style="border-radius:50%" />
                    <strong>${m.username}</strong>
                  </td>
                  <td>${m.nickname||'-'}</td>
                  <td>${m.roles.map(r => `<span class="badge badge-info" style="margin:1px"><span class="role-dot" style="background:${r.color}"></span>${r.name}</span>`).join(' ') || '-'}</td>
                  <td style="font-size:12px">${m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('tr-TR') : '-'}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-danger btn-sm" onclick="kickMember('${m.id}')">${I18n.t('members.kick')}</button>
                      <button class="btn btn-danger btn-sm" onclick="banMember('${m.id}')">${I18n.t('members.ban')}</button>
                    </div>
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

async function kickMember(userId) {
  if (!confirm(I18n.t('members.kickConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.post(`/api/members/${guildId}/${userId}/kick`);
  renderMembers();
}

async function banMember(userId) {
  if (!confirm(I18n.t('members.banConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.post(`/api/members/${guildId}/${userId}/ban`);
  renderMembers();
}
