// windowed rows: only the rows in view (plus a small buffer) are in the DOM, however long the leaderboard
/** Windowed table body: rows of a fixed height inside a scrolling box; on scroll (once a frame) it keeps only the rows in view plus `buffer` above and below, keyed by patchList, with two spacer rows holding the scroll height of the rest (redrawn on resize, row height measured as drawn); onRange(first, last, total) reports what is rendered. set(rows) swaps the list and scrolls back to the top. */
export function windowedRows(scroller, body, { rowHeight, buffer = 8, patchList, key, make, update, onRange }) {
  const spacer = (where) => {
    const t = document.createElement('tbody');
    t.innerHTML = '<tr aria-hidden="true"><td colspan="9" style="padding:0;border:0;height:0"></td></tr>';
    body[where](t);
    return t.firstChild.firstChild;
  };
  const above = spacer('before'), below = spacer('after');
  let rows = [], shown = '', frame = 0;
  const draw = () => {
    const top = Math.max(0, scroller.scrollTop - body.offsetTop + above.offsetHeight);
    const first = Math.max(0, Math.floor(top / rowHeight) - buffer);
    const last = Math.min(rows.length, Math.ceil((top + scroller.clientHeight) / rowHeight) + buffer);
    if (shown === `${first}:${last}`) return;
    shown = `${first}:${last}`;
    above.style.height = first * rowHeight + 'px';
    below.style.height = (rows.length - last) * rowHeight + 'px';
    patchList(body, rows.slice(first, last), key, make, update);
    onRange(first, last, rows.length);
    // the spacers use the row height as drawn, so 5,000 rows never drift
    const drawn = body.firstElementChild?.getBoundingClientRect().height;
    if (drawn && Math.abs(drawn - rowHeight) > 0.01) rowHeight = drawn, shown = '', draw();
  };
  // redrawn when the box is first laid out or resized
  new ResizeObserver(() => { shown = ''; draw(); }).observe(scroller);
  scroller.addEventListener('scroll', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }, { passive: true });
  return { set(next) { rows = next; shown = ''; scroller.scrollTop = 0; draw(); }, draw };
}
