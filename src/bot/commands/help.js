const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yardim')
    .setDescription('Bot komutlarini goster'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('FyDCBot - Komutlar')
      .setColor(0x5865F2)
      .addFields(
        { name: '/chat <mesaj>', value: 'AI ile sohbet et', inline: true },
        { name: '/ping', value: 'Gecikme suresi', inline: true },
        { name: '/yardim', value: 'Bu mesaj', inline: true },
        { name: '/durum', value: 'Bot durumu', inline: true }
      )
      .setFooter({ text: 'FyDCBot | Web Panel ile yonetilir' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
