(function(){
  const hero = document.getElementById('statsHero');
  const cols = document.getElementById('statsColumns');
  const esc = (v) => window.DGAuth?.escapeHtml ? window.DGAuth.escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtDate = (ms) => ms ? new Date(Number(ms)).toLocaleDateString(undefined, {year:'numeric',month:'short',day:'2-digit'}) : 'Unknown';
  const daysSince = (ms) => ms ? Math.max(0, Math.floor((Date.now() - Number(ms)) / 86400000)) : 0;
  if (!hero || !cols) return;

  function localProfile(){ try { return window.DGAuth?.currentProfile?.() || JSON.parse(localStorage.getItem('dg_profile') || 'null'); } catch { return null; } }
  const STATS_DISCORD_AUTH_KEY = 'dark_portal_stats_discord_auth_started_at';
  function authUrl(){ return `/auth/discord?next=${encodeURIComponent('/stats.html')}`; }
  function authRecentlyStarted(){ try { const last = Number(sessionStorage.getItem(STATS_DISCORD_AUTH_KEY) || 0); return last && Date.now() - last < 120000; } catch { return false; } }
  function startDiscordAuth(){
    if (authRecentlyStarted()) return false;
    try { sessionStorage.setItem(STATS_DISCORD_AUTH_KEY, String(Date.now())); } catch {}
    window.location.assign(authUrl());
    return true;
  }
  function num(v){ return Number(v || 0); }
  function gamePlayed(g){ return num(g?.wins) + num(g?.losses) + num(g?.draws); }
  function normKey(k){ return String(k || '').toLowerCase(); }
  function row(label, value, hint=''){ return `<div class="stat-row-v22 stat-row-v29 stat-row-v30"><span>${esc(label)}</span><b>${esc(value)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`; }
  function gameLookup(games, pattern){ return games.filter(g => pattern.test(normKey(g.game_key))); }
  function detailsBlock(id, title, summary, body){
    return `<article class="stats-accordion-v29 stats-accordion-v30"><button class="stats-accordion-head-v29 stats-accordion-head-v30" data-stat-toggle="${esc(id)}" type="button" aria-expanded="false"><span><strong>${esc(title)}</strong><small>${esc(summary)}</small></span><b aria-hidden="true">+</b></button><div class="stats-accordion-body-v29 stats-accordion-body-v30" id="${esc(id)}" hidden>${body}</div></article>`;
  }
  function render(data){
    const u = data.user || localProfile() || { username: 'player', created: Date.now() };
    const s = data.stats || {};
    const p = s.progression || { level:1, xp:0, percent:0, intoLevel:0, needed:120 };
    const games = Array.isArray(s.games) ? s.games : [];
    const ttt = s.tictactoe || gameLookup(games, /tictactoe|tic/)[0] || { game_key:'tictactoe' };
    const sudokuList = Array.isArray(s.sudoku) ? s.sudoku : gameLookup(games, /sudoku|sumdoku|killer/);
    const wordle = gameLookup(games, /wordle|word/)[0] || { game_key:'wordle' };
    const totals = s.totals || {};
    const totalPlayed = num(totals.gamesPlayed) || games.reduce((a,g)=>a+gamePlayed(g),0);
    const totalWins = num(totals.wins) || games.reduce((a,g)=>a+num(g.wins),0);
    const totalLosses = num(totals.losses) || games.reduce((a,g)=>a+num(g.losses),0);
    const totalDraws = num(totals.draws) || games.reduce((a,g)=>a+num(g.draws),0);
    const into = num(p.intoLevel ?? p.xp);
    const needed = num(p.needed || p.nextFloor || 120);
    const percent = Math.max(0, Math.min(100, Number(p.percent || (needed ? into / needed * 100 : 0))));
    const sudokuPlayed = sudokuList.reduce((a,g)=>a+gamePlayed(g),0);
    const sudokuWins = sudokuList.reduce((a,g)=>a+num(g.wins),0);
    const sudokuXp = sudokuList.reduce((a,g)=>a+num(g.xp),0);

    hero.innerHTML = `<div class="stats-hero-copy-v26 stats-hero-copy-v30"><span class="portal-mini-label">Your progression</span><h1>Level <span>${esc(p.level || 1)}</span></h1><p>@${esc(u.username || 'player')} • created ${fmtDate(u.created)} • member for ${daysSince(u.created)} days</p><div class="profile-xp-bar-v22 stats-xp-bar-v22"><i style="width:${percent}%"></i></div><small>${into} / ${needed} XP to next level</small></div><div class="stats-xp-orb-v22 stats-xp-orb-v26 stats-xp-orb-v29 stats-xp-orb-v30"><strong>${esc(p.xp || 0)}</strong><span>Total XP</span></div>`;

    const tttBody = `${row('Played', gamePlayed(ttt))}${row('Wins', num(ttt.wins))}${row('Losses', num(ttt.losses))}${row('Draws', num(ttt.draws))}${row('XP', num(ttt.xp), 'Local, bot, room-code and difficulty splits are prepared for the next telemetry pass.')}`;
    const sudokuBody = sudokuList.length ? sudokuList.map(g => row(g.game_key, `${num(g.wins)} solved`, `${num(g.xp)} XP`)).join('') + row('Most played difficulty', 'Coming soon', 'Easy / Medium / Hard / Extreme split will appear after detailed puzzle telemetry.') : row('No puzzles yet', '0 solved', 'Classic Sudoku and Sum-Doku will appear here.');
    const wordleBody = `${row('Played', gamePlayed(wordle))}${row('Words solved', num(wordle.wins))}${row('Failed attempts', num(wordle.losses))}${row('Best score', num(wordle.best_score), 'Daily and Infinite Challenge Wordle sync here when you are logged in.')}${row('XP', num(wordle.xp))}`;

    cols.innerHTML = `
      <section class="stats-section-v29 stats-section-v30"><div class="stats-section-head-v29 stats-section-head-v30"><span class="portal-mini-label">Games</span><h2>Game activity</h2><p>Total ${totalPlayed} games • ${totalWins} wins • ${totalLosses} losses • ${totalDraws} draws</p></div><div class="stats-summary-strip-v30"><div><b>${totalPlayed}</b><span>Total</span></div><div><b>${totalWins}</b><span>Wins</span></div><div><b>${totalLosses}</b><span>Losses</span></div><div><b>${totalDraws}</b><span>Draws</span></div></div><div class="stats-accordion-list-v29 stats-accordion-list-v30">${detailsBlock('stat-ttt','Tic-Tac-Toe',`${gamePlayed(ttt)} played • ${num(ttt.wins)} wins`,tttBody)}${detailsBlock('stat-sudoku','Sudoku / Sum-Doku',`${sudokuPlayed} played • ${sudokuWins} solved • ${sudokuXp} XP`,sudokuBody)}${detailsBlock('stat-wordle','Wordle',`${gamePlayed(wordle)} played`,wordleBody)}</div></section>
      <section class="stats-section-v29 stats-section-v30 stats-section-compact-v30"><div class="stats-section-head-v29 stats-section-head-v30"><span class="portal-mini-label">Bot & Portal</span><h2>Interactions</h2><p>Commands, tickets and portal actions that contribute to XP.</p></div><div class="stats-summary-strip-v30 stats-summary-strip-small-v30"><div><b>${num(s.bot?.commandExecutions)}</b><span>Bot commands</span></div><div><b>${num(totals.feedbackTickets)}</b><span>Tickets</span></div><div><b>${num(totals.portalXp)}</b><span>Portal XP</span></div><div><b>${num(s.bot?.trackedCommands)}</b><span>Tracked commands</span></div></div></section>`;
    cols.querySelectorAll('[data-stat-toggle]').forEach(btn => btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.statToggle);
      if (!target) return;
      const willOpen = target.hasAttribute('hidden');
      if (willOpen) target.removeAttribute('hidden'); else target.setAttribute('hidden', '');
      btn.classList.toggle('is-open', willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      const icon = btn.querySelector('b');
      if (icon) icon.textContent = willOpen ? '−' : '+';
    }));
  }
  function renderError(msg){
    hero.innerHTML = `<span class="portal-mini-label">Stats</span><h1>Could not load stats</h1><p>${esc(msg || 'Please sign in again.')}</p><a class="btn btn-primary" href="/login.html?next=/stats.html">Sign in</a>`;
    cols.innerHTML = '';
  }
  async function init(){
    try { await Promise.race([window.DGAuth?.syncSessionFromToken?.(), new Promise(resolve => setTimeout(resolve, 1200))]); } catch {}
    const token = localStorage.getItem('dg_token');
    const saved = localProfile();
    if (saved) render({ user: saved, stats: { progression: { level: 1, xp: 0, percent: 0, intoLevel:0, needed:120 }, totals: {} } });
    if (!token && !saved) { window.location.href = '/login.html?next=/stats.html'; return; }
    if (!token) { startDiscordAuth(); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch('/api/stats', { headers:{ authorization:'Bearer ' + token }, cache:'no-store', signal: controller.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unauthorized');
      if (data.user) window.DGAuth?.setProfile?.(data.user);
      render(data);
    } catch(err) {
      const shouldRefreshDiscord = /discord|unauthorized|refresh|token/i.test(err.message || '') || err.message === 'Unauthorized';
      if (shouldRefreshDiscord && startDiscordAuth()) return;
      if (!saved) renderError(err.name === 'AbortError' ? 'Stats API timed out.' : err.message);
    } finally { clearTimeout(timer); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
