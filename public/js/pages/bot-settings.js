async function renderBotSettings() {
  renderLayout('<div class="spinner"></div>', '/bot-settings');
  try {
    const s = await API.get('/api/settings/bot');
    document.querySelector('.main-content').innerHTML = `
      <div class="page-header"><h1 class="page-title">${I18n.t('bot.title')}</h1></div>
      <div style="max-width:640px">
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">${I18n.t('bot.title')}</div>
          <div class="form-group">
            <label class="form-label">${I18n.t('bot.token')}</label>
            <input class="form-input" type="password" id="botToken" placeholder="${s.token_masked||''}" />
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('bot.clientId')}</label>
            <input class="form-input" id="botClientId" value="${s.client_id||''}" />
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('bot.prefix')}</label>
            <input class="form-input" id="botPrefix" value="${s.prefix||'!'}" />
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('setup.language')}</label>
            <select class="form-select" id="botLang">
              <option value="tr" ${s.language==='tr'?'selected':''}>Turkce</option>
              <option value="en" ${s.language==='en'?'selected':''}>English</option>
            </select>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">${I18n.t('bot.activity')}</div>
          <div class="form-group">
            <label class="form-label">${I18n.t('bot.activity')}</label>
            <input class="form-input" id="botActivity" value="${s.activity_message||''}" />
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
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">${I18n.t('bot.welcome')}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span>${I18n.t('bot.welcomeEnabled')}</span>
            <button class="toggle ${s.welcome_enabled?'active':''}" id="welcomeToggle" onclick="this.classList.toggle('active')"></button>
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('bot.welcomeMessage')}</label>
            <input class="form-input" id="botWelcomeMsg" value="${s.welcome_message||''}" />
            <p class="form-hint">{user} = kullanici adi</p>
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="saveBotSettings()">${I18n.t('common.save')}</button>
        </div>
        <div id="botMsg" style="margin-top:12px"></div>
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
    document.getElementById('botMsg').innerHTML = `<div class="alert alert-success">${I18n.t('common.operationSuccess')}</div>`;
  } catch(e) {
    document.getElementById('botMsg').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}
