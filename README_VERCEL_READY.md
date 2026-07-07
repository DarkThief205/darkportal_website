# Dark Portal — Vercel-ready version

This package has been adapted for Vercel while keeping the existing static frontend and Express backend.

## What was added

- `api/index.js` — Vercel serverless entrypoint that loads the existing Express app from `server.js`.
- `vercel.json` — Vercel config that:
  - builds with `npm run build`;
  - serves static files from `public/`;
  - rewrites `/api/*`, `/auth/*`, `/bot-invite`, and `/support-invite` to the Express function;
  - relies on the project Node.js setting; use Node.js 20.x in Vercel project settings.
- `.vercelignore` — prevents Netlify-only files from being uploaded by the Vercel CLI.
- `server.js` now also understands Vercel's `VERCEL_URL` env var when `BASE_URL` is not set.

## Vercel project settings

Use these settings when importing the project:

- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `public`
- Install Command: `npm install`
- Node.js Version: 20.x

## Required environment variables

Add the variables you already use on Netlify, especially:

```txt
JWT_SECRET
BASE_URL
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
STEAM_API_KEY
STEAM_RETURN_URL
STEAM_REALM
DISCORD_BOT_INVITE
SUPPORT_INVITE_URL
```

For production, set:

```txt
BASE_URL=https://darkportal.is-a.dev
DISCORD_REDIRECT_URI=https://darkportal.is-a.dev/auth/discord/callback
GOOGLE_REDIRECT_URI=https://darkportal.is-a.dev/auth/google/callback
STEAM_RETURN_URL=https://darkportal.is-a.dev/auth/steam/callback
STEAM_REALM=https://darkportal.is-a.dev
```

For testing before moving the domain, use the temporary `.vercel.app` URL in those same redirect variables and in your Discord/Google/Steam developer dashboards.

## Test after deploy

Open these URLs on the Vercel preview domain first:

```txt
/
/api/ping
/api/portal-status
/bot-invite
/support-invite
/auth/discord
/login.html
/dashboard.html
/games.html
```

## Important database note

The current lightweight DB writes to `/tmp`, which is temporary on serverless hosts. This is okay for testing and JWT-based login sessions, but user records, feedback, and game progress can disappear when the function instance is recycled.

For a stable public release, move the DB to Supabase, Neon, Turso, MongoDB Atlas, or another hosted database.

## Domain migration note

Your current `darkportal.is-a.dev` record points to Netlify. After the Vercel preview works, update the is-a.dev DNS record to the value Vercel gives you for the custom domain.

## Discord login redirecting to localhost

If Discord login ever opens a localhost callback, check Vercel → Project → Settings → Environment Variables and make sure these are set for Production, Preview and Development as needed:

```txt
BASE_URL=https://darkportal.is-a.dev
DISCORD_REDIRECT_URI=https://darkportal.is-a.dev/auth/discord/callback
GOOGLE_REDIRECT_URI=https://darkportal.is-a.dev/auth/google/callback
STEAM_RETURN_URL=https://darkportal.is-a.dev/auth/steam/callback
PUBLIC_CANONICAL_ORIGIN=https://darkportal.is-a.dev
ENFORCE_CANONICAL_ORIGIN=true
ENABLE_LOCAL_PROVIDER_FALLBACK=false
```

Also add the exact Discord callback URL in Discord Developer Portal → OAuth2 → Redirects:

```txt
https://darkportal.is-a.dev/auth/discord/callback
```

This build also ignores stale localhost OAuth callback variables on live requests, so production users should not be sent to localhost even if an old local variable is accidentally left in Vercel.
