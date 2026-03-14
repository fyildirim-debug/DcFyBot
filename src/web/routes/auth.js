const { Router } = require('express');
const { queryOne } = require('../../db');
const { hashPassword, verifyPassword, createToken, requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanici adi ve sifre gerekli' });
    }

    const admin = await queryOne('SELECT * FROM admin_users WHERE username = $1', [username]);

    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Kullanici adi veya sifre hatali' });
    }

    const token = createToken({ id: admin.id, username: admin.username, role: admin.role });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400000
    });

    logger.info('auth', `Giris: ${username}`);
    res.json({ token, username: admin.username, role: admin.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

module.exports = router;
