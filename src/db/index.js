const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    pool.on('error', (err) => {
      console.error('[DB] Beklenmeyen hata:', err.message);
    });
  }
  return pool;
}

// Tek sorgu
async function query(text, params = []) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// Tek satir getir
async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// Tum satirlari getir
async function queryAll(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

// Transaction
async function transaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Baglanti test
async function testConnection() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Pool'u kapat
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { query, queryOne, queryAll, transaction, testConnection, close, getPool };
