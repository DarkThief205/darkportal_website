# Netlify environment variables

Set these in **Netlify → Site configuration → Environment variables**. Do not commit a real `.env` file.

## Required

```bash
BASE_URL=https://YOUR-SITE.netlify.app
JWT_SECRET=use_a_long_random_secret
```

## Required for provider logins

```bash
DISCORD_CLIENT_ID=your_discord_application_client_id
DISCORD_CLIENT_SECRET=your_discord_oauth_client_secret
DISCORD_REDIRECT_URI=https://YOUR-SITE.netlify.app/auth/discord/callback

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://YOUR-SITE.netlify.app/auth/google/callback

STEAM_API_KEY=your_steam_web_api_key
STEAM_RETURN_URL=https://YOUR-SITE.netlify.app/auth/steam/callback
STEAM_REALM=https://YOUR-SITE.netlify.app
```

## Optional

```bash
DISCORD_BOT_INVITE=https://discord.com/oauth2/authorize?client_id=963487472300482560
SUPPORT_INVITE_URL=https://discord.gg/bJ8dqwSCuU
DISCORD_BOT_STATUS_URL=https://your-bot-status-endpoint.example/status
STATUS_CHECK_TIMEOUT_MS=800
GUILD_DASHBOARD_TIMEOUT_MS=9000
DATABASE_PATH=/tmp/dark-portal-dg.sqlite3
```

Netlify Functions use temporary storage for SQLite by default. That is OK for a demo, but it is not durable long-term storage. For production accounts/game progress, move the database to a hosted database.
