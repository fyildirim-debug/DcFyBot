const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');

const router = Router();

let botClient = null;
function setBotClient(client) { botClient = client; }

function getGuild(guildId) {
  if (!botClient) return null;
  return botClient.guilds.cache.get(guildId);
}

// Mention'lari okunabilir metne cevir
function resolveMentions(content, guild) {
  if (!content || !guild) return content;

  // <@USER_ID> ve <@!USER_ID> -> @kullaniciadi
  content = content.replace(/<@!?(\d+)>/g, (match, id) => {
    const member = guild.members.cache.get(id);
    if (member) return `@${member.displayName}`;
    return match;
  });

  // <@&ROLE_ID> -> @roladi
  content = content.replace(/<@&(\d+)>/g, (match, id) => {
    const role = guild.roles.cache.get(id);
    if (role) return `@${role.name}`;
    return match;
  });

  // <#CHANNEL_ID> -> #kanaladi
  content = content.replace(/<#(\d+)>/g, (match, id) => {
    const channel = guild.channels.cache.get(id);
    if (channel) return `#${channel.name}`;
    return match;
  });

  // <:emoji:ID> ve <a:emoji:ID> -> :emoji:
  content = content.replace(/<a?:(\w+):\d+>/g, ':$1:');

  return content;
}

// GET /api/messages/:guildId/:channelId
router.get('/:guildId/:channelId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadi' });
    if (!channel.isTextBased()) return res.status(400).json({ error: 'Bu kanal metin kanali degil' });

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const fetchOpts = { limit };
    if (req.query.before) fetchOpts.before = req.query.before;

    const messages = await channel.messages.fetch(fetchOpts);

    const result = messages.map(m => ({
      id: m.id,
      content: resolveMentions(m.content || '', guild),
      author: {
        id: m.author.id,
        username: m.author.username,
        displayName: m.member?.displayName || m.author.username,
        avatar: m.author.displayAvatarURL({ size: 64 }),
        bot: m.author.bot
      },
      timestamp: m.createdTimestamp,
      editedTimestamp: m.editedTimestamp,
      pinned: m.pinned,
      attachments: m.attachments.map(a => ({
        id: a.id,
        name: a.name,
        url: a.url,
        size: a.size,
        contentType: a.contentType
      })),
      embeds: m.embeds.length,
      reactions: m.reactions.cache.map(r => ({
        emoji: r.emoji.name,
        count: r.count
      })),
      replyTo: m.reference?.messageId || null
    })).sort((a, b) => a.timestamp - b.timestamp); // eski -> yeni

    res.json({
      messages: result,
      hasMore: messages.size === limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages/:guildId/:channelId/:messageId
router.delete('/:guildId/:channelId/:messageId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadi' });

    const message = await channel.messages.fetch(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Mesaj bulunamadi' });

    await message.delete();
    logger.info('web', `Mesaj silindi: ${req.params.messageId} (${channel.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:guildId/:channelId/:messageId/pin
router.post('/:guildId/:channelId/:messageId/pin', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadi' });

    const message = await channel.messages.fetch(req.params.messageId);
    await message.pin();
    logger.info('web', `Mesaj sabitlendi: ${req.params.messageId} (${channel.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages/:guildId/:channelId/:messageId/pin
router.delete('/:guildId/:channelId/:messageId/pin', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadi' });

    const message = await channel.messages.fetch(req.params.messageId);
    await message.unpin();
    logger.info('web', `Mesaj sabiti kaldirildi: ${req.params.messageId} (${channel.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:guildId/:channelId/send - Mesaj gonder
router.post('/:guildId/:channelId/send', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadi' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Mesaj icerigi bos olamaz' });

    const msg = await channel.send(content);
    logger.info('web', `Mesaj gonderildi: ${channel.name}`, { guildId: guild.id });
    res.json({ id: msg.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:guildId/:channelId/ai-compose - AI ile mesaj hazirla (onizleme)
router.post('/:guildId/:channelId/ai-compose', requireAuth, async (req, res) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt bos olamaz' });

    const { structuredChat } = require('../../ai/provider');

    const systemPrompt = `Sen bir Discord mesaj tasarimcisisin. Kullanicinin istegine gore Discord Embed mesaji olusturacaksin.

SADECE tek bir JSON objesi dondur:
{
  "content": "Embed ustu normal mesaj (opsiyonel, bos olabilir)",
  "embed": {
    "title": "Baslik",
    "description": "Ana icerik (Discord markdown destekli: **bold**, *italic*, __underline__, ~~strikethrough~~, \`code\`, [link](url), > quote)",
    "color": "#hex-renk (ornek: #5865f2)",
    "fields": [
      { "name": "Alan Basligi", "value": "Alan icerigi", "inline": true }
    ],
    "footer": { "text": "Alt bilgi" },
    "thumbnail": "kucuk-resim-url (opsiyonel)",
    "image": "buyuk-resim-url (opsiyonel)",
    "author": { "name": "Yazar adi", "icon_url": "yazar-ikon-url (opsiyonel)" },
    "timestamp": true
  }
}

KURALLAR:
- Discord markdown kullan, zengin ve sik gorunsun
- Emoji kullanabilirsin
- Renk konuya uygun sec
- Fields en fazla 25 olabilir, inline:true yan yana gosterir
- Gereksiz alanlari bos birakma, kullanma
- Turkce icerik olustur (kullanici baska dil belirtmedikce)`;

    const result = await structuredChat(systemPrompt, prompt, req.params.guildId);
    if (!result.success) return res.json(result);

    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:guildId/:channelId/send-embed - Embed mesaj gonder
router.post('/:guildId/:channelId/send-embed', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadi' });

    const { content, embed, imageUrl } = req.body;
    const { EmbedBuilder } = require('discord.js');

    const embedBuilder = new EmbedBuilder();
    if (embed.title) embedBuilder.setTitle(embed.title);
    if (embed.description) embedBuilder.setDescription(embed.description);
    if (embed.color) embedBuilder.setColor(embed.color);
    if (embed.footer?.text) embedBuilder.setFooter({ text: embed.footer.text, iconURL: embed.footer.icon_url || undefined });
    if (embed.thumbnail) embedBuilder.setThumbnail(embed.thumbnail);
    if (embed.image || imageUrl) embedBuilder.setImage(embed.image || imageUrl);
    if (embed.author?.name) embedBuilder.setAuthor({ name: embed.author.name, iconURL: embed.author.icon_url || undefined });
    if (embed.timestamp) embedBuilder.setTimestamp();
    if (embed.fields?.length) {
      for (const f of embed.fields) {
        embedBuilder.addFields({ name: f.name, value: f.value, inline: f.inline || false });
      }
    }

    const msgOpts = { embeds: [embedBuilder] };
    if (content?.trim()) msgOpts.content = content;

    const msg = await channel.send(msgOpts);
    logger.info('web', `Embed mesaj gonderildi: ${channel.name}`, { guildId: guild.id });
    res.json({ id: msg.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.setBotClient = setBotClient;
