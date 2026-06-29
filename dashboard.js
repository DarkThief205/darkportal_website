// Dashboard v34 — centered accordion sections with click-to-collapse
(function(){
  const esc = (v) => window.DGAuth?.escapeHtml ? window.DGAuth.escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const userCard = document.getElementById('dashboardUserCard');
  const serverList = document.getElementById('managedServers');
  const configPanel = document.getElementById('serverConfigPanel');
  if (!userCard || !serverList || !configPanel) return;

  let currentUser = null;
  let currentServers = [];
  let selectedServer = null;
  let currentStats = { progression: { level: 1, xp: 0 } };
  let currentInvite = '/bot-invite';
  let currentSetup = null;
  let currentSection = '';
  let savedConfig = {};
  let workingConfig = {};
  let isDirty = false;

  const fallbackCommands = [
    ['/help','Show help and available bot commands.','Core utilities'],
    ['/ping','Check bot latency and health.','Core utilities'],
    ['/serverinfo','Show server information.','Core utilities'],
    ['/serverstatus','Show server status information.','Core utilities'],
    ['/userinfo','Show member information.','Core utilities'],
    ['/weather','Weather lookup command.','Core utilities'],
    ['/meme','Send a meme response.','Community'],
    ['/quote','Send a random quote.','Community'],
    ['/dark','Dark Bot portal command.','Community'],
    ['/darkgames','Link members to Dark Games.','Community'],
    ['/tictactoe','Start Tic-Tac-Toe through the bot.','Games'],
    ['/feedback','Send a ticket from the Feedback tab.','Support'],
    ['/play','Play audio through the music module.','Music'],
    ['/music','Music controls.','Music'],
    ['/ai','AI assistant command.','AI'],
    ['/ban','Ban members from the guild.','Moderation'],
    ['/kick','Kick members from the guild.','Moderation'],
    ['/timeout','Timeout members.','Moderation'],
    ['/clear','Bulk delete messages.','Moderation'],
  ].map(([name, description, category]) => ({ name, description, category, defaultEnabled: true }));

  const pluginIdeas = [
    { key:'autorole', title:'Autorole', desc:'Automatically give selected roles to new members.' },
    { key:'welcome', title:'Welcome & Goodbye', desc:'Welcome, leave and onboarding messages.' },
    { key:'levels', title:'Member Levels', desc:'XP, ranks and activity rewards for guild members.' },
    { key:'reaction_roles', title:'Reaction Roles', desc:'Members choose roles by reacting or clicking.' },
    { key:'tickets', title:'Ticket System', desc:'Support tickets for feedback, reports and guild help.' },
    { key:'social_alerts', title:'Social Alerts', desc:'Twitch, YouTube and creator notifications.' },
    { key:'automod', title:'AutoMod', desc:'Rule-based filters and safety automation.' },
  ];

  function token(){ return localStorage.getItem('dg_token'); }
  function localProfile(){ try { return JSON.parse(localStorage.getItem('dg_profile') || 'null'); } catch { return null; } }
  function deepClone(v){ try { return JSON.parse(JSON.stringify(v || {})); } catch { return {}; } }
  function withTimeout(ms = 7000){ const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), ms); return { controller, done: () => clearTimeout(timer) }; }
  async function fetchJson(url, options = {}, timeoutMs = 7000){
    const t = withTimeout(timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: t.controller.signal, cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
      return data;
    } finally { t.done(); }
  }
  function avatarHtml(u, cls = 'dash-avatar-v26'){
    return u?.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="" class="${cls}">` : `<span class="${cls} dash-avatar-fallback-v25">${esc((u?.display_name || u?.username || u?.name || 'U').slice(0,1).toUpperCase())}</span>`;
  }
  function userChip(u, role){
    const tag = u?.user?.tag || u?.tag || u?.id || 'Discord member';
    return `<div class="access-row-v25 access-person-v27 access-person-v28 access-person-v29">${avatarHtml(u, 'person-avatar-v27')}<div><strong>${esc(u?.name || u?.displayName || u?.display_name || u?.username || 'Unknown')}</strong><small>${esc(tag)}</small></div><b>${esc(role || u?.role || 'Access')}</b></div>`;
  }
  function serverIcon(g, cls = 'server-icon-v26'){
    return g?.icon_url ? `<img src="${esc(g.icon_url)}" alt="" class="${cls}">` : `<span class="${cls} server-icon-fallback-v25">${esc((g?.name || '?').slice(0,1).toUpperCase())}</span>`;
  }
  function discordIcon(){
    return `<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path fill="currentColor" d="M20.3 5.4A16.9 16.9 0 0 0 16.2 4l-.2.4c1.5.5 2.2 1.1 2.2 1.1a13 13 0 0 0-12.4 0S6.5 4.9 8 4.4L7.8 4a16.9 16.9 0 0 0-4.1 1.4C1.1 9.2.4 12.9.8 16.5a16.8 16.8 0 0 0 5.1 2.6l.9-1.5c-.5-.2-1-.4-1.5-.7l.4-.3c2.9 1.4 6.1 1.4 9 0l.4.3c-.5.3-1 .5-1.5.7l.9 1.5a16.8 16.8 0 0 0 5.1-2.6c.5-4.2-.7-7.9-3.3-11.1ZM8.3 14.2c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7.4 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>`;
  }
  function eyeIcon(){
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  }
  function guildStorageKey(guildId){ return `dark_portal_guild_config_${guildId}`; }
  function readGuildConfig(guildId){ try { return JSON.parse(localStorage.getItem(guildStorageKey(guildId)) || '{}') || {}; } catch { return {}; } }
  function saveGuildConfig(guildId, cfg){ try { localStorage.setItem(guildStorageKey(guildId), JSON.stringify(cfg || {})); } catch {} }
  function activeConfig(guildId){
    const setupGuild = currentSetup?.guild || selectedServer;
    return setupGuild && String(setupGuild.id) === String(guildId) ? (workingConfig || {}) : readGuildConfig(guildId);
  }
  function commandsFor(data){
    const arr = Array.isArray(data?.commands) && data.commands.length ? data.commands : fallbackCommands;
    return arr.map(c => ({ name: c.name?.startsWith('/') ? c.name : '/' + (c.name || 'command'), description: c.description || c.desc || 'Dark Bot command.', category: c.category || 'Dark Bot commands', defaultEnabled: true }));
  }
  function commandEnabled(guildId, command){
    const cfg = activeConfig(guildId);
    if (cfg.commands && Object.prototype.hasOwnProperty.call(cfg.commands, command.name)) return !!cfg.commands[command.name];
    return true;
  }
  function setCommandEnabled(guildId, commandName, enabled){
    workingConfig.commands = workingConfig.commands || {};
    workingConfig.commands[commandName] = !!enabled;
    setDirty(true);
  }
  function levelLine(){ const level = currentStats?.progression?.level || 1; const xp = currentStats?.progression?.xp || 0; return `Level ${level} • ${xp} XP`; }
  function inviteButtonHtml(){
    return `<a id="dashInviteBot" class="dashboard-invite-inside-v28 dashboard-invite-inside-v29" href="${esc(currentInvite || '/bot-invite')}" target="_blank" rel="noreferrer"><span class="dashboard-invite-icon-v25 discord-icon-v26">${discordIcon()}</span><span><strong>Add Dark Bot</strong><small>Invite to guild</small></span></a>`;
  }
  function wireInvite(){ const btn = document.getElementById('dashInviteBot'); if (btn) btn.href = currentInvite || '/bot-invite'; }

  function renderUser(u){
    currentUser = u || currentUser;
    if (!u) {
      userCard.innerHTML = `<span class="portal-mini-label">Account</span><strong>Not signed in</strong><small>Sign in with Discord to manage servers.</small>`;
      return;
    }
    userCard.innerHTML = `${avatarHtml(u)}<div><span class="portal-mini-label">Logged in</span><strong>${esc(u.display_name || u.username || 'User')}</strong><small>@${esc(u.username || 'account')} • ${esc(levelLine())}</small></div>`;
  }
  function renderLoading(){
    configPanel.hidden = true;
    serverList.innerHTML = `<div class="dashboard-section-head-v25 dashboard-section-head-v28 dashboard-section-head-v29"><div><span class="portal-mini-label">Discord Bot Control</span><h2>Loading servers...</h2><p>Reading your Discord guilds. This should take only a few seconds.</p></div>${inviteButtonHtml()}</div><div class="server-skeleton-stack-v26"><span></span><span></span><span></span></div>`;
    wireInvite();
  }
  function hasDiscordLinked(){
    const p = currentUser || localProfile() || {};
    return !!(p.discord || p.discord_id || p.linked?.discord);
  }
  function noServersActionHtml(state = {}){
    const linked = state.hasDiscord ?? hasDiscordLinked();
    const label = linked ? 'Refresh Discord access' : 'Link Discord in Profile';
    const title = linked ? 'Discord is linked, but access needs to be refreshed before server controls can load.' : 'Discord is required before bot dashboard controls can load.';
    return `<div class="empty-server-v25"><p class="dashboard-discord-gate-note-v36">${esc(title)}</p><div class="dashboard-action-row-v25"><a class="btn btn-primary" href="/profile.html">${esc(label)}</a></div></div>`;
  }
  function renderNoServers(note, state = {}){
    configPanel.hidden = true;
    const linked = state.hasDiscord ?? hasDiscordLinked();
    const heading = linked ? 'Discord access needs refresh' : 'Discord is not linked';
    const fallback = linked ? 'Refresh Discord access in your Profile to load manageable servers and bot options.' : 'Link Discord in your Profile to load manageable servers and bot options.';
    serverList.innerHTML = `<div class="dashboard-section-head-v25 dashboard-section-head-v28 dashboard-section-head-v29"><div><span class="portal-mini-label">Discord Bot Control</span><h2>${esc(state.heading || heading)}</h2><p>${esc(note || fallback)}</p></div>${inviteButtonHtml()}</div>${noServersActionHtml({ hasDiscord: linked })}`;
    wireInvite();
  }
  function renderServers(guilds, note){
    currentServers = Array.isArray(guilds) ? guilds : [];
    selectedServer = null;
    currentSetup = null;
    currentSection = '';
    setDirty(false, true);
    document.body.classList.remove('dashboard-setup-open-v27');
    configPanel.hidden = true;
    if (!currentServers.length) return renderNoServers(note);
    serverList.hidden = false;
    serverList.innerHTML = `
      <div class="dashboard-section-head-v25 dashboard-section-head-v27 dashboard-section-head-v28 dashboard-section-head-v29">
        <div><span class="portal-mini-label">Discord Bot Control</span><h2>Choose a server</h2><p>Select a server, then open settings below the list.</p></div>
        ${inviteButtonHtml()}
      </div>
      <div class="server-card-stack-v25 server-card-stack-v27 server-card-stack-v28 server-card-stack-v29">
        ${currentServers.map((g, i) => renderServerCard(g, i)).join('')}
      </div>
      <div id="selectedServerAction" class="selected-server-action-v27 selected-server-action-v28 selected-server-action-v29" hidden></div>`;
    wireInvite();
    serverList.querySelectorAll('[data-server-index]').forEach(btn => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.serverIndex || 0);
      selectedServer = currentServers[idx];
      serverList.querySelectorAll('[data-server-index]').forEach(el => el.classList.toggle('is-selected', el === btn));
      renderSelectedAction(selectedServer);
    }));
  }
  function renderServerCard(g, index){
    const cfg = readGuildConfig(g.id);
    const enabledCount = cfg.commands ? Object.values(cfg.commands).filter(Boolean).length : fallbackCommands.length;
    return `<button class="server-card-v25 server-card-v27 server-card-v28 server-card-v29" data-server-index="${index}" type="button">
      ${serverIcon(g, 'server-card-icon-v25')}
      <span class="server-card-main-v25"><strong>${esc(g.name)}</strong><small>${g.owner ? 'Server owner' : 'Manage Server access'}${g.memberCount ? ` • ${esc(g.memberCount)} members` : ''}</small></span>
      <span class="server-card-stats-v25"><b>${esc(enabledCount)}/${fallbackCommands.length}</b><small>commands</small></span>
    </button>`;
  }
  function renderSelectedAction(g){
    const action = document.getElementById('selectedServerAction');
    if (!action || !g) return;
    action.hidden = false;
    action.innerHTML = `<div class="selected-server-action-card-v27 selected-server-action-card-v28 selected-server-action-card-v29">${serverIcon(g, 'selected-action-icon-v27')}<div><span class="portal-mini-label">Selected server</span><strong>${esc(g.name)}</strong><small>Open setup to configure access, commands, moderation and security.</small></div><button id="openServerSetupBtn" class="btn btn-primary" type="button">Open Server Settings</button></div>`;
    document.getElementById('openServerSetupBtn')?.addEventListener('click', () => openServerSetup(g));
  }
  async function openServerSetup(g){
    document.body.classList.add('dashboard-setup-open-v27');
    serverList.hidden = true;
    configPanel.hidden = false;
    configPanel.innerHTML = `<div class="setup-top-v25 setup-top-v28"><button id="backToServerList" class="btn btn-ghost" type="button">← Back to servers</button></div><div class="setup-loading-v27">${serverIcon(g, 'selected-server-icon-v25')}<div><span class="portal-mini-label">Server setup</span><h2>${esc(g.name)}</h2><p>Loading live guild data from Dark Bot...</p></div></div>`;
    document.getElementById('backToServerList')?.addEventListener('click', () => renderServers(currentServers));
    const t = token();
    try {
      currentSetup = await fetchJson(`/api/dashboard/guild/${encodeURIComponent(g.id)}`, { headers: { Authorization: 'Bearer ' + t } }, 7600);
    } catch (err) {
      currentSetup = { guild: g, accessMode: g.owner ? 'Owner' : 'Manage Server', commands: fallbackCommands, access: { adminsAndManagers: [], memberFetchComplete: false, note: err.message || 'Could not load bot data.' }, moderation: { bannedUsers: [], timedOutUsers: [], bansFetchComplete: false, timeoutsFetchComplete: false }, security: { verificationLevel: 'Not synced', mfaLevel: 'Not synced', explicitContentFilter: 'Not synced', automodStatus: 'Not synced', note: err.message || 'Could not load bot data.' }, activity: { executedCommands: 0, note: err.message || 'Bot endpoint unavailable.' }, botEndpointError: err.message || 'Bot endpoint unavailable.' };
    }
    savedConfig = readGuildConfig(g.id);
    workingConfig = deepClone(savedConfig);
    setDirty(false, true);
    renderServerSetup(g, currentSetup);
  }
  function groupCommands(commands){
    return commands.reduce((acc, cmd) => { const key = cmd.category || 'Dark Bot commands'; (acc[key] ||= []).push(cmd); return acc; }, {});
  }
  function renderCommandGroups(g, data){
    const commands = commandsFor(data);
    const grouped = groupCommands(commands);
    return Object.entries(grouped).map(([title, cmds]) => `<article class="command-group-v25 command-group-v27 command-group-v28 command-group-v29"><h3>${esc(title)}</h3>${cmds.map(cmd => {
      const checked = commandEnabled(g.id, cmd);
      const danger = /ban|kick|timeout|clear|mod/i.test(cmd.name + ' ' + title);
      return `<label class="command-toggle-v25 command-toggle-v27 command-toggle-v28 command-toggle-v29 ${danger ? 'is-danger' : ''}"><input type="checkbox" data-command-name="${esc(cmd.name)}" ${checked ? 'checked' : ''}><span class="toggle-ui-v25"></span><span><strong>${esc(cmd.name)}</strong><small>${esc(cmd.description)}</small></span></label>`;
    }).join('')}</article>`).join('');
  }
  function renderAccess(data){
    const rows = [];
    if (data?.owner) rows.push(userChip(data.owner, 'Owner'));
    const admins = data?.access?.adminsAndManagers || [];
    admins.forEach(a => { if (data?.owner?.id && a.id === data.owner.id) return; rows.push(userChip(a, a.role || 'Admin')); });
    if (!rows.length) rows.push(`<div class="empty-mini-v25"><strong>Admin list not synced</strong><p>Dark Bot must be online, inside this guild, and have member intent/permissions enabled to show owners, admins and managers.</p></div>`);
    const note = data?.access?.memberFetchComplete === false ? `<p class="sync-warning-v29">Member sync is incomplete. Enable Server Members Intent for the bot and make sure it can read guild members.</p>` : '';
    return rows.join('') + note;
  }
  function renderSecurity(data){
    const s = data?.security || {};
    const rows = [
      ['Verification level', s.verificationLevel || 'Not synced'],
      ['2FA moderation', s.mfaLevel || 'Not synced'],
      ['Content filter', s.explicitContentFilter || 'Not synced'],
      ['NSFW level', s.nsfwLevel || 'Not synced'],
      ['AutoMod', s.automodStatus || 'Not synced'],
    ];
    const rules = Array.isArray(s.automodRules) && s.automodRules.length ? `<div class="automod-rules-v27 automod-rules-v28 automod-rules-v29">${s.automodRules.map(r => `<div><strong>${esc(r.name)}</strong><small>${r.enabled ? 'Enabled' : 'Disabled'}</small></div>`).join('')}</div>` : `<p class="profile-muted-v22">AutoMod configuration is planned. Live AutoMod rules will appear here when the bot can read them.</p>`;
    const note = s.note ? `<p class="sync-warning-v29">${esc(s.note)}</p>` : '';
    return `${rows.map(([k,v]) => `<div class="activity-row-v25"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}${rules}${note}`;
  }
  function renderModeration(data){
    const m = data?.moderation || {};
    const bans = Array.isArray(m.bannedUsers) ? m.bannedUsers : [];
    const timeouts = Array.isArray(m.timedOutUsers) ? m.timedOutUsers : [];
    const bansHtml = bans.length ? bans.map(u => userChip(u, 'Banned')).join('') : `<div class="empty-mini-v25"><strong>No banned users shown</strong><p>${m.bansFetchComplete === false ? 'Bans did not sync. Make sure Dark Bot has Ban Members permission.' : 'No banned users were returned for this guild.'}</p></div>`;
    const timeoutsHtml = timeouts.length ? timeouts.map(u => userChip(u, 'Timeout')).join('') : `<div class="empty-mini-v25"><strong>No timed-out users shown</strong><p>${m.timeoutsFetchComplete === false ? 'Timeouts did not sync. Enable member intent and restart the bot.' : 'No active timeouts were returned.'}</p></div>`;
    return `<div class="moderation-columns-v27 moderation-columns-v28 moderation-columns-v29"><div><h4>Banned users</h4>${bansHtml}</div><div><h4>Timeouts</h4>${timeoutsHtml}</div></div>`;
  }
  function renderPlugins(){
    return `<div class="plugin-locked-v29"><div><span class="portal-mini-label">Plugins</span><h3>Plugins are under development</h3><p>Autorole, Welcome & Goodbye, Member Levels, Reaction Roles, Ticket System, Social Alerts and AutoMod are prepared as future setup cards.</p></div><div class="plugin-grid-v29">${pluginIdeas.map(m => `<article><small>Under development</small><strong>${esc(m.title)}</strong><span>${esc(m.desc)}</span></article>`).join('')}</div></div>`;
  }
  function sectionContent(section, guild, data){
    const commandCount = commandsFor(data).length;
    if (section === 'access') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29"><span class="portal-mini-label">Admins & managers</span><h3>Dashboard access</h3><p>Server owner, administrators and members with Manage Server access are listed here from the live bot sync.</p><div class="access-list-v25 access-list-v27">${renderAccess(data)}</div></article>`;
    if (section === 'commands') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29"><span class="portal-mini-label">Command permissions</span><h3>${commandCount} commands enabled by default</h3><p>All commands start enabled. Turn off only the commands you do not want in this guild.</p><div class="commands-grid-v25 commands-grid-v27 commands-grid-v28 commands-grid-v29">${renderCommandGroups(guild, data)}</div></article>`;
    if (section === 'security') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29"><span class="portal-mini-label">Security</span><h3>Server security</h3><div class="activity-list-v25">${renderSecurity(data)}</div></article>`;
    if (section === 'moderation') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29"><span class="portal-mini-label">Moderation</span><h3>Bans & timeouts</h3>${renderModeration(data)}</article>`;
    if (section === 'plugins') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29 setup-card-disabled-v29">${renderPlugins()}</article>`;
    return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29 setup-empty-v28"><span class="portal-mini-label">Setup</span><h3>Select a setup section</h3><p>Pick one section above to view or edit access, commands, moderation or security.</p></article>`;
  }
  function setDirty(next, silent){
    isDirty = !!next;
    const bar = document.getElementById('guildUnsavedBar');
    if (bar) bar.hidden = !isDirty;
    if (!silent) document.body.classList.toggle('has-dashboard-unsaved-v29', isDirty);
  }
  function wireSectionContent(content, guild){
    content.querySelectorAll('[data-command-name]').forEach(input => input.addEventListener('change', (e) => {
      setCommandEnabled(guild.id, e.currentTarget.dataset.commandName, e.currentTarget.checked);
    }));
  }
  function renderSection(section){
    if (!currentSetup) return;
    const guild = currentSetup?.guild || selectedServer;
    const existingInline = configPanel.querySelector(`.setup-section-inline-v32[data-section="${section}"]`);

    // If the same open row is clicked again, collapse it instead of leaving the panel open.
    if (currentSection === section && existingInline) {
      existingInline.remove();
      currentSection = '';
      configPanel.querySelectorAll('[data-setup-section]').forEach(btn => btn.classList.remove('is-active'));
      const placeholder = configPanel.querySelector('.setup-section-placeholder-v32');
      if (placeholder) placeholder.hidden = false;
      return;
    }

    currentSection = section;
    configPanel.querySelectorAll('[data-setup-section]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.setupSection === section));

    // Show the selected section immediately under the clicked row,
    // not at the bottom of the whole setup card.
    configPanel.querySelectorAll('.setup-section-inline-v32').forEach(el => el.remove());
    const placeholder = configPanel.querySelector('.setup-section-placeholder-v32');
    if (placeholder) placeholder.hidden = true;
    const clicked = configPanel.querySelector(`[data-setup-section="${section}"]`);
    if (!clicked) return;
    const content = document.createElement('div');
    content.id = 'setupSectionContent';
    content.dataset.section = section;
    content.className = 'setup-section-content-v28 setup-section-content-v29 setup-section-content-v30 setup-section-content-v31 setup-section-inline-v32';
    content.innerHTML = sectionContent(section, guild, currentSetup);
    clicked.insertAdjacentElement('afterend', content);
    wireSectionContent(content, guild);
    content.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function renderServerSetup(g, data){
    const guild = data?.guild || g;
    currentSetup = data;
    const commandCount = commandsFor(data).length;
    const bansCount = data?.moderation?.bannedUsers?.length || 0;
    const timeoutCount = data?.moderation?.timedOutUsers?.length || 0;
    const accessCount = (data?.access?.adminsAndManagers?.length || 0) + (data?.owner ? 1 : 0);
    const source = data?.botEndpointError ? 'Sync issue' : 'Live sync';
    configPanel.innerHTML = `<div class="setup-top-v25 setup-top-v27 setup-top-v28 setup-top-v29"><button id="backToServerList" class="btn btn-ghost" type="button">← Back to servers</button><span class="setup-source-v29">${esc(source)}</span></div>
      <div class="selected-server-head-v25 setup-main-head-v25 setup-main-head-v27 setup-main-head-v28 setup-main-head-v29">${serverIcon(guild, 'selected-server-icon-v25')}<div><span class="portal-mini-label">Server setup</span><h2>${esc(guild.name)}</h2><p>${esc(data?.botEndpointError ? 'Live sync is unavailable. Start Dark Bot or check permissions to get exact bans, admins and security.' : 'Choose a section below. Settings changes wait for Save Settings before they are stored.')}</p></div></div>
      <div class="setup-section-tabs-v28 setup-section-tabs-v29 setup-section-tabs-v30 setup-section-tabs-v31" role="tablist" aria-label="Server setup sections">
        <button data-setup-section="access" type="button"><span>Admins</span><b>${accessCount || 0}</b><i>${eyeIcon()}</i></button>
        <button data-setup-section="commands" type="button"><span>Commands</span><b>${commandCount}</b><i>${eyeIcon()}</i></button>
        <button data-setup-section="plugins" type="button" disabled aria-disabled="true" title="Plugins are under development"><span>Plugins</span><b>0</b><i>${eyeIcon()}</i></button>
        <button data-setup-section="moderation" type="button"><span>Bans / Timeouts</span><b>${bansCount + timeoutCount}</b><i>${eyeIcon()}</i></button>
        <button data-setup-section="security" type="button"><span>Security</span><b>${data?.security?.synced === false ? 0 : 1}</b><i>${eyeIcon()}</i></button>
      </div>
      <div id="setupSectionContent" class="setup-section-content-v28 setup-section-content-v29 setup-section-content-v30 setup-section-content-v31 setup-section-placeholder-v32">${sectionContent('', guild, data)}</div>
      <div id="guildUnsavedBar" class="guild-unsaved-bar-v29 guild-unsaved-bar-v30" hidden><button id="revertSetupChanges" class="btn btn-ghost" type="button">Revert</button><strong>Unsaved settings</strong><button id="saveSetupSettings" class="btn btn-primary" type="button">Save Settings</button></div>`;
    configPanel.querySelectorAll('[data-setup-section]:not([disabled])').forEach(btn => btn.addEventListener('click', () => renderSection(btn.dataset.setupSection)));
    document.getElementById('backToServerList')?.addEventListener('click', () => renderServers(currentServers));
    document.getElementById('revertSetupChanges')?.addEventListener('click', () => {
      workingConfig = deepClone(savedConfig);
      setDirty(false);
      renderSection(currentSection || '');
    });
    document.getElementById('saveSetupSettings')?.addEventListener('click', () => {
      workingConfig.updatedAt = new Date().toISOString();
      saveGuildConfig(guild.id, workingConfig);
      savedConfig = deepClone(workingConfig);
      setDirty(false);
      const btn = document.getElementById('saveSetupSettings');
      if (btn) { const old = btn.textContent; btn.textContent = 'Saved'; setTimeout(() => { btn.textContent = old || 'Save Settings'; }, 1200); }
    });
  }

  async function init(){
    const saved = localProfile();
    renderUser(saved);
    renderLoading();
    try { await Promise.race([window.DGAuth?.syncSessionFromToken?.(), new Promise(resolve => setTimeout(resolve, 1500))]); } catch {}
    const t = token();
    if (!t && !localProfile()) { window.location.href = '/login.html?next=/dashboard.html'; return; }
    if (!t) { renderNoServers('Sign in again to load live Discord servers.'); return; }
    try {
      const data = await fetchJson('/api/dashboard', { headers: { Authorization: 'Bearer ' + t } }, 9000);
      currentUser = data.user || localProfile();
      if (data.user) window.DGAuth?.setProfile?.(data.user);
      if (data.botInvite) currentInvite = data.botInvite;
      renderUser(currentUser);
      if (data.needsDiscordLink || data.needsDiscordRefresh) {
        renderNoServers(data.managedServersNote, {
          hasDiscord: !data.needsDiscordLink,
          heading: data.needsDiscordRefresh ? 'Refresh Discord access' : 'Discord is not linked'
        });
      } else {
        renderServers(data.managedServers || [], data.managedServersNote);
      }
      try {
        const statsData = await fetchJson('/api/stats', { headers: { Authorization: 'Bearer ' + t } }, 4200);
        if (statsData?.stats) { currentStats = statsData.stats; renderUser(currentUser); }
      } catch {}
    } catch (err) {
      renderNoServers(err.name === 'AbortError' ? 'Dashboard API took too long. Restart the site server or refresh Discord login.' : (err.message || 'Could not load dashboard.'));
      renderUser(localProfile() || null);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
