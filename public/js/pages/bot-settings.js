async function renderBotSettings() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/bot-settings');
  try {
    const s = await API.get('/api/settings/bot');
    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('bot.title')}</h1>
          <p class="page-subtitle">Discord bot yapilandirmasi ve genel ayarlar</p>
        </div>
      </div>

      <div class="settings-layout">
        <!-- Sol: Ayarlar -->
        <div>
          <!-- Bot Kimlik Bilgileri -->
          <div class="section-title">Bot Kimlik Bilgileri</div>
          <div class="card">
            <div class="form-group">
              <label class="form-label">${I18n.t('bot.token')}</label>
              <input class="form-input mono" type="password" id="botToken" placeholder="${s.token_masked||'Bot token giriniz'}" />
              <p class="form-hint">${I18n.t('setup.discordTokenHelp')}</p>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">${I18n.t('bot.clientId')}</label>
                <input class="form-input mono" id="botClientId" value="${s.client_id||''}" />
              </div>
              <div class="form-group">
                <label class="form-label">${I18n.t('bot.prefix')}</label>
                <input class="form-input mono" id="botPrefix" value="${s.prefix||'!'}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">${I18n.t('setup.language')}</label>
              <select class="form-select" id="botLang">
                <option value="tr" ${s.language==='tr'?'selected':''}>Turkce</option>
                <option value="en" ${s.language==='en'?'selected':''}>English</option>
              </select>
            </div>
          </div>

          <!-- Aktivite Ayarlari -->
          <div class="section-title">Aktivite</div>
          <div class="card">
            <div class="form-group">
              <label class="form-label">${I18n.t('bot.activity')}</label>
              <input class="form-input" id="botActivity" value="${s.activity_message||''}" placeholder="FyDCBot ile yonetiliyor" />
            </div>
            <div class="form-group">
              <label class="form-label">${I18n.t('bot.activityType')}</label>
              <select class="form-select" id="botActivityType">
                <option value="WATCHING" ${s.activity_type==='WATCHING'?'selected':''}>Izliyor</option>
                <option value="PLAYING" ${s.activity_type==='PLAYING'?'selected':''}>Oynuyor</option>
                <option value="LISTENING" ${s.activity_type==='LISTENING'?'selected':''}>Dinliyor</option>
                <option value="COMPETING" ${s.activity_type==='COMPETING'?'selected':''}>Yarisiyor</option>
              </select>
            </div>
          </div>

          <!-- Karsilama -->
          <div class="section-title">${I18n.t('bot.welcome')}</div>
          <div class="card">
            <div class="form-row" style="margin-bottom:14px">
              <span style="font-size:14px;font-weight:500">${I18n.t('bot.welcomeEnabled')}</span>
              <button class="toggle ${s.welcome_enabled?'active':''}" id="welcomeToggle" onclick="this.classList.toggle('active')"></button>
            </div>
            <div class="form-group">
              <label class="form-label">${I18n.t('bot.welcomeMessage')}</label>
              <input class="form-input" id="botWelcomeMsg" value="${s.welcome_message||''}" placeholder="Hosgeldin {user}!" />
              <p class="form-hint">{user} = kullanici adi, {server} = sunucu adi</p>
            </div>
          </div>

          <!-- Kaydet -->
          <div class="btn-group">
            <button class="btn btn-primary" onclick="saveBotSettings()">${svgIcon('check')} ${I18n.t('common.save')}</button>
          </div>
          <div id="botMsg" style="margin-top:12px"></div>
        </div>

        <!-- Sag: Rehber Panel -->
        <div class="guide-panel">
          <div class="guide-panel-title">
            ${svgIcon('list')}
            ${I18n.t('bot.guideTitle')}
          </div>

          <div class="guide-step">
            <div class="guide-step-num">1</div>
            <div class="guide-step-title">${I18n.t('bot.guideStep1Title').replace(/^\d+\.\s*/, '')}</div>
            <div class="guide-step-desc">${I18n.t('bot.guideStep1Desc').replace('discord.com/developers/applications', '<a href="https://discord.com/developers/applications" target="_blank">discord.com/developers</a>')}</div>
          </div>

          <div class="guide-step">
            <div class="guide-step-num">2</div>
            <div class="guide-step-title">${I18n.t('bot.guideStep2Title').replace(/^\d+\.\s*/, '')}</div>
            <div class="guide-step-desc">${I18n.t('bot.guideStep2Desc')}</div>
          </div>

          <div class="guide-step">
            <div class="guide-step-num">3</div>
            <div class="guide-step-title">${I18n.t('bot.guideStep3Title').replace(/^\d+\.\s*/, '')}</div>
            <div class="guide-step-desc">${I18n.t('bot.guideStep3Desc')}</div>
          </div>

          <div class="guide-step">
            <div class="guide-step-num">4</div>
            <div class="guide-step-title">${I18n.t('bot.guideStep4Title').replace(/^\d+\.\s*/, '')}</div>
            <div class="guide-step-desc">${I18n.t('bot.guideStep4Desc')}</div>
          </div>

          <div class="guide-step">
            <div class="guide-step-num">5</div>
            <div class="guide-step-title">${I18n.t('bot.guideStep5Title').replace(/^\d+\.\s*/, '')}</div>
            <div class="guide-step-desc">${I18n.t('bot.guideStep5Desc')}</div>
          </div>

          <div class="guide-step">
            <div class="guide-step-num">6</div>
            <div class="guide-step-title">${I18n.t('bot.guideStep6Title').replace(/^\d+\.\s*/, '')}</div>
            <div class="guide-step-desc">${I18n.t('bot.guideStep6Desc')}</div>
          </div>

          <!-- Intents uyari kutusu -->
          <div class="guide-info-box">
            <div class="guide-info-box-title">
              ${svgIcon('warning')}
              ${I18n.t('bot.guideIntentsTitle')}
            </div>
            <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${I18n.t('bot.guideIntentsDesc')}</p>
            <div class="guide-info-item">${I18n.t('bot.guideIntentsPresence')}</div>
            <div class="guide-info-item">${I18n.t('bot.guideIntentsMembers')}</div>
            <div class="guide-info-item">${I18n.t('bot.guideIntentsMessage')}</div>
          </div>
        </div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function saveBotSettings() {
  const data = {
    token: document.getElementById('botToken')?.value || undefined,
    client_id: document.getElementById('botClientId')?.value,
    prefix: document.getElementById('botPrefix')?.value,
    language: document.getElementById('botLang')?.value,
    activity_message: document.getElementById('botActivity')?.value,
    activity_type: document.getElementById('botActivityType')?.value,
    welcome_enabled: document.getElementById('welcomeToggle')?.classList.contains('active'),
    welcome_message: document.getElementById('botWelcomeMsg')?.value
  };
  if (!data.token) delete data.token;
  try {
    await API.put('/api/settings/bot', data);
    showToast(I18n.t('common.operationSuccess'));
  } catch(e) {
    showToast(e.message, 'error');
  }
}
