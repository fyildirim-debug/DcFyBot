const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { query, queryOne } = require('../../db');
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

    // Aktif mute'lari cek
    const activeMutes = await query(
      'SELECT user_id, reason, message, muted_at, expires_at FROM mutes WHERE guild_id = $1 AND active = TRUE AND expires_at > NOW()',
      [req.params.guildId]
    );
    const muteMap = {};
    for (const m of (activeMutes?.rows || activeMutes || [])) {
      muteMap[m.user_id] = m;
    }

    const members = [...guild.members.cache.values()].map(m => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName,
      nickname: m.nickname,
      avatar: m.user.displayAvatarURL({ size: 64 }),
      bot: m.user.bot,
      roles: m.roles.cache
        .filter(r => r.id !== guild.id)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
      joinedAt: m.joinedAt,
      createdAt: m.user.createdAt,
      permissions: m.permissions.toArray(),
      mute: muteMap[m.id] || null
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

// POST /api/members/:guildId/:userId/mute - Ozel susturma (mesaj silme + DM)
router.post('/:guildId/:userId/mute', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const member = await guild.members.fetch(req.params.userId);
    if (!member) return res.status(404).json({ error: 'Uye bulunamadi' });

    const { minutes, reason, message } = req.body;
    const duration = Math.max(1, Math.min(minutes || 5, 40320)); // 1dk - 28gun
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    // Onceki aktif mute'u kapat
    await query(
      'UPDATE mutes SET active = FALSE WHERE guild_id = $1 AND user_id = $2 AND active = TRUE',
      [guild.id, member.id]
    );

    // Yeni mute kaydi
    await query(
      'INSERT INTO mutes (guild_id, user_id, moderator_id, reason, message, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [guild.id, member.id, req.body.moderatorId || 'panel', reason || '', message || 'Susturuldugunuz icin mesaj gonderemezsiniz.', expiresAt]
    );

    // Discord timeout uygula
    try {
      await member.timeout(duration * 60 * 1000, reason || 'Web panel - susturma');
    } catch (e) {
      logger.warn('web', `Discord timeout uygulanamadi: ${e.message}`);
    }

    // DM gonder
    try {
      const timeStr = duration >= 60 ? `${Math.floor(duration/60)} saat ${duration%60} dakika` : `${duration} dakika`;
      await member.send(`**${guild.name}** sunucusunda susturuldunuz.\n**Sure:** ${timeStr}\n**Sebep:** ${reason || 'Belirtilmedi'}\n${message || ''}`);
    } catch {
      // DM kapali olabilir
    }

    logger.info('web', `Uye susturuldu: ${member.user.username} - ${duration}dk (${guild.name})`, { guildId: guild.id, userId: member.id });
    res.json({ success: true, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:guildId/:userId/unmute - Susturmayi erken ac
router.post('/:guildId/:userId/unmute', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const member = await guild.members.fetch(req.params.userId);
    if (!member) return res.status(404).json({ error: 'Uye bulunamadi' });

    // DB'den kaldir
    await query(
      'UPDATE mutes SET active = FALSE WHERE guild_id = $1 AND user_id = $2 AND active = TRUE',
      [guild.id, member.id]
    );

    // Discord timeout kaldir
    try {
      await member.timeout(null);
    } catch {}

    // DM gonder
    try {
      await member.send(`**${guild.name}** sunucusundaki susturmaniz kaldirildi.`);
    } catch {}

    logger.info('web', `Susturma kaldirildi: ${member.user.username} (${guild.name})`, { guildId: guild.id, userId: member.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.setBotClient = setBotClient;
