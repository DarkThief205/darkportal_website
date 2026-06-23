(function () {
  const input = document.getElementById('gameSearch');
  const suggestions = document.getElementById('gameSuggestions');
  const empty = document.getElementById('gamesEmpty');
  const cards = Array.from(document.querySelectorAll('.game-card'));
  const library = document.getElementById('gamesLibrary');
  const helpModal = document.getElementById('gameHelpModal');
  const helpTitle = document.getElementById('gameHelpTitle');
  const helpText = document.getElementById('gameHelpText');

  const HELP_CONTENT = {
    tictactoe: {
      title: 'How Tic-Tac-Toe works',
      body: `
        <div class="game-help-grid">
          <article>
            <strong>Classic mode</strong>
            <p>Players take turns placing X and O. The first player to make a line of 3 wins. If all 9 cells are filled, it is a draw.</p>
          </article>
          <article>
            <strong>Vanish mode</strong>
            <p>Each player can keep only 3 marks on the board. When you place your 4th mark, your oldest mark disappears first.</p>
          </article>
          <article>
            <strong>Bot difficulty</strong>
            <p>Easy plays casual moves, Medium attacks and blocks, Hard uses stronger strategy. In Classic mode, Hard is close to perfect.</p>
          </article>
          <article>
            <strong>Online challenge</strong>
            <p>Host creates a room code. Join Match lets another player enter that code or open the invite link.</p>
          </article>
        </div>
      `,
    },
    sudoku: {
      title: 'How to Play Sudoku',
      body: `
        <h3>Objective</h3>
        <p>Fill the 9×9 grid with numbers 1-9 so that each row, column, and 3×3 box contains all digits 1-9 exactly once.</p>

        <h3>How to Play</h3>
        <ul>
          <li><strong>Select a cell:</strong> Click any empty cell in the grid</li>
          <li><strong>Place a number:</strong> Click a number on the pad or use your keyboard (1-9)</li>
          <li><strong>Clear a cell:</strong> Click the Clear button or press Backspace/Delete</li>
          <li><strong>Use Pencil mode:</strong> Toggle Pencil to add small notes (candidates) to cells</li>
          <li><strong>Get hints:</strong> Click Hint to reveal a cell (limited by difficulty)</li>
        </ul>

        <h3>Difficulty Levels</h3>
        <ul>
          <li><strong>Easy:</strong> 5 mistakes allowed, 5 hints available</li>
          <li><strong>Medium:</strong> 3 mistakes allowed, 3 hints available</li>
          <li><strong>Hard:</strong> 1 mistake allowed, 1 hint available</li>
          <li><strong>Extreme:</strong> 0 mistakes allowed, 0 hints available</li>
        </ul>

        <h3>Tips</h3>
        <ul>
          <li>Look for cells where only one number can fit</li>
          <li>Use the highlighting to see related cells</li>
          <li>Numbers with checkmarks on the pad are complete</li>
          <li>Use Pencil mode to track possible numbers</li>
        </ul>
      `,
    },
    wordle: {
      title: 'How to play Wordle',
      body: `
        <h3>Objective</h3>
        <p>Guess the hidden word in as few attempts as possible.</p>
        <h3>How to Play</h3>
        <ul>
          <li>Type a valid word and submit your guess.</li>
          <li>After each guess, the tiles show which letters are correct.</li>
          <li>Use the clues to narrow down the hidden word.</li>
        </ul>
        <h3>Tile clues</h3>
        <ul>
          <li><strong>Correct:</strong> the letter is in the right position.</li>
          <li><strong>Misplaced:</strong> the letter is in the word but in another position.</li>
          <li><strong>Missing:</strong> the letter is not in the word.</li>
        </ul>
      `,
    },
  };


  function openUnderDevelopment(title = 'Wordle') {
    if (!helpModal || !helpTitle || !helpText) return;
    helpTitle.textContent = `${title} is under development`;
    helpText.innerHTML = `
      <div class="game-help-grid">
        <article>
          <strong>Coming soon</strong>
          <p>This game is being prepared for Dark Games. It will open here when the Wordle section is ready.</p>
        </article>
        <article>
          <strong>Stats ready</strong>
          <p>Wins, losses, words solved and XP tracking are prepared for the Stats page.</p>
        </article>
      </div>`;
    helpModal.hidden = false;
    helpModal.style.display = 'flex';
    helpModal.style.position = 'fixed';
    helpModal.style.inset = '0';
    helpModal.style.zIndex = '99999';
    document.body.classList.add('game-help-open', 'nav-hidden');
    window.DGTopbar?.hide?.();
  }

  function createRain() {
    const root = document.getElementById('gamesRain');
    if (!root || root.dataset.ready === '1') return;
    root.dataset.ready = '1';

    const templates = [
      () => '<span class="rain-symbol rain-x">X</span>',
      () => '<span class="rain-symbol rain-o">O</span>',
      () => '<span class="rain-symbol rain-num">9</span>',
      () => '<span class="rain-symbol rain-word">W</span>',
      () => '<span class="rain-symbol rain-small">3×3</span>',
      () => '<span class="rain-symbol rain-small">9×9</span>',
      () => '<span class="rain-symbol rain-label">BOT</span>',
      () => '<span class="rain-symbol rain-label">VANISH</span>',
      () => '<span class="rain-board rain-board-ttt"><b>O</b><i></i><b>X</b><i></i><b>X</b><i></i><b>O</b><i></i><b></b></span>',
      () => '<span class="rain-board rain-board-sudoku"><b>2</b><i></i><i></i><i></i><b>9</b><i></i><b>1</b><i></i><b>3</b></span>',
      () => '<span class="rain-word-flower"><b>W</b><i>L</i><i>E</i><i>O</i><i>R</i><i>D</i></span>',
      () => '<span class="rain-pencil"></span>',
      () => '<span class="rain-wordle"><b>W</b><b>O</b><b>R</b><b>D</b></span>',
      () => '<span class="rain-tiles"><b></b><b></b><b></b><b></b><b></b><b></b></span>',
    ];

    const isSmall = window.matchMedia('(max-width: 760px)').matches;
    const count = isSmall ? 88 : 148;

    for (let index = 0; index < count; index += 1) {
      const item = document.createElement('span');
      const size = 14 + Math.round(Math.random() * (isSmall ? 28 : 40));
      const speed = 13 + Math.random() * 24;
      const delay = -Math.random() * speed;
      const drift = Math.round((Math.random() - 0.5) * 230);
      const spin = Math.round((Math.random() > 0.5 ? 1 : -1) * (45 + Math.random() * 190));

      item.className = 'games-rain-item';
      item.innerHTML = templates[Math.floor(Math.random() * templates.length)]();
      item.style.setProperty('--x', `${Math.round(Math.random() * 100)}%`);
      item.style.setProperty('--size', `${size}px`);
      item.style.setProperty('--speed', `${speed}s`);
      item.style.setProperty('--delay', `${delay}s`);
      item.style.setProperty('--drift', `${drift}px`);
      item.style.setProperty('--spin', `${spin}deg`);
      item.style.setProperty('--rot', `${Math.round(Math.random() * 360)}deg`);
      item.style.setProperty('--scale', `${(0.72 + Math.random() * 0.64).toFixed(2)}`);
      item.style.setProperty('--op', `${(0.16 + Math.random() * 0.32).toFixed(2)}`);
      item.style.setProperty('--blur', `${Math.random() > 0.92 ? 1 : 0}px`);
      root.appendChild(item);
    }
  }

  function openHelp(button) {
    if (!helpModal || !helpTitle || !helpText) return;
    const content = HELP_CONTENT[button.dataset.helpId] || {
      title: 'How to play',
      body: '<p>Instructions are coming soon.</p>',
    };
    helpTitle.textContent = content.title;
    helpText.innerHTML = content.body;
    helpModal.hidden = false;
    helpModal.style.display = 'flex';
    helpModal.style.position = 'fixed';
    helpModal.style.inset = '0';
    helpModal.style.zIndex = '99999';
    document.body.classList.add('game-help-open', 'nav-hidden');
    window.DGTopbar?.hide?.();
  }

  function closeHelp() {
    if (!helpModal) return;
    helpModal.hidden = true;
    helpModal.style.display = 'none';
    helpModal.style.removeProperty('position');
    helpModal.style.removeProperty('inset');
    helpModal.style.removeProperty('z-index');
    document.body.classList.remove('game-help-open', 'nav-hidden');
    window.DGTopbar?.show?.();
  }

  createRain();

  document.querySelectorAll('[data-help-id]').forEach((button) => {
    button.addEventListener('click', () => openHelp(button));
  });
  document.querySelectorAll('[data-help-close]').forEach((button) => {
    button.addEventListener('click', closeHelp);
  });
  document.querySelectorAll('.game-card[data-title="Wordle"], .game-card[data-url="/wordle.html"] .game-action').forEach((el) => {
    el.addEventListener('click', (event) => {
      const target = event.target;
      if (target?.closest?.('[data-help-id]')) return;
      event.preventDefault();
      event.stopPropagation();
      openUnderDevelopment('Wordle');
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeHelp();
  });

  if (!input || !suggestions || !cards.length) return;

  const games = cards.map((card) => ({
    card,
    title: card.dataset.title || '',
    keywords: `${card.dataset.title || ''} ${card.dataset.keywords || ''}`.toLowerCase(),
    url: card.dataset.url || card.querySelector('a')?.href || '#',
  }));

  function getMatches(query) {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((game) => game.keywords.includes(q));
  }

  function renderSuggestions(matches, query) {
    if (!query.trim()) {
      suggestions.hidden = true;
      suggestions.innerHTML = '';
      return;
    }

    suggestions.innerHTML = '';
    matches.slice(0, 5).forEach((game) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'games-suggestion';
      button.setAttribute('role', 'option');
      button.innerHTML = `<span>${game.title}</span><small>Play Now</small>`;
      button.addEventListener('click', () => {
        if (String(game.title || '').toLowerCase() === 'wordle') openUnderDevelopment('Wordle');
        else window.location.href = game.url;
      });
      suggestions.appendChild(button);
    });
    suggestions.hidden = matches.length === 0;
  }

  function filterGames(value) {
    const matches = getMatches(value);
    const visible = new Set(matches.map((game) => game.card));
    cards.forEach((card) => {
      card.hidden = !visible.has(card);
    });
    if (library) {
      const isFiltered = value.trim().length > 0 || matches.length !== games.length;
      library.classList.toggle('is-filtering', isFiltered);
      library.classList.toggle('has-single-result', isFiltered && matches.length === 1);
    }
    if (empty) empty.hidden = matches.length !== 0;
    renderSuggestions(matches, value);
  }

  input.addEventListener('input', () => filterGames(input.value));
  input.addEventListener('focus', () => renderSuggestions(getMatches(input.value), input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const first = getMatches(input.value)[0];
    if (first) {
      if (String(first.title || '').toLowerCase() === 'wordle') openUnderDevelopment('Wordle');
      else window.location.href = first.url;
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.games-search-wrap')) suggestions.hidden = true;
  });
})();
