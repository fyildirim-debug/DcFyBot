const { query } = require('../../db');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildCreate',

  async execute(guild) {
    logger.info('bot', `Yeni sunucuya katildi: ${guild.name} (${guild.id})`);
    await query(
      `INSERT INTO guilds (guild_id, guild_name, member_count) VALUES ($1, $2, $3)
       ON CONFLICT (guild_id) DO UPDATE SET guild_name = $2, member_count = $3, updated_at = NOW()`,
      [guild.id, guild.name, guild.memberCount]
    );
  }
};
