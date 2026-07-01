// Serverless-safe lightweight DB adapter.
// The original project used the native `sqlite3` package. Native sqlite binaries can
// crash inside serverless functions with Runtime.ExitError / exit status 129. This adapter
// keeps the same small db.run/db.get/db.all surface used by the app, without native code.
// Data is stored in /tmp while the function instance is warm. OAuth login itself is
// durable via the signed JWT cookie/localStorage session created by server.js.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = process.env.DB_PATH && String(process.env.DB_PATH).trim()
  ? String(process.env.DB_PATH).trim()
  : path.join('/tmp', 'darkportal-serverless-db.json');

const defaultState = () => ({
  nextUserId: 1,
  nextFeedbackId: 1,
  users: [],
  game_progress: [],
  portal_feedback: [],
  portal_events: [],
  tictactoe_matches: []
});

let state = loadState();

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const tmp = `${dbPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, dbPath);
  } catch (err) {
    // Serverless hosts may recycle /tmp; the JWT session still keeps login functional.
    console.warn('Netlify DB save warning:', err.message);
  }
}

function table(name) {
  if (!state[name]) state[name] = [];
  return state[name];
}

function clone(row) {
  return row ? JSON.parse(JSON.stringify(row)) : row;
}

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim();
}

function splitCsv(input) {
  const out = [];
  let cur = '';
  let quote = null;
  let depth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      cur += ch;
      if (ch === quote && input[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '\'' || ch === '"') { quote = ch; cur += ch; continue; }
    if (ch === '(') { depth += 1; cur += ch; continue; }
    if (ch === ')') { depth = Math.max(0, depth - 1); cur += ch; continue; }
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function literalValue(token) {
  const t = String(token || '').trim();
  if (t === '?') return undefined;
  if (/^NULL$/i.test(t)) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const quoted = t.match(/^['"](.*)['"]$/);
  if (quoted) return quoted[1].replace(/''/g, "'");
  return t;
}

function parseInsert(sql) {
  const match = String(sql || '').match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^]+?)\)(?:\s+ON\s+CONFLICT|\s*$)/i);
  if (!match) return null;
  return {
    table: match[1],
    columns: splitCsv(match[2]).map((s) => s.replace(/["`]/g, '').trim()),
    values: splitCsv(match[3])
  };
}

function buildRowFromInsert(sql, params) {
  const parsed = parseInsert(sql);
  if (!parsed) return null;
  let pi = 0;
  const row = {};
  parsed.columns.forEach((col, index) => {
    const token = parsed.values[index] || 'NULL';
    if (token.trim() === '?') row[col] = params[pi++];
    else row[col] = literalValue(token);
  });
  return { table: parsed.table, row };
}

function userDefaults(row = {}) {
  return {
    id: row.id,
    username: row.username || `user_${row.id}`,
    email: row.email ?? null,
    password_hash: row.password_hash ?? null,
    created: row.created || Date.now(),
    verified: row.verified ? 1 : 0,
    verify_token: row.verify_token ?? null,
    verification_code: row.verification_code ?? null,
    code_expires: row.code_expires ?? null,
    oauth_provider: row.oauth_provider ?? null,
    avatar_url: row.avatar_url ?? null,
    display_name: row.display_name ?? row.username ?? null,
    discord_id: row.discord_id ?? null,
    discord_username: row.discord_username ?? null,
    discord_global_name: row.discord_global_name ?? null,
    discord_avatar: row.discord_avatar ?? null,
    discord_access_token: row.discord_access_token ?? null,
    discord_refresh_token: row.discord_refresh_token ?? null,
    discord_token_expires: row.discord_token_expires ?? null,
    google_id: row.google_id ?? null,
    google_name: row.google_name ?? null,
    google_avatar: row.google_avatar ?? null,
    steam_id: row.steam_id ?? null,
    steam_persona: row.steam_persona ?? null,
    steam_avatar: row.steam_avatar ?? null,
    steam_profile_url: row.steam_profile_url ?? null,
    apple_id: row.apple_id ?? null,
    apple_name: row.apple_name ?? null,
    apple_email: row.apple_email ?? null
  };
}

function findUserById(id) {
  return table('users').find((u) => Number(u.id) === Number(id)) || null;
}

function evalAssignment(row, assignment, params, paramsCursor) {
  const idx = assignment.indexOf('=');
  if (idx < 0) return paramsCursor;
  const col = assignment.slice(0, idx).trim().replace(/["`]/g, '');
  const expr = assignment.slice(idx + 1).trim();
  let cursor = paramsCursor;
  const nextParam = () => params[cursor++];

  if (/^NULL$/i.test(expr)) { row[col] = null; return cursor; }
  if (/^\d+$/i.test(expr)) { row[col] = Number(expr); return cursor; }
  const quoted = expr.match(/^['"](.*)['"]$/);
  if (quoted) { row[col] = quoted[1]; return cursor; }
  if (expr === '?') { row[col] = nextParam(); return cursor; }

  let m = expr.match(/^COALESCE\s*\(\s*\?\s*,\s*(\w+)\s*\)$/i);
  if (m) {
    const value = nextParam();
    row[col] = value ?? row[m[1]] ?? null;
    return cursor;
  }

  m = expr.match(/^COALESCE\s*\(\s*(\w+)\s*,\s*\?\s*\)$/i);
  if (m) {
    const value = nextParam();
    row[col] = row[m[1]] ?? value ?? null;
    return cursor;
  }

  m = expr.match(/^COALESCE\s*\(\s*(\w+)\s*,\s*['"](.*)['"]\s*\)$/i);
  if (m) {
    row[col] = row[m[1]] ?? m[2];
    return cursor;
  }

  // Unknown expression: consume placeholders so subsequent assignments stay aligned.
  const q = (expr.match(/\?/g) || []).length;
  cursor += q;
  return cursor;
}

function updateRows(tableName, sql, params) {
  const rows = table(tableName);
  const normalized = normalizeSql(sql);
  const setMatch = normalized.match(/UPDATE\s+\w+\s+SET\s+(.+)\s+WHERE\s+(.+)$/i);
  if (!setMatch) return 0;
  const assignments = splitCsv(setMatch[1]);
  const where = setMatch[2];
  let targets = [];
  if (/\bid\s*=\s*\?\s*$/i.test(where)) {
    const id = params[params.length - 1];
    targets = rows.filter((r) => String(r.id) === String(id));
  } else {
    targets = rows;
  }
  for (const row of targets) {
    let cursor = 0;
    for (const assignment of assignments) cursor = evalAssignment(row, assignment, params, cursor);
  }
  if (targets.length) saveState();
  return targets.length;
}

function insertUser(row) {
  const users = table('users');
  const nowId = state.nextUserId++;
  const final = userDefaults({ id: nowId, ...row });
  users.push(final);
  saveState();
  return final;
}

function insertGameProgress(row) {
  const rows = table('game_progress');
  const existing = rows.find((r) => Number(r.user_id) === Number(row.user_id) && String(r.game_key) === String(row.game_key));
  if (existing) {
    existing.wins = Number(existing.wins || 0) + Number(row.wins || 0);
    existing.losses = Number(existing.losses || 0) + Number(row.losses || 0);
    existing.draws = Number(existing.draws || 0) + Number(row.draws || 0);
    existing.best_score = Math.max(Number(existing.best_score || 0), Number(row.best_score || 0));
    existing.xp = Number(existing.xp || 0) + Number(row.xp || 0);
    existing.last_played = row.last_played;
    existing.meta_json = row.meta_json || '{}';
    saveState();
    return existing;
  }
  rows.push({
    id: rows.length + 1,
    user_id: row.user_id,
    game_key: row.game_key,
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    draws: Number(row.draws || 0),
    best_score: Number(row.best_score || 0),
    xp: Number(row.xp || 0),
    last_played: row.last_played || Date.now(),
    meta_json: row.meta_json || '{}'
  });
  saveState();
  return rows[rows.length - 1];
}

function insertTicTacToe(row) {
  const rows = table('tictactoe_matches');
  const existing = rows.find((r) => String(r.id) === String(row.id));
  if (existing) return existing;
  const final = {
    status: 'waiting',
    board_json: '["","","","","","","",""]',
    turn: 'X',
    winner: null,
    player_x_key: null,
    player_x_name: null,
    player_x_discord_id: null,
    player_o_key: null,
    player_o_name: null,
    player_o_discord_id: null,
    invited_discord_id: null,
    invited_name: null,
    created_at: Date.now(),
    updated_at: Date.now(),
    finished_at: null,
    meta_json: '{}',
    ...row
  };
  rows.push(final);
  saveState();
  return final;
}

function run(sql, params = [], callback = () => {}) {
  const normalized = normalizeSql(sql);
  let result = { lastID: undefined, changes: 0 };
  try {
    if (/^(CREATE|ALTER|PRAGMA)\b/i.test(normalized)) {
      result.changes = 0;
    } else if (/^INSERT\s+INTO\s+users\b/i.test(normalized)) {
      const parsed = buildRowFromInsert(sql, params);
      const row = insertUser(parsed.row);
      result = { lastID: row.id, changes: 1 };
    } else if (/^UPDATE\s+users\b/i.test(normalized)) {
      result.changes = updateRows('users', sql, params);
    } else if (/^DELETE\s+FROM\s+users\s+WHERE\s+id\s*=\s*\?/i.test(normalized)) {
      const before = table('users').length;
      state.users = table('users').filter((u) => Number(u.id) !== Number(params[0]));
      result.changes = before - state.users.length;
      saveState();
    } else if (/^INSERT\s+INTO\s+portal_feedback\b/i.test(normalized)) {
      const parsed = buildRowFromInsert(sql, params);
      const row = { id: state.nextFeedbackId++, ...parsed.row };
      table('portal_feedback').push(row);
      saveState();
      result = { lastID: row.id, changes: 1 };
    } else if (/^INSERT\s+INTO\s+portal_events\b/i.test(normalized)) {
      const parsed = buildRowFromInsert(sql, params);
      const row = { id: table('portal_events').length + 1, ...parsed.row };
      table('portal_events').push(row);
      saveState();
      result = { lastID: row.id, changes: 1 };
    } else if (/^INSERT\s+INTO\s+game_progress\b/i.test(normalized)) {
      const parsed = buildRowFromInsert(sql, params);
      const row = insertGameProgress(parsed.row);
      result = { lastID: row.id, changes: 1 };
    } else if (/^INSERT\s+INTO\s+tictactoe_matches\b/i.test(normalized)) {
      const parsed = buildRowFromInsert(sql, params);
      const row = insertTicTacToe(parsed.row);
      result = { lastID: row.id, changes: 1 };
    } else if (/^UPDATE\s+tictactoe_matches\b/i.test(normalized)) {
      result.changes = updateRows('tictactoe_matches', sql, params);
    } else {
      console.warn('Netlify DB adapter ignored run:', normalized.slice(0, 180));
    }
    process.nextTick(() => callback.call(result, null));
  } catch (err) {
    process.nextTick(() => callback.call(result, err));
  }
  return db;
}

function get(sql, params = [], callback = () => {}) {
  const normalized = normalizeSql(sql);
  let row = null;
  try {
    if (/^SELECT \* FROM users WHERE id = \?/i.test(normalized)) {
      row = findUserById(params[0]);
    } else if (/^SELECT id FROM users WHERE username = \?/i.test(normalized)) {
      const found = table('users').find((u) => String(u.username) === String(params[0]));
      row = found ? { id: found.id } : null;
    } else if (/^SELECT \* FROM users WHERE (discord_id|google_id|steam_id) = \?/i.test(normalized)) {
      const col = normalized.match(/^SELECT \* FROM users WHERE (discord_id|google_id|steam_id) = \?/i)[1];
      row = table('users').find((u) => u[col] && String(u[col]) === String(params[0])) || null;
    } else if (/^SELECT \* FROM users WHERE lower\(email\) = \?/i.test(normalized)) {
      row = table('users').find((u) => u.email && lower(u.email) === lower(params[0])) || null;
    } else if (/^SELECT id FROM users WHERE (discord_id|google_id|steam_id) = \? AND id <> \?/i.test(normalized)) {
      const col = normalized.match(/^SELECT id FROM users WHERE (discord_id|google_id|steam_id) = \? AND id <> \?/i)[1];
      const found = table('users').find((u) => u[col] && String(u[col]) === String(params[0]) && Number(u.id) !== Number(params[1]));
      row = found ? { id: found.id } : null;
    } else if (/^SELECT id FROM users WHERE lower\(email\) = \? AND id <> \?/i.test(normalized)) {
      const found = table('users').find((u) => u.email && lower(u.email) === lower(params[0]) && Number(u.id) !== Number(params[1]));
      row = found ? { id: found.id } : null;
    } else if (/^SELECT COUNT\(\*\) AS c FROM portal_feedback WHERE user_id = \?/i.test(normalized)) {
      row = { c: table('portal_feedback').filter((f) => Number(f.user_id) === Number(params[0])).length };
    } else if (/^SELECT game_key, wins, losses, draws, best_score, xp, last_played, meta_json FROM game_progress WHERE user_id = \? AND game_key = \?/i.test(normalized)) {
      row = table('game_progress').find((g) => Number(g.user_id) === Number(params[0]) && String(g.game_key) === String(params[1])) || null;
    } else if (/^SELECT \* FROM tictactoe_matches WHERE id = \?/i.test(normalized)) {
      row = table('tictactoe_matches').find((m) => String(m.id) === String(params[0])) || null;
    } else {
      console.warn('Netlify DB adapter ignored get:', normalized.slice(0, 180));
    }
    process.nextTick(() => callback(null, clone(row)));
  } catch (err) {
    process.nextTick(() => callback(err));
  }
  return db;
}

function all(sql, params = [], callback = () => {}) {
  const normalized = normalizeSql(sql);
  let rows = [];
  try {
    if (/^PRAGMA table_info/i.test(normalized)) {
      rows = [];
    } else if (/^SELECT game_key, wins, losses, draws, best_score, xp, last_played, meta_json FROM game_progress WHERE user_id = \?/i.test(normalized)) {
      rows = table('game_progress')
        .filter((g) => Number(g.user_id) === Number(params[0]))
        .sort((a, b) => Number(b.last_played || 0) - Number(a.last_played || 0));
    } else {
      console.warn('Netlify DB adapter ignored all:', normalized.slice(0, 180));
    }
    process.nextTick(() => callback(null, clone(rows)));
  } catch (err) {
    process.nextTick(() => callback(err));
  }
  return db;
}

function init() {
  if (!Number.isFinite(Number(state.nextUserId)) || state.nextUserId < 1) state.nextUserId = 1;
  if (!Number.isFinite(Number(state.nextFeedbackId)) || state.nextFeedbackId < 1) state.nextFeedbackId = 1;
  return Promise.resolve();
}

function addMigrations() {
  return Promise.resolve();
}

const db = { serialize(fn) { if (typeof fn === 'function') fn(); return db; }, run, get, all };

module.exports = { db, init, addMigrations };
