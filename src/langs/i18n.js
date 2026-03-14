const fs = require('fs');
const path = require('path');

const langsDir = path.join(__dirname);
const languages = {};
let currentLang = 'tr';

// Dil dosyalarini yukle
function loadLanguages() {
  const files = fs.readdirSync(langsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const lang = file.replace('.json', '');
    languages[lang] = JSON.parse(fs.readFileSync(path.join(langsDir, file), 'utf-8'));
  }
}

// Eklenti dil dosyasini yukle
function loadPluginLanguage(pluginName, langDir) {
  const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const lang = file.replace('.json', '');
    if (!languages[lang]) languages[lang] = {};
    if (!languages[lang].plugins) languages[lang].plugins = {};
    languages[lang].plugins[pluginName] = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf-8'));
  }
}

function setLanguage(lang) {
  if (languages[lang]) {
    currentLang = lang;
    return true;
  }
  return false;
}

function getLanguage() {
  return currentLang;
}

function getAvailableLanguages() {
  return Object.keys(languages);
}

// Ceviri getir - t('nav.dashboard') veya t('plugins.github.commitNew')
function t(key, replacements = {}) {
  const keys = key.split('.');
  let value = languages[currentLang];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback: en
      value = languages['en'];
      for (const fk of keys) {
        if (value && typeof value === 'object' && fk in value) {
          value = value[fk];
        } else {
          return key;
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') return key;

  return value.replace(/\{(\w+)\}/g, (_, k) => replacements[k] ?? `{${k}}`);
}

// Tum dil verisini getir (frontend icin)
function getAllTranslations(lang) {
  return languages[lang || currentLang] || languages['tr'];
}

loadLanguages();

module.exports = { t, setLanguage, getLanguage, getAvailableLanguages, loadPluginLanguage, getAllTranslations, loadLanguages };
