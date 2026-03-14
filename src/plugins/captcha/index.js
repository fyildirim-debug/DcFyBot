const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

let botClient = null;
let pendingVerifications = new Map();

function generateCaptcha(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function start(client, config) {
  botClient = client;

  // Yeni uye geldiginde captcha gonder
  client.on('guildMemberAdd', async (member) => {
    if (!config.verification_channel_id || !config.verified_role_id) return;

    const channel = member.guild.channels.cache.get(config.verification_channel_id);
    if (!channel) return;

    const code = generateCaptcha(config.captcha_length || 6);
    pendingVerifications.set(member.id, {
      code,
      guildId: member.guild.id,
      expires: Date.now() + (config.timeout_minutes || 5) * 60 * 1000
    });

    const embed = new EmbedBuilder()
      .setTitle('Dogrulama Gerekli')
      .setDescription(`Merhaba ${member}! Sunucuya erisim icin asagidaki kodu yazin:\n\n**\`${code}\`**`)
      .setColor(0xfee75c)
      .setFooter({ text: `${config.timeout_minutes || 5} dakika icinde yanitlayin` });

    await channel.send({ content: `${member}`, embeds: [embed] });
  });

  // Dogrulama mesajini kontrol et
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channelId !== config.verification_channel_id) return;

    const pending = pendingVerifications.get(message.author.id);
    if (!pending) return;

    // Suresi dolmus mu?
    if (Date.now() > pending.expires) {
      pendingVerifications.delete(message.author.id);
      await message.reply('Dogrulama suresi doldu. Sunucudan ayrılip tekrar katilabilirsiniz.').catch(() => {});
      return;
    }

    if (message.content.trim().toUpperCase() === pending.code) {
      // Dogrulandi
      const member = await message.guild.members.fetch(message.author.id);
      await member.roles.add(config.verified_role_id);
      pendingVerifications.delete(message.author.id);

      await message.reply('Dogrulama basarili! Hosgeldiniz.').catch(() => {});
      // Mesaji temizle
      setTimeout(() => {
        message.delete().catch(() => {});
      }, 5000);
    } else {
      await message.reply('Yanlis kod. Tekrar deneyin.').catch(() => {});
    }
  });
}

async function stop() {
  pendingVerifications.clear();
  botClient = null;
}

module.exports = { start, stop };
