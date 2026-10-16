/* Analytics — Performance · Edge Analysis · Behavior · Progress.
   Everything is computed on this PC from trades (live + MetaTrader) and Daily Journal reviews. */
(function () {
  'use strict';
  const root = document.getElementById('page-analytics');
  if (!root) return;
  const $a = (s, r) => (r || root).querySelector(s);
  const $$a = (s, r) => Array.from((r || root).querySelectorAll(s));
  const TABS = [['performance', 'Performance', 'bars'], ['edge', 'Edge Analysis', 'target'], ['behavior', 'Behavior', 'brain'], ['progress', 'Progress', 'activity']];
  const RANGES = [['7', '7D'], ['30', '30D'], ['60', '60D'], ['90', '90D'], ['365', '1Y'], ['all', 'ALL']];
  const INTRO = {
    performance: ['Growth curves', 'Visualizes the trajectory of your capital over the selected timeframe.'],
    edge: ['Strategy Edge', 'Evaluating the raw profitability and consistency of your active setups.'],
    behavior: ['Psychology Overview', 'High-level summary of your psychological performance.'],
    progress: ['Trade Quality Ratio', 'Monthly breakdown of poor, okay, and great trade setups.']
  };
  Object.assign(P, {
    brain: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
    dl: '<path d="M12 17V3M6 11l6 6 6-6M19 21H5"/>', swap: '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
    panelr: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>', alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>', clk: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7l10-5Z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>', bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'
  });
  const AN = Object.assign({ tab: 'performance', range: '30', from: '', to: '', side: 'all', outcome: 'all', symbol: '', account: 'all', panel: true }, (S.analytics && typeof S.analytics === 'object') ? S.analytics : {});
  let sig = '', dismissed = false, lastTab = '';
  const persist = () => { S.analytics = { tab: AN.tab, range: AN.range, from: AN.from, to: AN.to, side: AN.side, outcome: AN.outcome, symbol: AN.symbol, account: AN.account, panel: AN.panel }; save(); };

  /* ---------- helpers ---------- */
  const reviews = () => (S.reviews && typeof S.reviews === 'object') ? S.reviews : {};
  const R = t => reviews()[t.id] || {};
  const sod = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fin = v => typeof v === 'number' && isFinite(v);
  const kfmt = a => a >= 1000 ? (a / 1000).toFixed(a >= 10000 ? 1 : 2).replace(/\.?0+$/, '') + 'k' : String(Math.round(a * 10) / 10);
  const fm = (v, sign) => (v < 0 ? '-' : sign && v > 0 ? '+' : '') + cur() + kfmt(Math.abs(v));
  const fx = (v, sign) => (v < 0 ? '-' : sign && v > 0 ? '+' : '') + cur() + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pc = v => (fin(v) ? Math.round(v) : 0) + '%';
  const cls = v => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');
  const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const assetClass = s => /^(XAU|XAG|XPT|XPD|WTI|BRENT|USOIL|UKOIL)/i.test(s) ? 'Commodity' : /^(BTC|ETH|LTC|XRP|SOL|DOGE|BNB|ADA)/i.test(s) ? 'Crypto' : /^(US30|US100|US500|NAS100|SPX|GER|DAX|UK100|JP225|NDX|DJ30)/i.test(s) ? 'Index' : /^[A-Z]{6}$/i.test(s) ? 'Forex' : 'Stock';
  const MOODS = ['Fearful', 'Worried', 'Neutral', 'Confident', 'Euphoric'], MOOD_COL = ['#f87171', '#fb923c', '#94a3b8', '#34d399', '#a78bfa'];

  function baseTrades() {
    let t = sourceTrades().filter(x => !x.open);
    if (typeof djOverlay === 'function') t = t.map(djOverlay);
    return t;
  }
  function rangeBounds() {
    const today = sod(new Date());
    if (AN.range === 'custom') return { from: AN.from ? sod(AN.from) : null, to: AN.to ? addDays(sod(AN.to), 1) : addDays(today, 1) };
    if (AN.range === 'all') return { from: null, to: addDays(today, 1) };
    return { from: addDays(today, -(+AN.range - 1)), to: addDays(today, 1) };
  }
  function accounts() { return Array.from(new Set(baseTrades().map(t => t.account).filter(Boolean))).sort(); }
  function filtered() {
    const { from, to } = rangeBounds(), sym = AN.symbol.trim().toUpperCase();
    return baseTrades().filter(t => {
      const d = tdate(t); if (isNaN(d)) return false;
      if (from && d < from) return false; if (d >= to) return false;
      if (AN.account !== 'all' && t.account !== AN.account) return false;
      if (AN.side !== 'all' && t.side !== AN.side) return false;
      if (AN.outcome === 'win' && !(t.pnl > 0)) return false; if (AN.outcome === 'loss' && !(t.pnl < 0)) return false;
      if (sym && !String(t.symbol).toUpperCase().includes(sym)) return false;
      return true;
    }).sort((a, b) => tdate(a) - tdate(b));
  }
  function stats(ts) {
    const o = { n: ts.length, net: 0, gp: 0, gl: 0, w: 0, l: 0, fees: 0, aw: 0, al: 0 };
    ts.forEach(t => { o.net += t.pnl; o.fees += (t.fees || 0); if (t.pnl > 0) { o.w++; o.gp += t.pnl; } else if (t.pnl < 0) { o.l++; o.gl += t.pnl; } });
    o.wr = o.n ? o.w / o.n * 100 : 0; o.pf = o.gl ? o.gp / Math.abs(o.gl) : (o.gp ? Infinity : 0);
    o.aw = o.w ? o.gp / o.w : 0; o.al = o.l ? Math.abs(o.gl) / o.l : 0; o.exp = o.n ? o.net / o.n : 0; o.avg = o.exp;
    return o;
  }
  function series(ts) {
    const { from } = rangeBounds(), today = sod(new Date());
    const start = from || (ts.length ? sod(tdate(ts[0])) : addDays(today, -29));
    const baseEq = startEq() + baseTrades().filter(t => tdate(t) < start).reduce((a, t) => a + t.pnl, 0);
    const map = {};
    ts.forEach(t => { const k = dkey(tdate(t)); const m = map[k] || (map[k] = { pnl: 0, fees: 0, n: 0 }); m.pnl += t.pnl; m.fees += (t.fees || 0); m.n++; });
    const days = []; let cum = 0, peak = baseEq, maxDd = 0;
    for (let d = new Date(start); d <= today; d = addDays(d, 1)) {
      const k = dkey(d), m = map[k] || { pnl: 0, fees: 0, n: 0 }; cum += m.pnl;
      const eq = baseEq + cum; peak = Math.max(peak, eq); const dd = peak > 0 ? (peak - eq) / peak * 100 : 0; maxDd = Math.max(maxDd, dd);
      days.push({ d: new Date(d), k, pnl: m.pnl, fees: m.fees, n: m.n, cum, eq, dd });
    }
    return { days, baseEq, maxDd };
  }
  const reviewed = ts => ts.filter(t => { const r = R(t); return r.plan || r.rating || r.completed || r.mood !== undefined || (r.mistakes && r.mistakes.length); });
  const entryOf = t => t.entryTime || t.date, exitOf = t => t.exitTime || t.date;
  function holdMin(t) { const a = new Date(entryOf(t)), b = new Date(exitOf(t)); const m = (b - a) / 60000; return fin(m) && m >= 0 ? m : null; }
  function session(t) {
    const d = new Date(entryOf(t)); if (isNaN(d)) return 'After-hours';
    let h, m;
    try { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', hour: 'numeric', minute: 'numeric' }).formatToParts(d); h = +p.find(x => x.type === 'hour').value; m = +p.find(x => x.type === 'minute').value; } catch (e) { h = d.getHours(); m = d.getMinutes(); }
    const x = h * 60 + m;
    return x >= 240 && x < 570 ? 'Pre-market' : x >= 570 && x < 660 ? 'Open' : x >= 660 && x < 960 ? 'Close' : 'After-hours';
  }
  const hitTpSl = t => {
    const r = R(t), e = fin(+r.entry) ? +r.entry : t.entry, x = t.exit, sl = r.sl != null ? +r.sl : t.stopLoss, tp = r.tp != null ? +r.tp : t.takeProfit;
    if (!fin(x) || !x) return false; const tol = Math.abs(x) * 0.001;
    const near = lvl => fin(+lvl) && +lvl > 0 && Math.abs(x - +lvl) <= tol;
    const long = t.side === 'Long';
    return near(sl) || near(tp) || (fin(+sl) && +sl > 0 && (long ? x <= +sl : x >= +sl)) || (fin(+tp) && +tp > 0 && (long ? x >= +tp : x <= +tp)) || (fin(e) && false);
  };

  /* ---------- svg + html chart pieces ---------- */
  function frame(W, H) { const m = { l: 50, r: 14, t: 12, b: 28 }; return { W, H, m, iw: W - m.l - m.r, ih: H - m.t - m.b }; }
  function axisFor(lo, hi) { if (hi <= lo) hi = lo + 4; return niceAxis(lo, hi); }
  function gridY(f, ax, fmt) {
    let g = '';
    for (let i = 0; i <= 4; i++) { const y = f.m.t + f.ih / 4 * i, v = ax.hi - (ax.hi - ax.lo) / 4 * i; g += `<line x1="${f.m.l}" x2="${f.W - f.m.r}" y1="${y}" y2="${y}" class="an-gl"/><text x="${f.m.l - 8}" y="${y + 3}" text-anchor="end" class="an-ax">${fmt(v)}</text>`; }
    return g;
  }
  function xLabels(f, days, labelFn, slotMode) {
    const n = days.length, step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(f.iw / 62)))); let s = '';
    days.forEach((d, i) => { if ((i % step === 0 && (i === n - 1 || n - 1 - i >= step * 0.7)) || i === n - 1) { const x = slotMode ? f.m.l + f.iw / n * (i + .5) : f.m.l + (n === 1 ? f.iw / 2 : f.iw / (n - 1) * i); s += `<text x="${x}" y="${f.H - 8}" text-anchor="middle" class="an-ax">${labelFn(d, i)}</text>`; } });
    return s;
  }
  const dlab = d => `${MN[d.d.getMonth()]} ${d.d.getDate()}`;
  function hitCols(f, n, tipFn, slotMode) {
    let s = ''; const w = f.iw / (slotMode ? n : Math.max(1, n - 1));
    for (let i = 0; i < n; i++) { const cx = slotMode ? f.m.l + f.iw / n * (i + .5) : f.m.l + (n === 1 ? f.iw / 2 : f.iw / (n - 1) * i); s += `<rect class="an-hit" x="${cx - w / 2}" y="${f.m.t}" width="${w}" height="${f.ih}" data-cx="${cx}" data-tip="${esc(tipFn(i))}"/>`; }
    return s;
  }
  function svgWrap(f, inner, extra) { return `<svg class="an-svg" width="${f.W}" height="${f.H}" viewBox="0 0 ${f.W} ${f.H}" ${extra || ''}>${inner}<line class="an-cross" y1="${f.m.t}" y2="${f.m.t + f.ih}" style="display:none"/></svg>`; }
  function pathOf(pts) { return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(''); }

  function cumulativeChart(W, sr) {
    const days = sr.days, f = frame(W, 262), vals = days.map(d => d.cum);
    const ax = axisFor(Math.min(0, ...vals), Math.max(0, ...vals));
    const X = i => f.m.l + (days.length === 1 ? f.iw / 2 : f.iw / (days.length - 1) * i), Y = v => f.m.t + (1 - (v - ax.lo) / (ax.hi - ax.lo)) * f.ih, y0 = Y(0);
    const pts = days.map((d, i) => [X(i), Y(d.cum)]), d = pathOf(pts);
    const area = d + `L${X(days.length - 1)},${y0}L${X(0)},${y0}Z`;
    const inner = `<defs><clipPath id="anUp"><rect x="0" y="0" width="${W}" height="${y0}"/></clipPath><clipPath id="anDn"><rect x="0" y="${y0}" width="${W}" height="${f.H}"/></clipPath>
      <linearGradient id="anGg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c55e" stop-opacity=".28"/><stop offset="1" stop-color="#22c55e" stop-opacity="0"/></linearGradient>
      <linearGradient id="anRg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ef4444" stop-opacity=".3"/><stop offset="1" stop-color="#ef4444" stop-opacity="0"/></linearGradient></defs>
      ${gridY(f, ax, kfmtSigned)}<line x1="${f.m.l}" x2="${W - f.m.r}" y1="${y0}" y2="${y0}" class="an-zero"/>${xLabels(f, days, dlab)}
      <path d="${area}" fill="url(#anGg)" clip-path="url(#anUp)" class="an-fade"/><path d="${area}" fill="url(#anRg)" clip-path="url(#anDn)" class="an-fade"/>
      <path d="${d}" fill="none" stroke="#22c55e" stroke-width="2" stroke-linejoin="round" clip-path="url(#anUp)" pathLength="1" class="an-draw"/><path d="${d}" fill="none" stroke="#ef4444" stroke-width="2" stroke-linejoin="round" clip-path="url(#anDn)" pathLength="1" class="an-draw"/>
      ${hitCols(f, days.length, i => `<b>${dlab(days[i])}, ${days[i].d.getFullYear()}</b><span>Cumulative</span><em class="${cls(days[i].cum)}">${fx(days[i].cum, true)}</em><span>Day</span><em class="${cls(days[i].pnl)}">${fx(days[i].pnl, true)}</em>`)}`;
    return svgWrap(f, inner);
  }
  const kfmtSigned = v => (v < 0 ? '-' : '') + cur() + kfmt(Math.abs(v));
  function drawdownChart(W, sr) {
    const days = sr.days, f = frame(W, 262), hi = Math.max(1, sr.maxDd * 1.15), ax = niceAxis(0, hi);
    const X = i => f.m.l + (days.length === 1 ? f.iw / 2 : f.iw / (days.length - 1) * i), Y = v => f.m.t + (1 - (v - ax.lo) / (ax.hi - ax.lo)) * f.ih, yb = Y(0);
    const pts = days.map((d, i) => [X(i), Y(d.dd)]), d = pathOf(pts), area = d + `L${X(days.length - 1)},${yb}L${X(0)},${yb}Z`;
    const inner = `<defs><linearGradient id="anDd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef4444" stop-opacity=".45"/><stop offset="1" stop-color="#ef4444" stop-opacity="0"/></linearGradient></defs>${gridY(f, ax, v => v.toFixed(v % 1 ? 1 : 0) + '%')}${xLabels(f, days, dlab)}
      <path d="${area}" fill="url(#anDd)" class="an-fade"/><path d="${d}" fill="none" stroke="#ef4444" stroke-width="2" stroke-linejoin="round" pathLength="1" class="an-draw"/>
      ${hitCols(f, days.length, i => `<b>${dlab(days[i])}, ${days[i].d.getFullYear()}</b><span>Drawdown</span><em class="neg">${days[i].dd.toFixed(2)}%</em><span>Equity</span><em>${fx(days[i].eq)}</em>`)}`;
    return svgWrap(f, inner);
  }
  function bucketDays(days, maxBars) {
    if (days.length <= maxBars) return days.map(d => ({ label: dlab(d), pnl: d.pnl, fees: d.fees, n: d.n, d: d.d }));
    const monthly = days.length > 330, out = [], map = new Map();
    days.forEach(d => { const key = monthly ? d.d.getFullYear() + '-' + d.d.getMonth() : weekKey(d.d); let b = map.get(key); if (!b) { b = { label: monthly ? MN[d.d.getMonth()] + " '" + String(d.d.getFullYear()).slice(2) : 'W' + weekNo(d.d), pnl: 0, fees: 0, n: 0, d: d.d }; map.set(key, b); out.push(b); } b.pnl += d.pnl; b.fees += d.fees; b.n += d.n; });
    return out;
  }
  function weekNo(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 86400000 + 1) / 7); }
  const weekKey = d => d.getFullYear() + '-' + weekNo(d);
  function dailyBars(W, sr) {
    const bs = bucketDays(sr.days, 70), f = frame(W, 262), m = Math.max(1, ...bs.map(b => Math.abs(b.pnl))), a = niceAxis(0, m * 1.05), ax = { lo: -a.hi, hi: a.hi };
    const slot = f.iw / bs.length, bw = Math.max(2, Math.min(26, slot * .6)), Y = v => f.m.t + (1 - (v - ax.lo) / (ax.hi - ax.lo)) * f.ih, y0 = Y(0);
    let bars = ''; bs.forEach((b, i) => { if (!b.pnl) return; const y = Y(b.pnl), cx = f.m.l + slot * (i + .5); bars += `<rect class="an-bar" style="--ox:${cx}px;--oy:${y0}px;--i:${i}" x="${cx - bw / 2}" y="${Math.min(y, y0)}" width="${bw}" height="${Math.max(1.5, Math.abs(y - y0))}" rx="2" fill="${b.pnl > 0 ? '#16a96a' : '#d94545'}"/>`; });
    const inner = `${gridY(f, ax, kfmtSigned)}<line x1="${f.m.l}" x2="${W - f.m.r}" y1="${y0}" y2="${y0}" class="an-zero"/>${xLabels(f, bs, b => b.label, true)}${bars}${hitCols(f, bs.length, i => `<b>${bs[i].label}</b><span>P&amp;L</span><em class="${cls(bs[i].pnl)}">${fx(bs[i].pnl, true)}</em><span>Trades</span><em>${bs[i].n}</em>`, true)}`;
    return svgWrap(f, inner);
  }
  function feesChart(W, sr) {
    const bs = bucketDays(sr.days, 400), weeks = new Map();
    sr.days.forEach(d => { const k = weekKey(d.d); let b = weeks.get(k); if (!b) { b = { label: 'W' + weekNo(d.d), gross: 0, fees: 0, n: 0 }; weeks.set(k, b); } b.gross += d.pnl + d.fees; b.fees += d.fees; b.n += d.n; });
    const ws = Array.from(weeks.values()).filter((b, i, a) => b.n || a.length <= 6), f = frame(W, 262); void bs;
    if (!ws.length) return '';
    const m = Math.max(1, ...ws.map(b => Math.max(Math.abs(b.gross), b.fees))), a = niceAxis(0, m * 1.05), ax = { lo: -a.hi, hi: a.hi };
    const slot = f.iw / ws.length, bw = Math.max(5, Math.min(26, slot * .28)), Y = v => f.m.t + (1 - (v - ax.lo) / (ax.hi - ax.lo)) * f.ih, y0 = Y(0);
    let bars = ''; ws.forEach((b, i) => { const cx = f.m.l + slot * (i + .5), yg = Y(b.gross), yf = Y(-b.fees);
      bars += `<rect class="an-bar" style="--ox:${cx}px;--oy:${y0}px;--i:${i}" x="${cx - bw - 1.5}" y="${Math.min(yg, y0)}" width="${bw}" height="${Math.max(1.5, Math.abs(yg - y0))}" rx="2" fill="${b.gross >= 0 ? '#16a96a' : '#1c9a6a'}"/><rect class="an-bar" style="--ox:${cx}px;--oy:${y0}px;--i:${i + 1}" x="${cx + 1.5}" y="${Math.min(yf, y0)}" width="${bw}" height="${Math.max(1.5, Math.abs(yf - y0))}" rx="2" fill="#d9a21b"/>`; });
    const inner = `${gridY(f, ax, kfmtSigned)}<line x1="${f.m.l}" x2="${W - f.m.r}" y1="${y0}" y2="${y0}" class="an-zero"/>${xLabels(f, ws, b => b.label, true)}${bars}${hitCols(f, ws.length, i => `<b>${ws[i].label}</b><span>Gross profit</span><em class="${cls(ws[i].gross)}">${fx(ws[i].gross, true)}</em><span>Fees</span><em class="amber">-${fx(ws[i].fees)}</em>`, true)}`;
    return svgWrap(f, inner);
  }
  function lineSimple(W, labels, series2, opts) {
    const f = frame(W, opts.h || 240), n = labels.length, ax = { lo: 0, hi: 100 };
    const X = i => f.m.l + (n === 1 ? f.iw / 2 : f.iw / (n - 1) * i), Y = v => f.m.t + (1 - v / 100) * f.ih;
    let g = ''; for (let i = 0; i <= 4; i++) { const y = f.m.t + f.ih / 4 * i; g += `<line x1="${f.m.l}" x2="${W - f.m.r}" y1="${y}" y2="${y}" class="an-gl"/><text x="${f.m.l - 8}" y="${y + 3}" text-anchor="end" class="an-ax">${100 - 25 * i}%</text>`; }
    let lines = ''; series2.forEach((s, si) => { const pts = s.v.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean); if (!pts.length) return;
      lines += `<path d="${pathOf(pts)}" fill="none" stroke="${s.c}" stroke-width="2.2" stroke-linejoin="round" ${pts.length > 1 ? 'pathLength="1" class="an-draw"' : ''}/>` + pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="${s.c}" class="an-dot" style="--i:${i + si}"/>`).join(''); });
    const lab = labels.map((l, i) => `<text x="${X(i)}" y="${f.H - 8}" text-anchor="middle" class="an-ax">${l}</text>`).join('');
    const hits = labels.map((l, i) => `<rect class="an-hit" x="${X(i) - (f.iw / Math.max(1, n - 1)) / 2}" y="${f.m.t}" width="${f.iw / Math.max(1, n - 1)}" height="${f.ih}" data-cx="${X(i)}" data-tip="${esc(`<b>${l}</b>` + series2.map(s => `<span>${s.name}</span><em>${s.v[i] == null ? '—' : pc(s.v[i])}</em>`).join(''))}"/>`).join('');
    return svgWrap(f, g + lab + lines + hits);
  }
  function donut(parts, centerTop, centerBot) {
    const tot = parts.reduce((a, p) => a + p.v, 0) || 1; let off = 0, segs = '';
    parts.forEach((p, i) => { const pct = p.v / tot * 100; segs += `<circle class="an-seg" r="15.915" cx="21" cy="21" fill="none" stroke="${p.c}" stroke-width="5.2" pathLength="100" style="stroke-dasharray:${Math.max(0, pct - .8)} ${100 - Math.max(0, pct - .8)};stroke-dashoffset:${-off};--i:${i}" data-tip="${esc(`<b>${p.l}</b><span>Trades</span><em>${p.v}</em>${p.x ? `<span>P&amp;L</span><em class="${cls(p.pnl)}">${p.x}</em>` : ''}`)}"/>`; off += pct; });
    return `<svg viewBox="0 0 42 42" class="an-donut"><circle r="15.915" cx="21" cy="21" fill="none" stroke="var(--border)" stroke-width="5.2"/>${segs}<text x="21" y="21.5" text-anchor="middle" class="an-dc1">${centerTop}</text><text x="21" y="26.6" text-anchor="middle" class="an-dc2">${centerBot}</text></svg>`;
  }
  function hbars(rows, opts) {
    opts = opts || {}; const max = Math.max(1e-9, ...rows.map(r => Math.abs(r.v)));
    return `<div class="an-hbars">${rows.map((r, i) => `<div class="an-hb" style="--i:${i}"><span class="an-hl" title="${esc(r.l)}">${esc(r.l)}</span><div class="an-ht${opts.div ? ' div' : ''}">${opts.div ? `<i class="half l">${r.v < 0 ? `<b class="an-grow neg" style="width:${Math.abs(r.v) / max * 100}%"></b>` : ''}</i><i class="half r">${r.v > 0 ? `<b class="an-grow pos" style="width:${Math.abs(r.v) / max * 100}%"></b>` : ''}</i>` : `<b class="an-grow ${r.c || (r.v >= 0 ? 'pos' : 'neg')}" style="width:${Math.abs(r.v) / max * 100}%;${r.col ? `background:${r.col}` : ''}"></b>`}</div><span class="an-hv ${r.cls || ''}">${r.t}</span></div>`).join('')}</div>`;
  }
  const empty = (msg, sub) => `<div class="an-empty"><span class="an-empty-ic">${ic('layers', 22)}</span><b>${msg}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const card = (title, icon, body, o) => { o = o || {}; return `<section class="an-card${o.cls ? ' ' + o.cls : ''}" style="--i:${o.i || 0}"><header><span class="an-ci">${ic(icon, 15)}</span><div><h3>${title}</h3>${o.sub ? `<small>${o.sub}</small>` : ''}</div>${o.right || ''}</header>${body}</section>`; };
  const kpi = (label, id, value, sub, icon, tone, i) => `<div class="an-kpi tone-${tone}" style="--i:${i}"><div><small>${label}</small><b id="${id}">${value}</b><span>${sub}</span></div><span class="an-kic">${ic(icon, 22)}</span></div>`;

  /* ---------- tab builders ---------- */
  function perfTab(ts, W) {
    const st = stats(ts), sr = series(ts), ms = new Date();
    const monthTs = baseTrades().filter(t => { const d = tdate(t); return d.getFullYear() === ms.getFullYear() && d.getMonth() === ms.getMonth() && (AN.account === 'all' || t.account === AN.account); });
    const roi = startEq() ? monthTs.reduce((a, t) => a + t.pnl, 0) / startEq() * 100 : 0;
    const kp = [
      kpi('WIN RATE', 'anK1', pc(st.wr), `${st.n} trade${st.n === 1 ? '' : 's'}`, 'trophy', 'blue', 0),
      kpi('PROFIT FACTOR', 'anK2', st.pf === Infinity ? '∞' : st.pf.toFixed(2), 'Gross P / L', 'bolt', 'amber', 1),
      kpi('EXPECTANCY', 'anK3', fm(st.exp), 'per trade', 'coins', st.exp >= 0 ? 'green' : 'red', 2),
      kpi('MONTHLY ROI', 'anK4', (roi > 0 ? '+' : '') + roi.toFixed(1) + '%', 'on balance', 'trend', roi >= 0 ? 'purple' : 'pink', 3),
      kpi('MAX DRAWDOWN', 'anK5', sr.maxDd.toFixed(1) + '%', 'peak to trough', 'dl', 'red', 4),
      kpi('WIN / LOSS', 'anK6', `${fm(st.aw)} / ${fm(st.al)}`, 'avg win / avg loss', 'swap', 'cyan', 5)];
    const wd = Array(7).fill(0), wdn = Array(7).fill(0); ts.forEach(t => { const d = tdate(t).getDay(); wd[d] += t.pnl; wdn[d]++; });
    const order = [1, 2, 3, 4, 5, 6, 0], names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const wdRows = order.map(i => ({ l: names[i], v: wd[i], t: wdn[i] ? fm(wd[i], true) : '—', cls: cls(wd[i]) }));
    const buckets = distribution(ts);
    return `<div class="an-kpis">${kp.join('')}</div>
      <div class="an-two">${card('Cumulative PnL', 'trend', ts.length ? `<div class="an-chart" data-chart="cum">${cumulativeChart(Math.max(300, W / 2 - 32), sr)}</div>` : empty('No trades in this range', 'Widen the date range or sync MetaTrader.'), { i: 6 })}
      ${card('Drawdown Curve', 'dl', ts.length ? `<div class="an-chart" data-chart="dd">${drawdownChart(Math.max(300, W / 2 - 32), sr)}</div>` : empty('No drawdown yet'), { i: 7 })}</div>
      <div class="an-two">${card('Daily PnL', 'bars', ts.length ? `<div class="an-chart" data-chart="daily">${dailyBars(Math.max(300, W / 2 - 32), sr)}</div>` : empty('No daily results yet'), { i: 8 })}
      ${card('Fees vs Profit', 'coins', ts.length ? `<div class="an-legend"><span><i style="background:#16a96a"></i>Gross Profit</span><span><i style="background:#d9a21b"></i>Fees</span></div><div class="an-chart" data-chart="fees">${feesChart(Math.max(300, W / 2 - 32), sr)}</div>` : empty('No fee data yet'), { i: 9 })}</div>
      <div class="an-two">${card('P&amp;L by Weekday', 'clk', ts.length ? hbars(wdRows, { div: true }) : empty('No weekday data'), { i: 10 })}
      ${card('Win / Loss Distribution', 'bars', ts.length ? `<div class="an-hist">${buckets.map((b, i) => `<div class="an-hcol" style="--i:${i}" data-tip="${esc(`<b>${b.lab}</b><span>Trades</span><em>${b.n}</em>`)}"><i class="an-grow-y ${b.mid >= 0 ? 'pos' : 'neg'}" style="height:${b.h}%"></i><small>${b.n || ''}</small></div>`).join('')}</div><div class="an-hist-ax"><span>${buckets[0].lab.split(' to ')[0]}</span><span>0</span><span>${buckets[buckets.length - 1].lab.split(' to ')[1]}</span></div>` : empty('No distribution yet'), { i: 11 })}</div>`;
  }
  function distribution(ts) {
    const vals = ts.map(t => t.pnl); const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), N = 10, step = (hi - lo) / N || 1, bs = Array.from({ length: N }, (_, i) => ({ a: lo + step * i, b: lo + step * (i + 1), n: 0 }));
    vals.forEach(v => { let i = Math.min(N - 1, Math.floor((v - lo) / step)); bs[i].n++; });
    const mx = Math.max(1, ...bs.map(b => b.n));
    return bs.map(b => ({ n: b.n, h: b.n / mx * 100, mid: (b.a + b.b) / 2, lab: `${fm(b.a)} to ${fm(b.b)}` }));
  }

  function edgeTab(ts, W) {
    void W; const strat = {};
    ts.forEach(t => { const s = (R(t).strategy || t.strategy || '').trim(); if (s) (strat[s] = strat[s] || []).push(t); });
    const rows = Object.entries(strat).map(([k, v]) => ({ k, s: stats(v) })).sort((a, b) => b.s.net - a.s.net);
    const tableRows = rows.map((r, i) => `<div class="an-tr" style="--i:${i}"><span class="an-ts"><b>${esc(r.k)}</b><small>${r.s.n} trade${r.s.n === 1 ? '' : 's'} · ${fm(r.s.net, true)}</small></span><span><div class="an-meter"><i class="an-grow ${r.s.wr >= 50 ? 'pos' : 'neg'}" style="width:${r.s.wr}%"></i></div><em>${pc(r.s.wr)}</em></span><span class="${cls(r.s.avg)}">${fx(r.s.avg, true)}</span><span class="${cls(r.s.exp)}">${fx(r.s.exp, true)}</span></div>`).join('');
    const top = rows[0], weak = rows.length > 1 ? rows[rows.length - 1] : null;
    const stratCard = card('Strategy Performance', 'target', `<div class="an-table"><div class="an-th"><span>Strategy</span><span>Win rate</span><span>Avg PnL</span><span>Expectancy</span></div>${rows.length ? tableRows : `<div class="an-nodata">No strategy data available<small>Pick a strategy on each trade in the Daily Journal.</small></div>`}</div>`, { i: 0 });
    const tw = (lbl, r, good) => `<div class="an-card an-mini" style="--i:${good ? 1 : 2}"><div><small>${lbl}</small><b>${r ? esc(r.k) : 'N/A'}</b><span>${r ? `${pc(r.s.wr)} win • <em class="${cls(r.s.net)}">${fm(r.s.net, true)}</em>` : '0% win • +$0'}</span></div><span class="an-kic ${good ? 'tone-green' : 'tone-red'}">${ic(good ? 'trend' : 'tdown', 18)}</span></div>`;
    const ses = ['Pre-market', 'Open', 'Close', 'After-hours'], sd = {}; ses.forEach(s => sd[s] = []); ts.forEach(t => sd[session(t)].push(t));
    const sStats = ses.map(s => ({ s, st: stats(sd[s]) })), sLab = { 'Pre-market': 'Pre-market', Open: 'Open (9:30-11:00)', Close: 'Close', 'After-hours': 'After-hours' };
    const sesBody = ts.length ? `<div class="an-ses"><div>${hbars(sStats.map(x => ({ l: x.s === 'Open' ? 'Open' : x.s, v: x.st.net, t: x.st.n ? fm(x.st.net, true) : '—', cls: cls(x.st.net) })), { div: true })}<small class="an-note">US Eastern time (ET) · by entry time</small></div>
      <div class="an-table an-small"><div class="an-th"><span></span><span>Win rate</span><span>Avg PnL</span></div>${sStats.map((x, i) => `<div class="an-tr" style="--i:${i}"><span class="an-ts"><small>${sLab[x.s].toUpperCase()}</small></span><span class="${x.st.wr >= 50 ? 'pos' : x.st.n ? 'neg' : ''}">${x.st.n ? pc(x.st.wr) : '—'}</span><span class="${cls(x.st.avg)}">${x.st.n ? fm(x.st.avg, true) : '—'}</span></div>`).join('')}</div></div>` : empty('No session data yet');
    const sym = {}; ts.forEach(t => { (sym[t.symbol] = sym[t.symbol] || []).push(t); });
    const sa = Object.entries(sym).map(([k, v]) => ({ k, n: v.length, net: stats(v).net }));
    const mostTraded = sa.slice().sort((a, b) => b.n - a.n).slice(0, 6), best = sa.slice().sort((a, b) => b.net - a.net).slice(0, 6);
    const ac = {}; ts.forEach(t => { const c = assetClass(t.symbol); (ac[c] = ac[c] || []).push(t); });
    const COL = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a78bfa'];
    const acParts = Object.entries(ac).map(([k, v], i) => ({ l: k, v: v.length, c: COL[i % COL.length], pnl: stats(v).net, x: fm(stats(v).net, true) }));
    const style = { Scalping: [], 'Day trade': [], Swing: [], Unknown: [] };
    ts.forEach(t => { const m = holdMin(t); style[m == null ? 'Unknown' : m < 15 ? 'Scalping' : m < 1440 ? 'Day trade' : 'Swing'].push(t); });
    const stParts = Object.entries(style).filter(([, v]) => v.length).map(([k, v], i) => ({ l: k, v: v.length, c: COL[(i + 2) % COL.length], pnl: stats(v).net, x: fm(stats(v).net, true) }));
    const legend = parts => `<ul class="an-dleg">${parts.map(p => `<li><i style="background:${p.c}"></i><span>${esc(p.l)}</span><b>${Math.round(p.v / (parts.reduce((a, q) => a + q.v, 0) || 1) * 100)}%</b><em class="${cls(p.pnl)}">${p.x}</em></li>`).join('')}</ul>`;
    return `${stratCard}<div class="an-two">${tw('TOP STRATEGY', top, true)}${tw('WEAK STRATEGY', weak, false)}</div>
      ${card('Session Performance', 'clk', sesBody, { i: 3 })}
      <div class="an-two">${card('Most Traded', 'bolt', mostTraded.length ? hbars(mostTraded.map(r => ({ l: r.k, v: r.n, t: r.n + ' trades', c: 'ind' }))) : empty('No trades yet'), { i: 4 })}
      ${card('Best Performance', 'trend', best.length ? hbars(best.map(r => ({ l: r.k, v: r.net, t: fm(r.net, true), cls: cls(r.net) })), { div: true }) : empty('No trades yet'), { i: 5 })}</div>
      <div class="an-two">${card('Instrument Type', 'layers', ts.length ? `<div class="an-dwrap">${donut(acParts, ts.length, 'TRADES')}${legend(acParts)}</div>` : empty('No instruments yet'), { i: 6 })}
      ${card('Trade Style', 'bolt', ts.length ? `<div class="an-dwrap">${donut(stParts, ts.length, 'TRADES')}${legend(stParts)}</div>` : empty('No trade styles yet'), { i: 7 })}</div>`;
  }

  function behaviorTab(ts, W) {
    const rv = reviewed(ts), f = rv.filter(t => R(t).plan === 'followed').length, dv = rv.filter(t => R(t).plan === 'deviated').length;
    const fomo = rv.filter(t => (R(t).mistakes || []).includes('FOMO')).length, hit = ts.filter(hitTpSl).length, withMistake = rv.filter(t => (R(t).mistakes || []).length).length;
    const share = (n, d) => d ? n / d * 100 : 0;
    const psy = [['Followed', 'check-ok', share(f, rv.length), 'Disciplined', 'green', 'shield'], ['Deviated', 'x', share(dv, rv.length), 'Leakage', 'red', 'activity'], ['Discipline', 'tg', share(hit, ts.length), 'Hit TP/SL', 'blue', 'target'], ['FOMO', 'f', share(fomo, rv.length), 'Emotional', 'amber', 'bolt']];
    const psyBody = `<div class="an-psy">${psy.map((p, i) => `<div class="an-pcell tone-${p[4]}" style="--i:${i}"><span class="an-pl">${ic(p[5], 13)}${p[0]}</span><b data-pct="${p[2]}">${pc(p[2])}</b><small>${p[3]}</small></div>`).join('')}</div>${rv.length ? '' : `<div class="an-hint">${ic('sparkles', 12)}Complete reviews in the Daily Journal (plan, mood, mistakes) to unlock this tab.</div>`}`;
    // trend by bucket
    const first = ts.length ? tdate(ts[0]) : new Date(), span = (rangeBounds().to - (rangeBounds().from || first)) / 86400000;
    const unit = span > 200 ? 'month' : span > 45 ? 'week' : 'day', groups = new Map();
    rv.forEach(t => { const d = tdate(t), k = unit === 'month' ? d.getFullYear() * 12 + d.getMonth() : unit === 'week' ? weekKey(d) : dkey(d); let g = groups.get(k); if (!g) { g = { d, t: [] }; groups.set(k, g); } g.t.push(t); });
    const gl = Array.from(groups.values()).sort((a, b) => a.d - b.d);
    const labels = gl.map(g => unit === 'month' ? MN[g.d.getMonth()] : unit === 'week' ? 'W' + weekNo(g.d) : MN[g.d.getMonth()] + ' ' + g.d.getDate());
    const adh = gl.map(g => { const p = g.t.filter(t => R(t).plan); return p.length ? share(p.filter(t => R(t).plan === 'followed').length, p.length) : null; });
    const dis = gl.map(g => { const fo = share(g.t.filter(t => R(t).plan === 'followed').length, g.t.length), mk = share(g.t.filter(t => (R(t).mistakes || []).length).length, g.t.length); return (fo + (100 - mk)) / 2; });
    const half = Math.floor(adh.length / 2), avgOf = a => { const x = a.filter(v => v != null); return x.length ? x.reduce((p, c) => p + c, 0) / x.length : null; };
    const a1 = avgOf(adh.slice(0, Math.max(1, half))), a2 = avgOf(adh.slice(Math.max(1, half))); const trend = a1 == null || a2 == null ? 'steady' : a2 > a1 + 2 ? 'up' : a2 < a1 - 2 ? 'down' : 'steady';
    const badge = `<span class="an-badge ${trend}">${ic(trend === 'down' ? 'tdown' : 'trend', 12)}${trend === 'up' ? 'Improving' : trend === 'down' ? 'Slipping' : 'Steady'}</span>`;
    const trendBody = gl.length ? `<div class="an-legend"><span><i style="background:#22c55e"></i>Plan Adherence</span><span><i style="background:#3b82f6"></i>Discipline Score</span></div><div class="an-chart" data-chart="adh">${lineSimple(Math.max(320, W - 60), labels, [{ name: 'Plan adherence', c: '#22c55e', v: adh }, { name: 'Discipline score', c: '#3b82f6', v: dis }], { h: 230 })}</div>` : empty('No reviewed trades yet', 'Mark each trade “Followed plan” or “Deviated” in the Daily Journal.');
    // mistakes (current month)
    const nm = new Date(), mm = {}; baseTrades().forEach(t => { const d = tdate(t); if (d.getFullYear() !== nm.getFullYear() || d.getMonth() !== nm.getMonth()) return; (R(t).mistakes || []).forEach(m => { const o = mm[m] || (mm[m] = { n: 0, pnl: 0 }); o.n++; o.pnl += t.pnl; }); });
    const mrows = Object.entries(mm).map(([k, v]) => ({ k, ...v })).sort((a, b) => a.pnl - b.pnl);
    const mBody = mrows.length ? `<div class="an-mhead"><span class="an-cur"><i></i>Current</span><span>Impact</span></div>${hbars(mrows.map(r => ({ l: `${r.k} ×${r.n}`, v: Math.abs(r.pnl) || r.n, t: fm(r.pnl, true), cls: cls(r.pnl), c: r.pnl <= 0 ? 'neg' : 'pos' })))}` : empty('No mistakes logged this month', 'Tag mistakes on trades in the Daily Journal — the board resets monthly.');
    // emotion
    const emo = MOODS.map((name, i) => { const v = rv.filter(t => R(t).mood === i); return { name, i, st: stats(v) }; }).filter(x => x.st.n);
    const eBody = emo.length ? `<div class="an-table"><div class="an-th"><span>Mental state</span><span>WR</span><span>Avg PnL</span><span>Impact</span></div>${emo.map((x, i) => `<div class="an-tr" style="--i:${i}"><span class="an-ts"><b><i class="an-mdot" style="background:${MOOD_COL[x.i]}"></i>${x.name.toUpperCase()}</b></span><span class="${x.st.wr >= 50 ? 'pos' : 'neg'}">${pc(x.st.wr)}</span><span class="${cls(x.st.avg)}">${fm(x.st.avg, true)}</span><span class="${cls(x.st.net)}">${fm(x.st.net, true)}</span></div>`).join('')}</div>` : empty('No emotional data yet', 'Pick a mood on each trade in the Daily Journal.');
    // execution quality
    const Q = ['poor', 'okay', 'great'], QC = { poor: '#ef4444', okay: '#3b82f6', great: '#22c55e' }, qd = Q.map(q => ({ q, st: stats(ts.filter(t => R(t).rating === q)) }));
    const rated = qd.reduce((a, x) => a + x.st.n, 0);
    const qBody = rated ? `<div class="an-two tight"><div><h4 class="an-h4">Entry quality distribution</h4>${hbars(qd.map(x => ({ l: x.q[0].toUpperCase() + x.q.slice(1), v: x.st.n, t: `${x.st.n} · ${pc(share(x.st.n, rated))}`, col: QC[x.q] })))}</div><div><h4 class="an-h4">Entry quality → win rate</h4>${hbars(qd.map(x => ({ l: x.q[0].toUpperCase() + x.q.slice(1), v: x.st.wr, t: x.st.n ? pc(x.st.wr) : '—', col: QC[x.q] })))}</div></div>` : empty('No rated trades yet', 'Rate each trade Poor / Okay / Great in the Daily Journal.');
    return `${card('Psychology Status', 'brain', psyBody, { i: 0 })}${card('Plan Adherence Trend', 'shield', trendBody, { i: 1, right: gl.length ? badge : '' })}
      ${card('Mistake Leaderboard', 'tdown', mBody, { i: 2, cls: 'red', right: '<span class="an-reset">Resets Monthly</span>' })}${card('Emotional State → Outcome', 'brain', eBody, { i: 3 })}${card('Execution Quality', 'trend', qBody, { i: 4 })}`;
  }

  function progressTab(ts, W) {
    const all = baseTrades().filter(t => AN.account === 'all' || t.account === AN.account), total = all.length, done = all.filter(t => R(t).completed).length;
    const now = new Date(), thisM = now.getFullYear() * 12 + now.getMonth(), prevM = thisM - 1;
    const mOf = t => { const d = tdate(t); return d.getFullYear() * 12 + d.getMonth(); };
    const rated = (m) => all.filter(t => mOf(t) === m && R(t).rating), share = (arr, q) => arr.length ? arr.filter(t => R(t).rating === q).length / arr.length * 100 : 0;
    const cm = rated(thisM), pm = rated(prevM), gNow = share(cm, 'great'), gPrev = share(pm, 'great'), pNow = share(cm, 'poor'), pPrev = share(pm, 'poor');
    const kp = `<div class="an-kpis three">${kpi('REVIEWS DONE', 'anP1', `${done}/${total}`, `${total ? Math.round(done / total * 100) : 0}% complete`, 'shield', 'blue', 0)}${kpi('GREAT TRADES THIS MONTH', 'anP2', pc(gNow), `${gNow >= gPrev ? 'Up' : 'Down'} from ${pc(gPrev)} in ${MN[(now.getMonth() + 11) % 12]}`, 'check', 'green', 1)}${kpi('POOR TRADES THIS MONTH', 'anP3', pc(pNow), `${pNow <= pPrev ? 'Down' : 'Up'} from ${pc(pPrev)} in ${MN[(now.getMonth() + 11) % 12]}`, 'alert', 'red', 2)}</div>`;
    const months = []; for (let i = 5; i >= 0; i--) { const m = thisM - i; months.push({ m, lab: MN[((m % 12) + 12) % 12], rt: rated(m) }); }
    const hasAny = months.some(x => x.rt.length);
    const cols = months.map((x, i) => { const n = x.rt.length, seg = q => n ? x.rt.filter(t => R(t).rating === q).length / n * 100 : 0; return `<div class="an-scol" style="--i:${i}" data-tip="${esc(`<b>${x.lab}</b><span>Great</span><em class="pos">${pc(seg('great'))}</em><span>Okay</span><em>${pc(seg('okay'))}</em><span>Poor</span><em class="neg">${pc(seg('poor'))}</em><span>Rated</span><em>${n}</em>`)}"><div class="an-stack">${n ? `<i class="an-grow-y" style="height:${seg('poor')}%;background:#ef4444"></i><i class="an-grow-y" style="height:${seg('okay')}%;background:#3b82f6"></i><i class="an-grow-y" style="height:${seg('great')}%;background:#22c55e"></i>` : ''}</div><small>${x.lab}</small></div>`; }).join('');
    const ratioCard = card('Poor / Okay / Great Ratio per Month', 'trend', hasAny ? `<div class="an-legend right"><span><i style="background:#22c55e"></i>GREAT</span><span><i style="background:#3b82f6"></i>OKAY</span><span><i style="background:#ef4444"></i>POOR</span></div><div class="an-stacks">${cols}</div>` : empty('No rated trades yet', 'Rate trades Poor / Okay / Great in the Daily Journal to build this chart.'), { i: 3 });
    const gSeries = months.map(x => x.rt.length ? share(x.rt, 'great') : null), last = gSeries.filter(v => v != null), peak = last.length ? Math.max(...last) : null;
    const delta = gNow - gPrev;
    const trendCard = card('Great Trend Line', 'award', hasAny ? `<div class="an-chart">${lineSimple(Math.max(320, W - 60), months.map(x => x.lab), [{ name: 'Great trades', c: '#22c55e', v: gSeries }], { h: 230 })}</div><div class="an-peak"><small>${ic('bolt', 12)}CONSISTENCY PEAK</small><b>${peak == null ? '—' : pc(peak)}</b></div>` : empty('Nothing to trend yet'), { i: 4, sub: 'MONTHLY ALPHA PERFORMANCE', right: `<span class="an-badge ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'steady'}">${ic('trend', 12)}<b>${delta > 0 ? '+' : ''}${Math.round(delta)}%</b> vs last month</span>` });
    // learning velocity: reviews completed per week (last 8)
    const weeks = []; const wk0 = sod(addDays(now, -((now.getDay() + 6) % 7)));
    for (let i = 7; i >= 0; i--) { const a = addDays(wk0, -7 * i), b = addDays(a, 7); weeks.push({ lab: MN[a.getMonth()] + ' ' + a.getDate(), n: all.filter(t => { const r = R(t); return r.completed && r.completedAt && r.completedAt >= +a && r.completedAt < +b; }).length }); }
    const wNow = weeks.slice(4).reduce((a, w) => a + w.n, 0), wPrev = weeks.slice(0, 4).reduce((a, w) => a + w.n, 0), vel = wPrev ? (wNow - wPrev) / wPrev * 100 : (wNow ? 100 : 0), wm = Math.max(1, ...weeks.map(w => w.n));
    const velCard = card('Learning Velocity', 'activity', `<div class="an-vel"><div class="an-vbars">${weeks.map((w, i) => `<div style="--i:${i}" data-tip="${esc(`<b>Week of ${w.lab}</b><span>Reviews</span><em>${w.n}</em>`)}"><i class="an-grow-y" style="height:${Math.max(4, w.n / wm * 100)}%"></i></div>`).join('')}</div><p><b>${wNow}</b> review${wNow === 1 ? '' : 's'} in the last 4 weeks vs <b>${wPrev}</b> before.</p></div>`, { i: 5, right: `<span class="an-badge ${vel > 0 ? 'up' : vel < 0 ? 'down' : 'steady'}">${ic('trend', 11)}${vel > 0 ? '+' : ''}${Math.round(vel)}%</span>` });
    const mk = {}; all.forEach(t => (R(t).mistakes || []).forEach(m => { mk[m] = (mk[m] || 0) + 1; }));
    const topM = Object.entries(mk).sort((a, b) => b[1] - a[1])[0];
    const patCard = `<section class="an-card an-pattern" style="--i:6"><header><span class="an-ci red">${ic('alert', 14)}</span><div><small class="red">REVISITED PATTERN</small></div></header><h3 class="an-big">${topM ? esc(topM[0]) : 'Systematic Review'}</h3><p>${topM ? `Logged on <b>${topM[1]}</b> trade${topM[1] === 1 ? '' : 's'}. Make a rule that stops it: write the trigger, the rule, and review it every Sunday.` : 'No repeated mistakes yet. Review every trade the same way each day and patterns will surface here.'}</p><button class="an-link" data-go="journal">Open Daily Journal ${ic('right', 12)}</button></section>`;
    return `${kp}${ratioCard}${trendCard}<div class="an-two">${velCard}${patCard}</div>`;
  }

  /* ---------- insights ---------- */
  function insights(tab, ts) {
    const st = stats(ts), out = [];
    if (!ts.length) return ['No trades in this range yet. Sync MetaTrader or log a trade and this panel will start reading your numbers.'];
    if (tab === 'performance') {
      const sr = series(ts), best = sr.days.reduce((a, b) => b.pnl > a.pnl ? b : a, sr.days[0]), worst = sr.days.reduce((a, b) => b.pnl < a.pnl ? b : a, sr.days[0]);
      out.push(`Net result is ${fx(st.net, true)} over ${st.n} trade${st.n === 1 ? '' : 's'} with a ${pc(st.wr)} win rate.${st.pf !== Infinity && st.pf < 1 && st.n >= 5 ? ` A profit factor of ${st.pf.toFixed(2)} means each ${cur()}1 won costs about ${cur()}${(1 / st.pf).toFixed(2)} in losses — tighten exits on losers.` : st.pf >= 1.5 ? ' Profit factor is healthy — keep position sizing consistent to protect it.' : ''}`);
      out.push(`Max drawdown ${sr.maxDd.toFixed(1)}% ${sr.maxDd > 10 ? '— above a common 10% guideline. A daily loss limit would cap this.' : 'is within a controlled range.'}`);
      if (best && worst && best.pnl !== worst.pnl) out.push(`Best day ${MN[best.d.getMonth()]} ${best.d.getDate()} (${fx(best.pnl, true)}); worst ${MN[worst.d.getMonth()]} ${worst.d.getDate()} (${fx(worst.pnl, true)}). Study what differed between them.`);
      if (st.aw && st.al) out.push(`Average win ${fx(st.aw)} vs average loss ${fx(st.al)} — a ${(st.aw / st.al).toFixed(2)}:1 payoff. ${st.aw / st.al < 1 && st.wr < 60 ? 'You need a higher win rate or bigger winners to be profitable at this ratio.' : ''}`);
    } else if (tab === 'edge') {
      const strat = {}; ts.forEach(t => { const s = R(t).strategy || t.strategy; if (s) (strat[s] = strat[s] || []).push(t); });
      const rows = Object.entries(strat).map(([k, v]) => ({ k, s: stats(v) })).sort((a, b) => b.s.net - a.s.net);
      if (rows.length) { out.push(`${rows[0].k} is your strongest setup: ${fx(rows[0].s.net, true)} at ${pc(rows[0].s.wr)} win rate. Give it more of your attention.`); if (rows.length > 1 && rows[rows.length - 1].s.net < 0) out.push(`${rows[rows.length - 1].k} is costing ${fx(rows[rows.length - 1].s.net)}. Pause it, or trade it at half size until the edge returns.`); }
      else out.push('No strategies tagged yet. Pick a strategy on each trade in the Daily Journal to measure which setups actually make money.');
      const sd = {}; ts.forEach(t => { const s = session(t); sd[s] = (sd[s] || 0) + t.pnl; }); const bs = Object.entries(sd).sort((a, b) => b[1] - a[1])[0]; if (bs) out.push(`Your best session is ${bs[0]} (${fx(bs[1], true)}) in US Eastern time.`);
      const sym = {}; ts.forEach(t => { sym[t.symbol] = (sym[t.symbol] || 0) + 1; }); const top = Object.entries(sym).sort((a, b) => b[1] - a[1])[0]; if (top && top[1] / ts.length > .7) out.push(`${Math.round(top[1] / ts.length * 100)}% of your trades are ${top[0]} — a concentrated book. That's fine if it's your edge, risky if it's habit.`);
    } else if (tab === 'behavior') {
      const rv = reviewed(ts); if (!rv.length) return ['Nothing reviewed yet. Mark each trade “Followed plan” or “Deviated” in the Daily Journal and this tab starts measuring your discipline.'];
      const f = rv.filter(t => R(t).plan === 'followed'), d = rv.filter(t => R(t).plan === 'deviated');
      if (f.length && d.length) out.push(`Following the plan averages ${fx(stats(f).avg, true)} per trade versus ${fx(stats(d).avg, true)} when you deviate.`);
      else if (f.length || d.length) out.push(`${f.length} trade${f.length === 1 ? '' : 's'} followed the plan and ${d.length} deviated so far. Keep marking both to compare outcomes.`);
      const mm = {}; ts.forEach(t => (R(t).mistakes || []).forEach(m => { mm[m] = (mm[m] || 0) + t.pnl; })); const worst = Object.entries(mm).sort((a, b) => a[1] - b[1])[0];
      if (worst && worst[1] < 0) out.push(`${worst[0]} is your most expensive mistake: ${fx(worst[1])} in this range.`);
      const emo = MOODS.map((n, i) => ({ n, s: stats(rv.filter(t => R(t).mood === i)) })).filter(x => x.s.n >= 2).sort((a, b) => a.s.avg - b.s.avg)[0]; if (emo && emo.s.avg < 0) out.push(`When you feel ${emo.n.toLowerCase()} your average trade is ${fx(emo.s.avg, true)}. Consider stepping away in that state.`);
    } else {
      const all = baseTrades(), done = all.filter(t => R(t).completed).length;
      out.push(done ? `${done} of ${all.length} trades fully reviewed (${Math.round(done / all.length * 100)}%). Reviewing within 24 hours makes the lesson stick.` : `No reviews completed yet. Open the Daily Journal and finish one trade review to start your quality curve.`);
      const rated = all.filter(t => R(t).rating), g = rated.filter(t => R(t).rating === 'great').length; if (rated.length >= 3) out.push(`${Math.round(g / rated.length * 100)}% of rated trades are “great”. Aim to raise that share month over month.`);
    }
    return out.slice(0, 3);
  }
  function renderAside(ts) {
    const [title, sub] = INTRO[AN.tab], list = dismissed ? [] : insights(AN.tab, ts);
    $a('#anAside').innerHTML = `<div class="an-ahead"><span class="an-ci">${ic(TABS.find(t => t[0] === AN.tab)[2], 15)}</span><div><b>${title}</b><small>LOCAL INSIGHTS <span class="an-king">${ic('crown', 9)}KING</span></small></div></div><p class="an-asub">${sub}</p><div class="an-ins">${list.map((x, i) => `<div class="an-insight" style="--i:${i}">${ic('sparkles', 12)}<p>${esc(x)}</p></div>`).join('') || '<div class="an-insight none"><p>All caught up. Change the range or tab for fresh insights.</p></div>'}</div><footer><button id="anDismiss">Dismiss all</button><span>ACTIVE <b>${list.length}</b></span></footer>`;
  }

  /* ---------- frame + controls ---------- */
  function build() {
    root.innerHTML = `<div class="an-shell"><div class="an-bar"><nav class="an-tabs" role="tablist">${TABS.map(t => `<button role="tab" data-tab="${t[0]}">${ic(t[2], 14)}${t[1]}</button>`).join('')}<i class="an-ink"></i></nav>
      <div class="an-controls"><div class="an-range" id="anRange"><i class="an-thumb"></i>${RANGES.map(r => `<button data-range="${r[0]}">${r[1]}</button>`).join('')}<button class="an-cal" id="anCal" title="Custom date range" aria-label="Custom date range">${ic('calendar', 13)}</button></div>
      <button class="an-btn" id="anFilter">${ic('filter', 14)}Filter</button><button class="an-btn" id="anAcc">${ic('wallet', 14)}<span id="anAccLbl">All Accounts</span>${ic('down', 12)}</button><button class="an-btn icon on" id="anPanel" title="Toggle insights" aria-label="Toggle insights">${ic('panelr', 15)}</button></div></div>
      <div class="an-grid"><div class="an-main" id="anMain"></div><aside class="an-aside" id="anAside"></aside></div><div class="an-tip" id="anTip"></div></div>`;
    bind();
  }
  function syncControls() {
    $$a('.an-tabs button').forEach(b => { const on = b.dataset.tab === AN.tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    const act = $a('.an-tabs button.active'), ink = $a('.an-ink'); if (act && ink) { ink.style.width = act.offsetWidth + 'px'; ink.style.transform = `translateX(${act.offsetLeft}px)`; }
    $$a('#anRange > button[data-range]').forEach(b => b.classList.toggle('on', b.dataset.range === AN.range));
    $a('#anCal').classList.toggle('on', AN.range === 'custom');
    const on = $a('#anRange > button.on:not(.an-cal)'), th = $a('.an-thumb'); if (on && th) { th.style.opacity = 1; th.style.width = on.offsetWidth + 'px'; th.style.transform = `translateX(${on.offsetLeft}px)`; } else if (th) th.style.opacity = 0;
    $a('#anFilter').classList.toggle('act', AN.side !== 'all' || AN.outcome !== 'all' || !!AN.symbol);
    $a('#anAccLbl').textContent = AN.account === 'all' ? 'All Accounts' : AN.account;
    $a('.an-grid').classList.toggle('no-aside', !AN.panel); $a('#anPanel').classList.toggle('on', AN.panel);
  }
  function bind() {
    $a('.an-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b || b.dataset.tab === AN.tab) return; S.anTab = b.dataset.tab; dismissed = false; if (typeof renderMenu === 'function') renderMenu(); renderAnalytics(true); });
    $a('#anRange').addEventListener('click', e => { const b = e.target.closest('[data-range]'); if (!b) return; AN.range = b.dataset.range; persist(); dismissed = false; renderAnalytics(true); });
    $a('#anCal').onclick = ev => { ev.stopPropagation(); const p = pop(ev.currentTarget, `<h4>Custom range</h4><label class="fld">From<input type="date" id="anFrom" value="${AN.from}"></label><label class="fld">To<input type="date" id="anTo" value="${AN.to}"></label><div style="display:flex;gap:6px"><button class="btn gh" id="anCalClr" style="flex:1;height:28px;font-size:11px">Clear</button><button class="btn pri" id="anCalOk" style="flex:1;height:28px;font-size:11px">Apply</button></div>`, 'wide'); p.querySelector('#anCalOk').onclick = () => { AN.from = p.querySelector('#anFrom').value; AN.to = p.querySelector('#anTo').value; AN.range = (AN.from || AN.to) ? 'custom' : '30'; persist(); closePops(); renderAnalytics(true); }; p.querySelector('#anCalClr').onclick = () => { AN.from = ''; AN.to = ''; AN.range = '30'; persist(); closePops(); renderAnalytics(true); }; };
    $a('#anFilter').onclick = ev => { ev.stopPropagation(); const p = pop(ev.currentTarget, `<h4>Filter trades</h4><label class="fld">Symbol<input id="anSym" value="${esc(AN.symbol)}" placeholder="e.g. XAUUSD"></label><label class="fld">Side<select id="anSide"><option value="all">All</option><option>Long</option><option>Short</option></select></label><label class="fld">Outcome<select id="anOut"><option value="all">All</option><option value="win">Winners</option><option value="loss">Losers</option></select></label><button class="btn gh" id="anClr" style="width:100%;height:28px;font-size:11px">Clear filters</button>`, 'wide'); p.querySelector('#anSide').value = AN.side; p.querySelector('#anOut').value = AN.outcome; const up = () => { AN.symbol = p.querySelector('#anSym').value.trim(); AN.side = p.querySelector('#anSide').value; AN.outcome = p.querySelector('#anOut').value; persist(); renderAnalytics(true); }; ['#anSym', '#anSide', '#anOut'].forEach(s => p.querySelector(s).oninput = up); p.querySelector('#anClr').onclick = () => { AN.symbol = ''; AN.side = 'all'; AN.outcome = 'all'; persist(); closePops(); renderAnalytics(true); }; };
    $a('#anAcc').onclick = ev => { ev.stopPropagation(); menu(ev.currentTarget, [['all', 'All Accounts']].concat(accounts().map(a => [a, a])), AN.account, v => { AN.account = v; persist(); renderAnalytics(true); }); };
    $a('#anPanel').onclick = () => { AN.panel = !AN.panel; persist(); syncControls(); };
    $a('#anAside').addEventListener('click', e => { if (e.target.closest('#anDismiss')) { dismissed = true; renderAside(filtered()); } });
    $a('#anMain').addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });
    // tooltips + crosshair
    const tip = $a('#anTip');
    root.addEventListener('mousemove', e => {
      const t = e.target.closest('[data-tip]'); if (!t) { tip.style.display = 'none'; $$a('.an-cross').forEach(c => c.style.display = 'none'); return; }
      tip.innerHTML = t.dataset.tip; tip.style.display = 'grid'; const r = root.getBoundingClientRect(); let x = e.clientX - r.left + 16, y = e.clientY - r.top + 14; if (x + tip.offsetWidth > r.width - 8) x = e.clientX - r.left - tip.offsetWidth - 16; tip.style.left = x + 'px'; tip.style.top = y + 'px';
      const svg = t.closest('svg'); if (svg && t.dataset.cx) { const c = svg.querySelector('.an-cross'); if (c) { c.setAttribute('x1', t.dataset.cx); c.setAttribute('x2', t.dataset.cx); c.style.display = ''; } }
    });
    root.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    let rt; new ResizeObserver(() => { if (!root.classList.contains('active')) return; clearTimeout(rt); rt = setTimeout(() => { const w = $a('#anMain').clientWidth; if (Math.abs(w - (build.lastW || 0)) > 24) renderAnalytics(true, true); else syncControls(); }, 160); }).observe(root);
  }

  /* ---------- main render ---------- */
  function renderAnalytics(force, noAnim) {
    if (!$a('.an-shell')) build();
    if (S.anTab && TABS.some(t => t[0] === S.anTab)) AN.tab = S.anTab; else S.anTab = AN.tab;
    const ts = filtered(), rv = reviews(), upd = Object.values(rv).reduce((a, r) => Math.max(a, r.updatedAt || 0), 0);
    const s2 = [AN.tab, AN.range, AN.from, AN.to, AN.side, AN.outcome, AN.symbol, AN.account, ts.length, ts.reduce((a, t) => a + t.pnl, 0).toFixed(2), upd, startEq()].join('|');
    syncControls();
    if (!force && s2 === sig) return;
    sig = s2;
    const main = $a('#anMain'), W = Math.max(640, main.clientWidth || 900); build.lastW = main.clientWidth;
    const tabChanged = lastTab !== AN.tab; lastTab = AN.tab;
    const html = AN.tab === 'performance' ? perfTab(ts, W) : AN.tab === 'edge' ? edgeTab(ts, W) : AN.tab === 'behavior' ? behaviorTab(ts, W) : progressTab(ts, W);
    main.classList.toggle('an-animate', !noAnim); main.innerHTML = html;
    if (tabChanged || force) { main.classList.remove('an-swap'); void main.offsetWidth; if (!noAnim) main.classList.add('an-swap'); }
    renderAside(ts);
    // count-up on KPI values
    if (!noAnim && typeof tween === 'function') $$a('.an-kpi b', main).forEach(b => { const raw = b.textContent, m = raw.match(/^([-+]?[^\d-+]*)(-?\d[\d,.]*)(.*)$/); if (!m || /\//.test(raw) || /∞/.test(raw)) return; const to = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, pre = m[1], post = m[3]; if (!isFinite(to)) return; b._v = 0; tween(b, to, v => pre + v.toFixed(dec) + post, 800); });
    if (!noAnim && typeof tween === 'function') $$a('.an-pcell b', main).forEach(b => { b._v = 0; tween(b, +b.dataset.pct, v => Math.round(v) + '%', 800); });
  }
  window.renderAnalytics = renderAnalytics;
  window.analyticsReset = () => { sig = ''; };
  hydrate(root);
})();
