// --------------------- Theme ---------------------
// Sudoku always stays in dark mode.
const body = document.body;
function applyTheme() {
  const preservedClasses = Array.from(body.classList).filter((className) => !["dark", "light"].includes(className));
  body.className = ["dark", ...preservedClasses].join(" ").trim();
  localStorage.removeItem("theme");
}
applyTheme();

// --------------------- Sudoku Auth Button ---------------------
// Keep Sudoku standalone, but render the same profile/avatar button used by the rest of the site.
const SESSION_KEY = "dg_session";
const TOKEN_KEY = "dg_token";
const PROFILE_KEY = "dg_profile";

function currentUser() { return localStorage.getItem(SESSION_KEY); }
function currentProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }
  catch(e) { return null; }
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"\']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function avatarUrlFromProfile(profile) {
  return profile?.avatar_url || profile?.avatar || profile?.photo || profile?.picture || profile?.discord?.avatar || profile?.google?.avatar || "";
}
function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
  updateTopbarAuth();
  try { updateProgressionUI(); } catch(e) {}
}

function renderSudokuAvatarButton(authBtn, profile, username) {
  const displayName = profile?.display_name || profile?.username || username || "User";
  const avatar = avatarUrlFromProfile(profile);
  const initial = String(displayName || username || "U").trim().slice(0, 1).toUpperCase() || "U";

  authBtn.classList.remove("btn-primary");
  authBtn.classList.add("btn-ghost", "auth-avatar-btn");
  authBtn.setAttribute("aria-label", `Open profile for ${displayName}`);
  authBtn.title = displayName;
  authBtn.onclick = () => (window.location.href = "/dashboard.html");
  authBtn.innerHTML = "";

  const name = document.createElement("span");
  name.className = "auth-avatar-name";
  name.textContent = displayName;

  if (avatar) {
    const img = document.createElement("img");
    img.className = "auth-avatar-img";
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.src = avatar;
    img.onerror = () => {
      const fallback = document.createElement("span");
      fallback.className = "auth-avatar-initial";
      fallback.textContent = initial;
      img.replaceWith(fallback);
    };
    authBtn.appendChild(img);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "auth-avatar-initial";
    fallback.textContent = initial;
    authBtn.appendChild(fallback);
  }
  authBtn.appendChild(name);
}

function updateTopbarAuth() {
  const authBtn = document.getElementById("authBtn");
  const u = currentUser();
  if (!authBtn) return;

  const label = authBtn.getAttribute("data-profile-label") || "Profile";
  if (u) {
    renderSudokuAvatarButton(authBtn, currentProfile(), u);
  } else {
    authBtn.classList.remove("btn-primary", "btn-ghost", "auth-avatar-btn");
    authBtn.removeAttribute("title");
    authBtn.setAttribute("aria-label", label);
    authBtn.textContent = label;
    authBtn.onclick = () => (window.location.href = "/login.html?next=" + encodeURIComponent(location.pathname || "/dashboard.html"));
  }
  try { updateProgressionUI(); } catch (e) {}
}
updateTopbarAuth();

const serverToken = localStorage.getItem(TOKEN_KEY);
if (serverToken) {
  (async () => {
    try {
      const res = await fetch("/api/me", { headers: { "Authorization": "Bearer " + serverToken }, cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        if (j?.username) localStorage.setItem(SESSION_KEY, String(j.username).trim().toLowerCase());
        localStorage.setItem(PROFILE_KEY, JSON.stringify(j));
        updateTopbarAuth();
      }
    } catch(e) {}
  })();
}

// --------------------- Falling background ---------------------
const sudokuFallingLayer = document.getElementById("sudokuFallingLayer") || document.querySelector(".sudoku-falling-layer");
function initSudokuFallingSymbols() {
  if (!sudokuFallingLayer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  sudokuFallingLayer.innerHTML = "";

  const symbols = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Σ", "9×9", "3×3", "◇", "✦"];
  const palette = [
    { color: "#a769ff", glow: "rgba(167, 105, 255, 0.70)" },
    { color: "#29a8ff", glow: "rgba(41, 168, 255, 0.70)" },
    { color: "#7dd3fc", glow: "rgba(125, 211, 252, 0.62)" },
    { color: "#f0abfc", glow: "rgba(240, 171, 252, 0.58)" },
    { color: "#35f29a", glow: "rgba(53, 242, 154, 0.50)" },
    { color: "#ffd166", glow: "rgba(255, 209, 102, 0.48)" }
  ];

  Array.from({ length: 104 }).forEach((_, index) => {
    const element = document.createElement("span");
    const accent = palette[index % palette.length];

    element.textContent = symbols[index % symbols.length];
    element.style.setProperty("--left", `${Math.random() * 100}%`);
    element.style.setProperty("--size", `${25 + Math.random() * 50}px`);
    element.style.setProperty("--duration", `${8 + Math.random() * 11}s`);
    element.style.setProperty("--delay", `${-Math.random() * 20}s`);
    element.style.setProperty("--drift", `${-110 + Math.random() * 220}px`);
    element.style.setProperty("--rotation", `${-35 + Math.random() * 70}deg`);
    element.style.setProperty("--opacity", `${0.25 + Math.random() * 0.28}`);
    element.style.setProperty("--color", accent.color);
    element.style.setProperty("--glow", accent.glow);
    sudokuFallingLayer.appendChild(element);
  });
}
initSudokuFallingSymbols();

// --------------------- Elements ---------------------
const setupScreen = document.getElementById("sudokuSetupScreen");
const gameShell = document.getElementById("sudokuGameShell");
const setupStatus = document.getElementById("sudokuSetupStatus");
const difficultyPanel = document.getElementById("sudokuDifficultyPanel");
const setupStartRow = document.getElementById("sudokuStartRow");
const startBtn = document.getElementById("sudokuStart");
const continueBtn = document.getElementById("sudokuContinue");
const setupHelpBtn = document.getElementById("sudokuSetupHelp");
const changeSetupBtn = document.getElementById("sudokuChangeSetup");
const sudokuReplayBtn = document.getElementById("sudokuReplayPuzzle");
const sudokuHelpModal = document.getElementById("sudokuHelpModal");

const gridEl = document.getElementById("sudokuGrid");
const timeText = document.getElementById("timeText");
const mistakesText = document.getElementById("mistakesText");
const hintsHudText = document.getElementById("hintsHudText");
const sudokuMsg = document.getElementById("sudokuMsg");

const pencilBtn = document.getElementById("pencilBtn");
const hintBtn = document.getElementById("hintBtn");
const hintBadge = document.getElementById("hintBadge");
const solveBtn = document.getElementById("solveBtn");
const clearBtn = document.getElementById("clearBtn");

const pauseBtn = document.getElementById("pauseBtn");
const pauseIcon = document.getElementById("pauseIcon");

const boardTitle = document.getElementById("sudokuBoardTitle");
const modeTag = document.getElementById("sudokuModeTag");
const difficultyTag = document.getElementById("sudokuDifficultyTag");
const ruleText = document.getElementById("sudokuRuleText");
const cageInfo = document.getElementById("sudokuCageInfo");
const cageCountText = document.getElementById("sudokuCageCount");

const progressWrap = document.getElementById("progressWrap");

// Toast
const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastText = document.getElementById("toastText");
const toastClose = document.getElementById("toastClose");

// Modal
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalSub = document.getElementById("modalSub");
const modalActions = document.getElementById("modalActions");
const modalClose = document.getElementById("modalClose");

// --------------------- Config ---------------------
const SAVE_KEY = "dg_sudoku_save_v4";

const CLOUD_CURRENT_SAVE_KEY = "sudoku_current_v4";
const CLOUD_PROGRESS_SAVE_KEY = "sudoku_progress_v1";
let sudokuCloudSaveTimer = null;
let sudokuCloudProgressTimer = null;

function sudokuAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

async function cloudFetchJson(url, options = {}) {
  const token = sudokuAuthToken();
  if (!token) return null;
  const headers = Object.assign({ "content-type": "application/json", authorization: "Bearer " + token }, options.headers || {});
  const res = await fetch(url, Object.assign({}, options, { headers, cache: "no-store" }));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Cloud save failed");
  return res.json();
}

async function saveCloudData(saveKey, data) {
  return cloudFetchJson("/api/games/save/" + encodeURIComponent(saveKey), {
    method: "PUT",
    body: JSON.stringify({ data })
  });
}

async function loadCloudData(saveKey) {
  const payload = await cloudFetchJson("/api/games/save/" + encodeURIComponent(saveKey), { method: "GET" });
  return payload?.data || null;
}

async function deleteCloudData(saveKey) {
  return cloudFetchJson("/api/games/save/" + encodeURIComponent(saveKey), { method: "DELETE" });
}

function debounceSudokuCloudSave(data) {
  if (!sudokuAuthToken()) return;
  clearTimeout(sudokuCloudSaveTimer);
  const snapshot = JSON.parse(JSON.stringify(data || {}));
  sudokuCloudSaveTimer = setTimeout(() => {
    saveCloudData(CLOUD_CURRENT_SAVE_KEY, snapshot).catch(() => {});
  }, 1200);
}

function collectSudokuProgressMap() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("dg_progress_")) out[key] = localStorage.getItem(key);
    }
  } catch (e) {}
  return out;
}

function debounceSudokuProgressCloudSave() {
  if (!sudokuAuthToken()) return;
  clearTimeout(sudokuCloudProgressTimer);
  sudokuCloudProgressTimer = setTimeout(() => {
    saveCloudData(CLOUD_PROGRESS_SAVE_KEY, { items: collectSudokuProgressMap(), updatedAt: Date.now() }).catch(() => {});
  }, 800);
}

async function hydrateSudokuCloudSaves() {
  if (!sudokuAuthToken()) return;
  try {
    const current = await loadCloudData(CLOUD_CURRENT_SAVE_KEY);
    if (current && current.board && current.solution && current.puzzle) {
      const localRaw = localStorage.getItem(SAVE_KEY);
      let localUpdated = 0;
      try { localUpdated = Number(JSON.parse(localRaw || '{}').updatedAt || 0); } catch (e) {}
      const cloudUpdated = Number(current.updatedAt || 0);
      if (!localRaw || cloudUpdated >= localUpdated) {
        localStorage.setItem(SAVE_KEY, JSON.stringify(current));
      }
    }
  } catch (e) {}
  try {
    const progress = await loadCloudData(CLOUD_PROGRESS_SAVE_KEY);
    if (progress?.items && typeof progress.items === "object") {
      Object.entries(progress.items).forEach(([key, value]) => {
        if (String(key).startsWith("dg_progress_")) localStorage.setItem(key, String(value));
      });
    }
  } catch (e) {}
}


const VARIANT_LABELS = {
  classic: "Classic Sudoku",
  killer: "Sum-Doku"
};
const VARIANT_SHORT = {
  classic: "Classic",
  killer: "Sum-Doku"
};
const DIFFICULTY_LABELS = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  extreme: "Extreme"
};

let selectedSetupVariant = null;
let selectedSetupDifficulty = null;
let gameVariant = "classic";
let difficulty = "medium";

const diffHoles = { easy: 38, medium: 48, hard: 56, extreme: 60 };
const killerGivens = { easy: 14, medium: 8, hard: 3, extreme: 0 };
const diffMistakes = { easy: 5, medium: 3, hard: 1, extreme: 0 };
const diffHints = { easy: 5, medium: 3, hard: 1, extreme: 0 };

// --------------------- State ---------------------
let selectedCell = null;
let selectedValue = 0;

let seconds = 0;
let mistakes = 0;
let hintsUsed = 0;
let timer = null;

let puzzle = null;
let solution = null;
let board = null;
let locked = null;
let notes = null;
let wrong = null;
let cages = [];
let cageLookup = null;

let pencilMode = false;
let gameLocked = false;
let paused = false;
let previewedSolution = false;
let hasStartedPuzzle = false;

const rowDonePrev = Array(9).fill(false);
const colDonePrev = Array(9).fill(false);
const boxDonePrev = Array(9).fill(false);
const padDonePrev = Array(10).fill(false);
let cageDonePrev = [];

// --------------------- Toast helpers ---------------------
let toastTimer = null;
function showToast(title, text, ms = 4200) {
  if (!toast) return;
  toastTitle.textContent = title;
  toastText.textContent = text;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), ms);
}
toastClose?.addEventListener("click", () => toast.classList.remove("show"));

// --------------------- Modal helpers ---------------------
function openModal({ title, sub, buttons = [], closeable = true }) {
  if (!modal) return;
  modal.hidden = false;
  modal.style.display = "flex";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.zIndex = "99990";
  document.body.classList.add("sudoku-modal-open");
  modalTitle.textContent = title;
  modalSub.textContent = sub || "";
  modalActions.innerHTML = "";

  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn ${b.variant === "primary" ? "btn-primary" : "btn-ghost"} full`;
    btn.textContent = b.text;
    btn.addEventListener("click", () => b.onClick?.());
    modalActions.appendChild(btn);
  });

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  modalClose.style.display = closeable ? "inline-flex" : "none";
}
function closeModal() {
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
  if (modal) {
    modal.style.display = "none";
    modal.style.removeProperty("position");
    modal.style.removeProperty("inset");
    modal.style.removeProperty("z-index");
  }
  if (!sudokuHelpModal || sudokuHelpModal.hidden) document.body.classList.remove("sudoku-modal-open");
}
modalClose?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

function openHowToPlay(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (sudokuHelpModal) {
    sudokuHelpModal.hidden = false;
    sudokuHelpModal.removeAttribute("hidden");
    sudokuHelpModal.setAttribute("aria-hidden", "false");
    sudokuHelpModal.style.display = "grid";
    sudokuHelpModal.style.position = "fixed";
    sudokuHelpModal.style.inset = "0";
    sudokuHelpModal.style.zIndex = "100000";
    document.body.classList.add("sudoku-modal-open");
    return;
  }

  openModal({
    title: "How Sudoku works",
    sub:
      "Classic Sudoku: fill every row, column and 3×3 box with 1–9.\n\n" +
      "Sum-Doku: the classic rules still apply. Cells inside each dashed cage must add up to the small target number in the top-left corner of that cage. Digits cannot repeat inside a cage.\n\n" +
      "Pencil mode adds small notes. Hint fills one safe cell. Preview results reveals the full solution.",
    buttons: [{ text: "Got it", variant: "primary", onClick: closeModal }]
  });
}
function closeHowToPlay(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (!sudokuHelpModal) return;
  sudokuHelpModal.hidden = true;
  sudokuHelpModal.setAttribute("hidden", "");
  sudokuHelpModal.setAttribute("aria-hidden", "true");
  sudokuHelpModal.style.display = "none";
  sudokuHelpModal.style.removeProperty("position");
  sudokuHelpModal.style.removeProperty("inset");
  sudokuHelpModal.style.removeProperty("z-index");
  if (!modal || !modal.classList.contains("open")) document.body.classList.remove("sudoku-modal-open");
}
window.openSudokuGuide = openHowToPlay;

// --------------------- Setup screen ---------------------
function showSetupScreen() {
  stopTimer();
  document.documentElement.classList.add("sudoku-setup-open");
  document.body.classList.add("sudoku-setup-open");
  document.body.classList.remove("sudoku-game-open");
  if (setupScreen) setupScreen.hidden = false;
  if (gameShell) gameShell.hidden = true;
  updateSetupUI();
  updateContinueButton();
}

function showGameScreen() {
  document.documentElement.classList.remove("sudoku-setup-open");
  document.body.classList.remove("sudoku-setup-open");
  document.body.classList.add("sudoku-game-open");
  if (setupScreen) setupScreen.hidden = true;
  if (gameShell) gameShell.hidden = false;
}

function updateSetupUI() {
  const hasMode = !!selectedSetupVariant;
  const hasDifficulty = !!selectedSetupDifficulty;

  document.querySelectorAll(".sudoku-choice-card[data-variant]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.variant === selectedSetupVariant);
  });
  document.querySelectorAll(".sudoku-pill[data-diff]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.diff === selectedSetupDifficulty);
  });

  if (difficultyPanel) difficultyPanel.hidden = !hasMode;
  if (setupStartRow) setupStartRow.hidden = !(hasMode && hasDifficulty);

  const mode = VARIANT_SHORT[selectedSetupVariant] || "Sudoku";
  const diff = DIFFICULTY_LABELS[selectedSetupDifficulty] || "";
  if (setupStatus) {
    if (!hasMode) {
      setupStatus.textContent = "Choose the Sudoku mode. The next step will appear after your selection.";
    } else if (!hasDifficulty) {
      setupStatus.textContent = `Now choose the difficulty for ${mode}.`;
    } else if (selectedSetupVariant === "killer") {
      setupStatus.textContent = `Ready: ${mode} · ${diff}. Start the Sum-Doku puzzle with dashed cages and target sums.`;
    } else {
      setupStatus.textContent = `Ready: ${mode} · ${diff}. Start the classic 9×9 Sudoku puzzle.`;
    }
  }
  if (startBtn) startBtn.textContent = "Start Match";
}

function updateContinueButton() {
  if (continueBtn) continueBtn.hidden = true;
}

function startConfiguredPuzzle() {
  if (!selectedSetupVariant || !selectedSetupDifficulty) {
    updateSetupUI();
    showToast("Setup", "Choose game mode and difficulty first.", 2200);
    return;
  }

  gameVariant = selectedSetupVariant;
  difficulty = selectedSetupDifficulty;
  showGameScreen();
  newSudoku(false, true);
}

function requestSetupFromGame(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  saveGame();
  showSetupScreen();
}
window.openSudokuSetup = requestSetupFromGame;

function initSetupHandlers() {
  document.querySelectorAll(".sudoku-choice-card[data-variant]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedSetupVariant = btn.dataset.variant || "classic";
      selectedSetupDifficulty = null;
      updateSetupUI();
    });
  });

  document.querySelectorAll(".sudoku-pill[data-diff]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedSetupDifficulty = btn.dataset.diff || "medium";
      updateSetupUI();
    });
  });

  startBtn?.addEventListener("click", startConfiguredPuzzle);
  continueBtn?.addEventListener("click", restoreSavedGame);
  setupHelpBtn?.addEventListener("click", openHowToPlay);
  document.querySelectorAll("[data-close-sudoku-help]").forEach((el) => el.addEventListener("click", closeHowToPlay));
  changeSetupBtn?.addEventListener("click", requestSetupFromGame);
  sudokuReplayBtn?.addEventListener("click", () => newSudoku(false, true));
}

// --------------------- Progression bar UI ---------------------
function getProgressKey(user, variant, diff) { return `dg_progress_${user}_${variant}_${diff}`; }
function readUserProgress(user, variant, diff) {
  try {
    const key = getProgressKey(user, variant, diff);
    let raw = localStorage.getItem(key);
    if (!raw && variant === "classic") raw = localStorage.getItem(`dg_progress_${user}_${diff}`);
    const val = raw ? Number(raw) : 0;
    return Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
  } catch(e) { return 0; }
}
function writeUserProgress(user, variant, diff, newProgress) {
  const key = getProgressKey(user, variant, diff);
  const val = Math.max(0, Math.min(100, Number(newProgress) || 0));
  localStorage.setItem(key, String(val));
  debounceSudokuProgressCloudSave();
  return val;
}
async function recordSudokuProgress(result = 'win') {
  try {
    const token = localStorage.getItem('dg_token');
    if (!token) return;
    const scoreByDiff = { easy: 60, medium: 100, hard: 155, extreme: 230 };
    const score = scoreByDiff[difficulty] || 100;
    const key = gameVariant === 'killer' ? 'sumdoku' : 'sudoku';
    await fetch('/api/games/progress/' + key, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ result, score, meta: { variant: gameVariant, difficulty, seconds, mistakes, hintsUsed } })
    });
  } catch (e) {}
}

function awardProgressOnWin() {
  const user = currentUser();
  if (!user) return;
  const gainByDiff = { easy: 12, medium: 20, hard: 28, extreme: 40 };
  const gain = gainByDiff[difficulty] ?? 20;
  const current = readUserProgress(user, gameVariant, difficulty);
  const next = writeUserProgress(user, gameVariant, difficulty, current + gain);
  updateProgressionUI();
  showToast("Progress", `+${gain}% (now ${next}%)`, 1600);
}
function updateProgressionUI() {
  if (!progressWrap) return;
  const user = currentUser();
  progressWrap.innerHTML = "";
  progressWrap.className = "progress-wrap prog-" + (difficulty || "medium");

  if (!user || gameShell?.hidden) {
    progressWrap.hidden = true;
    return;
  }

  progressWrap.hidden = false;
  const progress = readUserProgress(user, gameVariant, difficulty);
  const levels = 5;
  const filled = Math.floor((progress / 100) * levels);
  const bar = document.createElement("div");
  bar.className = "progression";

  for (let i = 0; i < levels; i++) {
    const lv = document.createElement("div");
    lv.className = "progress-level" + (i < filled ? " filled" : "");
    lv.title = `${Math.round(((i + 1) / levels) * 100)}%`;
    lv.addEventListener("click", () => {
      const status = i < filled ? "Completed" : i === filled ? "Current" : "Locked";
      showToast("Progress", `Level ${i + 1} — ${status}`, 1400);
    });
    bar.appendChild(lv);
  }

  const legend = document.createElement("div");
  legend.className = "progress-legend";
  legend.textContent = `${progress}%`;
  progressWrap.appendChild(bar);
  progressWrap.appendChild(legend);
}

// --------------------- Persistence ---------------------
function saveGame() {
  if (!board || !solution || !puzzle || !locked || !notes) return;
  const notesArr = notes.map((row) => row.map((set) => Array.from(set)));
  const data = {
    version: 4,
    variant: gameVariant,
    difficulty,
    seconds,
    mistakes,
    hintsUsed,
    pencilMode,
    paused,
    puzzle,
    solution,
    board,
    locked,
    notes: notesArr,
    wrong,
    cages,
    gameLocked,
    previewedSolution,
    updatedAt: Date.now()
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  debounceSudokuCloudSave(data);
  updateContinueButton();
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.board || !data?.solution || !data?.puzzle) return null;
    return data;
  } catch(e) {
    return null;
  }
}
function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
  clearTimeout(sudokuCloudSaveTimer);
  deleteCloudData(CLOUD_CURRENT_SAVE_KEY).catch(() => {});
  updateContinueButton();
}

// --------------------- Time / Pause ---------------------
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}
function syncTimerText() {
  if (timeText) timeText.textContent = formatTime(seconds);
}
function resetTimer() {
  stopTimer();
  seconds = 0;
  syncTimerText();
}
function startTimer(fromLoaded = false) {
  stopTimer();
  if (!fromLoaded) seconds = 0;
  syncTimerText();
  timer = setInterval(() => {
    if (paused || gameLocked || gameShell?.hidden) return;
    seconds++;
    syncTimerText();
    saveGame();
  }, 1000);
}
function setPaused(next, options = {}) {
  paused = !!next;
  if (!gridEl) return;

  if (paused) {
    gridEl.classList.add("locked", "paused");
    if (pauseIcon) pauseIcon.innerHTML = `<path d="M8 5v14l11-7z" fill="currentColor"/>`;
    if (!options.silent) showToast("Paused", "Game paused. Press ▶ to continue.", 2200);
  } else {
    gridEl.classList.remove("paused");
    if (!gameLocked) gridEl.classList.remove("locked");
    if (pauseIcon) pauseIcon.innerHTML = `<path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor"/>`;
  }
  updateHintUI();
  saveGame();
}
pauseBtn?.addEventListener("click", () => setPaused(!paused));

// --------------------- Audio / sounds ---------------------
function playSound() {}

// --------------------- UI updates ---------------------
function updateMatchUI() {
  const modeName = VARIANT_LABELS[gameVariant] || VARIANT_LABELS.classic;
  const shortMode = VARIANT_SHORT[gameVariant] || VARIANT_SHORT.classic;
  const diffName = DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS.medium;

  if (boardTitle) boardTitle.textContent = modeName;
  if (modeTag) modeTag.textContent = shortMode;
  if (difficultyTag) difficultyTag.textContent = diffName;
  if (ruleText) {
    ruleText.textContent = gameVariant === "killer"
      ? "Fill 1–9 in every row, column and box. Each dashed cage must match its target sum."
      : "Fill every row, column and 3×3 box with digits 1–9.";
  }
  if (cageInfo) cageInfo.hidden = gameVariant !== "killer";
  if (cageCountText) cageCountText.textContent = cages?.length ? `${cages.length}` : "—";
  gridEl?.classList.toggle("killer-mode", gameVariant === "killer");
  updateProgressionUI();
}
function setMistakes(n) {
  mistakes = n;
  const lim = diffMistakes[difficulty];
  if (mistakesText) mistakesText.textContent = `${mistakes}/${lim}`;
  if (mistakes > lim && !gameLocked) gameOver(`Too many mistakes (${mistakes}/${lim}).`);
}
function updateHintUI() {
  const limit = diffHints[difficulty];
  const remaining = Math.max(0, limit - hintsUsed);
  if (hintsHudText) hintsHudText.textContent = `${remaining}/${limit}`;
  if (hintBadge) hintBadge.textContent = remaining;
  if (hintBtn) {
    hintBtn.disabled = remaining <= 0 || gameLocked || paused;
    hintBtn.classList.toggle("disabled", remaining <= 0 || gameLocked || paused);
  }
}
function lockGame(state) {
  gameLocked = !!state;
  gridEl?.classList.toggle("locked", gameLocked || paused);
  updateHintUI();
  saveGame();
}
function togglePencil() {
  if (!hasStartedPuzzle) return;
  pencilMode = !pencilMode;
  if (pencilBtn) pencilBtn.innerHTML = pencilBtn.innerHTML.replace(/Pencil: (ON|OFF)/, `Pencil: ${pencilMode ? "ON" : "OFF"}`);
  gridEl?.classList.toggle("pencil-on", pencilMode);
  saveGame();
  showToast("Pencil", pencilMode
    ? "Pencil is ON — tap numbers to add small notes."
    : "Pencil is OFF — numbers you place are real moves.", 2400);
}
function removeAdaptivePencilNotes(r, c, n) {
  if (!notes || !board) return 0;
  const seen = new Set();
  let removed = 0;

  const prune = (rr, cc) => {
    if (rr === r && cc === c) return;
    const key = `${rr},${cc}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (board?.[rr]?.[cc] !== 0) return;
    const set = notes?.[rr]?.[cc];
    if (set?.has?.(n)) {
      set.delete(n);
      removed++;
    }
  };

  for (let i = 0; i < 9; i++) {
    prune(r, i);
    prune(i, c);
  }

  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) prune(rr, cc);
  }

  if (gameVariant === "killer") {
    const cage = getCage(r, c);
    cage?.cells?.forEach(([rr, cc]) => prune(rr, cc));
  }

  return removed;
}

// --------------------- Generator (backtracking) ---------------------
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function isSafe(grid, r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === n) return false;
    if (grid[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (grid[rr][cc] === n) return false;
    }
  }
  return true;
}
function fillGrid(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const nums = shuffle([1,2,3,4,5,6,7,8,9]);
        for (const n of nums) {
          if (isSafe(grid, r, c, n)) {
            grid[r][c] = n;
            if (fillGrid(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}
function makePuzzleFromSolution(sol, holes) {
  const p = sol.map((row) => [...row]);
  const coords = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) coords.push([r, c]);
  shuffle(coords);
  let removed = 0;
  for (const [r, c] of coords) {
    if (removed >= holes) break;
    p[r][c] = 0;
    removed++;
  }
  return p;
}
function initNotes() {
  notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
}
function initLocked() {
  locked = Array.from({ length: 9 }, () => Array(9).fill(false));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] !== 0) locked[r][c] = true;
    }
  }
}
function initWrong() {
  wrong = Array.from({ length: 9 }, () => Array(9).fill(false));
}
function resetCompletionTrackers() {
  rowDonePrev.fill(false);
  colDonePrev.fill(false);
  boxDonePrev.fill(false);
  padDonePrev.fill(false);
  cageDonePrev = Array(cages?.length || 0).fill(false);
}

// --------------------- Sum-Doku cage generation ---------------------
function keyOf(r, c) { return `${r},${c}`; }
function parseKey(key) { return key.split(",").map(Number); }
function cellNeighbors([r, c]) {
  return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([rr, cc]) => rr >= 0 && rr < 9 && cc >= 0 && cc < 9);
}
function randomCageTargetSize(diff) {
  const pools = {
    easy: [1, 1, 2, 2, 2, 3],
    medium: [1, 2, 2, 3, 3, 4],
    hard: [2, 2, 3, 3, 4, 5],
    extreme: [2, 3, 3, 4, 4, 5]
  };
  const pool = pools[diff] || pools.medium;
  return pool[Math.floor(Math.random() * pool.length)];
}
function generateKillerCages(sol, diff) {
  const remaining = new Set();
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) remaining.add(keyOf(r, c));

  const generated = [];
  while (remaining.size) {
    const keys = Array.from(remaining);
    const start = parseKey(keys[Math.floor(Math.random() * keys.length)]);
    const cells = [start];
    const usedDigits = new Set([sol[start[0]][start[1]]]);
    remaining.delete(keyOf(start[0], start[1]));

    const targetSize = Math.min(randomCageTargetSize(diff), remaining.size + 1);
    while (cells.length < targetSize) {
      const options = [];
      for (const cell of cells) {
        for (const [nr, nc] of cellNeighbors(cell)) {
          const k = keyOf(nr, nc);
          if (!remaining.has(k)) continue;
          const digit = sol[nr][nc];
          if (usedDigits.has(digit)) continue;
          if (!options.some(([or, oc]) => or === nr && oc === nc)) options.push([nr, nc]);
        }
      }
      if (!options.length) break;
      const pick = options[Math.floor(Math.random() * options.length)];
      cells.push(pick);
      usedDigits.add(sol[pick[0]][pick[1]]);
      remaining.delete(keyOf(pick[0], pick[1]));
    }

    generated.push({
      id: generated.length,
      sum: cells.reduce((total, [r, c]) => total + sol[r][c], 0),
      cells
    });
  }
  return generated;
}
function buildCageLookup() {
  cageLookup = Array.from({ length: 9 }, () => Array(9).fill(null));
  (cages || []).forEach((cage, idx) => {
    cage.id = idx;
    cage.cells.forEach(([r, c]) => { cageLookup[r][c] = idx; });
  });
}
function getCage(r, c) {
  if (!cageLookup) buildCageLookup();
  const idx = cageLookup?.[r]?.[c];
  return Number.isInteger(idx) ? cages[idx] : null;
}
function sameCage(r1, c1, r2, c2) {
  if (r2 < 0 || r2 >= 9 || c2 < 0 || c2 >= 9) return false;
  return cageLookup?.[r1]?.[c1] === cageLookup?.[r2]?.[c2];
}
function isCageAnchor(cage, r, c) {
  if (!cage?.cells?.length) return false;
  const first = [...cage.cells].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))[0];
  return first[0] === r && first[1] === c;
}
function cageSumNow(cage, override = null) {
  let sum = 0;
  let filled = 0;
  const seen = new Set();
  let duplicate = false;

  for (const [r, c] of cage.cells) {
    const value = override && override.r === r && override.c === c ? override.value : board[r][c];
    if (value) {
      sum += value;
      filled++;
      if (seen.has(value)) duplicate = true;
      seen.add(value);
    }
  }
  return { sum, filled, size: cage.cells.length, duplicate };
}
function isCageComplete(cage) {
  if (!cage) return false;
  return cage.cells.every(([r, c]) => board[r][c] === solution[r][c]);
}

// --------------------- Grid rendering ---------------------
function getCell(r, c) {
  return document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}
function clearHighlights() {
  document.querySelectorAll(".cell.hl, .cell.same, .cell.cage-focus").forEach((el) => {
    el.classList.remove("hl", "same", "cage-focus");
  });
}
function applyHighlights() {
  clearHighlights();
  if (!selectedCell || !board) return;

  const r = Number(selectedCell.dataset.r);
  const c = Number(selectedCell.dataset.c);

  for (let i = 0; i < 9; i++) {
    getCell(r, i)?.classList.add("hl");
    getCell(i, c)?.classList.add("hl");
  }

  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) getCell(rr, cc)?.classList.add("hl");
  }

  if (gameVariant === "killer") {
    const cage = getCage(r, c);
    cage?.cells?.forEach(([rr, cc]) => getCell(rr, cc)?.classList.add("cage-focus"));
  }

  if (selectedValue >= 1 && selectedValue <= 9) {
    for (let rr = 0; rr < 9; rr++) {
      for (let cc = 0; cc < 9; cc++) {
        if (board[rr][cc] === selectedValue) getCell(rr, cc)?.classList.add("same");
      }
    }
  }
}
function selectCell(cell) {
  if (!cell || !board) return;
  document.querySelectorAll(".cell.selected").forEach((el) => el.classList.remove("selected"));
  cell.classList.add("selected");
  selectedCell = cell;

  const r = Number(cell.dataset.r);
  const c = Number(cell.dataset.c);
  selectedValue = board[r][c] || 0;
  applyHighlights();
}
function recalcWrongFromBoard() {
  if (!board || !solution) return;
  if (!wrong) initWrong();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      wrong[r][c] = (v !== 0) && !locked?.[r]?.[c] && (v !== solution[r][c]);
    }
  }
}
function countPlaced() {
  const counts = Array(10).fill(0);
  if (!board || !solution) return counts;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (v >= 1 && v <= 9 && solution[r][c] === v) counts[v]++;
    }
  }
  return counts;
}
function updateNumpadTicks() {
  const counts = countPlaced();
  document.querySelectorAll(".pad[data-n]").forEach((btn) => {
    const n = Number(btn.dataset.n);
    const doneNow = counts[n] >= 9;
    if (doneNow && !padDonePrev[n]) {
      btn.classList.add("layer-complete");
      setTimeout(() => btn.classList.remove("layer-complete"), 700);
    }
    btn.classList.toggle("done", doneNow);
    padDonePrev[n] = doneNow;
  });
}
function appendCellValue(cell, value) {
  const valueEl = document.createElement("span");
  valueEl.className = "cell-value";
  valueEl.textContent = String(value);
  cell.appendChild(valueEl);
}
function appendNotes(cell, set) {
  if (!set?.size) return;
  const note = document.createElement("div");
  note.className = "notes";
  for (let n = 1; n <= 9; n++) {
    const s = document.createElement("span");
    s.textContent = set.has(n) ? String(n) : "";
    note.appendChild(s);
  }
  cell.appendChild(note);
}
function renderSudoku() {
  if (!gridEl || !board) return;
  gridEl.innerHTML = "";
  selectedCell = null;
  selectedValue = 0;
  gridEl.classList.toggle("killer-mode", gameVariant === "killer");

  if (gameVariant === "killer") buildCageLookup();
  if (!wrong) initWrong();
  recalcWrongFromBoard();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;

      if (c === 2 || c === 5) cell.classList.add("thick-r");
      if (r === 2 || r === 5) cell.classList.add("thick-b");

      if (gameVariant === "killer") {
        const cage = getCage(r, c);
        if (cage) {
          cell.classList.add("killer-cell");
          cell.dataset.cage = String(cage.id);
          if (!sameCage(r, c, r - 1, c)) cell.classList.add("cage-top");
          if (!sameCage(r, c, r + 1, c)) cell.classList.add("cage-bottom");
          if (!sameCage(r, c, r, c - 1)) cell.classList.add("cage-left");
          if (!sameCage(r, c, r, c + 1)) cell.classList.add("cage-right");
          if (isCageAnchor(cage, r, c)) {
            const sum = document.createElement("span");
            sum.className = "cage-sum";
            sum.textContent = String(cage.sum);
            cell.appendChild(sum);
          }
        }
      }

      const val = board[r][c];
      if (locked[r][c]) cell.classList.add("given");
      if (wrong?.[r]?.[c]) cell.classList.add("bad");

      if (val !== 0) appendCellValue(cell, val);
      else appendNotes(cell, notes[r][c]);

      cell.addEventListener("click", () => selectCell(cell));
      gridEl.appendChild(cell);
    }
  }

  updateNumpadTicks();
  checkAllSegments();
  updateMatchUI();
}

// --------------------- Completion animations ---------------------
function placeAnimation(r, c) {
  const cell = getCell(r, c);
  if (!cell) return;
  cell.classList.remove("placed");
  void cell.offsetWidth;
  cell.classList.add("placed");
  setTimeout(() => cell.classList.remove("placed"), 520);
}
function animateCells(cells, cls, ms = 760) {
  cells.forEach((cell) => cell?.classList.add(cls));
  setTimeout(() => cells.forEach((cell) => cell?.classList.remove(cls)), ms);
}
function isRowComplete(r) {
  for (let c = 0; c < 9; c++) if (board[r][c] !== solution[r][c]) return false;
  return true;
}
function isColComplete(c) {
  for (let r = 0; r < 9; r++) if (board[r][c] !== solution[r][c]) return false;
  return true;
}
function isBoxComplete(br, bc) {
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) if (board[r][c] !== solution[r][c]) return false;
  }
  return true;
}
function triggerSegmentAnimation(kind, idx) {
  const cells = [];
  if (kind === "row") for (let c = 0; c < 9; c++) cells.push(getCell(idx, c));
  if (kind === "col") for (let r = 0; r < 9; r++) cells.push(getCell(r, idx));
  if (kind === "box") {
    const br = Math.floor(idx / 3) * 3;
    const bc = (idx % 3) * 3;
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) cells.push(getCell(r, c));
  }
  const cls = kind === "box" ? "segment-complete-box" : "segment-complete-row";
  animateCells(cells, cls, 900);
  playSound("place");
}
function checkAllSegments() {
  if (!board || !solution) return;
  for (let r = 0; r < 9; r++) {
    const complete = isRowComplete(r);
    if (complete && !rowDonePrev[r]) triggerSegmentAnimation("row", r);
    rowDonePrev[r] = !!complete;
  }
  for (let c = 0; c < 9; c++) {
    const complete = isColComplete(c);
    if (complete && !colDonePrev[c]) triggerSegmentAnimation("col", c);
    colDonePrev[c] = !!complete;
  }
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const complete = isBoxComplete(br, bc);
    if (complete && !boxDonePrev[b]) triggerSegmentAnimation("box", b);
    boxDonePrev[b] = !!complete;
  }
  if (gameVariant === "killer") {
    (cages || []).forEach((cage, idx) => {
      const complete = isCageComplete(cage);
      if (complete && !cageDonePrev[idx]) {
        animateCells(cage.cells.map(([r, c]) => getCell(r, c)), "cage-complete", 900);
      }
      cageDonePrev[idx] = !!complete;
    });
  }
}
function checkCompletions(r, c) {
  if (!board || !solution) return;

  const rowNow = isRowComplete(r);
  if (rowNow && !rowDonePrev[r]) animateCells(Array.from({ length: 9 }, (_, i) => getCell(r, i)), "complete-line");
  rowDonePrev[r] = rowNow;

  const colNow = isColComplete(c);
  if (colNow && !colDonePrev[c]) animateCells(Array.from({ length: 9 }, (_, i) => getCell(i, c)), "complete-line");
  colDonePrev[c] = colNow;

  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  const boxIndex = (br / 3) * 3 + (bc / 3);
  const boxNow = isBoxComplete(br, bc);
  if (boxNow && !boxDonePrev[boxIndex]) {
    const cells = [];
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) cells.push(getCell(rr, cc));
    animateCells(cells, "complete-square");
  }
  boxDonePrev[boxIndex] = boxNow;

  if (gameVariant === "killer") {
    const cage = getCage(r, c);
    if (cage) {
      const complete = isCageComplete(cage);
      if (complete && !cageDonePrev[cage.id]) animateCells(cage.cells.map(([rr, cc]) => getCell(rr, cc)), "cage-complete", 900);
      cageDonePrev[cage.id] = !!complete;
    }
  }
}

// --------------------- Moves ---------------------
function getWrongMessage(r, c, n) {
  if (gameVariant !== "killer") return "That doesn't fit here.";

  const cage = getCage(r, c);
  if (!cage) return "That doesn't fit here.";
  const status = cageSumNow(cage, { r, c, value: n });
  if (status.duplicate) return "Digits cannot repeat inside the same Sum-Doku cage.";
  if (status.sum > cage.sum) return `This cage would go over ${cage.sum}.`;
  if (status.filled === status.size && status.sum !== cage.sum) return `This cage must total ${cage.sum}.`;
  return `That does not fit this ${cage.sum}-sum cage.`;
}
function pad(n) {
  if (!selectedCell || gameLocked || paused || gameShell?.hidden) return;

  const r = Number(selectedCell.dataset.r);
  const c = Number(selectedCell.dataset.c);
  if (locked[r][c]) return;

  if (pencilMode) {
    if (board[r][c] !== 0) return;
    if (notes[r][c].has(n)) notes[r][c].delete(n);
    else notes[r][c].add(n);
    renderSudoku();
    selectCell(getCell(r, c));
    saveGame();
    return;
  }

  board[r][c] = n;
  notes[r][c].clear();
  const ok = solution[r][c] === n;
  if (!wrong) initWrong();

  if (!ok) {
    wrong[r][c] = true;
    if (sudokuMsg) sudokuMsg.textContent = getWrongMessage(r, c, n);
    playSound("wrong");
    setMistakes(mistakes + 1);
    renderSudoku();
    selectCell(getCell(r, c));
    saveGame();
    return;
  }

  wrong[r][c] = false;
  locked[r][c] = true;
  removeAdaptivePencilNotes(r, c, n);
  if (sudokuMsg) sudokuMsg.textContent = "";
  renderSudoku();
  selectCell(getCell(r, c));
  placeAnimation(r, c);
  checkCompletions(r, c);
  saveGame();

  if (isSolved()) onSolved();
}
function padClear() {
  if (!selectedCell || gameLocked || paused || gameShell?.hidden) return;
  const r = Number(selectedCell.dataset.r);
  const c = Number(selectedCell.dataset.c);
  if (locked[r][c]) return;

  board[r][c] = 0;
  if (!wrong) initWrong();
  wrong[r][c] = false;

  renderSudoku();
  selectCell(getCell(r, c));
  if (sudokuMsg) sudokuMsg.textContent = "";
  saveGame();
}

// --------------------- Hint ---------------------
function candidateFitsStandard(r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === n) return false;
    if (board[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) if (board[rr][cc] === n) return false;
  }
  return true;
}
function candidateFitsCage(r, c, n) {
  if (gameVariant !== "killer") return true;
  const cage = getCage(r, c);
  if (!cage) return true;
  const status = cageSumNow(cage, { r, c, value: n });
  if (status.duplicate) return false;
  if (status.sum > cage.sum) return false;
  if (status.filled === status.size && status.sum !== cage.sum) return false;
  return true;
}
function candidatesFor(r, c) {
  if (board[r][c] !== 0) return [];
  const cand = [];
  for (let n = 1; n <= 9; n++) {
    if (candidateFitsStandard(r, c, n) && candidateFitsCage(r, c, n)) cand.push(n);
  }
  return cand;
}
function hintText(r, c, value, cand) {
  if (gameVariant === "killer") {
    const cage = getCage(r, c);
    const target = cage?.sum ? ` The cage target is ${cage.sum}.` : "";
    if (cand.length === 1) return `Row ${r + 1}, Col ${c + 1} must be ${value}.${target}\nOnly one number fits there.`;
    return `Placed ${value} at Row ${r + 1}, Col ${c + 1}.${target}\nOptions were: ${cand.join(", ")}.`;
  }
  if (cand.length === 1) return `Row ${r + 1}, Col ${c + 1} must be ${value}.\nOnly one number fits there.`;
  return `Placed ${value} at Row ${r + 1}, Col ${c + 1}.\nOptions were: ${cand.join(", ")}.`;
}
function hintSudoku() {
  if (gameLocked || paused || gameShell?.hidden) return;

  const limit = diffHints[difficulty];
  if (hintsUsed >= limit) {
    showToast("Hints", "No hints left for this difficulty.", 2600);
    return;
  }

  const singles = [];
  const empties = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (locked[r][c]) continue;
      if (board[r][c] !== 0) continue;
      const cand = candidatesFor(r, c);
      empties.push([r, c, cand]);
      if (cand.length === 1) singles.push([r, c, cand]);
    }
  }
  if (!empties.length) {
    showToast("Hint", "No moves left to hint.", 2500);
    return;
  }

  const pick = singles.length ? singles[Math.floor(Math.random() * singles.length)] : empties[Math.floor(Math.random() * empties.length)];
  const [r, c, cand] = pick;
  const value = solution[r][c];

  board[r][c] = value;
  notes[r][c].clear();
  locked[r][c] = true;
  if (!wrong) initWrong();
  wrong[r][c] = false;
  removeAdaptivePencilNotes(r, c, value);

  hintsUsed++;
  updateHintUI();
  renderSudoku();

  const cell = getCell(r, c);
  if (cell) {
    cell.classList.add("flash");
    setTimeout(() => cell.classList.remove("flash"), 450);
    selectCell(cell);
    placeAnimation(r, c);
  }
  checkCompletions(r, c);
  showToast("Hint", hintText(r, c, value, cand));
  saveGame();
  playSound("hint");

  if (isSolved()) onSolved();
}

// --------------------- End states ---------------------
function setSolveButtonMode(mode = "solve") {
  if (!solveBtn) return;
  const isNew = mode === "new";
  const iconMarkup = isNew
    ? `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M20 4v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    : `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3v18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 4h12l-2 4 2 4H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`;

  solveBtn.dataset.mode = isNew ? "new" : "solve";
  solveBtn.setAttribute("aria-label", isNew ? "New game" : "Preview results");
  solveBtn.title = isNew ? "Start a new puzzle" : "Preview results";
  solveBtn.classList.toggle("is-new-action", isNew);
  solveBtn.innerHTML = `${iconMarkup}<span>${isNew ? "New" : "Preview results"}</span>`;
}
function isSolved() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) if (board[r][c] !== solution[r][c]) return false;
  }
  return true;
}
function onSolved() {
  stopTimer();
  gameLocked = true;
  previewedSolution = false;
  gridEl?.classList.add("locked", "solved");
  updateHintUI();
  setSolveButtonMode("new");
  setTimeout(() => gridEl?.classList.remove("solved"), 650);
  awardProgressOnWin();
  recordSudokuProgress('win');

  openModal({
    title: "Good job ✅",
    sub: `${VARIANT_SHORT[gameVariant]} solved in ${formatTime(seconds)} · Mistakes: ${mistakes}/${diffMistakes[difficulty]}`,
    buttons: [
      { text: "View board", variant: "ghost", onClick: closeModal },
      { text: "New", variant: "primary", onClick: () => { closeModal(); newSudoku(false, true); } }
    ]
  });
  saveGame();
}
function gameOver(reason) {
  stopTimer();
  gameLocked = true;
  gridEl?.classList.add("locked");
  updateHintUI();
  setSolveButtonMode("solve");
  const showGameOverModal = () => openModal({
    title: "Game over",
    sub: `${reason}
You can preview the solved board, then start a new puzzle.`,
    buttons: [
      { text: "View board", variant: "ghost", onClick: closeModal },
      { text: "Preview results", variant: "primary", onClick: () => { closeModal(); previewSolution(); } }
    ]
  });
  showGameOverModal();
  // Failsafe: some older cached styles had hidden the overlay behind the Sudoku board.
  setTimeout(() => {
    if (modal && !modal.classList.contains("open")) showGameOverModal();
  }, 30);
  saveGame();
}
function previewSolution() {
  if (!solution) return;
  stopTimer();
  previewedSolution = true;
  gameLocked = true;
  setSolveButtonMode("new");

  board = solution.map((row) => [...row]);
  locked = Array.from({ length: 9 }, () => Array(9).fill(true));
  initNotes();
  initWrong();
  renderSudoku();

  gridEl?.classList.add("locked");
  updateHintUI();
  if (sudokuMsg) sudokuMsg.textContent = "Preview results: solution revealed.";
  showToast("Preview results", "Solution preview is shown. Use New to start over.", 3000);
  saveGame();
}
function handleSolveButton() {
  if (solveBtn?.dataset.mode === "new") {
    newSudoku(false, true);
    return;
  }
  previewSolution();
}

// --------------------- New game + restore ---------------------
function newSudoku(confirmReset = false, forceNoConfirm = false) {
  if (!gridEl) return;

  const doStart = () => {
    closeModal();
    showGameScreen();
    clearSavedGame();
    resetTimer();

    selectedCell = null;
    selectedValue = 0;
    gameLocked = false;
    paused = false;
    hintsUsed = 0;
    mistakes = 0;
    previewedSolution = false;
    pencilMode = false;
    hasStartedPuzzle = true;

    gridEl.classList.remove("locked", "paused", "solved", "pencil-on");
    if (pauseIcon) pauseIcon.innerHTML = `<path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor"/>`;
    if (pencilBtn) pencilBtn.innerHTML = pencilBtn.innerHTML.replace(/Pencil: (ON|OFF)/, "Pencil: OFF");
    setSolveButtonMode("solve");
    if (sudokuMsg) sudokuMsg.textContent = "";

    const empty = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillGrid(empty);
    solution = empty;

    if (gameVariant === "killer") {
      cages = generateKillerCages(solution, difficulty);
      buildCageLookup();
      const givens = killerGivens[difficulty] ?? killerGivens.medium;
      puzzle = makePuzzleFromSolution(solution, 81 - givens);
    } else {
      cages = [];
      cageLookup = null;
      puzzle = makePuzzleFromSolution(solution, diffHoles[difficulty] ?? diffHoles.medium);
    }

    board = puzzle.map((row) => [...row]);
    initNotes();
    initLocked();
    initWrong();
    resetCompletionTrackers();
    updateMatchUI();
    renderSudoku();
    setMistakes(0);
    updateHintUI();
    startTimer(false);
    saveGame();
    showToast("New puzzle", `${VARIANT_SHORT[gameVariant]} · ${DIFFICULTY_LABELS[difficulty]}`, 2200);
  };

  if (confirmReset && !forceNoConfirm) {
    openModal({
      title: "Start new puzzle?",
      sub: "This will reset your current progress.",
      buttons: [
        { text: "Cancel", variant: "ghost", onClick: closeModal },
        { text: "Start new", variant: "primary", onClick: doStart }
      ]
    });
    return;
  }
  doStart();
}
function restoreSavedGame() {
  const saved = loadGame();
  if (!saved) {
    showToast("Saved game", "No saved Sudoku puzzle was found.", 2200);
    updateContinueButton();
    return;
  }

  gameVariant = saved.variant || "classic";
  difficulty = saved.difficulty || "medium";
  selectedSetupVariant = gameVariant;
  selectedSetupDifficulty = difficulty;
  seconds = saved.seconds || 0;
  mistakes = saved.mistakes || 0;
  hintsUsed = saved.hintsUsed || 0;
  pencilMode = !!saved.pencilMode;
  paused = !!saved.paused;
  previewedSolution = !!saved.previewedSolution;
  gameLocked = !!saved.gameLocked;

  puzzle = saved.puzzle;
  solution = saved.solution;
  board = saved.board;
  locked = saved.locked;
  wrong = saved.wrong || null;
  cages = Array.isArray(saved.cages) ? saved.cages : [];
  buildCageLookup();

  notes = (saved.notes || []).map((row) => row.map((arr) => new Set(arr || [])));
  if (!notes.length) initNotes();
  if (!wrong) initWrong();
  hasStartedPuzzle = true;

  showGameScreen();
  updateMatchUI();
  gridEl?.classList.toggle("pencil-on", pencilMode);
  if (pencilBtn) pencilBtn.innerHTML = pencilBtn.innerHTML.replace(/Pencil: (ON|OFF)/, `Pencil: ${pencilMode ? "ON" : "OFF"}`);
  resetCompletionTrackers();
  syncTimerText();
  renderSudoku();
  setMistakes(mistakes);
  updateHintUI();
  setSolveButtonMode(gameLocked || previewedSolution ? "new" : "solve");
  lockGame(gameLocked);
  setPaused(paused, { silent: true });
  if (!gameLocked && !paused) startTimer(true);
  else stopTimer();
}

// --------------------- Wire buttons ---------------------
initSetupHandlers();

// Extra capture-phase binding for the setup help button. This makes the ? guide
// work even if a future layout element stops normal bubbling.
["click", "pointerup"].forEach((evtName) => {
  document.addEventListener(evtName, (event) => {
    const trigger = event.target.closest?.("#sudokuSetupHelp, [data-open-sudoku-help]");
    if (!trigger) return;
    openHowToPlay(event);
  }, true);
});

pencilBtn?.addEventListener("click", togglePencil);
hintBtn?.addEventListener("click", hintSudoku);
solveBtn?.addEventListener("click", handleSolveButton);
clearBtn?.addEventListener("click", padClear);

document.querySelectorAll(".pad[data-n]").forEach((btn) => {
  btn.addEventListener("click", () => pad(Number(btn.dataset.n)));
});

document.addEventListener("click", (e) => {
  const helpTrigger = e.target.closest?.("#sudokuSetupHelp, [data-open-sudoku-help]");
  if (helpTrigger) {
    openHowToPlay(e);
    return;
  }

  const replayTrigger = e.target.closest?.("#sudokuReplayPuzzle, [data-sudoku-replay]");
  if (replayTrigger) {
    e.preventDefault?.();
    newSudoku(false, true);
    return;
  }

  const setupTrigger = e.target.closest?.("#sudokuChangeSetup, [data-open-sudoku-setup]");
  if (setupTrigger) {
    requestSetupFromGame(e);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sudokuHelpModal && !sudokuHelpModal.hidden) {
    closeHowToPlay();
    return;
  }
  if (!selectedCell || gameLocked || paused || gameShell?.hidden) return;
  const r = Number(selectedCell.dataset.r);
  const c = Number(selectedCell.dataset.c);
  if (locked?.[r]?.[c]) return;
  if (e.key >= "1" && e.key <= "9") pad(Number(e.key));
  if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") padClear();
});
window.addEventListener("beforeunload", saveGame);

// --------------------- Boot ---------------------
async function bootSudoku() {
  updateSetupUI();
  await hydrateSudokuCloudSaves();
  if (loadGame()) {
    restoreSavedGame();
  } else {
    showSetupScreen();
  }
}
bootSudoku();

