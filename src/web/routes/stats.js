const { Router } = require('express');
const { queryOne, queryAll, query } = require('../../db');
const { requireAuth } = require('../middleware/auth');

const router = Router();

let botClient = null;
function setBotClient(client) { botClient = client; }

// GET /api/stats
router.get('/', requireAuth, async (req, res) => {
  try {
    const totalMessages = (await queryOne("SELECT COUNT(*) as count FROM stats WHERE type = 'message'"))?.count || 0;
    const totalAIRequests = (await queryOne("SELECT COUNT(*) as count FROM stats WHERE type = 'ai_request'"))?.count || 0;
    const totalCommands = (await queryOne("SELECT COUNT(*) as count FROM stats WHERE type = 'command'"))?.count || 0;

    const botOnline = botClient?.isReady() || false;
    const guildCount = botClient?.guilds.cache.size || 0;
    const memberCount = botClient?.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0) || 0;
    const uptime = botClient?.uptime || 0;

    const ai = await queryOne('SELECT enabled, provider, model FROM ai_settings WHERE id = 1');

    // Sunucu listesi
    const guilds = botClient?.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL({ size: 64 }),
      memberCount: g.memberCount,
      channelCount: g.channels.cache.size
    })) || [];

    res.json({
      totalMessages: parseInt(totalMessages),
      totalAIRequests: parseInt(totalAIRequests),
      totalCommands: parseInt(totalCommands),
      botOnline,
      guildCount,
      memberCount,
      uptime,
      ai: {
        enabled: ai?.enabled || false,
        provider: ai?.provider || '',
        model: ai?.model || ''
      },
      guilds
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/logs
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { level, source, limit = 100, offset = 0 } = req.query;
    let sql = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    let idx = 1;

    if (level) { sql += ` AND level = $${idx++}`; params.push(level); }
    if (source) { sql += ` AND source = $${idx++}`; params.push(source); }

    sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const logs = await queryAll(sql, params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stats/logs
router.delete('/logs', requireAuth, async (req, res) => {
  await query('DELETE FROM logs');
  res.json({ success: true });
});

module.exports = router;
module.exports.setBotClient = setBotClient;
