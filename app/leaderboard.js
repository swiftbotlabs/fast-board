// leaderboard, loaded by import(): one ?rows=first request shaped small before caching (sessionStorage + ETag), reuses the cached bounty detail for prizes; pageLeaderboard shows 50 rows a page through keyed patchList
const PAGE = 50;

/** One page of the (optionally filtered) ranked rows, and the page count. */
export function pageLeaderboard(rows, page, query) {
  const q = query.trim().toLowerCase(), hits = q ? rows.filter((r) => r.handle.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)) : rows;
  const pages = Math.max(1, Math.ceil(hits.length / PAGE)), at = Math.min(Math.max(1, page), pages);
  return { rows: hits.slice((at - 1) * PAGE, at * PAGE), page: at, pages, total: hits.length };
}

/** A bounty's ranked entries: rank, entrant (links to the profile), entry, score, prize. */
export async function renderLeaderboard(slug, { cachedFetch, patchList, patchText, money, esc }) {
  const s = encodeURIComponent(slug);
  const [b, lb] = await Promise.all([
    cachedFetch(`/competitions/${s}?submissions=summary`),
    cachedFetch(`/competitions/${s}/leaderboard?rows=first`, {
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
<p><span class="pot" style="font-size:1.4rem">${money(b.potUsd || b.rewardAmount)}</span> <small class="${+b.entryFeesUsd ? 'live' : ''}">${+b.entryFeesUsd ? 'live pot' : 'reward'} · ${esc(lb.phase || '')} phase · ${lb.rows.length.toLocaleString('en-US')} ranked entries${lb.held ? ' · places unofficial until results publish' : ''}</small></p>
<div class="bar"><label>Find entrant or entry <input type="search" data-f="q" placeholder="handle or title"></label>
 <button data-f="prev">← Prev</button><span data-f="where" aria-live="polite"></span><button data-f="next">Next →</button></div>
<div style="overflow:auto"><table><thead><tr><th class="n">Rank</th><th>Entrant</th><th class="t">Entry</th><th class="n">${esc(lb.col)}</th><th class="n">Prize</th></tr></thead><tbody data-f="rows"></tbody></table></div>
${lb.rows.length ? '' : `<p class="box">${lb.visible ? 'No ranked entries yet.' : 'Placements are held until the results publish: make.fun lists no entries yet.'}</p>`}`;
  const f = (n) => el.querySelector(`[data-f=${n}]`);
  let page = 1;
  const draw = () => {
    const view = pageLeaderboard(lb.rows, page, f('q').value);
    page = view.page;
    patchText(f('where'), `Page ${view.page} of ${view.pages} · ${view.total.toLocaleString('en-US')} rows`, false);
    f('prev').disabled = view.page <= 1;
    f('next').disabled = view.page >= view.pages;
    patchList(f('rows'), view.rows, (r) => r.id, () => Object.assign(document.createElement('tr'), { innerHTML: '<td class="n"><b></b></td><td><a></a> <small></small></td><td class="t"></td><td class="n"></td><td class="n"></td>' }), (tr, r) => {
      const [rank, who, entry, score, pay] = tr.children;
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
