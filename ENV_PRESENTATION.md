# Dark Portal environment variables

The local `.env` file is kept in this ZIP as requested. Do not publish it publicly.

Variables present / expected:

- `PORT`
- `BASE_URL`
- `JWT_SECRET`
- `ENABLE_LOCAL_PROVIDER_FALLBACK`
- `FORCE_REAL_OAUTH`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_BOT_INVITE`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `STEAM_API_KEY`
- `STEAM_RETURN_URL`
- `STEAM_REALM`
- `SUPPORT_INVITE_URL`
- `DISCORD_BOT_STATUS_URL`
- `STATUS_CHECK_TIMEOUT_MS`
- `WEBSITE_STATUS`
- `DISCORD_BOT_STATUS`
- `GUILD_DASHBOARD_TIMEOUT_MS`
- `PUBLIC_CANONICAL_ORIGIN`

Production note:

- Set `PUBLIC_CANONICAL_ORIGIN=https://darkportal.is-a.dev` in production so Netlify/default domains and the custom domain behave as one site.
- Keep OAuth redirect URLs on the same canonical domain in production.
