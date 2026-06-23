# Netlify Environment Variables

Add these in Netlify: **Site configuration → Environment variables**.
Do not put real secrets in `public/`.

Recommended values once `darkportal.is-a.dev` is active:

```env
NODE_ENV=production
BASE_URL=https://darkportal.is-a.dev
ALLOWED_ORIGINS=https://darkportal.is-a.dev,https://YOUR-NETLIFY-SITE.netlify.app
JWT_SECRET=CHANGE_TO_A_LONG_RANDOM_SECRET
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
DISCORD_BOT_STATUS_URL=https://YOUR-BOT-STATUS-ENDPOINT/status
STATUS_CHECK_TIMEOUT_MS=900
GUILD_DASHBOARD_TIMEOUT_MS=2500
```

If the domain is not approved yet, use your temporary Netlify domain in `BASE_URL` and callback URLs first, for example:
`https://YOUR-NETLIFY-SITE.netlify.app`.

Also add the exact callback URLs in Discord Developer Portal, Google Cloud OAuth, and Steam settings.
