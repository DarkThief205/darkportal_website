const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const defaultDbPath = process.env.NETLIFY ? path.join('/tmp', 'dg.sqlite3') : path.join(__dirname, 'dg.sqlite3');
const dbPath = process.env.DB_PATH || defaultDbPath;
const db = new sqlite3.Database(dbPath);

function init() {
  return new Promise(resolve => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        created INTEGER NOT NULL,
        verified INTEGER DEFAULT 0,
        verify_token TEXT,
        verification_code TEXT,
        code_expires INTEGER,
        oauth_provider TEXT,
        avatar_url TEXT,
        display_name TEXT,
        discord_id TEXT UNIQUE,
        discord_username TEXT,
        discord_global_name TEXT,
        discord_avatar TEXT,
        discord_access_token TEXT,
        discord_refresh_token TEXT,
        discord_token_expires INTEGER,
        google_id TEXT UNIQUE,
        google_name TEXT,
        google_avatar TEXT,
        steam_id TEXT UNIQUE,
        steam_persona TEXT,
        steam_avatar TEXT,
        steam_profile_url TEXT,
        apple_id TEXT UNIQUE,
        apple_name TEXT,
        apple_email TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS game_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_key TEXT NOT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        last_played INTEGER,
        meta_json TEXT DEFAULT '{}',
        UNIQUE(user_id, game_key),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS portal_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        event_key TEXT NOT NULL,
        amount INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        meta_json TEXT DEFAULT '{}',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS portal_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT DEFAULT 'new',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS tictactoe_matches (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'waiting',
        board_json TEXT NOT NULL DEFAULT '["","","","","","","","",""]',
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
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        finished_at INTEGER,
        meta_json TEXT DEFAULT '{}'
      )`, () => resolve());
    });
  });
}

function addColumn(table, name, sql) {
  db.all(`PRAGMA table_info(${table})`, (err, cols) => {
    if (err || !cols) return;
    if (!cols.map(c => c.name).includes(name)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${sql}`, e => {
        if (e) console.warn(`Migration warning for ${table}.${name}:`, e.message);
      });
    }
  });
}

function addMigrations() {
  const userColumns = [
    ['verification_code', 'TEXT'],
    ['code_expires', 'INTEGER'],
    ['oauth_provider', 'TEXT'],
    ['avatar_url', 'TEXT'],
    ['display_name', 'TEXT'],
    ['discord_id', 'TEXT'],
    ['discord_username', 'TEXT'],
    ['discord_global_name', 'TEXT'],
    ['discord_avatar', 'TEXT'],
    ['discord_access_token', 'TEXT'],
    ['discord_refresh_token', 'TEXT'],
    ['discord_token_expires', 'INTEGER'],
    ['google_id', 'TEXT'],
    ['google_name', 'TEXT'],
    ['google_avatar', 'TEXT'],
    ['steam_id', 'TEXT'],
    ['steam_persona', 'TEXT'],
    ['steam_avatar', 'TEXT'],
    ['steam_profile_url', 'TEXT'],
    ['apple_id', 'TEXT'],
    ['apple_name', 'TEXT'],
    ['apple_email', 'TEXT']
  ];

  return new Promise(resolve => {
    db.all(`PRAGMA table_info(users)`, (err, cols) => {
      if (err || !cols) return resolve();
      const existing = new Set(cols.map(c => c.name));
      const missing = userColumns.filter(([name]) => !existing.has(name));

      function runAlter(index) {
        if (index >= missing.length) return createIndexes();
        const [name, sql] = missing[index];
        db.run(`ALTER TABLE users ADD COLUMN ${name} ${sql}`, e => {
          if (e) console.warn(`Migration warning for users.${name}:`, e.message);
          runAlter(index + 1);
        });
      }

      function createIndexes() {
        db.serialize(() => {
          db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id) WHERE discord_id IS NOT NULL`, e => {
            if (e) console.warn('Migration warning for users.discord_id index:', e.message);
          });
          db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL`, e => {
            if (e) console.warn('Migration warning for users.google_id index:', e.message);
          });
          db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_steam_id ON users(steam_id) WHERE steam_id IS NOT NULL`, e => {
            if (e) console.warn('Migration warning for users.steam_id index:', e.message);
          });
          db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL`, e => {
            if (e) console.warn('Migration warning for users.apple_id index:', e.message);
          });
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`, e => {
            if (e) console.warn('Migration warning for users.email index:', e.message);
          });
          db.run(`CREATE TABLE IF NOT EXISTS portal_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            event_key TEXT NOT NULL,
            amount INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            meta_json TEXT DEFAULT '{}',
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
          )`, e => {
            if (e) console.warn('Migration warning for portal_events table:', e.message);
            resolve();
          });
        });
      }

      runAlter(0);
    });
  });
}

module.exports = { db, init, addMigrations };
