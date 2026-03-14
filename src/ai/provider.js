const { queryOne, query } = require('../db');
const logger = require('../utils/logger');

let clientInstance = null;
let lastConfigKey = null;

function buildClient(settings) {
  const configKey = `${settings.provider}:${settings.base_url}:${settings.api_key}`;

  if (clientInstance && lastConfigKey === configKey) {
    return clientInstance;
  }

  if (settings.provider === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    clientInstance = new Anthropic({
      apiKey: settings.api_key,
      baseURL: settings.base_url || undefined
    });
  } else {
    // openai veya custom - hepsi OpenAI uyumlu
    const OpenAI = require('openai');
    clientInstance = new OpenAI({
      apiKey: settings.api_key,
      baseURL: settings.base_url || undefined
    });
  }

  lastConfigKey = configKey;
  return clientInstance;
}

async function chat(messages, guildId = null, userId = null) {
  const settings = await queryOne('SELECT * FROM ai_settings WHERE id = 1');

  if (!settings?.enabled) {
    return { success: false, error: 'AI servisi deaktif' };
  }

  if (!settings.api_key) {
    return { success: false, error: 'API anahtari ayarlanmamis' };
  }

  const client = buildClient(settings);

  try {
    let text;

    if (settings.provider === 'anthropic') {
      const response = await client.messages.create({
        model: settings.model,
        max_tokens: settings.max_tokens || 1024,
        temperature: settings.temperature ?? 0.7,
        system: settings.system_prompt || undefined,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content
        }))
      });
      text = response.content.filter(c => c.type === 'text').map(c => c.text).join('');
    } else {
      const openaiMessages = [];
      if (settings.system_prompt) {
        openaiMessages.push({ role: 'system', content: settings.system_prompt });
      }
      openaiMessages.push(...messages);

      const response = await client.chat.completions.create({
        model: settings.model,
        max_tokens: settings.max_tokens || 1024,
        temperature: settings.temperature ?? 0.7,
        messages: openaiMessages
      });
      text = response.choices[0]?.message?.content || '';
    }

    // Istatistik
    try {
      await query('INSERT INTO stats (type, guild_id, user_id) VALUES ($1, $2, $3)', ['ai_request', guildId, userId]);
    } catch {}

    return { success: true, text };
  } catch (err) {
    logger.error('ai', `AI hatasi: ${err.message}`, { guildId, userId });
    return { success: false, error: err.message };
  }
}

module.exports = { chat, buildClient };
