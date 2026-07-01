require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { db, init, addMigrations } = require('./db');
const createTicTacToeRouter = require('./routes/games/tictactoe.routes');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const BASE_URL = process.env.BASE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || `http://localhost:${PORT}`;

const CANONICAL_ORIGIN = process.env.ENFORCE_CANONICAL_ORIGIN === 'true' ? normalizeOrigin(process.env.PUBLIC_CANONICAL_ORIGIN || process.env.CANONICAL_ORIGIN || '') : '';

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value || '').trim());
    return `${url.protocol}//${url.host}`.replace(/\/$/, '');
  } catch {
    return '';
  }
}
function isLocalHostName(hostname) {
  const host = String(hostname || '').split(':')[0].toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}
function requestOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol || 'http';
  const host = req.get('host') || '';
  return `${proto}://${host}`.replace(/\/$/, '');
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET;
const DISCORD_REDIRECT_URI_ENV = process.env.DISCORD_REDIRECT_URI || '';
function appBaseUrl(req) { return normalizeOrigin(process.env.BASE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || '') || requestOrigin(req); }
function discordRedirectUri(req) { return normalizeOrigin(DISCORD_REDIRECT_URI_ENV) ? DISCORD_REDIRECT_URI_ENV : `${appBaseUrl(req)}/auth/discord/callback`; }
const DISCORD_BOT_INVITE = process.env.DISCORD_BOT_INVITE || '';
const SUPPORT_INVITE_URL = process.env.SUPPORT_INVITE_URL || 'https://discord.gg/bJ8dqwSCuU';
const configuredBotStatusUrl = process.env.DISCORD_BOT_STATUS_URL || process.env.BOT_STATUS_URL || '';
const DISCORD_BOT_STATUS_URL = (!configuredBotStatusUrl || configuredBotStatusUrl.includes('YOUR_') || configuredBotStatusUrl.includes('placeholder')) ? 'http://127.0.0.1:3001/status' : configuredBotStatusUrl;
const STATUS_CHECK_TIMEOUT_MS = Math.min(Math.max(Number(process.env.STATUS_CHECK_TIMEOUT_MS || 2000), 500), 4500);
const DISCORD_BOT_STATUS_OVERRIDE = process.env.DISCORD_BOT_STATUS || process.env.BOT_STATUS || '';
function botStatusCandidates() {
  const raw = process.env.DISCORD_BOT_STATUS_URLS || process.env.DISCORD_BOT_STATUS_URL || process.env.BOT_STATUS_URL || DISCORD_BOT_STATUS_URL;
  const parts = String(raw || '').split(',').map((v) => v.trim()).filter(Boolean);
  const out = [];
  for (const item of parts.length ? parts : [DISCORD_BOT_STATUS_URL]) {
    try {
      const u = new URL(item);
      out.push(u.toString());
      if (!/\/(status|api\/status|health)\/?$/i.test(u.pathname)) {
        const base = `${u.protocol}//${u.host}`;
        out.push(`${base}/status`, `${base}/api/status`, `${base}/health`);
      }
    } catch {}
  }
  return [...new Set(out)];
}
async function probeDiscordBotStatus() {
  const override = normalizePortalStatus(DISCORD_BOT_STATUS_OVERRIDE, '');
  if (override) return { state: override, source: 'DISCORD_BOT_STATUS' };
  let best = null;
  for (const url of botStatusCandidates()) {
    const state = await probeStatusUrl(url);
    if (state === 'online') return { state, source: url };
    if (state && state !== 'offline' && !best) best = { state, source: url };
  }
  return best || { state: 'offline', source: botStatusCandidates()[0] || DISCORD_BOT_STATUS_URL };
}
function discordBotInviteUrl() {
  // Use the exact invite the owner provided. Do not mutate it with extra query params,
  // because Discord can reject malformed app-install URLs with "Invalid Form Body".
  const fixedInvite = 'https://discord.com/oauth2/authorize?client_id=963487472300482560';
  const raw = String(DISCORD_BOT_INVITE || fixedInvite).trim();
  try {
    const url = new URL(raw);
    if (/discord(?:app)?\.com$/i.test(url.hostname) && url.pathname.includes('/oauth2/authorize') && url.searchParams.get('client_id')) {
      return url.toString();
    }
  } catch {}
  return fixedInvite;
}
const DISCORD_SCOPES = 'identify email guilds';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI_ENV = process.env.GOOGLE_REDIRECT_URI || '';
function googleRedirectUri(req) { return normalizeOrigin(GOOGLE_REDIRECT_URI_ENV) ? GOOGLE_REDIRECT_URI_ENV : `${appBaseUrl(req)}/auth/google/callback`; }
const GOOGLE_SCOPES = 'openid email profile';

const STEAM_API_KEY = process.env.STEAM_API_KEY || '';
const STEAM_RETURN_URL_ENV = process.env.STEAM_RETURN_URL || '';
const STEAM_REALM_ENV = process.env.STEAM_REALM || '';
function steamReturnUrl(req) { return normalizeOrigin(STEAM_RETURN_URL_ENV) ? STEAM_RETURN_URL_ENV : `${appBaseUrl(req)}/auth/steam/callback`; }
function steamRealm(req) { return normalizeOrigin(STEAM_REALM_ENV) || appBaseUrl(req); }


function isRealConfig(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  return !/(^your_|placeholder|change_me|example|client_id_here|client_secret_here)/i.test(v);
}
function isLocalBaseUrl() {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(BASE_URL);
}
function isLocalRequest(req) {
  const host = String(req?.hostname || req?.headers?.host || '').split(':')[0].toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}
function allowLocalProviderFallback(req) {
  return process.env.ENABLE_LOCAL_PROVIDER_FALLBACK !== 'false' && (isLocalBaseUrl() || isLocalRequest(req));
}
function shouldUseLocalProviderFallback(req) {
  // Localhost/dev OAuth often fails when OAuth client IDs or redirect URLs are placeholders.
  // On localhost we create a local provider-backed Dark Portal session immediately.
  // Set FORCE_REAL_OAUTH=true to force external provider redirects while testing.
  return allowLocalProviderFallback(req) && process.env.FORCE_REAL_OAUTH !== 'true';
}
async function finishLocalProviderLogin(provider, next, res, req = null, linkToken = '') {
  if (!allowLocalProviderFallback(req)) return res.status(500).send(`${provider} OAuth is not configured. Add real provider credentials to .env.`);
  try {
    await dbReady;
    const id = `${provider}_local_user`;
    const names = { discord: 'Discord Local User', google: 'Google Local User', steam: 'Steam Local User' };
    const row = await resolveProviderLogin(provider, {
      id,
      email: `${provider}@local.darkportal.dev`,
      username: names[provider] || 'Local User',
      name: names[provider] || 'Local User',
      avatar: null,
      profile_url: null
    }, linkToken);
    return finishBrowserLogin(res, row, next);
  } catch (err) {
    return sendOAuthError(res, err.message || `Could not link ${provider}.`, safeRedirect(next || '/profile.html'));
  }
}

app.use(cors());

function enforceCanonicalOrigin(req, res, next) {
  if (!CANONICAL_ORIGIN || !['GET', 'HEAD'].includes(req.method)) return next();
  const target = new URL(CANONICAL_ORIGIN);
  const host = String(req.get('host') || '').split(':')[0].toLowerCase();
  if (isLocalHostName(host)) return next();
  if (requestOrigin(req).toLowerCase() === CANONICAL_ORIGIN.toLowerCase()) return next();
  return res.redirect(308, CANONICAL_ORIGIN + (req.originalUrl || '/'));
}

app.use(enforceCanonicalOrigin);

app.get('/bot-invite', (req, res) => res.redirect(discordBotInviteUrl()));
app.get('/support-invite', (req, res) => res.redirect(SUPPORT_INVITE_URL));

function normalizePortalStatus(value, fallback = 'offline') {
  const state = String(value || fallback).trim().toLowerCase();
  const aliases = {
    ok: 'online', up: 'online', ready: 'online', healthy: 'online', connected: 'online', live: 'online', true: 'online', yes: 'online',
    degraded: 'partial', warning: 'partial', warn: 'partial', reconnecting: 'partial',
    error: 'critical', down: 'critical', failed: 'critical', failing: 'critical',
    unknown: 'offline', disconnected: 'offline'
  };
  const normalized = aliases[state] || state;
  return ['online', 'partial', 'critical', 'offline', 'checking'].includes(normalized) ? normalized : fallback;
}

function statusLabel(state) {
  return ({ online: 'Online', partial: 'Partial', critical: 'Critical', offline: 'Offline', checking: 'Checking' })[state] || 'Offline';
}
function statusDetail(state, source) {
  const detail = {
    online: 'Service responded normally.',
    partial: 'Service responded, but reported a degraded or reconnecting state.',
    critical: 'Service responded with a critical error.',
    offline: 'Service did not respond from the portal.',
    checking: 'Checking status.'
  }[state] || 'Status unknown.';
  return source ? `${detail} (${source})` : detail;
}

async function probeStatusUrl(url) {
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STATUS_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json, text/plain;q=0.9, */*;q=0.1' }
    });
    const contentType = response.headers.get('content-type') || '';
    let payload = null;
    if (contentType.includes('application/json')) payload = await response.json().catch(() => null);
    else payload = await response.text().catch(() => '');

    if (!response.ok) return response.status >= 500 ? 'critical' : 'partial';

    if (payload && typeof payload === 'object') {
      if (typeof payload.online === 'boolean') return payload.online ? 'online' : 'offline';
      if (typeof payload.ready === 'boolean') return payload.ready ? 'online' : 'partial';
      return normalizePortalStatus(payload.state || payload.status || payload.botStatus || payload.discord || payload.health, 'online');
    }

    const text = String(payload || '').toLowerCase();
    if (text.includes('critical') || text.includes('error') || text.includes('fail')) return 'critical';
    if (text.includes('partial') || text.includes('degraded') || text.includes('reconnect')) return 'partial';
    if (text.includes('offline') || text.includes('down') || text.includes('disconnect')) return 'offline';
    return 'online';
  } catch (error) {
    return 'offline';
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/portal-status', async (req, res) => {
  const started = Date.now();
  res.set('Cache-Control', 'no-store');

  // If this JSON route responds, the website process itself is online.
  const websiteState = 'online';

  const botProbe = await probeDiscordBotStatus();
  const botState = botProbe.state || 'offline';

  res.json({
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    website: {
      state: websiteState,
      label: statusLabel(websiteState),
      detail: statusDetail(websiteState, 'portal api')
    },
    bot: {
      state: botState,
      label: statusLabel(botState),
      detail: statusDetail(botState, botProbe.source || DISCORD_BOT_STATUS_URL),
      invite: discordBotInviteUrl()
    },
    supportInvite: SUPPORT_INVITE_URL,
    serverOnline: websiteState === 'online',
    botOnline: botState === 'online',
    botInvite: discordBotInviteUrl()
  });
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const publicDir = path.join(__dirname, 'public');
app.use(express.static(fs.existsSync(publicDir) ? publicDir : '.'));

const dbReady = Promise.resolve(init()).then(() => addMigrations());

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function safeRedirect(target) {
  if (!target || typeof target !== 'string') return '/dashboard.html';
  if (!target.startsWith('/') || target.startsWith('//')) return '/dashboard.html';
  if (target.startsWith('/auth/') || target.startsWith('/api/')) return '/dashboard.html';
  return target;
}

function encodeState(next, linkToken = '') {
  const payload = { next: safeRedirect(next) };
  if (linkToken) payload.link = String(linkToken);
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeStatePayload(state) {
  try {
    const parsed = JSON.parse(Buffer.from(String(state || ''), 'base64url').toString('utf8'));
    return {
      next: safeRedirect(parsed.next),
      link: parsed.link ? String(parsed.link) : ''
    };
  } catch {
    return { next: '/dashboard.html', link: '' };
  }
}

function decodeState(state) {
  return decodeStatePayload(state).next;
}

function providerDisplayName(provider) {
  return ({ discord: 'Discord', google: 'Google', steam: 'Steam' })[provider] || 'Provider';
}

function sendOAuthError(res, message, next = '/profile.html') {
  const target = safeRedirect(next || '/profile.html');
  const safeMessage = String(message || 'OAuth failed.');
  res.status(400).send(`<!doctype html>
<meta charset="utf-8">
<title>Provider link failed</title>
<script>
const message = ${JSON.stringify(safeMessage)};
sessionStorage.setItem('dg_profile_notice', message);
alert(message);
location.replace(${JSON.stringify(target)});
</script>
<p>${safeMessage.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))}</p>`);
}

function createProviderLinkToken(provider, userId) {
  return jwt.sign({ typ: 'provider_link', provider, user_id: Number(userId) }, JWT_SECRET, { expiresIn: '10m' });
}

function verifyProviderLinkToken(provider, token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(String(token), JWT_SECRET);
    if (payload?.typ !== 'provider_link' || payload?.provider !== provider || !payload?.user_id) {
      throw new Error('Invalid provider link token.');
    }
    return Number(payload.user_id);
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') throw new Error('Provider linking expired. Start the link again from Profile.');
    throw new Error('Invalid provider linking session. Start the link again from Profile.');
  }
}

async function getBearerUser(req, res, next) {
  const headerAuth = req.headers.authorization;
  let token = headerAuth && headerAuth.startsWith('Bearer ') ? headerAuth.slice(7) : '';
  if (!token && req.headers.cookie) {
    const match = String(req.headers.cookie || '').match(/(?:^|;\s*)dg_token=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await dbReady;
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    const message = err && err.name === 'JsonWebTokenError' ? 'Invalid token' : 'Unauthorized';
    return res.status(401).json({ error: message });
  }
}

function tokenPayloadToUserRow(payload) {
  if (!payload || !payload.id || !payload.username) return null;
  return {
    id: payload.id,
    username: payload.username,
    email: payload.email || null,
    created: payload.created || Date.now(),
    verified: payload.verified ? 1 : 0,
    oauth_provider: payload.oauth_provider || null,
    avatar_url: payload.avatar_url || null,
    display_name: payload.display_name || payload.username,
    discord_id: payload.discord_id || null,
    discord_username: payload.discord_username || null,
    discord_global_name: payload.discord_global_name || null,
    discord_avatar: payload.discord_avatar || null,
    discord_access_token: payload.discord_access_token || null,
    discord_refresh_token: null,
    discord_token_expires: payload.discord_token_expires || null,
    google_id: payload.google_id || null,
    google_name: payload.google_name || null,
    google_avatar: payload.google_avatar || null,
    steam_id: payload.steam_id || null,
    steam_persona: payload.steam_persona || null,
    steam_avatar: payload.steam_avatar || null,
    steam_profile_url: payload.steam_profile_url || null,
    apple_id: null,
    apple_name: null,
    apple_email: null
  };
}

async function currentUserRow(req) {
  let row = null;
  try { row = await dbGet(`SELECT * FROM users WHERE id = ?`, [req.user.id]); } catch {}
  return row || tokenPayloadToUserRow(req.user);
}

function userAvatar(row) {
  return row.avatar_url || row.discord_avatar || row.google_avatar || row.steam_avatar || null;
}

function userDisplayName(row) {
  return row.display_name || row.discord_global_name || row.discord_username || row.google_name || row.steam_persona || row.username;
}

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    display_name: userDisplayName(row),
    email: row.email,
    verified: !!row.verified,
    created: row.created,
    avatar_url: userAvatar(row),
    oauth_provider: row.oauth_provider || null,
    discord: row.discord_id ? {
      id: row.discord_id,
      username: row.discord_username,
      global_name: row.discord_global_name,
      avatar: row.discord_avatar
    } : null,
    google: row.google_id ? {
      id: row.google_id,
      name: row.google_name,
      avatar: row.google_avatar
    } : null,
    steam: row.steam_id ? {
      id: row.steam_id,
      persona: row.steam_persona,
      avatar: row.steam_avatar,
      profile_url: row.steam_profile_url
    } : null,
    linked: {
      discord: !!row.discord_id,
      google: !!row.google_id,
      steam: !!row.steam_id
    }
  };
}

function signUser(row) {
  return jwt.sign({
    id: row.id,
    username: row.username,
    display_name: userDisplayName(row),
    email: row.email,
    created: row.created || Date.now(),
    verified: !!row.verified,
    avatar_url: userAvatar(row),
    oauth_provider: row.oauth_provider || null,
    discord_id: row.discord_id || null,
    discord_username: row.discord_username || null,
    discord_global_name: row.discord_global_name || null,
    discord_avatar: row.discord_avatar || null,
    // Netlify Functions do not provide a reliable persistent SQLite disk.
    // Keep the short-lived Discord access token inside the signed session so
    // the dashboard still works after the OAuth callback even if SQLite is cold.
    discord_access_token: row.discord_access_token || null,
    discord_token_expires: row.discord_token_expires || null,
    google_id: row.google_id || null,
    google_name: row.google_name || null,
    google_avatar: row.google_avatar || null,
    steam_id: row.steam_id || null,
    steam_persona: row.steam_persona || null,
    steam_avatar: row.steam_avatar || null,
    steam_profile_url: row.steam_profile_url || null
  }, JWT_SECRET, { expiresIn: '30d' });
}

function safeUsername(value, fallback = 'player') {
  const clean = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/@.*/, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return clean || `${fallback}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeDisplayName(value, fallback = 'Player') {
  const clean = String(value || fallback)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} _.-]+/gu, '')
    .slice(0, 32)
    .trim();
  return clean || fallback;
}

async function uniqueUsername(base) {
  const root = safeUsername(base, 'player');
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const username = attempt ? `${root}_${attempt}` : root;
    const row = await dbGet(`SELECT id FROM users WHERE username = ?`, [username]);
    if (!row) return username;
  }
  return `${root}_${Date.now().toString(36)}`;
}

async function findOrCreateOAuthUser(provider, profile) {
  const now = Date.now();
  const email = profile.email ? String(profile.email).trim().toLowerCase() : null;
  const providerId = String(profile.id || '').trim();
  const displayName = safeDisplayName(profile.name || profile.username || (email ? email.split('@')[0] : ''), 'Player');
  const avatar = profile.avatar || null;

  if (!providerId && !email) throw new Error('OAuth profile is missing id/email');

  const providerColumn = { discord: 'discord_id', google: 'google_id', steam: 'steam_id' }[provider];
  if (!providerColumn) throw new Error(`Unsupported OAuth provider: ${provider}`);

  let user = providerId ? await dbGet(`SELECT * FROM users WHERE ${providerColumn} = ?`, [providerId]) : null;

  // If the provider shares the same verified email, keep one Dark Portal profile instead of duplicates.
  if (!user && email) {
    user = await dbGet(`SELECT * FROM users WHERE lower(email) = ?`, [email]);
  }

  if (user) {
    const fallbackDisplayName = user.display_name || displayName;
    if (provider === 'discord') {
      await dbRun(
        `UPDATE users SET
          email = COALESCE(email, ?),
          display_name = COALESCE(display_name, ?),
          verified = 1,
          oauth_provider = 'discord',
          discord_id = COALESCE(discord_id, ?),
          discord_username = ?,
          discord_global_name = ?,
          discord_avatar = ?,
          discord_access_token = ?,
          discord_refresh_token = ?,
          discord_token_expires = ?,
          avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?`,
        [email, fallbackDisplayName, providerId, profile.username || null, profile.name || null, avatar, profile.access_token || null, profile.refresh_token || null, profile.token_expires || null, avatar, user.id]
      );
    } else if (provider === 'google') {
      await dbRun(
        `UPDATE users SET
          email = COALESCE(email, ?),
          display_name = COALESCE(display_name, ?),
          verified = 1,
          oauth_provider = 'google',
          google_id = COALESCE(google_id, ?),
          google_name = ?,
          google_avatar = ?,
          avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?`,
        [email, fallbackDisplayName, providerId, profile.name || null, avatar, avatar, user.id]
      );
    } else if (provider === 'steam') {
      await dbRun(
        `UPDATE users SET
          display_name = COALESCE(display_name, ?),
          verified = 1,
          oauth_provider = 'steam',
          steam_id = COALESCE(steam_id, ?),
          steam_persona = ?,
          steam_avatar = ?,
          steam_profile_url = ?,
          avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?`,
        [fallbackDisplayName, providerId, profile.name || null, avatar, profile.profile_url || null, avatar, user.id]
      );
    }
    return dbGet(`SELECT * FROM users WHERE id = ?`, [user.id]);
  }

  const username = await uniqueUsername(profile.username || displayName || email || provider);
  if (provider === 'discord') {
    const result = await dbRun(
      `INSERT INTO users (username, display_name, email, created, verified, oauth_provider, discord_id, discord_username, discord_global_name, discord_avatar, discord_access_token, discord_refresh_token, discord_token_expires, avatar_url)
       VALUES (?, ?, ?, ?, 1, 'discord', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, displayName, email, now, providerId, profile.username || null, profile.name || null, avatar, profile.access_token || null, profile.refresh_token || null, profile.token_expires || null, avatar]
    );
    return dbGet(`SELECT * FROM users WHERE id = ?`, [result.lastID]);
  }

  if (provider === 'google') {
    const result = await dbRun(
      `INSERT INTO users (username, display_name, email, created, verified, oauth_provider, google_id, google_name, google_avatar, avatar_url)
       VALUES (?, ?, ?, ?, 1, 'google', ?, ?, ?, ?)`,
      [username, displayName, email, now, providerId, profile.name || null, avatar, avatar]
    );
    return dbGet(`SELECT * FROM users WHERE id = ?`, [result.lastID]);
  }

  const result = await dbRun(
    `INSERT INTO users (username, display_name, email, created, verified, oauth_provider, steam_id, steam_persona, steam_avatar, steam_profile_url, avatar_url)
     VALUES (?, ?, ?, ?, 1, 'steam', ?, ?, ?, ?, ?)`,
    [username, displayName, email, now, providerId, profile.name || null, avatar, profile.profile_url || null, avatar]
  );
  return dbGet(`SELECT * FROM users WHERE id = ?`, [result.lastID]);
}

async function linkOAuthProviderToUser(provider, profile, userId) {
  const nowProviderId = String(profile.id || '').trim();
  const email = profile.email ? String(profile.email).trim().toLowerCase() : null;
  const avatar = profile.avatar || null;
  const providerColumn = { discord: 'discord_id', google: 'google_id', steam: 'steam_id' }[provider];
  if (!providerColumn) throw new Error(`Unsupported OAuth provider: ${provider}`);
  if (!nowProviderId) throw new Error(`${providerDisplayName(provider)} did not return a usable account id.`);

  const target = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!target) {
    // On Netlify the SQLite file can be cold between the first provider login
    // and a later provider-link callback. Do not throw the user back to login;
    // complete the provider login as the active account instead.
    return findOrCreateOAuthUser(provider, profile);
  }

  const alreadyTaken = await dbGet(`SELECT id FROM users WHERE ${providerColumn} = ? AND id <> ?`, [nowProviderId, target.id]);
  if (alreadyTaken) throw new Error(`${providerDisplayName(provider)} is already linked to another Dark Portal account.`);

  if (target[providerColumn] && String(target[providerColumn]) !== nowProviderId) {
    throw new Error(`This profile already has a different ${providerDisplayName(provider)} account linked. Unlink it first, then link again.`);
  }

  let emailToStore = null;
  if (email && (!target.email || String(target.email).toLowerCase() === email)) {
    const emailOwner = await dbGet(`SELECT id FROM users WHERE lower(email) = ? AND id <> ?`, [email, target.id]);
    if (!emailOwner) emailToStore = email;
  }

  const displayName = target.display_name || safeDisplayName(profile.name || profile.username || (email ? email.split('@')[0] : ''), 'Player');

  if (provider === 'discord') {
    await dbRun(
      `UPDATE users SET
        email = COALESCE(email, ?),
        display_name = COALESCE(display_name, ?),
        verified = 1,
        oauth_provider = COALESCE(oauth_provider, 'discord'),
        discord_id = ?,
        discord_username = ?,
        discord_global_name = ?,
        discord_avatar = ?,
        discord_access_token = ?,
        discord_refresh_token = ?,
        discord_token_expires = ?,
        avatar_url = COALESCE(avatar_url, ?)
      WHERE id = ?`,
      [emailToStore, displayName, nowProviderId, profile.username || null, profile.name || null, avatar, profile.access_token || null, profile.refresh_token || null, profile.token_expires || null, avatar, target.id]
    );
  } else if (provider === 'google') {
    await dbRun(
      `UPDATE users SET
        email = COALESCE(email, ?),
        display_name = COALESCE(display_name, ?),
        verified = 1,
        oauth_provider = COALESCE(oauth_provider, 'google'),
        google_id = ?,
        google_name = ?,
        google_avatar = ?,
        avatar_url = COALESCE(avatar_url, ?)
      WHERE id = ?`,
      [emailToStore, displayName, nowProviderId, profile.name || null, avatar, avatar, target.id]
    );
  } else if (provider === 'steam') {
    await dbRun(
      `UPDATE users SET
        display_name = COALESCE(display_name, ?),
        verified = 1,
        oauth_provider = COALESCE(oauth_provider, 'steam'),
        steam_id = ?,
        steam_persona = ?,
        steam_avatar = ?,
        steam_profile_url = ?,
        avatar_url = COALESCE(avatar_url, ?)
      WHERE id = ?`,
      [displayName, nowProviderId, profile.name || null, avatar, profile.profile_url || null, avatar, target.id]
    );
  }

  return dbGet(`SELECT * FROM users WHERE id = ?`, [target.id]);
}

async function resolveProviderLogin(provider, profile, linkToken = '') {
  const linkUserId = verifyProviderLinkToken(provider, linkToken);
  if (linkUserId) return linkOAuthProviderToUser(provider, profile, linkUserId);
  return findOrCreateOAuthUser(provider, profile);
}

function finishBrowserLogin(res, row, next = '/dashboard.html') {
  const token = signUser(row);
  const profile = publicUser(row);
  const target = safeRedirect(next);
  const cookieParts = [
    `dg_token=${encodeURIComponent(token)}`,
    'Path=/',
    'Max-Age=2592000',
    'SameSite=Lax'
  ];
  if ((process.env.BASE_URL || '').startsWith('https://') || process.env.NETLIFY) cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.send(`<!doctype html>
<meta charset="utf-8">
<meta http-equiv="cache-control" content="no-store">
<title>Login successful</title>
<script>
(function(){
  var token = ${JSON.stringify(token)};
  var username = ${JSON.stringify(row.username)};
  var profile = ${JSON.stringify(JSON.stringify(profile))};
  var target = ${JSON.stringify(target)};
  try {
    localStorage.setItem('dg_token', token);
    localStorage.setItem('dg_session', username);
    localStorage.setItem('dg_profile', profile);
  } catch (e) {}
  try { document.cookie = 'dg_token=' + encodeURIComponent(token) + '; Path=/; Max-Age=2592000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); } catch (e) {}
  location.replace(target);
})();
</script>
<p>Login successful. Redirecting...</p>`);
}

function discordAvatarUrl(discordUser) {
  if (!discordUser?.avatar) return null;
  const ext = String(discordUser.avatar).startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}?size=128`;
}


async function steamOpenIdIsValid(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (!key.startsWith('openid.')) continue;
    params.set(key, Array.isArray(value) ? String(value[0] || '') : String(value || ''));
  }
  params.set('openid.mode', 'check_authentication');

  const resp = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params
  });
  const text = await resp.text();
  return resp.ok && /is_valid\s*:\s*true/i.test(text);
}

function steamIdFromClaimedId(claimedId) {
  const match = String(claimedId || '').match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  return match ? match[1] : null;
}

async function readSteamProfile(steamId) {
  if (!STEAM_API_KEY) return null;
  try {
    const params = new URLSearchParams({ key: STEAM_API_KEY, steamids: steamId, format: 'json' });
    const resp = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?${params.toString()}`);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.error || 'Steam profile request failed');
    return data?.response?.players?.[0] || null;
  } catch (err) {
    console.warn('Steam profile lookup failed:', err.message);
    return null;
  }
}

app.get('/api/ping', (req, res) => res.json({ ok: true }));


app.get('/auth/local/:provider', async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  if (!['discord', 'google', 'steam'].includes(provider)) return res.status(404).send('Unknown local provider');
  return finishLocalProviderLogin(provider, safeRedirect(req.query.next), res, req, req.query.link);
});

app.get('/auth/discord', async (req, res) => {
  if (shouldUseLocalProviderFallback(req) || !isRealConfig(DISCORD_CLIENT_ID) || !isRealConfig(DISCORD_CLIENT_SECRET)) return finishLocalProviderLogin('discord', safeRedirect(req.query.next), res, req, req.query.link);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: discordRedirectUri(req),
    response_type: 'code',
    scope: DISCORD_SCOPES,
    prompt: 'consent',
    state: encodeState(req.query.next, req.query.link)
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  const state = decodeStatePayload(req.query.state);
  const next = state.next;
  const linkToken = state.link;
  if ((!code || !isRealConfig(DISCORD_CLIENT_ID) || !isRealConfig(DISCORD_CLIENT_SECRET)) && allowLocalProviderFallback(req)) return finishLocalProviderLogin('discord', next, res, req, linkToken);
  if (!code) return res.status(400).send('Missing code');
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) return res.status(500).send('Missing Discord OAuth config');

  try {
    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: discordRedirectUri(req)
      })
    });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) throw new Error(tokenJson.error_description || tokenJson.error || 'Discord token exchange failed');

    const meResp = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `${tokenJson.token_type} ${tokenJson.access_token}` }
    });
    const me = await meResp.json();
    if (!meResp.ok || !me.id) throw new Error('Could not read Discord profile');

    const row = await resolveProviderLogin('discord', {
      id: me.id,
      email: me.email || null,
      username: me.global_name || me.username || `discord_${me.id}`,
      name: me.global_name || me.username || null,
      avatar: discordAvatarUrl(me),
      access_token: tokenJson.access_token || null,
      refresh_token: tokenJson.refresh_token || null,
      token_expires: tokenJson.expires_in ? Date.now() + Number(tokenJson.expires_in) * 1000 : null
    }, linkToken);
    finishBrowserLogin(res, row, next);
  } catch (e) {
    console.error('Discord OAuth error:', e);
    if (allowLocalProviderFallback(req) && !linkToken) return finishLocalProviderLogin('discord', next, res, req, linkToken);
    return sendOAuthError(res, 'Discord login failed: ' + e.message, next);
  }
});

app.get('/auth/google', async (req, res) => {
  if (shouldUseLocalProviderFallback(req) || !isRealConfig(GOOGLE_CLIENT_ID) || !isRealConfig(GOOGLE_CLIENT_SECRET)) return finishLocalProviderLogin('google', safeRedirect(req.query.next), res, req, req.query.link);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    prompt: 'select_account',
    state: encodeState(req.query.next, req.query.link)
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  const state = decodeStatePayload(req.query.state);
  const next = state.next;
  const linkToken = state.link;
  if ((!code || !isRealConfig(GOOGLE_CLIENT_ID) || !isRealConfig(GOOGLE_CLIENT_SECRET)) && allowLocalProviderFallback(req)) return finishLocalProviderLogin('google', next, res, req, linkToken);
  if (!code) return res.status(400).send('Missing code');
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return res.status(500).send('Missing Google OAuth config');

  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: googleRedirectUri(req)
      })
    });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) throw new Error(tokenJson.error_description || tokenJson.error || 'Google token exchange failed');

    const meResp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `${tokenJson.token_type || 'Bearer'} ${tokenJson.access_token}` }
    });
    const me = await meResp.json();
    if (!meResp.ok || !me.sub) throw new Error('Could not read Google profile');

    const row = await resolveProviderLogin('google', {
      id: me.sub,
      email: me.email || null,
      username: me.name || me.email || `google_${me.sub}`,
      name: me.name || null,
      avatar: me.picture || null
    }, linkToken);
    finishBrowserLogin(res, row, next);
  } catch (e) {
    console.error('Google OAuth error:', e);
    if (allowLocalProviderFallback(req) && !linkToken) return finishLocalProviderLogin('google', next, res, req, linkToken);
    return sendOAuthError(res, 'Google login failed: ' + e.message, next);
  }
});


app.get('/auth/steam', async (req, res) => {
  const next = safeRedirect(req.query.next);
  if (shouldUseLocalProviderFallback(req) || !isRealConfig(STEAM_API_KEY)) return finishLocalProviderLogin('steam', next, res, req, req.query.link);
  const state = encodeState(next, req.query.link);
  const returnTo = `${steamReturnUrl(req)}?state=${encodeURIComponent(state)}`;
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': steamRealm(req),
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  });
  res.redirect(`https://steamcommunity.com/openid/login?${params.toString()}`);
});

app.get('/auth/steam/callback', async (req, res) => {
  const state = decodeStatePayload(req.query.state);
  const next = state.next;
  const linkToken = state.link;
  try {
    const isValid = await steamOpenIdIsValid(req.query);
    if (!isValid) throw new Error('Steam OpenID verification failed');

    const steamId = steamIdFromClaimedId(req.query['openid.claimed_id']);
    if (!steamId) throw new Error('Steam response did not include a valid SteamID');

    const steamProfile = await readSteamProfile(steamId);
    const personaName = steamProfile?.personaname || `Steam ${steamId.slice(-6)}`;
    const row = await resolveProviderLogin('steam', {
      id: steamId,
      email: null,
      username: personaName || `steam_${steamId}`,
      name: personaName,
      avatar: steamProfile?.avatarfull || steamProfile?.avatarmedium || steamProfile?.avatar || null,
      profile_url: steamProfile?.profileurl || `https://steamcommunity.com/profiles/${steamId}`
    }, linkToken);
    finishBrowserLogin(res, row, next);
  } catch (e) {
    console.error('Steam login error:', e);
    if (allowLocalProviderFallback(req) && !linkToken) return finishLocalProviderLogin('steam', next, res, req, linkToken);
    return sendOAuthError(res, 'Steam login failed: ' + e.message, next);
  }
});


// Manual username/password auth has been removed from the product.
// Keep these endpoints as explicit 410 responses so older clients fail clearly.
app.post('/api/register', (req, res) => {
  return res.status(410).json({ error: 'Manual account creation has been removed. Use Discord, Google, or Steam login.' });
});

app.post('/api/verify-code', (req, res) => {
  return res.status(410).json({ error: 'Manual account verification has been removed. Use Discord, Google, or Steam login.' });
});

app.get('/api/verify', (req, res) => {
  return res.status(410).send('Manual email verification has been removed. Use Discord, Google, or Steam login.');
});

app.post('/api/login', (req, res) => {
  return res.status(410).json({ error: 'Manual password login has been removed. Use Discord, Google, or Steam login.' });
});

// Old mock OAuth endpoint is disabled by default. Use /auth/discord, /auth/google, or /auth/steam for real OAuth.
app.post('/api/oauth', (req, res) => {
  if (process.env.ENABLE_DEV_OAUTH_MOCK !== 'true') {
    return res.status(410).json({ error: 'Mock OAuth is disabled. Use /auth/discord, /auth/google, or /auth/steam.' });
  }
  return res.status(410).json({ error: 'Mock OAuth endpoint is deprecated.' });
});

app.use('/api/games/tictactoe', createTicTacToeRouter({ db, jwtSecret: JWT_SECRET }));
app.use('/api/tictactoe', createTicTacToeRouter({ db, jwtSecret: JWT_SECRET }));



function parseProgressMeta(row) {
  try { return JSON.parse(row?.meta_json || '{}') || {}; } catch { return {}; }
}

function xpLevel(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0);
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 120)) + 1);
  const currentFloor = Math.pow(level - 1, 2) * 120;
  const nextFloor = Math.pow(level, 2) * 120;
  const intoLevel = xp - currentFloor;
  const needed = Math.max(1, nextFloor - currentFloor);
  return { xp, level, currentFloor, nextFloor, intoLevel, needed, percent: Math.max(0, Math.min(100, Math.round((intoLevel / needed) * 100))) };
}

function isManageableGuild(guild) {
  try {
    if (guild.owner) return true;
    const perms = BigInt(guild.permissions || '0');
    return (perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n;
  } catch { return false; }
}

function discordGuildIcon(guild) {
  if (!guild?.icon) return null;
  const ext = String(guild.icon).startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=96`;
}

async function readDiscordManagedGuilds(user) {
  if (!user?.discord_id) {
    return {
      guilds: [],
      note: 'Link Discord in Profile to load manageable servers and bot options.',
      needsDiscordLink: true,
      needsDiscordRefresh: false
    };
  }
  if (!user?.discord_access_token) {
    return {
      guilds: [],
      note: 'Discord is linked, but access needs to be refreshed before server controls can load.',
      needsDiscordLink: false,
      needsDiscordRefresh: true
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3600);
  try {
    const resp = await fetch('https://discord.com/api/users/@me/guilds', {
      signal: controller.signal,
      cache: 'no-store',
      headers: { authorization: `Bearer ${user.discord_access_token}`, accept: 'application/json' }
    });
    if (!resp.ok) return {
      guilds: [],
      note: resp.status === 401 ? 'Discord session needs to be refreshed in Profile.' : 'Could not load Discord guilds right now.',
      needsDiscordLink: false,
      needsDiscordRefresh: resp.status === 401
    };
    const guilds = await resp.json();
    const manageable = Array.isArray(guilds) ? guilds.filter(isManageableGuild).slice(0, 18).map((g) => ({
      id: g.id,
      name: g.name,
      icon_url: discordGuildIcon(g),
      owner: !!g.owner,
      permissions: String(g.permissions || '0'),
      canManage: true,
      memberCount: null,
      botAccess: 'Configure after selecting server'
    })) : [];
    return { guilds: manageable, note: manageable.length ? null : 'No manageable Discord servers found for this account.' };
  } catch (e) {
    return { guilds: [], note: 'Discord guild check timed out. Try again in a moment.' };
  } finally {
    clearTimeout(timer);
  }
}


function botStatusBaseUrls() {
  const raw = process.env.BOT_DASHBOARD_URLS || process.env.BOT_DASHBOARD_URL || process.env.DISCORD_BOT_STATUS_URLS || process.env.DISCORD_BOT_STATUS_URL || process.env.BOT_STATUS_URL || DISCORD_BOT_STATUS_URL || 'http://127.0.0.1:3001/status';
  const urls = String(raw || '').split(',').map((v) => v.trim()).filter(Boolean);
  const bases = [];
  for (const item of urls.length ? urls : ['http://127.0.0.1:3001/status']) {
    try {
      const u = new URL(item);
      u.pathname = '';
      u.search = '';
      u.hash = '';
      bases.push(u.toString().replace(/\/$/, ''));
    } catch {}
  }
  // Local development safety: try both localhost forms, plus Docker/WSL host gateway.
  bases.push('http://127.0.0.1:3001', 'http://localhost:3001', 'http://host.docker.internal:3001');
  return [...new Set(bases.length ? bases : ['http://127.0.0.1:3001'])];
}
function botStatusBaseUrl() {
  return botStatusBaseUrls()[0] || 'http://127.0.0.1:3001';
}

async function fetchBotDashboardJson(base, guildId, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.GUILD_DASHBOARD_TIMEOUT_MS || 9000));
  try {
    const resp = await fetch(`${base}/api/guild/${encodeURIComponent(guildId)}${options.path}`, {
      method: options.method || 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers: options.headers || { accept: 'application/json' },
      body: options.body
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || `Bot dashboard endpoint returned ${resp.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function botDashboardHeaders(includeJson = false) {
  const secret = process.env.DASHBOARD_SHARED_SECRET || process.env.BOT_DASHBOARD_SECRET || '';
  const headers = includeJson ? { accept: 'application/json', 'content-type': 'application/json' } : { accept: 'application/json' };
  if (secret) headers['x-dashboard-secret'] = secret;
  return headers;
}

async function readBotGuildDashboard(guildId) {
  let lastError = null;
  const headers = botDashboardHeaders(false);
  for (const base of botStatusBaseUrls()) {
    try {
      return await fetchBotDashboardJson(base, guildId, { path: '/dashboard', headers });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Could not reach bot dashboard endpoint');
}

async function writeBotGuildPlugins(guildId, plugins, commands = {}) {
  const headers = botDashboardHeaders(true);
  let lastError = null;
  for (const base of botStatusBaseUrls()) {
    try {
      return await fetchBotDashboardJson(base, guildId, {
        path: '/plugins',
        method: 'PATCH',
        headers,
        body: JSON.stringify({ plugins, commands })
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Could not reach bot plugin endpoint');
}

async function buildStatsForUser(userId) {
  const progress = await dbAll(
    `SELECT game_key, wins, losses, draws, best_score, xp, last_played, meta_json FROM game_progress WHERE user_id = ? ORDER BY last_played DESC`,
    [userId]
  );
  const feedbackCountRow = await dbGet(`SELECT COUNT(*) AS c FROM portal_feedback WHERE user_id = ?`, [userId]).catch(() => ({ c: 0 }));
  const totalWins = progress.reduce((a, p) => a + Number(p.wins || 0), 0);
  const totalLosses = progress.reduce((a, p) => a + Number(p.losses || 0), 0);
  const totalDraws = progress.reduce((a, p) => a + Number(p.draws || 0), 0);
  const gameXp = progress.reduce((a, p) => a + Number(p.xp || 0), 0);
  const feedbackXp = Number(feedbackCountRow?.c || 0) * 15;
  const portalXp = feedbackXp + Math.min(250, progress.length * 20);
  const xp = xpLevel(gameXp + portalXp);
  const byGame = progress.map((row) => ({ ...row, meta: parseProgressMeta(row) }));
  const ttt = byGame.find((g) => /tictactoe|tic/.test(g.game_key)) || null;
  const sudoku = byGame.filter((g) => /sudoku|sumdoku|killer/.test(g.game_key));
  return {
    progression: xp,
    totals: {
      gamesPlayed: totalWins + totalLosses + totalDraws,
      wins: totalWins,
      losses: totalLosses,
      draws: totalDraws,
      feedbackTickets: Number(feedbackCountRow?.c || 0),
      portalXp
    },
    games: byGame,
    tictactoe: ttt,
    sudoku,
    bot: {
      commandExecutions: 0,
      trackedCommands: 20,
      source: 'Portal stats',
      xp: 0,
      note: 'Bot command tracking will connect here after the bot starts reporting command usage.'
    }
  };
}

app.get('/api/dashboard', getBearerUser, async (req, res) => {
  try {
    const user = await currentUserRow(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const progress = await dbAll(
      `SELECT game_key, wins, losses, draws, best_score, xp, last_played, meta_json FROM game_progress WHERE user_id = ? ORDER BY last_played DESC`,
      [user.id]
    );
    const discordGuilds = await readDiscordManagedGuilds(user);
    res.json({
      user: publicUser(user),
      progress: progress || [],
      managedServers: discordGuilds.guilds,
      managedServersNote: discordGuilds.note,
      needsDiscordLink: !!discordGuilds.needsDiscordLink,
      needsDiscordRefresh: !!discordGuilds.needsDiscordRefresh,
      botInvite: discordBotInviteUrl() || null,
      supportInvite: SUPPORT_INVITE_URL
    });
  } catch (err) {
    console.error('dashboard error', err);
    res.status(500).json({ error: 'Could not load dashboard' });
  }
});


app.get('/api/dashboard/guild/:guildId', getBearerUser, async (req, res) => {
  try {
    const guildId = String(req.params.guildId || '').trim();
    if (!/^\d{5,30}$/.test(guildId)) return res.status(400).json({ error: 'Invalid guild id' });
    const user = await currentUserRow(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const discordGuilds = await readDiscordManagedGuilds(user);
    const allowed = (discordGuilds.guilds || []).find((g) => String(g.id) === guildId);
    if (!allowed) return res.status(403).json({ error: 'This account cannot manage that guild or Discord access needs refresh.' });
    try {
      const botData = await readBotGuildDashboard(guildId);
      return res.json({ ...botData, accessMode: allowed.owner ? 'Owner' : 'Manage Server', manageableGuild: allowed });
    } catch (botErr) {
      return res.json({
        guild: allowed,
        accessMode: allowed.owner ? 'Owner' : 'Manage Server',
        owner: null,
        access: {
          adminsAndManagers: [],
          memberFetchComplete: false,
          note: 'Live admin/manager data requires the Dark Bot status endpoint and guild permissions.',
        },
        security: {
          verificationLevel: 'Not synced',
          mfaLevel: 'Not synced',
          explicitContentFilter: 'Not synced',
          nsfwLevel: 'Not synced',
          automodStatus: 'Under development',
          automodRules: [],
          note: botErr.message || 'Dark Bot dashboard endpoint is not reachable yet.'
        },
        moderation: {
          bannedUsers: [],
          timedOutUsers: [],
          bansFetchComplete: false,
          timeoutsFetchComplete: false,
        },
        channels: {
          text: [],
        },
        roles: [],
        commands: [],
        plugins: {
          welcome: {
            enabled: false,
            welcomeEnabled: true,
            goodbyeEnabled: false,
            dmEnabled: false,
            channelId: '',
            welcomeMessage: 'Welcome {user} to {server}!',
            goodbyeMessage: '{username} left {server}.',
            dmMessage: 'Welcome to {server}, {username}!',
            embedTitle: 'Welcome to {server}',
            goodbyeTitle: 'Goodbye from {server}',
            welcomeImageUrl: '',
            goodbyeImageUrl: '',
            color: '#7a35ff'
          },
          autorole: {
            enabled: false,
            roleIds: [],
            delaySeconds: 0
          },
          reaction_roles: {
            enabled: false,
            channelId: '',
            messageId: '',
            prompt: 'Choose your role by reacting below.',
            imageUrl: '',
            roles: [],
            color: '#7a35ff'
          }
        },
        activity: {
          executedCommands: 0,
          trackedCommands: 0,
          note: botErr.message || 'Command data will appear after the bot endpoint is reachable.'
        },
        checkedAt: new Date().toISOString(),
        botEndpointError: botErr.message || 'Could not reach bot endpoint',
      });
    }
  } catch (err) {
    console.error('dashboard guild error', err);
    res.status(500).json({ error: 'Could not load guild setup.' });
  }
});

app.patch('/api/dashboard/guild/:guildId/plugins', getBearerUser, async (req, res) => {
  try {
    const guildId = String(req.params.guildId || '').trim();
    if (!/^\d{5,30}$/.test(guildId)) return res.status(400).json({ error: 'Invalid guild id' });
    const user = await currentUserRow(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const discordGuilds = await readDiscordManagedGuilds(user);
    const allowed = (discordGuilds.guilds || []).find((g) => String(g.id) === guildId);
    if (!allowed) return res.status(403).json({ error: 'This account cannot manage that guild or Discord access needs refresh.' });
    const plugins = req.body?.plugins && typeof req.body.plugins === 'object' ? req.body.plugins : {};
    const commands = req.body?.commands && typeof req.body.commands === 'object' ? req.body.commands : {};
    if (!Object.keys(plugins).length && !Object.keys(commands).length) return res.status(400).json({ error: 'Missing dashboard settings.' });
    const saved = await writeBotGuildPlugins(guildId, plugins, commands);
    res.json(saved);
  } catch (err) {
    console.error('dashboard guild plugin save error', err);
    res.status(502).json({ error: err.message || 'Could not save plugin settings to Dark Bot.' });
  }
});

app.get('/api/profile', getBearerUser, async (req, res) => {
  try {
    const user = await currentUserRow(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const stats = await buildStatsForUser(user.id);
    res.json({ user: publicUser(user), stats, supportInvite: SUPPORT_INVITE_URL });
  } catch (err) {
    console.error('profile read error', err);
    res.status(500).json({ error: 'Could not load profile.' });
  }
});

app.post('/api/profile/link-intent/:provider', getBearerUser, async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  if (!['discord', 'google', 'steam'].includes(provider)) return res.status(400).json({ error: 'Unsupported provider.' });
  try {
    const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const link = createProviderLinkToken(provider, user.id);
    const params = new URLSearchParams({ next: safeRedirect(req.query.next || '/profile.html'), link });
    res.json({ ok: true, provider, url: `/auth/${provider}?${params.toString()}` });
  } catch (err) {
    console.error('profile link intent error', err);
    res.status(500).json({ error: 'Could not start provider linking.' });
  }
});

app.patch('/api/profile', getBearerUser, async (req, res) => {
  const displayName = safeDisplayName(req.body.display_name, 'Player');
  if (displayName.length < 2) return res.status(400).json({ error: 'Display name must be at least 2 characters.' });
  try {
    await dbRun(`UPDATE users SET display_name = ? WHERE id = ?`, [displayName, req.user.id]);
    const row = await dbGet(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (!row) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user: publicUser(row), token: signUser(row), message: 'Profile updated.' });
  } catch (err) {
    console.error('profile update error', err);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});



app.post('/api/profile/unlink/:provider', getBearerUser, async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const allowed = ['discord', 'google', 'steam'];
  if (!allowed.includes(provider)) return res.status(400).json({ error: 'Unsupported provider.' });
  try {
    const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const linked = [user.discord_id ? 'discord' : null, user.google_id ? 'google' : null, user.steam_id ? 'steam' : null].filter(Boolean);
    if (linked.length <= 1 && linked.includes(provider)) {
      return res.status(400).json({ error: 'You need at least one linked login provider.' });
    }
    if (provider === 'discord') {
      await dbRun(`UPDATE users SET discord_id = NULL, discord_username = NULL, discord_global_name = NULL, discord_avatar = NULL, discord_access_token = NULL, discord_refresh_token = NULL, discord_token_expires = NULL WHERE id = ?`, [req.user.id]);
    } else if (provider === 'google') {
      await dbRun(`UPDATE users SET google_id = NULL, google_name = NULL, google_avatar = NULL WHERE id = ?`, [req.user.id]);
    } else if (provider === 'steam') {
      await dbRun(`UPDATE users SET steam_id = NULL, steam_persona = NULL, steam_avatar = NULL, steam_profile_url = NULL WHERE id = ?`, [req.user.id]);
    }
    const row = await dbGet(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    res.json({ user: publicUser(row), token: signUser(row), stats: await buildStatsForUser(row.id) });
  } catch (err) {
    console.error('profile unlink error', err);
    res.status(500).json({ error: 'Could not unlink provider.' });
  }
});

app.delete('/api/profile', getBearerUser, async (req, res) => {
  try {
    await dbRun(`DELETE FROM users WHERE id = ?`, [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('profile delete error', err);
    res.status(500).json({ error: 'Could not delete account.' });
  }
});

app.get('/api/stats', getBearerUser, async (req, res) => {
  try {
    const user = await currentUserRow(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const stats = await buildStatsForUser(user.id);
    res.json({ user: publicUser(user), stats });
  } catch (err) {
    console.error('stats error', err);
    res.status(500).json({ error: 'Could not load stats.' });
  }
});

app.get('/api/games/progress/:game', getBearerUser, (req, res) => {
  const game = String(req.params.game || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,40}$/.test(game)) return res.status(400).json({ error: 'Invalid game key' });

  db.get(
    `SELECT game_key, wins, losses, draws, best_score, xp, last_played, meta_json FROM game_progress WHERE user_id = ? AND game_key = ?`,
    [req.user.id, game],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Could not load progress' });
      res.json(row || { game_key: game, wins: 0, losses: 0, draws: 0, best_score: 0, xp: 0, last_played: null, meta_json: '{}' });
    }
  );
});

app.post('/api/games/progress/:game', getBearerUser, (req, res) => {
  const game = String(req.params.game || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,40}$/.test(game)) return res.status(400).json({ error: 'Invalid game key' });

  const result = String(req.body.result || '').toLowerCase();
  const score = Number.isFinite(Number(req.body.score)) ? Math.max(0, Math.floor(Number(req.body.score))) : 0;
  const meta = req.body.meta && typeof req.body.meta === 'object' ? req.body.meta : {};
  const now = Date.now();

  const wins = result === 'win' ? 1 : 0;
  const losses = result === 'loss' ? 1 : 0;
  const draws = result === 'draw' ? 1 : 0;
  const xpGain = Math.max(5, Math.min(250, score || (wins ? 50 : draws ? 20 : 10)));
  const metaJson = JSON.stringify({ ...meta, last_result: result || 'played' }).slice(0, 2000);

  db.run(
    `INSERT INTO game_progress (user_id, game_key, wins, losses, draws, best_score, xp, last_played, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, game_key) DO UPDATE SET
       wins = wins + excluded.wins,
       losses = losses + excluded.losses,
       draws = draws + excluded.draws,
       best_score = MAX(best_score, excluded.best_score),
       xp = xp + excluded.xp,
       last_played = excluded.last_played,
       meta_json = excluded.meta_json`,
    [req.user.id, game, wins, losses, draws, score, xpGain, now, metaJson],
    (err) => {
      if (err) return res.status(500).json({ error: 'Could not save progress' });
      db.get(
        `SELECT game_key, wins, losses, draws, best_score, xp, last_played, meta_json FROM game_progress WHERE user_id = ? AND game_key = ?`,
        [req.user.id, game],
        (readErr, row) => readErr ? res.status(500).json({ error: 'Could not read progress' }) : res.json(row)
      );
    }
  );
});

app.post('/api/feedback', getBearerUser, async (req, res) => {
  try {
    const type = String(req.body.type || 'other').trim().toLowerCase().slice(0, 40);
    const message = String(req.body.message || '').trim();
    const allowedTypes = new Set(['idea', 'bug', 'balance', 'bot', 'other']);
    if (!allowedTypes.has(type)) return res.status(400).json({ error: 'Invalid feedback type' });
    if (message.length < 8) return res.status(400).json({ error: 'Feedback is too short' });
    if (message.length > 1600) return res.status(400).json({ error: 'Feedback is too long' });
    await dbRun(
      `INSERT INTO portal_feedback (user_id, type, message, created_at, status) VALUES (?, ?, ?, ?, 'new')`,
      [req.user.id, type, message, Date.now()]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Feedback save failed:', err);
    res.status(500).json({ error: 'Could not save feedback' });
  }
});

app.get('/api/me', getBearerUser, async (req, res) => {
  try {
    const row = await currentUserRow(req);
    if (!row) return res.status(401).json({ error: 'Unauthorized' });
    res.json(publicUser(row));
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

if (require.main === module) {
  dbReady.finally(() => {
    app.listen(PORT, () => console.log(`\nServer running on http://localhost:${PORT}\n`));
  });
}

module.exports = app;
module.exports.dbReady = dbReady;
