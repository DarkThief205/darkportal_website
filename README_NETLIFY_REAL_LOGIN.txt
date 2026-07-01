REAL LOGIN NETLIFY VERSION

This package preserves the original backend/login system.
It intentionally does NOT include .env. Add ENV variables in Netlify UI:
Site configuration -> Environment variables.

Netlify settings:
Build command: echo "No frontend build required; backend runs as Netlify Functions"
Publish directory: public
Functions directory: netlify/functions

Important OAuth callback URLs should use your deployed domain, for example:
DISCORD_REDIRECT_URI=https://YOUR-DOMAIN/auth/discord/callback
GOOGLE_REDIRECT_URI=https://YOUR-DOMAIN/auth/google/callback
STEAM_RETURN_URL=https://YOUR-DOMAIN/auth/steam/callback
BASE_URL=https://YOUR-DOMAIN
STEAM_REALM=https://YOUR-DOMAIN

Notes:
- .env is excluded on purpose.
- package.json is included because the real login system needs Express, SQLite, JWT, OAuth dependencies, etc.
- DB_PATH is supported. If no DB_PATH is set on Netlify Functions, SQLite uses /tmp/dg.sqlite3 at runtime.
