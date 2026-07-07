# Dark Portal: Real database setup

This build uses PostgreSQL through `DATABASE_URL`.

## Required Vercel env var

Add this in Vercel → Project → Settings → Environment Variables:

```txt
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

For Supabase/Vercel serverless, prefer the **Transaction pooler** connection string.

Keep your existing OAuth variables too:

```txt
BASE_URL=https://darkportal.is-a.dev
PUBLIC_CANONICAL_ORIGIN=https://darkportal.is-a.dev
ENFORCE_CANONICAL_ORIGIN=true
DISCORD_REDIRECT_URI=https://darkportal.is-a.dev/auth/discord/callback
GOOGLE_REDIRECT_URI=https://darkportal.is-a.dev/auth/google/callback
STEAM_RETURN_URL=https://darkportal.is-a.dev/auth/steam/callback
STEAM_REALM=https://darkportal.is-a.dev
STEAM_API_KEY=your_key_here
JWT_SECRET=make_this_a_long_random_secret
```

## What is stored

- OAuth users: Discord / Google / Steam IDs, names, avatars
- Game progress: wins, losses, draws, XP, best score
- Feedback
- Tic-Tac-Toe multiplayer rooms

## Deploy

1. Upload this ZIP to Vercel.
2. Add `DATABASE_URL` and all OAuth env vars.
3. Redeploy.
4. Log in with Discord/Google/Steam.
5. Check the `users` table in your Postgres dashboard.
