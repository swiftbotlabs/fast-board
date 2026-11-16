// master-detail, import()ed with the first bounty route: the board list beside the bounty, from the cached board (no request)
const md = { el: null, list: null };

/** On wide screens a bounty (and its leaderboard) sits beside the board list: compact rows (title, pot, fee, time left) drawn with index.html's own row template from the board answer already cached, the open bounty marked aria-current; phones hide the list (CSS). The list element persists, so moving between bounties only re-marks it. */
export async function masterDetail(detail, slug, { cachedFetch, patchList }) {
  if (!md.el) {
    md.el = document.createElement('div');
    md.el.className = 'md';
    md.el.innerHTML = '<nav class="rows" aria-label="Open bounties"></nav><div></div>';
    md.list = md.el.firstChild;
  }
  // ttl Infinity: the copy index.html fetched (or the board view's last refresh) is reused, never re-requested here
  const items = await cachedFetch('/competitions?status=open&activity=times', { ttl: Infinity, shape: (j) => j.items }).catch(() => []);
  const now = Date.now(), open = (c) => Date.parse(c.deadline) > now;
  const sorted = [...items].sort((a, b) => open(b) - open(a) || Date.parse(a.deadline) - Date.parse(b.deadline));
  // keyed by slug and pot, so a row is rebuilt from the template only when its pot changed; the ticker updates its time left
  patchList(md.list, sorted, (c) => c.slug + c.potUsd, (c) => Object.assign(document.createElement('template'), { innerHTML: row(c) }).content.firstChild, (a, c) => {
    if (c.slug === slug) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    a.classList.toggle('closed', !open(c));
  });
  const on = md.list.querySelector('[aria-current]');
  if (on && (on.offsetTop < md.list.scrollTop || on.offsetTop + on.offsetHeight > md.list.scrollTop + md.list.clientHeight)) md.list.scrollTop = on.offsetTop - 40;
  md.el.lastChild.replaceChildren(detail);
  return md.el;
}
