# Dark Portal deploy notes

This ZIP contains the full Dark Portal site with the latest home-page 100% zoom fit fix, Google Search Console verification file, and dashboard Discord provider gate cleanup.

## Important
- `.env` is included because you requested a full ZIP with env for local testing.
- Do not share this ZIP publicly if `.env` contains private secrets.
- In Netlify, set the same variables from `.env` in Site configuration → Environment variables.

## Quick local test
```bash
npm install
npm start
```
Then open the local URL shown by the server, usually `http://localhost:3000`.

## Google verification
After deploy, this file should load:
`https://darkportal.is-a.dev/google92111987cc89c5cd.html`

## Dashboard behavior
- Discord not linked to the current profile: dashboard shows “Link Discord in Profile”.
- Discord is linked but access token is missing/expired: dashboard shows “Refresh Discord access”.
- Server controls only load after Discord access is available.
