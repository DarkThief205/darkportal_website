# Netlify Environment Variables

Add these in Netlify → Site configuration → Environment variables.
Do not upload `.env` to Netlify.

Required for Discord login:

- `BASE_URL=https://darkportal.is-a.dev`
- `PUBLIC_CANONICAL_ORIGIN=https://darkportal.is-a.dev`
- `DISCORD_CLIENT_ID=your_discord_app_client_id`
- `DISCORD_CLIENT_SECRET=your_discord_app_client_secret`
- `DISCORD_REDIRECT_URI=https://darkportal.is-a.dev/auth/discord/callback`
- `JWT_SECRET=use_a_long_random_secret`

Required for dashboard ↔ bot sync:

- `DISCORD_BOT_STATUS_URL=https://your-wispbyte-bot-domain/status`
- `BOT_DASHBOARD_URL=https://your-wispbyte-bot-domain`
- `DASHBOARD_SHARED_SECRET=same_secret_as_the_bot`

Optional:

- `SUPPORT_INVITE_URL=https://discord.gg/yourInvite`
- `DISCORD_BOT_INVITE=https://discord.com/oauth2/authorize?client_id=963487472300482560`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `STEAM_API_KEY`, `STEAM_RETURN_URL`, `STEAM_REALM`

The Netlify version uses a pure-JS `/tmp` JSON store instead of native sqlite3, because native sqlite3 can crash Netlify Functions.
