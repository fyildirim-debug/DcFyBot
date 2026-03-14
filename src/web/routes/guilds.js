const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');

const router = Router();

let botClient = null;
function setBotClient(client) { botClient = client; }

// GET /api/guilds - Bot'un bulundugu sunucular
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!botClient?.isReady()) {
      return res.json([]);
    }

    const guilds = botClient.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL({ size: 128 }),
      memberCount: g.memberCount,
      channelCount: g.channels.cache.size,
      roleCount: g.roles.cache.size,
      ownerId: g.ownerId,
      createdAt: g.createdAt
    }));

    res.json(guilds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guilds/:guildId/ai-setup - AI ile sunucu yapisi kur (roller + kanallar + izinler)
router.post('/:guildId/ai-setup', requireAuth, async (req, res) => {
  try {
    const { queryOne } = require('../../db');
    if (!botClient?.isReady()) return res.status(400).json({ error: 'Bot cevrimdisi' });

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const { prompt, clearExisting } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt bos olamaz' });

    const { structuredChat } = require('../../ai/provider');
    const { PermissionsBitField } = require('discord.js');
    const logger = require('../../utils/logger');

    // Mevcut yapilari temizle (istege bagli)
    if (clearExisting) {
      logger.warn('web', `AI Setup: Mevcut yapilar temizleniyor (${guild.name})`);

      // Rolleri sil (bot rolu ve @everyone haric)
      const deletableRoles = guild.roles.cache.filter(r => !r.managed && r.id !== guild.id && r.position < guild.members.me.roles.highest.position);
      for (const [, role] of deletableRoles) {
        try { await role.delete(); } catch {}
      }

      // Kanallari sil
      for (const [, channel] of guild.channels.cache) {
        try { await channel.delete(); } catch {}
      }
    }

    const systemPrompt = `Sen bir Discord sunucu mimarisisin. Kullanicinin istegine gore KOMPLE sunucu yapisi olusturacaksin.

SADECE asagidaki JSON formatinda cevap ver, baska hicbir sey yazma:

{
  "roles": [
    {
      "name": "Rol Adi",
      "color": "#hex",
      "hoist": true,
      "mentionable": false,
      "permissions": ["ViewChannel", "SendMessages", "Connect", "Speak"]
    }
  ],
  "channels": [
    {
      "name": "kategori-adi",
      "type": "category"
    },
    {
      "name": "kanal-adi",
      "type": "text",
      "topic": "Kanal aciklamasi",
      "parent": "kategori-adi",
      "nsfw": false,
      "permissions": [
        {"role": "Rol Adi", "allow": ["ViewChannel", "SendMessages"], "deny": []}
      ]
    }
  ]
}

KURALLAR:
- Rolleri hiyerarsik sirala (en yetkili uste)
- Her role mantikli renk ver
- Kategorileri once, alt kanallari sonra yaz
- Kanal adlarinda turkce karakter kullanma, kucuk harf ve tire kullan
- Kanal izinlerinde hangi rollerin erisebilecegini/erisemeyecegini belirt
- @everyone rolu icin de izin ayarla (gerekirse deny ile kisitla)
- Metin, ses, duyuru kanallari karisik kullan
- Topic aciklamalari anlamli olsun
- Kullanilabilir izinler: Administrator, ViewChannel, ManageChannels, ManageRoles, ManageGuild, KickMembers, BanMembers, ModerateMembers, CreateInstantInvite, ChangeNickname, ManageNicknames, ManageWebhooks, ManageEmojisAndStickers, ViewAuditLog, SendMessages, SendMessagesInThreads, CreatePublicThreads, CreatePrivateThreads, EmbedLinks, AttachFiles, AddReactions, UseExternalEmojis, ReadMessageHistory, ManageMessages, ManageThreads, UseApplicationCommands, MentionEveryone, Connect, Speak, Stream, UseVAD, PrioritySpeaker, MuteMembers, DeafenMembers, MoveMembers`;

    logger.info('web', `AI Setup baslatildi: ${guild.name}`, { guildId: guild.id });

    const result = await structuredChat(systemPrompt, prompt, guild.id);
    if (!result.success) return res.json(result);

    const plan = result.data;
    const progress = { roles: 0, channels: 0, errors: [] };

    // 1. Rolleri olustur
    const roleMap = {}; // name -> role object
    if (plan.roles?.length) {
      for (const r of [...plan.roles].reverse()) {
        try {
          const bits = new PermissionsBitField();
          for (const p of (r.permissions || [])) {
            if (PermissionsBitField.Flags[p]) bits.add(PermissionsBitField.Flags[p]);
          }

          const newRole = await guild.roles.create({
            name: r.name,
            color: r.color || undefined,
            hoist: r.hoist || false,
            mentionable: r.mentionable || false,
            permissions: bits.bitfield
          });

          roleMap[r.name] = newRole;
          progress.roles++;
        } catch (err) {
          progress.errors.push(`Rol [${r.name}]: ${err.message}`);
        }
      }
    }

    // 2. Kategorileri olustur
    const categoryMap = {}; // name -> channel id
    if (plan.channels?.length) {
      for (const ch of plan.channels.filter(c => c.type === 'category')) {
        try {
          const newCh = await guild.channels.create({ name: ch.name, type: 4 });
          categoryMap[ch.name] = newCh.id;
          progress.channels++;
        } catch (err) {
          progress.errors.push(`Kategori [${ch.name}]: ${err.message}`);
        }
      }

      // 3. Alt kanallari olustur
      const typeMap = { text: 0, voice: 2, announcement: 5, stage: 13, forum: 15 };
      for (const ch of plan.channels.filter(c => c.type !== 'category')) {
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
              // Rolu bul (AI'nin olusturdugu veya mevcut)
              let target = roleMap[perm.role] || guild.roles.cache.find(r => r.name === perm.role);
              if (!target) continue;

              const overwrite = {};
              for (const p of (perm.allow || [])) {
                if (PermissionsBitField.Flags[p]) overwrite[p] = true;
              }
              for (const p of (perm.deny || [])) {
                if (PermissionsBitField.Flags[p]) overwrite[p] = false;
              }

              if (Object.keys(overwrite).length > 0) {
                await newCh.permissionOverwrites.create(target, overwrite);
              }
            }
          }

          progress.channels++;
        } catch (err) {
          progress.errors.push(`Kanal [${ch.name}]: ${err.message}`);
        }
      }
    }

    logger.info('web', `AI Setup tamamlandi: ${progress.roles} rol, ${progress.channels} kanal (${guild.name})`, { guildId: guild.id });

    res.json({
      success: true,
      roles: progress.roles,
      channels: progress.channels,
      errors: progress.errors,
      plan
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guilds/invite - Bot davet URL'si
router.get('/invite', requireAuth, async (req, res) => {
  try {
    const { queryOne } = require('../../db');
    const settings = await queryOne('SELECT client_id FROM bot_settings WHERE id = 1');
    if (!settings?.client_id) {
      return res.status(400).json({ error: 'Client ID ayarlanmamis' });
    }

    // Gerekli izinler: Administrator (8)
    const permissions = '8';
    const scopes = 'bot%20applications.commands';
    const url = `https://discord.com/api/oauth2/authorize?client_id=${settings.client_id}&permissions=${permissions}&scope=${scopes}`;

    res.json({ url, clientId: settings.client_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.setBotClient = setBotClient;
