Dark Portal - Netlify real OAuth crash fix

This package keeps the real OAuth login system. It does not include .env.
Use your Netlify Environment Variables for provider secrets/callback URLs.

Why this package exists:
The previous Netlify Function could crash on /auth/*/callback with Runtime.ExitError exit status 129 because the native sqlite3 dependency is not reliable inside Netlify Functions. This version removes sqlite3 from the Netlify package and uses a small Netlify-safe DB adapter for the exact db.run/db.get/db.all calls used by the site. Login persists through the signed JWT token/cookie/localStorage session.

Netlify settings:
Build command: npm run build
Publish directory: public
Functions directory: netlify/functions

Make sure callback URLs in Discord/Google/Steam developer settings match your live domain:
https://YOUR-SITE.netlify.app/auth/discord/callback
https://YOUR-SITE.netlify.app/auth/google/callback
https://YOUR-SITE.netlify.app/auth/steam/callback
