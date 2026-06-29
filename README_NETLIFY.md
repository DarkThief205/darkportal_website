# Dark Portal — Netlify-ready deploy

This ZIP is prepared for Netlify with static files plus a Netlify Function wrapper for the Express backend.

## Deploy
1. Upload/import this whole folder/ZIP to Netlify.
2. In Netlify, use these settings if asked:
   - Build command: `npm run netlify-build`
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
3. Add the variables from `.env` in Netlify: Site configuration → Environment variables.
4. In Discord/Google/Steam developer settings, use these production callback URLs:
   - Discord: `https://darkportal.is-a.dev/auth/discord/callback`
   - Google: `https://darkportal.is-a.dev/auth/google/callback`
   - Steam return URL: `https://darkportal.is-a.dev/auth/steam/callback`
   - Steam realm: `https://darkportal.is-a.dev`

## Included
- 125%-like desktop visual density from v5
- Google verification file
- `robots.txt` and `sitemap.xml`
- Dashboard Discord link/refresh logic
- Netlify redirects for `/api/*`, `/auth/*`, `/bot-invite`, and `/support-invite`

## Important database note
This version uses SQLite. On Netlify Functions, SQLite storage is not durable across cold starts. The dashboard routes can run, but real long-term production accounts should use a persistent hosted database later.

Do not share this ZIP publicly if `.env` contains private secrets.
