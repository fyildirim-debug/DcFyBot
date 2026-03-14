const { SlashCommandBuilder } = require('discord.js');
const { chat } = require('../../ai/provider');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('AI ile sohbet et')
    .addStringOption(opt => opt.setName('mesaj').setDescription('Mesajiniz').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const msg = interaction.options.getString('mesaj');
    const result = await chat([{ role: 'user', content: msg }], interaction.guildId, interaction.user.id);

    if (!result.success) {
      return interaction.editReply(`Hata: ${result.error}`);
    }

    const text = result.text;
    if (text.length <= 2000) {
      await interaction.editReply(text);
    } else {
      await interaction.editReply(text.substring(0, 1990) + '...');
    }
  }
};
