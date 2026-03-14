const { queryOne, query } = require('../../db');
const { chat } = require('../../ai/provider');
const logger = require('../../utils/logger');

// Kelime filtresi cache (sunucu basina, 60sn yenilenir)
const filterCache = {};
const CACHE_TTL = 60000;

async function getFilters(guildId) {
  const now = Date.now();
  if (filterCache[guildId] && (now - filterCache[guildId].time) < CACHE_TTL) {
    return filterCache[guildId].data;
  }
  try {
    const rows = await query(
      'SELECT * FROM word_filters WHERE guild_id = $1 AND enabled = TRUE',
      [guildId]
    );
    const data = Array.isArray(rows) ? rows : (rows?.rows || []);
    filterCache[guildId] = { data, time: now };
    return data;
  } catch { return []; }
}

function checkWord(content, word, matchType) {
  const lower = content.toLowerCase();
  const w = word.toLowerCase();
  switch (matchType) {
    case 'exact': return lower === w;
    case 'startswith': return lower.startsWith(w);
    case 'endswith': return lower.endsWith(w);
    case 'regex':
      try { return new RegExp(w, 'i').test(content); } catch { return false; }
    case 'word':
      return new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(content);
    case 'contains':
    default:
      return lower.includes(w);
  }
}

function censorWord(content, word, matchType) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let regex;
  switch (matchType) {
    case 'word':
      regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      break;
    case 'regex':
      try { regex = new RegExp(word, 'gi'); } catch { return content; }
      break;
    default:
      regex = new RegExp(escaped, 'gi');
  }
  return content.replace(regex, match => '*'.repeat(match.length));
}

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Yonetici kontrolu - yoneticiler filtreden muaf
    const isAdmin = message.member?.permissions?.has('Administrator') || message.member?.permissions?.has('ManageMessages');

    // Mute kontrolu
    try {
      const mute = await queryOne(
        'SELECT reason, message, expires_at FROM mutes WHERE guild_id = $1 AND user_id = $2 AND active = TRUE AND expires_at > NOW()',
        [message.guildId, message.author.id]
      );
      if (mute) {
        try { await message.delete(); } catch {}
        const remaining = Math.max(0, new Date(mute.expires_at).getTime() - Date.now());
        const remMin = Math.ceil(remaining / 60000);
        const remStr = remMin >= 60 ? `${Math.floor(remMin/60)} saat ${remMin%60} dakika` : `${remMin} dakika`;
        try {
          await message.author.send(
            `**${message.guild.name}** sunucusunda susturulmus durumdasiniz.\n` +
            `**Kalan sure:** ${remStr}\n` +
            `**Sebep:** ${mute.reason || 'Belirtilmedi'}\n` +
            (mute.message ? `**Mesaj:** ${mute.message}` : '')
          );
        } catch {}
        return;
      }
    } catch {}

    // Yasakli kelime filtresi (yoneticiler muaf)
    if (!isAdmin) {
      try {
        const filters = await getFilters(message.guildId);
        for (const f of filters) {
          if (!checkWord(message.content, f.word, f.match_type)) continue;

          // Eslesen filtre bulundu
          const warnMsg = f.warn_message || `Mesajiniz "${f.word}" yasakli kelimesi nedeniyle isleme alindi.`;

          switch (f.action) {
            case 'delete': {
              // Mesaji sil + ephemeral uyari
              try { await message.delete(); } catch {}
              try {
                const warn = await message.channel.send(`<@${message.author.id}> ${warnMsg}`);
                setTimeout(() => { try { warn.delete(); } catch {} }, 5000);
              } catch {}
              try { await message.author.send(`**${message.guild.name}** — ${warnMsg}`); } catch {}
              logger.info('bot', `Yasakli kelime (sil): "${f.word}" - ${message.author.username}`, { guildId: message.guildId });
              return;
            }

            case 'censor': {
              // Mesaji sil, sansurlu halini bot olarak gonder
              const censored = censorWord(message.content, f.word, f.match_type);
              try { await message.delete(); } catch {}
              await message.channel.send(`**${message.member?.displayName || message.author.username}:** ${censored}`);
              try { await message.author.send(`**${message.guild.name}** — Mesajinizdaki yasakli kelime sansürlendi.`); } catch {}
              logger.info('bot', `Yasakli kelime (sansur): "${f.word}" - ${message.author.username}`, { guildId: message.guildId });
              return;
            }

            case 'warn': {
              // Mesaji silme, sadece uyar
              try {
                const warn = await message.reply(`⚠️ ${warnMsg}`);
                setTimeout(() => { try { warn.delete(); } catch {} }, 8000);
              } catch {}
              try { await message.author.send(`**${message.guild.name}** — ${warnMsg}`); } catch {}
              logger.info('bot', `Yasakli kelime (uyari): "${f.word}" - ${message.author.username}`, { guildId: message.guildId });
              break; // Devam et, mesaj silinmez
            }

            case 'timeout': {
              // Mesaji sil + kullaniciyi sustur
              const duration = (f.action_duration || 5) * 60 * 1000;
              try { await message.delete(); } catch {}
              try {
                await message.member.timeout(duration, `Yasakli kelime: ${f.word}`);
              } catch {}

              // DB'ye mute kaydi
              const expiresAt = new Date(Date.now() + duration);
              try {
                await query('UPDATE mutes SET active = FALSE WHERE guild_id = $1 AND user_id = $2 AND active = TRUE', [message.guildId, message.author.id]);
                await query(
                  'INSERT INTO mutes (guild_id, user_id, moderator_id, reason, message, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
                  [message.guildId, message.author.id, 'system', `Yasakli kelime: ${f.word}`, warnMsg, expiresAt]
                );
              } catch {}

              const durStr = f.action_duration >= 60 ? `${Math.floor(f.action_duration/60)} saat` : `${f.action_duration || 5} dakika`;
              try {
                const warn = await message.channel.send(`<@${message.author.id}> yasakli kelime kullanimi nedeniyle ${durStr} susturuldu.`);
                setTimeout(() => { try { warn.delete(); } catch {} }, 8000);
              } catch {}
              try {
                await message.author.send(
                  `**${message.guild.name}** — Yasakli kelime kullandiginiz icin ${durStr} susturuldunuz.\n**Kelime:** ||${f.word}||\n${warnMsg}`
                );
              } catch {}
              logger.info('bot', `Yasakli kelime (timeout ${f.action_duration}dk): "${f.word}" - ${message.author.username}`, { guildId: message.guildId });
              return;
            }

            case 'kick': {
              // Mesaji sil + kullaniciyi at
              try { await message.delete(); } catch {}
              try {
                await message.author.send(`**${message.guild.name}** — Yasakli kelime kullandiginiz icin sunucudan atildiniz.\n**Kelime:** ||${f.word}||\n${warnMsg}`);
              } catch {}
              try { await message.member.kick(`Yasakli kelime: ${f.word}`); } catch {}
              logger.info('bot', `Yasakli kelime (kick): "${f.word}" - ${message.author.username}`, { guildId: message.guildId });
              return;
            }

            case 'ban': {
              // Mesaji sil + kullaniciyi yasakla
              try { await message.delete(); } catch {}
              try {
                await message.author.send(`**${message.guild.name}** — Yasakli kelime kullandiginiz icin sunucudan yasaklandiniz.\n**Kelime:** ||${f.word}||\n${warnMsg}`);
              } catch {}
              try { await message.member.ban({ reason: `Yasakli kelime: ${f.word}` }); } catch {}
              logger.info('bot', `Yasakli kelime (ban): "${f.word}" - ${message.author.username}`, { guildId: message.guildId });
              return;
            }
          }
        }
      } catch (err) {
        logger.error('bot', `Kelime filtresi hatasi: ${err.message}`);
      }
    }

    // Mesaj istatistigi
    try {
      await query('INSERT INTO stats (type, guild_id, user_id) VALUES ($1, $2, $3)', ['message', message.guildId, message.author.id]);
    } catch {}

    // AI yanit kontrolu
    const ai = await queryOne('SELECT enabled FROM ai_settings WHERE id = 1');
    if (!ai?.enabled) return;

    const guild = await queryOne('SELECT ai_enabled, ai_channel_id FROM guilds WHERE guild_id = $1', [message.guildId]);
    if (guild && !guild.ai_enabled) return;
    if (guild?.ai_channel_id && message.channelId !== guild.ai_channel_id) return;

    const isMentioned = message.mentions.has(message.client.user);
    const isAIChannel = guild?.ai_channel_id === message.channelId;

    if (!isMentioned && !isAIChannel) return;

    const content = message.content.replace(`<@${message.client.user.id}>`, '').trim();
    if (!content) return;

    await message.channel.sendTyping();

    const result = await chat(
      [{ role: 'user', content }],
      message.guildId,
      message.author.id
    );

    if (result.success) {
      const text = result.text;
      if (text.length <= 2000) {
        await message.reply(text);
      } else {
        const chunks = [];
        for (let i = 0; i < text.length; i += 1990) {
          chunks.push(text.substring(i, i + 1990));
        }
        await message.reply(chunks[0]);
        for (let i = 1; i < chunks.length; i++) {
          await message.channel.send(chunks[i]);
        }
      }
    }
  }
};
