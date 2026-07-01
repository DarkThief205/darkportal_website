# DarkPortal Netlify Ready v67

This package keeps the latest v67 website files in `public/` and the API in a Netlify serverless function.

## Netlify settings

- Build command: leave empty or use `npm install`
- Publish directory: `public`
- Functions directory: `netlify/functions`
- Node version: 20 recommended

## Required environment variables

Set the real values in Netlify Site Settings > Environment variables. Do not rely on `.env` in production.

Important production URL values:

```env
BASE_URL=https://darkportal.is-a.dev
PUBLIC_CANONICAL_ORIGIN=https://darkportal.is-a.dev
DISCORD_REDIRECT_URI=https://darkportal.is-a.dev/auth/discord/callback
GOOGLE_REDIRECT_URI=https://darkportal.is-a.dev/auth/google/callback
STEAM_RETURN_URL=https://darkportal.is-a.dev/auth/steam/callback
STEAM_REALM=https://darkportal.is-a.dev
DISCORD_BOT_STATUS_URL=https://YOUR_PUBLIC_BOT_STATUS_URL/status
DASHBOARD_SHARED_SECRET=same_value_as_BOT_DASHBOARD_SECRET
```

The Discord preview banner is included at `public/og-banner.png` and the HTML Open Graph tags point to `https://darkportal.is-a.dev/og-banner.png`.
