const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { query, queryOne } = require('../../db');
const logger = require('../../utils/logger');

let botClient = null;
let cleanupInterval = null;

// ========== CAPTCHA URETIMI ==========

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateMath() {
  const ops = [
    () => {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      return { question: `${a} + ${b} = ?`, answer: String(a + b) };
    },
    () => {
      const a = Math.floor(Math.random() * 20) + 5;
      const b = Math.floor(Math.random() * a) + 1;
      return { question: `${a} - ${b} = ?`, answer: String(a - b) };
    },
    () => {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      return { question: `${a} x ${b} = ?`, answer: String(a * b) };
    }
  ];
  return ops[Math.floor(Math.random() * ops.length)]();
}

// ========== OTOMATIK SUNUCU AYARI ==========

async function autoSetupGuild(guild, settings) {
  const results = { verified_role_id: null, unverified_role_id: null, verification_channel_id: null };

  try {
    // 1. "Dogrulanmamis" rolunu olustur (yoksa)
    let unverifiedRole = guild.roles.cache.find(r => r.name === 'Dogrulanmamis');
    if (!unverifiedRole) {
      unverifiedRole = await guild.roles.create({
        name: 'Dogrulanmamis',
        color: '#95a5a6',
        reason: 'Captcha sistemi - otomatik olusturuldu',
        permissions: [],
        position: 1 // En alta koy - bot'un altinda olsun
      });
      logger.info('captcha', `"Dogrulanmamis" rolu olusturuldu: ${guild.name}`);
    }
    results.unverified_role_id = unverifiedRole.id;

    // 2. "Dogrulanmis" rolunu olustur (yoksa)
    let verifiedRole = guild.roles.cache.find(r => r.name === 'Dogrulanmis');
    if (!verifiedRole) {
      verifiedRole = await guild.roles.create({
        name: 'Dogrulanmis',
        color: '#2ecc71',
        reason: 'Captcha sistemi - otomatik olusturuldu',
        permissions: [],
        position: 1 // En alta koy - bot'un altinda olsun
      });
      logger.info('captcha', `"Dogrulanmis" rolu olusturuldu: ${guild.name}`);
    }
    results.verified_role_id = verifiedRole.id;

    // Bot'un rolunun ustunde mi kontrol et
    const botMember = guild.members.me;
    if (botMember) {
      const botHighestRole = botMember.roles.highest;
      logger.info('captcha', `Bot en yuksek rol: ${botHighestRole.name} (pos:${botHighestRole.position}), Dogrulanmamis pos:${unverifiedRole.position}, Dogrulanmis pos:${verifiedRole.position}`);
    }

    // 3. "dogrulama" kanalini olustur (yoksa)
    let verifyChannel = guild.channels.cache.find(c => c.name === 'dogrulama' && c.type === ChannelType.GuildText);
    if (!verifyChannel) {
      verifyChannel = await guild.channels.create({
        name: 'dogrulama',
        type: ChannelType.GuildText,
        topic: 'Sunucuya erisim icin dogrulamanizi tamamlayin',
        reason: 'Captcha sistemi - otomatik olusturuldu'
      });
      logger.info('captcha', `"dogrulama" kanali olusturuldu: ${guild.name}`);
    }

    // Dogrulama kanalinin izinlerini HER ZAMAN ayarla (kanal onceden varsa da)
    // Strateji: @everyone goremez, Dogrulanmamis gorup yazabilir, Dogrulanmis goremez
    // Oncelikle mevcut overwrite'lari temizle ve sifirdan ayarla
    try {
      // Tum mevcut overwrite'lari temizle (temiz baslangic)
      for (const [id] of verifyChannel.permissionOverwrites.cache) {
        if (id !== guild.id) { // @everyone haric
          await verifyChannel.permissionOverwrites.delete(id, 'Captcha: temiz baslangic').catch(() => {});
        }
      }
    } catch {}

    // @everyone: goremez, yazamaz
    await verifyChannel.permissionOverwrites.set([
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      },
      {
        id: unverifiedRole.id, // Dogrulanmamis: gorebilir, yazabilir
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: verifiedRole.id, // Dogrulanmis: goremez
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: guild.members.me?.id || guild.client.user.id, // Bot: tam erisim
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages]
      }
    ], 'Captcha sistemi - dogrulama kanali izinleri');

    logger.info('captcha', `"dogrulama" kanali izinleri ayarlandi: ${guild.name}`);

    // 3b. Kanaldaki eski mesajlari temizle ve kalici dogrulama mesaji gonder
    try {
      const oldMessages = await verifyChannel.messages.fetch({ limit: 50 });
      const botMessages = oldMessages.filter(m => m.author.id === guild.members.me?.id);
      for (const [, msg] of botMessages) {
        await msg.delete().catch(() => {});
      }
    } catch {}

    // Kalici dogrulama mesaji + buton
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('Sunucuya Hosgeldiniz!')
      .setDescription(
        'Bu sunucuya erisim icin dogrulamanizi tamamlamaniz gerekmektedir.\n\n' +
        '**Nasil dogrulanirsiniz?**\n' +
        'Asagidaki **Dogrula** butonuna tiklayin.\n\n' +
        'Dogrulama sonrasi tum kanallara erisebilirsiniz.'
      )
      .setColor(0x5865F2)
      .setFooter({ text: 'FyDCBot Captcha Sistemi' })
      .setTimestamp();

    const verifyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('captcha_verify_permanent')
        .setLabel('Dogrula')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    await verifyChannel.send({ embeds: [welcomeEmbed], components: [verifyRow] });
    logger.info('captcha', `Kalici dogrulama mesaji gonderildi: ${guild.name}`);

    results.verification_channel_id = verifyChannel.id;

    // 4. SNAPSHOT AL - tum kanallarin mevcut izin durumunu kaydet
    const channels = guild.channels.cache.filter(c =>
      c.id !== verifyChannel.id &&
      (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildCategory)
    );

    const snapshot = {};
    for (const [, channel] of channels) {
      const overwrites = [];
      for (const [id, ow] of channel.permissionOverwrites.cache) {
        overwrites.push({
          id,
          type: ow.type, // 0 = role, 1 = member
          allow: ow.allow.bitfield.toString(), // BigInt -> string
          deny: ow.deny.bitfield.toString()
        });
      }
      snapshot[channel.id] = { name: channel.name, overwrites };
    }

    // Snapshot'i DB'ye kaydet
    try {
      await query(
        `UPDATE captcha_settings SET permission_snapshot = $1, updated_at = NOW() WHERE guild_id = $2`,
        [JSON.stringify(snapshot), guild.id]
      );
      logger.info('captcha', `Izin snapshot'i kaydedildi: ${Object.keys(snapshot).length} kanal - ${guild.name}`);
    } catch (err) {
      logger.warn('captcha', `Snapshot kaydetme hatasi: ${err.message}`);
    }

    // 5. Captcha overwrite'larini ekle
    let successCount = 0;
    for (const [, channel] of channels) {
      try {
        // @everyone: sadece ViewChannel'i kapat, diger izinlere DOKUNMA
        await channel.permissionOverwrites.edit(guild.id, {
          ViewChannel: false
        }, { reason: 'Captcha sistemi - dogrulanmamis uyeler goremez' });

        // Dogrulanmis rol: sadece ViewChannel ac, diger izinlere DOKUNMA
        await channel.permissionOverwrites.edit(verifiedRole.id, {
          ViewChannel: true
        }, { reason: 'Captcha sistemi - dogrulanmis uyeler gorebilir' });

        successCount++;
      } catch (err) {
        logger.warn('captcha', `Kanal izni atanamadi [${channel.name}]: ${err.message}`);
      }
    }

    logger.info('captcha', `Kanal izinleri ayarlandi: ${guild.name} (${successCount}/${channels.size} kanal)`);

    // 5. Mevcut uyelere rol ata
    // Yoneticiler ve sunucu sahibi -> Dogrulanmis (muaf)
    // Diger herkes -> Dogrulanmamis (dogrulama yapmasi gerekecek)
    try {
      const members = await guild.members.fetch();
      let verifiedCount = 0;
      let unverifiedCount = 0;
      for (const [, member] of members) {
        if (member.user.bot) continue; // Botlara rol verme
        if (member.id === guild.ownerId) continue; // Sunucu sahibi zaten her seyi gorebilir

        // Yonetici izni olan uyeler muaf (dogrulanmis)
        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
          if (!member.roles.cache.has(verifiedRole.id)) {
            await member.roles.add(verifiedRole.id, 'Captcha kurulumu - yonetici muaf').catch(() => {});
            verifiedCount++;
          }
          continue;
        }

        // Diger uyeler: Dogrulanmamis rolu ver, dogrulama yapmasi gerekecek
        try {
          if (!member.roles.cache.has(unverifiedRole.id)) {
            await member.roles.add(unverifiedRole.id, 'Captcha kurulumu - dogrulama gerekli');
            unverifiedCount++;
            logger.info('captcha', `Dogrulanmamis rolu verildi: ${member.user.tag}`);
          }
          // Eger onceden Dogrulanmis rolu varsa kaldir
          if (member.roles.cache.has(verifiedRole.id)) {
            await member.roles.remove(verifiedRole.id, 'Captcha kurulumu - tekrar dogrulama gerekli');
            logger.info('captcha', `Dogrulanmis rolu kaldirildi: ${member.user.tag}`);
          }
        } catch (roleErr) {
          logger.error('captcha', `Uye rol atama hatasi [${member.user.tag}]: ${roleErr.message}`);
        }
      }
      logger.info('captcha', `Mevcut uyeler: ${verifiedCount} yonetici muaf, ${unverifiedCount} uye dogrulama bekliyor - ${guild.name}`);
    } catch (err) {
      logger.warn('captcha', `Mevcut uyelere rol atama hatasi: ${err.message}`);
    }

    return results;
  } catch (err) {
    logger.error('captcha', `Otomatik kurulum hatasi [${guild.name}]: ${err.message}`);
    throw err;
  }
}

// ========== DOGRULAMA MESAJI GONDER ==========

async function sendVerification(member, settings) {
  const channel = member.guild.channels.cache.get(settings.verification_channel_id);
  if (!channel) return;

  const timeout = settings.timeout_minutes || 5;
  const expiresAt = new Date(Date.now() + timeout * 60 * 1000);

  // Onceki bekleyen dogrulamalari sil
  await query('DELETE FROM captcha_pending WHERE guild_id = $1 AND user_id = $2', [member.guild.id, member.id]);

  if (settings.type === 'button') {
    // Buton dogrulama - tiklayinca dogrulanir
    const embed = new EmbedBuilder()
      .setTitle('Dogrulama Gerekli')
      .setDescription(settings.welcome_message || `Merhaba ${member}!\n\nSunucuya erisim icin asagidaki butona tiklayin.`)
      .setColor(0xfee75c)
      .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
      .setFooter({ text: `${timeout} dakika icinde dogrulamanizi tamamlayin` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`captcha_verify_${member.id}`)
        .setLabel('Dogrula')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    const msg = await channel.send({ content: `${member}`, embeds: [embed], components: [row] });

    await query(
      'INSERT INTO captcha_pending (guild_id, user_id, code, answer, message_id, max_attempts, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [member.guild.id, member.id, 'button', 'button', msg.id, 1, expiresAt]
    );

  } else if (settings.type === 'math') {
    // Matematik sorusu
    const { question, answer } = generateMath();

    const embed = new EmbedBuilder()
      .setTitle('Dogrulama Gerekli')
      .setDescription(
        (settings.welcome_message || `Merhaba ${member}!`) +
        `\n\nAsagidaki matematik sorusunu cevaplayin:\n\n**${question}**\n\nCevabinizi bu kanala yazin.`
      )
      .setColor(0xfee75c)
      .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
      .setFooter({ text: `${timeout} dakika | 3 deneme hakkiniz var` })
      .setTimestamp();

    const msg = await channel.send({ content: `${member}`, embeds: [embed] });

    await query(
      'INSERT INTO captcha_pending (guild_id, user_id, code, answer, message_id, max_attempts, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [member.guild.id, member.id, question, answer, msg.id, 3, expiresAt]
    );

  } else if (settings.type === 'code') {
    // Kod dogrulama
    const code = generateCode(6);

    const embed = new EmbedBuilder()
      .setTitle('Dogrulama Gerekli')
      .setDescription(
        (settings.welcome_message || `Merhaba ${member}!`) +
        `\n\nAsagidaki kodu bu kanala yazin:\n\n\`\`\`${code}\`\`\``
      )
      .setColor(0xfee75c)
      .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
      .setFooter({ text: `${timeout} dakika | 3 deneme hakkiniz var` })
      .setTimestamp();

    const msg = await channel.send({ content: `${member}`, embeds: [embed] });

    await query(
      'INSERT INTO captcha_pending (guild_id, user_id, code, answer, message_id, max_attempts, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [member.guild.id, member.id, code, code, msg.id, 3, expiresAt]
    );
  }
}

// ========== DOGRULAMA BASARILI ==========

async function verifyMember(guild, userId, settings) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;

  try {
    // Dogrulanmis rolunu ver
    if (settings.verified_role_id) {
      await member.roles.add(settings.verified_role_id).catch(() => {});
    }

    // Dogrulanmamis rolunu kaldir
    if (settings.unverified_role_id) {
      await member.roles.remove(settings.unverified_role_id).catch(() => {});
    }

    // Bekleyen dogrulamayi sil
    await query('DELETE FROM captcha_pending WHERE guild_id = $1 AND user_id = $2', [guild.id, userId]);

    // Basari mesaji
    const channel = guild.channels.cache.get(settings.verification_channel_id);
    if (channel) {
      const successMsg = settings.success_message || `${member} dogrulandi! Hosgeldiniz.`;
      const msg = await channel.send({ content: successMsg }).catch(() => null);
      if (msg) {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      }
    }

    // Log kanali
    if (settings.log_channel_id) {
      const logChannel = guild.channels.cache.get(settings.log_channel_id);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('Uye Dogrulandi')
          .setDescription(`${member.user.tag} (${member.id}) basariyla dogrulandi.`)
          .setColor(0x2ecc71)
          .setThumbnail(member.user.displayAvatarURL({ size: 32 }))
          .setTimestamp();
        await logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    logger.info('captcha', `Uye dogrulandi: ${member.user.tag} - ${guild.name}`);
    return true;
  } catch (err) {
    logger.error('captcha', `Dogrulama hatasi: ${err.message}`);
    return false;
  }
}

// ========== SURESI DOLANLARI TEMIZLE ==========

async function cleanupExpired() {
  try {
    const expired = await query(
      'SELECT * FROM captcha_pending WHERE expires_at < NOW()'
    );
    const rows = Array.isArray(expired) ? expired : (expired?.rows || []);

    for (const row of rows) {
      if (!botClient) continue;

      const guild = botClient.guilds.cache.get(row.guild_id);
      if (!guild) continue;

      const settings = await queryOne('SELECT * FROM captcha_settings WHERE guild_id = $1', [row.guild_id]);
      if (!settings) continue;

      // Suresi dolan mesaji sil
      if (row.message_id && settings.verification_channel_id) {
        const channel = guild.channels.cache.get(settings.verification_channel_id);
        if (channel) {
          const msg = await channel.messages.fetch(row.message_id).catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        }
      }

      // Timeout'ta at
      if (settings.kick_on_timeout) {
        const member = await guild.members.fetch(row.user_id).catch(() => null);
        if (member) {
          await member.kick('Captcha suresi doldu').catch(() => {});
          logger.info('captcha', `Sure doldu, uye atildi: ${member.user?.tag || row.user_id} - ${guild.name}`);
        }
      }
    }

    await query('DELETE FROM captcha_pending WHERE expires_at < NOW()');
  } catch (err) {
    logger.error('captcha', `Temizlik hatasi: ${err.message}`);
  }
}

// ========== PLUGIN LIFECYCLE ==========

async function start(client) {
  botClient = client;

  // Yeni uye geldiginde
  client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;

    const settings = await queryOne('SELECT * FROM captcha_settings WHERE guild_id = $1 AND enabled = TRUE', [member.guild.id]);
    if (!settings) return;

    // Dogrulanmamis rolu ver
    if (settings.unverified_role_id) {
      await member.roles.add(settings.unverified_role_id).catch(() => {});
    }

    // Dogrulama mesaji gonder
    await sendVerification(member, settings);
  });

  // Buton dogrulama (hem kalici hem kisisel butonlar)
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('captcha_verify_')) return;

    const settings = await queryOne('SELECT * FROM captcha_settings WHERE guild_id = $1 AND enabled = TRUE', [interaction.guildId]);
    if (!settings) {
      await interaction.reply({ content: 'Captcha sistemi deaktif.', ephemeral: true });
      return;
    }

    const targetUserId = interaction.customId.replace('captcha_verify_', '');

    // Kalici buton - herkes tiklayabilir
    if (targetUserId === 'permanent') {
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: 'Uye bilgisi alinamadi.', ephemeral: true });
        return;
      }

      // Zaten dogrulanmis mi?
      if (settings.verified_role_id && member.roles.cache.has(settings.verified_role_id)) {
        await interaction.reply({ content: 'Zaten dogrulanmissiniz!', ephemeral: true });
        return;
      }

      // Buton tipinde direkt dogrula
      if (settings.type === 'button') {
        const success = await verifyMember(interaction.guild, interaction.user.id, settings);
        if (success) {
          await interaction.reply({ content: '✅ Dogrulama basarili! Hosgeldiniz. Artik tum kanallara erisebilirsiniz.', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Dogrulama sirasinda bir hata olustu.', ephemeral: true });
        }
        return;
      }

      // Matematik veya kod tipinde: kisisel soru gonder
      if (settings.type === 'math' || settings.type === 'code') {
        const timeout = settings.timeout_minutes || 5;
        const expiresAt = new Date(Date.now() + timeout * 60 * 1000);

        // Onceki bekleyen dogrulamayi sil
        await query('DELETE FROM captcha_pending WHERE guild_id = $1 AND user_id = $2', [interaction.guildId, interaction.user.id]);

        let question, answer;
        if (settings.type === 'math') {
          const math = generateMath();
          question = math.question;
          answer = math.answer;
        } else {
          const code = generateCode(6);
          question = code;
          answer = code;
        }

        await query(
          'INSERT INTO captcha_pending (guild_id, user_id, code, answer, max_attempts, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [interaction.guildId, interaction.user.id, question, answer, 3, expiresAt]
        );

        const promptText = settings.type === 'math'
          ? `Asagidaki soruyu bu kanala yazarak cevaplayin:\n\n**${question}**`
          : `Asagidaki kodu bu kanala yazin:\n\n\`\`\`${question}\`\`\``;

        await interaction.reply({
          content: `📝 **Dogrulama**\n\n${promptText}\n\n_${timeout} dakika | 3 deneme hakkiniz var_`,
          ephemeral: true
        });
        return;
      }

      return;
    }

    // Kisisel buton - sadece hedef kullanici tiklayabilir
    if (interaction.user.id !== targetUserId) {
      await interaction.reply({ content: 'Bu dogrulama size ait degil.', ephemeral: true });
      return;
    }

    const pending = await queryOne(
      'SELECT * FROM captcha_pending WHERE guild_id = $1 AND user_id = $2',
      [interaction.guildId, interaction.user.id]
    );

    if (!pending) {
      await interaction.reply({ content: 'Bekleyen dogrulama bulunamadi.', ephemeral: true });
      return;
    }

    if (new Date(pending.expires_at) < new Date()) {
      await interaction.reply({ content: 'Dogrulama suresi doldu.', ephemeral: true });
      return;
    }

    const success = await verifyMember(interaction.guild, interaction.user.id, settings);

    if (success) {
      await interaction.reply({ content: '✅ Dogrulama basarili! Hosgeldiniz.', ephemeral: true });
      try { await interaction.message.delete(); } catch {}
    } else {
      await interaction.reply({ content: 'Dogrulama sirasinda bir hata olustu.', ephemeral: true });
    }
  });

  // Metin dogrulama (kod/matematik)
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const settings = await queryOne('SELECT * FROM captcha_settings WHERE guild_id = $1 AND enabled = TRUE', [message.guildId]);
    if (!settings) return;
    if (message.channelId !== settings.verification_channel_id) return;

    const pending = await queryOne(
      'SELECT * FROM captcha_pending WHERE guild_id = $1 AND user_id = $2',
      [message.guildId, message.author.id]
    );

    if (!pending) {
      // Dogrulanmis biri dogrulama kanalinda yaziyorsa sil
      try { await message.delete(); } catch {}
      return;
    }

    // Suresi dolmus mu?
    if (new Date(pending.expires_at) < new Date()) {
      try { await message.delete(); } catch {}
      const warn = await message.channel.send({
        content: `<@${message.author.id}> Dogrulama suresi doldu. Sunucudan ayrilip tekrar katilabilirsiniz.`
      }).catch(() => null);
      if (warn) setTimeout(() => warn.delete().catch(() => {}), 8000);
      await query('DELETE FROM captcha_pending WHERE guild_id = $1 AND user_id = $2', [message.guildId, message.author.id]);
      return;
    }

    const userAnswer = message.content.trim();
    const correctAnswer = pending.answer;

    // Mesaji sil (temiz kanal)
    try { await message.delete(); } catch {}

    if (userAnswer.toUpperCase() === correctAnswer.toUpperCase()) {
      // Dogru cevap
      const success = await verifyMember(message.guild, message.author.id, settings);

      if (!success) {
        const warn = await message.channel.send({
          content: `<@${message.author.id}> Dogrulama sirasinda hata olustu. Tekrar deneyin.`
        }).catch(() => null);
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 8000);
      }

      // Dogrulama mesajini sil
      if (pending.message_id) {
        const origMsg = await message.channel.messages.fetch(pending.message_id).catch(() => null);
        if (origMsg) await origMsg.delete().catch(() => {});
      }
    } else {
      // Yanlis cevap
      const attempts = (pending.attempts || 0) + 1;
      const maxAttempts = pending.max_attempts || 3;

      if (attempts >= maxAttempts) {
        // Hak bitti
        await query('DELETE FROM captcha_pending WHERE guild_id = $1 AND user_id = $2', [message.guildId, message.author.id]);

        const failMsg = settings.fail_message || 'Dogrulama basarisiz. Deneme hakkiniz bitti.';
        const warn = await message.channel.send({
          content: `<@${message.author.id}> ${failMsg}`
        }).catch(() => null);
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 10000);

        if (pending.message_id) {
          const origMsg = await message.channel.messages.fetch(pending.message_id).catch(() => null);
          if (origMsg) await origMsg.delete().catch(() => {});
        }

        if (settings.kick_on_timeout) {
          const member = await message.guild.members.fetch(message.author.id).catch(() => null);
          if (member) await member.kick('Captcha dogrulama basarisiz').catch(() => {});
        }
      } else {
        // Yanlis ama hakki var
        await query('UPDATE captcha_pending SET attempts = $1 WHERE guild_id = $2 AND user_id = $3', [attempts, message.guildId, message.author.id]);
        const warn = await message.channel.send({
          content: `<@${message.author.id}> Yanlis cevap. Kalan deneme: **${maxAttempts - attempts}**`
        }).catch(() => null);
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
      }
    }
  });

  // Suresi dolan dogrulamalari temizle (her 60 saniye)
  cleanupInterval = setInterval(cleanupExpired, 60000);

  logger.info('captcha', 'Captcha eklentisi baslatildi');
}

async function stop() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  botClient = null;
  logger.info('captcha', 'Captcha eklentisi durduruldu');
}

// ========== WEB API HANDLER (loader tarafindan cagrilir) ==========

function getAutoSetup() { return autoSetupGuild; }
function getClient() { return botClient; }

module.exports = { start, stop, autoSetupGuild, getClient };
