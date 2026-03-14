async function renderAISetup() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/ai-setup');
  const guildId = localStorage.getItem('selectedGuild');

  try {
    const stats = await API.get('/api/stats');
    const aiEnabled = stats.ai?.enabled;

    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">AI ile Sunucu Kur</h1>
          <p class="page-subtitle">Yapay zeka ile sunucunuzu sifirdan yapilandirin</p>
        </div>
      </div>

      ${!guildId ? '<div class="alert alert-warning">Lutfen sol menuден bir sunucu secin</div>' :
        !aiEnabled ? `
        <div class="card">
          <div style="text-align:center;padding:32px">
            <svg fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" stroke-width="1.5" style="width:48px;height:48px;margin-bottom:16px;opacity:0.3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
            <h3 style="color:var(--text-heading);margin-bottom:8px">AI Aktif Degil</h3>
            <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Sunucu kurulumu icin once AI'yi aktif edin</p>
            <a href="/ai-settings" data-link class="btn btn-primary">Yapay Zeka Ayarlari</a>
          </div>
        </div>
      ` : `
        <div class="settings-layout">
          <div>
            <div class="card">
              <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
                Sunucunuzu anlatın — AI roller, kanallar, kategoriler ve izinleri tek seferde olusturacak.
              </p>
              <div class="form-group">
                <label class="form-label">Sunucunuzu Tanimlayin</label>
                <textarea class="form-textarea" id="aiSetupPrompt" rows="5" placeholder="Ornek: 500 kisilik bir gaming topluluğu icin sunucu kur.

Roller: Kurucu (kirmizi), Admin (turuncu), Moderator (mavi), VIP (altin), Uye (gri)

Kategoriler ve Kanallar:
- Genel: kurallar, duyurular, genel-sohbet, medya
- Oyunlar: valorant, cs2, lol, minecraft (her biri metin+ses)
- Topluluk: etkinlikler, onerillar, bug-rapor
- Moderasyon: mod-sohbet, log, ceza-kayit (sadece mod+admin erissin)
- Muzik: muzik-bot (ses kanali)

Moderasyon kanalarina sadece Moderator ve ustu erissin. VIP uyelerin ekstra bir ozel kanali olsun."></textarea>
              </div>

              <div class="danger-zone" style="margin-top:0;margin-bottom:16px">
                <div class="danger-zone-item" style="border:none;padding:8px 0">
                  <div class="desc">
                    <strong>Mevcut yapilari temizle</strong>
                    Onceki roller ve kanallar silinir, sifirdan olusturulur
                  </div>
                  <button class="toggle" id="aiSetupClear" onclick="this.classList.toggle('active')"></button>
                </div>
              </div>

              <button class="btn btn-primary" id="aiSetupBtn" onclick="aiSetupServer()" style="width:100%;justify-content:center">
                Sunucuyu Kur
              </button>
              <div id="aiSetupResult" style="margin-top:16px"></div>
            </div>
          </div>

          <!-- Sag: Rehber -->
          <div class="guide-panel">
            <div class="guide-panel-title">
              ${svgIcon('list')}
              Nasil Kullanilir?
            </div>

            <div class="guide-step">
              <div class="guide-step-num">1</div>
              <div class="guide-step-title">Sunucuyu Tanimlayin</div>
              <div class="guide-step-desc">Sunucunuzun amacini, hedef kitlesini ve boyutunu yazin.</div>
            </div>

            <div class="guide-step">
              <div class="guide-step-num">2</div>
              <div class="guide-step-title">Rolleri Belirtin</div>
              <div class="guide-step-desc">Hangi roller olsun, renkleri ve yetki seviyeleri ne olsun belirtin.</div>
            </div>

            <div class="guide-step">
              <div class="guide-step-num">3</div>
              <div class="guide-step-title">Kanallari Anlatın</div>
              <div class="guide-step-desc">Kategoriler ve altindaki kanallari, metin/ses ayrimi ve konulari yazin.</div>
            </div>

            <div class="guide-step">
              <div class="guide-step-num">4</div>
              <div class="guide-step-title">Izinleri Belirtin</div>
              <div class="guide-step-desc">Hangi kanala kim erisebilsin, ozel kanallar, moderasyon alanlari belirtin.</div>
            </div>

            <div class="guide-step">
              <div class="guide-step-num">5</div>
              <div class="guide-step-title">Olustur</div>
              <div class="guide-step-desc">AI plani olusturur ve uygular. Islem 1-2 dakika surebilir.</div>
            </div>

            <div class="guide-info-box">
              <div class="guide-info-box-title">
                ${svgIcon('warning')}
                Ipuclari
              </div>
              <div class="guide-info-item">Ne kadar detayli anlatirsan o kadar iyi sonuc</div>
              <div class="guide-info-item">Rol isimlerini ve renklerini belirtebilirsin</div>
              <div class="guide-info-item">Kanal izinlerini dogal dille anlat</div>
              <div class="guide-info-item">"Temizle" aciksa mevcut yapilar silinir</div>
            </div>
          </div>
        </div>
      `}
    `;
  } catch(e) {
    document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function aiSetupServer() {
  const prompt = document.getElementById('aiSetupPrompt')?.value?.trim();
  if (!prompt) { showToast('Lutfen sunucuyu anlatin', 'error'); return; }

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
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;margin:0"></div> AI sunucuyu kuruyor... (1-2 dakika surebilir)';
  result.innerHTML = '<div class="alert alert-info">AI sunucu yapisini planliyor ve olusturuyor, lutfen bekleyin...</div>';

  try {
    const res = await API.post(`/api/guilds/${guildId}/ai-setup`, { prompt, clearExisting });
    if (res.success) {
      let html = `<div class="alert alert-success"><strong>${res.roles} rol</strong> ve <strong>${res.channels} kanal</strong> olusturuldu!</div>`;

      if (res.errors?.length) {
        html += `<div class="alert alert-warning" style="margin-top:8px"><strong>${res.errors.length} uyari:</strong><br>${res.errors.map(e => '- ' + e).join('<br>')}</div>`;
      }

      if (res.plan) {
        html += `<div class="card" style="margin-top:12px;padding:16px">
          <div style="font-size:13px;font-weight:600;color:var(--text-heading);margin-bottom:12px">Olusturulan Yapilar</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Roller (${res.plan.roles?.length || 0})</div>
              ${(res.plan.roles||[]).map(r => `<div style="font-size:12px;padding:3px 0"><span class="role-dot" style="background:${r.color}"></span>${r.name}</div>`).join('')}
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Kanallar (${res.plan.channels?.length || 0})</div>
              ${(res.plan.channels||[]).map(c => {
                if (c.type === 'category') return `<div style="font-size:11px;padding:4px 0 2px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-top:6px">${c.name}</div>`;
                const icon = c.type === 'voice' ? '🔊' : '#';
                return `<div style="font-size:12px;padding:2px 0 2px 12px;color:var(--text-secondary)">${icon} ${c.name}</div>`;
              }).join('')}
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
    btn.innerHTML = 'Sunucuyu Kur';
  }
}
