const fs = require('fs');
const path = require('path');
const { query } = require('../db');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let minLevel = 'info';
let logFilePath = null;
let logReady = false;

// Dosyaya aninda yaz (sync - buffer yok, canli yazilir)
function writeToFile(text) {
  if (!logReady || !logFilePath) return;
  try {
    fs.appendFileSync(logFilePath, text + '\n');
  } catch {}
}

// Log dosyasini baslat
function initFileLog() {
  if (logReady) return;

  const logsDir = path.join(__dirname, '..', '..', 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  logFilePath = path.join(logsDir, `${date}.log`);
  logReady = true;

  // Baslangic ayirici
  const sep = [
    '',
    '='.repeat(80),
    `[${new Date().toISOString()}] FyDCBot BASLADI - PID: ${process.pid}`,
    `Node: ${process.version} | Platform: ${process.platform} ${process.arch}`,
    `CWD: ${process.cwd()}`,
    '='.repeat(80),
  ].join('\n');
  writeToFile(sep);

  // Yakalanmamis hatalari dosyaya yaz
  process.on('uncaughtException', (err) => {
    const msg = formatFull('error', 'UNCAUGHT', `${err.message}\n${err.stack}`);
    writeToFile(msg);
    console.error(msg);
  });

  process.on('unhandledRejection', (reason) => {
    const msg = formatFull('error', 'UNHANDLED', `${reason?.message || reason}\n${reason?.stack || ''}`);
    writeToFile(msg);
    console.error(msg);
  });

  process.on('exit', () => {
    writeToFile(`[${new Date().toISOString()}] FyDCBot KAPANDI`);
  });
}

function setLevel(level) {
  if (level in LOG_LEVELS) minLevel = level;
}

function shouldLog(level) {
  return (LOG_LEVELS[level] || 0) >= (LOG_LEVELS[minLevel] || 0);
}

// Konsol formati: kisa
function formatShort(level, source, message) {
  const time = new Date().toISOString().substring(11, 19);
  const tag = level.toUpperCase().padEnd(5);
  return `[${time}] [${tag}] [${source}] ${message}`;
}

// Dosya formati: detayli
function formatFull(level, source, message, extra = {}) {
  const ts = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  const mem = process.memoryUsage();
  const memMB = Math.round(mem.rss / 1024 / 1024);
  let line = `[${ts}] [${tag}] [${source}] ${message} (mem:${memMB}MB)`;

  if (extra.guildId) line += ` guild:${extra.guildId}`;
  if (extra.userId) line += ` user:${extra.userId}`;
  if (extra.metadata) line += ` meta:${JSON.stringify(extra.metadata)}`;

  return line;
}

// Konsola yaz + dosyaya yaz + DB'ye kaydet
async function log(level, source, message, extra = {}) {
  if (!shouldLog(level)) return;

  // Konsol (kisa format)
  const short = formatShort(level, source, message);
  if (level === 'error') console.error(short);
  else if (level === 'warn') console.warn(short);
  else console.log(short);

  // Dosyaya ANINDA yaz (sync)
  const full = formatFull(level, source, message, extra);
  writeToFile(full);

  // DB'ye kaydet
  try {
    await query(
      'INSERT INTO logs (level, source, message, guild_id, user_id, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
      [level, source, message, extra.guildId || null, extra.userId || null, extra.metadata ? JSON.stringify(extra.metadata) : null]
    );
  } catch {
    // DB henuz hazir degilse sessizce devam
  }
}

// stderr yakalama
function captureStdErr() {
  const origWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk, encoding, cb) => {
    origWrite(chunk, encoding, cb);
    const text = typeof chunk === 'string' ? chunk : chunk.toString();
    if (text.trim()) {
      writeToFile(`[${new Date().toISOString()}] [STDERR] ${text.trimEnd()}`);
    }
  };
}

// Kisayollar
const info = (source, msg, extra) => log('info', source, msg, extra);
const warn = (source, msg, extra) => log('warn', source, msg, extra);
const error = (source, msg, extra) => log('error', source, msg, extra);
const debug = (source, msg, extra) => log('debug', source, msg, extra);

function getLogFilePath() { return logFilePath; }

// Son N satiri oku
function tailLog(lines = 100) {
  if (!logFilePath || !fs.existsSync(logFilePath)) return '';
  const content = fs.readFileSync(logFilePath, 'utf-8');
  const allLines = content.split('\n');
  return allLines.slice(-lines).join('\n');
}

// Tum log dosyalarini listele
function listLogFiles() {
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  if (!fs.existsSync(logsDir)) return [];
  return fs.readdirSync(logsDir)
    .filter(f => f.endsWith('.log'))
    .map(f => {
      const stat = fs.statSync(path.join(logsDir, f));
      return { name: f, size: stat.size, modified: stat.mtime };
    })
    .sort((a, b) => b.modified - a.modified);
}

module.exports = { log, info, warn, error, debug, setLevel, initFileLog, captureStdErr, getLogFilePath, tailLog, listLogFiles };
