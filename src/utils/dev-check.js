// Dev modu kontrol scripti - dev.bat tarafindan cagirilir
// Kullanim: node src/utils/dev-check.js <komut>

require('dotenv').config();
const { Pool } = require('pg');

const cmd = process.argv[2];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000
});

async function run() {
  switch (cmd) {
    case 'db-test': {
      try {
        const r = await pool.query('SELECT current_database() as db, pg_size_pretty(pg_database_size(current_database())) as size, version() as v');
        const row = r.rows[0];
        const ver = row.v.split(' ').slice(0, 2).join(' ');
        console.log(`OK|${row.db}|${row.size}|${ver}`);
      } catch (e) {
        console.log(`FAIL|${e.message}`);
      }
      break;
    }

    case 'db-tables': {
      try {
        const r = await pool.query("SELECT count(*) as c FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(r.rows[0].c);
      } catch {
        console.log('0');
      }
      break;
    }

    case 'db-migration': {
      try {
        const r = await pool.query('SELECT COALESCE(MAX(version), 0) as v FROM _migrations');
        console.log(r.rows[0].v);
      } catch {
        console.log('0');
      }
      break;
    }

    case 'db-setup': {
      try {
        const r = await pool.query("SELECT value FROM system_settings WHERE key = 'setup_complete'");
        console.log(r.rows[0]?.value || 'false');
      } catch {
        console.log('false');
      }
      break;
    }

    case 'pkg-version': {
      const pkg = process.argv[3];
      try {
        const p = require(`${pkg}/package.json`);
        console.log(p.version);
      } catch {
        console.log('?');
      }
      break;
    }

    case 'today': {
      console.log(new Date().toISOString().slice(0, 10));
      break;
    }

    default:
      console.log('Bilinmeyen komut: ' + cmd);
  }

  await pool.end();
}

run().catch(() => pool.end());
