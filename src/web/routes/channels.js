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

    const allChannels = guild.channels.cache.map(ch => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      position: ch.rawPosition,
      parentId: ch.parentId,
      parentName: ch.parent?.name || null,
      topic: ch.topic || null,
      nsfw: ch.nsfw || false,
      createdAt: ch.createdAt
    }));

    // Discord siralama: Kategorisiz kanallar > Kategoriler (icindeki kanallarla)
    const categories = allChannels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
    const noCategory = allChannels.filter(c => c.type !== 4 && !c.parentId).sort((a, b) => a.position - b.position);

    const sorted = [];
    // Kategorisiz kanallar uste
    sorted.push(...noCategory);
    // Kategoriler ve alt kanallari
    for (const cat of categories) {
      sorted.push(cat);
      const children = allChannels
        .filter(c => c.parentId === cat.id)
        .sort((a, b) => {
          // Ses kanallari metin kanallarindan sonra
          const aVoice = [2, 13].includes(a.type) ? 1 : 0;
          const bVoice = [2, 13].includes(b.type) ? 1 : 0;
          if (aVoice !== bVoice) return aVoice - bVoice;
          return a.position - b.position;
        });
      sorted.push(...children);
    }

    res.json(sorted);
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

// PUT /api/channels/:guildId/reorder - Kanal siralamasini guncelle (ONCEKI: parametre yakalamadan once)
router.put('/:guildId/reorder', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const { orders } = req.body;
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'orders dizisi gerekli' });
    }

    await guild.channels.setPositions(
      orders.map(o => ({
        channel: o.id,
        position: o.position,
        parent: o.parent !== undefined ? (o.parent || null) : undefined
      }))
    );

    logger.info('web', `Kanal siralamalari guncellendi: ${orders.length} kanal (${guild.name})`, { guildId: guild.id });
    res.json({ success: true });
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

// POST /api/channels/:guildId/ai-create - AI ile kanal olustur
router.post('/:guildId/ai-create', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt bos olamaz' });

    const { structuredChat } = require('../../ai/provider');
    const { PermissionsBitField } = require('discord.js');

    // Mevcut kanallari AI'ya bildir
    const existing = guild.channels.cache.map(c => `${c.name} (tip:${c.type})`).join(', ');
    const roles = guild.roles.cache.map(r => `${r.name} (id:${r.id})`).join(', ');

    const systemPrompt = `Sen bir Discord sunucu mimarisisin. Kullanicinin istegine gore kanal yapisi olusturacaksin.
Mevcut kanallar: ${existing}
Mevcut roller: ${roles}

SADECE JSON dizisi dondur, baska bir sey yazma. Her eleman:
{
  "name": "kanal-adi",
  "type": "text|voice|category|announcement",
  "topic": "kanal aciklamasi (opsiyonel)",
  "parent": "ust-kategori-adi (opsiyonel, category tipindeki bir kanalin name'i)",
  "nsfw": false,
  "permissions": [
    {"role": "rol-adi-veya-id", "allow": ["ViewChannel","SendMessages"], "deny": ["ManageMessages"]}
  ]
}
Kategori kanallari once, alt kanallar sonra gelsin. Turkce karakter kullanma, kucuk harf ve tire kullan.`;

    const result = await structuredChat(systemPrompt, prompt, guild.id);
    if (!result.success) return res.json(result);

    const channels = Array.isArray(result.data) ? result.data : [result.data];
    const created = [];
    const categoryMap = {};

    //Once kategorileri olustur
    for (const ch of channels.filter(c => c.type === 'category')) {
      try {
        const newCh = await guild.channels.create({ name: ch.name, type: 4, topic: ch.topic || undefined });
        categoryMap[ch.name] = newCh.id;
        created.push({ name: newCh.name, type: 'category', id: newCh.id });
      } catch (err) {
        logger.error('web', `AI kanal olusturma hatasi: ${ch.name} - ${err.message}`);
      }
    }

    // Sonra alt kanallari
    const typeMap = { text: 0, voice: 2, announcement: 5, stage: 13, forum: 15 };
    for (const ch of channels.filter(c => c.type !== 'category')) {
      try {
        let parentId = null;
        if (ch.parent) {
          parentId = categoryMap[ch.parent] || guild.channels.cache.find(c => c.name === ch.parent && c.type === 4)?.id || null;
        }

        const newCh = await guild.channels.create({
          name: ch.name,
          type: typeMap[ch.type] ?? 0,
          topic: ch.topic || undefined,
          nsfw: ch.nsfw || false,
          parent: parentId || undefined
        });

        // Kanal izinleri
        if (ch.permissions?.length) {
          for (const perm of ch.permissions) {
            const role = guild.roles.cache.find(r => r.name === perm.role || r.id === perm.role);
            if (!role) continue;

            const allow = new PermissionsBitField();
            const deny = new PermissionsBitField();
            for (const p of (perm.allow || [])) {
              if (PermissionsBitField.Flags[p]) allow.add(PermissionsBitField.Flags[p]);
            }
            for (const p of (perm.deny || [])) {
              if (PermissionsBitField.Flags[p]) deny.add(PermissionsBitField.Flags[p]);
            }

            await newCh.permissionOverwrites.create(role, {
              ...Object.fromEntries([...allow].map(f => [f, true])),
              ...Object.fromEntries([...deny].map(f => [f, false]))
            });
          }
        }

        created.push({ name: newCh.name, type: ch.type, id: newCh.id });
      } catch (err) {
        logger.error('web', `AI kanal olusturma hatasi: ${ch.name} - ${err.message}`);
      }
    }

    logger.info('web', `AI ile ${created.length} kanal olusturuldu (${guild.name})`, { guildId: guild.id });
    res.json({ success: true, created, plan: channels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.setBotClient = setBotClient;
