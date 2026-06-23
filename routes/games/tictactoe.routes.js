const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const EMPTY_BOARD = ['', '', '', '', '', '', '', '', ''];
const PIECE_LIMIT = 3;
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function createTicTacToeRouter({ db, jwtSecret }) {
  const router = express.Router();

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS tictactoe_matches (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'waiting',
      board_json TEXT NOT NULL DEFAULT '["","","","","","","","",""]',
      turn TEXT DEFAULT 'X',
      winner TEXT,
      player_x_key TEXT,
      player_x_name TEXT,
      player_x_discord_id TEXT,
      player_o_key TEXT,
      player_o_name TEXT,
      player_o_discord_id TEXT,
      invited_discord_id TEXT,
      invited_name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      finished_at INTEGER,
      meta_json TEXT DEFAULT '{}'
    )`);
  });

  function run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(error) {
        if (error) reject(error);
        else resolve(this);
      });
    });
  }

  function get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (error, row) => {
        if (error) reject(error);
        else resolve(row);
      });
    });
  }

  function safeRoomId(value) {
    const roomId = String(value || '').trim().toLowerCase();
    return /^[a-z0-9_-]{6,40}$/.test(roomId) ? roomId : null;
  }

  function safeVariant(value) {
    return value === 'vanish' ? 'vanish' : 'classic';
  }

  function publicName(value, fallback = 'Player') {
    const name = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 32);
    return name || fallback;
  }

  function readBearerUser(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;

    try {
      return jwt.verify(auth.slice(7), jwtSecret);
    } catch {
      return null;
    }
  }

  function getIdentity(req) {
    const user = readBearerUser(req);

    if (user) {
      return {
        key: `user:${user.id}`,
        name: publicName(user.username || user.discord_username, 'Discord Player'),
        userId: user.id,
        discordId: user.discord_id || null,
      };
    }

    const inputGuestId = String(req.body?.guest_id || req.query?.guest_id || '').trim();
    const guestId = /^[a-zA-Z0-9_-]{8,80}$/.test(inputGuestId)
      ? inputGuestId
      : crypto.randomUUID();

    return {
      key: `guest:${guestId}`,
      name: publicName(req.body?.display_name || req.query?.display_name, 'Guest'),
      userId: null,
      discordId: null,
    };
  }

  function parseBoard(value) {
    try {
      const parsed = JSON.parse(value || '[]');
      if (!Array.isArray(parsed) || parsed.length !== 9) return [...EMPTY_BOARD];
      return parsed.map((cell) => (cell === 'X' || cell === 'O' ? cell : ''));
    } catch {
      return [...EMPTY_BOARD];
    }
  }

  function stringifyBoard(board) {
    return JSON.stringify(board.map((cell) => (cell === 'X' || cell === 'O' ? cell : '')));
  }

  function defaultMeta(variant = 'classic') {
    return {
      game_variant: safeVariant(variant),
      piece_limit: PIECE_LIMIT,
      move_count: 0,
      queues: {
        X: [],
        O: [],
      },
    };
  }

  function parseMeta(value, variantFallback = 'classic') {
    try {
      const parsed = JSON.parse(value || '{}');
      const meta = {
        ...defaultMeta(parsed.game_variant || variantFallback),
        ...parsed,
      };

      meta.game_variant = safeVariant(meta.game_variant);
      meta.piece_limit = PIECE_LIMIT;
      meta.move_count = Number.isInteger(Number(meta.move_count)) ? Number(meta.move_count) : 0;
      meta.queues = {
        X: Array.isArray(meta.queues?.X) ? meta.queues.X.filter(Number.isInteger).filter((i) => i >= 0 && i <= 8) : [],
        O: Array.isArray(meta.queues?.O) ? meta.queues.O.filter(Number.isInteger).filter((i) => i >= 0 && i <= 8) : [],
      };

      return meta;
    } catch {
      return defaultMeta(variantFallback);
    }
  }

  function stringifyMeta(meta) {
    return JSON.stringify({
      game_variant: safeVariant(meta.game_variant),
      piece_limit: PIECE_LIMIT,
      move_count: Number(meta.move_count || 0),
      queues: {
        X: Array.isArray(meta.queues?.X) ? meta.queues.X : [],
        O: Array.isArray(meta.queues?.O) ? meta.queues.O : [],
      },
    });
  }

  function checkWinner(board, variant = 'classic') {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }

    return variant === 'classic' && board.every(Boolean) ? 'draw' : null;
  }

  function applyMove(board, meta, mark, cell) {
    const nextBoard = [...board];
    const nextMeta = parseMeta(stringifyMeta(meta));

    if (nextBoard[cell]) {
      return { ok: false, board: nextBoard, meta: nextMeta };
    }

    nextBoard[cell] = mark;
    nextMeta.move_count = Number(nextMeta.move_count || 0) + 1;

    if (nextMeta.game_variant === 'vanish') {
      nextMeta.queues[mark].push(cell);

      while (nextMeta.queues[mark].length > PIECE_LIMIT) {
        const removeIndex = nextMeta.queues[mark].shift();

        if (nextBoard[removeIndex] === mark) {
          nextBoard[removeIndex] = '';
        }
      }
    }

    return { ok: true, board: nextBoard, meta: nextMeta };
  }

  function publicMatch(row, identity) {
    const board = parseBoard(row.board_json);
    const meta = parseMeta(row.meta_json);
    let role = 'observer';

    if (identity?.key === row.player_x_key) role = 'X';
    if (identity?.key === row.player_o_key) role = 'O';

    return {
      id: row.id,
      status: row.status,
      board,
      turn: row.turn,
      winner: row.winner,
      role,
      game_variant: meta.game_variant,
      piece_limit: meta.piece_limit,
      move_count: meta.move_count,
      queues: meta.queues,
      players: {
        X: row.player_x_key
          ? { name: row.player_x_name || 'Player X', discord_id: row.player_x_discord_id || null }
          : null,
        O: row.player_o_key
          ? { name: row.player_o_name || 'Player O', discord_id: row.player_o_discord_id || null }
          : null,
      },
      invited: row.invited_discord_id
        ? { discord_id: row.invited_discord_id, name: row.invited_name || 'Invited player' }
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      finished_at: row.finished_at,
    };
  }

  async function createRoomIfMissing(roomId, identity, invite = {}) {
    const existing = await get('SELECT * FROM tictactoe_matches WHERE id = ?', [roomId]);
    if (existing) return existing;

    const now = Date.now();
    const meta = defaultMeta(invite.gameVariant || 'classic');

    await run(
      `INSERT INTO tictactoe_matches (
        id,
        status,
        board_json,
        turn,
        player_x_key,
        player_x_name,
        player_x_discord_id,
        invited_discord_id,
        invited_name,
        created_at,
        updated_at,
        meta_json
      ) VALUES (?, 'waiting', ?, 'X', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        roomId,
        stringifyBoard(EMPTY_BOARD),
        identity.key,
        identity.name,
        identity.discordId,
        invite.opponentDiscordId || null,
        invite.opponentName || null,
        now,
        now,
        stringifyMeta(meta),
      ]
    );

    return get('SELECT * FROM tictactoe_matches WHERE id = ?', [roomId]);
  }

  async function joinRoom(row, identity) {
    if (row.player_x_key === identity.key || row.player_o_key === identity.key) return row;

    if (!row.player_o_key && row.status === 'waiting') {
      const now = Date.now();
      await run(
        `UPDATE tictactoe_matches
         SET status = 'active',
             player_o_key = ?,
             player_o_name = ?,
             player_o_discord_id = ?,
             updated_at = ?
         WHERE id = ?`,
        [identity.key, identity.name, identity.discordId, now, row.id]
      );

      return get('SELECT * FROM tictactoe_matches WHERE id = ?', [row.id]);
    }

    return row;
  }

  function requestInvite(req) {
    return {
      opponentDiscordId: String(req.body?.opponent_discord_id || '').trim().replace(/[^0-9]/g, '').slice(0, 30) || null,
      opponentName: publicName(req.body?.opponent_name, ''),
      gameVariant: safeVariant(req.body?.game_variant || req.query?.variant),
    };
  }

  router.post('/rooms', async (req, res) => {
    try {
      const identity = getIdentity(req);
      const roomId = safeRoomId(req.body?.room_id) || crypto.randomBytes(6).toString('hex');
      const row = await createRoomIfMissing(roomId, identity, requestInvite(req));

      res.json({ ok: true, match: publicMatch(row, identity) });
    } catch (error) {
      console.error('Tic-Tac-Toe create room error:', error);
      res.status(500).json({ error: 'Could not create room' });
    }
  });

  router.post('/rooms/:id/open', async (req, res) => {
    try {
      const roomId = safeRoomId(req.params.id);
      if (!roomId) return res.status(400).json({ error: 'Invalid room id' });

      const identity = getIdentity(req);
      const row = await createRoomIfMissing(roomId, identity, requestInvite(req));
      const joined = await joinRoom(row, identity);

      res.json({ ok: true, match: publicMatch(joined, identity) });
    } catch (error) {
      console.error('Tic-Tac-Toe open room error:', error);
      res.status(500).json({ error: 'Could not open room' });
    }
  });

  router.get('/rooms/:id', async (req, res) => {
    try {
      const roomId = safeRoomId(req.params.id);
      if (!roomId) return res.status(400).json({ error: 'Invalid room id' });

      const identity = getIdentity(req);
      const row = await get('SELECT * FROM tictactoe_matches WHERE id = ?', [roomId]);
      if (!row) return res.status(404).json({ error: 'Room not found' });

      res.json({ ok: true, match: publicMatch(row, identity) });
    } catch (error) {
      console.error('Tic-Tac-Toe read room error:', error);
      res.status(500).json({ error: 'Could not read room' });
    }
  });

  router.post('/rooms/:id/move', async (req, res) => {
    try {
      const roomId = safeRoomId(req.params.id);
      if (!roomId) return res.status(400).json({ error: 'Invalid room id' });

      const identity = getIdentity(req);
      const cell = Number(req.body?.cell);
      if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
        return res.status(400).json({ error: 'Invalid cell' });
      }

      const row = await get('SELECT * FROM tictactoe_matches WHERE id = ?', [roomId]);
      if (!row) return res.status(404).json({ error: 'Room not found' });

      const match = publicMatch(row, identity);

      if (row.status !== 'active') {
        return res.status(409).json({ error: 'Match is not active', match });
      }

      if (match.role === 'observer') {
        return res.status(403).json({ error: 'You are not a player in this match', match });
      }

      if (match.role !== row.turn) {
        return res.status(409).json({ error: 'It is not your turn', match });
      }

      const board = parseBoard(row.board_json);
      const meta = parseMeta(row.meta_json);

      if (board[cell]) return res.status(409).json({ error: 'Cell is already taken', match });

      const applied = applyMove(board, meta, row.turn, cell);
      if (!applied.ok) return res.status(409).json({ error: 'Cell is already taken', match });

      const winner = checkWinner(applied.board, applied.meta.game_variant);
      const nextTurn = row.turn === 'X' ? 'O' : 'X';
      const now = Date.now();

      if (winner) {
        await run(
          `UPDATE tictactoe_matches
           SET board_json = ?, status = 'finished', winner = ?, meta_json = ?, updated_at = ?, finished_at = ?
           WHERE id = ?`,
          [stringifyBoard(applied.board), winner, stringifyMeta(applied.meta), now, now, roomId]
        );
      } else {
        await run(
          `UPDATE tictactoe_matches
           SET board_json = ?, turn = ?, meta_json = ?, updated_at = ?
           WHERE id = ?`,
          [stringifyBoard(applied.board), nextTurn, stringifyMeta(applied.meta), now, roomId]
        );
      }

      const updated = await get('SELECT * FROM tictactoe_matches WHERE id = ?', [roomId]);
      res.json({ ok: true, match: publicMatch(updated, identity) });
    } catch (error) {
      console.error('Tic-Tac-Toe move error:', error);
      res.status(500).json({ error: 'Could not play move' });
    }
  });

  return router;
}

module.exports = createTicTacToeRouter;
