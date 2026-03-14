async function renderDashboard() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/dashboard');

  try {
    const [stats, logs] = await Promise.all([
      API.get('/api/stats'),
      API.get('/api/stats/logs?limit=10')
    ]);

    const upH = Math.floor((stats.uptime||0) / 3600000);
    const upM = Math.floor(((stats.uptime||0) % 3600000) / 60000);

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('dashboard.title')}</h1>
          <p class="page-subtitle">${I18n.t('dashboard.systemInfo')}</p>
        </div>
        <span class="badge ${stats.botOnline ? 'badge-success' : 'badge-danger'}">
          <span class="badge-dot ${stats.botOnline ? 'online' : 'offline'}"></span>
          ${stats.botOnline ? I18n.t('dashboard.online') : I18n.t('dashboard.offline')}
        </span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--accent-glow);color:var(--accent)">
            ${svgIcon('server')}
          </div>
          <div class="stat-label">${I18n.t('dashboard.totalServers')}</div>
          <div class="stat-value">${stats.guildCount || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--success-glow);color:var(--success)">
            ${svgIcon('users')}
          </div>
          <div class="stat-label">${I18n.t('dashboard.totalMembers')}</div>
          <div class="stat-value">${stats.memberCount || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--warning-glow);color:var(--warning)">
            ${svgIcon('hash')}
          </div>
          <div class="stat-label">${I18n.t('dashboard.totalMessages')}</div>
          <div class="stat-value">${stats.totalMessages || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--info-glow);color:var(--info)">
            ${svgIcon('cpu')}
          </div>
          <div class="stat-label">${I18n.t('dashboard.aiRequests')}</div>
          <div class="stat-value">${stats.totalAIRequests || 0}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card card-flush">
          <div class="card-header">
            <span class="card-title">${I18n.t('dashboard.systemInfo')}</span>
            <span class="badge badge-neutral mono">${upH}h ${upM}m</span>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="info-label">${I18n.t('dashboard.uptime')}</span>
              <span class="info-value mono">${upH}h ${upM}m</span>
            </div>
            <div class="info-row">
              <span class="info-label">AI</span>
              <span class="info-value">${stats.ai?.enabled
                ? `<span class="badge badge-success">${stats.ai.provider}</span> <span class="mono" style="font-size:12px;color:var(--text-muted)">${stats.ai.model}</span>`
                : `<span class="badge badge-neutral">${I18n.t('ai.disabled')}</span>`}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${I18n.t('dashboard.totalServers')}</span>
              <span class="info-value mono">${stats.guildCount || 0}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Komutlar</span>
              <span class="info-value mono">${stats.totalCommands || 0}</span>
            </div>
          </div>
        </div>

        <div class="card card-flush">
          <div class="card-header">
            <span class="card-title">${I18n.t('dashboard.recentActivity')}</span>
            <a href="/logs" data-link class="btn btn-ghost btn-xs">${I18n.t('common.all')}</a>
          </div>
          <div class="card-body" style="padding:0">
            ${logs.length === 0
              ? '<div class="empty-state" style="padding:24px">' + I18n.t('logs.noLogs') + '</div>'
              : '<div style="max-height:280px;overflow-y:auto">' + logs.map(l => `
                <div style="padding:8px 20px;border-bottom:1px solid var(--border-subtle);display:flex;gap:8px;align-items:center">
                  <span class="badge badge-${l.level === 'error' ? 'danger' : l.level === 'warn' ? 'warning' : 'info'}" style="font-size:10px">${l.level}</span>
                  <span style="font-size:11px;color:var(--text-muted);font-family:'Fira Code',monospace">${l.source}</span>
                  <span style="font-size:12.5px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.message?.substring(0,60) || ''}</span>
                </div>
              `).join('') + '</div>'
            }
          </div>
        </div>
      </div>

      <!-- AI Sunucu Kurulum -->
      ${stats.ai?.enabled ? `
      <div style="margin-top:24px">
        <div class="section-title">${svgIcon('cpu')} AI ile Sunucu Kur</div>
        <div class="card">
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">
            Sunucunuzu yapay zeka ile sifirdan yapilandirin. Roller, kanallar, kategoriler, izinler — hepsini tek seferde olusturur.
          </p>
          <div class="form-group">
            <textarea class="form-textarea" id="aiSetupPrompt" rows="3" placeholder="Ornek: 500 kisilik bir gaming toplulugi icin sunucu kur. Kurucu, admin, moderator, VIP, uye rolleri olsun. Genel sohbet, duyurular, kurallar, oyun kanallari (Valorant, CS2, LoL), medya paylasim, muzik-bot ve moderasyon kategorileri olsun. Moderasyon kanallarina sadece yetkililer erissin."></textarea>
          </div>
          <div class="form-row" style="margin-bottom:14px">
            <div>
              <span style="font-size:13px;font-weight:500;color:var(--danger)">Mevcut yapilari temizle</span>
              <p style="font-size:11px;color:var(--text-muted)">Mevcut roller ve kanallar silinir, sifirdan olusturulur</p>
            </div>
            <button class="toggle" id="aiSetupClear" onclick="this.classList.toggle('active')"></button>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" id="aiSetupBtn" onclick="aiSetupServer()">${svgIcon('cpu')} Sunucuyu Kur</button>
          </div>
          <div id="aiSetupResult" style="margin-top:12px"></div>
        </div>
      </div>
      ` : `
      <div style="margin-top:24px">
        <div class="section-title">${svgIcon('cpu')} AI ile Sunucu Kur</div>
        <div class="card">
          <p style="color:var(--text-muted);font-size:13px">AI ile sunucu kurulumu icin once <a href="/ai-settings" data-link>Yapay Zeka ayarlarindan</a> AI'yi aktif edin.</p>
        </div>
      </div>
      `}
    `;
  } catch (e) {
    document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function aiSetupServer() {
  const prompt = document.getElementById('aiSetupPrompt')?.value?.trim();
  if (!prompt) { showToast('Lutfen sunucuyu anlatın', 'error'); return; }

  const guildId = localStorage.getItem('selectedGuild');
  if (!guildId) { showToast('Lutfen bir sunucu secin', 'error'); return; }

  const clearExisting = document.getElementById('aiSetupClear')?.classList.contains('active');

  if (clearExisting) {
    if (!confirm('UYARI: Mevcut tum roller ve kanallar silinecek!\nSunucu sifirdan olusturulacak.\n\nDevam etmek istiyor musunuz?')) return;
    if (!confirm('EMIN MISINIZ? Bu islem geri alinamaz!')) return;
  }

  const btn = document.getElementById('aiSetupBtn');
  const result = document.getElementById('aiSetupResult');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;margin:0"></div> AI sunucuyu kuruyor... (bu islem 1-2 dakika surebilir)';
  result.innerHTML = '<div class="alert alert-info">AI sunucu yapisini planlıyor ve olusturuyor, lutfen bekleyin...</div>';

  try {
    const res = await API.post(`/api/guilds/${guildId}/ai-setup`, { prompt, clearExisting });
    if (res.success) {
      let html = `<div class="alert alert-success"><strong>${res.roles} rol</strong> ve <strong>${res.channels} kanal</strong> olusturuldu!</div>`;

      if (res.errors?.length) {
        html += `<div class="alert alert-warning" style="margin-top:8px"><strong>${res.errors.length} uyari:</strong><br>${res.errors.map(e => '- ' + e).join('<br>')}</div>`;
      }

      // Plan detayi
      if (res.plan) {
        html += `<div class="card" style="margin-top:12px;padding:12px">
          <div class="card-title" style="margin-bottom:8px">Olusturulan Yapilar</div>
          <div style="display:flex;gap:20px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Roller (${res.plan.roles?.length || 0})</div>
              ${(res.plan.roles||[]).map(r => `<div style="font-size:12px;padding:2px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.color};margin-right:6px;vertical-align:middle"></span>${r.name}</div>`).join('')}
            </div>
            <div style="flex:1;min-width:200px">
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Kanallar (${res.plan.channels?.length || 0})</div>
              ${(res.plan.channels||[]).map(c => `<div style="font-size:12px;padding:2px 0;color:var(--text-secondary)">${c.type==='category'?'> '+c.name.toUpperCase() : (c.type==='voice'?'🔊 ':'# ')+c.name}</div>`).join('')}
            </div>
          </div>
        </div>`;
      }

      result.innerHTML = html;
      showToast(`Sunucu kuruldu: ${res.roles} rol, ${res.channels} kanal`);
    } else {
      result.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
    }
  } catch(e) {
    result.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${svgIcon('cpu')} Sunucuyu Kur`;
  }
}
