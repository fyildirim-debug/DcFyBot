const { queryOne, query } = require('../../db');
const { chat } = require('../../ai/provider');

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Mute kontrolu - susturulmus uye mesaj yazarsa sil + DM uyari
    try {
      const mute = await queryOne(
        'SELECT reason, message, expires_at FROM mutes WHERE guild_id = $1 AND user_id = $2 AND active = TRUE AND expires_at > NOW()',
        [message.guildId, message.author.id]
      );
      if (mute) {
        // Mesaji aninda sil
        try { await message.delete(); } catch {}

        // Kalan sureyi hesapla
        const remaining = Math.max(0, new Date(mute.expires_at).getTime() - Date.now());
        const remMin = Math.ceil(remaining / 60000);
        const remStr = remMin >= 60 ? `${Math.floor(remMin/60)} saat ${remMin%60} dakika` : `${remMin} dakika`;

        // Kullaniciya DM gonder
        try {
          await message.author.send(
            `**${message.guild.name}** sunucusunda susturulmus durumdasiniz.\n` +
            `**Kalan sure:** ${remStr}\n` +
            `**Sebep:** ${mute.reason || 'Belirtilmedi'}\n` +
            (mute.message ? `**Mesaj:** ${mute.message}` : '')
          );
        } catch {} // DM kapali olabilir

        return; // Mesaj islenmez
      }
    } catch {}

    // Mesaj istatistigi
    try {
      await query('INSERT INTO stats (type, guild_id, user_id) VALUES ($1, $2, $3)', ['message', message.guildId, message.author.id]);
    } catch {}

    // AI yanit kontrolu
    const ai = await queryOne('SELECT enabled FROM ai_settings WHERE id = 1');
    if (!ai?.enabled) return;

    // Sunucu bazli AI kontrolu
    const guild = await queryOne('SELECT ai_enabled, ai_channel_id FROM guilds WHERE guild_id = $1', [message.guildId]);
    if (guild && !guild.ai_enabled) return;
    if (guild?.ai_channel_id && message.channelId !== guild.ai_channel_id) return;

    // Bot mention veya AI kanalinda mi?
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
