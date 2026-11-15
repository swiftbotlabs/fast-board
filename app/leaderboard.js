// leaderboard, loaded by import(): one ?rows=first request shaped small before caching (sessionStorage + ETag), reuses the cached bounty detail for prizes; pageLeaderboard shows 50 rows a page through keyed patchList
const PAGE_SIZE = 50;
const leaderboardApi = (slug) => `/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first`;

/** One page of the (optionally filtered) ranked rows, and the page count. */
export function pageLeaderboard(rows, page, query) {
  const q = query.trim().toLowerCase(), hits = q ? rows.filter((r) => r.handle.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)) : rows;
  const pages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE)), at = Math.min(Math.max(1, page), pages);
  return { rows: hits.slice((at - 1) * PAGE_SIZE, at * PAGE_SIZE), page: at, pages, total: hits.length };
}

/** A bounty's ranked entries: pot and prize summary, then rank (top 3 marked), entrant (links to the profile), entry, score, prize. */
export async function renderLeaderboard(slug, { cachedFetch, patchList, patchText, money, esc }) {
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
<div class="bar"><label>Find entrant or entry <input type="search" data-f="q" placeholder="handle or title"></label>
 <button data-f="prev">← Prev</button><span data-f="where" aria-live="polite"></span><button data-f="next">Next →</button></div>
<div style="overflow:auto"><table><thead><tr><th>Rank</th><th>Entrant</th><th class="t">Entry</th><th class="n">${esc(lb.col)}</th><th class="n">Prize</th></tr></thead><tbody data-f="rows"></tbody></table></div>
${lb.rows.length ? '' : `<p class="box">${lb.visible ? 'No ranked entries yet.' : 'Placements are held until the results publish: make.fun lists no entries yet.'}</p>`}`;
  const f = (n) => el.querySelector(`[data-f=${n}]`);
  let page = 1;
  const draw = () => {
    const view = pageLeaderboard(lb.rows, page, f('q').value);
    page = view.page;
    patchText(f('where'), `Page ${view.page} of ${view.pages} · ${view.total.toLocaleString('en-US')} rows`, false);
    f('prev').disabled = view.page <= 1;
    f('next').disabled = view.page >= view.pages;
    patchList(f('rows'), view.rows, (r) => r.id, () => Object.assign(document.createElement('tr'), { innerHTML: '<td><span></span></td><td style="white-space:nowrap"><a></a> <small></small></td><td class="t"></td><td class="n"></td><td class="n"></td>' }), (tr, r) => {
      const [rank, who, entry, score, pay] = tr.children;
      rank.firstChild.className = 'rk' + (r.rank > 0 && r.rank < 4 ? ' p p' + r.rank : '');
      patchText(rank.firstChild, r.rank ?? '—', false);
      who.firstChild.href = `#/u/${encodeURIComponent(r.handle)}`;
      patchText(who.firstChild, r.handle, false);
      patchText(who.lastChild, r.tag, false);
      patchText(entry, r.title, false);
      patchText(score, r.score, false);
      patchText(pay, r.prize && prize.has(r.prize) ? money(prize.get(r.prize)) : '—', false);
    });
  };
  f('q').oninput = () => { page = 1; draw(); };
  f('prev').onclick = () => { page--; draw(); };
  f('next').onclick = () => { page++; draw(); };
  draw();
  return { el, title: `Leaderboard · ${b.title} · make.fun bounties` };
}
