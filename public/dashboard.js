// Dashboard v47 — silent Discord reauth and compact empty server state
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
  let currentPluginTab = 'welcome';

  const fallbackCommands = [
    ['/ping','Check bot latency and health.','Core utilities'],
    ['/serverinfo','Show server information.','Core utilities'],
    ['/userinfo','Show member information.','Core utilities'],
    ['/music','Music controls.','Core utilities'],
    ['/ai','AI assistant command.','Core utilities'],
    ['/help','Show commands, dashboard links and plugin information.','Community'],
    ['/dashboard','Open the Dark Portal dashboard.','Community'],
    ['/reload','Reload command registration.','Community'],
    ['/meme','Send a meme response.','Community'],
    ['/quote','Send a random quote.','Community'],
    ['/dark','Dark Bot portal command.','Community'],
    ['/darkgames','Open Dark Portal games.','Core utilities'],
    ['/feedback','Send a ticket from the Feedback tab.','Community'],
    ['/ban','Ban members from the guild.','Moderation'],
    ['/kick','Kick members from the guild.','Moderation'],
    ['/timeout','Timeout members.','Moderation'],
    ['/clear','Bulk delete messages.','Moderation'],
    ['/welcome','Configure welcome, goodbye and DM messages.','Plugins'],
    ['/reactionrole','Configure reaction role messages.','Plugins'],
    ['/autorole','Configure automatic join roles.','Plugins'],
  ].map(([name, description, category]) => ({ name, description, category, defaultEnabled: true }));
  const removedCommandsV61 = new Set(['/test', '/example', '/voicetest']);

  const pluginIdeas = [
    { key:'welcome', title:'Welcome & Goodbye', desc:'Welcome, leave, DM and onboarding messages.', status:'active' },
    { key:'reaction_roles', title:'Reaction Roles', desc:'Members choose roles by reacting to a configured message.', status:'active' },
    { key:'autorole', title:'Auto Role', desc:'Automatically give selected roles to new members.', status:'active' },
    { key:'levels', title:'Member Levels', desc:'XP, ranks and activity rewards for guild members.' },
    { key:'tickets', title:'Ticket System', desc:'Support tickets for feedback, reports and guild help.' },
    { key:'social_alerts', title:'Social Alerts', desc:'Twitch, YouTube and creator notifications.' },
    { key:'automod', title:'AutoMod', desc:'Rule-based filters and safety automation.' },
  ];
  const pluginTabs = pluginIdeas.filter((plugin) => plugin.status === 'active');
  const welcomeColors = ['#7a35ff', '#29a8ff', '#35f29a', '#ffd166', '#ff4a83', '#f0abfc', '#ffffff', '#5865f2', '#f97316', '#22d3ee', '#a3e635', '#facc15'];
  const setupSectionKeys = ['plugins', 'commands', 'access', 'security', 'moderation'];
  const isServerConfigPage = document.body.classList.contains('server-config-route-v55') || document.body.classList.contains('server-config-route-v57') || document.body.classList.contains('server-config-route-v58');

  function token(){ return localStorage.getItem('dg_token'); }
  function localProfile(){ try { return JSON.parse(localStorage.getItem('dg_profile') || 'null'); } catch { return null; } }
  function deepClone(v){ try { return JSON.parse(JSON.stringify(v || {})); } catch { return {}; } }
  function staticManagedServers(){
    try {
      const saved = JSON.parse(localStorage.getItem('dark_portal_static_servers') || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return [{ id: '100000000000000001', name: 'Dark Portal Demo Server', owner: true, memberCount: 128, icon_url: '' }];
  }
  function staticGuildDashboard(guild){
    const cfg = normalizeDashboardConfig(readGuildConfig(guild.id));
    return {
      guild,
      manageableGuild: guild,
      accessMode: guild.owner ? 'Owner' : 'Manage Server',
      channels: { text: [
        { id: '100000000000000101', name: 'general', canSendMessages: true },
        { id: '100000000000000102', name: 'welcome', canSendMessages: true },
        { id: '100000000000000103', name: 'logs', canSendMessages: true }
      ] },
      roles: [
        { id: '100000000000000201', name: 'Member', editable: true },
        { id: '100000000000000202', name: 'Verified', editable: true },
        { id: '100000000000000203', name: 'Muted', editable: true }
      ],
      commands: fallbackCommands,
      commandConfig: cfg.commands,
      commandSettings: cfg.commands,
      plugins: cfg.plugins,
      owner: { name: 'Server Owner', username: 'owner', tag: 'owner#0001', avatar_url: '' },
      access: { adminsAndManagers: [{ name: 'Server Owner', username: 'owner', role: 'Owner', tag: 'owner#0001', avatar_url: '' }], memberFetchComplete: true, note: 'Static Netlify demo data. Settings are saved in this browser only.' },
      moderation: { bannedUsers: [], timedOutUsers: [], bansFetchComplete: true, timeoutsFetchComplete: true },
      security: { verificationLevel: 'Medium', mfaLevel: 'Enabled for moderators', explicitContentFilter: 'Enabled', automodStatus: 'Static preview', note: 'Static demo values.' },
      activity: { executedCommands: 0, note: 'Static Netlify build: no live bot telemetry.' }
    };
  }
  async function loadGuildDashboard(guild, bearerToken){
    return staticGuildDashboard(guild);
  }
  async function saveGuildPlugins(guildId, plugins, commands = {}){
    const cfg = normalizeDashboardConfig({ plugins, commands });
    saveGuildConfig(guildId, cfg);
    return { plugins: cfg.plugins, commands: cfg.commands, static: true };
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
  function defaultWelcomeConfig(){
    return {
      enabled: false,
      welcomeEnabled: true,
      goodbyeEnabled: false,
      dmEnabled: false,
      channelId: '',
      welcomeMessage: 'Welcome {user} to {server}!',
      goodbyeMessage: '{username} left {server}.',
      dmMessage: 'Welcome to {server}, {username}!',
      embedTitle: 'Welcome to {server}',
      goodbyeTitle: 'Goodbye from {server}',
      welcomeImageUrl: '',
      goodbyeImageUrl: '',
      color: '#7a35ff'
    };
  }
  function defaultAutoroleConfig(){ return { enabled: false, roleIds: [], delaySeconds: 0 }; }
  function defaultReactionRolesConfig(){ return { enabled: false, channelId: '', messageId: '', prompt: 'Choose your role by reacting below.', imageUrl: '', roles: [], color: '#7a35ff' }; }
  function normalizeWelcomeConfig(value){
    const base = defaultWelcomeConfig();
    const src = value || {};
    const cleanText = (text, fallback, max = 280) => String(text ?? fallback).replace(/\r/g, '').trim().slice(0, max) || fallback;
    const cleanMediaUrl = (url) => {
      const text = String(url || '').trim().slice(0, 240);
      if (!text) return '';
      return /^(https?:)?\/\//i.test(text) || /^data:image\//i.test(text) ? text : '';
    };
    const channelId = String(src.channelId || '').trim();
    const color = String(src.color || '').trim();
    return {
      enabled: !!src.enabled,
      welcomeEnabled: src.welcomeEnabled !== false,
      goodbyeEnabled: !!src.goodbyeEnabled,
      dmEnabled: !!src.dmEnabled,
      channelId: /^\d{5,30}$/.test(channelId) ? channelId : '',
      welcomeMessage: cleanText(src.welcomeMessage, base.welcomeMessage, 280),
      goodbyeMessage: cleanText(src.goodbyeMessage, base.goodbyeMessage, 280),
      dmMessage: cleanText(src.dmMessage, base.dmMessage, 320),
      embedTitle: cleanText(src.embedTitle, base.embedTitle, 80),
      goodbyeTitle: cleanText(src.goodbyeTitle, base.goodbyeTitle, 80),
      welcomeImageUrl: cleanMediaUrl(src.welcomeImageUrl),
      goodbyeImageUrl: cleanMediaUrl(src.goodbyeImageUrl),
      color: /^#?[0-9a-f]{6}$/i.test(color) ? (color.startsWith('#') ? color : `#${color}`).toLowerCase() : base.color
    };
  }
  function cleanRoleId(value){ const text = String(value || '').trim(); return /^\d{5,30}$/.test(text) ? text : ''; }
  function roleIdsFromText(value){
    const values = Array.isArray(value) ? value : String(value || '').split(/[,\s]+/);
    return [...new Set(values.map(cleanRoleId).filter(Boolean))].slice(0, 12);
  }
  function normalizeAutoroleConfig(value){
    const base = defaultAutoroleConfig();
    const src = value || {};
    const delay = Number(src.delaySeconds || 0);
    return {
      enabled: !!src.enabled,
      roleIds: roleIdsFromText(src.roleIds || src.roles || base.roleIds),
      delaySeconds: Number.isFinite(delay) ? Math.max(0, Math.min(86400, Math.round(delay))) : 0
    };
  }
  function normalizeReactionRoleItem(value){
    const src = value || {};
    const roleId = cleanRoleId(src.roleId || src.role);
    const emoji = String(src.emoji || '').trim().slice(0, 80);
    if (!roleId && !emoji) return null;
    return { emoji, roleId, label: String(src.label || 'Reaction role').trim().slice(0, 80) || 'Reaction role' };
  }
  function normalizeReactionRolesConfig(value){
    const base = defaultReactionRolesConfig();
    const src = value || {};
    const color = String(src.color || '').trim();
    const imageText = String(src.imageUrl || src.reactionImageUrl || '').trim().slice(0, 240);
    const imageUrl = imageText && (/^(https?:)?\/\//i.test(imageText) || /^data:image\//i.test(imageText)) ? imageText : '';
    return {
      enabled: !!src.enabled,
      channelId: cleanRoleId(src.channelId),
      messageId: cleanRoleId(src.messageId),
      prompt: String(src.prompt || base.prompt).replace(/\r/g, '').trim().slice(0, 420) || base.prompt,
      imageUrl,
      roles: (Array.isArray(src.roles) ? src.roles : []).map(normalizeReactionRoleItem).filter(Boolean).slice(0, 12),
      color: /^#?[0-9a-f]{6}$/i.test(color) ? (color.startsWith('#') ? color : `#${color}`).toLowerCase() : base.color
    };
  }
  function normalizeCommandConfig(value){
    const src = value && typeof value === 'object' ? value : {};
    const out = {};
    Object.entries(src).forEach(([key, enabled]) => {
      let name = String(key || '').trim().toLowerCase().replace(/^\/+/, '');
      if (!name || !/^[a-z0-9_-]{1,32}$/.test(name)) return;
      name = '/' + name;
      if (removedCommandsV61.has(name)) return;
      out[name] = !(enabled === false || enabled === 'false' || enabled === 0 || enabled === '0');
    });
    return out;
  }
  function normalizeDashboardConfig(value){
    const cfg = deepClone(value || {});
    cfg.plugins = cfg.plugins || {};
    cfg.plugins.welcome = normalizeWelcomeConfig(cfg.plugins.welcome);
    cfg.plugins.autorole = normalizeAutoroleConfig(cfg.plugins.autorole || cfg.plugins.auto_role);
    cfg.plugins.reaction_roles = normalizeReactionRolesConfig(cfg.plugins.reaction_roles || cfg.plugins.reactionRoles);
    cfg.commands = normalizeCommandConfig(cfg.commands || cfg.commandConfig || cfg.commandSettings || cfg.commandsConfig);
    return cfg;
  }
  function currentWelcomeConfig(guildId){
    const cfg = activeConfig(guildId);
    return normalizeWelcomeConfig(cfg?.plugins?.welcome);
  }
  function currentAutoroleConfig(guildId){
    const cfg = activeConfig(guildId);
    return normalizeAutoroleConfig(cfg?.plugins?.autorole);
  }
  function currentReactionRolesConfig(guildId){
    const cfg = activeConfig(guildId);
    return normalizeReactionRolesConfig(cfg?.plugins?.reaction_roles);
  }
  function pluginEnabledCount(guildId){
    const cfg = activeConfig(guildId);
    return ['welcome', 'autorole', 'reaction_roles'].filter((key) => cfg?.plugins?.[key]?.enabled).length;
  }
  function setPluginConfigValue(pluginKey, field, value){
    workingConfig.plugins = workingConfig.plugins || {};
    const normalizers = { welcome: normalizeWelcomeConfig, autorole: normalizeAutoroleConfig, reaction_roles: normalizeReactionRolesConfig };
    const normalize = normalizers[pluginKey];
    if (!normalize) return;
    const current = normalize(workingConfig.plugins[pluginKey]);
    workingConfig.plugins[pluginKey] = normalize({ ...current, [field]: value });
    setDirty(true);
  }
  const setWelcomeConfigValue = (field, value) => setPluginConfigValue('welcome', field, value);
  const setAutoroleConfigValue = (field, value) => setPluginConfigValue('autorole', field, value);
  const setReactionRolesConfigValue = (field, value) => setPluginConfigValue('reaction_roles', field, value);
  function canonicalCommandCategory(name, category){
    const commandName = String(name || '').replace(/^\//, '').toLowerCase();
    if (removedCommandsV61.has('/' + commandName)) return 'Removed';
    if (['feedback', 'help', 'dashboard', 'reload'].includes(commandName)) return 'Community';
    if (['ai', 'music', 'darkgames'].includes(commandName)) return 'Core utilities';
    if (['welcome', 'reactionrole', 'autorole'].includes(commandName)) return 'Plugins';
    const raw = String(category || '').trim().toLowerCase();
    if (raw === 'core utilities' || raw === 'core utility' || raw === 'utilities') return 'Core utilities';
    if (raw === 'community') return 'Community';
    if (raw === 'moderation' || raw === 'guild administration') return 'Moderation';
    if (raw === 'plugins' || raw === 'plugin') return 'Plugins';
    if (raw === 'games') return 'Games';
    if (raw === 'support') return 'Support';
    if (raw === 'ai' || raw === 'music') return 'Core utilities';
    return category || 'Dark Bot commands';
  }
  function commandsFor(data){
    const arr = Array.isArray(data?.commands) && data.commands.length ? data.commands : fallbackCommands;
    return arr.map(c => {
      const name = c.name?.startsWith('/') ? c.name : '/' + (c.name || 'command');
      return { name, description: c.description || c.desc || 'Dark Bot command.', category: canonicalCommandCategory(name, c.category), defaultEnabled: true };
    }).filter((cmd) => !removedCommandsV61.has(cmd.name) && cmd.category !== 'Removed');
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
  function requestedGuildId(){ return new URLSearchParams(window.location.search).get('guild') || ''; }
  function requestedSection(){
    const section = new URLSearchParams(window.location.search).get('section') || 'plugins';
    return setupSectionKeys.includes(section) ? section : 'plugins';
  }
  function dashboardNextPath(){
    return isServerConfigPage ? `/server-config.html${window.location.search || ''}` : '/dashboard.html';
  }
  function serverConfigUrl(guildId, section = 'plugins'){
    const key = setupSectionKeys.includes(section) ? section : 'plugins';
    return `/server-config.html?guild=${encodeURIComponent(String(guildId || ''))}&section=${encodeURIComponent(key)}`;
  }
  function updateDashboardUrl(guildId, section = 'plugins', replace = false){
    const url = new URL(window.location.href);
    url.pathname = isServerConfigPage ? '/server-config.html' : '/dashboard.html';
    url.searchParams.set('guild', String(guildId || ''));
    url.searchParams.set('section', setupSectionKeys.includes(section) ? section : 'plugins');
    const next = `${url.pathname}?${url.searchParams.toString()}`;
    window.history[replace ? 'replaceState' : 'pushState']({ guildId, section }, '', next);
  }
  function clearDashboardUrl(){
    if (isServerConfigPage) {
      window.location.href = '/dashboard.html';
      return;
    }
    window.history.pushState({}, '', '/dashboard.html');
  }
  function syncedTextChannels(data = currentSetup){
    return Array.isArray(data?.channels?.text) ? data.channels.text : [];
  }
  function syncedRoles(data = currentSetup){
    return Array.isArray(data?.roles) ? data.roles : [];
  }
  function channelName(data, channelId){
    const id = String(channelId || '');
    const channel = syncedTextChannels(data).find((item) => String(item.id) === id);
    return channel ? `#${channel.name}` : id;
  }
  function roleName(data, roleId){
    const id = String(roleId || '');
    const role = syncedRoles(data).find((item) => String(item.id) === id);
    return role ? role.name : id;
  }
  function channelSelectHtml(data, selected, attrs = ''){
    const selectedId = cleanRoleId(selected);
    const channels = syncedTextChannels(data);
    const hasSelected = channels.some((channel) => String(channel.id) === selectedId);
    const options = [
      `<option value="">Choose a channel</option>`,
      selectedId && !hasSelected ? `<option value="${esc(selectedId)}" selected>Current channel (${esc(selectedId)})</option>` : '',
      ...channels.map((channel) => `<option value="${esc(channel.id)}" ${String(channel.id) === selectedId ? 'selected' : ''}>#${esc(channel.name)}${channel.canSendMessages === false ? ' - bot cannot send' : ''}</option>`)
    ].join('');
    return `<select ${attrs} ${channels.length ? '' : 'disabled'}>${channels.length || selectedId ? options : '<option value="">No synced channels yet</option>'}</select>`;
  }
  function roleSelectHtml(data, selected, attrs = ''){
    const selectedId = cleanRoleId(selected);
    const roles = syncedRoles(data);
    const hasSelected = roles.some((role) => String(role.id) === selectedId);
    const options = [
      `<option value="">Choose a role</option>`,
      selectedId && !hasSelected ? `<option value="${esc(selectedId)}" selected>Current role (${esc(selectedId)})</option>` : '',
      ...roles.map((role) => `<option value="${esc(role.id)}" ${String(role.id) === selectedId ? 'selected' : ''}>${esc(role.name)}${role.managed ? ' - managed' : ''}${role.editable === false ? ' - check bot role' : ''}</option>`)
    ].join('');
    return `<select ${attrs} ${roles.length ? '' : 'disabled'}>${roles.length || selectedId ? options : '<option value="">No synced roles yet</option>'}</select>`;
  }

  const DASHBOARD_DISCORD_AUTH_KEY = 'dark_portal_dashboard_discord_auth_started_at';
  function discordAuthFallbackUrl(next){
    return `/login.html?next=${encodeURIComponent(next || dashboardNextPath())}`;
  }
  function autoDiscordAuthRecentlyStarted(){
    try {
      const last = Number(sessionStorage.getItem(DASHBOARD_DISCORD_AUTH_KEY) || 0);
      return last && Date.now() - last < 120000;
    } catch { return false; }
  }
  function rememberAutoDiscordAuth(){
    try { sessionStorage.setItem(DASHBOARD_DISCORD_AUTH_KEY, String(Date.now())); } catch {}
  }
  async function discordAuthorizationUrl(){
    return `/login.html?next=${encodeURIComponent(dashboardNextPath())}`;
  }
  function renderDiscordRedirect(reason){
    if (isServerConfigPage) {
      serverList.hidden = true;
      configPanel.hidden = false;
      configPanel.innerHTML = `<div class="server-config-empty-v55"><span class="portal-mini-label">Discord authorization</span><h2>Opening Discord...</h2><p>${esc(reason || 'Reloading your Discord authorization so server controls can sync.')}</p><a class="btn btn-primary" data-discord-auth href="${esc(discordAuthFallbackUrl())}">Continue to Discord</a></div>`;
      wireDiscordAuthButtons();
      return;
    }
    configPanel.hidden = true;
    serverList.hidden = false;
    serverList.innerHTML = `<div class="dashboard-section-head-v25 dashboard-section-head-v28 dashboard-section-head-v29"><div><span class="portal-mini-label">Discord authorization</span><h2>Opening Discord...</h2><p>${esc(reason || 'Reloading your Discord authorization so server controls can sync.')}</p></div>${inviteButtonHtml()}</div><div class="empty-server-v25 empty-server-v47"><div class="dashboard-action-row-v25"><a class="btn btn-primary" data-discord-auth href="${esc(discordAuthFallbackUrl())}">Continue to Discord</a></div></div>`;
    wireInvite();
    wireDiscordAuthButtons();
  }
  async function startDiscordAuthorization(reason){
    renderDiscordRedirect(reason || 'This Netlify build runs without live Discord OAuth. Use the demo server or deploy the backend separately for live guild data.');
    return false;
  }
  function wireDiscordAuthButtons(){
    document.querySelectorAll('[data-discord-auth]').forEach((btn) => {
      if (btn.dataset.discordAuthWired) return;
      btn.dataset.discordAuthWired = 'true';
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = `/login.html?next=${encodeURIComponent(dashboardNextPath())}`;
      });
    });
  }

  function renderUser(u){
    currentUser = u || currentUser;
    if (!u) {
      userCard.innerHTML = `<span class="portal-mini-label">Account</span><strong>Not signed in</strong><small>Sign in with Discord to manage servers.</small>`;
      return;
    }
    userCard.innerHTML = `${avatarHtml(u)}<div><span class="portal-mini-label">Logged in</span><strong>${esc(u.display_name || u.username || 'User')}</strong><small>@${esc(u.username || 'account')} • ${esc(levelLine())}</small></div>`;
  }
  function renderLoading(){
    if (isServerConfigPage) {
      serverList.hidden = true;
      configPanel.hidden = false;
      configPanel.innerHTML = `<div class="server-config-empty-v55"><span class="portal-mini-label">Server configuration</span><h2>Loading server...</h2><p>Reading your Discord servers and preparing the configuration page.</p></div>`;
      return;
    }
    configPanel.hidden = true;
    serverList.innerHTML = `<div class="dashboard-section-head-v25 dashboard-section-head-v28 dashboard-section-head-v29"><div><span class="portal-mini-label">Discord Bot Control</span><h2>Loading servers...</h2><p>Reading your Discord guilds. This should take only a few seconds.</p></div>${inviteButtonHtml()}</div><div class="server-skeleton-stack-v26"><span></span><span></span><span></span></div>`;
    wireInvite();
  }
  function hasDiscordLinked(){
    const p = currentUser || localProfile() || {};
    return !!(p.discord || p.discord_id || p.linked?.discord);
  }
  function renderEmptyServers(note){
    if (isServerConfigPage) {
      serverList.hidden = true;
      configPanel.hidden = false;
      configPanel.innerHTML = `<div class="server-config-empty-v55"><span class="portal-mini-label">Server configuration</span><h2>Cannot load this server</h2><p>${esc(note || 'Discord access needs to be refreshed before this server can be configured.')}</p><div class="dashboard-action-row-v25"><a class="btn btn-primary" data-discord-auth href="${esc(discordAuthFallbackUrl())}">Refresh Discord access</a><a class="btn btn-ghost" href="/dashboard.html">Back to Dashboard</a></div></div>`;
      wireDiscordAuthButtons();
      return;
    }
    configPanel.hidden = true;
    serverList.hidden = false;
    serverList.innerHTML = `
      <div class="dashboard-section-head-v25 dashboard-section-head-v27 dashboard-section-head-v28 dashboard-section-head-v29">
        <div><span class="portal-mini-label">Discord Bot Control</span><h2>Choose a server</h2><p>${esc(note || 'Discord access needs to be refreshed before your manageable servers can load.')}</p></div>
        ${inviteButtonHtml()}
      </div>
      ${noServersActionHtml()}`;
    wireInvite();
    wireDiscordAuthButtons();
  }

  function noServersActionHtml(state = {}){
    const linked = state.hasDiscord ?? hasDiscordLinked();
    const label = linked ? 'Refresh Discord access' : 'Link Discord';
    const title = linked ? 'Discord is linked, but access needs to be refreshed before server controls can load.' : 'Discord is required before bot dashboard controls can load.';
    return `<div class="empty-server-v25"><p class="dashboard-discord-gate-note-v36">${esc(title)}</p><div class="dashboard-action-row-v25"><a class="btn btn-primary" data-discord-auth href="${esc(discordAuthFallbackUrl())}">${esc(label)}</a><a class="btn btn-ghost" href="/profile.html">Open Profile</a></div></div>`;
  }
  function renderNoServers(note, state = {}){
    renderEmptyServers(state.emptyNote || '');
  }
  function renderServers(guilds, note){
    currentServers = Array.isArray(guilds) ? guilds : [];
    selectedServer = null;
    currentSetup = null;
    currentSection = '';
    setDirty(false, true);
    document.body.classList.remove('dashboard-setup-open-v27');
    configPanel.hidden = true;
    if (!currentServers.length) {
      (async () => {
        const started = await startDiscordAuthorization(note || 'No manageable servers loaded. Discord authorization will be refreshed.');
        if (!started) renderEmptyServers('');
      })();
      return;
    }
    const queryGuild = requestedGuildId();
    if (isServerConfigPage) {
      serverList.hidden = true;
      configPanel.hidden = false;
      document.body.classList.add('dashboard-setup-open-v27');
      if (!queryGuild) {
        configPanel.innerHTML = `<div class="server-config-empty-v55"><span class="portal-mini-label">Server configuration</span><h2>Select a server first</h2><p>Open the Dashboard and choose the Discord server you want to configure.</p><a class="btn btn-primary" href="/dashboard.html">Open Dashboard</a></div>`;
        return;
      }
      const directGuild = currentServers.find((guild) => String(guild.id) === String(queryGuild));
      if (directGuild) {
        openServerSetup(directGuild, { section: requestedSection(), replaceUrl: true });
        return;
      }
      configPanel.innerHTML = `<div class="server-config-empty-v55"><span class="portal-mini-label">Server configuration</span><h2>Server not available</h2><p>This Discord account cannot manage that guild, or Discord access needs to be refreshed.</p><a class="btn btn-primary" href="/dashboard.html">Back to servers</a></div>`;
      return;
    }
    if (queryGuild) {
      window.location.replace(serverConfigUrl(queryGuild, requestedSection()));
      return;
    }
    serverList.hidden = false;
    serverList.innerHTML = `
      <div class="dashboard-section-head-v25 dashboard-section-head-v27 dashboard-section-head-v28 dashboard-section-head-v29">
        <div><span class="portal-mini-label">Discord Bot Control</span><h2>Choose a server</h2><p>Select a server to open its settings instantly.</p></div>
        ${inviteButtonHtml()}
      </div>
      <div class="server-card-stack-v25 server-card-stack-v27 server-card-stack-v28 server-card-stack-v29">
        ${currentServers.map((g, i) => renderServerCard(g, i)).join('')}
      </div>`;
    wireInvite();
    serverList.querySelectorAll('[data-server-index]').forEach(btn => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.serverIndex || 0);
      selectedServer = currentServers[idx];
      serverList.querySelectorAll('[data-server-index]').forEach(el => el.classList.toggle('is-selected', el === btn));
      if (selectedServer) window.location.href = serverConfigUrl(selectedServer.id, 'plugins');
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
    if (g) window.location.href = serverConfigUrl(g.id, 'plugins');
  }
  async function openServerSetup(g, options = {}){
    selectedServer = g;
    const targetSection = setupSectionKeys.includes(options.section) ? options.section : 'plugins';
    updateDashboardUrl(g.id, targetSection, !!options.replaceUrl);
    document.body.classList.add('dashboard-setup-open-v27');
    serverList.hidden = true;
    configPanel.hidden = false;
    configPanel.innerHTML = `<div class="setup-top-v25 setup-top-v28"><button id="backToServerList" class="btn btn-ghost" type="button">← Back to servers</button></div><div class="setup-loading-v27">${serverIcon(g, 'selected-server-icon-v25')}<div><span class="portal-mini-label">Server setup</span><h2>${esc(g.name)}</h2><p>Loading live guild data from Dark Bot...</p></div></div>`;
    document.getElementById('backToServerList')?.addEventListener('click', () => { clearDashboardUrl(); renderServers(currentServers); });
    const t = token();
    try {
      currentSetup = await loadGuildDashboard(g, t);
    } catch (err) {
      currentSetup = { guild: g, accessMode: g.owner ? 'Owner' : 'Manage Server', channels: { text: [] }, roles: [], commands: fallbackCommands, access: { adminsAndManagers: [], memberFetchComplete: false, note: err.message || 'Could not load bot data.' }, moderation: { bannedUsers: [], timedOutUsers: [], bansFetchComplete: false, timeoutsFetchComplete: false }, security: { verificationLevel: 'Not synced', mfaLevel: 'Not synced', explicitContentFilter: 'Not synced', automodStatus: 'Not synced', note: err.message || 'Could not load bot data.' }, activity: { executedCommands: 0, note: err.message || 'Bot endpoint unavailable.' }, botEndpointError: err.message || 'Bot endpoint unavailable.' };
    }
    savedConfig = normalizeDashboardConfig(readGuildConfig(g.id));
    if (currentSetup?.plugins) savedConfig.plugins = normalizeDashboardConfig({ plugins: currentSetup.plugins }).plugins;
    const syncedCommandConfig = currentSetup?.commandConfig || currentSetup?.commandSettings || currentSetup?.commandsConfig;
    if (syncedCommandConfig && typeof syncedCommandConfig === 'object') savedConfig.commands = normalizeCommandConfig(syncedCommandConfig);
    workingConfig = normalizeDashboardConfig(savedConfig);
    setDirty(false, true);
    renderServerSetup(g, currentSetup, targetSection);
  }
  function groupCommands(commands){
    const grouped = commands.reduce((acc, cmd) => {
      const key = canonicalCommandCategory(cmd.name, cmd.category);
      (acc[key] ||= []).push({ ...cmd, category: key });
      return acc;
    }, {});
    const preferredOrder = ['Core utilities', 'Community', 'Moderation', 'Plugins', 'Games', 'Support', 'Dark Bot commands'];
    const ordered = {};
    preferredOrder.forEach((key) => { if (grouped[key]?.length) ordered[key] = grouped[key]; });
    Object.keys(grouped).sort().forEach((key) => { if (!ordered[key]) ordered[key] = grouped[key]; });
    return ordered;
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
  function templatePreview(text, guild){
    const name = guild?.name || 'Dark Server';
    return String(text || '')
      .replace(/\{user\}/g, '@new-member')
      .replace(/\{username\}/g, 'new-member')
      .replace(/\{tag\}/g, 'new-member#0001')
      .replace(/\{server\}/g, name)
      .replace(/\{memberCount\}/g, '128');
  }
  function roleIdsToText(roleIds){ return (Array.isArray(roleIds) ? roleIds : []).join(', '); }
  function reactionRolesToText(roles){
    return (Array.isArray(roles) ? roles : []).map((item) => `${item.emoji || ''} | ${item.roleId || ''} | ${item.label || ''}`.trim()).join('\n');
  }
  function reactionRolesFromText(value){
    return String(value || '').split('\n').map((line) => {
      const parts = line.split('|').map((part) => part.trim());
      if (parts.length < 2) return null;
      return normalizeReactionRoleItem({ emoji: parts[0], roleId: parts[1], label: parts[2] || 'Reaction role' });
    }).filter(Boolean);
  }
  function renderPreviewImage(url){
    return url ? `<img class="welcome-preview-image-v59" src="${esc(url)}" alt="">` : '';
  }
  function renderWelcomePreviewCard(kind, title, body, imageUrl, guild){
    return `<div class="welcome-preview-embed-v53 welcome-preview-embed-v59" data-preview-card="${esc(kind)}">
      <strong data-preview-title="${esc(kind)}">${esc(title)}</strong>
      ${renderPreviewImage(imageUrl)}
      <p data-preview-body="${esc(kind)}">${esc(body)}</p>
      <small>${esc(guild?.name || 'Dark Server')}</small>
    </div>`;
  }
  function renderNoPreview(){
    return `<div class="plugin-empty-preview-v59"><strong>No preview enabled</strong><small>Turn on an embed option to preview it here.</small></div>`;
  }
  function pluginStatusLabel(config){ return config?.enabled ? 'Enabled' : 'Ready'; }
  function renderPluginTabs(guild){
    const cfg = activeConfig(guild.id)?.plugins || {};
    const enabled = { welcome: cfg.welcome?.enabled, reaction_roles: cfg.reaction_roles?.enabled, autorole: cfg.autorole?.enabled };
    const planned = pluginIdeas.filter((plugin) => plugin.status !== 'active').map((plugin) => `<article class="plugin-planned-v53 plugin-planned-v57"><small>Later</small><strong>${esc(plugin.title)}</strong><span>${esc(plugin.desc)}</span></article>`).join('');
    return `<div class="plugin-library-v57" role="tablist" aria-label="Plugin setup">
      <div class="plugin-library-title-v57"><span class="portal-mini-label">Active plugins</span><strong>Choose a module</strong></div>
      ${pluginTabs.map((plugin) => `<button class="plugin-tab-v53 plugin-tab-v57 ${currentPluginTab === plugin.key ? 'is-active' : ''}" data-plugin-tab="${esc(plugin.key)}" type="button">
        <span>${esc(plugin.title)}</span>
        <small>${enabled[plugin.key] ? 'Enabled' : 'Setup'}</small>
      </button>`).join('')}
      ${planned ? `<div class="plugin-planned-grid-v53 plugin-planned-grid-v57">${planned}</div>` : ''}
    </div>`;
  }
  function renderColorPalette(selected, dataAttr = 'data-welcome-color'){
    const normalized = String(selected || '#7a35ff').toLowerCase();
    return `<div class="welcome-color-picker-v54">
      <div class="welcome-color-palette-v53" role="group" aria-label="Embed color palette">
        ${welcomeColors.map((color) => `<button class="${color.toLowerCase() === normalized ? 'is-selected' : ''}" ${dataAttr}="${esc(color)}" type="button" style="--swatch:${esc(color)}" aria-label="Use ${esc(color)}" aria-pressed="${color.toLowerCase() === normalized ? 'true' : 'false'}"></button>`).join('')}
      </div>
      <code>${esc(normalized)}</code>
    </div>`;
  }
  function renderWelcomePlugin(guild){
    const welcome = currentWelcomeConfig(guild.id);
    const welcomeTitle = templatePreview(welcome.embedTitle, guild);
    const welcomeBody = templatePreview(welcome.welcomeMessage, guild);
    const goodbyeTitle = templatePreview(welcome.goodbyeTitle, guild);
    const goodbyeBody = templatePreview(welcome.goodbyeMessage, guild);
    const dmBody = templatePreview(welcome.dmMessage, guild);
    const previewCards = [
      welcome.welcomeEnabled ? renderWelcomePreviewCard('welcome', welcomeTitle, welcomeBody, welcome.welcomeImageUrl, guild) : '',
      welcome.goodbyeEnabled ? renderWelcomePreviewCard('goodbye', goodbyeTitle, goodbyeBody, welcome.goodbyeImageUrl, guild) : '',
      welcome.dmEnabled ? `<div class="welcome-preview-embed-v53 welcome-preview-embed-v59 welcome-preview-dm-v59" data-preview-card="dm"><strong>DM to @new-member</strong><p data-preview-body="dm">${esc(dmBody)}</p><small>Private message</small></div>` : ''
    ].filter(Boolean).join('');
    const embedColumnCount = [welcome.welcomeEnabled, welcome.goodbyeEnabled].filter(Boolean).length;
    const welcomeColumn = welcome.welcomeEnabled ? `<div class="welcome-embed-column-v61" data-welcome-fields="welcome">
            <label class="welcome-text-field-v52"><span>Welcome title <b>${welcome.embedTitle.length}/80</b></span><input data-welcome-field="embedTitle" maxlength="80" value="${esc(welcome.embedTitle)}"></label>
            <label class="welcome-text-field-v52"><span>Welcome message <b>${welcome.welcomeMessage.length}/280</b></span><textarea data-welcome-field="welcomeMessage" maxlength="280" rows="3">${esc(welcome.welcomeMessage)}</textarea></label>
            <label class="welcome-text-field-v52"><span>Welcome image URL</span><input data-welcome-field="welcomeImageUrl" maxlength="240" placeholder="https://..." value="${esc(welcome.welcomeImageUrl)}"></label>
          </div>` : '';
    const goodbyeColumn = welcome.goodbyeEnabled ? `<div class="welcome-embed-column-v61" data-welcome-fields="goodbye">
            <label class="welcome-text-field-v52"><span>Goodbye title <b>${welcome.goodbyeTitle.length}/80</b></span><input data-welcome-field="goodbyeTitle" maxlength="80" value="${esc(welcome.goodbyeTitle)}"></label>
            <label class="welcome-text-field-v52"><span>Goodbye message <b>${welcome.goodbyeMessage.length}/280</b></span><textarea data-welcome-field="goodbyeMessage" maxlength="280" rows="3">${esc(welcome.goodbyeMessage)}</textarea></label>
            <label class="welcome-text-field-v52"><span>Goodbye image URL</span><input data-welcome-field="goodbyeImageUrl" maxlength="240" placeholder="https://..." value="${esc(welcome.goodbyeImageUrl)}"></label>
          </div>` : '';
    return `<section class="plugin-detail-v53 welcome-detail-v53">
      <div class="plugin-detail-head-v53">
        <div><span class="portal-mini-label">Active plugin</span><h3>Welcome & Goodbye</h3></div>
        <label class="plugin-master-switch-v53"><input type="checkbox" data-welcome-toggle="enabled" ${welcome.enabled ? 'checked' : ''}><span></span><b>${welcome.enabled ? 'Enabled' : 'Disabled'}</b></label>
      </div>
      <div class="plugin-layout-v53 welcome-layout-v62">
        <div class="plugin-form-v53 welcome-main-controls-v62">
          <div class="welcome-toggle-grid-v53">
            <label class="plugin-switch-row-v52"><input type="checkbox" data-welcome-toggle="welcomeEnabled" ${welcome.welcomeEnabled ? 'checked' : ''}><span class="toggle-ui-v25"></span><span><strong>Welcome embed</strong></span></label>
            <label class="plugin-switch-row-v52"><input type="checkbox" data-welcome-toggle="goodbyeEnabled" ${welcome.goodbyeEnabled ? 'checked' : ''}><span class="toggle-ui-v25"></span><span><strong>Goodbye embed</strong></span></label>
            <label class="plugin-switch-row-v52"><input type="checkbox" data-welcome-toggle="dmEnabled" ${welcome.dmEnabled ? 'checked' : ''}><span class="toggle-ui-v25"></span><span><strong>DM user</strong></span></label>
          </div>
          <div class="welcome-control-stack-v59">
            <label class="welcome-color-field-v59"><span>Color palette</span>${renderColorPalette(welcome.color)}</label>
            <label class="dashboard-select-field-v54 welcome-channel-field-v59"><span>Message channel</span>${channelSelectHtml(currentSetup, welcome.channelId, 'data-welcome-field="channelId"')}</label>
          </div>
        </div>
        <aside class="welcome-preview-v53" style="--welcome-color:${esc(welcome.color)}">
          <span>Discord preview</span>
          <div class="welcome-preview-stack-v53">
            ${previewCards || renderNoPreview()}
          </div>
        </aside>
        <div class="welcome-wide-fields-v62">
          ${embedColumnCount ? `<div class="welcome-embed-columns-v61 ${embedColumnCount === 1 ? 'is-single' : ''}">${welcomeColumn}${goodbyeColumn}</div>` : ''}
          ${welcome.dmEnabled ? `<div class="welcome-form-section-v59" data-welcome-fields="dm">
            <label class="welcome-text-field-v52"><span>DM message <b>${welcome.dmMessage.length}/320</b></span><textarea data-welcome-field="dmMessage" maxlength="320" rows="3">${esc(welcome.dmMessage)}</textarea></label>
          </div>` : ''}
          <p class="welcome-token-note-v52">Tokens: {user}, {username}, {tag}, {server}, {memberCount}</p>
        </div>
      </div>
    </section>`;
  }
  function renderReactionRolesPlugin(guild){
    const config = currentReactionRolesConfig(guild.id);
    const firstRole = config.roles[0] || { emoji: ':joy:', roleId: '', label: '' };
    const roleLabel = roleName(currentSetup, firstRole.roleId) || firstRole.label || 'Selected role';
    const prompt = templatePreview(config.prompt, guild);
    return `<section class="plugin-detail-v53">
      <div class="plugin-detail-head-v53">
        <div><span class="portal-mini-label">Active plugin</span><h3>Reaction Roles</h3></div>
        <label class="plugin-master-switch-v53"><input type="checkbox" data-reaction-toggle="enabled" ${config.enabled ? 'checked' : ''}><span></span><b>${config.enabled ? 'Enabled' : 'Disabled'}</b></label>
      </div>
      <div class="plugin-layout-v53 plugin-layout-narrow-v53">
        <div class="plugin-form-v53">
          <div class="welcome-control-stack-v59">
            <label class="welcome-color-field-v59"><span>Embed color</span>${renderColorPalette(config.color, 'data-reaction-color')}</label>
            <label class="dashboard-select-field-v54 welcome-channel-field-v59"><span>Post message in</span>${channelSelectHtml(currentSetup, config.channelId, 'data-reaction-field="channelId"')}</label>
          </div>
          <label class="welcome-text-field-v52"><span>Prompt <b>${config.prompt.length}/420</b></span><textarea data-reaction-field="prompt" maxlength="420" rows="3">${esc(config.prompt)}</textarea></label>
          <label class="welcome-text-field-v52"><span>Reaction Roles image URL</span><input data-reaction-field="imageUrl" maxlength="240" placeholder="https://..." value="${esc(config.imageUrl)}"></label>
          <div class="reaction-role-builder-v54 reaction-role-builder-v60">
            <label class="reaction-emoji-field-v60"><span>Emoji</span><input data-reaction-role-item="emoji" maxlength="80" placeholder=":joy: or ✅" value="${esc(firstRole.emoji)}"><small>Type the exact emoji text, e.g. :joy:, ✅, or &lt;:name:id&gt;.</small></label>
            <label class="dashboard-select-field-v54 reaction-role-field-v60"><span>Role</span>${roleSelectHtml(currentSetup, firstRole.roleId, 'data-reaction-role-item="roleId"')}</label>
          </div>
        </div>
        <aside class="plugin-mini-preview-v53 reaction-preview-v59" style="--welcome-color:${esc(config.color)}">
          <span>Current mappings</span>
          ${config.roles.length ? config.roles.map((item) => `<div><strong>${esc(item.emoji)} ${esc(roleName(currentSetup, item.roleId) || item.label || 'Selected role')}</strong><small>${esc(item.roleId || 'No role selected')}</small></div>`).join('') : '<p>No role mappings yet.</p>'}
          <div class="welcome-preview-stack-v53 reaction-discord-preview-v59">
            <div class="welcome-preview-embed-v53 welcome-preview-embed-v59">
              <strong>Reaction Roles</strong>
              ${renderPreviewImage(config.imageUrl)}
              <p>${esc(prompt)}</p>
              <small>${esc(firstRole.emoji || '✅')} ${esc(roleLabel)}</small>
            </div>
          </div>
        </aside>
      </div>
    </section>`;
  }
  function renderAutorolePlugin(guild){
    const config = currentAutoroleConfig(guild.id);
    const selectedRole = config.roleIds[0] || '';
    return `<section class="plugin-detail-v53">
      <div class="plugin-detail-head-v53">
        <div><span class="portal-mini-label">Active plugin</span><h3>Auto Role</h3></div>
        <label class="plugin-master-switch-v53"><input type="checkbox" data-autorole-toggle="enabled" ${config.enabled ? 'checked' : ''}><span></span><b>${config.enabled ? 'Enabled' : 'Disabled'}</b></label>
      </div>
      <div class="plugin-layout-v53 plugin-layout-narrow-v53">
        <div class="plugin-form-v53">
          <label class="welcome-text-field-v52 dashboard-select-field-v54"><span>Join role</span>${roleSelectHtml(currentSetup, selectedRole, 'data-autorole-primary-role')}</label>
        </div>
        <aside class="plugin-mini-preview-v53">
          <span>Roles to assign</span>
          ${config.roleIds.length ? config.roleIds.map((roleId) => `<div><strong>${esc(roleName(currentSetup, roleId) || 'Role')}</strong><small>${esc(roleId)}</small></div>`).join('') : '<p>No auto roles yet.</p>'}
        </aside>
      </div>
    </section>`;
  }
  function renderPlugins(guild){
    if (!pluginTabs.some((plugin) => plugin.key === currentPluginTab)) currentPluginTab = 'welcome';
    const detail = currentPluginTab === 'reaction_roles'
      ? renderReactionRolesPlugin(guild)
      : currentPluginTab === 'autorole'
        ? renderAutorolePlugin(guild)
        : renderWelcomePlugin(guild);
    return `<div class="plugin-panel-v52 plugin-panel-v57">
      <div class="plugin-panel-head-v52 plugin-panel-head-v57">
        <div><span class="portal-mini-label">Plugins / Extensions</span><h3>Automation center</h3><p>Enable only the systems this server needs. Channels and roles are selected from synced Discord data.</p></div>
        <strong>${pluginEnabledCount(guild.id)}/${pluginTabs.length} enabled</strong>
      </div>
      <div class="plugin-workbench-v57">
        ${renderPluginTabs(guild)}
        <div class="plugin-workspace-v57">${detail}</div>
      </div>
    </div>`;
  }
  function renderOverview(guild, data){
    const commandCount = commandsFor(data).length;
    const channelsCount = syncedTextChannels(data).length;
    const rolesCount = syncedRoles(data).length;
    const pluginCount = pluginEnabledCount(guild.id);
    const syncLabel = data?.botEndpointError ? 'Needs bot sync' : 'Live sync ready';
    return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29 overview-card-v54">
      <span class="portal-mini-label">Server configuration</span>
      <h3>${esc(guild.name)}</h3>
      <p>${esc(data?.botEndpointError ? 'The configuration page is ready, but channel and role dropdowns need Dark Bot to be online in this guild.' : 'Channels, roles, commands and plugin settings are synced from Dark Bot for this server.')}</p>
      <div class="overview-metrics-v54">
        <div><span>Plugins</span><strong>${pluginCount}/${pluginTabs.length}</strong></div>
        <div><span>Commands</span><strong>${commandCount}</strong></div>
        <div><span>Channels</span><strong>${channelsCount}</strong></div>
        <div><span>Roles</span><strong>${rolesCount}</strong></div>
      </div>
      <div class="overview-next-v54">
        <button data-setup-section="plugins" type="button">Open Plugins / Extensions</button>
        <small>${esc(syncLabel)}</small>
      </div>
    </article>`;
  }
  function sectionContent(section, guild, data){
    const commandCount = commandsFor(data).length;
    if (section === 'overview') return renderOverview(guild, data);
    if (section === 'access') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29 server-stage-card-v57"><span class="portal-mini-label">Admins & managers</span><h3>Dashboard access</h3><p>Server owner, administrators and members with Manage Server access are listed here from the live bot sync.</p><div class="access-list-v25 access-list-v27">${renderAccess(data)}</div></article>`;
    if (section === 'commands') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29 server-stage-card-v57"><span class="portal-mini-label">Command permissions</span><h3>${commandCount} commands enabled by default</h3><p>All commands start enabled. Turn off only the commands you do not want in this guild.</p><div class="commands-grid-v25 commands-grid-v27 commands-grid-v28 commands-grid-v29">${renderCommandGroups(guild, data)}</div></article>`;
    if (section === 'security') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29 server-stage-card-v57"><span class="portal-mini-label">Security</span><h3>Server security</h3><div class="activity-list-v25">${renderSecurity(data)}</div></article>`;
    if (section === 'moderation') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29 server-stage-card-v57"><span class="portal-mini-label">Moderation</span><h3>Bans & timeouts</h3>${renderModeration(data)}</article>`;
    if (section === 'plugins') return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29 server-stage-card-v57 plugins-stage-card-v57">${renderPlugins(guild)}</article>`;
    return `<article class="setup-card-v25 setup-card-wide-v25 setup-card-v27 setup-card-v28 setup-card-v29 setup-empty-v28 server-stage-card-v57"><span class="portal-mini-label">Setup</span><h3>Select a setup section</h3><p>Pick one section above to view or edit access, commands, plugins/extensions or security.</p></article>`;
  }
  function setDirty(next, silent){
    isDirty = !!next;
    const bar = document.getElementById('guildUnsavedBar');
    if (bar) bar.hidden = !isDirty;
    if (!silent) document.body.classList.toggle('has-dashboard-unsaved-v29', isDirty);
  }
  function updateFieldCounter(input){
    const counter = input.closest('label')?.querySelector('b');
    const max = input.getAttribute('maxlength');
    if (counter && max) counter.textContent = `${input.value.length}/${max}`;
  }
  function setPreviewImage(card, url){
    if (!card) return;
    let img = card.querySelector('.welcome-preview-image-v59');
    if (!url) {
      if (img) img.remove();
      return;
    }
    if (!img) {
      img = document.createElement('img');
      img.className = 'welcome-preview-image-v59';
      img.alt = '';
      card.querySelector('strong')?.insertAdjacentElement('afterend', img);
    }
    img.src = url;
  }
  function updateWelcomePreview(guild, root){
    const welcome = currentWelcomeConfig(guild.id);
    const preview = root.querySelector('.welcome-preview-v53');
    if (preview) preview.style.setProperty('--welcome-color', welcome.color);
    const updateCard = (kind, title, body, imageUrl) => {
      const card = root.querySelector(`[data-preview-card="${kind}"]`);
      if (!card) return;
      const titleEl = card.querySelector(`[data-preview-title="${kind}"]`);
      const bodyEl = card.querySelector(`[data-preview-body="${kind}"]`);
      if (titleEl) titleEl.textContent = templatePreview(title, guild);
      if (bodyEl) bodyEl.textContent = templatePreview(body, guild);
      setPreviewImage(card, imageUrl);
    };
    updateCard('welcome', welcome.embedTitle, welcome.welcomeMessage, welcome.welcomeImageUrl);
    updateCard('goodbye', welcome.goodbyeTitle, welcome.goodbyeMessage, welcome.goodbyeImageUrl);
    const dm = root.querySelector('[data-preview-card="dm"] [data-preview-body="dm"]');
    if (dm) dm.textContent = templatePreview(welcome.dmMessage, guild);
  }
  function updateReactionPreview(guild, root){
    const config = currentReactionRolesConfig(guild.id);
    const firstRole = config.roles[0] || { emoji: ':joy:', roleId: '', label: '' };
    const preview = root.querySelector('.reaction-preview-v59');
    if (preview) preview.style.setProperty('--welcome-color', config.color);
    const card = root.querySelector('.reaction-discord-preview-v59 .welcome-preview-embed-v53');
    if (!card) return;
    const body = card.querySelector('p');
    const small = card.querySelector('small');
    if (body) body.textContent = templatePreview(config.prompt, guild);
    setPreviewImage(card, config.imageUrl);
    if (small) small.textContent = `${firstRole.emoji || '✅'} ${roleName(currentSetup, firstRole.roleId) || firstRole.label || 'Selected role'}`;
  }
  function wireSectionContent(content, guild){
    content.querySelectorAll('[data-setup-section]').forEach(btn => btn.addEventListener('click', () => renderSection(btn.dataset.setupSection)));
    content.querySelectorAll('[data-command-name]').forEach(input => input.addEventListener('change', (e) => {
      setCommandEnabled(guild.id, e.currentTarget.dataset.commandName, e.currentTarget.checked);
    }));
    const rerenderPlugins = () => {
      content.innerHTML = sectionContent('plugins', guild, currentSetup);
      wireSectionContent(content, guild);
    };
    content.querySelectorAll('[data-plugin-tab]').forEach(btn => btn.addEventListener('click', (e) => {
      currentPluginTab = e.currentTarget.dataset.pluginTab || 'welcome';
      rerenderPlugins();
    }));
    content.querySelectorAll('[data-welcome-toggle]').forEach(input => input.addEventListener('change', (e) => {
      setWelcomeConfigValue(e.currentTarget.dataset.welcomeToggle, e.currentTarget.checked);
      rerenderPlugins();
    }));
    content.querySelectorAll('[data-welcome-field]').forEach(input => {
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', (e) => {
        setWelcomeConfigValue(e.currentTarget.dataset.welcomeField, e.currentTarget.value);
        updateFieldCounter(e.currentTarget);
        updateWelcomePreview(guild, content);
      });
    });
    content.querySelectorAll('[data-welcome-color]').forEach(btn => btn.addEventListener('click', (e) => {
      setWelcomeConfigValue('color', e.currentTarget.dataset.welcomeColor || '#7a35ff');
      rerenderPlugins();
    }));
    content.querySelectorAll('[data-autorole-toggle]').forEach(input => input.addEventListener('change', (e) => {
      setAutoroleConfigValue(e.currentTarget.dataset.autoroleToggle, e.currentTarget.checked);
      rerenderPlugins();
    }));
    content.querySelectorAll('[data-autorole-field]').forEach(input => {
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', (e) => {
        setAutoroleConfigValue(e.currentTarget.dataset.autoroleField, e.currentTarget.value);
      });
    });
    content.querySelectorAll('[data-autorole-primary-role]').forEach(input => input.addEventListener('change', (e) => {
      const roleId = cleanRoleId(e.currentTarget.value);
      setAutoroleConfigValue('roleIds', roleId ? [roleId] : []);
      rerenderPlugins();
    }));
    content.querySelectorAll('[data-reaction-toggle]').forEach(input => input.addEventListener('change', (e) => {
      setReactionRolesConfigValue(e.currentTarget.dataset.reactionToggle, e.currentTarget.checked);
      rerenderPlugins();
    }));
    content.querySelectorAll('[data-reaction-field]').forEach(input => {
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', (e) => {
        setReactionRolesConfigValue(e.currentTarget.dataset.reactionField, e.currentTarget.value);
        updateFieldCounter(e.currentTarget);
        updateReactionPreview(guild, content);
      });
    });
    content.querySelectorAll('[data-reaction-role-item]').forEach(input => {
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', (e) => {
        const config = currentReactionRolesConfig(guild.id);
        const first = config.roles[0] || { emoji: '', roleId: '', label: '' };
        const next = { ...first, [e.currentTarget.dataset.reactionRoleItem]: e.currentTarget.value };
        setReactionRolesConfigValue('roles', [next, ...config.roles.slice(1)]);
        updateReactionPreview(guild, content);
      });
    });
    content.querySelectorAll('[data-reaction-color]').forEach(btn => btn.addEventListener('click', (e) => {
      setReactionRolesConfigValue('color', e.currentTarget.dataset.reactionColor || '#7a35ff');
      rerenderPlugins();
    }));
  }
  function renderLegacyInlineSection(section){
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
  function renderLegacyServerSetup(g, data){
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
        <button data-setup-section="plugins" type="button"><span>Plugins / Extensions</span><b>${pluginEnabledCount(guild.id)}/${pluginIdeas.length}</b><i>${eyeIcon()}</i></button>
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
    document.getElementById('saveSetupSettings')?.addEventListener('click', async () => {
      const btn = document.getElementById('saveSetupSettings');
      const old = btn?.textContent || 'Save Settings';
      if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }
      workingConfig.updatedAt = new Date().toISOString();
      saveGuildConfig(guild.id, workingConfig);
      let label = 'Saved';
      try {
        const saved = await saveGuildPlugins(guild.id, workingConfig.plugins || {}, workingConfig.commands || {});
        if (saved?.plugins) workingConfig.plugins = normalizeDashboardConfig({ plugins: saved.plugins }).plugins;
        if (saved?.commands) workingConfig.commands = normalizeCommandConfig(saved.commands);
      } catch (err) {
        label = 'Saved locally';
      }
      savedConfig = normalizeDashboardConfig(workingConfig);
      saveGuildConfig(guild.id, savedConfig);
      setDirty(false);
      if (currentSetup) {
        currentSetup.plugins = savedConfig.plugins;
        currentSetup.commandConfig = savedConfig.commands;
        currentSetup.commandSettings = savedConfig.commands;
      }
      if (btn) {
        btn.textContent = label;
        setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1400);
      }
    });
  }

  function setupSectionsFor(guild, data){
    const commandCount = commandsFor(data).length;
    const bansCount = data?.moderation?.bannedUsers?.length || 0;
    const timeoutCount = data?.moderation?.timedOutUsers?.length || 0;
    const accessCount = (data?.access?.adminsAndManagers?.length || 0) + (data?.owner ? 1 : 0);
    return [
      { key: 'plugins', label: 'Plugins', meta: 'Welcome, roles, automations', count: `${pluginEnabledCount(guild.id)}/${pluginTabs.length}` },
      { key: 'commands', label: 'Commands', meta: 'Slash command access', count: commandCount },
      { key: 'access', label: 'Access', meta: 'Owners and managers', count: accessCount || 0 },
      { key: 'security', label: 'Security', meta: 'Safety settings', count: data?.security?.automodStatus || 'Sync' },
      { key: 'moderation', label: 'Moderation', meta: 'Bans and timeouts', count: bansCount + timeoutCount },
    ];
  }
  function sectionLabel(section){
    return ({
      plugins: 'Plugins / Extensions',
      commands: 'Commands',
      access: 'Access',
      security: 'Security',
      moderation: 'Moderation'
    })[section] || 'Plugins / Extensions';
  }
  function sectionDescription(section){
    return ({
      plugins: 'Configure server extensions in one spacious workspace without hunting for IDs.',
      commands: 'Choose which slash commands should stay available in this guild.',
      access: 'Review owner, administrator and Manage Server access from the live bot sync.',
      security: 'Read guild safety status, verification and AutoMod availability.',
      moderation: 'Review bans and active timeouts when the bot has the required permissions.'
    })[section] || 'Configure server extensions in one spacious workspace without hunting for IDs.';
  }
  function renderSection(section, options = {}){
    if (!currentSetup) return;
    const guild = currentSetup?.guild || selectedServer;
    const key = setupSectionKeys.includes(section) ? section : 'plugins';
    currentSection = key;
    if (guild?.id && !options.skipUrl) updateDashboardUrl(guild.id, key, !!options.replaceUrl);
    configPanel.querySelectorAll('[data-setup-section]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.setupSection === key);
      if (btn.dataset.setupSection === key) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });
    const content = document.getElementById('serverConfigContent');
    const title = document.getElementById('serverConfigStageTitle');
    const text = document.getElementById('serverConfigStageText');
    if (title) title.textContent = sectionLabel(key);
    if (text) text.textContent = sectionDescription(key);
    if (!content) return;
    content.innerHTML = sectionContent(key, guild, currentSetup);
    wireSectionContent(content, guild);
  }
  function renderServerSetup(g, data, initialSection = 'plugins'){
    const guild = data?.guild || g;
    currentSetup = data;
    const source = data?.botEndpointError ? 'Sync issue' : 'Live sync';
    const sections = setupSectionsFor(guild, data);
    configPanel.innerHTML = `<div class="server-config-page-v54 server-config-page-v57">
      <div class="server-config-hero-v57">
        <div class="server-config-hero-top-v57">
          <button id="backToServerList" class="btn btn-ghost" type="button">Back to servers</button>
          <span class="server-sync-pill-v57">${esc(source)}</span>
        </div>
        <div class="server-config-identity-v57">
          ${serverIcon(guild, 'selected-server-icon-v25 server-config-avatar-v57')}
          <div><span class="portal-mini-label">Server configuration</span><h2>${esc(guild.name)}</h2><p>${esc(data?.botEndpointError ? 'Dark Bot is not fully synced right now. The layout is ready, and channels/roles will appear as soon as the bot endpoint is online.' : 'A dedicated workspace for every server feature, with synced Discord channels, roles and plugin settings.')}</p></div>
        </div>
        <div class="server-config-stats-v57">
          <div><span>Plugins</span><strong>${pluginEnabledCount(guild.id)}/${pluginTabs.length}</strong></div>
          <div><span>Channels</span><strong>${syncedTextChannels(data).length}</strong></div>
          <div><span>Roles</span><strong>${syncedRoles(data).length}</strong></div>
          <div><span>Commands</span><strong>${commandsFor(data).length}</strong></div>
        </div>
      </div>
      <nav class="server-config-nav-v57" aria-label="Server configuration sections">
        ${sections.map((item) => `<button data-setup-section="${esc(item.key)}" type="button"><span>${esc(item.label)}</span><small>${esc(item.meta)}</small><b>${esc(item.count)}</b></button>`).join('')}
      </nav>
      <div class="server-config-shell-v54 server-config-shell-v57">
        <section class="server-config-content-v54 server-config-content-v57" aria-live="polite">
          <div class="server-config-stage-head-v54 server-config-stage-head-v57">
            <div><span class="portal-mini-label">Current stage</span><h3 id="serverConfigStageTitle">${esc(sectionLabel(initialSection))}</h3><p id="serverConfigStageText">${esc(sectionDescription(initialSection))}</p></div>
          </div>
          <div id="serverConfigContent" class="setup-section-content-v28 setup-section-content-v29 setup-section-content-v30 setup-section-content-v31 server-config-stage-body-v57"></div>
        </section>
      </div>
    </div>
    <div id="guildUnsavedBar" class="guild-unsaved-bar-v29 guild-unsaved-bar-v30" hidden><button id="revertSetupChanges" class="btn btn-ghost" type="button">Revert</button><strong>Unsaved settings</strong><button id="saveSetupSettings" class="btn btn-primary" type="button">Save Settings</button></div>`;
    configPanel.querySelectorAll('.server-config-nav-v57 [data-setup-section]').forEach(btn => btn.addEventListener('click', () => renderSection(btn.dataset.setupSection)));
    document.getElementById('backToServerList')?.addEventListener('click', () => { clearDashboardUrl(); renderServers(currentServers); });
    document.getElementById('revertSetupChanges')?.addEventListener('click', () => {
      workingConfig = deepClone(savedConfig);
      setDirty(false);
      renderSection(currentSection || initialSection || 'plugins', { replaceUrl: true });
    });
    document.getElementById('saveSetupSettings')?.addEventListener('click', async () => {
      const btn = document.getElementById('saveSetupSettings');
      const old = btn?.textContent || 'Save Settings';
      if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }
      workingConfig.updatedAt = new Date().toISOString();
      saveGuildConfig(guild.id, workingConfig);
      let label = 'Saved';
      try {
        const saved = await saveGuildPlugins(guild.id, workingConfig.plugins || {}, workingConfig.commands || {});
        if (saved?.plugins) workingConfig.plugins = normalizeDashboardConfig({ plugins: saved.plugins }).plugins;
        if (saved?.commands) workingConfig.commands = normalizeCommandConfig(saved.commands);
      } catch (err) {
        label = 'Saved locally';
      }
      savedConfig = normalizeDashboardConfig(workingConfig);
      saveGuildConfig(guild.id, savedConfig);
      setDirty(false);
      if (currentSetup) {
        currentSetup.plugins = savedConfig.plugins;
        currentSetup.commandConfig = savedConfig.commands;
        currentSetup.commandSettings = savedConfig.commands;
      }
      renderSection(currentSection || initialSection || 'plugins', { replaceUrl: true });
      if (btn) {
        btn.textContent = label;
        setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1400);
      }
    });
    renderSection(setupSectionKeys.includes(initialSection) ? initialSection : 'plugins', { replaceUrl: true });
  }

  async function init(){
    await Promise.resolve(window.DGAuth?.syncSessionFromToken?.()).catch(() => {});
    const saved = localProfile();
    if (!saved) { window.location.href = `/login.html?next=${encodeURIComponent(dashboardNextPath())}`; return; }
    currentUser = saved;
    currentInvite = 'https://discord.com/oauth2/authorize?client_id=963487472300482560';
    renderUser(currentUser);
    try { currentStats = window.DGStaticStats?.build?.() || currentStats; renderUser(currentUser); } catch {}
    renderServers(staticManagedServers(), 'Static Netlify build: demo server settings are saved locally in this browser.');
  }

  window.addEventListener('popstate', () => {
    const guildId = requestedGuildId();
    if (!guildId) {
      if (isServerConfigPage) {
        window.location.href = '/dashboard.html';
      } else if (currentServers.length) {
        renderServers(currentServers);
      }
      return;
    }
    if (!isServerConfigPage) {
      window.location.href = serverConfigUrl(guildId, requestedSection());
      return;
    }
    const guild = currentServers.find((item) => String(item.id) === String(guildId));
    if (guild) openServerSetup(guild, { section: requestedSection(), replaceUrl: true });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
