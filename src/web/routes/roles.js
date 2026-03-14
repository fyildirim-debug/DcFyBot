const { Router } = require('express');
const { PermissionsBitField } = require('discord.js');
const { requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');

const router = Router();

let botClient = null;
function setBotClient(client) { botClient = client; }

function getGuild(guildId) {
  if (!botClient) return null;
  return botClient.guilds.cache.get(guildId);
}

// GET /api/roles/:guildId
router.get('/:guildId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const roles = guild.roles.cache.map(r => ({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      position: r.position,
      permissions: r.permissions.toArray(),
      mentionable: r.mentionable,
      hoisted: r.hoist,
      memberCount: r.members.size,
      managed: r.managed,
      createdAt: r.createdAt
    })).sort((a, b) => b.position - a.position);

    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/roles/:guildId - Rol olustur
router.post('/:guildId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const { name, color, hoist, mentionable, permissions } = req.body;

    // Permissions string array -> bitfield
    let permBits = [];
    if (Array.isArray(permissions) && permissions.length > 0) {
      const bits = new PermissionsBitField();
      for (const perm of permissions) {
        if (PermissionsBitField.Flags[perm] !== undefined) {
          bits.add(PermissionsBitField.Flags[perm]);
        }
      }
      permBits = bits.bitfield;
    }

    const role = await guild.roles.create({
      name: name || 'Yeni Rol',
      color: color || undefined,
      hoist: hoist || false,
      mentionable: mentionable || false,
      permissions: permBits
    });

    logger.info('web', `Rol olusturuldu: ${role.name} (${guild.name})`, { guildId: guild.id });
    res.json({ id: role.id, name: role.name, color: role.hexColor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/roles/:guildId/:roleId - Rol duzenle
router.put('/:guildId/:roleId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Rol bulunamadi' });

    const { name, color, hoist, mentionable, permissions, position } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (hoist !== undefined) updates.hoist = hoist;
    if (mentionable !== undefined) updates.mentionable = mentionable;
    if (permissions !== undefined) {
      // String array'i PermissionsBitField'e cevir
      const bits = new PermissionsBitField();
      for (const perm of permissions) {
        if (PermissionsBitField.Flags[perm] !== undefined) {
          bits.add(PermissionsBitField.Flags[perm]);
        }
      }
      updates.permissions = bits.bitfield;
    }
    if (position !== undefined) updates.position = position;

    await role.edit(updates);

    logger.info('web', `Rol duzenlendi: ${role.name} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/roles/:guildId/:roleId
router.delete('/:guildId/:roleId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Rol bulunamadi' });
    if (role.managed) return res.status(400).json({ error: 'Bu rol yonetilen bir rol, silinemez' });

    const name = role.name;
    await role.delete();

    logger.info('web', `Rol silindi: ${name} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/roles/:guildId/ai-create - AI ile rol olustur
router.post('/:guildId/ai-create', requireAuth, async (req, res) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt bos olamaz' });

    const { structuredChat } = require('../../ai/provider');

    const existing = guild.roles.cache.map(r => r.name).join(', ');

    const systemPrompt = `Sen bir Discord sunucu yoneticisisin. Kullanicinin istegine gore rol yapisi olusturacaksin.
Mevcut roller: ${existing}

SADECE JSON dizisi dondur. Her eleman:
{
  "name": "Rol Adi",
  "color": "#hex-renk",
  "hoist": true/false,
  "mentionable": true/false,
  "permissions": ["ViewChannel","SendMessages","Connect","Speak","ReadMessageHistory","AddReactions","UseApplicationCommands"]
}

Kullanilabilir izinler: Administrator, ViewChannel, ManageChannels, ManageRoles, ManageGuild, KickMembers, BanMembers, ModerateMembers, CreateInstantInvite, ChangeNickname, ManageNicknames, ManageWebhooks, ManageEmojisAndStickers, ViewAuditLog, SendMessages, SendMessagesInThreads, CreatePublicThreads, CreatePrivateThreads, EmbedLinks, AttachFiles, AddReactions, UseExternalEmojis, UseExternalStickers, ReadMessageHistory, ManageMessages, ManageThreads, UseApplicationCommands, SendTTSMessages, MentionEveryone, Connect, Speak, Stream, UseVAD, PrioritySpeaker, MuteMembers, DeafenMembers, MoveMembers, UseEmbeddedActivities

Rolleri hiyerarsik sirala (en yetkili uste). Mantikli renkler sec.`;

    const result = await structuredChat(systemPrompt, prompt, guild.id);
    if (!result.success) return res.json(result);

    const roles = Array.isArray(result.data) ? result.data : [result.data];
    const created = [];

    // Rolleri ters siradan olustur (en alttaki once, position dogru olsun)
    for (const r of [...roles].reverse()) {
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

        created.push({ name: newRole.name, color: newRole.hexColor, id: newRole.id });
      } catch (err) {
        logger.error('web', `AI rol olusturma hatasi: ${r.name} - ${err.message}`);
      }
    }

    logger.info('web', `AI ile ${created.length} rol olusturuldu (${guild.name})`, { guildId: guild.id });
    res.json({ success: true, created, plan: roles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.setBotClient = setBotClient;
