// keyed DOM patching, import()ed after first paint: live updates reuse and move nodes and rewrite only text that changed

/** Keyed list update: reuse nodes by key, create new ones, move misplaced ones, drop the gone. */
export function patchList(parent, items, key, make, update) {
  const old = new Map([...parent.children].map((el) => [el.dataset.key, el]));
  let at = parent.firstElementChild;
  for (const item of items) {
    const k = String(key(item));
    let el = old.get(k);
    if (el) old.delete(k);
    else (el = make(item)).dataset.key = k;
    update(el, item);
    if (el === at) at = at.nextElementSibling;
    else parent.insertBefore(el, at);
  }
  old.forEach((el) => el.remove());
}

/** Set text only when it changed, flashing a changed live number. */
export function patchText(el, text, flash = true) {
  if (!el || el.textContent === String(text)) return;
  if (flash && el.textContent) el.classList.remove('flash'), void el.offsetWidth, el.classList.add('flash');
  el.textContent = text;
}
