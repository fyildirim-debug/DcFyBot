async function renderAISettings() {
  renderLayout('<div class="spinner"></div>', '/ai-settings');
  try {
    const s = await API.get('/api/settings/ai');
    document.querySelector('.main-content').innerHTML = `
      <div class="page-header"><h1 class="page-title">${I18n.t('ai.title')}</h1></div>
      <div style="max-width:640px">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div><strong>${I18n.t('ai.enabled')}</strong><br><span style="font-size:12px;color:var(--text-secondary)">AI destekli komutlar ve sohbet</span></div>
            <button class="toggle ${s.enabled?'active':''}" id="aiToggle" onclick="this.classList.toggle('active')"></button>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">${I18n.t('ai.provider')}</div>
          <div class="form-group">
            <label class="form-label">${I18n.t('ai.provider')}</label>
            <select class="form-select" id="aiProvider">
              <option value="anthropic" ${s.provider==='anthropic'?'selected':''}>${I18n.t('ai.providerAnthropic')}</option>
              <option value="openai" ${s.provider==='openai'?'selected':''}>${I18n.t('ai.providerOpenAI')}</option>
              <option value="custom" ${s.provider==='custom'?'selected':''}>${I18n.t('ai.providerCustom')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('ai.baseUrl')}</label>
            <input class="form-input" id="aiBaseUrl" value="${s.base_url||''}" placeholder="https://api.anthropic.com" />
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('ai.apiKey')}</label>
            <input class="form-input" type="password" id="aiApiKey" placeholder="${s.api_key_masked||'API anahtarinizi girin'}" />
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('ai.model')}</label>
            <input class="form-input" id="aiModel" value="${s.model||''}" />
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">${I18n.t('common.settings')}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="form-group">
              <label class="form-label">${I18n.t('ai.maxTokens')}</label>
              <input class="form-input" type="number" id="aiMaxTokens" value="${s.max_tokens||1024}" />
            </div>
            <div class="form-group">
              <label class="form-label">${I18n.t('ai.temperature')}</label>
              <input class="form-input" type="number" step="0.1" min="0" max="2" id="aiTemp" value="${s.temperature??0.7}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('ai.systemPrompt')}</label>
            <textarea class="form-textarea" id="aiPrompt" rows="4">${s.system_prompt||''}</textarea>
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="saveAISettings()">${I18n.t('common.save')}</button>
          <button class="btn btn-secondary" onclick="testAIConnection()">${I18n.t('ai.testConnection')}</button>
        </div>
        <div id="aiMsg" style="margin-top:12px"></div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function saveAISettings() {
  const data = {
    enabled: document.getElementById('aiToggle')?.classList.contains('active'),
    provider: document.getElementById('aiProvider')?.value,
    base_url: document.getElementById('aiBaseUrl')?.value,
    api_key: document.getElementById('aiApiKey')?.value || undefined,
    model: document.getElementById('aiModel')?.value,
    max_tokens: parseInt(document.getElementById('aiMaxTokens')?.value) || 1024,
    temperature: parseFloat(document.getElementById('aiTemp')?.value) || 0.7,
    system_prompt: document.getElementById('aiPrompt')?.value
  };
  try {
    await API.put('/api/settings/ai', data);
    document.getElementById('aiMsg').innerHTML = `<div class="alert alert-success">${I18n.t('common.operationSuccess')}</div>`;
  } catch(e) {
    document.getElementById('aiMsg').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function testAIConnection() {
  document.getElementById('aiMsg').innerHTML = '<div class="spinner"></div>';
  try {
    const res = await API.post('/api/settings/ai/test');
    document.getElementById('aiMsg').innerHTML = res.success
      ? `<div class="alert alert-success">${I18n.t('ai.testSuccess')}</div>`
      : `<div class="alert alert-danger">${I18n.t('ai.testFail')}: ${res.error}</div>`;
  } catch(e) {
    document.getElementById('aiMsg').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}
