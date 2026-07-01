const $ = (id) => document.getElementById(id);

const fallingLayer = $('tttFallingLayer');
const setupScreen = $('tttSetupScreen');
const gameShell = $('tttGameShell');
const boardEl = $('tttBoard');
const msgEl = $('tttMsg');
const statusEl = $('tttStatus');
const boardTitle = $('tttBoardTitle');

const onlineActionPanel = $('onlineActionPanel');
const gameModePanel = $('gameModePanel');
const gameModeStepNumber = $('gameModeStepNumber');
const difficultyPanel = $('difficultyPanel');
const onlineDetailsPanel = $('onlineDetailsPanel');
const onlineDetailsStepNumber = $('onlineDetailsStepNumber');
const onlineDetailsTitle = $('onlineDetailsTitle');
const startRow = $('tttStartRow');

const startBtn = $('tttStart');
const changeSetupBtn = $('tttChangeSetup');
const replayQuickBtn = $('tttReplayMatch');
const helpOpenBtn = $('tttHelpOpen');
const helpModal = $('tttHelpModal');
const resultModal = $('tttResultModal');
const resultTitle = $('tttResultTitle');
const resultText = $('tttResultText');
const resultOrb = $('tttResultOrb');
const resultReplayBtn = $('tttResultReplay');
const resultCancelBtn = $('tttResultCancel');

const modeBotBtn = $('modeBot');
const modeLocalBtn = $('modeLocal');
const modeOnlineBtn = $('modeOnline');
const onlineHostBtn = $('onlineHost');
const onlineJoinBtn = $('onlineJoin');
const variantClassicBtn = $('variantClassic');
const variantVanishBtn = $('variantVanish');
const difficultyEasyBtn = $('difficultyEasy');
const difficultyMediumBtn = $('difficultyMedium');
const difficultyHardBtn = $('difficultyHard');

const roomCodePill = $('tttRoomCodePill');
const copyRoomCodeBtn = $('tttCopyRoomCode');
const roomCodeDisplay = $('tttRoomCodeDisplay');
const roomCodeSection = $('roomCodeSection');
const roomCodeInput = $('tttRoomCode');
const displayNameInput = $('tttDisplayName');
const guestNameSection = $('tttGuestNameSection');
const accountNote = $('tttAccountNote');

const modeText = $('tttModeText');
const roleText = $('tttRoleText');
const turnText = $('tttTurnText');
const turnBadge = $('tttTurnBadge');
const playerXText = $('tttPlayerX');
const playerOText = $('tttPlayerO');
const compactStatusText = $('tttCompactStatus');
const moveCountText = $('tttMoveCount');
const roundText = $('tttRoundText');
const sessionTimeText = $('tttSessionTime');
const variantTag = $('tttVariantTag');
const difficultyTag = $('tttDifficultyTag');
const scoreXText = $('tttScoreX');
const scoreOText = $('tttScoreO');
const scoreDrawsText = $('tttScoreDraws');

const tokenTtt = localStorage.getItem('dg_token');
const sessionNameTtt = localStorage.getItem('dg_session') || '';
const hasDiscordSession = Boolean(tokenTtt || sessionNameTtt);
const query = new URLSearchParams(location.search);

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const PIECE_LIMIT = 3;
const ACTIVE_MATCH_KEY = 'dark_ttt_active_match';

let playMode = query.get('room') ? 'online' : null;
let onlineAction = query.get('room') ? 'link' : null;
let gameVariant = query.get('variant') === 'vanish' ? 'vanish' : null;
let difficulty = localStorage.getItem('dark_ttt_difficulty') || 'medium';
if (!['easy', 'medium', 'hard'].includes(difficulty)) difficulty = 'medium';

let board = Array(9).fill('');
let turn = 'X';
let ended = false;
let winningCells = [];
let moveCount = 0;
let roundNumber = Number(sessionStorage.getItem('dark_ttt_round') || '0');
localStorage.removeItem('dark_ttt_round');
let matchScore = { X: 0, O: 0, draws: 0 };
let markQueues = { X: [], O: [] };
let playerMark = 'X';
let botMark = 'O';
let botThinking = false;

let onlineRoomId = query.get('room') || '';
let onlineRole = 'observer';
let onlinePoll = null;
let currentMatch = null;
let lastResultModalKey = '';
let sessionSeconds = Number(sessionStorage.getItem('dark_ttt_session_seconds') || '0');
let sessionTimer = null;

function initFallingSymbols() {
  if (!fallingLayer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  fallingLayer.innerHTML = '';

  Array.from({ length: 104 }, (_, index) => (index % 2 === 0 ? 'X' : 'O')).forEach((symbol) => {
    const element = document.createElement('span');
    const isX = symbol === 'X';

    element.className = 'ttt-falling-symbol';
    element.textContent = symbol;
    element.style.setProperty('--left', `${Math.random() * 100}%`);
    element.style.setProperty('--size', `${25 + Math.random() * 50}px`);
    element.style.setProperty('--duration', `${8 + Math.random() * 11}s`);
    element.style.setProperty('--delay', `${-Math.random() * 20}s`);
    element.style.setProperty('--drift', `${-110 + Math.random() * 220}px`);
    element.style.setProperty('--rotation', `${-35 + Math.random() * 70}deg`);
    element.style.setProperty('--opacity', `${0.25 + Math.random() * 0.28}`);
    element.style.setProperty('--color', isX ? '#ff2e66' : '#29a8ff');
    element.style.setProperty('--glow', isX ? 'rgba(255, 46, 102, 0.70)' : 'rgba(41, 168, 255, 0.70)');
    fallingLayer.appendChild(element);
  });
}

function makeRandomId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getGuestId() {
  let guestId = localStorage.getItem('dark_ttt_guest_id');
  if (!guestId) {
    guestId = `guest_${makeRandomId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    localStorage.setItem('dark_ttt_guest_id', guestId);
  }
  return guestId;
}

function defaultDisplayName() {
  return sessionNameTtt || localStorage.getItem('dark_ttt_display_name') || 'Player';
}

function publicDisplayName() {
  if (hasDiscordSession) return defaultDisplayName().slice(0, 32) || 'Discord Player';
  const inputName = displayNameInput?.value?.trim();
  return (inputName || localStorage.getItem('dark_ttt_display_name') || 'Player').slice(0, 32) || 'Player';
}

function formatSessionTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateSessionTimerUi() {
  if (sessionTimeText) sessionTimeText.textContent = formatSessionTime(sessionSeconds);
}

function stopSessionTimer() {
  if (sessionTimer) clearInterval(sessionTimer);
  sessionTimer = null;
}

function startSessionTimer({ reset = false } = {}) {
  if (reset) {
    sessionSeconds = 0;
    sessionStorage.setItem('dark_ttt_session_seconds', '0');
  }

  updateSessionTimerUi();
  if (sessionTimer) return;

  sessionTimer = setInterval(() => {
    if (ended || gameShell.hidden) return;
    sessionSeconds += 1;
    sessionStorage.setItem('dark_ttt_session_seconds', String(sessionSeconds));
    updateSessionTimerUi();
  }, 1000);
}

function syncOnlineSessionTimer(match) {
  if (!match?.created_at) return;
  const createdAt = Number(match.created_at);
  if (!Number.isFinite(createdAt)) return;
  sessionSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  sessionStorage.setItem('dark_ttt_session_seconds', String(sessionSeconds));
  updateSessionTimerUi();
}

function apiHeaders() {
  const headers = { 'content-type': 'application/json' };
  if (tokenTtt) headers.authorization = `Bearer ${tokenTtt}`;
  return headers;
}

function identityPayload(extra = {}) {
  return {
    guest_id: getGuestId(),
    display_name: publicDisplayName(),
    ...extra,
  };
}

function safeRoomCode(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

function setRoomCodePill(visible, code = onlineRoomId) {
  if (!roomCodePill) return;
  const clean = safeRoomCode(code || onlineRoomId);
  const shouldShow = Boolean(visible && clean);
  roomCodePill.hidden = !shouldShow;
  if (roomCodeDisplay) roomCodeDisplay.textContent = shouldShow ? clean.toUpperCase() : '----';
}

function currentActiveMatchSnapshot() {
  if (!playMode || gameShell?.hidden) return null;

  if (playMode === 'online') {
    if (!onlineRoomId) return null;
    return {
      playMode,
      onlineAction,
      onlineRoomId,
      gameVariant: gameVariant || currentMatch?.game_variant || 'classic',
      displayName: displayNameInput?.value || defaultDisplayName(),
      sessionSeconds,
      roundNumber,
      matchScore,
      savedAt: Date.now(),
    };
  }

  return {
    playMode,
    onlineAction,
    gameVariant: gameVariant || 'classic',
    difficulty,
    board,
    turn,
    ended,
    winningCells,
    moveCount,
    roundNumber,
    matchScore,
    markQueues,
    playerMark,
    botMark,
    sessionSeconds,
    displayName: displayNameInput?.value || defaultDisplayName(),
    savedAt: Date.now(),
  };
}

function saveActiveMatch() {
  const snapshot = currentActiveMatchSnapshot();
  if (!snapshot) return;
  try {
    sessionStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(snapshot));
  } catch {
    // Session restore is optional.
  }
}

function clearActiveMatch() {
  try { sessionStorage.removeItem(ACTIVE_MATCH_KEY); } catch {}
}

async function restoreActiveMatch() {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(ACTIVE_MATCH_KEY) || 'null'); } catch { saved = null; }
  if (!saved?.playMode) return false;

  playMode = saved.playMode;
  onlineAction = saved.onlineAction || null;
  gameVariant = saved.gameVariant === 'vanish' ? 'vanish' : 'classic';
  if (saved.displayName && displayNameInput) displayNameInput.value = saved.displayName;
  roundNumber = Number(saved.roundNumber || roundNumber || 1);
  sessionSeconds = Number(saved.sessionSeconds || 0);
  matchScore = saved.matchScore || { X: 0, O: 0, draws: 0 };

  if (playMode === 'online' && saved.onlineRoomId) {
    onlineRoomId = safeRoomCode(saved.onlineRoomId);
    onlineAction = saved.onlineAction || 'host';
    setRoomCodePill(onlineAction === 'host', onlineRoomId);
    showGame();
    updateSessionTimerUi();
    startSessionTimer();

    try {
      await pollOnlineRoom();
      startPolling();
      return true;
    } catch {
      clearActiveMatch();
      showSetup();
      return false;
    }
  }

  if (!['bot', 'local'].includes(playMode)) return false;
  difficulty = ['easy', 'medium', 'hard'].includes(saved.difficulty) ? saved.difficulty : difficulty;
  board = Array.isArray(saved.board) && saved.board.length === 9 ? saved.board : Array(9).fill('');
  turn = saved.turn === 'O' ? 'O' : 'X';
  ended = Boolean(saved.ended);
  winningCells = Array.isArray(saved.winningCells) ? saved.winningCells : [];
  moveCount = Number(saved.moveCount || board.filter(Boolean).length || 0);
  markQueues = saved.markQueues ? cloneQueues(saved.markQueues) : { X: [], O: [] };
  playerMark = saved.playerMark === 'O' ? 'O' : 'X';
  botMark = saved.botMark === 'X' ? 'X' : 'O';
  onlineRole = playMode === 'local' ? 'Both' : playerMark;

  setRoomCodePill(false);
  showGame();
  updateSessionTimerUi();
  if (!ended) startSessionTimer();
  setMessage(ended ? 'Match restored.' : `${turn}'s turn.`, 'neutral');
  renderBoard();
  if (playMode === 'bot' && !ended && turn === botMark) playBotTurn();
  return true;
}

function getWinningCells(nextBoard) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (nextBoard[a] && nextBoard[a] === nextBoard[b] && nextBoard[a] === nextBoard[c]) return line;
  }
  return [];
}

function checkWinner(nextBoard, variant = gameVariant || 'classic') {
  const line = getWinningCells(nextBoard);
  if (line.length) return nextBoard[line[0]];
  if (variant === 'classic' && nextBoard.every(Boolean)) return 'draw';
  return null;
}

function cloneQueues(queues) {
  return { X: [...(queues.X || [])], O: [...(queues.O || [])] };
}

function applyMoveToState(targetBoard, targetQueues, mark, index, variant = gameVariant || 'classic') {
  const nextBoard = [...targetBoard];
  const nextQueues = cloneQueues(targetQueues);

  if (nextBoard[index]) return { board: nextBoard, queues: nextQueues, valid: false };

  nextBoard[index] = mark;

  if (variant === 'vanish') {
    nextQueues[mark].push(index);
    while (nextQueues[mark].length > PIECE_LIMIT) {
      const removeIndex = nextQueues[mark].shift();
      if (nextBoard[removeIndex] === mark) nextBoard[removeIndex] = '';
    }
  }

  return { board: nextBoard, queues: nextQueues, valid: true };
}

function availableCells(targetBoard = board) {
  return targetBoard.map((value, index) => (value ? null : index)).filter((value) => value !== null);
}

function randomFrom(items) {
  return items.length ? items[Math.floor(Math.random() * items.length)] : null;
}

function randomMove() {
  return randomFrom(availableCells());
}

function findImmediateMove(mark, targetBoard = board, targetQueues = markQueues, variant = gameVariant || 'classic') {
  for (const index of availableCells(targetBoard)) {
    const simulated = applyMoveToState(targetBoard, targetQueues, mark, index, variant);
    if (simulated.valid && checkWinner(simulated.board, variant) === mark) return index;
  }
  return null;
}

function scoreBoardForMinimax(targetBoard, aiMark, humanMark, depth) {
  const result = checkWinner(targetBoard, 'classic');
  if (result === aiMark) return 10 - depth;
  if (result === humanMark) return depth - 10;
  if (result === 'draw') return 0;
  return null;
}

function minimax(targetBoard, aiMark, humanMark, currentMark, depth) {
  const terminalScore = scoreBoardForMinimax(targetBoard, aiMark, humanMark, depth);
  if (terminalScore !== null) return { score: terminalScore, move: null };

  const moves = availableCells(targetBoard);
  let best = currentMark === aiMark ? { score: -Infinity, move: moves[0] } : { score: Infinity, move: moves[0] };

  for (const move of moves) {
    const nextBoard = [...targetBoard];
    nextBoard[move] = currentMark;
    const result = minimax(nextBoard, aiMark, humanMark, currentMark === 'X' ? 'O' : 'X', depth + 1);

    if (currentMark === aiMark) {
      if (result.score > best.score) best = { score: result.score, move };
    } else if (result.score < best.score) {
      best = { score: result.score, move };
    }
  }

  return best;
}

function mediumBotMove() {
  const winMove = findImmediateMove(botMark);
  if (winMove !== null) return winMove;

  const blockMove = findImmediateMove(playerMark);
  if (blockMove !== null) return blockMove;

  if (!board[4]) return 4;
  const corners = [0, 2, 6, 8].filter((index) => !board[index]);
  if (corners.length) return randomFrom(corners);
  return randomMove();
}

function bestBotMove() {
  const cells = availableCells();
  if (!cells.length) return null;

  if (difficulty === 'easy') {
    if (Math.random() < 0.25) return mediumBotMove();
    return randomMove();
  }

  if (difficulty === 'hard' && (gameVariant || 'classic') === 'classic') {
    const best = minimax([...board], botMark, playerMark, botMark, 0).move;
    return best ?? mediumBotMove();
  }

  if (difficulty === 'medium') {
    return mediumBotMove();
  }

  const winMove = findImmediateMove(botMark);
  if (winMove !== null) return winMove;
  const blockMove = findImmediateMove(playerMark);
  if (blockMove !== null) return blockMove;
  return mediumBotMove();
}

function nextVanishIndex(mark) {
  if ((gameVariant || 'classic') !== 'vanish') return null;
  if ((markQueues[mark] || []).length < PIECE_LIMIT) return null;
  return markQueues[mark][0];
}

function setMessage(text, tone = 'neutral') {
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.classList.toggle('is-good', tone === 'good');
  msgEl.classList.toggle('is-bad', tone === 'bad');
}

function setActive(buttons, activeButton) {
  buttons.forEach((button) => button?.classList.toggle('is-active', button === activeButton));
}

function setupComplete() {
  if (!playMode) return false;

  if (playMode === 'bot') return Boolean(gameVariant && difficulty);
  if (playMode === 'local') return Boolean(gameVariant);

  if (playMode === 'online') {
    if (!onlineAction) return false;
    if (onlineAction === 'host') return Boolean(gameVariant);
    if (onlineAction === 'join') return safeRoomCode(roomCodeInput?.value).length >= 6;
    if (onlineAction === 'link') return Boolean(onlineRoomId);
  }

  return false;
}

function updateSetupStatus() {
  if (!playMode) {
    statusEl.textContent = 'Choose your opponent. The next step will appear after your selection.';
    return;
  }

  if (playMode === 'bot') {
    if (!gameVariant) statusEl.textContent = 'Now choose Classic or Vanish mode.';
    else statusEl.textContent = 'Choose the bot difficulty, then start the match.';
    return;
  }

  if (playMode === 'local') {
    statusEl.textContent = gameVariant ? 'Ready. Start a local match on this screen.' : 'Choose Classic or Vanish mode.';
    return;
  }

  if (!onlineAction) {
    statusEl.textContent = 'Choose whether you want to host a room or join an existing match.';
    return;
  }

  if (onlineAction === 'host') {
    statusEl.textContent = gameVariant ? 'Ready. Host the room and share the generated code.' : 'Choose the game mode for the room.';
    return;
  }

  if (onlineAction === 'join') {
    statusEl.textContent = 'Enter the room code your opponent sent you.';
    return;
  }

  statusEl.textContent = 'Open the challenge match from this invite link.';
}

function syncSetupUi() {
  setActive([modeBotBtn, modeLocalBtn, modeOnlineBtn], playMode === 'bot' ? modeBotBtn : playMode === 'local' ? modeLocalBtn : playMode === 'online' ? modeOnlineBtn : null);
  setActive([onlineHostBtn, onlineJoinBtn], onlineAction === 'host' ? onlineHostBtn : onlineAction === 'join' || onlineAction === 'link' ? onlineJoinBtn : null);
  setActive([variantClassicBtn, variantVanishBtn], gameVariant === 'classic' ? variantClassicBtn : gameVariant === 'vanish' ? variantVanishBtn : null);
  setActive([difficultyEasyBtn, difficultyMediumBtn, difficultyHardBtn], difficulty === 'easy' ? difficultyEasyBtn : difficulty === 'medium' ? difficultyMediumBtn : difficultyHardBtn);

  onlineActionPanel.hidden = playMode !== 'online';
  gameModePanel.hidden = !playMode || (playMode === 'online' && onlineAction !== 'host');
  difficultyPanel.hidden = !(playMode === 'bot' && gameVariant);
  onlineDetailsPanel.hidden = !(playMode === 'online' && (onlineAction === 'join' || onlineAction === 'link' || (onlineAction === 'host' && gameVariant)));
  roomCodeSection.hidden = !(playMode === 'online' && onlineAction === 'join');
  guestNameSection.hidden = !(playMode === 'online' && !hasDiscordSession);
  accountNote.hidden = !(playMode === 'online' && hasDiscordSession);

  gameModeStepNumber.textContent = playMode === 'online' ? '03' : '02';
  onlineDetailsStepNumber.textContent = onlineAction === 'host' ? '04' : '03';
  onlineDetailsTitle.textContent = onlineAction === 'join' || onlineAction === 'link' ? 'Join details' : 'Challenge identity';

  const ready = setupComplete();
  startRow.hidden = !ready;

  if (onlineAction === 'host') startBtn.textContent = 'Host Room';
  else if (onlineAction === 'join' || onlineAction === 'link') startBtn.textContent = 'Join Match';
  else startBtn.textContent = 'Start Match';

  updateSetupStatus();
}

function chooseOpponent(mode) {
  playMode = mode;
  onlineAction = null;
  gameVariant = null;

  if (mode === 'bot') difficulty = difficulty || 'medium';
  if (mode === 'online') {
    gameVariant = null;
    if (!roomCodeInput.value && onlineRoomId) roomCodeInput.value = onlineRoomId;
  }

  syncSetupUi();
}

function chooseOnlineAction(action) {
  onlineAction = action;
  if (action === 'join') gameVariant = null;
  if (action === 'host') gameVariant = null;
  syncSetupUi();
}

function chooseVariant(variant) {
  gameVariant = variant;
  syncSetupUi();
}

function chooseDifficulty(value) {
  difficulty = value;
  localStorage.setItem('dark_ttt_difficulty', value);
  syncSetupUi();
}

function updateScoreUi() {
  scoreXText.textContent = String(matchScore.X);
  scoreOText.textContent = String(matchScore.O);
  scoreDrawsText.textContent = String(matchScore.draws);
}

function playersForCurrentMode() {
  if (playMode === 'bot') {
    return {
      X: playerMark === 'X' ? 'You' : 'Dark Games AI',
      O: playerMark === 'O' ? 'You' : 'Dark Games AI',
      role: playerMark,
    };
  }

  if (playMode === 'local') {
    return { X: 'Player X', O: 'Player O', role: 'Both' };
  }

  return {
    X: currentMatch?.players?.X?.name || 'Player X',
    O: currentMatch?.players?.O?.name || currentMatch?.invited?.name || 'Waiting...',
    role: onlineRole || 'observer',
  };
}

function updateInfo() {
  const players = playersForCurrentMode();

  const modeLabel = playMode === 'bot' ? 'Bot Match' : playMode === 'local' ? 'Local Match' : 'Online Challenge';
  modeText.textContent = modeLabel;
  playerXText.textContent = players.X;
  playerOText.textContent = players.O;
  roleText.textContent = players.role;
  turnText.textContent = turn || 'X';
  moveCountText.textContent = String(moveCount);
  roundText.textContent = String(Math.max(roundNumber, 1));
  variantTag.textContent = (gameVariant || 'classic') === 'vanish' ? 'Vanish' : 'Classic';
  difficultyTag.hidden = playMode !== 'bot';
  difficultyTag.textContent = playMode === 'bot' ? difficulty[0].toUpperCase() + difficulty.slice(1) : '';
  compactStatusText.textContent = ended ? 'Finished' : 'Active';
  boardTitle.textContent = ended ? 'Match finished' : `${turn}'s turn`;

  turnBadge.classList.toggle('is-x', turn === 'X');
  turnBadge.classList.toggle('is-o', turn === 'O');

  updateScoreUi();
}

function renderBoard() {
  updateInfo();
  boardEl.innerHTML = '';

  const nextX = nextVanishIndex('X');
  const nextO = nextVanishIndex('O');

  board.forEach((value, index) => {
    const button = document.createElement('button');
    button.className = 'ttt-cell';
    button.type = 'button';
    button.textContent = value;
    button.setAttribute('aria-label', `Cell ${index + 1}${value ? `: ${value}` : ''}`);

    if (value === 'X') button.classList.add('mark-x');
    if (value === 'O') button.classList.add('mark-o');
    if (winningCells.includes(index)) button.classList.add('is-winning');
    if ((value === 'X' && index === nextX) || (value === 'O' && index === nextO)) {
      button.classList.add('is-next-vanish');
    }

    const onlineBlocked = playMode === 'online' && (onlineRole !== turn || onlineRole === 'observer' || currentMatch?.status !== 'active');
    const botBlocked = playMode === 'bot' && (turn !== playerMark || botThinking);
    button.disabled = ended || Boolean(value) || onlineBlocked || botBlocked;
    button.addEventListener('click', () => handleCellClick(index));

    boardEl.appendChild(button);
  });

  saveActiveMatch();
}

async function saveProgress(result) {
  if (!tokenTtt || playMode === 'online') return;
  try {
    await fetch('/api/games/progress/tictactoe', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        result,
        score: result === 'win' ? 100 : result === 'draw' ? 40 : 10,
        meta: { source: 'web', mode: playMode, variant: gameVariant, difficulty },
      }),
    });
  } catch {
    // Progress is optional for this gameplay milestone.
  }
}

function recordMatchScore(result) {
  if (result === 'X') matchScore.X += 1;
  else if (result === 'O') matchScore.O += 1;
  else if (result === 'draw') matchScore.draws += 1;
  updateScoreUi();
}

function resultCopy(result) {
  if (result === 'draw') {
    return { title: 'Draw', text: 'Nobody claimed the board this time. Replay and break the tie.', orb: '—', tone: 'draw' };
  }

  if (playMode === 'bot') {
    const playerWon = result === playerMark;
    return {
      title: playerWon ? 'You win' : 'Dark Games AI wins',
      text: playerWon ? 'Clean line. Want to run it back?' : 'The bot got this round. Replay and take revenge.',
      orb: result,
      tone: playerWon ? 'win' : 'loss',
    };
  }

  return { title: `${result} wins`, text: 'Replay with the same settings or cancel to review the board.', orb: result, tone: 'win' };
}

function showResultModal(result, key = '') {
  if (!resultModal) return;
  const modalKey = key || `${playMode}:${roundNumber}:${moveCount}:${result}`;
  if (modalKey && lastResultModalKey === modalKey) return;
  lastResultModalKey = modalKey;

  recordMatchScore(result);
  const copy = resultCopy(result);
  resultTitle.textContent = copy.title;
  resultText.textContent = copy.text;
  resultOrb.textContent = copy.orb;
  resultModal.classList.toggle('is-win', copy.tone === 'win');
  resultModal.classList.toggle('is-loss', copy.tone === 'loss');
  resultModal.classList.toggle('is-draw', copy.tone === 'draw');
  resultModal.hidden = false;
  document.body.classList.add('ttt-modal-open');
}

function hideResultModal() {
  if (!resultModal) return;
  resultModal.hidden = true;
  document.body.classList.remove('ttt-modal-open');
}

function openHelp() {
  helpModal.hidden = false;
  document.body.classList.add('ttt-modal-open');
}

function closeHelp() {
  helpModal.hidden = true;
  document.body.classList.remove('ttt-modal-open');
}

async function finishLocalGame(result) {
  ended = true;
  stopSessionTimer();
  winningCells = result !== 'draw' ? getWinningCells(board) : [];

  if (result === 'draw') {
    setMessage('Draw. Nobody gets the line.', 'neutral');
    await saveProgress('draw');
  } else if (playMode === 'bot') {
    const playerWon = result === playerMark;
    setMessage(playerWon ? 'You win.' : 'Dark Games AI wins.', playerWon ? 'good' : 'bad');
    await saveProgress(playerWon ? 'win' : 'loss');
  } else {
    setMessage(`${result} wins the local duel.`, 'good');
  }

  renderBoard();
  showResultModal(result);
}

function placeLocalMark(index, mark) {
  const result = applyMoveToState(board, markQueues, mark, index, gameVariant || 'classic');
  if (!result.valid) return false;

  board = result.board;
  markQueues = result.queues;
  moveCount += 1;
  return true;
}

function afterLocalMove() {
  const result = checkWinner(board, gameVariant || 'classic');
  if (result) {
    finishLocalGame(result);
    return true;
  }

  turn = turn === 'X' ? 'O' : 'X';
  return false;
}

function playBotTurn() {
  if (ended || playMode !== 'bot' || turn !== botMark) return;

  botThinking = true;
  setMessage('Dark Games AI is thinking...', 'neutral');
  renderBoard();

  window.setTimeout(() => {
    if (ended || playMode !== 'bot' || turn !== botMark) return;

    const move = bestBotMove();
    if (move !== null && move !== undefined) placeLocalMark(move, botMark);

    botThinking = false;
    if (afterLocalMove()) return;

    setMessage('Your turn. Find the winning line.', 'neutral');
    renderBoard();
  }, difficulty === 'hard' ? 420 : 320);
}

function handleCellClick(index) {
  if (playMode === 'online') {
    playOnlineMove(index);
    return;
  }

  if (ended || board[index]) return;
  if (playMode === 'bot' && turn !== playerMark) return;
  if (!placeLocalMark(index, turn)) return;
  if (afterLocalMove()) return;

  if (playMode === 'bot') {
    playBotTurn();
    return;
  }

  setMessage(`${turn}'s turn.`, 'neutral');
  renderBoard();
}

function chooseBotStarter() {
  const previous = localStorage.getItem('dark_ttt_last_bot_starter');
  let starter;

  if (previous === 'player') starter = 'bot';
  else if (previous === 'bot') starter = 'player';
  else starter = Math.random() < 0.5 ? 'player' : 'bot';

  localStorage.setItem('dark_ttt_last_bot_starter', starter);

  if (starter === 'player') {
    playerMark = 'X';
    botMark = 'O';
  } else {
    playerMark = 'O';
    botMark = 'X';
  }

  return starter === 'player' ? playerMark : botMark;
}

function resetLocalState(starterMark = 'X') {
  board = Array(9).fill('');
  markQueues = { X: [], O: [] };
  turn = starterMark;
  ended = false;
  botThinking = false;
  winningCells = [];
  moveCount = 0;
  currentMatch = null;
  onlineRole = playMode === 'local' ? 'Both' : playMode === 'bot' ? playerMark : onlineRole;

  if (playMode !== 'online') setRoomCodePill(false);
}

function showGame() {
  setupScreen.hidden = true;
  gameShell.hidden = false;
}

function showSetup() {
  hideResultModal();
  stopPolling();
  stopSessionTimer();
  clearActiveMatch();
  setRoomCodePill(false);
  setupScreen.hidden = false;
  gameShell.hidden = true;
  syncSetupUi();
}

function startLocalMatch() {
  hideResultModal();
  lastResultModalKey = '';
  roundNumber += 1;
  sessionStorage.setItem('dark_ttt_round', String(roundNumber));

  let starter = 'X';
  if (playMode === 'bot') starter = chooseBotStarter();
  else {
    playerMark = 'X';
    botMark = 'O';
  }

  resetLocalState(starter);
  showGame();
  startSessionTimer({ reset: true });

  if (playMode === 'bot') {
    const starterMessage = turn === playerMark ? `You start as ${playerMark}.` : `Dark Games AI starts as ${botMark}.`;
    setMessage(`${starterMessage} ${gameVariant === 'vanish' ? 'Vanish mode is active.' : 'Classic mode is active.'}`, 'neutral');
    renderBoard();
    playBotTurn();
    return;
  }

  setMessage(`X starts. ${gameVariant === 'vanish' ? 'Vanish mode is active.' : 'Classic mode is active.'}`, 'neutral');
  renderBoard();
}

async function hostOnlineRoom() {
  hideResultModal();
  lastResultModalKey = '';
  roundNumber += 1;
  sessionStorage.setItem('dark_ttt_round', String(roundNumber));

  const response = await fetch('/api/games/tictactoe/rooms', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(identityPayload({ game_variant: gameVariant || 'classic' })),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not host room');

  onlineRoomId = data.match.id;
  onlineAction = 'host';
  applyOnlineMatch(data.match);

  setRoomCodePill(true, onlineRoomId);
  showGame();
  startSessionTimer({ reset: true });
  saveActiveMatch();
  startPolling();
}

async function joinOnlineRoom(roomId, allowCreateFromLink = false) {
  hideResultModal();
  lastResultModalKey = '';

  const cleanRoomId = safeRoomCode(roomId);
  if (!cleanRoomId) throw new Error('Enter a valid room code.');

  if (!allowCreateFromLink) {
    const checkQuery = new URLSearchParams(identityPayload()).toString();
    const checkResponse = await fetch(`/api/games/tictactoe/rooms/${encodeURIComponent(cleanRoomId)}?${checkQuery}`, {
      headers: tokenTtt ? { authorization: `Bearer ${tokenTtt}` } : {},
    });

    if (!checkResponse.ok) throw new Error('Room not found. Check the code and try again.');
  }

  const opponentDiscordId = query.get('opponentDiscordId') || '';
  const opponentName = query.get('opponentName') || '';

  const response = await fetch(`/api/games/tictactoe/rooms/${encodeURIComponent(cleanRoomId)}/open`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(identityPayload({
      opponent_discord_id: opponentDiscordId,
      opponent_name: opponentName,
      game_variant: gameVariant || query.get('variant') || 'classic',
    })),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not join room');

  onlineRoomId = cleanRoomId;
  onlineAction = allowCreateFromLink ? 'link' : 'join';
  applyOnlineMatch(data.match);

  setRoomCodePill(false);
  showGame();
  startSessionTimer({ reset: true });
  saveActiveMatch();
  startPolling();
}

async function startMatch() {
  if (!setupComplete()) {
    updateSetupStatus();
    return;
  }

  try {
    if (playMode === 'online') {
      if (onlineAction === 'host') await hostOnlineRoom();
      else if (onlineAction === 'join') await joinOnlineRoom(roomCodeInput.value, false);
      else if (onlineAction === 'link') await joinOnlineRoom(onlineRoomId, true);
      return;
    }

    startLocalMatch();
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

function replayMatch() {
  if (playMode === 'online') {
    if (onlineAction === 'host') hostOnlineRoom().catch((error) => setMessage(error.message, 'bad'));
    else showSetup();
    return;
  }

  startLocalMatch();
}

function applyOnlineMatch(match) {
  currentMatch = match;
  if (match?.id) onlineRoomId = match.id;
  setRoomCodePill(onlineAction === 'host', onlineRoomId);
  board = match.board || Array(9).fill('');
  turn = match.turn || 'X';
  onlineRole = match.role || 'observer';
  ended = match.status === 'finished';
  gameVariant = match.game_variant === 'vanish' ? 'vanish' : 'classic';
  moveCount = Number(match.move_count || board.filter(Boolean).length || 0);
  winningCells = match.winner && match.winner !== 'draw' ? getWinningCells(board) : [];

  if (match.queues) markQueues = cloneQueues(match.queues);

  if (playMode === 'online') syncOnlineSessionTimer(match);

  if (match.status === 'waiting') {
    setMessage(onlineRole === 'X' ? 'Room hosted. Share the room code.' : 'Waiting for the host.', 'neutral');
  } else if (match.status === 'finished') {
    setMessage(match.winner === 'draw' ? 'Online match ended in a draw.' : `${match.winner} wins the online match.`, match.winner === 'draw' ? 'neutral' : 'good');
  } else if (onlineRole === 'observer') {
    setMessage(`You are watching. ${match.turn}'s turn.`, 'neutral');
  } else {
    setMessage(match.turn === onlineRole ? 'Your turn. Make it count.' : `Waiting for ${match.turn}.`, 'neutral');
  }

  renderBoard();
  saveActiveMatch();

  if (match.status === 'finished') stopSessionTimer();
  else if (playMode === 'online') startSessionTimer();

  if (match.status === 'finished' && match.winner) {
    showResultModal(match.winner, `online:${match.id}:${match.finished_at || match.updated_at || match.winner}`);
  }
}

async function pollOnlineRoom() {
  if (!onlineRoomId || playMode !== 'online') return;

  const queryString = new URLSearchParams(identityPayload()).toString();
  const response = await fetch(`/api/games/tictactoe/rooms/${encodeURIComponent(onlineRoomId)}?${queryString}`, {
    headers: tokenTtt ? { authorization: `Bearer ${tokenTtt}` } : {},
  });

  if (!response.ok) return;
  const data = await response.json();
  applyOnlineMatch(data.match);
}

function startPolling() {
  stopPolling();
  onlinePoll = setInterval(pollOnlineRoom, 1200);
}

function stopPolling() {
  if (onlinePoll) clearInterval(onlinePoll);
  onlinePoll = null;
}

async function playOnlineMove(index) {
  if (!onlineRoomId || onlineRole === 'observer' || currentMatch?.status !== 'active') return;

  const response = await fetch(`/api/games/tictactoe/rooms/${encodeURIComponent(onlineRoomId)}/move`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(identityPayload({ cell: index })),
  });

  const data = await response.json();
  if (!response.ok) {
    setMessage(data.error || 'Move failed.', 'bad');
    if (data.match) applyOnlineMatch(data.match);
    return;
  }

  applyOnlineMatch(data.match);
}

function bindEvents() {
  modeBotBtn.addEventListener('click', () => chooseOpponent('bot'));
  modeLocalBtn.addEventListener('click', () => chooseOpponent('local'));
  modeOnlineBtn.addEventListener('click', () => chooseOpponent('online'));

  onlineHostBtn.addEventListener('click', () => chooseOnlineAction('host'));
  onlineJoinBtn.addEventListener('click', () => chooseOnlineAction('join'));

  variantClassicBtn.addEventListener('click', () => chooseVariant('classic'));
  variantVanishBtn.addEventListener('click', () => chooseVariant('vanish'));

  difficultyEasyBtn.addEventListener('click', () => chooseDifficulty('easy'));
  difficultyMediumBtn.addEventListener('click', () => chooseDifficulty('medium'));
  difficultyHardBtn.addEventListener('click', () => chooseDifficulty('hard'));

  roomCodeInput.addEventListener('input', syncSetupUi);
  displayNameInput.addEventListener('input', () => {
    localStorage.setItem('dark_ttt_display_name', displayNameInput.value.trim() || 'Player');
  });

  startBtn.addEventListener('click', () => startMatch());
  changeSetupBtn.addEventListener('click', showSetup);
  replayQuickBtn?.addEventListener('click', replayMatch);
  helpOpenBtn.addEventListener('click', openHelp);
  resultReplayBtn.addEventListener('click', replayMatch);
  resultCancelBtn.addEventListener('click', hideResultModal);

  document.querySelectorAll('[data-close-help]').forEach((el) => el.addEventListener('click', closeHelp));
  document.querySelectorAll('[data-close-result]').forEach((el) => el.addEventListener('click', hideResultModal));

  copyRoomCodeBtn?.addEventListener('click', async () => {
    const code = safeRoomCode(onlineRoomId).toUpperCase();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setMessage('Room code copied.', 'good');
    } catch {
      setMessage(`Room code: ${code}`, 'neutral');
    }
  });
}

async function initFromQuery() {
  displayNameInput.value = defaultDisplayName();

  if (onlineRoomId) {
    playMode = 'online';
    onlineAction = 'link';
    roomCodeInput.value = onlineRoomId;
    gameVariant = query.get('variant') === 'vanish' ? 'vanish' : 'classic';
    syncSetupUi();
    startMatch();
    return;
  }

  if (await restoreActiveMatch()) return;

  syncSetupUi();
}

initFallingSymbols();
bindEvents();
initFromQuery();
