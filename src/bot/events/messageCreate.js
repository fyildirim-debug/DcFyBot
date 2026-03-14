const { queryOne, query } = require('../../db');
const { chat } = require('../../ai/provider');

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    if (message.author.bot) return;

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
