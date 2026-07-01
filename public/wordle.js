(function () {
  const FIVE_ANSWERS = [
    'apple','arena','angel','baker','beach','beast','black','bloom','brave','brick','bring','brown','cable','candy','charm','chase','chess','cloud','crane','crown','dance','dream','earth','elite','flame','forge','ghost','glass','glory','grace','grape','green','heart','honey','house','laser','level','light','logic','loyal','magic','money','night','north','ocean','orbit','paint','party','pearl','phase','piano','pixel','plant','power','pride','prism','quest','radar','river','robot','round','royal','rules','sharp','skill','slate','solid','sound','south','space','spark','spike','stone','storm','sword','tiger','tower','trace','train','trust','valid','vivid','water','white','world','youth','zebra'
  ];
  const SIX_ANSWERS = [
    'access','active','answer','arcade','avatar','backup','battle','beacon','bridge','bright','broken','browser','button','castle','chance','charge','cipher','circle','clever','cloudy','cosmic','custom','danger','design','dragon','expert','folder','forest','friend','frozen','future','galaxy','global','guilds','hidden','hunter','invite','kernel','launch','layout','leader','legend','letter','little','magnet','master','matrix','member','memory','mobile','module','native','nebula','normal','online','option','origin','oxygen','planet','polish','portal','profile','purple','puzzle','random','result','rocket','screen','search','season','secret','secure','server','shadow','signal','silver','simple','smooth','spirit','status','stormy','stream','submit','switch','ticket','throne','typing','update','vector','verify','violet','wander','weekly','winner','wizard','wonder','yellow'
  ];
  const EXTRA_FIVE_GUESSES = [
    'about','above','abuse','actor','acute','admit','adopt','adult','after','again','agent','agree','ahead','alarm','album','alert','alien','alike','alive','allow','alone','along','alter','among','anger','angle','angry','apart','apply','argue','arise','array','aside','asset','audio','audit','avoid','award','aware','basic','basis','began','begin','being','below','bench','birth','block','blood','board','brain','brand','bread','break','brief','build','buyer','carry','catch','cause','chain','chair','chart','chief','child','civil','claim','class','clean','clear','climb','clock','coach','coast','color','could','count','court','cover','craft','crime','cross','daily','dated','death','debug','delay','depth','digit','doubt','draft','drink','drive','early','empty','enemy','enjoy','entry','equal','error','event','every','exact','exist','extra','faith','false','fault','field','final','first','fixed','flash','floor','focus','force','frame','fresh','front','fruit','fully','funny','given','grand','grant','great','group','guard','guess','guide','happy','heavy','hotel','human','image','index','input','issue','joint','known','label','large','later','layer','learn','least','leave','limit','local','login','lower','lucky','major','maker','march','match','maybe','media','metal','minor','model','music','never','newly','noise','offer','often','order','other','owner','panel','paper','phone','piece','place','plain','point','prime','print','prior','prize','proof','quick','quiet','quite','radio','raise','range','ready','refer','reply','right','route','scale','scene','scope','score','sense','serve','seven','share','sheet','shift','short','shown','since','sixth','small','smart','smile','solve','sorry','speed','spent','split','staff','stage','stand','start','state','steam','still','stock','store','style','table','taken','teach','teams','thank','their','theme','there','thing','think','third','three','throw','today','token','topic','total','touch','track','trial','under','until','upper','usage','video','visit','voice','watch','where','which','while','whole','whose','woman','words','write','wrong'
  ];
  const EXTRA_SIX_GUESSES = [
    'abroad','accept','action','actual','advice','affect','agency','almost','always','amount','animal','annual','anyone','appeal','appear','around','arrive','artist','aspect','attack','attend','author','beauty','became','become','before','behind','better','beyond','border','bottle','bottom','branch','breath','budget','camera','career','center','choose','client','closed','closer','coffee','column','common','create','damage','debate','decide','define','degree','demand','depend','device','direct','double','driver','during','easily','effect','effort','either','enable','energy','engine','enough','ensure','entire','escape','estate','expand','expect','export','fabric','factor','failed','family','famous','father','figure','filter','finger','finish','flight','follow','formal','format','foster','fourth','garden','gather','golden','ground','growth','handle','happen','health','height','honest','impact','income','indeed','inside','itself','joined','junior','keeper','latest','launch','lawyer','length','listen','loaded','manage','manual','margin','market','matter','medium','memory','method','middle','minute','modern','mostly','motion','nature','object','office','orange','output','parent','people','period','player','policy','prefer','pretty','public','reason','record','reduce','reform','reject','remain','remote','remove','repair','repeat','report','rescue','review','reward','sample','saving','school','screen','second','select','senior','server','settle','should','simple','single','smooth','source','speech','spring','square','stable','steady','stream','street','strict','strong','submit','sudden','summer','supply','switch','symbol','system','target','theory','ticket','toward','travel','trying','unable','unique','unless','update','upload','useful','valley','visual','volume','weekly','weight','window','winner','winter','within','wonder','worker','yellow'
  ];

  const ANSWERS = {
    5: Array.from(new Set(FIVE_ANSWERS)).filter((w) => w.length === 5).map((w) => w.toUpperCase()),
    6: Array.from(new Set(SIX_ANSWERS)).filter((w) => w.length === 6).map((w) => w.toUpperCase())
  };
  const VALID = {
    5: new Set([...ANSWERS[5], ...EXTRA_FIVE_GUESSES.filter((w) => w.length === 5).map((w) => w.toUpperCase())]),
    6: new Set([...ANSWERS[6], ...EXTRA_SIX_GUESSES.filter((w) => w.length === 6).map((w) => w.toUpperCase())])
  };

  const els = {
    html: document.documentElement,
    body: document.body,
    setup: document.getElementById('wordleSetup'),
    panel: document.getElementById('wordlePanel'),
    start: document.getElementById('wordleStart'),
    helpSetup: document.getElementById('wordleHelpSetup'),
    changeSetup: document.getElementById('wordleChangeSetup'),
    newRound: document.getElementById('wordleNewRound'),
    toggleKeyboard: document.getElementById('wordleToggleKeyboard'),
    keyboardBubble: document.getElementById('wordleKeyboardBubble'),
    keyboardHandle: document.getElementById('wordleKeyboardHandle'),
    keyboardClose: document.getElementById('wordleKeyboardClose'),
    grid: document.getElementById('wordleGrid'),
    keyboard: document.getElementById('wordleKeyboard'),
    input: document.getElementById('wordleGuessInput'),
    submit: document.getElementById('wordleSubmit'),
    del: document.getElementById('wordleDelete'),
    message: document.getElementById('wordleMessage'),
    boardTitle: document.getElementById('wordleBoardTitle'),
    modeTag: document.getElementById('wordleModeTag'),
    lengthTag: document.getElementById('wordleLengthTag'),
    difficultyTag: document.getElementById('wordleDifficultyTag'),
    attemptHud: document.getElementById('wordleAttemptHud'),
    streakHud: document.getElementById('wordleStreakHud'),
    bestHud: document.getElementById('wordleBestHud'),
    clueList: document.getElementById('wordleClueList'),
    toast: document.getElementById('wordleToast'),
    modal: document.getElementById('wordleModal'),
    modalKicker: document.getElementById('wordleModalKicker'),
    modalTitle: document.getElementById('wordleModalTitle'),
    modalBody: document.getElementById('wordleModalBody')
  };

  function initWordleFalling() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.toggle('wordle-reduced-motion', reducedMotion);
    document.body.classList.add('wordle-has-falling');
    const fullLayers = Array.from(document.querySelectorAll('.wordle-backdrop-letters, .wordle-rain'));
    const setupLayer = document.querySelector('.wordle-config-rain');
    if (reducedMotion) {
      fullLayers.forEach((layer) => { if (layer) layer.innerHTML = ''; });
      if (setupLayer) setupLayer.innerHTML = '';
      return;
    }

    const symbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const palette = [
      { color: '#a769ff', glow: 'rgba(167, 105, 255, 0.70)' },
      { color: '#29a8ff', glow: 'rgba(41, 168, 255, 0.70)' },
      { color: '#7dd3fc', glow: 'rgba(125, 211, 252, 0.62)' },
      { color: '#f0abfc', glow: 'rgba(240, 171, 252, 0.58)' },
      { color: '#35f29a', glow: 'rgba(53, 242, 154, 0.50)' },
      { color: '#ffd166', glow: 'rgba(255, 209, 102, 0.48)' }
    ];

    function fillLayer(layer, count, setupLayer = false) {
      if (!layer) return;
      layer.innerHTML = '';
      Array.from({ length: count }).forEach((_, index) => {
        const element = document.createElement('span');
        const accent = palette[index % palette.length];
        element.textContent = symbols[index % symbols.length];
        element.style.setProperty('--left', `${Math.random() * 100}%`);
        element.style.setProperty('--size', `${25 + Math.random() * 50}px`);
        element.style.setProperty('--duration', `${8 + Math.random() * 11}s`);
        element.style.setProperty('--delay', `${-Math.random() * 20}s`);
        element.style.setProperty('--drift', `${-110 + Math.random() * 220}px`);
        const rotation = `${-35 + Math.random() * 70}deg`;
        const opacity = `${0.25 + Math.random() * 0.28}`;
        element.style.setProperty('--rotation', rotation);
        element.style.setProperty('--rot', rotation);
        element.style.setProperty('--opacity', opacity);
        element.style.setProperty('--op', opacity);
        element.style.setProperty('--color', accent.color);
        element.style.setProperty('--glow', accent.glow);
        if (setupLayer) element.className = 'wordle-config-symbol';
        else element.className = 'wordle-falling-symbol';
        layer.appendChild(element);
      });
    }

    fullLayers.forEach((layer, index) => fillLayer(layer, index === 0 ? 104 : 0, false));
    fillLayer(setupLayer, 42, true);
  }

  initWordleFalling();

  if (!els.setup || !els.panel || !els.grid || !els.keyboard) return;

  const config = { mode: '', length: 0, difficulty: '' };
  const DIFFICULTY = {
    easy: { label: 'Easy', max: 8, hard: false, xp: 34 },
    medium: { label: 'Medium', max: 6, hard: false, xp: 52 },
    hard: { label: 'Hard', max: 6, hard: true, xp: 74 },
    expert: { label: 'Expert', max: 5, hard: true, xp: 98 }
  };
  const STORAGE_KEY = 'darkportal_wordle_stats_v2';
  let state = null;
  let toastTimer = null;
  let keyboardPlaced = false;

  function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function wordPool(length) {
    const pool = ANSWERS[Number(length)] || ANSWERS[5];
    return pool.length ? pool : ANSWERS[5];
  }

  function pickAnswer() {
    const length = config.mode === 'daily' ? 5 : Number(config.length || 5);
    const pool = wordPool(length);
    if (config.mode === 'daily') {
      const idx = hashString(`${todayKey()}-darkportal-daily-wordle`) % pool.length;
      return pool[idx];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getStats() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        played: Number(parsed.played || 0),
        wins: Number(parsed.wins || 0),
        losses: Number(parsed.losses || 0),
        streak: Number(parsed.streak || 0),
        bestStreak: Number(parsed.bestStreak || 0),
        bestScore: Number(parsed.bestScore || 0),
        daily: parsed.daily && typeof parsed.daily === 'object' ? parsed.daily : {},
        distribution: parsed.distribution && typeof parsed.distribution === 'object' ? parsed.distribution : {}
      };
    } catch {
      return { played: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, bestScore: 0, daily: {}, distribution: {} };
    }
  }

  function setStats(stats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }

  function section(name) {
    return els.setup.querySelector(`[data-wordle-step="${name}"]`);
  }

  function setPressed(selector, attr, value) {
    document.querySelectorAll(selector).forEach((button) => {
      const active = button.getAttribute(attr) === String(value);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function updateStepVisibility() {
    const lengthStep = section('length');
    const difficultyStep = section('difficulty');
    const startStep = section('start');
    if (lengthStep) lengthStep.hidden = !(config.mode === 'infinite');
    if (difficultyStep) difficultyStep.hidden = !(config.mode === 'daily' || (config.mode === 'infinite' && config.length));
    if (startStep) startStep.hidden = !config.difficulty;
    els.setup.dataset.mode = config.mode || '';
  }

  function selectMode(mode) {
    config.mode = mode === 'daily' ? 'daily' : 'infinite';
    if (config.mode === 'daily') config.length = 5;
    else if (!config.length) config.length = 0;
    config.difficulty = '';
    setPressed('[data-wordle-mode]', 'data-wordle-mode', config.mode);
    setPressed('[data-wordle-length]', 'data-wordle-length', config.length || '');
    setPressed('[data-wordle-difficulty]', 'data-wordle-difficulty', '');
    updateStepVisibility();
  }

  function selectLength(length) {
    config.length = Number(length) === 6 ? 6 : 5;
    config.difficulty = '';
    setPressed('[data-wordle-length]', 'data-wordle-length', config.length);
    setPressed('[data-wordle-difficulty]', 'data-wordle-difficulty', '');
    updateStepVisibility();
  }

  function selectDifficulty(difficulty) {
    if (!DIFFICULTY[difficulty]) return;
    config.difficulty = difficulty;
    setPressed('[data-wordle-difficulty]', 'data-wordle-difficulty', config.difficulty);
    updateStepVisibility();
  }

  function showToast(text) {
    if (!els.toast) return;
    clearTimeout(toastTimer);
    els.toast.textContent = text;
    els.toast.hidden = false;
    els.toast.classList.add('is-visible');
    toastTimer = setTimeout(() => {
      els.toast.classList.remove('is-visible');
      setTimeout(() => { els.toast.hidden = true; }, 180);
    }, 2100);
  }

  function setMessage(text, tone = '') {
    if (!els.message) return;
    els.message.textContent = text;
    els.message.classList.remove('is-good', 'is-bad', 'is-warn');
    if (tone) els.message.classList.add(`is-${tone}`);
  }

  function evaluateGuess(guess, answer) {
    const result = Array(guess.length).fill('missing');
    const counts = {};
    for (let i = 0; i < answer.length; i += 1) {
      const a = answer[i];
      if (guess[i] === a) result[i] = 'correct';
      else counts[a] = (counts[a] || 0) + 1;
    }
    for (let i = 0; i < guess.length; i += 1) {
      if (result[i] === 'correct') continue;
      const g = guess[i];
      if (counts[g] > 0) {
        result[i] = 'misplaced';
        counts[g] -= 1;
      }
    }
    return result;
  }

  function updateHardConstraints(guess, result) {
    if (!state) return;
    guess.split('').forEach((letter, index) => {
      if (result[index] === 'correct') state.constraints.greens[index] = letter;
      if (result[index] === 'misplaced') state.constraints.yellows.add(letter);
    });
  }

  function hardModeError(guess) {
    if (!state || !DIFFICULTY[state.difficulty].hard) return '';
    for (const [index, letter] of Object.entries(state.constraints.greens)) {
      if (guess[Number(index)] !== letter) return `Hard mode: position ${Number(index) + 1} must stay ${letter}.`;
    }
    for (const letter of state.constraints.yellows) {
      if (!guess.includes(letter)) return `Hard mode: your guess must include ${letter}.`;
    }
    return '';
  }

  function createBoard() {
    els.grid.innerHTML = '';
    els.grid.style.setProperty('--wordle-cols', state.length);
    els.grid.style.setProperty('--wordle-rows', state.maxRows);
    for (let row = 0; row < state.maxRows; row += 1) {
      const rowEl = document.createElement('div');
      rowEl.className = 'wordle-row';
      rowEl.dataset.row = String(row);
      for (let col = 0; col < state.length; col += 1) {
        const tile = document.createElement('div');
        tile.className = 'wordle-tile';
        tile.dataset.row = String(row);
        tile.dataset.col = String(col);
        tile.setAttribute('aria-label', `Row ${row + 1}, tile ${col + 1}`);
        rowEl.appendChild(tile);
      }
      els.grid.appendChild(rowEl);
    }
  }

  function createKeyboard() {
    const rows = [
      { className: 'row-top', keys: 'QWERTYUIOP'.split('') },
      { className: 'row-middle', keys: 'ASDFGHJKL'.split('') },
      { className: 'row-bottom', keys: ['ENTER', ...'ZXCVBNM'.split(''), 'DEL'] }
    ];
    els.keyboard.innerHTML = '';
    rows.forEach((entry) => {
      const row = document.createElement('div');
      row.className = `wordle-key-row ${entry.className}`;
      entry.keys.forEach((item) => {
        const key = document.createElement('button');
        key.type = 'button';
        key.className = 'wordle-key';
        if (item === 'ENTER') {
          key.classList.add('is-wide');
          key.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M10 7l-5 5 5 5"/><path d="M5 12h11a4 4 0 0 0 4-4V5"/></svg>';
          key.dataset.action = 'enter';
          key.setAttribute('aria-label', 'Submit guess');
        } else if (item === 'DEL') {
          key.classList.add('is-wide', 'is-delete');
          key.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M21 5H9l-6 7 6 7h12V5Z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>';
          key.dataset.action = 'backspace';
          key.setAttribute('aria-label', 'Delete last letter');
        } else {
          key.textContent = item;
          key.dataset.key = item;
        }
        row.appendChild(key);
      });
      els.keyboard.appendChild(row);
    });
  }


  function placeKeyboardBubble() {
    if (!els.keyboardBubble || keyboardPlaced) return;
    const rect = els.toggleKeyboard?.getBoundingClientRect?.();
    const width = Math.min(430, Math.max(310, window.innerWidth - 24));
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, (rect ? rect.right - width : window.innerWidth - width - 24)));
    const desiredTop = rect ? rect.bottom + 12 : 128;
    const maxTop = Math.max(86, window.innerHeight - 320);
    const top = Math.max(86, Math.min(maxTop, desiredTop));
    els.keyboardBubble.style.width = `${width}px`;
    els.keyboardBubble.style.left = `${left}px`;
    els.keyboardBubble.style.top = `${top}px`;
    keyboardPlaced = true;
  }

  function openKeyboardBubble() {
    if (!els.keyboardBubble) return;
    placeKeyboardBubble();
    els.keyboardBubble.hidden = false;
    els.keyboardBubble.classList.add('is-open');
    els.toggleKeyboard?.classList.add('is-active');
    els.toggleKeyboard?.setAttribute('aria-expanded', 'true');
  }

  function closeKeyboardBubble() {
    if (!els.keyboardBubble) return;
    els.keyboardBubble.classList.remove('is-open');
    els.keyboardBubble.hidden = true;
    els.toggleKeyboard?.classList.remove('is-active');
    els.toggleKeyboard?.setAttribute('aria-expanded', 'false');
  }

  function toggleKeyboardBubble() {
    if (!els.keyboardBubble) return;
    if (els.keyboardBubble.hidden) openKeyboardBubble();
    else closeKeyboardBubble();
  }

  function initKeyboardDrag() {
    if (!els.keyboardBubble || !els.keyboardHandle) return;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let baseLeft = 0;
    let baseTop = 0;
    const move = (event) => {
      if (!dragging) return;
      const width = els.keyboardBubble.offsetWidth || 360;
      const height = els.keyboardBubble.offsetHeight || 250;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, baseLeft + event.clientX - startX));
      const top = Math.max(70, Math.min(window.innerHeight - height - 8, baseTop + event.clientY - startY));
      els.keyboardBubble.style.left = `${left}px`;
      els.keyboardBubble.style.top = `${top}px`;
    };
    const stop = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.body.classList.remove('wordle-dragging-keyboard');
    };
    els.keyboardHandle.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      const rect = els.keyboardBubble.getBoundingClientRect();
      baseLeft = rect.left;
      baseTop = rect.top;
      document.body.classList.add('wordle-dragging-keyboard');
      els.keyboardHandle.setPointerCapture?.(event.pointerId);
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', stop);
    });
  }

  function tileAt(row, col) {
    return els.grid.querySelector(`.wordle-tile[data-row="${row}"][data-col="${col}"]`);
  }

  function renderCurrentGuess() {
    if (!state || state.done) return;
    for (let i = 0; i < state.length; i += 1) {
      const tile = tileAt(state.row, i);
      if (!tile) continue;
      tile.textContent = state.current[i] || '';
      tile.classList.toggle('is-filled', !!state.current[i]);
    }
    if (els.input && document.activeElement !== els.input) els.input.value = state.current;
  }

  function updateKeyboard(letter, status) {
    const key = els.keyboard.querySelector(`[data-key="${letter}"]`);
    if (!key) return;
    const rank = { missing: 1, misplaced: 2, correct: 3 };
    const old = key.dataset.status || '';
    if (!old || rank[status] > rank[old]) {
      key.dataset.status = status;
      key.classList.remove('is-missing', 'is-misplaced', 'is-correct');
      key.classList.add(`is-${status}`);
    }
  }

  function updateHud() {
    const stats = getStats();
    if (els.attemptHud && state) els.attemptHud.textContent = `${state.row} / ${state.maxRows}`;
    if (els.streakHud) els.streakHud.textContent = String(stats.streak || 0);
    if (els.bestHud) els.bestHud.textContent = String(stats.bestStreak || 0);
    if (els.modeTag && state) els.modeTag.textContent = state.mode === 'daily' ? 'Daily Challenge' : 'Infinite Challenge';
    if (els.lengthTag && state) {
      els.lengthTag.hidden = state.mode === 'daily';
      els.lengthTag.textContent = `${state.length} letters`;
    }
    if (els.difficultyTag && state) els.difficultyTag.textContent = DIFFICULTY[state.difficulty].label;
    if (els.boardTitle && state) els.boardTitle.textContent = state.mode === 'daily' ? `Daily Challenge Â· ${todayKey()}` : 'Infinite Challenge';
  }

  function renderClues() {
    if (!els.clueList || !state) return;
    const green = Object.entries(state.constraints.greens).map(([i, l]) => `${Number(i) + 1}:${l}`);
    const yellow = Array.from(state.constraints.yellows);
    const used = Object.entries(state.keyboard).filter(([, v]) => v === 'missing').map(([l]) => l);
    if (!state.guesses.length) {
      els.clueList.innerHTML = '<p>No clues yet. Submit a real word to light up the tracker.</p>';
      return;
    }
    els.clueList.innerHTML = `
      <div><strong>Green slots</strong><span>${green.length ? green.join(' Â· ') : 'None yet'}</span></div>
      <div><strong>Gold letters</strong><span>${yellow.length ? yellow.join(' Â· ') : 'None yet'}</span></div>
      <div><strong>Dim letters</strong><span>${used.length ? used.join(' Â· ') : 'None yet'}</span></div>
    `;
  }

  function renderGuess(rowIndex, guess, result) {
    result.forEach((status, col) => {
      const tile = tileAt(rowIndex, col);
      if (!tile) return;
      tile.textContent = guess[col];
      tile.classList.add('is-filled');
      tile.style.setProperty('--flip-delay', `${col * 90}ms`);
      setTimeout(() => {
        tile.dataset.status = status;
        tile.classList.add('is-revealed', `is-${status}`);
      }, col * 90);
      setTimeout(() => updateKeyboard(guess[col], status), col * 90 + 190);
      state.keyboard[guess[col]] = state.keyboard[guess[col]] ? bestStatus(state.keyboard[guess[col]], status) : status;
    });
  }

  function bestStatus(a, b) {
    const rank = { missing: 1, misplaced: 2, correct: 3 };
    return rank[b] > rank[a] ? b : a;
  }

  function normalizeGuess(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, state?.length || config.length || 6);
  }

  function isAlphaWord(value) {
    return /^[A-Z]+$/.test(value);
  }

  function isValidWord(value) {
    const set = VALID[state.length];
    return !!set && set.has(value);
  }

  async function saveProgress(result, attempts) {
    const win = result === 'win';
    const base = DIFFICULTY[state.difficulty].xp;
    const speedBonus = win ? Math.max(0, (state.maxRows - attempts + 1) * 8) : 0;
    const lengthBonus = state.length === 6 ? 12 : 0;
    const score = win ? base + speedBonus + lengthBonus : 12;
    const stats = getStats();
    stats.played += 1;
    if (win) {
      stats.wins += 1;
      stats.streak += 1;
      stats.bestStreak = Math.max(stats.bestStreak || 0, stats.streak || 0);
      stats.bestScore = Math.max(stats.bestScore || 0, score);
      stats.distribution[String(attempts)] = Number(stats.distribution[String(attempts)] || 0) + 1;
      if (state.mode === 'daily') stats.daily[todayKey()] = { result: 'win', answer: state.answer, attempts };
    } else {
      stats.losses += 1;
      stats.streak = 0;
      if (state.mode === 'daily') stats.daily[todayKey()] = { result: 'loss', answer: state.answer, attempts };
    }
    setStats(stats);
    updateHud();

    const token = localStorage.getItem(window.DGAuth?.TOKEN_KEY || 'dg_token');
    if (!token) return;
    try {
      await fetch('/api/games/progress/wordle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          result,
          score,
          meta: { mode: state.mode, length: state.length, difficulty: state.difficulty, attempts, answer: state.answer, date: todayKey() }
        })
      });
    } catch (_) {}
  }

  function finish(win) {
    if (!state || state.done) return;
    state.done = true;
    const attempts = state.row;
    const tone = win ? 'good' : 'bad';
    const title = win ? 'Solved!' : 'Round over';
    const result = win ? 'win' : 'loss';
    setMessage(win ? `Solved in ${attempts} ${attempts === 1 ? 'try' : 'tries'}.` : `The word was ${state.answer}.`, tone);
    saveProgress(result, attempts);
    setTimeout(() => {
      openModal({
        kicker: win ? 'Victory' : 'Answer revealed',
        title,
        body: `
          <div class="wordle-result-card ${win ? 'is-win' : 'is-loss'}">
            <strong>${state.answer}</strong>
            <span>${win ? `You solved it in ${attempts}/${state.maxRows}.` : `Better luck next round. You used ${attempts}/${state.maxRows} attempts.`}</span>
          </div>
          <div class="wordle-result-actions">
            <button class="btn btn-primary" data-wordle-result-new type="button">New round</button>
            <button class="btn" data-wordle-modal-close type="button">Close</button>
          </div>
        `
      });
    }, 850);
  }

  function submitGuess() {
    if (!state || state.done) return;
    const guess = normalizeGuess(state.current || els.input?.value || '');
    state.current = guess;
    renderCurrentGuess();
    if (guess.length !== state.length) {
      setMessage(`Use exactly ${state.length} letters.`, 'warn');
      shakeRow(state.row);
      return;
    }
    if (!isAlphaWord(guess)) {
      setMessage('Only letters are allowed.', 'warn');
      shakeRow(state.row);
      return;
    }
    if (!isValidWord(guess)) {
      setMessage('Use a real English word from the dictionary.', 'warn');
      shakeRow(state.row);
      return;
    }
    const hardError = hardModeError(guess);
    if (hardError) {
      setMessage(hardError, 'warn');
      shakeRow(state.row);
      return;
    }
    const result = evaluateGuess(guess, state.answer);
    const rowIndex = state.row;
    state.guesses.push({ guess, result });
    state.row += 1;
    state.current = '';
    if (els.input) els.input.value = '';
    renderGuess(rowIndex, guess, result);
    updateHardConstraints(guess, result);
    renderClues();
    updateHud();
    if (guess === state.answer) {
      setTimeout(() => finish(true), state.length * 95 + 260);
      return;
    }
    if (state.row >= state.maxRows) {
      setTimeout(() => finish(false), state.length * 95 + 260);
      return;
    }
    setMessage('Good guess. Use the clues for the next one.');
  }

  function shakeRow(rowIndex) {
    const row = els.grid.querySelector(`.wordle-row[data-row="${rowIndex}"]`);
    if (!row) return;
    row.classList.remove('is-shaking');
    void row.offsetWidth;
    row.classList.add('is-shaking');
  }

  function typeLetter(letter) {
    if (!state || state.done) return;
    if (state.current.length >= state.length) return;
    state.current += String(letter || '').toUpperCase();
    renderCurrentGuess();
  }

  function backspace() {
    if (!state || state.done) return;
    state.current = state.current.slice(0, -1);
    renderCurrentGuess();
  }

  function openModal({ kicker = 'Wordle', title = 'How to play', body = '' } = {}) {
    if (!els.modal) return;
    els.modalKicker.textContent = kicker;
    els.modalTitle.textContent = title;
    els.modalBody.innerHTML = body;
    els.modal.hidden = false;
    els.modal.classList.add('is-open');
    document.body.classList.add('wordle-dialog-open');
    const newBtn = els.modal.querySelector('[data-wordle-result-new]');
    if (newBtn) newBtn.addEventListener('click', () => { closeModal(); startGame({ keepSetup: true, forceInfiniteIfDailyDone: true }); });
    els.modal.querySelectorAll('[data-wordle-modal-close]').forEach((btn) => btn.addEventListener('click', closeModal));
  }

  function closeModal() {
    if (!els.modal) return;
    els.modal.classList.remove('is-open');
    els.modal.hidden = true;
    document.body.classList.remove('wordle-dialog-open');
  }

  function openHelp() {
    openModal({
      kicker: 'How to play',
      title: 'Wordle rules',
      body: `
        <div class="wordle-help-grid">
          <article><strong>Goal</strong><p>Guess the hidden word before you run out of attempts.</p></article>
          <article><strong>Real words only</strong><p>Random keyboard spam is rejected. Guesses must exist in the Wordle dictionary.</p></article>
          <article><strong>Green</strong><p>The letter is correct and in the exact position.</p></article>
          <article><strong>Gold</strong><p>The letter is in the answer, but in another position.</p></article>
          <article><strong>Dim</strong><p>The letter is not in the answer.</p></article>
          <article><strong>Difficulty</strong><p>Easy gives 8 attempts. Medium gives 6 attempts. Hard gives 6 attempts and locks green/gold clues. Expert gives 5 attempts and locks green/gold clues.</p></article>
        </div>
      `
    });
  }

  function showSetup() {
    closeKeyboardBubble();
    els.setup.hidden = false;
    els.panel.hidden = true;
    els.html.classList.add('wordle-setup-open');
    els.body.classList.add('wordle-setup-open');
    window.DGTopbar?.show?.();
    updateStepVisibility();
  }

  function showGame() {
    els.setup.hidden = true;
    els.panel.hidden = false;
    els.html.classList.remove('wordle-setup-open');
    els.body.classList.remove('wordle-setup-open');
  }

  function startGame(options = {}) {
    if (!config.mode) { showToast('Choose a mode first.'); return; }
    if (config.mode === 'infinite' && !config.length) { showToast('Choose word length.'); return; }
    if (!config.difficulty) { showToast('Choose difficulty.'); return; }
    if (config.mode === 'daily') config.length = 5;
    const difficulty = DIFFICULTY[config.difficulty] || DIFFICULTY.medium;
    const saved = getStats();
    const dailyRecord = saved.daily?.[todayKey()];
    if (config.mode === 'daily' && dailyRecord && !options.forceInfiniteIfDailyDone) {
      openModal({
        kicker: 'Daily complete',
        title: 'You already played today',
        body: `
          <div class="wordle-result-card ${dailyRecord.result === 'win' ? 'is-win' : 'is-loss'}">
            <strong>${dailyRecord.answer || 'Daily word'}</strong>
            <span>Your daily result is saved. Switch to Infinite Challenge for more rounds.</span>
          </div>
          <div class="wordle-result-actions">
            <button class="btn btn-primary" data-wordle-switch-infinite type="button">Start Infinite</button>
            <button class="btn" data-wordle-modal-close type="button">Close</button>
          </div>
        `
      });
      const infiniteBtn = els.modal?.querySelector('[data-wordle-switch-infinite]');
      if (infiniteBtn) infiniteBtn.addEventListener('click', () => { closeModal(); selectMode('infinite'); selectLength(5); selectDifficulty('medium'); startGame({ forceInfiniteIfDailyDone: true }); });
      return;
    }
    if (options.forceInfiniteIfDailyDone && config.mode === 'daily') {
      selectMode('infinite');
      selectLength(5);
      selectDifficulty('medium');
    }
    state = {
      mode: config.mode,
      length: config.mode === 'daily' ? 5 : Number(config.length || 5),
      difficulty: config.difficulty,
      maxRows: difficulty.max,
      answer: pickAnswer(),
      row: 0,
      current: '',
      done: false,
      guesses: [],
      keyboard: {},
      constraints: { greens: {}, yellows: new Set() }
    };
    createBoard();
    createKeyboard();
    renderClues();
    updateHud();
    showGame();
    setMessage('Type a real word to begin.');
    if (els.input) {
      els.input.maxLength = state.length;
      els.input.value = '';
      setTimeout(() => els.input.focus({ preventScroll: true }), 80);
    }
    showToast(`${state.mode === 'daily' ? 'Daily Challenge' : 'Infinite Challenge'} started.`);
  }

  document.querySelectorAll('[data-wordle-mode]').forEach((button) => button.addEventListener('click', () => selectMode(button.dataset.wordleMode)));
  document.querySelectorAll('[data-wordle-length]').forEach((button) => button.addEventListener('click', () => selectLength(button.dataset.wordleLength)));
  document.querySelectorAll('[data-wordle-difficulty]').forEach((button) => button.addEventListener('click', () => selectDifficulty(button.dataset.wordleDifficulty)));
  els.start?.addEventListener('click', () => startGame());
  els.helpSetup?.addEventListener('click', openHelp);
  els.changeSetup?.addEventListener('click', showSetup);
  els.newRound?.addEventListener('click', () => startGame({ forceInfiniteIfDailyDone: true }));
  els.toggleKeyboard?.setAttribute('aria-expanded', 'false');
  els.toggleKeyboard?.addEventListener('click', toggleKeyboardBubble);
  els.keyboardClose?.addEventListener('click', closeKeyboardBubble);
  initKeyboardDrag();
  els.submit?.addEventListener('click', submitGuess);
  els.del?.addEventListener('click', backspace);
  els.input?.addEventListener('input', () => {
    if (!state || state.done) return;
    state.current = normalizeGuess(els.input.value);
    els.input.value = state.current;
    renderCurrentGuess();
  });
  els.input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); submitGuess(); }
    if (event.key === 'Backspace') setTimeout(() => { if (state) { state.current = normalizeGuess(els.input.value); renderCurrentGuess(); } }, 0);
  });
  els.keyboard?.addEventListener('click', (event) => {
    const key = event.target.closest('.wordle-key');
    if (!key) return;
    if (key.dataset.action === 'enter') submitGuess();
    else if (key.dataset.action === 'backspace') backspace();
    else if (key.dataset.key) typeLetter(key.dataset.key);
  });
  document.addEventListener('keydown', (event) => {
    if (!state || event.ctrlKey || event.metaKey || event.altKey) return;
    const typingInInput = event.target === els.input;
    if (els.modal && !els.modal.hidden) {
      if (event.key === 'Escape') closeModal();
      return;
    }
    if (event.key === 'Escape' && els.keyboardBubble && !els.keyboardBubble.hidden) { closeKeyboardBubble(); return; }
    if (event.key === 'Enter') { if (!typingInInput) event.preventDefault(); submitGuess(); return; }
    if (event.key === 'Backspace') { if (!typingInInput) { event.preventDefault(); backspace(); } return; }
    if (/^[a-zA-Z]$/.test(event.key) && !typingInInput) { event.preventDefault(); typeLetter(event.key); }
  });
  document.querySelectorAll('[data-wordle-modal-close]').forEach((btn) => btn.addEventListener('click', closeModal));

  updateStepVisibility();
  updateHud();
})();
