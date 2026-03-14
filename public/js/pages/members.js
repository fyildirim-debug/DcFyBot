let _allRoles = [];

async function renderMembers() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/members');
  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { document.querySelector('.main-content').innerHTML = '<div class="alert alert-warning">Lutfen bir sunucu secin</div>'; return; }

  try {
    const [members, roles] = await Promise.all([
      API.get(`/api/members/${guildId}`),
      API.get(`/api/roles/${guildId}`)
    ]);
    const humans = members.filter(m => !m.bot);
    _allRoles = roles.filter(r => r.name !== '@everyone' && !r.managed);

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('members.title')}</h1>
          <p class="page-subtitle">${humans.length} uye</p>
        </div>
      </div>

      <div id="memberMsg"></div>

      <!-- Uye Duzenle Modal -->
      <div id="editMemberForm" style="display:none" class="card">
        <div class="card-title" style="margin-bottom:14px">${I18n.t('common.edit')} - <span id="editMemberName"></span></div>
        <input type="hidden" id="editMemberId" />

        <div class="section-title">${I18n.t('members.nickname')}</div>
        <div class="form-group">
          <input class="form-input" id="editMemberNick" placeholder="Takma ad..." />
        </div>

        <div class="section-title">${I18n.t('members.roles')}</div>
        <div id="editMemberRoles" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px"></div>

        <div class="section-title">${I18n.t('members.timeout')}</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Sure (dakika)</label>
            <input class="form-input mono" type="number" id="editMemberTimeout" value="5" min="1" max="40320" />
          </div>
          <div class="form-group">
            <label class="form-label">Sebep</label>
            <input class="form-input" id="editMemberTimeoutReason" placeholder="Sebep (opsiyonel)" />
          </div>
        </div>

        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="saveEditMember()">${I18n.t('common.save')}</button>
          <button class="btn btn-secondary btn-sm" onclick="applyTimeout()">${I18n.t('members.timeout')}</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('editMemberForm').style.display='none'">${I18n.t('common.cancel')}</button>
        </div>
      </div>

      <!-- Tablo -->
      <div class="card card-flush">
        <div class="table-wrap" style="max-height:600px;overflow-y:auto">
          <table>
            <thead><tr>
              <th>${I18n.t('members.username')}</th>
              <th>${I18n.t('members.nickname')}</th>
              <th>${I18n.t('members.roles')}</th>
              <th>${I18n.t('members.joinedAt')}</th>
              <th style="text-align:right">${I18n.t('common.actions')}</th>
            </tr></thead>
            <tbody>
              ${humans.map(m => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <img src="${m.avatar}" class="avatar" alt="" />
                      <strong>${m.username}</strong>
                    </div>
                  </td>
                  <td style="color:var(--text-muted)">${m.nickname||'-'}</td>
                  <td>
                    ${m.roles.map(r => `<span class="badge badge-neutral" style="margin:1px;font-size:10px"><span class="role-dot" style="background:${r.color}"></span>${r.name}</span>`).join(' ') || '<span style="color:var(--text-muted)">-</span>'}
                  </td>
                  <td class="mono" style="font-size:12px;color:var(--text-muted)">${m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('tr-TR') : '-'}</td>
                  <td style="text-align:right">
                    <div class="btn-group" style="justify-content:flex-end">
                      <button class="btn btn-secondary btn-xs" onclick="editMember('${m.id}','${m.username.replace(/'/g,"\\'")}','${(m.nickname||'').replace(/'/g,"\\'")}', ${JSON.stringify(m.roles.map(r=>r.id)).replace(/"/g,'&quot;')})">${I18n.t('common.edit')}</button>
                      <button class="btn btn-danger btn-xs" onclick="kickMember('${m.id}')">${I18n.t('members.kick')}</button>
                      <button class="btn btn-danger btn-xs" onclick="banMember('${m.id}')">${I18n.t('members.ban')}</button>
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

function editMember(id, username, nickname, currentRoleIds) {
  document.getElementById('editMemberForm').style.display = 'block';
  document.getElementById('editMemberId').value = id;
  document.getElementById('editMemberName').textContent = username;
  document.getElementById('editMemberNick').value = nickname;

  // Rol checkboxlari
  const container = document.getElementById('editMemberRoles');
  container.innerHTML = _allRoles.map(r => {
    const checked = currentRoleIds.includes(r.id);
    return `<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:var(--radius-sm);background:var(--bg-input);cursor:pointer;font-size:12px;border:1px solid ${checked ? 'var(--accent)' : 'var(--border)'}">
      <input type="checkbox" value="${r.id}" ${checked?'checked':''} style="accent-color:var(--accent)" />
      <span class="role-dot" style="background:${r.color}"></span>${r.name}
    </label>`;
  }).join('');

  document.getElementById('editMemberForm').scrollIntoView({ behavior: 'smooth' });
}

async function saveEditMember() {
  const guildId = localStorage.getItem('selectedGuild');
  const userId = document.getElementById('editMemberId').value;

  // Secili roller
  const checkboxes = document.querySelectorAll('#editMemberRoles input[type=checkbox]');
  const selectedRoles = [];
  const removedRoles = [];
  checkboxes.forEach(cb => {
    if (cb.checked) selectedRoles.push(cb.value);
    else removedRoles.push(cb.value);
  });

  try {
    // Rolleri guncelle
    await API.put(`/api/members/${guildId}/${userId}/roles`, {
      add: selectedRoles,
      remove: removedRoles
    });
    showToast('Uye guncellendi');
    renderMembers();
  } catch(e) { showToast(e.message, 'error'); }
}

async function applyTimeout() {
  const guildId = localStorage.getItem('selectedGuild');
  const userId = document.getElementById('editMemberId').value;
  const minutes = parseInt(document.getElementById('editMemberTimeout').value) || 5;
  const reason = document.getElementById('editMemberTimeoutReason').value;

  if (!confirm(`Bu uyeyi ${minutes} dakika susturmak istediginize emin misiniz?`)) return;

  try {
    await API.post(`/api/members/${guildId}/${userId}/timeout`, { minutes, reason });
    showToast(`Uye ${minutes} dakika susturuldu`);
    renderMembers();
  } catch(e) { showToast(e.message, 'error'); }
}

async function kickMember(userId) {
  if (!confirm(I18n.t('members.kickConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.post(`/api/members/${guildId}/${userId}/kick`);
  showToast('Uye atildi');
  renderMembers();
}

async function banMember(userId) {
  if (!confirm(I18n.t('members.banConfirm'))) return;
  const guildId = localStorage.getItem('selectedGuild');
  await API.post(`/api/members/${guildId}/${userId}/ban`);
  showToast('Uye yasaklandi');
  renderMembers();
}
