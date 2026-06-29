Local backend for Dark Portal

Requirements
- Node.js 18+

Setup
1. Copy `.env.example` to `.env` and set `JWT_SECRET`.
2. Add the OAuth client settings you want to use:
   - Discord: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`
   - Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
   - Steam: optional `STEAM_API_KEY`, plus `STEAM_RETURN_URL` / `STEAM_REALM` for local or production callback settings
3. Install dependencies:

```bash
npm install
```

4. Start server:

```bash
npm run start
# or for development
npm run dev
```

Auth flow
1. Every Login button goes to `/login.html`.
2. The login page is OAuth-only: Discord, Google, and Steam.
3. Manual username/password registration is removed; the account system is OAuth-only.
4. After OAuth login, the server creates or links one Dark Portal user by provider id or matching email.
5. The profile display name defaults to the provider name, and users can change it from `/dashboard.html`.
6. After login, the topbar Login button becomes the user avatar/initial circle with Dashboard and Logout actions.

API
- GET /api/ping => { ok: true }
- GET /auth/discord => Discord OAuth start
- GET /auth/discord/callback => Discord OAuth callback
- GET /auth/google => Google OAuth start
- GET /auth/google/callback => Google OAuth callback
- GET /auth/steam => Steam OpenID start
- GET /auth/steam/callback => Steam OpenID callback
- GET /api/me (requires Authorization: Bearer <token>) => user profile
- PATCH /api/profile (requires Authorization: Bearer <token>) => update display name
- GET /api/dashboard (requires Authorization: Bearer <token>) => user profile + progress

Manual auth
- `POST /api/register`, `POST /api/login`, and `POST /api/verify-code` return 410 because manual username/password accounts have been removed.

Notes
- This is a local/development foundation. For production, use HTTPS, secure cookies or hardened JWT handling, rate limiting, CSRF protection where needed, audit logging, and managed DB backups.
- Do not commit or share `.env`, `dg.sqlite3` if they contain real users or secrets.


## v20 notes
- Game instructions open as a centered modal bubble again.
- Localhost provider buttons use local/dev sessions unless FORCE_REAL_OAUTH=true.
- Bot invite/support/status URLs are wired in .env.
