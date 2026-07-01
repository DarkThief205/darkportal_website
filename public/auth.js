// auth.js — OAuth / provider login page with policy confirmation.
const AUTH_SESSION_KEY = "dg_session";
const AUTH_TOKEN_KEY = "dg_token";
const AUTH_PROFILE_KEY = "dg_profile";

function safeNext(value) {
  if (!value || typeof value !== "string") return "/dashboard.html";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard.html";
  if (value.startsWith("/auth/") || value.startsWith("/api/")) return "/dashboard.html";
  return value;
}

const urlParams = new URLSearchParams(window.location.search);
const nextPath = safeNext(urlParams.get("next") || "/dashboard.html");

function currentUser() { return localStorage.getItem(AUTH_SESSION_KEY) || null; }
function go(provider) {
  // Netlify static build: create a local browser-only session instead of using OAuth routes.
  const names = { discord: "Discord", google: "Google", steam: "Steam" };
  const providerName = names[provider] || "Local";
  let existing = null;
  try { existing = JSON.parse(localStorage.getItem(AUTH_PROFILE_KEY) || "null"); } catch {}
  const created = existing?.created || Date.now();
  const username = existing?.username || `${provider}_user`;
  const display = existing?.display_name || `${providerName} User`;
  const profile = {
    ...(existing || {}),
    username,
    display_name: display,
    created,
    oauth_provider: existing?.oauth_provider || providerName,
    linked: { ...(existing?.linked || {}), [provider]: true }
  };
  profile[provider] = profile[provider] || {
    id: `static-${provider}`,
    username: display,
    name: display,
    global_name: display,
    persona: display,
    avatar: ""
  };
  localStorage.setItem(AUTH_SESSION_KEY, username);
  localStorage.setItem(AUTH_TOKEN_KEY, `static-${provider}-${created}`);
  localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
  window.location.assign(nextPath);
}

const POLICY = {
  terms: {
    label: 'Terms of Service', title: 'Terms of Service', body: `
      <h3>1. Using Dark Portal</h3>
      <p>Dark Portal is a web portal for account profiles, Discord bot dashboard tools, interactive games, statistics, support tickets and related community features. By using the portal, you agree to use it responsibly and only for lawful, non-abusive purposes.</p>
      <h3>2. Accounts and access</h3>
      <p>You are responsible for the provider account used to sign in. Do not share sessions, impersonate other users, attempt to bypass login, access another account, scrape private data, or abuse any dashboard, profile, stats or feedback feature.</p>
      <h3>3. Discord bot and guild tools</h3>
      <p>Dashboard controls must be used only in Discord guilds where you have permission to manage the bot or server configuration. Do not use Dark for spam, harassment, raids, mass mentions, evasion of moderation, malicious automation, or behavior that violates Discord rules or the rules of the guild where the bot is installed.</p>
      <h3>4. Games and fair play</h3>
      <p>Game features are intended for fair, casual play. Do not submit fake results, exploit bugs, manipulate stored progress, overload game endpoints, or use automation to gain unfair stats.</p>
      <h3>5. Feedback and support tickets</h3>
      <p>Ideas, bug reports and support requests should be sent as tickets from the Feedback tab. Keep feedback respectful and useful. Abusive, spammy or harmful tickets may be ignored or removed.</p>
      <h3>6. Changes and availability</h3>
      <p>Dark Portal is under active development. Features, pages, game modes, bot tools, statistics and policies may change, be removed, or become temporarily unavailable while the project grows.</p>
      <h3>7. Limitation</h3>
      <p>The service is provided as-is for the Dark community project. Use it at your own discretion and keep your own Discord/server permissions secure.</p>`
  },
  privacy: {
    label: 'Privacy Policy', title: 'Privacy Policy', body: `
      <h3>1. Data we may store</h3>
      <p>Dark Portal may store provider identifiers, display names, usernames, avatars, email addresses when a provider shares them, account creation time, profile preferences, game stats, play history, progress, dashboard settings, guild-related configuration, feedback tickets and technical status information.</p>
      <h3>2. Why the data is used</h3>
      <p>Data is used to sign you in, show your profile, connect games and stats to your account, provide bot dashboard tools, remember settings, process support tickets, improve features and protect the service from abuse.</p>
      <h3>3. Discord data</h3>
      <p>When Discord features are used, Dark Portal may process information needed to connect your account, guild permissions and bot configuration. The bot may also use guild configuration needed for its moderation, utility, music, feedback or other enabled features.</p>
      <h3>4. Feedback tickets</h3>
      <p>Feedback submitted through the Feedback tab may include your message, category, account identity and timestamps so the project can respond to bugs, ideas and support requests.</p>
      <h3>5. Sharing</h3>
      <p>Dark Portal is not intended to sell personal data to advertisers. Data may be processed by the login providers, hosting/database services, Discord APIs and the bot systems needed to operate the project.</p>
      <h3>6. Retention and removal</h3>
      <p>Data may be kept while your account, guild configuration, stats or feedback tickets are useful for the service. Requests for correction or removal should be sent as a ticket from the Feedback tab.</p>
      <h3>7. Security</h3>
      <p>The project uses authentication tokens and server-side checks, but no system is perfect. Do not share tokens, passwords, sessions or private bot credentials.</p>`
  }
};

function setupPolicyModal(){
  const modal = document.getElementById('loginPolicyModal');
  const label = document.getElementById('loginPolicyLabel');
  const title = document.getElementById('loginPolicyTitle');
  const body = document.getElementById('loginPolicyBody');
  function open(kind){ const c = POLICY[kind]; if(!modal || !c) return; label.textContent=c.label; title.textContent=c.title; body.innerHTML=c.body; modal.hidden=false; document.body.classList.add('portal-modal-open'); window.DGTopbar?.hide?.(); }
  function close(){ if(modal) modal.hidden=true; document.body.classList.remove('portal-modal-open'); window.DGTopbar?.show?.(); }
  document.querySelectorAll('[data-login-policy]').forEach((b)=>b.addEventListener('click',()=>open(b.dataset.loginPolicy)));
  document.querySelectorAll('[data-login-policy-close]').forEach((b)=>b.addEventListener('click',close));
  document.addEventListener('keydown',(e)=>{ if(e.key === 'Escape') close(); });
}

(function () {
  if (currentUser()) { window.location.href = nextPath; return; }
  setupPolicyModal();
  const accept = document.getElementById('acceptPolicies');
  const hint = document.getElementById('authPolicyHint');
  const buttons = [
    ['oauthDiscord', 'discord'],
    ['oauthGoogle', 'google'],
    ['oauthSteam', 'steam']
  ].map(([id, provider]) => ({ element: document.getElementById(id), provider }));

  function updateState(){
    const ok = !!accept?.checked;
    buttons.forEach(({ element }) => { if (element) element.classList.toggle('is-disabled-by-policy', !ok); });
    if (hint) hint.hidden = ok;
  }
  accept?.addEventListener('change', updateState);
  updateState();

  buttons.forEach(({ element, provider }) => {
    element?.addEventListener('click', () => {
      if (accept && !accept.checked) {
        if (hint) { hint.hidden = false; hint.textContent = 'Please confirm the Terms and Privacy Policy first.'; }
        accept?.focus();
        return;
      }
      go(provider);
    });
  });
})();
