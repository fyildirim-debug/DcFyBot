const { Router } = require('express');
const { queryOne, query } = require('../../db');
const { requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');

const router = Router();

// ========== AI AYARLARI ==========

// GET /api/settings/ai
router.get('/ai', requireAuth, async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM ai_settings WHERE id = 1');
    if (settings?.api_key) {
      settings.api_key_masked = settings.api_key.substring(0, 8) + '***' + settings.api_key.slice(-4);
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/ai
router.put('/ai', requireAuth, async (req, res) => {
  try {
    const { enabled, provider, base_url, api_key, model, max_tokens, temperature, system_prompt } = req.body;

    // API key bossa mevcut keyi koru
    let updateApiKey = '';
    if (api_key && api_key !== '') {
      updateApiKey = ', api_key = $8';
    }

    await query(
      `UPDATE ai_settings SET
        enabled = COALESCE($1, enabled),
        provider = COALESCE($2, provider),
        base_url = COALESCE($3, base_url),
        model = COALESCE($4, model),
        max_tokens = COALESCE($5, max_tokens),
        temperature = COALESCE($6, temperature),
        system_prompt = COALESCE($7, system_prompt),
        updated_at = NOW()
        ${api_key ? ', api_key = $8' : ''}
      WHERE id = 1`,
      api_key
        ? [enabled, provider, base_url, model, max_tokens, temperature, system_prompt, api_key]
        : [enabled, provider, base_url, model, max_tokens, temperature, system_prompt]
    );

    logger.info('web', 'AI ayarlari guncellendi');
    const updated = await queryOne('SELECT * FROM ai_settings WHERE id = 1');
    if (updated?.api_key) {
      updated.api_key_masked = updated.api_key.substring(0, 8) + '***' + updated.api_key.slice(-4);
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/ai/test
router.post('/ai/test', requireAuth, async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM ai_settings WHERE id = 1');

    if (!settings?.enabled) {
      return res.json({ success: false, error: 'AI servisi deaktif' });
    }
    if (!settings.api_key) {
      return res.json({ success: false, error: 'API anahtari ayarlanmamis' });
    }

    if (settings.provider === 'anthropic') {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({
        apiKey: settings.api_key,
        baseURL: settings.base_url || undefined
      });
      await client.messages.create({
        model: settings.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
    } else {
      const OpenAI = require('openai');
      const client = new OpenAI({
        apiKey: settings.api_key,
        baseURL: settings.base_url || undefined
      });
      await client.chat.completions.create({
        model: settings.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
    }

    logger.info('web', 'AI baglanti testi basarili');
    res.json({ success: true });
  } catch (err) {
    logger.error('web', `AI test basarisiz: ${err.message}`);
    res.json({ success: false, error: err.message });
  }
});

// ========== BOT AYARLARI ==========

// GET /api/settings/bot
router.get('/bot', requireAuth, async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM bot_settings WHERE id = 1');
    // Token'i maskele
    if (settings?.token) {
      settings.token_masked = settings.token.substring(0, 10) + '***';
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/bot
router.put('/bot', requireAuth, async (req, res) => {
  try {
    const { token, client_id, prefix, activity_message, activity_type, welcome_enabled, welcome_message, welcome_channel_id, moderation_enabled, language } = req.body;

    await query(
      `UPDATE bot_settings SET
        token = COALESCE($1, token),
        client_id = COALESCE($2, client_id),
        prefix = COALESCE($3, prefix),
        activity_message = COALESCE($4, activity_message),
        activity_type = COALESCE($5, activity_type),
        welcome_enabled = COALESCE($6, welcome_enabled),
        welcome_message = COALESCE($7, welcome_message),
        welcome_channel_id = COALESCE($8, welcome_channel_id),
        moderation_enabled = COALESCE($9, moderation_enabled),
        language = COALESCE($10, language),
        updated_at = NOW()
      WHERE id = 1`,
      [token, client_id, prefix, activity_message, activity_type, welcome_enabled, welcome_message, welcome_channel_id, moderation_enabled, language]
    );

    logger.info('web', 'Bot ayarlari guncellendi');
    const updated = await queryOne('SELECT * FROM bot_settings WHERE id = 1');
    if (updated?.token) updated.token_masked = updated.token.substring(0, 10) + '***';
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
