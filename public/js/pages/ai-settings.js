async function renderAISettings() {
  renderLayout('<div class="loading-overlay"><div class="spinner"></div></div>', '/ai-settings');
  try {
    const s = await API.get('/api/settings/ai');
    document.querySelector('.main-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${I18n.t('ai.title')}</h1>
          <p class="page-subtitle">AI saglayici, model ve parametre ayarlari</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="testAIConnection()">${svgIcon('cpu')} ${I18n.t('ai.testConnection')}</button>
      </div>

      <div style="max-width:640px">
        <!-- Aktif/Pasif -->
        <div class="card">
          <div class="form-row">
            <div>
              <strong style="font-size:14px">${I18n.t('ai.enabled')}</strong>
              <p style="font-size:12px;color:var(--text-muted);margin-top:2px">AI destekli komutlar, sohbet ve otomatik islemler</p>
            </div>
            <button class="toggle ${s.enabled?'active':''}" id="aiToggle" onclick="this.classList.toggle('active')"></button>
          </div>
        </div>

        <!-- Saglayici -->
        <div class="section-title">${I18n.t('ai.provider')}</div>
        <div class="card">
          <div class="form-group">
            <label class="form-label">${I18n.t('ai.provider')}</label>
            <select class="form-select" id="aiProvider" onchange="onProviderChange()">
              <option value="anthropic" ${s.provider==='anthropic'?'selected':''}>${I18n.t('ai.providerAnthropic')}</option>
              <option value="openai" ${s.provider==='openai'?'selected':''}>${I18n.t('ai.providerOpenAI')}</option>
              <option value="custom" ${s.provider==='custom'?'selected':''}>${I18n.t('ai.providerCustom')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('ai.baseUrl')}</label>
            <input class="form-input mono" id="aiBaseUrl" value="${s.base_url||''}" placeholder="https://api.anthropic.com" />
            <p class="form-hint" id="baseUrlHint">Varsayilan: saglayiciya gore otomatik ayarlanir</p>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">${I18n.t('ai.apiKey')}</label>
              <input class="form-input mono" type="password" id="aiApiKey" placeholder="${s.api_key_masked||'sk-...'}" />
            </div>
            <div class="form-group">
              <label class="form-label">${I18n.t('ai.model')}</label>
              <input class="form-input mono" id="aiModel" value="${s.model||''}" placeholder="claude-sonnet-4-20250514" />
            </div>
          </div>
        </div>

        <!-- Parametreler -->
        <div class="section-title">Parametreler</div>
        <div class="card">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">${I18n.t('ai.maxTokens')}</label>
              <input class="form-input mono" type="number" id="aiMaxTokens" value="${s.max_tokens||1024}" />
              <p class="form-hint">Yanit uzunlugu limiti</p>
            </div>
            <div class="form-group">
              <label class="form-label">${I18n.t('ai.temperature')}</label>
              <input class="form-input mono" type="number" step="0.1" min="0" max="2" id="aiTemp" value="${s.temperature??0.7}" />
              <p class="form-hint">0 = kesin, 2 = yaratici</p>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${I18n.t('ai.systemPrompt')}</label>
            <textarea class="form-textarea mono" id="aiPrompt" rows="4" placeholder="Sen FyDCBot'un AI asistanisin...">${s.system_prompt||''}</textarea>
            <p class="form-hint">Botun kisiligini ve davranisini belirleyen yonerge</p>
          </div>
        </div>

        <!-- Kaydet + Test -->
        <div class="btn-group">
          <button class="btn btn-primary" onclick="saveAISettings()">${svgIcon('check')} ${I18n.t('common.save')}</button>
          <button class="btn btn-secondary" onclick="testAIConnection()">${I18n.t('ai.testConnection')}</button>
        </div>
        <div id="aiMsg" style="margin-top:12px"></div>
      </div>
    `;
  } catch(e) { document.querySelector('.main-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function onProviderChange() {
  const provider = document.getElementById('aiProvider')?.value;
  const urlInput = document.getElementById('aiBaseUrl');
  const modelInput = document.getElementById('aiModel');
  const hint = document.getElementById('baseUrlHint');

  if (provider === 'anthropic') {
    urlInput.placeholder = 'https://api.anthropic.com';
    modelInput.placeholder = 'claude-sonnet-4-20250514';
    if (hint) hint.textContent = 'Bos birakirsaniz Anthropic API kullanilir';
  } else if (provider === 'openai') {
    urlInput.placeholder = 'https://api.openai.com/v1';
    modelInput.placeholder = 'gpt-4o';
    if (hint) hint.textContent = 'Bos birakirsaniz OpenAI API kullanilir';
  } else {
    urlInput.placeholder = 'https://your-api.com/v1';
    modelInput.placeholder = 'model-adi';
    if (hint) hint.textContent = 'OpenAI uyumlu API endpoint girin';
  }
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
    showToast(I18n.t('common.operationSuccess'));
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function testAIConnection() {
  const msgEl = document.getElementById('aiMsg');
  if (msgEl) msgEl.innerHTML = '<div class="spinner" style="margin:8px 0"></div>';
  try {
    const res = await API.post('/api/settings/ai/test');
    if (msgEl) msgEl.innerHTML = res.success
      ? `<div class="alert alert-success">${I18n.t('ai.testSuccess')}</div>`
      : `<div class="alert alert-danger">${I18n.t('ai.testFail')}: ${res.error}</div>`;
  } catch(e) {
    if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}
