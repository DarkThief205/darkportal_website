const fs = require('fs');
const path = require('path');

const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const storePath = process.env.DATABASE_PATH || (isServerless ? path.join('/tmp', 'darkportal-store.json') : path.join(__dirname, 'darkportal-store.json'));

const USER_COLUMNS = [
  'id','username','email','password_hash','created','verified','verify_token','verification_code','code_expires','oauth_provider','avatar_url','display_name',
  'discord_id','discord_username','discord_global_name','discord_avatar','discord_access_token','discord_refresh_token','discord_token_expires',
  'google_id','google_name','google_avatar','steam_id','steam_persona','steam_avatar','steam_profile_url','apple_id','apple_name','apple_email'
];

const DEFAULT_DATA = {
  counters: { users: 0, portal_feedback: 0 },
  users: [],
  game_progress: [],
  portal_feedback: [],
  tictactoe_matches: []
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function loadStore() {
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      counters: { ...DEFAULT_DATA.counters, ...(parsed.counters || {}) },
      users: Array.isArray(parsed.users) ? parsed.users : [],
      game_progress: Array.isArray(parsed.game_progress) ? parsed.game_progress : [],
      portal_feedback: Array.isArray(parsed.portal_feedback) ? parsed.portal_feedback : [],
      tictactoe_matches: Array.isArray(parsed.tictactoe_matches) ? parsed.tictactoe_matches : []
    };
  } catch {
    return clone(DEFAULT_DATA);
  }
}

let data = loadStore();

function saveStore() {
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn('DarkPortal JSON store save warning:', err.message);
  }
}

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim();
}

function splitComma(input) {
  const out = [];
  let cur = '';
  let depth = 0;
  let quote = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      cur += ch;
      if (ch === quote && input[i - 1] !== '\\') quote = '';
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function tableFor(name) {
  const table = String(name || '').toLowerCase();
  if (!data[table]) data[table] = [];
  return data[table];
}

function callback(cb, err, result, ctx = {}) {
  if (typeof cb === 'function') setImmediate(() => cb.call(ctx, err, result));
}

function literalFromToken(token, params, cursor) {
  const raw = String(token || '').trim();
  if (raw === '?') return { value: params[cursor.index++], used: true };
  if (/^null$/i.test(raw)) return { value: null, used: false };
  if (/^\d+(?:\.\d+)?$/.test(raw)) return { value: Number(raw), used: false };
  const quoted = raw.match(/^['"](.*)['"]$/);
  if (quoted) return { value: quoted[1].replace(/''/g, "'"), used: false };
  return { value: raw, used: false };
}

function parseInsert(sql, params) {
  const match = sql.match(/^INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\)/i);
  if (!match) return null;
  const [, table, columnsRaw, valuesRaw] = match;
  const columns = columnsRaw.split(',').map((c) => c.trim().replace(/[`"']/g, ''));
  const tokens = splitComma(valuesRaw);
  const cursor = { index: 0 };
  const row = {};
  columns.forEach((col, i) => {
    row[col] = literalFromToken(tokens[i] || '?', params, cursor).value;
  });
  return { table: table.toLowerCase(), row };
}

function getById(table, id) {
  const key = String(id);
  return table.find((row) => String(row.id) === key) || null;
}

function publicRows(rows) {
  return clone(rows || []);
}

function selectUsers(sql, params, one) {
  const users = data.users;
  const lower = sql.toLowerCase();
  let rows = users;

  if (/where id = \?/i.test(sql)) {
    rows = users.filter((u) => String(u.id) === String(params[0]));
  } else if (/where username = \?/i.test(sql)) {
    rows = users.filter((u) => String(u.username) === String(params[0]));
  } else if (/where lower\(email\) = \? and id <> \?/i.test(sql)) {
    const email = String(params[0] || '').toLowerCase();
    rows = users.filter((u) => String(u.email || '').toLowerCase() === email && String(u.id) !== String(params[1]));
  } else if (/where lower\(email\) = \?/i.test(sql)) {
    const email = String(params[0] || '').toLowerCase();
    rows = users.filter((u) => String(u.email || '').toLowerCase() === email);
  } else {
    const provider = lower.match(/where (discord_id|google_id|steam_id) = \? and id <> \?/);
    if (provider) rows = users.filter((u) => String(u[provider[1]] || '') === String(params[0]) && String(u.id) !== String(params[1]));
    else {
      const providerOnly = lower.match(/where (discord_id|google_id|steam_id) = \?/);
      if (providerOnly) rows = users.filter((u) => String(u[providerOnly[1]] || '') === String(params[0]));
    }
  }

  if (/select\s+id\s+from/i.test(sql)) rows = rows.map((u) => ({ id: u.id }));
  return one ? clone(rows[0] || null) : publicRows(rows);
}

function selectGameProgress(sql, params, one) {
  let rows = data.game_progress.filter((g) => String(g.user_id) === String(params[0]));
  if (/and game_key = \?/i.test(sql)) rows = rows.filter((g) => String(g.game_key) === String(params[1]));
  if (/order by last_played desc/i.test(sql)) rows.sort((a, b) => Number(b.last_played || 0) - Number(a.last_played || 0));
  rows = rows.map((g) => ({
    game_key: g.game_key,
    wins: Number(g.wins || 0),
    losses: Number(g.losses || 0),
    draws: Number(g.draws || 0),
    best_score: Number(g.best_score || 0),
    xp: Number(g.xp || 0),
    last_played: g.last_played || null,
    meta_json: g.meta_json || '{}'
  }));
  return one ? clone(rows[0] || null) : publicRows(rows);
}

function select(sql, params, one) {
  const s = normalizeSql(sql);
  if (/^PRAGMA table_info\(users\)/i.test(s)) return USER_COLUMNS.map((name, cid) => ({ cid, name }));
  if (/^PRAGMA table_info\(/i.test(s)) return [];
  if (/FROM users/i.test(s)) return selectUsers(s, params, one);
  if (/SELECT COUNT\(\*\) AS c FROM portal_feedback/i.test(s)) {
    return { c: data.portal_feedback.filter((f) => String(f.user_id) === String(params[0])).length };
  }
  if (/FROM game_progress/i.test(s)) return selectGameProgress(s, params, one);
  if (/FROM tictactoe_matches WHERE id = \?/i.test(s)) {
    const row = data.tictactoe_matches.find((m) => String(m.id) === String(params[0]));
    return clone(row || null);
  }
  return one ? null : [];
}

function applyAssignment(row, assignment, params, cursor) {
  const parts = assignment.split(/\s*=\s*/);
  const col = (parts.shift() || '').trim().replace(/[`"']/g, '');
  const expr = parts.join('=').trim();
  if (!col) return;

  if (expr === '?') {
    row[col] = params[cursor.index++];
    return;
  }
  if (/^NULL$/i.test(expr)) {
    row[col] = null;
    return;
  }
  const coalesceParamFirst = expr.match(/^COALESCE\(\s*\?\s*,\s*([a-zA-Z0-9_]+)\s*\)$/i);
  if (coalesceParamFirst) {
    const value = params[cursor.index++];
    if (value !== null && value !== undefined && value !== '') row[col] = value;
    return;
  }
  const coalesceColumnFirstParam = expr.match(/^COALESCE\(\s*([a-zA-Z0-9_]+)\s*,\s*\?\s*\)$/i);
  if (coalesceColumnFirstParam) {
    const value = params[cursor.index++];
    const current = row[coalesceColumnFirstParam[1]];
    if (current === null || current === undefined || current === '') row[col] = value;
    else row[col] = current;
    return;
  }
  const coalesceColumnFirstLiteral = expr.match(/^COALESCE\(\s*([a-zA-Z0-9_]+)\s*,\s*['"]([^'"]*)['"]\s*\)$/i);
  if (coalesceColumnFirstLiteral) {
    const current = row[coalesceColumnFirstLiteral[1]];
    if (current === null || current === undefined || current === '') row[col] = coalesceColumnFirstLiteral[2];
    else row[col] = current;
    return;
  }
  const lit = literalFromToken(expr, params, cursor);
  row[col] = lit.value;
}

function updateTable(tableName, sql, params) {
  const table = tableFor(tableName);
  const setMatch = sql.match(/SET\s+(.+)\s+WHERE\s+id\s*=\s*\?/i);
  if (!setMatch) return 0;
  const assignments = splitComma(setMatch[1]);
  const cursor = { index: 0 };
  // Walk assignments once only to find how many placeholders belong to SET.
  const dummy = {};
  assignments.forEach((a) => applyAssignment(dummy, a, params, cursor));
  const id = params[cursor.index];
  const row = getById(table, id);
  if (!row) return 0;
  const realCursor = { index: 0 };
  assignments.forEach((a) => applyAssignment(row, a, params, realCursor));
  saveStore();
  return 1;
}

function insertGeneric(tableName, row) {
  const table = tableFor(tableName);
  if (tableName === 'users') {
    data.counters.users = Math.max(Number(data.counters.users || 0), ...data.users.map((u) => Number(u.id || 0))) + 1;
    row.id = data.counters.users;
    row.created = row.created || Date.now();
    row.verified = row.verified == null ? 0 : row.verified;
  } else if (tableName === 'portal_feedback') {
    data.counters.portal_feedback = Math.max(Number(data.counters.portal_feedback || 0), ...data.portal_feedback.map((f) => Number(f.id || 0))) + 1;
    row.id = data.counters.portal_feedback;
  }
  table.push(row);
  saveStore();
  return { lastID: row.id || row.id === 0 ? row.id : null, changes: 1 };
}

function upsertGameProgress(params) {
  const [user_id, game_key, wins, losses, draws, best_score, xp, last_played, meta_json] = params;
  let row = data.game_progress.find((g) => String(g.user_id) === String(user_id) && String(g.game_key) === String(game_key));
  if (!row) {
    row = { user_id, game_key, wins: 0, losses: 0, draws: 0, best_score: 0, xp: 0, last_played: null, meta_json: '{}' };
    data.game_progress.push(row);
  }
  row.wins = Number(row.wins || 0) + Number(wins || 0);
  row.losses = Number(row.losses || 0) + Number(losses || 0);
  row.draws = Number(row.draws || 0) + Number(draws || 0);
  row.best_score = Math.max(Number(row.best_score || 0), Number(best_score || 0));
  row.xp = Number(row.xp || 0) + Number(xp || 0);
  row.last_played = last_played;
  row.meta_json = meta_json || '{}';
  saveStore();
  return { changes: 1 };
}

function run(sql, params = [], cb) {
  const s = normalizeSql(sql);
  params = Array.isArray(params) ? params : [];
  try {
    if (/^(CREATE|ALTER|PRAGMA)/i.test(s) || /^CREATE (UNIQUE )?INDEX/i.test(s)) return callback(cb, null, undefined, { changes: 0 });

    if (/^INSERT INTO game_progress/i.test(s)) return callback(cb, null, undefined, upsertGameProgress(params));

    const insert = parseInsert(s, params);
    if (insert) return callback(cb, null, undefined, insertGeneric(insert.table, insert.row));

    const update = s.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET/i);
    if (update) return callback(cb, null, undefined, { changes: updateTable(update[1].toLowerCase(), s, params) });

    const del = s.match(/^DELETE FROM\s+([a-zA-Z0-9_]+)\s+WHERE\s+id\s*=\s*\?/i);
    if (del) {
      const table = tableFor(del[1]);
      const before = table.length;
      data[del[1].toLowerCase()] = table.filter((row) => String(row.id) !== String(params[0]));
      saveStore();
      return callback(cb, null, undefined, { changes: before - data[del[1].toLowerCase()].length });
    }

    return callback(cb, null, undefined, { changes: 0 });
  } catch (err) {
    return callback(cb, err);
  }
}

const db = {
  serialize(fn) { if (typeof fn === 'function') fn(); },
  run,
  get(sql, params = [], cb) {
    try { callback(cb, null, select(sql, Array.isArray(params) ? params : [], true)); }
    catch (err) { callback(cb, err); }
  },
  all(sql, params = [], cb) {
    try {
      const result = select(sql, Array.isArray(params) ? params : [], false);
      callback(cb, null, Array.isArray(result) ? result : (result ? [result] : []));
    } catch (err) { callback(cb, err); }
  }
};

function init() { saveStore(); return Promise.resolve(); }
function addMigrations() { return Promise.resolve(); }

module.exports = { db, init, addMigrations };
