# Dark Portal — Netlify-ready package

## What is inside

- `public/` — static frontend files that Netlify publishes.
- `netlify/functions/api.js` — serverless wrapper for the existing Express backend.
- `server.js`, `db.js`, `routes/` — backend code used by the Netlify function.
- `netlify.toml` — Netlify publish/functions/redirect configuration.
- `NETLIFY_ENV_REQUIRED.md` — environment variables to add in Netlify UI.

## Deploy method

For the full site with `/api/*` and `/auth/*`, deploy this project through GitHub import or Netlify CLI.
Netlify Drop/drag-and-drop is best for static-only folders and may not run the backend function build reliably.

Recommended:

```bash
npm install
npx netlify-cli deploy --prod
```

Or push this folder to GitHub and import it in Netlify.

## Important Netlify limitation

This package uses SQLite in `/tmp` on Netlify functions. It can boot and work for tests, but `/tmp` is not a permanent production database. For real accounts, provider linking, stats, and feedback, move the database to a persistent service such as PostgreSQL, Supabase, Neon, Turso, or a VPS-hosted backend.

## Before going live

1. Add all variables from `NETLIFY_ENV_REQUIRED.md` in Netlify.
2. Set `BASE_URL` to your live domain, for example `https://darkportal.is-a.dev`.
3. Add the same OAuth callback URLs in Discord, Google and Steam.
4. In Netlify, add `darkportal.is-a.dev` as a custom domain after the is-a.dev PR is approved.
