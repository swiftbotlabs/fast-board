// live pot: one EventSource instead of polling, at most one re-read a minute
/** Live pot: one EventSource on /live/stream; a standings (entry or fee) event re-reads the detail just after the minute turns (make.fun's answers and ETags hold for a minute), so at most one request a minute; falls back to 60 s polling. */
export function livePot(slug, refresh) {
  let last = Date.now(), timer = 0, poll = 0;
  const soon = () => {
    if (timer) return;
    const turn = (Math.floor(last / 60000) + 1) * 60000 + 2000;
    timer = setTimeout(() => { timer = 0; last = Date.now(); refresh().catch(() => {}); }, Math.max(1000, turn - Date.now()));
  };
  const stream = 'EventSource' in window ? new EventSource(`https://make.fun/api/competitions/${encodeURIComponent(slug)}/live/stream`) : null;
  stream?.addEventListener('standings', soon);
  stream?.addEventListener('phase', soon);
  stream?.addEventListener('reset', soon);
  if (stream) stream.onerror = () => { if (stream.readyState === 2 && !poll) poll = setInterval(soon, 60000); };
  else poll = setInterval(soon, 60000);
  return () => { stream?.close(); clearTimeout(timer); clearInterval(poll); };
}
