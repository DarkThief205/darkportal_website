# Netlify login/session fix v69

This package keeps the existing v67/v68 site changes and fixes the provider login loop on Netlify.

What changed:

- `/auth/*` still uses the Netlify Function backend.
- After OAuth succeeds, the backend writes both browser localStorage data and a signed `dp_session` HttpOnly cookie.
- `/api/session` can re-hydrate the browser session from the cookie if localStorage is empty or the browser token was removed.
- API auth accepts either `Authorization: Bearer ...` or the `dp_session` cookie.
- JWT sessions include the provider info needed for dashboard access, so a Netlify cold start or `/tmp` JSON store reset will not immediately force the user back to the provider menu.
- No `.env` or `.env.example` files are included; configure env vars in Netlify dashboard.

Recommended Netlify env vars:

- `BASE_URL=https://darkportal.is-a.dev`
- `PUBLIC_CANONICAL_ORIGIN=https://darkportal.is-a.dev`
- `DISCORD_CLIENT_ID=...`
- `DISCORD_CLIENT_SECRET=...`
- `DISCORD_REDIRECT_URI=https://darkportal.is-a.dev/auth/discord/callback`
- `JWT_SECRET=<long random value>`

After deploy, test in a clean/incognito window:

`https://darkportal.is-a.dev/login.html?next=%2Fdashboard.html`

If Discord still shows old auth/callback behavior, verify the Discord Developer Portal has this exact redirect URI:

`https://darkportal.is-a.dev/auth/discord/callback`
