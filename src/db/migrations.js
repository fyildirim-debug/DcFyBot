const { query, queryOne } = require('./index');

// Migration listesi - sirali calisir
const migrations = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      -- Sistem ayarlari (setup, genel config)
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- AI yapilandirmasi
      CREATE TABLE IF NOT EXISTS ai_settings (
        id SERIAL PRIMARY KEY,
        enabled BOOLEAN DEFAULT FALSE,
        provider TEXT DEFAULT 'anthropic',
        base_url TEXT DEFAULT '',
        api_key TEXT DEFAULT '',
        model TEXT DEFAULT '',
        max_tokens INTEGER DEFAULT 128000,
        temperature REAL DEFAULT 0.7,
        system_prompt TEXT DEFAULT 'Sen yardimci bir Discord asistanisin.',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Bot yapilandirmasi
      CREATE TABLE IF NOT EXISTS bot_settings (
        id SERIAL PRIMARY KEY,
        token TEXT DEFAULT '',
        client_id TEXT DEFAULT '',
        prefix TEXT DEFAULT '!',
        activity_message TEXT DEFAULT 'FyDCBot',
        activity_type TEXT DEFAULT 'WATCHING',
        welcome_enabled BOOLEAN DEFAULT FALSE,
        welcome_message TEXT DEFAULT 'Hosgeldin {user}!',
        welcome_channel_id TEXT DEFAULT '',
        moderation_enabled BOOLEAN DEFAULT FALSE,
        language TEXT DEFAULT 'tr',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Admin kullanicilari
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Sunucu (guild) ayarlari
      CREATE TABLE IF NOT EXISTS guilds (
        guild_id TEXT PRIMARY KEY,
        guild_name TEXT,
        icon_url TEXT,
        member_count INTEGER DEFAULT 0,
        ai_enabled BOOLEAN DEFAULT TRUE,
        ai_channel_id TEXT,
        log_channel_id TEXT,
        welcome_channel_id TEXT,
        language TEXT DEFAULT 'tr',
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Kanal yedekleri
      CREATE TABLE IF NOT EXISTS channel_backups (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        backup_name TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Yetki yedekleri
      CREATE TABLE IF NOT EXISTS role_backups (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        backup_name TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Log kayitlari
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        level TEXT DEFAULT 'info',
        source TEXT DEFAULT 'system',
        message TEXT,
        guild_id TEXT,
        user_id TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Istatistikler
      CREATE TABLE IF NOT EXISTS stats (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        guild_id TEXT,
        user_id TEXT,
        value INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Eklenti ayarlari
      CREATE TABLE IF NOT EXISTS plugin_settings (
        plugin_name TEXT NOT NULL,
        guild_id TEXT NOT NULL DEFAULT '_global',
        enabled BOOLEAN DEFAULT FALSE,
        config JSONB DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (plugin_name, guild_id)
      );

      -- API anahtarlari
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key_name TEXT NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        permissions JSONB DEFAULT '["read"]',
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      );

      -- Indexler
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
      CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_stats_type ON stats(type);
      CREATE INDEX IF NOT EXISTS idx_stats_created ON stats(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_channel_backups_guild ON channel_backups(guild_id);
      CREATE INDEX IF NOT EXISTS idx_role_backups_guild ON role_backups(guild_id);
    `
  }
];

async function runMigrations() {
  // Migration tablosu
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const applied = await queryOne('SELECT COALESCE(MAX(version), 0) as v FROM _migrations');
  const currentVersion = applied?.v || 0;

  for (const m of migrations) {
    if (m.version > currentVersion) {
      console.log(`[DB] Migration calistiriliyor: v${m.version} - ${m.name}`);
      await query(m.up);
      await query('INSERT INTO _migrations (version, name) VALUES ($1, $2)', [m.version, m.name]);
      console.log(`[DB] Migration tamamlandi: v${m.version}`);
    }
  }

  // Varsayilan kayitlar (yoksa)
  const aiExists = await queryOne('SELECT id FROM ai_settings LIMIT 1');
  if (!aiExists) {
    await query('INSERT INTO ai_settings DEFAULT VALUES');
  }

  const botExists = await queryOne('SELECT id FROM bot_settings LIMIT 1');
  if (!botExists) {
    await query('INSERT INTO bot_settings DEFAULT VALUES');
  }
}

module.exports = { runMigrations };
