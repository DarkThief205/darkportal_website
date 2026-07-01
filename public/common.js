// common.js — shared auth + topbar UI helpers
const DG_SESSION_KEY = "dg_session";
const DG_TOKEN_KEY = "dg_token";
const DG_PROFILE_KEY = "dg_profile";

// --------------------- Theme ---------------------
// White mode has been removed: the site always boots in the dark arena style.
const body = document.body;
function applyTheme() {
  const preservedClasses = Array.from(body.classList).filter((className) => className !== "light" && className !== "dark");
  body.className = ["dark", ...preservedClasses].join(" ").trim();
  localStorage.removeItem("theme");
}
applyTheme();

// --------------------- Auth state helpers ---------------------
function currentUser() {
  return localStorage.getItem(DG_SESSION_KEY) || null;
}

function currentProfile() {
  try { return JSON.parse(localStorage.getItem(DG_PROFILE_KEY) || "null"); }
  catch { return null; }
}

function setSession(username) {
  if (!username) return;
  localStorage.setItem(DG_SESSION_KEY, String(username).trim().toLowerCase());
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function setProfile(profile) {
  if (!profile) return;
  localStorage.setItem(DG_PROFILE_KEY, JSON.stringify(profile));
  if (profile.username) setSession(profile.username);
}

function localNextPath() {
  const path = `${window.location.pathname}${window.location.search || ""}`;
  if (!path || path === "/login.html") return "/dashboard.html";
  return path;
}

function loginUrl() {
  return `/login.html?next=${encodeURIComponent(localNextPath())}`;
}

function logout() {
  localStorage.removeItem(DG_SESSION_KEY);
  localStorage.removeItem(DG_TOKEN_KEY);
  localStorage.removeItem(DG_PROFILE_KEY);
  updateTopbarAuth();
  try { updateProgressionUI(); } catch(e) {}
}

async function syncSessionFromToken() {
  // Netlify static build: no backend /api/me endpoint is required.
  const profile = currentProfile();
  if (profile?.username) {
    setSession(profile.username);
    return true;
  }
  const username = currentUser();
  if (username) {
    setProfile({
      username,
      display_name: username,
      created: Date.now(),
      oauth_provider: "Static"
    });
    return true;
  }
  return false;
}

// --------------------- Topbar UI ---------------------
function ensureAuthMenu(authBtn) {
  const host = authBtn.parentElement || document.body;
  host.classList.add("auth-menu-host");
  let menu = host.querySelector(".auth-menu-popover");
  if (!menu) {
    menu = document.createElement("div");
    menu.className = "auth-menu-popover";
    menu.hidden = true;
    host.appendChild(menu);
  }
  return menu;
}

function renderAvatarButton(authBtn, profile, username) {
  const avatar = profile?.avatar_url || profile?.discord?.avatar || profile?.google?.avatar || "";
  const displayName = profile?.display_name || username || "User";
  const initial = (displayName || username || "U").slice(0, 1).toUpperCase();
  const safeName = escapeHtml(displayName);
  const safeAvatar = escapeHtml(avatar);
  authBtn.classList.remove("btn-primary");
  authBtn.classList.add("btn-ghost", "auth-avatar-btn");
  authBtn.setAttribute("aria-label", `Account menu for ${displayName}`);
  authBtn.setAttribute("title", displayName);
  if (authBtn.tagName === "A") authBtn.removeAttribute("href");
  authBtn.innerHTML = avatar
    ? `<img src="${safeAvatar}" alt="" class="auth-avatar-img"><span class="auth-avatar-name">${safeName}</span>`
    : `<span class="auth-avatar-initial">${escapeHtml(initial)}</span><span class="auth-avatar-name">${safeName}</span>`;
}

function closeAuthMenus() {
  document.querySelectorAll(".auth-menu-popover").forEach(menu => { menu.hidden = true; });
}

function updateTopbarAuth() {
  const authButtons = document.querySelectorAll("#authBtn, [data-auth-button]");
  const statsButtons = document.querySelectorAll("#statsBtn, [data-stats-button]");
  const username = currentUser();
  const profile = currentProfile();

  statsButtons.forEach(btn => { btn.style.display = username ? "inline-flex" : "none"; });

  authButtons.forEach(authBtn => {
    authBtn.onclick = null;

    if (username) {
      renderAvatarButton(authBtn, profile, username);
      const existingMenu = authBtn.parentElement?.querySelector(".auth-menu-popover");
      if (existingMenu) existingMenu.remove();
      if (authBtn.tagName === "A") authBtn.setAttribute("href", "/profile.html");
      authBtn.onclick = (event) => {
        event.preventDefault();
        window.location.href = "/profile.html";
      };
    } else {
      const profileLabel = authBtn.getAttribute("data-profile-label");
      const loginLabel = profileLabel || "Login";
      authBtn.classList.toggle("btn-primary", !profileLabel);
      authBtn.classList.remove("btn-ghost", "auth-avatar-btn");
      authBtn.removeAttribute("title");
      authBtn.setAttribute("aria-label", loginLabel);
      authBtn.textContent = loginLabel;
      if (authBtn.tagName === "A") authBtn.setAttribute("href", loginUrl());
      authBtn.onclick = (event) => {
        event.preventDefault();
        window.location.href = loginUrl();
      };
      const existingMenu = authBtn.parentElement?.querySelector(".auth-menu-popover");
      if (existingMenu) existingMenu.hidden = true;
    }
  });
}

// On every page load: sync server profile if token exists, then update UI.
(async function bootTopbarAuth() {
  await syncSessionFromToken();
  updateTopbarAuth();
  try { updateProgressionUI(); } catch(e) {}
})();

document.addEventListener("click", (event) => {
  if (!event.target.closest(".auth-menu-host")) closeAuthMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAuthMenus();
});

// Expose helpers for other scripts (Sudoku, Stats, etc.)
window.DGAuth = {
  SESSION_KEY: DG_SESSION_KEY,
  TOKEN_KEY: DG_TOKEN_KEY,
  PROFILE_KEY: DG_PROFILE_KEY,
  DG_SESSION_KEY,
  DG_TOKEN_KEY,
  DG_PROFILE_KEY,
  currentUser,
  currentProfile,
  setSession,
  setProfile,
  escapeHtml,
  logout,
  syncSessionFromToken,
  updateTopbarAuth,
  loginUrl
};

// Redirect account-only navigation directly to the existing account creation/login menu.
(function initProtectedNavigation(){
  const protectedPaths = new Set(['/dashboard.html', '/server-config.html', '/stats.html', '/profile.html']);
  function isProtectedHref(href){
    try {
      const url = new URL(href, window.location.origin);
      return url.origin === window.location.origin && protectedPaths.has(url.pathname);
    } catch { return false; }
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-requires-account], a[href]');
    if (!link || link.target || event.defaultPrevented) return;
    if (!isProtectedHref(link.getAttribute('href') || link.href)) return;
    const hasAccount = !!localStorage.getItem(DG_TOKEN_KEY) || !!localStorage.getItem(DG_SESSION_KEY);
    if (hasAccount) return;
    event.preventDefault();
    const url = new URL(link.getAttribute('href') || link.href, window.location.origin);
    window.location.href = `/login.html?next=${encodeURIComponent(url.pathname + url.search)}`;
  }, true);
})();

// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// --------------------- Hideable shared topbar ---------------------
(function initSharedTopbarToggle(){
  const topbar = document.querySelector(".unified-topbar");
  if (!topbar || topbar.dataset.hideToggleReady === "1") return;
  topbar.dataset.hideToggleReady = "1";

  function setTopbarHeight(){
    const height = Math.ceil(topbar.getBoundingClientRect().height || 72);
    document.documentElement.style.setProperty("--unified-topbar-height", height + "px");
  }

  let lastY = Math.max(0, window.scrollY || 0);
  let hidden = false;
  let ticking = false;
  let lastToggleY = lastY;
  const SHOW_ZONE = 120;
  const HIDE_AFTER = 260;
  const HYSTERESIS = 150;

  function applyHidden(next){
    if (hidden === !!next) return;
    hidden = !!next;
    lastToggleY = Math.max(0, window.scrollY || 0);
    setTopbarHeight();
    document.body.classList.toggle("nav-hidden", hidden);
  }

  function evaluateScroll(){
    ticking = false;
    const y = Math.max(0, window.scrollY || 0);
    const delta = y - lastY;

    if (y <= SHOW_ZONE) {
      applyHidden(false);
      lastY = y;
      return;
    }

    if (Math.abs(delta) < 8) {
      lastY = y;
      return;
    }

    if (!hidden && delta > 0 && y > HIDE_AFTER && (y - lastToggleY) > HYSTERESIS) {
      applyHidden(true);
    } else if (hidden && delta < 0 && (lastToggleY - y) > HYSTERESIS) {
      applyHidden(false);
    }
    lastY = y;
  }

  function requestScrollCheck(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(evaluateScroll);
  }

  window.addEventListener("resize", setTopbarHeight, { passive: true });
  window.addEventListener("scroll", requestScrollCheck, { passive: true });
  window.DGTopbar = {
    hide: () => applyHidden(true),
    show: () => applyHidden(false),
    refresh: setTopbarHeight,
    isHidden: () => hidden
  };
  setTopbarHeight();
  try { localStorage.removeItem("dg_topbar_hidden"); } catch(e) {}
  applyHidden(false);
})();

// --------------------- Portal home falling background ---------------------
(function initPortalHomeFalling(){
  const layer = document.getElementById('portalFallingLayer');
  if (!layer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  layer.innerHTML = '';

  const symbols = ['✦', '◇', '◆', '●', '◎', '#', '@', '/', 'D', '↯', '⌁', '∞', '⬡', '▱'];
  const palette = [
    { color: '#a769ff', glow: 'rgba(167, 105, 255, 0.70)' },
    { color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.68)' },
    { color: '#f0abfc', glow: 'rgba(240, 171, 252, 0.58)' },
    { color: '#7dd3fc', glow: 'rgba(125, 211, 252, 0.62)' },
    { color: '#35f29a', glow: 'rgba(53, 242, 154, 0.50)' },
    { color: '#ffd166', glow: 'rgba(255, 209, 102, 0.48)' }
  ];

  Array.from({ length: 104 }).forEach((_, index) => {
    const element = document.createElement('span');
    const accent = palette[index % palette.length];
    element.className = 'portal-falling-symbol';
    element.textContent = symbols[index % symbols.length];
    element.style.setProperty('--left', `${Math.random() * 100}%`);
    element.style.setProperty('--size', `${25 + Math.random() * 50}px`);
    element.style.setProperty('--duration', `${8 + Math.random() * 11}s`);
    element.style.setProperty('--delay', `${-Math.random() * 20}s`);
    element.style.setProperty('--drift', `${-110 + Math.random() * 220}px`);
    element.style.setProperty('--rotation', `${-35 + Math.random() * 70}deg`);
    element.style.setProperty('--opacity', `${0.25 + Math.random() * 0.28}`);
    element.style.setProperty('--color', accent.color);
    element.style.setProperty('--glow', accent.glow);
    layer.appendChild(element);
  });
})();
