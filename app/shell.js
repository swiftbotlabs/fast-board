// app shell, import()ed after first paint: hash router that import()s each view on first visit
import './styles-later.js';
import { cachedFetch, keep } from './api-cache.js';
import { patchList, patchText } from './dom-patch.js';
import { meter } from './speed-meter.js';

const pad = (n) => String(n).padStart(2, '0'), root = document.documentElement;
const tools = {
  cachedFetch, patchList, patchText,
  money: (v) => '$' + (+v || 0).toLocaleString('en', { minimumFractionDigits: v % 1 ? 2 : 0 }),
  timeLeft: (t, s = (Date.parse(t) - Date.now()) / 1e3 | 0) => s <= 0 ? 'ended' : s > 86399 ? `${s / 86400 | 0}d ${pad(s / 3600 % 24 | 0)}h ${pad(s / 60 % 60 | 0)}m` : `${s / 3600 | 0}h ${pad(s / 60 % 60 | 0)}m ${pad(s % 60)}s`,
  esc: (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`),
};
const nav = { view: null, path: null, seq: 0 };

/** Hash router: #/ board, #/bounty/<slug>, #/bounty/<slug>/leaderboard[?u=<handle> opens that profile beside it], #/u/<handle>; anything else after ? or & (a theme hint) is ignored. A view with query() takes a new ?u= in place; a bounty route sits beside the board list (master-detail). */
async function route() {
  const hash = location.hash.slice(1), cut = hash.search(/[?&]/), path = cut < 0 ? hash : hash.slice(0, cut);
  const u = new URLSearchParams(cut < 0 ? '' : hash.slice(cut + 1)).get('u');
  if (path === nav.path && nav.view?.query) return nav.view.query(u);
  const my = ++nav.seq, start = performance.now();
  window.__shotReady = false;
  nav.view?.cleanup?.();
  nav.view = null;
  nav.path = path;
  const [, kind, id, sub] = path.split('/').map((s) => decodeURIComponent(s || ''));
  let view;
  try {
    view = kind === 'bounty' && sub === 'leaderboard' ? await (await import('./views/leaderboard.js')).renderLeaderboard(id, tools, u)
      : kind === 'bounty' && id ? await (await import('./views/bounty.js')).renderBounty(id, tools)
      : kind === 'u' && id ? await (await import('./views/profile.js')).renderProfile(id, tools)
      : await (await import('./board-more.js')).renderBoard(tools);
  } catch (error) {
    const el = document.createElement('section');
    el.innerHTML = `<h1>Could not load this page</h1><p>${tools.esc(error.message)}</p><p><button>Try again</button> <a href="#/">Back to the board</a></p>`;
    el.querySelector('button').onclick = () => { nav.path = null; route(); };
    view = { el, title: 'Error · Fast Board' };
  }
  if (my !== nav.seq) return view.cleanup?.();
  nav.view = view;
  const el = kind === 'bounty' && id ? await (await import('./master-detail.js')).masterDetail(view.el, id, tools) : view.el;
  if (my !== nav.seq) return;
  app.className = '';
  if (app.firstChild !== el || app.childNodes.length > 1) app.replaceChildren(el);
  document.title = view.title;
  if (kind && !(kind === 'bounty' && document.querySelector('.md>nav')?.contains(document.activeElement))) scrollTo(0, 0), app.focus({ preventScroll: true });
  // a deep link without the board's first paint marks its first view here
  if (!performance.getEntriesByName('paint').length) performance.mark('paint');
  meter(performance.now() - start);
  window.__shotReady = true;
}

// the theme: a ?theme= hint, else the saved choice, else the system's; the button flips it and saves it
root.style.colorScheme = /theme=(dark|light)/.exec(location.href)?.[1] || localStorage.getItem('mf:theme') || '';
const header = document.querySelector('header');
header.append(Object.assign(document.createElement('nav'), { id: 'sort', ariaLabel: 'Find and sort bounties' }), Object.assign(document.createElement('button'), {
  id: 'theme', type: 'button', title: 'Light or dark theme', ariaLabel: 'Switch between light and dark theme',
  onclick() {
    const dark = (root.style.colorScheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    root.style.colorScheme = dark ? 'light' : 'dark';
    try { localStorage.setItem('mf:theme', root.style.colorScheme); } catch {}
  },
}));
// index.html's one board request seeds the cache, so the board view and the master list reuse it
await B.then((j) => keep('/competitions?status=open&activity=times', { at: Date.now(), data: j.items })).catch(() => {});
// index.html's row template (row(), reused by the master list) now formats with the full money and clock
window.M = tools.money;
window.L = tools.timeLeft;
app.tabIndex = -1;
setInterval(() => document.querySelectorAll('[data-ends]').forEach((el) => patchText(el, tools.timeLeft(el.dataset.ends), false)), 1000);
addEventListener('hashchange', route);
route();
