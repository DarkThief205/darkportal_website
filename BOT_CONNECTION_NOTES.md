# Dark Portal ↔ Dark Bot connection notes

I checked the uploaded Dark Bot package against the portal backend.

## Website side

The portal reads bot health and guild setup data through:

- `DISCORD_BOT_STATUS_URL`, usually `http://127.0.0.1:3001/status` for local development.
- `/api/portal-status` checks the bot status URL.
- `/api/dashboard/guild/:guildId` calls the bot dashboard endpoint derived from that same base URL:
  - `http://127.0.0.1:3001/api/guild/:guildId/dashboard`

## Bot side

The uploaded bot exposes compatible endpoints from its status server:

- `/status`
- `/api/status`
- `/health`
- `/api/guild/:guildId/dashboard`
- `/guild/:guildId/dashboard`

So the website and bot are wired to the same endpoint shape.

## Important deployment note

`127.0.0.1:3001` only works when the website backend and the bot status server are running on the same machine/container.

For production, set `DISCORD_BOT_STATUS_URL` to the public/internal reachable bot status URL, for example:

```env
DISCORD_BOT_STATUS_URL=https://your-bot-status-host.example.com/status
```

Keep `PUBLIC_CANONICAL_ORIGIN=https://darkportal.is-a.dev` in production so all browser sessions use the same site origin.


## v48 status note
The website now checks `DISCORD_BOT_STATUS_URL`, optional `DISCORD_BOT_STATUS_URLS`, and supports a development override `DISCORD_BOT_STATUS=online`. For a real live status, start the bot status server and make sure the URL is reachable from the website backend.
