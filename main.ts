// Hands in fast-board, a make.fun bounty frontend made of plain static files in app/ (index.html with inline CSS,
// app.js for the board and router, and bounty.js, leaderboard.js and profile.js loaded by import() when opened), all
// reading make.fun's public API. Node 22, standard library only.
//
// It checks the entry before packing it: app/index.html must exist, and screenshots/ must hold 1 to 3 .jpg or .png
// files of at most 256 KiB each (the first by name is the cover). Then it copies app/ and screenshots/ to /output,
// writes /output/dossier.json with buildDossier from the vendored make.fun library (left unchanged, since the scorer
// rebuilds the dossier with its own copy and compares them byte for byte), and prints one summary line.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const maxShotBytes = 262144;

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// Refuse an entry the scorer would refuse, with a message that says what to fix, before anything is written.
const index = join(here, 'app', 'index.html');
if (!existsSync(index) || !statSync(index).isFile()) fail(`missing ${index}: the frontend starts at app/index.html`);
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) fail(`missing ${shotsDir}: add 1 to 3 .jpg or .png screenshots of the app on live data`);
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.') && /\.(jpe?g|png)$/i.test(name)).sort();
if (shots.length < 1 || shots.length > 3) fail(`screenshots/ holds ${shots.length} .jpg/.png files; it needs 1 to 3`);
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > maxShotBytes) fail(`screenshots/${name} is ${size} bytes; the limit is ${maxShotBytes} (256 KiB)`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 3 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 16 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossier = buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: maxShotBytes }, app_max_files: 993, app_max_bytes: 16777216 });
writeFileSync(join(out, 'dossier.json'), dossier);

const appFiles = (readdirSync(join(out, 'app'), { recursive: true, withFileTypes: true }) as { isFile(): boolean }[]).filter((e) => e.isFile()).length;
console.log(`main.ts: copied ${appFiles} app files and ${shots.length} screenshots to ${out}; dossier.json is ${dossier.byteLength} bytes`);
