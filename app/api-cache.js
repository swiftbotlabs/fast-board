// API cache for the views, import()ed after first paint: memory + sessionStorage copies, one request per path in flight, stale copies revalidated by ETag
export const stats = { network: 0, revalidated: 0, hits: 0 };
const memory = new Map(), inflight = new Map();

/** GET a make.fun API path: a copy younger than ttl is reused; an older one is revalidated through the HTTP cache (cache: 'no-cache' sends its ETag) and kept, unparsed again, when the ETag still matches; a 5xx is retried once; a failed request falls back to the old copy. Stored by keep(). */
export function cachedFetch(path, { ttl = 30000, shape = (json) => json } = {}) {
  let hit = memory.get(path);
  if (!hit) try { hit = JSON.parse(sessionStorage.getItem('mf:' + path)); } catch {}
  if (hit && Date.now() - hit.at < ttl) return stats.hits++, Promise.resolve(hit.data);
  if (inflight.has(path)) return inflight.get(path);
  const get = () => fetch('https://make.fun/api' + path, { cache: 'no-cache' }).then((res) => (stats.network++, res));
  const request = get()
    .then((res) => res.status >= 500 ? new Promise((ok) => setTimeout(ok, 1500)).then(get) : res)
    .then(async (res) => {
      const etag = res.headers.get('ETag');
      if (res.ok && etag && etag === hit?.etag) stats.revalidated++, hit.at = Date.now();
      else if (res.ok) hit = { etag, at: Date.now(), data: shape(await res.json()) };
      else if (!hit) throw new Error(res.status === 404 ? 'Not found on make.fun' : res.status === 429 ? 'make.fun rate limit reached, try again in a minute' : `make.fun answered ${res.status}`);
      keep(path, hit);
      return hit.data;
    })
    .catch((error) => { if (hit) return hit.data; throw error; })
    .finally(() => inflight.delete(path));
  inflight.set(path, request);
  return request;
}

/** Store a copy in memory and sessionStorage (index.html reads the board's there for an instant repaint); a list's items keep only their short fields (keys past '@' are names, not array indexes). */
export function keep(path, hit) {
  memory.set(path, hit);
  try { sessionStorage.setItem('mf:' + path, JSON.stringify(hit, (k, v) => k > '@' && k !== 'data' && path.startsWith('/competitions?') && (v?.length > 150 || typeof v === 'object') ? undefined : v)); } catch {}
}
