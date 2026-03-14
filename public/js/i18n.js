// Client-side i18n
const I18n = {
  _data: {},
  _lang: 'tr',

  async load(lang) {
    try {
      const res = await fetch(`/api/i18n/${lang || this._lang}`);
      this._data = await res.json();
      this._lang = lang || this._lang;
    } catch {
      console.warn('Dil dosyasi yuklenemedi');
    }
  },

  t(key, replacements = {}) {
    const keys = key.split('.');
    let val = this._data;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) val = val[k];
      else return key;
    }
    if (typeof val !== 'string') return key;
    return val.replace(/\{(\w+)\}/g, (_, k) => replacements[k] ?? `{${k}}`);
  },

  getLang() { return this._lang; },

  setLang(lang) {
    this._lang = lang;
    localStorage.setItem('lang', lang);
  }
};
