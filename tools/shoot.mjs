// Dev tool (not part of app/): opens routes in headless Chrome over CDP, waits for window.__shotReady,
// reports console errors and saves JPEG screenshots.
// usage: node tools/shoot.mjs <baseUrl> <outFile|-> <hash> [width] [height] [scrollY]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [base, out, hash, w = '1280', h = '800', scrollY = '0'] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--hide-scrollbars',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map(), errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m.result ?? m.error), pending.delete(m.id);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
});
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 600 });
await send('Page.navigate', { url: base + hash });
let ready = false;
for (let i = 0; i < 100 && !ready; i++) {
  await sleep(300);
  ready = (await send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true }))?.result?.value;
}
await sleep(1200);
if (+scrollY) await send('Runtime.evaluate', { expression: `scrollTo(0, ${scrollY})` }), await sleep(300);
const info = await send('Runtime.evaluate', { expression: 'JSON.stringify({title: document.title, h1: document.querySelector("h1")?.textContent, text: document.querySelector("main").innerText.slice(0, 400), meter: document.getElementById("meter").textContent, overflow: document.documentElement.scrollWidth > innerWidth})', returnByValue: true });
console.log('ready:', ready, info?.result?.value);
console.log('errors:', errors.length ? errors : 'none');
if (out !== '-') {
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('saved', out);
}
ws.close();
chrome.kill();
process.exit(0);
