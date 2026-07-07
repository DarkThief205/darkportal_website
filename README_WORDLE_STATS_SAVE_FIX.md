# Wordle stats save fix v4

This build makes Wordle progress saving durable and idempotent.

Changes:
- Adds `game_progress_events` table for one-time progress events.
- Wordle now creates a stable event id per finished round.
- Wordle queues finished rounds in `localStorage` before sending them to the API.
- If a POST fails or the user navigates away, the queue retries on the next Wordle/Stats page load.
- `/api/games/progress/:game` is idempotent when `eventId` is provided, so retries do not double count wins/losses.
- Stats page merges local Wordle stats immediately and flushes the queued progress before loading `/api/stats`.
- Server stats can fallback to `game_saves.wordle_stats_v2` if a progress row is missing.

Deploy steps:
1. Deploy this ZIP to Vercel.
2. Keep `DATABASE_URL` and `JWT_SECRET` in Vercel Environment Variables.
3. Redeploy after env changes.
4. Logout/login once, then finish a Wordle round.
5. Check Neon tables: `game_progress`, `game_progress_events`, `game_saves`.
