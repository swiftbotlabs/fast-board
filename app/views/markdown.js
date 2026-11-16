// Markdown for descriptions and rules, a static import of the bounty view only: a few dozen lines instead of a library
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
