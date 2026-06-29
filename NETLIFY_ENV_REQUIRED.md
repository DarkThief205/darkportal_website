# Netlify environment variables

Copy your local `.env` values into Netlify:

Site configuration → Environment variables → Add variable

Recommended variables to check:
- `JWT_SECRET`
- `SESSION_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_BOT_INVITE_URL`
- `DISCORD_BOT_STATUS_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `STEAM_API_KEY`
- `BASE_URL`
- any database/mail variables your project uses

Do not paste private secrets into public GitHub repositories.
