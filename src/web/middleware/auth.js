const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'fydcbot-default-secret';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Express middleware - auth gerektiren route'lar icin
function requireAuth(req, res, next) {
  // Token: header > cookie > query
  const token =
    req.headers.authorization?.replace('Bearer ', '') ||
    req.cookies?.token ||
    req.query?.token;

  if (!token) {
    return res.status(401).json({ error: 'Yetkisiz erisim' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Gecersiz veya suresi dolmus token' });
  }

  req.user = user;
  next();
}

// Setup kontrolu - kurulum tamamlanmadiysa setup'a yonlendir
function setupCheck(configModule) {
  return async (req, res, next) => {
    // API ve static dosyalar icin kontrol
    if (req.path.startsWith('/api/setup') || req.path.startsWith('/api/i18n')) {
      return next();
    }

    try {
      const isComplete = await configModule.isSetupComplete();

      if (!isComplete) {
        // API istegi mi?
        if (req.path.startsWith('/api/')) {
          return res.status(503).json({ error: 'setup_required', message: 'Kurulum tamamlanmadi' });
        }
        // HTML istegi - setup sayfasina yonlendir (SPA handle edecek)
      }
    } catch {
      // DB baglantisi yoksa da setup gerekli
    }

    next();
  };
}

module.exports = { hashPassword, verifyPassword, createToken, verifyToken, requireAuth, setupCheck };
