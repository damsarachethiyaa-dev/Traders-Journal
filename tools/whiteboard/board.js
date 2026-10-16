/* Traders Journal whiteboard film.
   Everything is real DOM / SVG: text, stickies, screens, strokes and cursors can be edited here.
   seek(t) is deterministic, so any frame can be rendered exactly (render.cjs) or scrubbed live (index.html). */
(() => {
const DUR = 30;
const NS = 'http://www.w3.org/2000/svg';
const $ = (s) => document.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const backOut = (x) => { x = clamp(x); const c = 2.70158; return 1 + c * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const el = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };

/* ---------- Palette (each collaborator draws in their own colour) ---------- */
const INK = '#1f2933', GREEN = '#16a34a', BLUE = '#2f6fed', PINK = '#db2777', AMBER = '#ffd43b';

/* ---------- Layout ---------- */
const ROW1 = 195, ROW2 = 645;
const FRAMES = {
  dash: { img: 'dashboard',   x: 70,   y: 200,  w: 720, rot: -0.5, label: 'Dashboard',     n: 1, t: 2.4 },
  log:  { img: 'logging',     x: 880,  y: ROW1, w: 420, rot: 0.5,  label: 'Trade logging', n: 2, t: 6.3 },
  jour: { img: 'journal',     x: 1400, y: ROW1, w: 420, rot: -0.4, label: 'Daily journal', n: 3, t: 10.0 },
  perf: { img: 'performance', x: 1400, y: ROW2, w: 420, rot: 0.4,  label: 'Analytics',     n: 4, t: 13.3 },
  conn: { img: 'connect',     x: 880,  y: ROW2, w: 420, rot: -0.5, label: 'Connect MT5',   n: 5, t: 17.0 },
};
for (const f of Object.values(FRAMES)) { f.s = (f.w - 14) / 1600; f.h = (f.w - 14) * 0.625 + 14; }
/* image pixel (1600x1000 screenshot) -> board coordinate */
const P = (f, ix, iy) => [FRAMES[f].x + 7 + ix * FRAMES[f].s, FRAMES[f].y + 7 + iy * FRAMES[f].s];

const STICKIES = [
  { c: 'y', x: 70,   y: 672,  w: 340, rot: -2,   t: 4.4,  h: 'Live dashboard',  d: 'P&amp;L, win rate, equity curve' },
  { c: 'p', x: 880,  y: 476,  w: 420, rot: 1.5,  t: 8.3,  h: 'Log every trade', d: 'calendar + full trade table' },
  { c: 'b', x: 1400, y: 476,  w: 420, rot: -1.2, t: 11.2, h: 'Daily journal',   d: 'notes, mood, mistakes, tags' },
  { c: 'g', x: 1400, y: 925,  w: 420, rot: 1.2,  t: 15.0, h: 'Analytics',       d: 'edge, behaviour, progress' },
  { c: 'o', x: 880,  y: 925,  w: 420, rot: -1.4, t: 18.4, h: 'Connect MT5',     d: '1-click auto-connect, read-only' },
  { c: 'y', x: 430,  y: 672,  w: 360, rot: 1.8,  t: 23.6, h: '100% local',      d: 'no cloud · no account needed' },
];

const items = [];            // timed reveals: {t0, t1, apply(p)}
const add = (t0, t1, apply) => { items.push({ t0, t1, apply }); apply(0); };
const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));

/* ---------- Screens ---------- */
const frameLayer = $('#layer-frames');
for (const f of Object.values(FRAMES)) {
  const box = el('div', 'frame', null, frameLayer);
  Object.assign(box.style, { left: f.x + 'px', top: f.y + 'px', width: f.w + 'px', height: f.h + 'px' });
  const img = el('img', null, null, box); img.src = `../../media/promo-assets/${f.img}.png`; img.alt = f.label;
  el('div', 'tape', null, box);
  const lab = el('div', 'label', f.label, frameLayer); Object.assign(lab.style, { left: (f.x + 58) + 'px', top: (f.y - 44) + 'px' });
  const bad = el('div', 'badge', String(f.n), frameLayer); Object.assign(bad.style, { left: (f.x + 2) + 'px', top: (f.y - 52) + 'px' });
  f.imgEl = img;
  add(f.t, f.t + 0.7, (p) => {
    const e = easeOut(p);
    box.style.opacity = clamp(p * 3);
    box.style.transform = `translateY(${(1 - e) * -70}px) scale(${1 + (1 - e) * 0.12}) rotate(${f.rot + (1 - e) * 3}deg)`;
  });
  add(f.t + 0.35, f.t + 0.8, (p) => { lab.style.opacity = p; bad.style.opacity = p; bad.style.transform = `scale(${backOut(p)})`; });
}

/* ---------- Sticky notes ---------- */
const noteLayer = $('#layer-notes');
for (const s of STICKIES) {
  const n = el('div', 'sticky ' + s.c, `<b>${s.h}</b><span>${s.d}</span>`, noteLayer);
  Object.assign(n.style, { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px' });
  add(s.t, s.t + 0.5, (p) => {
    n.style.opacity = clamp(p * 4);
    n.style.transform = `scale(${0.35 + 0.65 * backOut(p)}) rotate(${s.rot + (1 - p) * -10}deg)`;
  });
}

/* ---------- Handwritten text ---------- */
const write = (cls, html, style, t0, t1) => {
  const e = el('div', 'write ' + cls, html, noteLayer); Object.assign(e.style, style);
  add(t0, t1, (p) => { e.style.clipPath = `inset(-12% ${(1 - p) * 100}% -12% -3%)`; e.style.opacity = p > 0 ? 1 : 0; });
  return e;
};
write('title', 'Traders Journal', { left: '70px', top: '2px' }, 0.3, 1.9);
write('sub', 'A private desktop trading journal with MT5 sync', { left: '74px', top: '110px' }, 2.0, 2.9);
write('credit', 'Created by Chethiya Rathnasekara', { right: '70px', top: '34px' }, 25.3, 26.6);
write('sub', 'how your trades arrive', { left: '70px', top: '800px' }, 20.0, 20.7);

/* ---------- Hand-drawn strokes ---------- */
const ink = $('#ink');
const f1 = (n) => n.toFixed(1);
function catmull(pts) {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}
const poly = (pts) => 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L');
function ellipsePath(cx, cy, rx, ry, seed) {
  const r = rng(seed), n = 30, a0 = -2.2 + r() * 0.6, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + t * Math.PI * 2 * 1.1, k = 1 + (r() - 0.5) * 0.07 + t * 0.07;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return catmull(pts);
}
function wavy(x1, y1, x2, y2, seed, amp = 2.2) {
  const r = rng(seed), len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(3, Math.round(len / 38)), nx = -(y2 - y1) / len, ny = (x2 - x1) / len, pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, j = (r() - 0.5) * 2 * amp; pts.push([x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j]); }
  return catmull(pts);
}
function arrowPaths(a, b, bow, seed) {
  const r = rng(seed), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, pts = [];
  const n = Math.max(6, Math.round(len / 26));
  for (let i = 0; i <= n; i++) {
    const t = i / n, off = Math.sin(Math.PI * t) * bow + (r() - 0.5) * 2.4 * (i > 0 && i < n);
    pts.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
  }
  const tip = pts[n], prev = pts[n - 1], ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]), hl = 24;
  const h1 = [tip[0] - Math.cos(ang - 0.5) * hl, tip[1] - Math.sin(ang - 0.5) * hl], h2 = [tip[0] - Math.cos(ang + 0.5) * hl, tip[1] - Math.sin(ang + 0.5) * hl];
  return { shaft: catmull(pts), head: poly([h1, tip, h2]) };
}
function roughRect(x, y, w, h, seed) {
  const r = rng(seed), j = () => (r() - 0.5) * 5;
  return poly([[x - 6 + j(), y + 3 + j()], [x + w + 5 + j(), y - 3 + j()], [x + w + 3 + j(), y + h + 4 + j()], [x - 4 + j(), y + h - 2 + j()], [x - 1 + j(), y - 9 + j()]]);
}
const starPath = (cx, cy, r, seed) => { const g = rng(seed), pts = []; for (const k of [0, 2, 4, 1, 3, 0]) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5, q = r * (1 + (g() - 0.5) * 0.12); pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return poly(pts); };
const checkPath = (x, y, s) => catmull([[x - s * 0.5, y], [x - s * 0.15, y + s * 0.42], [x + s * 0.6, y - s * 0.5]]);

/* A stroke that draws itself between t0 and t1 and returns a handle the cursors can trace. */
function stroke(d, color, w, t0, t1, opts = {}) {
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d); path.setAttribute('pathLength', '1');
  Object.assign(path.style, { stroke: color, strokeWidth: w, strokeDasharray: '1 1' });
  if (opts.highlight) { path.style.mixBlendMode = 'multiply'; path.style.strokeLinecap = 'butt'; }
  ink.appendChild(path);
  const len = path.getTotalLength();
  const h = { path, len, t0, t1, at: (p) => { const q = path.getPointAtLength(len * clamp(p)); return [q.x, q.y]; } };
  add(t0, t1, (p) => { path.style.strokeDashoffset = 1 - smooth(p * 1.0); path.style.opacity = p > 0 ? (opts.opacity ?? 1) : 0; });
  return h;
}
const ellipseOn = (f, x1, y1, x2, y2, padX, padY, color, t0, t1, seed) => {
  const a = P(f, x1, y1), b = P(f, x2, y2);
  return stroke(ellipsePath((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (b[0] - a[0]) / 2 + padX, (b[1] - a[1]) / 2 + padY, seed), color, 5, t0, t1);
};

/* ---------- Collaboration cursors ---------- */
const cursorLayer = $('#layer-cursors');
const cursors = [];
function makeCursor(name, color, start) {
  const root = el('div', 'cursor', null, cursorLayer);
  root.innerHTML = `<svg width="34" height="40" viewBox="0 0 34 40"><path d="M3 3 L3 31 L10.5 24 L16 36.5 L21.5 34 L16 21.5 L26.5 21 Z" fill="${color}" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/></svg><div class="tag" style="background:${color}">${name}</div><div class="ring" style="border-color:${color}"></div>`;
  const c = { root, ring: root.querySelector('.ring'), start, segs: [], clicks: [], seed: cursors.length * 1.7 };
  cursors.push(c);
  c.move = (t0, t1, to) => { c.segs.push({ k: 'move', t0, t1, to }); return c; };
  c.trace = (h, t0 = h.t0, t1 = h.t1) => { c.segs.push({ k: 'trace', t0, t1, h }); return c; };
  c.goTrace = (h, tMove) => { c.move(tMove, h.t0 - 0.05, h.at(0)); return c.trace(h); };   // glide to the stroke's start, then draw it
  c.click = (t) => { c.clicks.push(t); return c; };
  return c;
}
function cursorPos(c, t) {
  let cur = c.start;
  for (const s of c.segs) {
    if (t < s.t0) break;
    if (s.k === 'move') {
      if (t < s.t1) {
        const p = smooth((t - s.t0) / (s.t1 - s.t0)), dx = s.to[0] - cur[0], dy = s.to[1] - cur[1], d = Math.hypot(dx, dy) || 1, arc = Math.sin(Math.PI * p) * d * 0.1;
        return [cur[0] + dx * p - dy / d * arc, cur[1] + dy * p + dx / d * arc];
      }
      cur = s.to;
    } else {
      if (t < s.t1) return s.h.at(smooth((t - s.t0) / (s.t1 - s.t0)));
      cur = s.h.at(1);
    }
  }
  return cur;
}

/* ---------- Choreography ---------- */
const C1 = makeCursor('Trader', GREEN, [2000, 160]);
const C2 = makeCursor('Mentor', BLUE, [-80, 620]);
const C3 = makeCursor('Analyst', PINK, [2000, 1120]);

// Opening: underline the title
const uTitle = stroke(wavy(76, 112, 700, 112, 11), GREEN, 7, 1.5, 2.2);
C1.move(0.2, 1.4, [76, 112]).trace(uTitle);

// 1 Dashboard
const net = ellipseOn('dash', 274, 597, 512, 700, 16, 14, GREEN, 3.4, 4.1, 3);
C1.goTrace(net, 2.6);
const star = stroke(starPath(762, 372, 20, 5), GREEN, 5, 4.7, 5.3);
C1.goTrace(star, 4.2);
const A1 = arrowPaths([798, 322], [874, 332], -26, 21);
const a1s = stroke(A1.shaft, GREEN, 6, 5.9, 6.4), a1h = stroke(A1.head, GREEN, 6, 6.4, 6.55);
C1.goTrace(a1s, 5.5).trace(a1h);

// 2 Trade logging
const green16 = ellipseOn('log', 1100, 404, 1294, 490, 18, 12, BLUE, 7.5, 8.1, 7);
const reds = ellipseOn('log', 497, 312, 892, 398, 20, 12, BLUE, 8.6, 9.2, 8);
C2.goTrace(green16, 6.0).goTrace(reds, 8.2);
const A2 = arrowPaths([1306, 330], [1396, 330], 28, 22);
const a2s = stroke(A2.shaft, BLUE, 6, 9.5, 10.0), a2h = stroke(A2.head, BLUE, 6, 10.0, 10.15);
C2.goTrace(a2s, 9.3).trace(a2h);

// 3 Daily journal
const chip = ellipseOn('jour', 1130, 481, 1192, 507, 14, 10, BLUE, 10.9, 11.4, 9);
const headline = stroke(wavy(...P('jour', 275, 118), ...P('jour', 628, 118), 12, 1.4), BLUE, 5, 11.8, 12.3);
C2.goTrace(chip, 10.2).goTrace(headline, 11.5);

// 4 Analytics
const A3 = arrowPaths([1826, 330], [1826, 760], -78, 23);
const a3s = stroke(A3.shaft, PINK, 6, 12.7, 13.3), a3h = stroke(A3.head, PINK, 6, 13.3, 13.45);
C3.move(11.8, 12.6, [1826, 330]).trace(a3s).trace(a3h);
const winr = ellipseOn('perf', 218, 122, 585, 232, 18, 12, PINK, 14.2, 14.8, 14);
const riseA = arrowPaths(P('perf', 290, 560), P('perf', 705, 410), 14, 24);
const rise = stroke(riseA.shaft, PINK, 5, 15.3, 15.9), riseH = stroke(riseA.head, PINK, 5, 15.9, 16.05);
C3.goTrace(winr, 13.5).goTrace(rise, 14.9).trace(riseH);

// 5 Connect MT5
const A4 = arrowPaths([1394, 772], [1306, 772], 26, 25);
const a4s = stroke(A4.shaft, PINK, 6, 16.5, 17.0), a4h = stroke(A4.head, PINK, 6, 17.0, 17.15);
C3.goTrace(a4s, 16.1).trace(a4h);
const live = ellipseOn('conn', 531, 193, 648, 213, 14, 9, GREEN, 17.8, 18.3, 16);
const btn = ellipseOn('conn', 263, 679, 494, 711, 16, 11, GREEN, 18.8, 19.3, 17);
C1.goTrace(live, 15.5).goTrace(btn, 18.4).click(19.4);

// How trades arrive: MetaTrader 5 -> local sync -> journal
const FLOW = [
  { x: 70, t: 20.3, text: 'MetaTrader 5', cap: 'your broker terminal' },
  { x: 330, t: 21.5, text: 'Local sync<br>127.0.0.1', cap: 'stays on your PC' },
  { x: 590, t: 22.7, text: 'Traders<br>Journal', cap: 'your dashboard' },
];
const FY = 855, FW = 190, FH = 92;
let prev = null;
FLOW.forEach((b, i) => {
  const box = stroke(roughRect(b.x, FY, FW, FH, 30 + i), GREEN, 5, b.t, b.t + 0.6);
  const txt = el('div', 'flowbox', b.text, noteLayer); Object.assign(txt.style, { left: b.x + 'px', top: FY + 'px', width: FW + 'px', height: FH + 'px' });
  add(b.t + 0.5, b.t + 0.9, (p) => { txt.style.opacity = p; });
  const cap = el('div', 'cap', b.cap, noteLayer); Object.assign(cap.style, { left: b.x + 'px', top: (FY + FH + 14) + 'px', width: FW + 'px' });
  add(23.3, 23.8, (p) => { cap.style.opacity = p; });
  C1.goTrace(box, i === 0 ? 19.6 : b.t - 0.15);
  if (i < FLOW.length - 1) {
    const ar = arrowPaths([b.x + FW + 6, FY + FH / 2], [FLOW[i + 1].x - 6, FY + FH / 2], 0, 40 + i);
    const s = stroke(ar.shaft, GREEN, 6, b.t + 0.65, b.t + 0.9), h = stroke(ar.head, GREEN, 6, b.t + 0.9, b.t + 1.0);
    C1.goTrace(s, b.t + 0.6).trace(h);
  }
});
const tick = stroke(checkPath(836, 730, 44), GREEN, 8, 24.2, 24.6);
C1.goTrace(tick, 23.5);

// Finale: highlight the credit, everyone pings the board
const hl = stroke(poly([[1130, 72], [1856, 70]]), AMBER, 40, 25.0, 25.9, { highlight: true, opacity: 0.85 });
C2.goTrace(hl, 24.4);
C1.move(24.9, 26.4, [430, 520]).click(26.7);
C3.move(24.4, 26.2, [1700, 770]).click(26.9);
C2.move(26.1, 27.4, [1000, 540]).click(27.1);

/* ---------- Camera: guides attention, layout never changes ---------- */
const CAM = [
  [0, 960, 540, 1], [2.5, 960, 540, 1], [3.3, 430, 400, 1.5], [5.2, 430, 400, 1.5],
  [6.1, 1000, 330, 1.5], [8.9, 1000, 330, 1.5], [9.7, 1280, 330, 1.5], [12.2, 1280, 330, 1.5],
  [13.0, 1280, 720, 1.5], [15.9, 1280, 720, 1.5], [16.7, 1090, 720, 1.5], [19.5, 1090, 720, 1.5],
  [20.3, 640, 720, 1.5], [24.2, 640, 720, 1.5], [25.3, 960, 540, 1], [DUR, 960, 540, 1],
];
function camAt(t) {
  let i = 0; while (i < CAM.length - 2 && t >= CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1], p = smooth((t - a[0]) / (b[0] - a[0]));
  let s = a[3] + (b[3] - a[3]) * p, cx = a[1] + (b[1] - a[1]) * p, cy = a[2] + (b[2] - a[2]) * p;
  cx = clamp(cx, 960 / s, 1920 - 960 / s); cy = clamp(cy, 540 / s, 1080 - 540 / s);
  return { s, cx, cy };
}

/* ---------- Frame renderer ---------- */
const board = $('#board'), fade = $('#fade');
function seek(t) {
  t = clamp(t, 0, DUR);
  for (const it of items) it.apply(prog(t, it.t0, it.t1));
  const cam = camAt(t);
  board.style.transform = `translate(${960 - cam.cx * cam.s}px,${540 - cam.cy * cam.s}px) scale(${cam.s})`;
  for (const c of cursors) {
    const [x, y] = cursorPos(c, t), j = Math.sin(t * 7 + c.seed) * 1.1;
    c.root.style.transform = `translate(${x + j}px,${y + j * 0.6}px) scale(${1 / cam.s})`;
    let ring = 0; for (const tc of c.clicks) { const p = (t - tc) / 0.7; if (p >= 0 && p <= 1) ring = p; }
    c.ring.style.opacity = ring ? (1 - ring) * 0.9 : 0;
    c.ring.style.transform = `scale(${0.3 + ring * 1.4})`;
  }
  fade.style.opacity = clamp((t - 29.3) / 0.7);
  return t;
}
window.seek = seek;
window.DURATION = DUR;
window.boardReady = (async () => {
  try { await document.fonts.load('40px "Ink Free"'); await document.fonts.ready; } catch (e) { /* fall back to cursive */ }
  await Promise.all(Object.values(FRAMES).map((f) => f.imgEl.decode().catch(() => {})));
  seek(0);
  return true;
})();

/* ---------- Live preview ---------- */
const params = new URLSearchParams(location.search);
if (params.get('render')) document.body.classList.add('render');
else {
  const vp = $('#viewport'), fit = () => { vp.style.zoom = Math.min(innerWidth / 1920, (innerHeight - 52) / 1080); };
  fit(); addEventListener('resize', fit);
  const play = $('#play'), seekBar = $('#seek'), time = $('#time');
  let playing = false, t0 = 0, base = 0;
  const show = (t) => { seek(t); seekBar.value = t; time.textContent = t.toFixed(1) + ' / ' + DUR.toFixed(1); };
  const loop = (now) => { if (!playing) return; const t = base + (now - t0) / 1000; if (t >= DUR) { playing = false; play.textContent = 'Play'; show(DUR); return; } show(t); requestAnimationFrame(loop); };
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; if (playing) { base = +seekBar.value >= DUR ? 0 : +seekBar.value; t0 = performance.now(); requestAnimationFrame(loop); } };
  seekBar.oninput = () => { playing = false; play.textContent = 'Play'; show(+seekBar.value); };
  window.boardReady.then(() => show(+(params.get('t') || 0)));
}
})();
