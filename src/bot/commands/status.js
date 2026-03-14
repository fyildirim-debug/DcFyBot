const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queryOne } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('durum')
    .setDescription('Bot durum bilgileri'),

  async execute(interaction) {
    const ai = await queryOne('SELECT enabled, provider, model FROM ai_settings WHERE id = 1');
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    const embed = new EmbedBuilder()
      .setTitle('FyDCBot - Durum')
      .setColor(0x57F287)
      .addFields(
        { name: 'Calisma Suresi', value: `${h}s ${m}d ${s}sn`, inline: true },
        { name: 'Sunucu', value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: 'Gecikme', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
        { name: 'AI', value: ai?.enabled ? `${ai.provider} (${ai.model})` : 'Deaktif', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
