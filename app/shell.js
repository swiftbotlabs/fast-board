// app shell, import()ed after first paint: hash router that import()s each view on first visit
import './styles-later.js';
import { cachedFetch } from './api-cache.js';
import { patchList, patchText } from './dom-patch.js';
import { meter } from './speed-meter.js';

const tools = { cachedFetch, patchList, patchText, money: fb.money, timeLeft: fb.left, esc: (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`) };
const nav = { view: null, path: null, seq: 0 };

/** Hash router: #/ board, #/bounty/<slug>, #/bounty/<slug>/leaderboard[?u=<handle> opens that profile beside it], #/u/<handle>; anything else after ? or & (a theme hint) is ignored. A view with query() takes a new ?u= in place. */
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
    view = { el, title: 'Error · make.fun bounties' };
  }
  if (my !== nav.seq) return view.cleanup?.();
  nav.view = view;
  if (app.firstChild !== view.el || app.childNodes.length > 1) app.replaceChildren(view.el);
  document.title = view.title;
  if (kind) scrollTo(0, 0), app.focus({ preventScroll: true });
  // a deep link paints its first view here, not in index.html
  if (!performance.getEntriesByName('fb-paint').length) performance.mark('fb-paint');
  meter(performance.now() - start);
  window.__shotReady = true;
}

app.tabIndex = -1;
document.getElementById('sort').ariaLabel = 'Find and sort bounties';
document.querySelector('header').append(Object.assign(document.createElement('button'), {
  id: 'theme', type: 'button', title: 'Light or dark theme', ariaLabel: 'Switch between light and dark theme',
  // flips the theme showing (system, saved or ?theme= hint) and saves it; index.html applies the saved one before first paint
  onclick() {
    const dark = (R.style.colorScheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    R.style.colorScheme = dark ? 'light' : 'dark';
    try { localStorage.setItem('mf:theme', R.style.colorScheme); } catch {}
  },
}));
setInterval(() => document.querySelectorAll('[data-ends]').forEach((el) => patchText(el, fb.left(el.dataset.ends), false)), 1000);
addEventListener('hashchange', route);
route();
