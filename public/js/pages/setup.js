// Setup Wizard Page
function SetupPage() {
  let step = 1;
  let data = { language: 'tr', admin: {}, discord: {}, ai: { skip: true } };

  function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="setup-container">
        <div class="setup-card">
          <div class="setup-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </div>
          <h2 class="setup-title">${I18n.t('setup.title')}</h2>
          <p class="setup-desc">${I18n.t('setup.welcome')}</p>

          <div class="setup-steps">
            ${[1,2,3,4,5].map(s => `<div class="setup-step ${s === step ? 'active' : s < step ? 'done' : ''}">${s}</div>`).join('')}
          </div>

          <div id="stepContent"></div>
        </div>
      </div>
    `;
    renderStep();
  }

  function renderStep() {
    const el = document.getElementById('stepContent');
    if (!el) return;

    switch(step) {
      case 1: el.innerHTML = stepLanguage(); break;
      case 2: el.innerHTML = stepAdmin(); break;
      case 3: el.innerHTML = stepDiscord(); break;
      case 4: el.innerHTML = stepAI(); break;
      case 5: el.innerHTML = stepComplete(); doSetup(); break;
    }
  }

  function stepLanguage() {
    return `
      <h3 style="margin-bottom:16px">${I18n.t('setup.step1Title')}</h3>
      <div class="form-group">
        <label class="form-label">${I18n.t('setup.language')}</label>
        <select class="form-select" id="setupLang" onchange="SetupPage._setLang(this.value)">
          <option value="tr" ${data.language==='tr'?'selected':''}>Turkce</option>
          <option value="en" ${data.language==='en'?'selected':''}>English</option>
        </select>
      </div>
      <div class="btn-group" style="margin-top:24px;justify-content:flex-end">
        <button class="btn btn-primary" onclick="SetupPage._next()">${I18n.t('common.next')}</button>
      </div>
    `;
  }

  function stepAdmin() {
    return `
      <h3 style="margin-bottom:16px">${I18n.t('setup.step2Title')}</h3>
      <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">${I18n.t('setup.step2Desc')}</p>
      <div class="form-group">
        <label class="form-label">${I18n.t('setup.adminUsername')}</label>
        <input class="form-input" id="adminUser" value="${data.admin.username||'admin'}" />
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('setup.adminPassword')}</label>
        <input class="form-input" type="password" id="adminPass" value="${data.admin.password||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('setup.adminPasswordConfirm')}</label>
        <input class="form-input" type="password" id="adminPass2" />
      </div>
      <div id="adminError" class="alert alert-danger" style="display:none"></div>
      <div class="btn-group" style="margin-top:24px;justify-content:space-between">
        <button class="btn btn-secondary" onclick="SetupPage._prev()">${I18n.t('common.back')}</button>
        <button class="btn btn-primary" onclick="SetupPage._saveAdmin()">${I18n.t('common.next')}</button>
      </div>
    `;
  }

  function stepDiscord() {
    return `
      <h3 style="margin-bottom:16px">${I18n.t('setup.step3Title')}</h3>
      <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">${I18n.t('setup.step3Desc')}</p>
      <div class="form-group">
        <label class="form-label">${I18n.t('setup.discordToken')}</label>
        <input class="form-input" id="discordToken" type="password" value="${data.discord.token||''}" />
        <p class="form-hint">${I18n.t('setup.discordTokenHelp')}</p>
      </div>
      <div class="form-group">
        <label class="form-label">${I18n.t('setup.discordClientId')}</label>
        <input class="form-input" id="discordClientId" value="${data.discord.clientId||''}" />
        <p class="form-hint">${I18n.t('setup.discordClientIdHelp')}</p>
      </div>
      <div class="btn-group" style="margin-top:24px;justify-content:space-between">
        <button class="btn btn-secondary" onclick="SetupPage._prev()">${I18n.t('common.back')}</button>
        <button class="btn btn-primary" onclick="SetupPage._saveDiscord()">${I18n.t('common.next')}</button>
      </div>
    `;
  }

  function stepAI() {
    return `
      <h3 style="margin-bottom:16px">${I18n.t('setup.step4Title')}</h3>
      <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">${I18n.t('setup.step4Desc')}</p>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <span>${I18n.t('ai.enabled')}</span>
        <button class="toggle ${!data.ai.skip?'active':''}" onclick="SetupPage._toggleAI()"></button>
      </div>

      <div id="aiFields" style="display:${data.ai.skip?'none':'block'}">
        <div class="form-group">
          <label class="form-label">${I18n.t('ai.provider')}</label>
          <select class="form-select" id="aiProvider">
            <option value="anthropic">${I18n.t('ai.providerAnthropic')}</option>
            <option value="openai">${I18n.t('ai.providerOpenAI')}</option>
            <option value="custom">${I18n.t('ai.providerCustom')}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('ai.baseUrl')}</label>
          <input class="form-input" id="aiBaseUrl" placeholder="https://api.anthropic.com" />
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('ai.apiKey')}</label>
          <input class="form-input" type="password" id="aiApiKey" />
        </div>
        <div class="form-group">
          <label class="form-label">${I18n.t('ai.model')}</label>
          <input class="form-input" id="aiModel" placeholder="claude-sonnet-4-20250514" />
        </div>
      </div>

      <div class="btn-group" style="margin-top:24px;justify-content:space-between">
        <button class="btn btn-secondary" onclick="SetupPage._prev()">${I18n.t('common.back')}</button>
        <button class="btn btn-primary" onclick="SetupPage._saveAI()">${I18n.t('common.next')}</button>
      </div>
    `;
  }

  function stepComplete() {
    return `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:16px">&#10003;</div>
        <h3>${I18n.t('setup.step5Title')}</h3>
        <p style="color:var(--text-secondary);margin-top:8px">${I18n.t('setup.setupComplete')}</p>
        <div class="spinner" style="margin:24px auto"></div>
      </div>
    `;
  }

  async function doSetup() {
    try {
      const res = await API.post('/api/setup/complete', data);
      if (res.token) {
        localStorage.setItem('token', res.token);
        setTimeout(() => Router.navigate('/dashboard'), 2000);
      } else {
        alert(res.error || 'Kurulum hatasi');
        step = 1; render();
      }
    } catch (e) {
      alert('Kurulum hatasi: ' + e.message);
      step = 1; render();
    }
  }

  // Public methods
  return {
    render,
    _next() { step++; render(); },
    _prev() { step--; render(); },
    async _setLang(lang) {
      data.language = lang;
      await I18n.load(lang);
      I18n.setLang(lang);
      render();
    },
    _saveAdmin() {
      const u = document.getElementById('adminUser')?.value;
      const p = document.getElementById('adminPass')?.value;
      const p2 = document.getElementById('adminPass2')?.value;
      if (!u || !p) return;
      if (p !== p2) {
        const err = document.getElementById('adminError');
        if (err) { err.style.display = 'block'; err.textContent = I18n.t('setup.passwordMismatch'); }
        return;
      }
      data.admin = { username: u, password: p };
      step++; render();
    },
    _saveDiscord() {
      data.discord = {
        token: document.getElementById('discordToken')?.value || '',
        clientId: document.getElementById('discordClientId')?.value || ''
      };
      step++; render();
    },
    _toggleAI() {
      data.ai.skip = !data.ai.skip;
      render(); // Re-render step 4
      step = 4; renderStep();
    },
    _saveAI() {
      if (!data.ai.skip) {
        data.ai = {
          skip: false,
          enabled: true,
          provider: document.getElementById('aiProvider')?.value || 'anthropic',
          baseUrl: document.getElementById('aiBaseUrl')?.value || '',
          apiKey: document.getElementById('aiApiKey')?.value || '',
          model: document.getElementById('aiModel')?.value || ''
        };
      }
      step++; render();
    }
  };
}

// Singleton
const SetupPage = new (function() { Object.assign(this, SetupPage()); })();
