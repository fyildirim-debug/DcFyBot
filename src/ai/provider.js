const { queryOne, query } = require('../db');
const logger = require('../utils/logger');

let clientInstance = null;
let lastConfigKey = null;

function buildClient(settings) {
  const configKey = `${settings.provider}:${settings.base_url}:${settings.api_key}`;

  if (clientInstance && lastConfigKey === configKey) {
    return clientInstance;
  }

  const baseURL = (settings.base_url && settings.base_url.trim()) ? settings.base_url.trim() : undefined;

  if (settings.provider === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    const opts = { apiKey: settings.api_key, timeout: 600000 };
    if (baseURL) opts.baseURL = baseURL;
    clientInstance = new Anthropic(opts);
  } else {
    // openai veya custom - hepsi OpenAI uyumlu
    const OpenAI = require('openai');
    const opts = { apiKey: settings.api_key, timeout: 600000 };
    if (baseURL) opts.baseURL = baseURL;
    clientInstance = new OpenAI(opts);
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
        max_tokens: settings.max_tokens || 128000,
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
        max_tokens: settings.max_tokens || 128000,
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

// AI'dan JSON yapisal cevap al (kanal/rol olusturma icin)
async function structuredChat(systemPrompt, userPrompt, guildId = null) {
  const settings = await queryOne('SELECT * FROM ai_settings WHERE id = 1');

  if (!settings?.enabled) return { success: false, error: 'AI servisi deaktif' };
  if (!settings.api_key) return { success: false, error: 'API anahtari ayarlanmamis' };

  const client = buildClient(settings);
  const model = settings.model || (settings.provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o-mini');

  try {
    let text;

    if (settings.provider === 'anthropic') {
      const response = await client.messages.create({
        model,
        max_tokens: settings.max_tokens || 128000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });
      text = response.content.filter(c => c.type === 'text').map(c => c.text).join('');
    } else {
      const response = await client.chat.completions.create({
        model,
        max_tokens: settings.max_tokens || 128000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });
      text = response.choices[0]?.message?.content || '';
    }

    // JSON parse - ```json ... ``` blogundan cikar
    let json;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      json = JSON.parse(jsonMatch[1].trim());
    } else {
      // Direkt JSON dene
      const start = text.indexOf('[') !== -1 ? text.indexOf('[') : text.indexOf('{');
      const end = text.lastIndexOf(']') !== -1 ? text.lastIndexOf(']') + 1 : text.lastIndexOf('}') + 1;
      if (start !== -1 && end > start) {
        json = JSON.parse(text.substring(start, end));
      } else {
        return { success: false, error: 'AI yapisal cevap donduremed: ' + text.substring(0, 200) };
      }
    }

    try {
      await query('INSERT INTO stats (type, guild_id) VALUES ($1, $2)', ['ai_request', guildId]);
    } catch {}

    return { success: true, data: json, rawText: text };
  } catch (err) {
    logger.error('ai', `AI structured hatasi: ${err.message}`, { guildId });
    return { success: false, error: err.message };
  }
}

module.exports = { chat, structuredChat, buildClient };
