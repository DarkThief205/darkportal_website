# Dark Portal site

This is the website side of the Dark Bot integration.

Sections:
- Home: `/`
- Dashboard: `/dashboard.html`
- Games hub: `/games.html`
- Games: Sudoku, Wordle, Remember, Tic-Tac-Toe

## Local start

```bash
cp .env.example .env
npm install
npm start
```

Open `http://localhost:3000`.

## Discord OAuth setup

In Discord Developer Portal, add this redirect URL:

```text
http://localhost:3000/auth/discord/callback
```

Then set these values in `.env`:

```env
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
```

The app creates `dg.sqlite3` locally on first run. Do not commit or share that file.

## Google OAuth setup

In Google Cloud Console, add this redirect URL:

```text
http://localhost:3000/auth/google/callback
```

Then set these values in `.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

Login is OAuth-only on `/login.html`. Manual username/password registration has been removed from the UI and backend endpoints return 410.
## Steam login setup

Steam login uses Steam OpenID. There is no client ID/client secret like Google or Discord.

Optional but recommended: create a Steam Web API key for profile names/avatars and put it in `.env`:

```env
STEAM_API_KEY=...
STEAM_RETURN_URL=http://localhost:3000/auth/steam/callback
STEAM_REALM=http://localhost:3000
```

For local development, use `localhost` as the domain when Steam asks for a domain while registering the Web API key.


## Tic-Tac-Toe v1

Tic-Tac-Toe now runs on the website. It supports bot mode, local 2-player mode, and online challenge rooms through shareable links. The Discord `/tictactoe` command only sends users to the web game.


Note: This handoff does not include a real `.env` with secrets. Copy `.env.example` to `.env` locally and fill your own OAuth credentials.


OAuth note: this build uses FORCE_REAL_OAUTH=true and ENABLE_LOCAL_PROVIDER_FALLBACK=false, so localhost uses real provider login.
