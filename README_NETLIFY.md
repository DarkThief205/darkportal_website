# Dark Portal — Netlify-ready package

This version is laid out like a Netlify deploy:

- `public/` contains the static site files, assets, and games.
- `netlify/functions/api.js` runs the Express backend as a Netlify Function.
- `netlify.toml` routes `/api/*`, `/auth/*`, `/bot-invite`, and `/support-invite` to the function.
- Backend files stay at the repo root: `server.js`, `db.js`, and `routes/`.

## Deploy

1. Upload this folder/ZIP to GitHub.
2. Connect it to Netlify.
3. In Netlify build settings, use:
   - Build command: leave blank, or use `npm install` if your Netlify UI requires one.
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. Add the variables from `NETLIFY_ENV_REQUIRED.md` in Netlify environment variables.

## Local test

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

To test Netlify redirects/functions locally, install the Netlify CLI and run:

```bash
netlify dev
```

## Notes

The uploaded source ZIP contained a real `.env` file. This Netlify-ready ZIP intentionally does **not** include `.env`; use `.env.example` and Netlify environment variables instead.

SQLite in Netlify Functions writes to `/tmp` by default, which is temporary storage. Use a hosted database for production persistence.

Google Search Console verification is included at `public/google92111987cc89c5cd.html`.
