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

    const role = await guild.roles.create({
      name: name || 'Yeni Rol',
      color: color || undefined,
      hoist: hoist || false,
      mentionable: mentionable || false,
      permissions: permissions || []
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
    if (permissions !== undefined) updates.permissions = permissions;
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

module.exports = router;
module.exports.setBotClient = setBotClient;
