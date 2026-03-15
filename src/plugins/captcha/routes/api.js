const { Router } = require('express');
const { query, queryOne } = require('../../../db');
const { requireAuth } = require('../../../web/middleware/auth');
const logger = require('../../../utils/logger');
const router = Router();

// Bot client referansi
let botClient = null;

function setBotClient(client) {
  botClient = client;
}

// GET /api/plugins/captcha/settings/:guildId
router.get('/settings/:guildId', requireAuth, async (req, res) => {
  try {
    let settings = await queryOne('SELECT * FROM captcha_settings WHERE guild_id = $1', [req.params.guildId]);
    if (!settings) {
      settings = {
        guild_id: req.params.guildId,
        enabled: false,
        type: 'button',
        verified_role_id: null,
        unverified_role_id: null,
        verification_channel_id: null,
        log_channel_id: null,
        timeout_minutes: 5,
        kick_on_timeout: false,
        welcome_message: '',
        success_message: '',
        fail_message: '',
        auto_setup_done: false
      };
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/plugins/captcha/settings/:guildId
router.put('/settings/:guildId', requireAuth, async (req, res) => {
  try {
    const { enabled, type, verified_role_id, unverified_role_id, verification_channel_id, log_channel_id, timeout_minutes, kick_on_timeout, welcome_message, success_message, fail_message } = req.body;
    const guildId = req.params.guildId;

    await query(`
      INSERT INTO captcha_settings (guild_id, enabled, type, verified_role_id, unverified_role_id, verification_channel_id, log_channel_id, timeout_minutes, kick_on_timeout, welcome_message, success_message, fail_message, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (guild_id) DO UPDATE SET
        enabled = COALESCE($2, captcha_settings.enabled),
        type = COALESCE($3, captcha_settings.type),
        verified_role_id = COALESCE($4, captcha_settings.verified_role_id),
        unverified_role_id = COALESCE($5, captcha_settings.unverified_role_id),
        verification_channel_id = COALESCE($6, captcha_settings.verification_channel_id),
        log_channel_id = COALESCE($7, captcha_settings.log_channel_id),
        timeout_minutes = COALESCE($8, captcha_settings.timeout_minutes),
        kick_on_timeout = COALESCE($9, captcha_settings.kick_on_timeout),
        welcome_message = COALESCE($10, captcha_settings.welcome_message),
        success_message = COALESCE($11, captcha_settings.success_message),
        fail_message = COALESCE($12, captcha_settings.fail_message),
        updated_at = NOW()
    `, [guildId, enabled, type, verified_role_id, unverified_role_id, verification_channel_id, log_channel_id, timeout_minutes, kick_on_timeout, welcome_message, success_message, fail_message]);

    logger.info('captcha', `Captcha ayarlari guncellendi: ${guildId}`);
    const updated = await queryOne('SELECT * FROM captcha_settings WHERE guild_id = $1', [guildId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plugins/captcha/auto-setup/:guildId
router.post('/auto-setup/:guildId', requireAuth, async (req, res) => {
  try {
    if (!botClient) {
      return res.status(503).json({ error: 'Bot cevrimdisi' });
    }

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Sunucu bulunamadi' });
    }

    // Captcha plugini'ni yukle
    const captchaPlugin = require('../index');
    const results = await captchaPlugin.autoSetupGuild(guild);

    // Ayarlari kaydet
    await query(`
      INSERT INTO captcha_settings (guild_id, enabled, type, verified_role_id, unverified_role_id, verification_channel_id, auto_setup_done, updated_at)
      VALUES ($1, TRUE, $2, $3, $4, $5, TRUE, NOW())
      ON CONFLICT (guild_id) DO UPDATE SET
        enabled = TRUE,
        verified_role_id = $3,
        unverified_role_id = $4,
        verification_channel_id = $5,
        auto_setup_done = TRUE,
        updated_at = NOW()
    `, [req.params.guildId, req.body.type || 'button', results.verified_role_id, results.unverified_role_id, results.verification_channel_id]);

    logger.info('captcha', `Otomatik kurulum tamamlandi: ${guild.name}`);

    res.json({
      success: true,
      verified_role_id: results.verified_role_id,
      unverified_role_id: results.unverified_role_id,
      verification_channel_id: results.verification_channel_id
    });
  } catch (err) {
    logger.error('captcha', `Otomatik kurulum hatasi: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/plugins/captcha/pending/:guildId
router.get('/pending/:guildId', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM captcha_pending WHERE guild_id = $1 ORDER BY created_at DESC',
      [req.params.guildId]
    );
    const data = Array.isArray(rows) ? rows : (rows?.rows || []);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/plugins/captcha/pending/:guildId/:userId - Manuel dogrulama (admin)
router.delete('/pending/:guildId/:userId', requireAuth, async (req, res) => {
  try {
    if (!botClient) {
      return res.status(503).json({ error: 'Bot cevrimdisi' });
    }

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const settings = await queryOne('SELECT * FROM captcha_settings WHERE guild_id = $1', [req.params.guildId]);
    if (!settings) return res.status(404).json({ error: 'Captcha ayarlari bulunamadi' });

    const captchaPlugin = require('../index');
    // Manuel dogrulama yap (admin tarafindan)
    const member = await guild.members.fetch(req.params.userId).catch(() => null);
    if (!member) return res.status(404).json({ error: 'Uye bulunamadi' });

    if (settings.verified_role_id) {
      await member.roles.add(settings.verified_role_id).catch(() => {});
    }
    if (settings.unverified_role_id) {
      await member.roles.remove(settings.unverified_role_id).catch(() => {});
    }

    await query('DELETE FROM captcha_pending WHERE guild_id = $1 AND user_id = $2', [req.params.guildId, req.params.userId]);

    logger.info('captcha', `Admin tarafindan dogrulandi: ${member.user.tag}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plugins/captcha/disable/:guildId - Captcha kapat ve izinleri geri al
router.post('/disable/:guildId', requireAuth, async (req, res) => {
  try {
    if (!botClient) {
      return res.status(503).json({ error: 'Bot cevrimdisi' });
    }

    const guild = botClient.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadi' });

    const settings = await queryOne('SELECT * FROM captcha_settings WHERE guild_id = $1', [req.params.guildId]);

    if (settings) {
      // @everyone'a ViewChannel geri ver
      const channels = guild.channels.cache.filter(c =>
        c.id !== settings.verification_channel_id
      );

      for (const [, channel] of channels) {
        try {
          await channel.permissionOverwrites.delete(guild.id).catch(() => {});
          if (settings.verified_role_id) {
            await channel.permissionOverwrites.delete(settings.verified_role_id).catch(() => {});
          }
        } catch {}
      }

      // Tum dogrulanmamis uyelere dogrulanmis rolunu ver
      if (settings.unverified_role_id) {
        const unverifiedRole = guild.roles.cache.get(settings.unverified_role_id);
        if (unverifiedRole) {
          for (const [, member] of unverifiedRole.members) {
            if (settings.verified_role_id) {
              await member.roles.add(settings.verified_role_id).catch(() => {});
            }
            await member.roles.remove(settings.unverified_role_id).catch(() => {});
          }
        }
      }

      // DB guncelle
      await query('UPDATE captcha_settings SET enabled = FALSE, updated_at = NOW() WHERE guild_id = $1', [req.params.guildId]);
      await query('DELETE FROM captcha_pending WHERE guild_id = $1', [req.params.guildId]);
    }

    logger.info('captcha', `Captcha deaktif edildi: ${guild.name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.setBotClient = setBotClient;
