const { Router } = require('express');
const { query, queryOne } = require('../../db');
const { requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');

const router = Router();

// GET /api/wordfilter/:guildId - Tum yasakli kelimeler
router.get('/:guildId', requireAuth, async (req, res) => {
  try {
    const words = await query(
      'SELECT * FROM word_filters WHERE guild_id = $1 ORDER BY created_at DESC',
      [req.params.guildId]
    );
    res.json(Array.isArray(words) ? words : (words?.rows || []));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wordfilter/:guildId - Yeni yasakli kelime ekle
router.post('/:guildId', requireAuth, async (req, res) => {
  try {
    const { word, match_type, action, action_duration, warn_message } = req.body;
    if (!word?.trim()) return res.status(400).json({ error: 'Kelime bos olamaz' });

    const result = await query(
      `INSERT INTO word_filters (guild_id, word, match_type, action, action_duration, warn_message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.guildId, word.trim().toLowerCase(), match_type || 'contains', action || 'delete', action_duration || 0, warn_message || '']
    );

    logger.info('web', `Yasakli kelime eklendi: "${word}" (${action})`, { guildId: req.params.guildId });
    const row = Array.isArray(result) ? result[0] : result?.rows?.[0];
    res.json(row || { success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/wordfilter/:guildId/:id - Yasakli kelime guncelle
router.put('/:guildId/:id', requireAuth, async (req, res) => {
  try {
    const { word, match_type, action, action_duration, warn_message, enabled } = req.body;
    await query(
      `UPDATE word_filters SET
        word = COALESCE($1, word),
        match_type = COALESCE($2, match_type),
        action = COALESCE($3, action),
        action_duration = COALESCE($4, action_duration),
        warn_message = COALESCE($5, warn_message),
        enabled = COALESCE($6, enabled)
      WHERE id = $7 AND guild_id = $8`,
      [word, match_type, action, action_duration, warn_message, enabled, req.params.id, req.params.guildId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/wordfilter/:guildId/:id - Yasakli kelime sil
router.delete('/:guildId/:id', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM word_filters WHERE id = $1 AND guild_id = $2', [req.params.id, req.params.guildId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
