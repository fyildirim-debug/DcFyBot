const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');

const router = Router();

// Bot client referansi - index.js'den ayarlanacak
let botClient = null;
function setBotClient(client) { botClient = client; }

function getGuild(guildId) {
  if (!botClient) return null;
  return botClient.guilds.cache.get(guildId);
}

// GET /api/channels/:guildId
router.get('/:guildId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi veya bot cevrimdisi' });

    const channels = guild.channels.cache.map(ch => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      position: ch.position,
      parentId: ch.parentId,
      parentName: ch.parent?.name || null,
      topic: ch.topic || null,
      nsfw: ch.nsfw || false,
      createdAt: ch.createdAt
    })).sort((a, b) => a.position - b.position);

    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/:guildId - Kanal olustur
router.post('/:guildId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const { name, type, parent, topic } = req.body;

    const channelTypes = {
      text: 0, voice: 2, category: 4, announcement: 5, stage: 13, forum: 15
    };

    const channel = await guild.channels.create({
      name,
      type: channelTypes[type] ?? 0,
      parent: parent || undefined,
      topic: topic || undefined
    });

    logger.info('web', `Kanal olusturuldu: ${channel.name} (${guild.name})`, { guildId: guild.id });
    res.json({ id: channel.id, name: channel.name, type: channel.type });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/:guildId/:channelId
router.delete('/:guildId/:channelId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadi' });

    const name = channel.name;
    await channel.delete();

    logger.info('web', `Kanal silindi: ${name} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/:guildId - Tum kanallari sil
router.delete('/:guildId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channels = [...guild.channels.cache.values()];
    let deleted = 0;

    for (const ch of channels) {
      try {
        await ch.delete();
        deleted++;
      } catch {
        // Bazi kanallar silinemeyebilir
      }
    }

    logger.warn('web', `Tum kanallar silindi: ${deleted}/${channels.length} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true, deleted, total: channels.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/channels/:guildId/:channelId - Kanal duzenle
router.put('/:guildId/:channelId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadi' });

    const { name, topic, nsfw, parent, position } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (topic !== undefined) updates.topic = topic;
    if (nsfw !== undefined) updates.nsfw = nsfw;
    if (parent !== undefined) updates.parent = parent;
    if (position !== undefined) updates.position = position;

    await channel.edit(updates);

    logger.info('web', `Kanal duzenlendi: ${channel.name} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.setBotClient = setBotClient;
