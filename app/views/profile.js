// public profile, import()ed on first visit or as the leaderboard's panel: one cached request, paged rows

/** An account's public profile: picture, links, record (entered, placed, won, prizes) and its entries; as a side panel (panel.close: the href that closes it) it is narrower and lists 6 entries a page. */
export async function renderProfile(handle, { cachedFetch, patchList, patchText, money, esc }, panel = null) {
  const h = encodeURIComponent(handle), pageSize = panel ? 6 : 20;
  const p = await cachedFetch(`/profiles/${h}`, { ttl: 120000 });
  const r = p.record || {}, entries = p.solutions || [];
  const el = document.createElement(panel ? 'section' : 'article');
  if (panel) el.className = 'box';
  el.innerHTML = `${panel ? `<p class="top"><small>Entrant profile</small><a href="${esc(panel.close)}" aria-label="Close profile">Close ✕</a></p>` : '<p class="top" style="justify-content:flex-start"><a href="#/">← All bounties</a></p>'}
<div style="display:flex;gap:14px;align-items:center"><img class="avatar" crossorigin="anonymous" alt="" width="72" height="72" src="https://make.fun/api/profiles/${h}/picture.png">
<div style="min-width:0">${panel ? '<h2 style="margin:0">' : '<h1>'}${esc(p.display_name || p.handle)}${panel ? '</h2>' : '</h1>'}<p class="mute" style="margin:0">@${esc(p.handle)}${p.house ? ' · house account' : ''} · joined ${new Date(p.joined_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
${p.github_login ? ` · <a href="https://github.com/${esc(p.github_login)}" rel="noopener">GitHub</a>` : ''}${p.wallet?.explorer_url?.startsWith('https://') ? ` · <a href="${esc(p.wallet.explorer_url)}" rel="noopener">Wallet ${esc(p.wallet.address.slice(0, 4))}…${esc(p.wallet.address.slice(-4))}</a>` : ''}
 · ${panel ? `<a href="#/u/${h}">Full profile</a> · ` : ''}<a href="https://make.fun/u/${esc(p.handle)}" rel="noopener">make.fun profile</a></p></div></div>
${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
<dl class="facts${panel ? '' : ' box'} big" style="grid-template-columns:repeat(auto-fit,minmax(${panel ? 100 : 120}px,1fr));margin:14px 0">
 <div><dt>Prizes won</dt><dd class="open">${money(r.prize_usd)}</dd></div>
 <div><dt>Entered</dt><dd>${r.competitions_entered ?? 0}</dd></div><div><dt>Placed</dt><dd>${r.competitions_placed ?? 0}</dd></div>
 <div><dt>Won</dt><dd>${r.competitions_won ?? 0}</dd></div><div><dt>Podiums</dt><dd>${r.podium_finishes ?? 0}</dd></div>
 <div><dt>Best place</dt><dd>${r.best_placement ? '#' + r.best_placement : '—'}</dd></div></dl>
<h2>Entries <small>(${entries.length})</small></h2>
<div style="overflow:auto"><table><thead><tr><th>Bounty</th><th class="t">Entry</th><th class="n">Score</th><th class="n">Place</th><th class="n">Prize</th><th class="t">Entered</th></tr></thead><tbody data-f="rows"></tbody></table></div>
<p><button data-f="more">Show more entries</button></p>`;
  let shown = pageSize;
  const more = el.querySelector('[data-f=more]');
  const draw = () => {
    patchList(el.querySelector('[data-f=rows]'), entries.slice(0, shown), (s) => s.submission_id, () => Object.assign(document.createElement('tr'), { innerHTML: '<td><a></a><br><small></small></td><td class="t"></td><td class="n"></td><td class="n"><span></span></td><td class="n"></td><td class="t"></td>' }), (tr, s) => {
      const [bounty, entry, score, place, prize, at] = tr.children, c = s.competition || {};
      bounty.firstChild.href = `#/bounty/${encodeURIComponent(c.slug)}`;
      patchText(bounty.firstChild, c.title || c.slug, false);
      patchText(bounty.lastChild, `${c.category || ''} · ${money(c.reward_usd)} · ${Date.parse(c.deadline) > Date.now() ? 'open' : c.status}`, false);
      patchText(entry, s.title || '', false);
      patchText(score, s.score?.display ?? '—', false);
      place.firstChild.className = 'rk' + (s.placement > 0 && s.placement < 4 ? ' p p' + s.placement : '');
      patchText(place.firstChild, s.placement || '—', false);
      patchText(prize, s.prize_usd ? money(s.prize_usd) : '—', false);
      patchText(at, new Date(s.entered_at).toLocaleDateString('en-GB', { dateStyle: 'medium' }), false);
    });
    more.hidden = shown >= entries.length;
  };
  more.onclick = () => { shown += pageSize; draw(); };
  draw();
  return { el, title: `${p.display_name || p.handle} · Fast Board` };
}
