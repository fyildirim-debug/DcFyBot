const { query } = require('../db');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let minLevel = 'info';

function setLevel(level) {
  if (level in LOG_LEVELS) minLevel = level;
}

function shouldLog(level) {
  return (LOG_LEVELS[level] || 0) >= (LOG_LEVELS[minLevel] || 0);
}

function formatMessage(level, source, message) {
  const time = new Date().toISOString().substring(11, 19);
  const tag = level.toUpperCase().padEnd(5);
  return `[${time}] [${tag}] [${source}] ${message}`;
}

// Konsola yaz + DB'ye kaydet
async function log(level, source, message, extra = {}) {
  if (!shouldLog(level)) return;

  // Konsol
  const formatted = formatMessage(level, source, message);
  if (level === 'error') console.error(formatted);
  else if (level === 'warn') console.warn(formatted);
  else console.log(formatted);

  // DB'ye kaydet (hata olursa sessizce gec - db hazir olmayabilir)
  try {
    await query(
      'INSERT INTO logs (level, source, message, guild_id, user_id, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
      [level, source, message, extra.guildId || null, extra.userId || null, extra.metadata ? JSON.stringify(extra.metadata) : null]
    );
  } catch {
    // DB henuz hazir degilse sessizce devam
  }
}

// Kisayollar
const info = (source, msg, extra) => log('info', source, msg, extra);
const warn = (source, msg, extra) => log('warn', source, msg, extra);
const error = (source, msg, extra) => log('error', source, msg, extra);
const debug = (source, msg, extra) => log('debug', source, msg, extra);

module.exports = { log, info, warn, error, debug, setLevel };
