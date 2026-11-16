// rest of the stylesheet, import()ed after first paint and adopted as one constructable sheet
const sheet = new CSSStyleSheet();
sheet.replaceSync(`
:root{--bg:light-dark(#f7f4ee,#0e1014);--card:light-dark(#fff,#181b21);--line:light-dark(#e7e1d6,#2b3039);--fg:light-dark(#17140f,#eceef2);--mute:light-dark(#666057,#a0a6b1);--pot:light-dark(#0a7a42,#3fdc85);--warn:light-dark(#9a5800,#f2b34c);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-variant-numeric:tabular-nums;color:var(--fg)}
body{margin:0 16px}
.grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));padding:0}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px}
.card h3{margin:0;font-size:.98rem;line-height:1.3;height:2.6em;overflow:hidden}
.top{font-size:.8rem;color:var(--mute)}
.pot{font-size:2.7rem;font-weight:800;line-height:1.05}
.card dl{border-top:1px solid var(--line);padding-top:8px}
dd{margin:0;font-weight:700}
.md{display:grid;grid-template-columns:290px minmax(0,1fr);gap:20px;align-items:start}
@media (min-width:1001px){.md .cols{grid-template-columns:minmax(0,1fr) 330px}.md .cols:not(.one) .win .t{display:none}}
.md>.rows{display:flex;flex-direction:column;gap:6px;position:sticky;top:8px;max-height:calc(100vh - 60px);overflow:auto;padding:2px;scrollbar-width:thin}
.rows>a{background:var(--card);border:1px solid var(--line);font-size:.86rem;line-height:1.3}
.rows>a b{font-size:1.25rem;line-height:1.1;text-align:right;color:var(--pot)}
.rows>a span{text-align:right;color:var(--mute)}
.rows>a[aria-current]{outline:2px solid var(--pot);background:color-mix(in srgb,var(--pot) 10%,var(--card))}
.rows>a.closed{opacity:.55}
a{text-decoration:underline;text-decoration-color:color-mix(in srgb,currentColor 40%,transparent);text-underline-offset:2px}
header>a,.rows>a,.card h3 a:not(:hover){text-decoration:none}
b{color:inherit}header b,.pot{color:var(--pot)}
:focus-visible{outline:2px solid var(--pot);outline-offset:2px;border-radius:6px}
main{padding-bottom:24px}
*{box-sizing:border-box}
header{display:flex;align-items:center;gap:8px;padding-block:12px;min-height:56px;flex-wrap:wrap;font-weight:400;font-size:inherit}header>a{font-weight:800;font-size:1.05rem}
nav{display:contents}
nav span{display:flex;gap:4px;flex-wrap:wrap}
#q{width:150px;cursor:text}
#order,nav:empty+#theme{margin-left:auto}
#theme::before{content:"";display:block;width:14px;height:14px;margin:2px -2px;border:2px solid;border-radius:50%;box-shadow:inset 5px 0 currentColor}
#cats button{border-radius:99px}
#cats small{color:inherit;opacity:.6}
button,select,input{font:inherit;font-size:.87rem;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:7px;padding:4px 10px;cursor:pointer}
button[aria-pressed=true]{background:var(--fg);border-color:var(--fg);color:var(--bg)}
button:disabled{opacity:.4;cursor:default}
h1{font-size:1.5rem;line-height:1.25;margin:.2em 0}
h2{font-size:1.05rem;margin:1.2em 0 .5em}
.mute,small{color:var(--mute)}
.lede{font-size:1.1rem;font-weight:600;margin:0 0 14px}
.lede b,.lede a{color:var(--fg)}
.lede .pot{font-size:3rem;margin-right:4px}
.grid{list-style:none;margin:0}
.box{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.card.closed{opacity:.6}
.card.closed .pot{color:var(--mute)}
.urgent{box-shadow:inset 0 3px var(--warn)}
.urgent [data-ends]{color:var(--warn)}
.card h3{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.pill{border-radius:99px;padding:1px 8px;font-weight:700;font-size:.74rem;background:color-mix(in srgb,currentColor 13%,transparent);white-space:nowrap}
.open{color:var(--pot)}.soon{color:var(--warn)}.shut{color:var(--mute)}
.pot{letter-spacing:-.02em}
.pot small{font-size:.78rem;font-weight:600;letter-spacing:0;margin-left:6px;display:inline-block;white-space:nowrap}
.facts,.card dl{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.35fr) minmax(0,.9fr);gap:8px;margin:0}
.facts div,.card dl div{min-width:0}
dt,th{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--mute);font-weight:600}
dd{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.big dd{font-size:1.6rem}
.live::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--pot);margin-right:5px;vertical-align:middle;animation:pulse 1.6s infinite}
@keyframes pulse{50%{opacity:.25}}
.flash{animation:flash 1.2s}
@keyframes flash{from{background:color-mix(in srgb,var(--pot) 35%,transparent)}}
.cols{display:grid;gap:20px;grid-template-columns:minmax(0,1fr) 380px;align-items:start}
.cols.one{grid-template-columns:minmax(0,1fr)}.one>.side{display:none}
.side{display:flex;flex-direction:column;gap:12px;position:sticky;top:8px}
.side .t{display:none}
.box h2{margin:0 0 6px}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
.n{text-align:right}
.rk{display:inline-block;min-width:1.9em;padding:0 6px;border-radius:99px;text-align:center;font-weight:800}
.p{background:color-mix(in srgb,var(--pot) 16%,transparent);color:var(--pot)}
.p1{background:var(--pot);color:var(--card)}
.prose{max-width:75ch;overflow-wrap:anywhere}
.prose pre{overflow:auto;background:var(--card);padding:10px;border-radius:8px;font-size:.9em}
details{margin:12px 0}
summary{cursor:pointer;font-weight:700}
.win{max-height:min(66vh,620px);overflow:auto;border:1px solid var(--line);border-radius:10px;background:var(--card);overscroll-behavior:contain}
.win thead th{position:sticky;top:0;background:var(--card);z-index:1}
.win tr{height:37px}.win tr[aria-hidden]{height:auto}.win td{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;padding-block:0;vertical-align:middle}
.bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}
#meter{position:sticky;bottom:0;padding:7px 0;font-size:.8rem;color:var(--mute);background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(6px);border-top:1px solid var(--line)}
#meter strong{color:var(--fg)}
.avatar{width:72px;height:72px;border-radius:50%;background:var(--line)}
.side .avatar{width:56px;height:56px}
@media (max-width:1000px){.md{display:block}@media (min-width:1001px){.md .cols{grid-template-columns:minmax(0,1fr) 330px}.md .cols:not(.one) .win .t{display:none}}
.md>.rows{display:none}}
@media (max-width:820px){header>a{font-size:.94rem;flex:1 0 100%}nav:empty+#theme{position:absolute;right:16px;top:8px}#q{flex:1;width:auto;min-width:0}.lede .pot{font-size:2.2rem}.card h3{height:auto;min-height:0}.cols{grid-template-columns:1fr}.side{position:static}.pot{font-size:2.2rem}td.t,th.t{display:none}#cats{order:3;flex:1 0 100%;flex-wrap:nowrap;overflow-x:auto;white-space:nowrap}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
