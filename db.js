// PostgreSQL DB adapter for Vercel/serverless.
// Uses DATABASE_URL and exposes the small sqlite-like db.run/db.get/db.all API
// expected by server.js and routes/games/tictactoe.routes.js.
const { Pool } = require('pg');

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const hasDatabase = /^postgres(ql)?:\/\//i.test(DATABASE_URL);

let pool = null;
if (hasDatabase) {
  const sslMode = String(process.env.PGSSL || process.env.POSTGRES_SSL || '').toLowerCase();
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX || 3),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: sslMode === 'disable' || /sslmode=disable/i.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
  });
}

function requireDb() {
  if (!pool) {
    throw new Error('DATABASE_URL is missing. Add a Postgres DATABASE_URL in Vercel Environment Variables and redeploy.');
  }
  return pool;
}

function convertQuestionMarks(sql) {
  let index = 0;
  let out = '';
  let quote = null;
  for (let i = 0; i < String(sql).length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (quote) {
      out += ch;
      if (ch === quote && sql[i - 1] !== '\\') quote = null;
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      continue;
    }

    if (ch === '?') {
      index += 1;
      out += `$${index}`;
      continue;
    }

    out += ch;
  }
  return out;
}

function normalizeSqlForPostgres(sql) {
  let s = convertQuestionMarks(sql);

  // SQLite supports MAX(a,b) as scalar max; Postgres uses GREATEST(a,b).
  s = s.replace(/best_score\s*=\s*MAX\s*\(\s*best_score\s*,\s*excluded\.best_score\s*\)/ig,
    'best_score = GREATEST(best_score, EXCLUDED.best_score)');

  // SQLite accepts ON CONFLICT table alias in lowercase; Postgres is case-insensitive,
  // this replacement only keeps generated SQL tidy.
  s = s.replace(/excluded\./g, 'EXCLUDED.');

  return s;
}

function shouldReturnId(sql) {
  const s = String(sql || '').trim();
  if (!/^INSERT\s+INTO\s+/i.test(s)) return false;
  if (/\bRETURNING\b/i.test(s)) return false;
  return /^INSERT\s+INTO\s+(users|portal_feedback|portal_events)\b/i.test(s);
}

async function query(sql, params = []) {
  const pgSqlBase = normalizeSqlForPostgres(sql);
  const pgSql = shouldReturnId(sql) ? `${pgSqlBase} RETURNING id` : pgSqlBase;
  return requireDb().query(pgSql, params);
}

function run(sql, params = [], callback = () => {}) {
  const resultContext = { lastID: undefined, changes: 0 };

  query(sql, params)
    .then((result) => {
      resultContext.changes = result.rowCount || 0;
      if (result.rows && result.rows[0] && result.rows[0].id !== undefined) {
        resultContext.lastID = Number(result.rows[0].id);
      }
      callback.call(resultContext, null);
    })
    .catch((err) => {
      console.error('Postgres db.run failed:', err.message, String(sql).slice(0, 220));
      callback.call(resultContext, err);
    });

  return db;
}

function get(sql, params = [], callback = () => {}) {
  query(sql, params)
    .then((result) => callback(null, result.rows[0] || null))
    .catch((err) => {
      console.error('Postgres db.get failed:', err.message, String(sql).slice(0, 220));
      callback(err);
    });

  return db;
}

function all(sql, params = [], callback = () => {}) {
  query(sql, params)
    .then((result) => callback(null, result.rows || []))
    .catch((err) => {
      console.error('Postgres db.all failed:', err.message, String(sql).slice(0, 220));
      callback(err);
    });

  return db;
}

async function init() {
  const p = requireDb();

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT,
      created BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      verified INTEGER NOT NULL DEFAULT 0,
      verify_token TEXT,
      verification_code TEXT,
      code_expires BIGINT,
      oauth_provider TEXT,
      avatar_url TEXT,
      display_name TEXT,
      discord_id TEXT UNIQUE,
      discord_username TEXT,
      discord_global_name TEXT,
      discord_avatar TEXT,
      discord_access_token TEXT,
      discord_refresh_token TEXT,
      discord_token_expires BIGINT,
      google_id TEXT UNIQUE,
      google_name TEXT,
      google_avatar TEXT,
      steam_id TEXT UNIQUE,
      steam_persona TEXT,
      steam_avatar TEXT,
      steam_profile_url TEXT,
      apple_id TEXT,
      apple_name TEXT,
      apple_email TEXT
    )
  `);

  await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (LOWER(email)) WHERE email IS NOT NULL`);

  await p.query(`
    CREATE TABLE IF NOT EXISTS game_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_key TEXT NOT NULL,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      best_score INTEGER NOT NULL DEFAULT 0,
      xp INTEGER NOT NULL DEFAULT 0,
      last_played BIGINT,
      meta_json TEXT NOT NULL DEFAULT '{}',
      UNIQUE(user_id, game_key)
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS portal_feedback (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT 'other',
      message TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new'
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS game_saves (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      save_key TEXT NOT NULL,
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      UNIQUE(user_id, save_key)
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS portal_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      type TEXT,
      event_name TEXT,
      payload_json TEXT DEFAULT '{}',
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      status TEXT DEFAULT 'new'
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS tictactoe_matches (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'waiting',
      board_json TEXT NOT NULL DEFAULT '["","","","","","","",""]',
      turn TEXT DEFAULT 'X',
      winner TEXT,
      player_x_key TEXT,
      player_x_name TEXT,
      player_x_discord_id TEXT,
      player_o_key TEXT,
      player_o_name TEXT,
      player_o_discord_id TEXT,
      invited_discord_id TEXT,
      invited_name TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      finished_at BIGINT,
      meta_json TEXT DEFAULT '{}'
    )
  `);

  await p.query(`CREATE INDEX IF NOT EXISTS game_progress_user_idx ON game_progress(user_id)`);
  await p.query(`CREATE INDEX IF NOT EXISTS game_saves_user_idx ON game_saves(user_id)`);
  await p.query(`CREATE INDEX IF NOT EXISTS game_saves_prefix_idx ON game_saves(user_id, save_key)`);
  await p.query(`CREATE INDEX IF NOT EXISTS feedback_user_idx ON portal_feedback(user_id)`);
  await p.query(`CREATE INDEX IF NOT EXISTS tictactoe_updated_idx ON tictactoe_matches(updated_at)`);
}

async function addMigrations() {
  // Reserved for future schema changes. Tables are created in init().
}

const db = {
  serialize(fn) { if (typeof fn === 'function') fn(); return db; },
  run,
  get,
  all,
};

module.exports = { db, init, addMigrations };
