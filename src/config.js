const { queryOne, query } = require('./db');

// Sistem ayarini oku
async function get(key, defaultValue = null) {
  try {
    const row = await queryOne('SELECT value FROM system_settings WHERE key = $1', [key]);
    if (!row) return defaultValue;

    // JSON parse dene
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  } catch {
    return defaultValue;
  }
}

// Sistem ayarini yaz
async function set(key, value) {
  const strValue = typeof value === 'string' ? value : JSON.stringify(value);
  await query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, strValue]
  );
}

// Birden fazla ayar oku
async function getMany(keys) {
  const result = {};
  for (const key of keys) {
    result[key] = await get(key);
  }
  return result;
}

// Kurulum tamamlandi mi?
async function isSetupComplete() {
  return (await get('setup_complete')) === true;
}

// Bot ayarlarini oku
async function getBotSettings() {
  return await queryOne('SELECT * FROM bot_settings WHERE id = 1');
}

// AI ayarlarini oku
async function getAISettings() {
  return await queryOne('SELECT * FROM ai_settings WHERE id = 1');
}

module.exports = { get, set, getMany, isSetupComplete, getBotSettings, getAISettings };
