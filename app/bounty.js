// bounty page, loaded by import(): one cached detail request (+ /live status); livePot listens to the /live/stream SSE and patches pot, entries and rewards rows in place (60 s polling if the stream drops)
const bountyApi = (slug) => `/competitions/${encodeURIComponent(slug)}?submissions=summary`;
const liveApi = (slug) => `/competitions/${encodeURIComponent(slug)}/live`;
const utcDate = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : '—';

/** Small, safe Markdown for descriptions and rules: headings, lists, code, tables, links, bold. */
export function markdown(md, esc) {
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]*)\)/g, (_, t, u) => `<a href="${u[0] === '/' ? 'https://make.fun' + u : u}" rel="noopener">${t}</a>`);
  let html = '', para = [], list = null, rows = null, code = null;
  const flush = () => {
    if (para.length) html += `<p>${inline(para.join(' '))}</p>`;
    if (list) html += `<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`;
    if (rows) html += `<div style="overflow:auto"><table>${rows.map((r, i) => `<tr>${r.map((c) => `<${i ? 'td' : 'th'}>${inline(c)}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table></div>`;
    para = [], list = null, rows = null;
  };
  for (const line of String(md || '').split('\n')) {
    if (code !== null) { if (/^\s*```/.test(line)) html += `<pre><code>${esc(code)}</code></pre>`, code = null; else code += line + '\n'; continue; }
    if (/^\s*```/.test(line)) { flush(); code = ''; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)/), li = line.match(/^\s*(?:([-*])|\d+[.)])\s+(.*)/);
    if (h) flush(), html += `<h${Math.min(h[1].length + 2, 6)}>${inline(h[2])}</h${Math.min(h[1].length + 2, 6)}>`;
    else if (/^\s*\|/.test(line)) { if (!rows) flush(), rows = []; if (!/^\s*\|[\s:|-]+\|\s*$/.test(line)) rows.push(line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())); }
    else if (li) { const tag = li[1] ? 'ul' : 'ol'; if (!list || list.tag !== tag) flush(), list = { tag, items: [] }; list.items.push(li[2]); }
    else if (!line.trim()) flush();
    else if (list && /^\s+/.test(line)) list.items[list.items.length - 1] += ' ' + line.trim();
    else { if (list || rows) flush(); para.push(line.trim()); }
  }
  if (code !== null) html += `<pre><code>${esc(code)}</code></pre>`;
  flush();
  return html;
}

/** One bounty: summary, live pot, fee, time left, entries, description, rules, rewards table, dates and status. */
export async function renderBounty(slug, { cachedFetch, patchList, patchText, timeLeft, money, esc }) {
  const path = bountyApi(slug);
  const [b, live] = await Promise.all([cachedFetch(path), cachedFetch(liveApi(slug), { ttl: 20000 }).catch(() => null)]);
  const ended = Date.parse(b.deadline) <= Date.now(), upcoming = Date.parse(b.opensAt || b.publishedAt) > Date.now();
  const state = b.resolvedAt || b.status === 'resolved' ? ['Resolved', 'open'] : ended ? ['Entries closed', 'shut'] : upcoming ? ['Upcoming', 'soon'] : ['Open for entries', 'open'];
  const el = document.createElement('article');
  el.innerHTML = `<p class="top" style="justify-content:flex-start"><a href="#/">← All bounties</a><span>${esc(b.category || '')}</span><span>by ${esc(b.sponsor?.name || 'make.fun')}</span></p>
<h1>${esc(b.title)}</h1><p class="mute" style="max-width:80ch;margin:.2em 0 .6em">${esc(b.summary || '')}</p>
<div class="box" style="display:flex;flex-wrap:wrap;gap:12px 32px;align-items:end">
 <div><small>${b.entryFeeUsd ? 'Live pot' : 'Reward'}</small><div class="pot"><span data-f="pot"></span></div><small data-f="potnote" class="${+b.entryFeeUsd ? 'live' : ''}"></small></div>
 <dl class="facts" style="flex:1;min-width:260px;grid-template-columns:repeat(auto-fit,minmax(105px,1fr))">
  <div><dt>Entry fee</dt><dd>${+b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</dd></div>
  <div><dt>Time left</dt><dd data-ends="${esc(b.deadline)}">${timeLeft(b.deadline)}</dd></div>
  <div><dt>Entries</dt><dd data-f="entries"></dd></div>
  <div><dt>Status</dt><dd><span class="pill ${state[1]}">${state[0]}</span></dd></div></dl>
 <div class="bar" style="margin:0"><a href="#/bounty/${esc(slug)}/leaderboard"><b>Leaderboard →</b></a><a href="https://make.fun/bounty/${esc(slug)}" rel="noopener">Open on make.fun</a></div>
</div>
<div class="cols"><div class="prose">
 ${live?.status?.sentence ? `<p><b>Now:</b> ${esc(live.status.sentence)}</p>` : ''}
 ${b.resolution?.summary ? `<h2>How it is judged</h2><p>${esc(b.resolution.summary)}</p>` : ''}
 <h2>Description</h2>${markdown(b.description, esc)}
 ${b.rules ? `<details><summary>Full rules (${Math.round(b.rules.length / 1000)}k characters)</summary>${markdown(b.rules, esc)}</details>` : ''}
</div><aside class="side">
 <section class="box"><h2>Dates</h2><table><tbody>
  <tr><th>Opens</th><td>${utcDate(b.opensAt || b.publishedAt)}</td></tr>
  <tr><th>Deadline</th><td>${utcDate(b.deadline)}</td></tr>
  ${b.race?.endsAt ? `<tr><th>Race ends</th><td>${utcDate(b.race.endsAt)}</td></tr>` : ''}
  ${live?.status?.expected_at && live.status.expected_at !== b.deadline ? `<tr><th>Next step</th><td>${utcDate(live.status.expected_at)}</td></tr>` : ''}
  <tr><th>Resolved</th><td>${b.resolvedAt ? utcDate(b.resolvedAt) : 'not yet'}</td></tr></tbody></table></section>
 <section class="box"><h2>Rewards <small data-f="live" class="${+b.entryFeeUsd ? 'live' : ''}">${+b.entryFeeUsd ? 'live, with fees' : ''}</small></h2>
  <table><thead><tr><th>Place</th><th class="n">Base</th><th class="n">Fee share</th><th class="n">Now</th></tr></thead><tbody data-f="rewards"></tbody></table></section>
</aside></div>`;
  const f = (n) => el.querySelector(`[data-f=${n}]`);
  const paint = (d) => {
    patchText(f('pot'), money(d.potUsd || d.rewardAmount));
    patchText(f('potnote'), +d.entryFeesUsd ? `${money(d.rewardAmount)} + ${money(d.entryFeesUsd)} from ${d.entryFeePayers} entry fees, updating live` : `${money(d.rewardAmount)} paid by ${d.sponsor?.name || 'make.fun'}`);
    patchText(f('entries'), (d.submissionCount || 0).toLocaleString('en-US'));
    const rows = Array.isArray(d.rewardsNow) && d.rewardsNow.length ? d.rewardsNow : Object.entries(d.rewards || {}).map(([place, usd]) => ({ place, baseUsd: usd, feeShareUsd: 0, amountUsd: usd }));
    const groups = rows.reduce((g, r) => {
      const last = g[g.length - 1];
      if (last && +last.amountUsd === +r.amountUsd && +last.baseUsd === +r.baseUsd) last.to = r.place;
      else g.push({ ...r, to: r.place });
      return g;
    }, []);
    patchList(f('rewards'), groups, (r) => r.place, () => Object.assign(document.createElement('tr'), { innerHTML: '<td></td><td class="n"></td><td class="n"></td><td class="n"><b></b></td>' }), (tr, r) => {
      const td = tr.children;
      patchText(td[0], r.to === r.place ? `#${r.place}` : `#${r.place}–${r.to} each`, false);
      patchText(td[1], money(r.baseUsd));
      patchText(td[2], +r.feeShareUsd ? '+' + money(r.feeShareUsd) : '—');
      patchText(td[3].firstChild, money(r.amountUsd));
    });
  };
  paint(b);
  const stop = ended ? () => {} : livePot(slug, async () => paint(await cachedFetch(path, { ttl: 0 })));
  return { el, title: `${b.title} · ${money(b.potUsd || b.rewardAmount)} · make.fun bounties`, cleanup: stop };
}

/** Live pot: one EventSource on /live/stream; a standings (entry or fee) event re-reads the detail just after the minute turns (make.fun's answers and ETags hold for a minute), so at most one request a minute; falls back to 60 s polling. */
export function livePot(slug, refresh) {
  let last = Date.now(), timer = 0, poll = 0;
  const soon = () => {
    if (timer) return;
    const turn = (Math.floor(last / 60000) + 1) * 60000 + 2000;
    timer = setTimeout(() => { timer = 0; last = Date.now(); refresh().catch(() => {}); }, Math.max(1000, turn - Date.now()));
  };
  const stream = 'EventSource' in window ? new EventSource(`https://make.fun/api${liveApi(slug)}/stream`) : null;
  stream?.addEventListener('standings', soon);
  stream?.addEventListener('phase', soon);
  stream?.addEventListener('reset', soon);
  if (stream) stream.onerror = () => { if (stream.readyState === 2 && !poll) poll = setInterval(soon, 60000); };
  else poll = setInterval(soon, 60000);
  return () => { stream?.close(); clearTimeout(timer); clearInterval(poll); };
}
