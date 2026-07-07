# DarkPortal cloud game saves

This build adds real DB-backed save data for games that previously used only browser localStorage.

## New database table

The app automatically creates this table in Neon/Postgres on first request after deploy:

- `game_saves`

It stores per-user JSON saves by `save_key`.

## New API endpoints

Authenticated with `Authorization: Bearer <dg_token>`:

- `GET /api/games/save/:key`
- `PUT /api/games/save/:key`
- `POST /api/games/save/:key`
- `DELETE /api/games/save/:key`
- `GET /api/games/saves?prefix=...`

## What is saved now

- Sudoku current puzzle, board, solution, notes, cages, mistakes, timer, hints, pencil mode, pause state and progress bar local data.
- Wordle stats, daily history, streaks, distribution, current unfinished round, guesses, keyboard/clue state and result state.
- Existing `game_progress` stats still save wins/losses/xp/best scores.

## Deploy notes

Keep these Vercel environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `BASE_URL=https://darkportal.is-a.dev`
- `PUBLIC_CANONICAL_ORIGIN=https://darkportal.is-a.dev`
- `ENFORCE_CANONICAL_ORIGIN=true`

Redeploy after changing env variables.
