// leaderboard, import()ed on first visit: ?rows=first shaped small, windowed rows, profile panel by import()
import { windowedRows } from './windowed-rows.js';

const profilePanel = () => import('./profile.js');
const leaderboardApi = (slug) => `/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first`;

/** A bounty's ranked entries: pot and prize summary, then rank (top 3 marked), entrant, entry, score, prize, windowed (only the rows in view are drawn, so 5,000 rows scroll like 30); an entrant's link opens their profile in a side panel (?u=<handle>), which query() swaps in place. */
export async function renderLeaderboard(slug, tools, handle) {
  const { cachedFetch, patchList, patchText, money, esc } = tools, here = `#/bounty/${esc(slug)}/leaderboard`;
  const s = encodeURIComponent(slug);
  const [b, lb] = await Promise.all([
    cachedFetch(`/competitions/${s}?submissions=summary`),
    cachedFetch(leaderboardApi(slug), {
      ttl: 60000,
      shape: (j) => {
        const col = j.columns?.find((c) => c.key === j.rank_key)?.title || j.rank_key || 'Score';
        const score = (v, d) => j.rank_key === 'judge' && v != null ? (v / 1e4).toFixed(1) + '%' : d ?? v ?? '—';
        const rows = [...(j.entries || []).map((e) => ({ ...e, value: e.values?.[j.rank_key], display: e.display?.[j.rank_key] })), ...(j.rest || [])]
          .map((e) => ({ id: e.submission_id, rank: e.rank, handle: e.handle || '?', title: e.title || '', score: score(e.value, e.display), prize: e.prize_eligible ? e.prize_rank : null, tag: e.house ? 'house' : e.baseline ? 'baseline' : '' }));
        return { col, rows, phase: j.phase?.title, held: j.phase?.placements_held, visible: j.phase?.scores_visible !== false, ends: j.phase?.ends_at };
      },
    }),
  ]);
  const prize = new Map((b.rewardsNow || []).map((r) => [+r.place, r.amountUsd]));
  const el = document.createElement('article');
  el.innerHTML = `<p class="top" style="justify-content:flex-start"><a href="#/">← All bounties</a><a href="#/bounty/${esc(slug)}">Bounty page</a></p>
<h1>Leaderboard · <a href="#/bounty/${esc(slug)}" style="color:inherit">${esc(b.title)}</a></h1>
<div class="box" style="display:flex;flex-wrap:wrap;gap:12px 32px;align-items:end;margin:10px 0">
 <div><small class="${+b.entryFeesUsd ? 'live' : ''}">${+b.entryFeesUsd ? 'Live pot' : 'Reward'}</small><div class="pot">${money(b.potUsd || b.rewardAmount)}</div></div>
 <dl class="facts big" style="flex:1;min-width:260px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
  <div><dt>Ranked entries</dt><dd>${lb.rows.length.toLocaleString('en-US')}</dd></div><div><dt>Paid places</dt><dd>${prize.size || '—'}</dd></div>
  <div><dt>Top prize</dt><dd class="open">${prize.has(1) ? money(prize.get(1)) : '—'}</dd></div><div><dt>Phase</dt><dd>${esc(lb.phase || '—')}</dd></div></dl></div>
${lb.held ? '<p class="mute">Places are unofficial until the results publish.</p>' : ''}
<div class="cols"><div><div class="bar"><label>Find entrant or entry <input type="search" data-f="q" placeholder="handle or title"></label>
 <span data-f="where" class="mute"></span></div>
<div class="win" data-f="win"><table><thead><tr><th>Rank</th><th>Entrant</th><th class="t">Entry</th><th class="n">${esc(lb.col)}</th><th class="n">Prize</th></tr></thead><tbody data-f="rows"></tbody></table></div>
${lb.rows.length ? '' : `<p class="box">${lb.visible ? 'No ranked entries yet.' : 'Placements are held until the results publish: make.fun lists no entries yet.'}</p>`}</div><aside class="side" data-f="panel"></aside></div>`;
  const f = (n) => el.querySelector(`[data-f=${n}]`);
  const rowHtml = '<td><span></span></td><td><a></a> <small></small></td><td class="t"></td><td class="n"></td><td class="n"></td>';
  const win = windowedRows(f('win'), f('rows'), {
    rowHeight: 37, patchList, key: (r) => r.id, make: () => Object.assign(document.createElement('tr'), { innerHTML: rowHtml }),
    update: (tr, r) => {
      const [rank, who, entry, score, pay] = tr.children;
      rank.firstChild.className = 'rk' + (r.rank > 0 && r.rank < 4 ? ' p p' + r.rank : '');
      patchText(rank.firstChild, r.rank ?? '—', false);
      who.firstChild.href = `${here}?u=${encodeURIComponent(r.handle)}`;
      patchText(who.firstChild, r.handle, false);
      patchText(who.lastChild, r.tag, false);
      patchText(entry, r.title, false);
      entry.title = r.title;
      patchText(score, r.score, false);
      patchText(pay, r.prize && prize.has(r.prize) ? money(prize.get(r.prize)) : '—', false);
    },
    onRange: (first, last, total) => patchText(f('where'), `${total.toLocaleString('en-US')} rows · rendering ${last - first} of ${total.toLocaleString('en-US')} rows`, false),
  });
  const filter = () => {
    const q = f('q').value.trim().toLowerCase();
    win.set(q ? lb.rows.filter((r) => r.handle.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)) : lb.rows);
  };
  f('q').oninput = filter;
  // the profile side panel: import()ed with the first ?u=, then swapped in place; a stale answer is dropped
  let asked = 0;
  const query = async (u) => {
    const mine = ++asked, panel = f('panel');
    el.querySelector('.cols').classList.toggle('one', !u);
    if (!u) return panel.replaceChildren();
    try {
      const view = await (await profilePanel()).renderProfile(u, tools, { close: here });
      if (mine === asked) panel.replaceChildren(view.el);
    } catch (error) {
      if (mine === asked) panel.innerHTML = `<p class="box">Could not load @${esc(u)}: ${esc(error.message)}</p>`;
    }
    if (mine === asked && innerWidth <= 820) panel.scrollIntoView({ block: 'start' });
  };
  filter();
  await query(handle);
  return { el, query, title: `Leaderboard · ${b.title} · Fast Board` };
}
