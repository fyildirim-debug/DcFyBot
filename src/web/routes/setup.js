const { Router } = require('express');
const { queryOne, query } = require('../../db');
const config = require('../../config');
const { hashPassword, createToken } = require('../middleware/auth');
const { setLanguage } = require('../../langs/i18n');
const logger = require('../../utils/logger');

const router = Router();

// GET /api/setup/status - Kurulum durumu
router.get('/status', async (req, res) => {
  try {
    const isComplete = await config.isSetupComplete();
    res.json({ setup_complete: isComplete });
  } catch {
    res.json({ setup_complete: false });
  }
});

// POST /api/setup/complete - Kurulumu tamamla
router.post('/complete', async (req, res) => {
  try {
    // Zaten kurulu mu?
    const isComplete = await config.isSetupComplete();
    if (isComplete) {
      return res.status(400).json({ error: 'Kurulum zaten tamamlanmis' });
    }

    const { language, admin, discord, ai } = req.body;

    // 1. Dil ayari
    if (language) {
      setLanguage(language);
      await config.set('language', language);
    }

    // 2. Admin hesabi
    if (!admin?.username || !admin?.password) {
      return res.status(400).json({ error: 'Admin kullanici adi ve sifre gerekli' });
    }

    const existing = await queryOne('SELECT id FROM admin_users WHERE username = $1', [admin.username]);
    if (!existing) {
      await query(
        'INSERT INTO admin_users (username, password_hash, role) VALUES ($1, $2, $3)',
        [admin.username, hashPassword(admin.password), 'admin']
      );
    }

    // 3. Discord bot ayarlari
    if (discord?.token && discord?.clientId) {
      await query(
        'UPDATE bot_settings SET token = $1, client_id = $2, language = $3 WHERE id = 1',
        [discord.token, discord.clientId, language || 'tr']
      );
    }

    // 4. AI ayarlari (istege bagli)
    if (ai && !ai.skip) {
      await query(
        `UPDATE ai_settings SET
          enabled = $1, provider = $2, base_url = $3, api_key = $4, model = $5
        WHERE id = 1`,
        [
          ai.enabled ?? false,
          ai.provider || 'anthropic',
          ai.baseUrl || '',
          ai.apiKey || '',
          ai.model || ''
        ]
      );
    }

    // 5. Kurulumu tamamla
    await config.set('setup_complete', true);
    await config.set('setup_date', new Date().toISOString());

    logger.info('setup', 'Kurulum tamamlandi');

    // Token olustur
    const adminUser = await queryOne('SELECT * FROM admin_users WHERE username = $1', [admin.username]);
    const token = createToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });

    res.json({ success: true, token });
  } catch (err) {
    logger.error('setup', `Kurulum hatasi: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
