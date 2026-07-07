# Cloud saves fix

This build fixes cloud saves for Wordle and Sudoku by:

- allowing authenticated saves through same-origin cookies when localStorage token is missing;
- sending `credentials: same-origin` on save/load requests;
- flushing Wordle/Sudoku saves on `pagehide` / tab close;
- keeping localStorage and cookie token fallback in sync.

After deploying, log out and log in again once if old sessions were created before `JWT_SECRET` was set. Then start a Wordle/Sudoku round and check the `game_saves` table. Expected save keys:

- `wordle_state_v2`
- `wordle_stats_v2`
- `sudoku_current_v4`
- `sudoku_progress_v1`
