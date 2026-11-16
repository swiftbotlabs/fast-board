// speed footer: first-load gzip size, paint time and a live request counter, measured live (Performance API)
import { stats } from './api-cache.js';

const footer = document.body.appendChild(Object.assign(document.createElement('footer'), { id: 'meter', ariaLive: 'off' }));
const at = { view: 0, frame: 0, load: null };

/** The first load as this browser fetched it: the page plus the same-origin files it fetched before first paint, each re-read from the HTTP cache and gzipped here (CompressionStream), with the requests made before first paint and the paint mark's time. */
const measureFirstLoad = async (paint) => {
  const before = performance.getEntriesByType('resource').filter((r) => r.startTime < paint);
  const files = [location.href.split('#')[0], ...before.map((r) => r.name).filter((n) => n.startsWith(location.origin) && !n.includes('/api/'))];
  const gzip = async (url) => (await new Response((await fetch(url, { cache: 'force-cache' })).body.pipeThrough(new CompressionStream('gzip'))).arrayBuffer()).byteLength;
  return { bytes: (await Promise.all(files.map(gzip))).reduce((a, b) => a + b, 0), files: files.length, requests: before.length + 1, paint };
};

/** Footer line: first load, then this view's render time and the visit's API requests and cache savings; called after each route and when new requests finish. */
export async function meter(viewMs = at.view) {
  at.view = viewMs;
  // measured once first paint is marked (by index.html, or by the shell's first view on a deep link)
  const paint = performance.getEntriesByName('paint')[0]?.startTime;
  if (paint == null) return;
  const load = await (at.load ||= measureFirstLoad(paint).catch(() => null));
  if (!load) return;
  const api = performance.getEntriesByType('resource').filter((r) => r.name.startsWith('https://make.fun/api/')).length;
  footer.innerHTML = `<strong>First load ${(load.bytes / 1024).toFixed(2)} KB gzip</strong> (${load.files} file${load.files > 1 ? 's' : ''}, ${load.requests} requests) · <strong>painted in ${Math.round(load.paint)} ms</strong>` +
    ` · this view in ${Math.round(at.view)} ms · <strong class="live">${api} API request${api === 1 ? '' : 's'}</strong> (live count) · ${stats.revalidated} unchanged by ETag, ${stats.hits} from cache`;
}

new PerformanceObserver(() => { cancelAnimationFrame(at.frame); at.frame = requestAnimationFrame(() => meter()); }).observe({ type: 'resource' });
