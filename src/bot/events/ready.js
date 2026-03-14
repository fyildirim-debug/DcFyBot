const { ActivityType } = require('discord.js');
const { queryOne, query } = require('../../db');
const logger = require('../../utils/logger');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    logger.info('bot', `Bot hazir: ${client.user.tag} | ${client.guilds.cache.size} sunucu`);

    // Aktivite ayarla
    const settings = await queryOne('SELECT * FROM bot_settings WHERE id = 1');
    const types = {
      'PLAYING': ActivityType.Playing,
      'WATCHING': ActivityType.Watching,
      'LISTENING': ActivityType.Listening,
      'COMPETING': ActivityType.Competing
    };

    client.user.setActivity(
      settings?.activity_message || 'FyDCBot',
      { type: types[settings?.activity_type] || ActivityType.Watching }
    );

    // Sunuculari DB'ye kaydet
    for (const [id, guild] of client.guilds.cache) {
      await query(
        `INSERT INTO guilds (guild_id, guild_name, member_count) VALUES ($1, $2, $3)
         ON CONFLICT (guild_id) DO UPDATE SET guild_name = $2, member_count = $3, updated_at = NOW()`,
        [id, guild.name, guild.memberCount]
      );
    }
  }
};
