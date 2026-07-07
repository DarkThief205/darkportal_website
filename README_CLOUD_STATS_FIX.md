# Cloud stats fix

This build makes Wordle and Sudoku persist both cloud saves and stats in Neon/Postgres.

## Saved rows

`game_saves`:
- `wordle_state_v2`
- `wordle_stats_v2`
- `sudoku_current_v4`
- `sudoku_progress_v1`

`game_progress`:
- `wordle` after a completed Wordle round
- `sudoku` after a completed/failed classic Sudoku round
- `sumdoku` after a completed/failed Sum-Doku/Killer round

Sudoku now uses the same auth fallback as the cloud saves, so stats still save if the user is authenticated by cookie and localStorage token is missing.
