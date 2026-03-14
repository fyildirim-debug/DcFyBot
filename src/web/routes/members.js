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

// GET /api/members/:guildId
router.get('/:guildId', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    // Uyeleri getir (cache + fetch)
    await guild.members.fetch();

    const members = guild.members.cache.map(m => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName,
      nickname: m.nickname,
      avatar: m.user.displayAvatarURL({ size: 64 }),
      bot: m.user.bot,
      roles: m.roles.cache
        .filter(r => r.id !== guild.id) // @everyone haric
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
      joinedAt: m.joinedAt,
      createdAt: m.user.createdAt,
      permissions: m.permissions.toArray()
    }));

    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:guildId/:userId/kick
router.post('/:guildId/:userId/kick', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const member = await guild.members.fetch(req.params.userId);
    if (!member) return res.status(404).json({ error: 'Uye bulunamadi' });

    await member.kick(req.body.reason || 'Web panel uzerinden atildi');

    logger.info('web', `Uye atildi: ${member.user.username} (${guild.name})`, { guildId: guild.id, userId: member.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:guildId/:userId/ban
router.post('/:guildId/:userId/ban', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    await guild.members.ban(req.params.userId, {
      reason: req.body.reason || 'Web panel uzerinden yasaklandi',
      deleteMessageDays: req.body.deleteDays || 0
    });

    logger.info('web', `Uye yasaklandi: ${req.params.userId} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:guildId/:userId/unban
router.post('/:guildId/:userId/unban', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    await guild.members.unban(req.params.userId);

    logger.info('web', `Yasak kaldirildi: ${req.params.userId} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:guildId/:userId/timeout
router.post('/:guildId/:userId/timeout', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const member = await guild.members.fetch(req.params.userId);
    if (!member) return res.status(404).json({ error: 'Uye bulunamadi' });

    const duration = (req.body.minutes || 5) * 60 * 1000;
    await member.timeout(duration, req.body.reason || 'Web panel uzerinden susturuldu');

    logger.info('web', `Uye susturuldu: ${member.user.username} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/members/:guildId/:userId/roles - Rol ekle/kaldir
router.put('/:guildId/:userId/roles', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const member = await guild.members.fetch(req.params.userId);
    if (!member) return res.status(404).json({ error: 'Uye bulunamadi' });

    const { add, remove } = req.body;

    if (add?.length) {
      for (const roleId of add) {
        await member.roles.add(roleId);
      }
    }

    if (remove?.length) {
      for (const roleId of remove) {
        await member.roles.remove(roleId);
      }
    }

    logger.info('web', `Uye rolleri guncellendi: ${member.user.username} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.setBotClient = setBotClient;
