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

module.exports = router;
module.exports.setBotClient = setBotClient;
