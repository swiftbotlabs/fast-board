// board + router, the only first-load module: cachedFetch (memory + sessionStorage, ETag If-None-Match revalidation, in-flight dedupe), keyed patchList, one shared timeLeft ticker; other views import() on demand
const API = 'https://make.fun/api';
const app = document.getElementById('app');
const cache = { mem: new Map(), inflight: new Map(), network: 0, revalidated: 0, hits: 0 };
let board = { el: null, items: [], sort: sessionStorage.getItem('mf:sort') || 'soon', free: false };

/** GET an API path once: fresh copies (ttl ms) come from memory or sessionStorage; older ones revalidate with If-None-Match (304 keeps the copy). */
async function cachedFetch(path, { ttl = 30000, shape = (json) => json } = {}) {
  let hit = cache.mem.get(path);
  if (!hit) try { hit = JSON.parse(sessionStorage.getItem('mf:' + path)); } catch {}
  if (hit && Date.now() - hit.at < ttl) return cache.hits++, meter(), hit.data;
  if (cache.inflight.has(path)) return cache.inflight.get(path);
  const request = fetch(API + path, { headers: hit?.etag ? { 'If-None-Match': hit.etag } : {} })
    .then(async (res) => {
      cache.network++;
      if (res.status === 304 && hit) cache.revalidated++, hit.at = Date.now();
      else if (res.ok) hit = { etag: res.headers.get('ETag'), at: Date.now(), data: shape(await res.json()) };
      else if (!hit) throw new Error(res.status === 404 ? 'Not found on make.fun' : res.status === 429 ? 'make.fun rate limit reached, try again in a minute' : `make.fun answered ${res.status}`);
      cache.mem.set(path, hit);
      try { sessionStorage.setItem('mf:' + path, JSON.stringify(hit)); } catch {}
      return hit.data;
    })
    .catch((error) => { if (hit) return hit.data; throw error; })
    .finally(() => { cache.inflight.delete(path); meter(); });
  cache.inflight.set(path, request);
  return request;
}

/** '2d 04h 10m', '3h 05m 09s' or 'ended': one shared ticker below refreshes every [data-ends] element once a second. */
function timeLeft(iso) {
  let s = Math.floor((Date.parse(iso) - Date.now()) / 1000);
  if (!(s > 0)) return 'ended';
  const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, p = (n) => String(n).padStart(2, '0');
  return d ? `${d}d ${p(h)}h ${p(m)}m` : `${h}h ${p(m)}m ${p(s % 60)}s`;
}
setInterval(() => document.querySelectorAll('[data-ends]').forEach((el) => patchText(el, timeLeft(el.dataset.ends), false)), 1000);

/** Keyed DOM update: reuse each item's node by key, create only new ones, move only misplaced ones, drop the gone. */
function patchList(parent, items, key, make, update) {
  const old = new Map([...parent.children].map((el) => [el.dataset.key, el]));
  let at = parent.firstElementChild;
  for (const item of items) {
    const k = String(key(item));
    let el = old.get(k);
    if (el) old.delete(k);
    else (el = make(item)).dataset.key = k;
    update(el, item);
    if (el === at) at = at.nextElementSibling;
    else parent.insertBefore(el, at);
  }
  old.forEach((el) => el.remove());
}

/** Set text only when it changed, flashing a changed live number. */
function patchText(el, text, flash = true) {
  if (!el || el.textContent === String(text)) return;
  if (flash && el.textContent) el.classList.remove('flash'), void el.offsetWidth, el.classList.add('flash');
  el.textContent = text;
}

const money = (v) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(+v) ? 0 : 2 });
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Board: open bounties as keyed cards (live pot biggest, then fee, time left, entries); sort/filter reorders nodes, a 60 s revalidation patches them. */
async function renderBoard() {
  const load = () => cachedFetch('/competitions?status=open&activity=times', {
    shape: (j) => j.items.map((c) => ({
      slug: c.slug, title: c.title, category: c.category, pot: +c.potUsd || c.rewardAmount, fees: +c.entryFeesUsd || 0, fee: +c.entryFeeUsd || 0,
      payers: c.entryFeePayers, ends: c.deadline, opens: c.opensAt || c.publishedAt, entries: c.submissionCount,
    })),
  });
  if (!board.el) {
    board.el = document.createElement('section');
    board.el.innerHTML = '<h1 class="mute" style="font-size:1rem;font-weight:600;margin:0 0 8px">Live bounties: who pays most, costs least and ends soonest</h1><div class="picks"></div><ul class="grid" aria-label="Bounties"></ul>';
  }
  const draw = () => {
    const now = Date.now(), open = (c) => Date.parse(c.ends) > now;
    const list = board.items.filter((c) => !board.free || !c.fee).sort((a, b) => (open(b) - open(a)) || (board.sort === 'pot' ? b.pot - a.pot : board.sort === 'entries' ? b.entries - a.entries : Date.parse(a.ends) - Date.parse(b.ends)));
    const live = board.items.filter(open), top = [...live].sort((a, b) => b.pot - a.pot)[0], next = [...live].sort((a, b) => Date.parse(a.ends) - Date.parse(b.ends))[0];
    board.el.querySelector('.picks').innerHTML = !live.length ? '' :
      `<a href="#/">${live.length} open · <b>${money(live.reduce((s, c) => s + c.pot, 0))}</b> in pots</a>` +
      `<a href="#/bounty/${esc(top.slug)}">Biggest pot <b>${money(top.pot)}</b> · ${esc(top.title)}</a>` +
      `<a href="#/bounty/${esc(next.slug)}">Ends next <b data-ends="${next.ends}">${timeLeft(next.ends)}</b> · ${esc(next.title)}</a>` +
      `<a href="#/">Free to enter <b>${live.filter((c) => !c.fee).length} of ${live.length}</b></a>`;
    patchList(board.el.querySelector('.grid'), list, (c) => c.slug, (c) => {
      const li = document.createElement('li');
      li.className = 'card';
      li.innerHTML = `<div class="top"><span data-f="cat"></span><span class="pill" data-f="state"></span></div><h3><a href="#/bounty/${esc(c.slug)}"></a></h3>` +
        '<div class="pot"><span data-f="pot"></span><small data-f="potnote"></small></div>' +
        `<dl class="facts"><div><dt>Entry fee</dt><dd data-f="fee"></dd></div><div><dt data-f="when">Time left</dt><dd data-ends="${c.ends}"></dd></div><div><dt>Entries</dt><dd><a data-f="entries" href="#/bounty/${esc(c.slug)}/leaderboard"></a></dd></div></dl>`;
      return li;
    }, (li, c) => {
      const f = (n) => li.querySelector(`[data-f=${n}]`), left = Date.parse(c.ends) - now, soon = Date.parse(c.opens) > now;
      li.classList.toggle('closed', left <= 0);
      patchText(f('cat'), c.category || 'Bounty', false);
      patchText(li.querySelector('h3 a'), c.title, false);
      const state = f('state');
      state.className = 'pill ' + (left <= 0 ? 'shut' : soon || left < 864e5 ? 'soon' : 'open');
      patchText(state, left <= 0 ? 'Entries closed' : soon ? 'Upcoming' : left < 864e5 ? 'Closing soon' : 'Open', false);
      patchText(f('pot'), money(c.pot));
      f('potnote').className = c.fees ? 'live' : '';
      patchText(f('potnote'), c.fees ? `live pot · +${money(c.fees)} from ${c.payers} fees` : 'reward', false);
      patchText(f('fee'), c.fee ? money(c.fee) : 'Free', false);
      const clock = li.querySelector('[data-ends]');
      clock.dataset.ends = soon ? c.opens : c.ends;
      patchText(f('when'), soon ? 'Opens in' : 'Time left', false);
      patchText(clock, timeLeft(clock.dataset.ends), false);
      patchText(f('entries'), c.entries.toLocaleString('en-US'));
    });
  };
  document.getElementById('sort').innerHTML = [['soon', 'Ending soon'], ['pot', 'Biggest pot'], ['entries', 'Most entries'], ['free', 'No fee']]
    .map(([k, label]) => `<button data-sort="${k}" aria-pressed="${k === 'free' ? board.free : board.sort === k}">${label}</button>`).join('');
  document.getElementById('sort').onclick = (e) => {
    const k = e.target.dataset?.sort;
    if (!k) return;
    if (k === 'free') board.free = !board.free;
    else sessionStorage.setItem('mf:sort', (board.sort = k));
    document.querySelectorAll('[data-sort]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.sort === 'free' ? board.free : b.dataset.sort === board.sort));
    draw();
  };
  board.items = await load();
  draw();
  const timer = setInterval(async () => { if (!document.hidden) board.items = await load().catch(() => board.items), draw(); }, 60000);
  return { el: board.el, title: 'make.fun bounties: live pots, fees and deadlines', cleanup: () => { clearInterval(timer); document.getElementById('sort').innerHTML = ''; } };
}

/** Footer: this page's own requests and bytes, measured with the Performance API, and what cachedFetch saved. */
function meter() {
  const res = performance.getEntriesByType('resource'), nav = performance.getEntriesByType('navigation')[0];
  const bytes = res.reduce((s, r) => s + (r.transferSize || 0), nav?.transferSize || 0);
  document.getElementById('meter').textContent = `This visit: ${res.length + 1} requests, ${(bytes / 1024).toFixed(1)} KB measured by the Performance API · API: ${cache.network} network (${cache.revalidated} answered 304 by ETag), ${cache.hits} served from cache · live data from make.fun`;
}

const tools = { cachedFetch, patchList, patchText, timeLeft, money, esc };
let current = null, seq = 0;

/** Hash router: #/ board, #/bounty/<slug>, #/bounty/<slug>/leaderboard, #/u/<handle>; views other than the board are import()ed on demand. */
async function route() {
  const my = ++seq;
  window.__shotReady = false;
  current?.cleanup?.();
  current = null;
  const [, kind, id, sub] = location.hash.split('/').map((s) => decodeURIComponent(s || ''));
  let view;
  try {
    view = kind === 'bounty' && sub === 'leaderboard' ? await (await import('./leaderboard.js')).renderLeaderboard(id, tools)
      : kind === 'bounty' && id ? await (await import('./bounty.js')).renderBounty(id, tools)
      : kind === 'u' && id ? await (await import('./profile.js')).renderProfile(id, tools)
      : await renderBoard();
  } catch (error) {
    const el = document.createElement('section');
    el.innerHTML = `<h1>Could not load this page</h1><p>${esc(error.message)}</p><p><a href="#/">Back to the board</a></p>`;
    view = { el, title: 'Error · make.fun bounties' };
  }
  if (my !== seq) return view.cleanup?.();
  current = view;
  app.replaceChildren(view.el);
  document.title = view.title;
  scrollTo(0, 0);
  if (kind) app.focus({ preventScroll: true });
  window.__shotReady = true;
}

addEventListener('hashchange', route);
new PerformanceObserver(meter).observe({ type: 'resource', buffered: true });
route();
