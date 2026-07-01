// Profile v35 — provider linking flow + Discord bot access gate
(function(){
  const TOKEN_KEY = 'dg_token';
  const shell = document.getElementById('profileShell');
  const esc = (v) => window.DGAuth?.escapeHtml ? window.DGAuth.escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtDate = (ms) => ms ? new Date(Number(ms)).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' }) : 'Unknown';
  const daysSince = (ms) => ms ? Math.max(0, Math.floor((Date.now() - Number(ms)) / 86400000)) : 0;
  if (!shell) return;

  const providerCopy = {
    discord: {
      name: 'Discord',
      note: 'Required for bot dashboard, guild setup and all Discord bot options.',
      empty: 'Link Discord to unlock bot options.'
    },
    google: {
      name: 'Google',
      note: 'Extra sign-in method for the same Dark Portal account.',
      empty: 'Optional backup login.'
    },
    steam: {
      name: 'Steam',
      note: 'Optional identity for games and future Steam-related features.',
      empty: 'Optional game identity.'
    }
  };

  function localProfile(){
    return window.DGAuth?.currentProfile?.() || (() => { try { return JSON.parse(localStorage.getItem('dg_profile') || 'null'); } catch { return null; } })();
  }
  function staticStats(){
    try { return window.DGStaticStats?.build?.() || { progression: { level: 1, xp: 0, percent: 0 }, totals: { feedbackTickets: 0 } }; }
    catch { return { progression: { level: 1, xp: 0, percent: 0 }, totals: { feedbackTickets: 0 } }; }
  }
  function persistProfile(profile){
    if (!profile) return null;
    profile.username = String(profile.username || 'static_user').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_') || 'static_user';
    profile.display_name = String(profile.display_name || profile.username || 'Dark Portal User').trim() || 'Dark Portal User';
    profile.created = Number(profile.created || Date.now());
    profile.linked = profile.linked || {};
    localStorage.setItem('dg_session', profile.username);
    localStorage.setItem(TOKEN_KEY, localStorage.getItem(TOKEN_KEY) || `static-local-${profile.created}`);
    localStorage.setItem('dg_profile', JSON.stringify(profile));
    window.DGAuth?.setProfile?.(profile);
    window.DGAuth?.updateTopbarAuth?.();
    return profile;
  }
  function providerPayload(provider, display){
    return { id: `static-${provider}`, username: display, name: display, global_name: display, persona: display, avatar: '' };
  }
  function providerIcon(key, data){
    const avatar = data?.avatar || data?.picture || data?.avatar_url || '';
    if (avatar) return `<img src="${esc(avatar)}" alt="" class="provider-avatar-v26">`;
    return `<span class="provider-logo-v26 provider-${esc(key)}-v26">${esc(providerCopy[key]?.name.slice(0,1) || '?')}</span>`;
  }
  function providerDetail(key, connected, u){
    if (!connected) return providerCopy[key].empty;
    if (key === 'discord') return u.discord?.global_name || u.discord?.username || 'Discord linked';
    if (key === 'google') return u.google?.name || u.email || 'Google linked';
    if (key === 'steam') return u.steam?.persona || 'Steam linked';
    return 'Connected';
  }
  function providerData(key, u){
    return key === 'discord' ? u.discord : key === 'google' ? u.google : u.steam;
  }
  function linkedCount(u){
    return ['discord','google','steam'].reduce((n, key) => n + (providerData(key, u) ? 1 : 0), 0);
  }
  function providerCard(key, u){
    const connected = !!providerData(key, u);
    const count = linkedCount(u);
    const copy = providerCopy[key];
    const unlinkDisabled = connected && count <= 1;
    return `<article class="profile-provider-card-v26 profile-provider-card-v35 ${connected ? 'is-linked' : 'is-missing'} ${key === 'discord' ? 'is-discord-provider-v35' : ''}">
      <div class="provider-left-v26">
        ${providerIcon(key, providerData(key, u))}
        <div class="provider-copy-v35">
          <span class="provider-status-v35 ${connected ? 'is-on' : 'is-off'}">${connected ? 'Linked' : 'Not linked'}</span>
          <strong>${esc(copy.name)}</strong>
          <small>${esc(providerDetail(key, connected, u))}</small>
          <em>${esc(copy.note)}</em>
        </div>
      </div>
      <div class="provider-actions-v26 provider-actions-v35">
        <button class="btn ${connected ? 'btn-ghost' : 'btn-primary'} provider-link-btn-v26" type="button" data-link-provider="${esc(key)}">${connected ? 'Refresh link' : 'Link'}</button>
        ${connected ? `<button class="btn btn-ghost provider-unlink-btn-v26" type="button" data-unlink-provider="${esc(key)}" ${unlinkDisabled ? 'disabled aria-disabled="true" title="At least one login provider must stay linked."' : ''}>Unlink</button>` : ''}
      </div>
    </article>`;
  }
  function normalize(raw){
    const u = raw?.user || localProfile();
    if (!u) return null;
    const normalized = {
      username: u.username || 'player',
      display_name: u.display_name || u.global_name || u.name || u.username || 'Player',
      email: u.email || '',
      created: u.created || Date.now(),
      avatar_url: u.avatar_url || u.avatar || u.picture || '',
      oauth_provider: u.oauth_provider || 'Provider',
      discord: u.discord || (u.discord_id ? { id: u.discord_id, username: u.username, global_name: u.display_name, avatar: u.avatar_url } : null),
      google: u.google || (u.google_id ? { id: u.google_id, name: u.display_name, avatar: u.avatar_url } : null),
      steam: u.steam || (u.steam_id ? { id: u.steam_id, persona: u.display_name, avatar: u.avatar_url } : null),
      linked: u.linked || null
    };
    return {
      user: normalized,
      stats: raw?.stats || { progression: { level: 1, xp: 0, percent: 0 }, totals: { feedbackTickets: 0 } },
      offline: !raw?.stats
    };
  }
  function botGate(u){
    const hasDiscord = !!u.discord;
    return `<article class="profile-card-v22 profile-card-wide-v22 profile-bot-gate-v35 ${hasDiscord ? 'is-unlocked' : 'is-locked'}">
      <div class="bot-gate-head-v35">
        <span class="portal-mini-label">Discord bot access</span>
        <span class="bot-gate-pill-v35">${hasDiscord ? 'Unlocked' : 'Discord required'}</span>
      </div>
      <h2>${hasDiscord ? 'Bot options are enabled' : 'Link Discord before using bot options'}</h2>
      <p>${hasDiscord
        ? 'This Dark Portal account has Discord linked, so bot dashboard and server-management features can use your Discord guild permissions.'
        : 'You can create the account with Google or Steam and still link Discord here, but every Discord bot option requires Discord to be linked to this same account.'}</p>
      <button class="btn ${hasDiscord ? 'btn-ghost' : 'btn-primary'} provider-link-btn-v26" type="button" data-link-provider="discord">${hasDiscord ? 'Refresh Discord access' : 'Link Discord'}</button>
    </article>`;
  }
  function render(raw){
    const data = normalize(raw);
    if (!data) { renderError('No active session was found. Please sign in again.'); return; }
    const u = data.user;
    const stats = data.stats || {};
    const prog = stats.progression || { level: 1, xp: 0, percent: 0 };
    const avatar = u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="" class="profile-hero-avatar-v22">` : `<span class="profile-hero-avatar-v22 profile-avatar-fallback-v22">${esc((u.display_name || u.username || 'U').slice(0,1).toUpperCase())}</span>`;
    shell.innerHTML = `
      ${data.offline ? '<div class="profile-inline-alert-v23">Showing the saved session while live profile data loads.</div>' : ''}
      <section class="profile-hero-v22 profile-hero-v26 profile-hero-v35">
        <div class="profile-identity-v22">${avatar}<div><span class="portal-mini-label">Dark Portal account</span><h1>${esc(u.display_name || u.username)}</h1><p>@${esc(u.username)}${u.email ? ' • ' + esc(u.email) : ''}</p></div></div>
        <div class="profile-level-card-v22"><span>Level ${prog.level || 1}</span><strong>${prog.xp || 0} XP</strong><div class="profile-xp-bar-v22"><i style="width:${prog.percent || 0}%"></i></div><small>${prog.percent || 0}% to next level</small></div>
      </section>
      <section class="profile-grid-v22 profile-grid-v26 profile-grid-v35">
        <article class="profile-card-v22 profile-card-wide-v22"><span class="portal-mini-label">Identity</span><h2>Customize profile</h2><form id="profileNameForm" class="profile-form-v22"><label class="field"><span>Display name / nickname</span><input id="profileDisplayName" class="input" minlength="2" maxlength="32" value="${esc(u.display_name || u.username)}" required></label><button class="btn btn-primary" type="submit">Save nickname</button><p class="form-msg" id="profileSaveMsg"></p></form></article>
        <article class="profile-card-v22"><span class="portal-mini-label">Account info</span><h2>Details</h2><dl class="profile-info-list-v22"><div><dt>Created</dt><dd>${fmtDate(u.created)}</dd></div><div><dt>Member for</dt><dd>${daysSince(u.created)} days</dd></div><div><dt>Main provider</dt><dd>${esc(u.oauth_provider || 'Unknown')}</dd></div><div><dt>Tickets sent</dt><dd>${stats.totals?.feedbackTickets || 0}</dd></div></dl></article>
        <article class="profile-card-v22 profile-card-wide-v22 profile-linked-card-v35"><span class="portal-mini-label">Connected accounts</span><h2>Link providers</h2><p class="profile-muted-v22">Start with Discord, Google or Steam, then attach the other providers to this same Dark Portal profile. Discord is mandatory only for Discord bot related options.</p><div class="profile-provider-grid-v26 profile-provider-grid-v35">
          ${providerCard('discord', u)}
          ${providerCard('google', u)}
          ${providerCard('steam', u)}
        </div></article>
        ${botGate(u)}
        <article class="profile-card-v22 profile-actions-card-v35"><span class="portal-mini-label">Session</span><h2>Account actions</h2><p class="profile-muted-v22">Manage this session or remove the portal account.</p><div class="profile-actions-v22 stack-v22"><button id="logoutProfile" class="btn btn-ghost" type="button">Logout</button><button id="deleteProfile" class="btn btn-primary danger-btn-v22" type="button">Delete account</button></div></article>
      </section>`;
    bindRenderedActions();
  }
  function bindRenderedActions(){
    document.getElementById('profileNameForm')?.addEventListener('submit', saveName);
    document.getElementById('logoutProfile')?.addEventListener('click', () => { window.DGAuth?.logout?.(); window.location.href = '/index.html'; });
    document.getElementById('deleteProfile')?.addEventListener('click', openDelete);
    document.querySelectorAll('[data-unlink-provider]').forEach(btn => btn.addEventListener('click', unlinkProvider));
    document.querySelectorAll('[data-link-provider]').forEach(btn => btn.addEventListener('click', linkProvider));
  }
  function renderError(message){
    shell.innerHTML = `<section class="profile-card-v22 profile-card-wide-v22 profile-error-v23"><span class="portal-mini-label">Profile</span><h1>Could not load profile</h1><p>${esc(message)}</p><div class="profile-actions-v22"><a class="btn btn-primary" href="/login.html?next=/profile.html">Sign in again</a><a class="btn btn-ghost" href="/index.html">Back Home</a></div></section>`;
  }
  async function saveName(e){
    e.preventDefault();
    const msg = document.getElementById('profileSaveMsg');
    const name = document.getElementById('profileDisplayName')?.value?.trim();
    if (msg) msg.textContent = 'Saving...';
    try {
      const profile = persistProfile({ ...(localProfile() || {}), display_name: name || 'Dark Portal User' });
      if (msg) msg.textContent = 'Saved locally.';
      render({ user: profile, stats: staticStats() });
    } catch(err){ if (msg) msg.textContent = err.message || 'Could not save.'; }
  }
  async function linkProvider(e){
    const provider = e.currentTarget.dataset.linkProvider;
    if (!provider) return;
    const btn = e.currentTarget;
    const previous = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Linking...';
    try {
      const base = localProfile() || { username: `${provider}_user`, display_name: 'Dark Portal User', created: Date.now(), oauth_provider: provider };
      const display = base.display_name || base.username || 'Dark Portal User';
      base[provider] = base[provider] || providerPayload(provider, display);
      base.linked = { ...(base.linked || {}), [provider]: true };
      if (!base.oauth_provider) base.oauth_provider = provider;
      const profile = persistProfile(base);
      render({ user: profile, stats: staticStats() });
    } catch(err) {
      alert(err.message || `Could not link ${provider}.`);
      btn.disabled = false;
      btn.textContent = previous;
    }
  }
  async function unlinkProvider(e){
    const provider = e.currentTarget.dataset.unlinkProvider;
    if (!provider || e.currentTarget.disabled) return;
    if (!confirm(`Unlink ${provider} from this Dark Portal account?`)) return;
    try {
      const profile = { ...(localProfile() || {}) };
      delete profile[provider];
      profile.linked = { ...(profile.linked || {}), [provider]: false };
      persistProfile(profile);
      render({ user: profile, stats: staticStats() });
    } catch(err){ alert(err.message || 'Could not unlink provider.'); }
  }
  function openDelete(){ document.getElementById('deleteProfileModal').hidden = false; document.body.classList.add('portal-modal-open'); window.DGTopbar?.hide?.(); }
  function closeDelete(){ document.getElementById('deleteProfileModal').hidden = true; document.body.classList.remove('portal-modal-open'); window.DGTopbar?.show?.(); }
  document.querySelectorAll('[data-close-delete]').forEach(b => b.addEventListener('click', closeDelete));
  document.getElementById('confirmDeleteProfile')?.addEventListener('click', async () => {
    try {
      window.DGAuth?.logout?.();
      localStorage.removeItem('dg_profile');
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('dg_session');
      window.location.href = '/index.html';
    } catch(err){ alert(err.message || 'Could not delete account.'); }
  });
  async function init(){
    await Promise.resolve(window.DGAuth?.syncSessionFromToken?.()).catch(() => {});
    const saved = localProfile();
    if (!saved) { window.location.href = '/login.html?next=/profile.html'; return; }
    render({ user: saved, stats: staticStats() });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
