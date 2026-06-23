# Netlify Environment Variables

Add these in Netlify: **Site configuration → Environment variables**.
Do not put real secrets in `public/`.

Recommended values once `darkportal.is-a.dev` is active:

```env
NODE_ENV=production
BASE_URL=https://darkportal.is-a.dev
ALLOWED_ORIGINS=https://darkportal.is-a.dev,https://YOUR-NETLIFY-SITE.netlify.app
JWT_SECRET=CHANGE_TO_A_LONG_RANDOM_SECRET
DB_PATH=/tmp/dg.sqlite3
ENABLE_LOCAL_PROVIDER_FALLBACK=false
FORCE_REAL_OAUTH=true

DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI=https://darkportal.is-a.dev/auth/discord/callback
DISCORD_BOT_INVITE=https://discord.com/oauth2/authorize?client_id=963487472300482560

GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://darkportal.is-a.dev/auth/google/callback

STEAM_API_KEY=YOUR_STEAM_API_KEY
STEAM_RETURN_URL=https://darkportal.is-a.dev/auth/steam/callback
STEAM_REALM=https://darkportal.is-a.dev

SUPPORT_INVITE_URL=https://discord.gg/bJ8dqwSCuU

# Manual status fallback. Set DISCORD_BOT_STATUS_URL only when the bot has a public /status endpoint.
WEBSITE_STATUS=online
DISCORD_BOT_STATUS=online
DISCORD_BOT_STATUS_URL=
STATUS_CHECK_TIMEOUT_MS=900
GUILD_DASHBOARD_TIMEOUT_MS=2500
SECRETS_SCAN_OMIT_KEYS=GUILD_DASHBOARD_TIMEOUT_MS,DISCORD_BOT_INVITE,DISCORD_CLIENT_ID,SUPPORT_INVITE_URL
```

If the domain is not approved yet, use your temporary Netlify domain in `BASE_URL` and callback URLs first, for example:
`https://YOUR-NETLIFY-SITE.netlify.app`.

Also add the exact callback URLs in Discord Developer Portal, Google Cloud OAuth, and Steam settings.


Notes:
- `DB_PATH=/tmp/dg.sqlite3` is required for Netlify Functions because the deployed bundle is read-only.
- `DISCORD_BOT_STATUS=online` is a manual badge fallback. For a real bot health check, deploy the bot with a public `/status` endpoint and set `DISCORD_BOT_STATUS_URL=https://your-bot-host/status`.
- `SECRETS_SCAN_OMIT_KEYS` prevents Netlify from blocking the build when public values such as `DISCORD_CLIENT_ID` are also present in frontend files.
