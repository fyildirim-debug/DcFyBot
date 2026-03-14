const { query } = require('../../db');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await query('INSERT INTO stats (type, guild_id, user_id) VALUES ($1, $2, $3)', ['command', interaction.guildId, interaction.user.id]);
      await command.execute(interaction);
    } catch (err) {
      logger.error('bot', `Komut hatasi [${interaction.commandName}]: ${err.message}`);
      const reply = { content: 'Komut calistirilirken bir hata olustu.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
};
