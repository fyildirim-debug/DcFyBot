const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('../config');
const { setupCheck } = require('./middleware/auth');
const { getAllTranslations, getAvailableLanguages } = require('../langs/i18n');

function createServer() {
  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());
  app.use(setupCheck(config));

  // Static dosyalar
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));

  // i18n endpoint (auth gerektirmez)
  app.get('/api/i18n/:lang', (req, res) => {
    const translations = getAllTranslations(req.params.lang);
    res.json(translations);
  });

  app.get('/api/i18n', (req, res) => {
    res.json({ languages: getAvailableLanguages() });
  });

  // API Routes
  app.use('/api/setup', require('./routes/setup'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/settings', require('./routes/settings'));
  app.use('/api/stats', require('./routes/stats'));
  app.use('/api/guilds', require('./routes/guilds'));
  app.use('/api/channels', require('./routes/channels'));
  app.use('/api/members', require('./routes/members'));
  app.use('/api/roles', require('./routes/roles'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/wordfilter', require('./routes/wordfilter'));
  app.use('/api/backup', require('./routes/backup'));

  // Versiyon endpoint
  app.get('/api/version', (req, res) => {
    try {
      const v = require('../../.fy/version.json');
      res.json({ version: v.version });
    } catch { res.json({ version: '1.2.0.0' }); }
  });

  // Plugin web registry endpoint
  app.get('/api/plugins/registry', (req, res) => {
    try {
      const { getPluginWebRegistry } = require('../plugins/loader');
      res.json(getPluginWebRegistry());
    } catch { res.json([]); }
  });

  // SPA fallback - tum diger route'lar index.html'e yonlendir
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint bulunamadi' });
    }
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
  });

  // Hata yakalama
  app.use((err, req, res, next) => {
    console.error('[WEB] Hata:', err.message);
    res.status(500).json({ error: 'Sunucu hatasi' });
  });

  return app;
}

// Bot client'i route'lara bagla
function attachBotClient(client) {
  require('./routes/channels').setBotClient(client);
  require('./routes/members').setBotClient(client);
  require('./routes/roles').setBotClient(client);
  require('./routes/backup').setBotClient(client);
  require('./routes/stats').setBotClient(client);
  require('./routes/guilds').setBotClient(client);
  require('./routes/messages').setBotClient(client);
}

module.exports = { createServer, attachBotClient };
