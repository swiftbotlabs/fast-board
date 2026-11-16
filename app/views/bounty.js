// bounty page, import()ed on first visit: one cached detail request, live pot patched in place
import { markdown } from './markdown.js';
import { livePot } from './live-pot.js';

const bountyApi = (slug) => `/competitions/${encodeURIComponent(slug)}?submissions=summary`;
const utcDate = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : '—';

/** One bounty: summary, live pot, fee, time left, entries, description, rules, rewards table (top 3 marked, amounts aligned to the cent), dates and status. */
export async function renderBounty(slug, { cachedFetch, patchList, patchText, timeLeft, money, esc }) {
  const path = bountyApi(slug);
  const [b, live] = await Promise.all([cachedFetch(path), cachedFetch(`/competitions/${encodeURIComponent(slug)}/live`, { ttl: 20000 }).catch(() => null)]);
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
<div class="cols" style="margin-top:16px"><div class="prose">
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
    const cents = rows.some((r) => !Number.isInteger(+r.amountUsd) || !Number.isInteger(+r.feeShareUsd)), usd = (v) => (v = money(v), cents && !v.includes('.') ? v + '.00' : v);
    patchList(f('rewards'), groups, (r) => r.place, () => Object.assign(document.createElement('tr'), { innerHTML: '<td><span></span> <small></small></td><td class="n"></td><td class="n"></td><td class="n"><b></b></td>' }), (tr, r) => {
      const td = tr.children;
      td[0].firstChild.className = 'rk' + (r.place < 4 ? ' p p' + r.place : '');
      patchText(td[0].firstChild, r.to === r.place ? r.place : `${r.place}–${r.to}`, false);
      patchText(td[0].lastChild, r.to === r.place ? '' : 'each', false);
      patchText(td[1], usd(r.baseUsd));
      patchText(td[2], +r.feeShareUsd ? '+' + usd(r.feeShareUsd) : '—');
      patchText(td[3].firstChild, usd(r.amountUsd));
    });
  };
  paint(b);
  const stop = ended ? () => {} : livePot(slug, async () => paint(await cachedFetch(path, { ttl: 0 })));
  return { el, title: `${b.title} · ${money(b.potUsd || b.rewardAmount)} · make.fun bounties`, cleanup: stop };
}
