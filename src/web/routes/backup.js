const { Router } = require('express');
const { query, queryAll, queryOne } = require('../../db');
const { requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');

const router = Router();

let botClient = null;
function setBotClient(client) { botClient = client; }

function getGuild(guildId) {
  if (!botClient) return null;
  return botClient.guilds.cache.get(guildId);
}

// ========== KANAL YEDEKLEME ==========

// POST /api/backup/:guildId/channels - Kanal yedegi olustur
router.post('/:guildId/channels', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const channels = guild.channels.cache.map(ch => ({
      name: ch.name,
      type: ch.type,
      position: ch.position,
      parentId: ch.parentId,
      parentName: ch.parent?.name || null,
      topic: ch.topic || null,
      nsfw: ch.nsfw || false,
      rateLimitPerUser: ch.rateLimitPerUser || 0,
      bitrate: ch.bitrate || null,
      userLimit: ch.userLimit || null,
      permissionOverwrites: ch.permissionOverwrites?.cache.map(po => ({
        id: po.id,
        type: po.type,
        allow: po.allow.toArray(),
        deny: po.deny.toArray()
      })) || []
    }));

    const backupName = req.body.name || `channels_${new Date().toISOString().slice(0, 10)}`;

    await query(
      'INSERT INTO channel_backups (guild_id, backup_name, data) VALUES ($1, $2, $3)',
      [req.params.guildId, backupName, JSON.stringify(channels)]
    );

    logger.info('backup', `Kanal yedegi olusturuldu: ${backupName} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true, name: backupName, channelCount: channels.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backup/:guildId/channels - Kanal yedeklerini listele
router.get('/:guildId/channels', requireAuth, async (req, res) => {
  try {
    const backups = await queryAll(
      'SELECT id, backup_name, created_at, jsonb_array_length(data) as channel_count FROM channel_backups WHERE guild_id = $1 ORDER BY created_at DESC',
      [req.params.guildId]
    );
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backup/:guildId/channels/:backupId/restore - Kanal yedegini geri yukle
router.post('/:guildId/channels/:backupId/restore', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const backup = await queryOne('SELECT * FROM channel_backups WHERE id = $1 AND guild_id = $2', [req.params.backupId, req.params.guildId]);
    if (!backup) return res.status(404).json({ error: 'Yedek bulunamadi' });

    const channels = backup.data;
    let created = 0;

    // Once kategorileri olustur
    const categories = channels.filter(ch => ch.type === 4);
    const categoryMap = {};

    for (const cat of categories) {
      try {
        const newCat = await guild.channels.create({ name: cat.name, type: 4, position: cat.position });
        categoryMap[cat.name] = newCat.id;
        created++;
      } catch {}
    }

    // Sonra diger kanallari olustur
    const others = channels.filter(ch => ch.type !== 4);
    for (const ch of others) {
      try {
        await guild.channels.create({
          name: ch.name,
          type: ch.type,
          parent: ch.parentName ? categoryMap[ch.parentName] : undefined,
          topic: ch.topic || undefined,
          nsfw: ch.nsfw || false,
          position: ch.position
        });
        created++;
      } catch {}
    }

    logger.info('backup', `Kanal yedegi geri yuklendi: ${created}/${channels.length} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true, created, total: channels.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== YETKI YEDEKLEME ==========

// POST /api/backup/:guildId/roles - Yetki yedegi olustur
router.post('/:guildId/roles', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const roles = guild.roles.cache
      .filter(r => !r.managed && r.id !== guild.id)
      .map(r => ({
        name: r.name,
        color: r.hexColor,
        position: r.position,
        permissions: r.permissions.bitfield.toString(),
        hoist: r.hoist,
        mentionable: r.mentionable
      }));

    const backupName = req.body.name || `roles_${new Date().toISOString().slice(0, 10)}`;

    await query(
      'INSERT INTO role_backups (guild_id, backup_name, data) VALUES ($1, $2, $3)',
      [req.params.guildId, backupName, JSON.stringify(roles)]
    );

    logger.info('backup', `Yetki yedegi olusturuldu: ${backupName} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true, name: backupName, roleCount: roles.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backup/:guildId/roles
router.get('/:guildId/roles', requireAuth, async (req, res) => {
  try {
    const backups = await queryAll(
      'SELECT id, backup_name, created_at, jsonb_array_length(data) as role_count FROM role_backups WHERE guild_id = $1 ORDER BY created_at DESC',
      [req.params.guildId]
    );
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backup/:guildId/roles/:backupId/restore
router.post('/:guildId/roles/:backupId/restore', requireAuth, async (req, res) => {
  try {
    const guild = getGuild(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const backup = await queryOne('SELECT * FROM role_backups WHERE id = $1 AND guild_id = $2', [req.params.backupId, req.params.guildId]);
    if (!backup) return res.status(404).json({ error: 'Yedek bulunamadi' });

    const roles = backup.data;
    let created = 0;

    for (const r of roles.sort((a, b) => a.position - b.position)) {
      try {
        await guild.roles.create({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          mentionable: r.mentionable,
          permissions: BigInt(r.permissions)
        });
        created++;
      } catch {}
    }

    logger.info('backup', `Yetki yedegi geri yuklendi: ${created}/${roles.length} (${guild.name})`, { guildId: guild.id });
    res.json({ success: true, created, total: roles.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/backup/:type/:backupId
router.delete('/:type/:backupId', requireAuth, async (req, res) => {
  try {
    const table = req.params.type === 'channels' ? 'channel_backups' : 'role_backups';
    await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.backupId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.setBotClient = setBotClient;
