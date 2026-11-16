// board extras, import()ed after the cards are painted: pot headline, search, category chips, sort, No fee filter; takes over index.html's cards by keyed patching and revalidates every 60 s
import { keep } from './api-cache.js';

const board = { el: null, items: [], sort: sessionStorage.getItem('mf:sort') || 'soon', free: false, q: '', cat: '' };

/** The board: a money-first headline (live pots, open count, next close), then keyed cards filtered by search, category and fee, sorted; a card turns urgent in its last 24 h and closes once its deadline passes, whatever its status. */
export async function renderBoard({ cachedFetch, patchList, patchText, money, timeLeft, esc }) {
  // first round: what index.html fetched for first paint (fb.board), kept for the next visit; later rounds through cachedFetch
  const path = '/competitions?status=open&activity=times', firstRound = async () => {
    const items = await fb.board().catch(() => null);
    if (!Array.isArray(items)) return cachedFetch(path, { shape: (j) => j.items });
    keep(path, { at: Date.now(), data: items });
    return items;
  };
  const load = async (first) => (await (first ? firstRound() : cachedFetch(path, { shape: (j) => j.items }))).map((c) => ({
    slug: c.slug, title: c.title, category: c.category || 'Bounty', pot: +c.potUsd || c.rewardAmount, fees: +c.entryFeesUsd || 0, fee: +c.entryFeeUsd || 0,
    ends: c.deadline, opens: c.opensAt || c.publishedAt, entries: c.submissionCount,
  }));
  if (!board.el) {
    // adopt the headline and the grid index.html painted, if it painted them
    board.el = document.createElement('section');
    board.el.append(...(app.querySelector('.grid') ? app.children : []));
    if (!board.el.firstChild) board.el.innerHTML = '<h1 class="lede"></h1><ul class="grid"></ul>';
    board.el.querySelector('.grid').ariaLabel = 'Bounties';
    board.el.insertAdjacentHTML('beforeend', '<p class="mute" hidden>No bounty matches these filters.</p>');
  }
  const draw = () => {
    const now = Date.now(), open = (c) => Date.parse(c.ends) > now, q = board.q.toLowerCase();
    const counts = {};
    for (const c of board.items) counts[c.category] = (counts[c.category] || 0) + 1;
    const chips = [['', 'All', board.items.length], ...Object.keys(counts).sort().map((k) => [k, k, counts[k]])].map(([k, label, n]) => `<button data-cat="${esc(k)}">${esc(label)} <small>${n}</small></button>`).join('');
    const catsEl = document.getElementById('cats');
    if (catsEl.dataset.html !== chips) catsEl.innerHTML = catsEl.dataset.html = chips;
    document.querySelectorAll('#sort button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.cat != null ? b.dataset.cat === board.cat : board.free));
    const list = board.items.filter((c) => (!board.free || !c.fee) && (!board.cat || c.category === board.cat) && (!q || `${c.title} ${c.category} ${c.slug}`.toLowerCase().includes(q)))
      .sort((a, b) => (open(b) - open(a)) || (board.sort === 'pot' ? b.pot - a.pot : board.sort === 'entries' ? b.entries - a.entries : Date.parse(a.ends) - Date.parse(b.ends)));
    const live = board.items.filter(open), next = [...live].sort((a, b) => Date.parse(a.ends) - Date.parse(b.ends))[0];
    board.el.firstChild.innerHTML = !live.length ? 'No open bounties right now' : `<span class="pot">${money(live.reduce((s, c) => s + c.pot, 0))}</span> in live pots · <b>${live.length}</b> open · next closes in <a href="#/bounty/${esc(next.slug)}" title="${esc(next.title)}" data-ends="${next.ends}">${timeLeft(next.ends)}</a>`;
    patchList(board.el.querySelector('.grid'), list, (c) => c.slug, (c) => {
      const li = document.createElement('li');
      li.innerHTML = `<div class="top"><span data-f="cat"></span><span class="pill" data-f="state"></span></div><h3><a href="#/bounty/${esc(c.slug)}"></a></h3>` +
        '<div class="pot"><span data-f="pot"></span><small data-f="potnote"></small></div>' +
        `<dl><div><dt>Entry fee</dt><dd data-f="fee"></dd></div><div><dt data-f="when">Time left</dt><dd data-ends="${c.ends}"></dd></div><div><dt>Entries</dt><dd><a data-f="entries" href="#/bounty/${esc(c.slug)}/leaderboard"></a></dd></div></dl>`;
      return li;
    }, (li, c) => {
      const f = (n) => li.querySelector(`[data-f=${n}]`), left = Date.parse(c.ends) - now, soon = Date.parse(c.opens) > now;
      li.className = 'card' + (left <= 0 ? ' closed' : !soon && left < 864e5 ? ' urgent' : '');
      patchText(f('cat'), c.category, false);
      patchText(li.querySelector('h3 a'), c.title, false);
      const state = f('state');
      state.className = 'pill ' + (left <= 0 ? 'shut' : soon || left < 864e5 ? 'soon' : 'open');
      patchText(state, left <= 0 ? 'Entries closed' : soon ? 'Upcoming' : left < 864e5 ? 'Closing soon' : 'Open', false);
      patchText(f('pot'), money(c.pot));
      f('potnote').className = c.fees ? 'live' : '';
      patchText(f('potnote'), c.fees ? `live · +${money(c.fees)} fees` : 'reward', false);
      patchText(f('fee'), c.fee ? money(c.fee) : 'Free', false);
      const clock = li.querySelector('[data-ends]');
      clock.dataset.ends = soon ? c.opens : c.ends;
      f('when').className = left > 0 ? 'live' : '';
      patchText(f('when'), soon ? 'Opens in' : 'Time left', false);
      patchText(clock, timeLeft(clock.dataset.ends), false);
      patchText(f('entries'), c.entries.toLocaleString('en-US'));
    });
    board.el.lastChild.hidden = list.length > 0;
    clearTimeout(board.flip);
    const flipAt = Math.min(...board.items.flatMap((c) => [Date.parse(c.ends), Date.parse(c.ends) - 864e5, Date.parse(c.opens)]).filter((t) => t > now));
    if (flipAt - now < 864e5) board.flip = setTimeout(draw, flipAt - now + 50);
  };
  const bar = document.getElementById('sort');
  bar.innerHTML = `<input type=search id=q placeholder="Search bounties" aria-label="Search bounties" value="${esc(board.q)}"><span id=cats role=group aria-label=Category></span><select id=order aria-label="Sort bounties">` +
    [['soon', 'Ending soon'], ['pot', 'Biggest pot'], ['entries', 'Most entries']].map(([k, label]) => `<option value=${k}>${label}</option>`).join('') + '</select><button data-free>No fee</button>';
  bar.querySelector('#order').value = board.sort;
  bar.querySelector('#order').onchange = (e) => { sessionStorage.setItem('mf:sort', (board.sort = e.target.value)); draw(); };
  bar.querySelector('#q').oninput = (e) => { board.q = e.target.value.trim(); draw(); };
  bar.onclick = (e) => {
    const { free, cat } = e.target.closest('button')?.dataset || {};
    if (cat != null) board.cat = cat;
    else if (free != null) board.free = !board.free;
    else return;
    draw();
  };
  board.items = await load(!board.items.length);
  draw();
  const timer = setInterval(async () => { if (!document.hidden) board.items = await load().catch(() => board.items), draw(); }, 60000);
  return { el: board.el, title: 'make.fun bounties: live pots, fees and deadlines', cleanup: () => { clearInterval(timer); clearTimeout(board.flip); bar.innerHTML = ''; } };
}
