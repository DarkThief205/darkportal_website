REAL LOGIN NETLIFY FIX

This package keeps the real OAuth/backend login system.
It does NOT include .env. Put ENV values in Netlify UI.

Netlify settings:
Build command: npm install && npm run build
Publish directory: public
Functions directory: netlify/functions

Important OAuth callback URLs must match your live domain:
DISCORD_REDIRECT_URI=https://YOUR_DOMAIN/auth/discord/callback
GOOGLE_REDIRECT_URI=https://YOUR_DOMAIN/auth/google/callback
STEAM_RETURN_URL=https://YOUR_DOMAIN/auth/steam/callback
STEAM_REALM=https://YOUR_DOMAIN
BASE_URL=https://YOUR_DOMAIN

Fixes included:
- Removed forced browser redirect to darkportal.is-a.dev.
- Canonical redirect disabled unless ENFORCE_CANONICAL_ORIGIN=true.
- OAuth callback stores token in localStorage and cookie fallback.
- JWT contains enough provider session data so Netlify Functions do not lose login when SQLite /tmp is cold.
- Cache-busted JS/CSS version to avoid old demo auth.js being reused.
