# Netlify environment variables

Copy your local `.env` values into Netlify:

Site configuration → Environment variables → Add variable

Recommended variables to check:
- `JWT_SECRET`
- `SESSION_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_BOT_INVITE`
- `DISCORD_BOT_STATUS_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `STEAM_API_KEY`
- `BASE_URL`
- any database/mail variables your project uses

Do not paste private secrets into public GitHub repositories.

## Added for domain/session consistency
Set this in production so every secondary domain redirects to the same canonical origin and the browser keeps one shared session origin:

```env
PUBLIC_CANONICAL_ORIGIN=https://darkportal.is-a.dev
```

Keep localhost `.env` blank for this value while developing locally.

## Bot connection

See `BOT_CONNECTION_NOTES.md`. For production, `DISCORD_BOT_STATUS_URL` must point to a bot status endpoint reachable from the website backend. `http://127.0.0.1:3001/status` is only valid when both processes run on the same host/container.
