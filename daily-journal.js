/* Daily Journal — trade review workspace (list · review · analytics).
   Works with the markup in index.html (#page-journal) and daily-journal.css.
   Reviews live in S.reviews (localStorage), chart screenshots in their own key. */
(function () {
  'use strict';
  const STEPS = [
    ['symbol', 'Add symbol'], ['entry', 'Add entry price'], ['exit', 'Add exit price'], ['times', 'Set entry & exit time'],
    ['qty', 'Add quantity'], ['strategy', 'Select strategy'], ['rating', 'Rate this trade'], ['reflection', 'Write a reflection']
  ];
  const DEFAULT_STRATEGIES = ['Breakout', 'Pullback', 'Reversal', 'Momentum', 'Scalp', 'News'];
  const MOODS = ['😨', '😟', '😐', '🙂', '🚀'];
  const MISTAKES = ['FOMO', 'Revenge trade', 'Moved stop', 'Early exit', 'Late entry', 'Oversized', 'Overtrading', 'Ignored setup'];
  const MOOD_NAMES = ['Fearful', 'Worried', 'Neutral', 'Confident', 'Euphoric'];
  const PER_PAGE = 50;
  const DJ = { tab: 'closed', q: '', side: 'all', review: 'all', date: null, selected: null, detailId: null, page: 0, calY: null, calM: null, listSig: '', collapsed: false, hoverKind: null, saveT: null };
  const page = () => document.getElementById('page-journal');
  const $j = (s, r) => (r || document).querySelector(s);
  const $$j = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fin = v => typeof v === 'number' && isFinite(v);

  /* extra icons the markup relies on */
  Object.assign(P, {
    search: P.search || '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sliders: P.sliders || '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    pointer: '<path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    up: '<path d="m18 15-6-6-6 6"/>', upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>'
  });
  $$j('#page-journal i[data-ic]').forEach(e => { if (!e.querySelector('path,rect,circle,polygon,polyline,line')) delete e.dataset.d; });
  hydrate(page());

  /* ---------- data helpers ---------- */
  const reviews = () => (S.reviews = S.reviews && typeof S.reviews === 'object' ? S.reviews : {});
  const rv = id => reviews()[id] || {};
  const allTr = () => sourceTrades();
  const isOpen = t => !!t.open;
  const isManual = t => !String(t.id).startsWith('mt-');
  const strategyOf = t => (rv(t.id).strategy || t.strategy || '');
  const num = v => (v === '' || v === null || v === undefined ? NaN : Number(v));
  const toLocalInput = x => { const d = new Date(x); return isNaN(d) ? '' : dkey(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const entryOf = t => { const r = rv(t.id); return fin(r.entry) ? r.entry : t.entry; };
  const exitOf = t => { const r = rv(t.id); return fin(r.exit) ? r.exit : t.exit; };
  const qtyOf = t => { const r = rv(t.id); return fin(r.qty) ? r.qty : t.qty; };
  const entryTimeOf = t => rv(t.id).entryTime || t.entryTime || t.date;
  const exitTimeOf = t => rv(t.id).exitTime || t.exitTime || t.date;
  const slOf = t => { const r = rv(t.id); return r.sl !== undefined ? r.sl : t.stopLoss; };
  const tpOf = t => { const r = rv(t.id); return r.tp !== undefined ? r.tp : t.takeProfit; };
  function stepDone(t, key) {
    const r = rv(t.id);
    switch (key) {
      case 'symbol': return !!(t.symbol && String(t.symbol).trim());
      case 'entry': return fin(entryOf(t)) && entryOf(t) > 0;
      case 'exit': return isOpen(t) || (fin(exitOf(t)) && exitOf(t) > 0);
      case 'times': return !!entryTimeOf(t) && (isOpen(t) || !!exitTimeOf(t));
      case 'qty': return fin(qtyOf(t)) && qtyOf(t) > 0;
      case 'strategy': return !!strategyOf(t);
      case 'rating': return !!r.rating;
      case 'reflection': return !!((r.well || '').trim() || (r.improve || '').trim() || (r.lesson || '').trim());
    }
    return false;
  }
  const progressOf = t => STEPS.filter(s => stepDone(t, s[0])).length;
  const nextStepOf = t => STEPS.findIndex(s => !stepDone(t, s[0]));
  const isComplete = t => !!rv(t.id).completed;
  const money1 = (v, sign) => { const a = Math.abs(v); const s = a >= 1000 ? (a / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(Math.round(a * 10) / 10); return (v < 0 ? '-' : sign && v > 0 ? '+' : '') + cur() + s; };
  const klass = v => (v > 0 ? 'green' : v < 0 ? 'red' : '');
  const time12 = x => { const d = new Date(x); if (isNaN(d)) return '--'; let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return pad(h) + ':' + pad(d.getMinutes()) + ' ' + ap; };
  const time24 = x => { const d = new Date(x); return isNaN(d) ? '--:--' : pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const assetClass = s => /^(XAU|XAG|XPT|XPD|WTI|BRENT|USOIL|UKOIL)/i.test(s) ? 'Commodity' : /^(BTC|ETH|LTC|XRP|SOL|DOGE|BNB|ADA)/i.test(s) ? 'Crypto' : /^(US30|US100|US500|NAS100|SPX|GER|DAX|UK100|JP225|NDX|DJ30)/i.test(s) ? 'Index' : /^[A-Z]{6}$/i.test(s) ? 'Forex' : 'Stock';
  const strategyList = () => {
    const set = new Set(DEFAULT_STRATEGIES.concat(Array.isArray(S.strategies) ? S.strategies : []));
    allTr().forEach(t => { const s = strategyOf(t); if (s) set.add(s); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };
  const trShape = t => ({ t, key: new Date(exitTimeOf(t)).getTime() || 0 });

  /* ---------- chart screenshots (separate storage key) ---------- */
  let IMGS = null;
  const imgs = () => { if (!IMGS) { try { IMGS = JSON.parse(localStorage.getItem('tj_dj_imgs') || '{}'); } catch (e) { IMGS = {}; } } return IMGS; };
  const imgGet = (id, kind) => imgs()[id + ':' + kind] || '';
  function imgSet(id, kind, data) {
    const m = imgs(), k = id + ':' + kind, old = m[k];
    if (data) m[k] = data; else delete m[k];
    try { localStorage.setItem('tj_dj_imgs', JSON.stringify(m)); return true; }
    catch (e) { if (old) m[k] = old; else delete m[k]; toast('Storage is full — remove an older screenshot first'); return false; }
  }
  function shrink(file) {
    return new Promise((ok, no) => {
      const fr = new FileReader();
      fr.onerror = no;
      fr.onload = () => {
        const im = new Image();
        im.onerror = no;
        im.onload = () => {
          const max = 1400, sc = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.8));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- review mutation ---------- */
  function setRev(id, patch) {
    const r = Object.assign({}, rv(id), patch, { updatedAt: Date.now() });
    reviews()[id] = r;
    markPending();
  }
  function markPending() {
    const dot = $j('#djSavedDot'), txt = $j('#djSavedText');
    if (dot) dot.classList.add('pending');
    if (txt) txt.textContent = 'Saving…';
    clearTimeout(DJ.saveT);
    DJ.saveT = setTimeout(flushSave, 380);
  }
  function flushSave() {
    clearTimeout(DJ.saveT);
    const ok = save();
    const dot = $j('#djSavedDot'), txt = $j('#djSavedText');
    if (dot) dot.classList.toggle('pending', !ok);
    if (txt) txt.textContent = ok ? 'Saved just now' : 'Not saved — storage full';
    return ok;
  }
  function selectedTrade() { return DJ.selected ? allTr().find(t => t.id === DJ.selected) || null : null; }

  /* ---------- list ---------- */
  function filteredTrades() {
    const q = DJ.q.trim().toLowerCase();
    let ts = allTr().filter(t => (DJ.tab === 'open') === isOpen(t));
    if (DJ.side !== 'all') ts = ts.filter(t => t.side === DJ.side);
    if (DJ.review === 'done') ts = ts.filter(isComplete);
    if (DJ.review === 'pending') ts = ts.filter(t => !isComplete(t));
    if (DJ.date) ts = ts.filter(t => dkey(new Date(exitTimeOf(t))) === DJ.date);
    if (q) ts = ts.filter(t => [t.symbol, strategyOf(t), (rv(t.id).tags || []).join(' '), t.notes, rv(t.id).well, rv(t.id).improve, rv(t.id).lesson].join(' ').toLowerCase().includes(q));
    return ts.map(trShape).sort((a, b) => b.key - a.key).map(x => x.t);
  }
  function ringSvg(t) {
    const p = progressOf(t) / STEPS.length, C = 2 * Math.PI * 4.5;
    return `<svg class="dj-review-ring" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" opacity=".18" stroke-width="1.6"/><circle class="progress" cx="6" cy="6" r="4.5" fill="none" stroke="${isComplete(t) ? '#18c8ae' : '#4c8fff'}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - p)).toFixed(2)}"/></svg>`;
  }
  function itemHtml(t, i, noAnim) {
    const tags = rv(t.id).tags || [], st = strategyOf(t);
    return `<button class="dj-trade${t.id === DJ.selected ? ' selected' : ''}" data-id="${esc(t.id)}" style="--i:${i}${noAnim ? ';animation:none' : ''}"><div class="dj-trade-top"><span class="dj-symbol-tile">${esc(String(t.symbol).slice(0, 4))}</span><div class="dj-trade-info"><div class="dj-trade-title"><span>${esc(t.symbol)}</span><span class="dj-side ${t.side === 'Long' ? 'long' : 'short'}">${esc(t.side.toUpperCase())}</span></div><div class="dj-trade-time"><time>${time12(exitTimeOf(t))}</time> · ${esc(st || 'No Strategy')}</div></div><span class="dj-trade-pnl ${klass(t.pnl)}">${isOpen(t) ? 'OPEN ' : ''}${money1(t.pnl, true)}</span></div><div class="dj-trade-bottom">${ringSvg(t)}<span class="dj-tag">${esc(tags[0] || 'No Tag')}${tags.length > 1 ? ' +' + (tags.length - 1) : ''}</span>${isComplete(t) ? '<span style="color:var(--dj-teal)">✓ reviewed</span>' : ''}</div></button>`;
  }
  function renderList() {
    const all = filteredTrades();
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    DJ.page = Math.min(DJ.page, pages - 1);
    const slice = all.slice(DJ.page * PER_PAGE, DJ.page * PER_PAGE + PER_PAGE);
    const sig = [DJ.tab, DJ.q, DJ.side, DJ.review, DJ.date, DJ.page, slice.map(t => t.id).join(',')].join('|');
    const noAnim = sig === DJ.listSig;
    DJ.listSig = sig;
    const box = $j('#djTradeList'), keep = box.scrollTop;
    if (!slice.length) {
      box.innerHTML = `<div class="dj-empty-list">${ic('journal' in P ? 'journal' : 'book', 26)}${DJ.q || DJ.date || DJ.side !== 'all' || DJ.review !== 'all' ? 'No trades match these filters.' : DJ.tab === 'open' ? 'No open trades right now.<br>Open positions from MetaTrader appear here.' : 'No closed trades yet.<br>Add a trade, import a CSV, or connect MetaTrader.'}</div>`;
    } else {
      let html = '', last = '', i = 0;
      slice.forEach(t => {
        const k = dkey(new Date(exitTimeOf(t)));
        if (k !== last) {
          last = k;
          const d = new Date(k + 'T00:00');
          html += `<div class="dj-date-group">${MON[d.getMonth()].slice(0, 3).toUpperCase()} ${d.getDate()}, ${d.getFullYear()}<small>${slice.filter(x => dkey(new Date(exitTimeOf(x))) === k).length}</small></div>`;
        }
        html += itemHtml(t, i++, noAnim);
      });
      box.innerHTML = html;
      box.scrollTop = keep;
    }
    const from = all.length ? DJ.page * PER_PAGE + 1 : 0, to = Math.min(all.length, DJ.page * PER_PAGE + PER_PAGE);
    $j('#djTradeCount').textContent = all.length ? `Showing ${from} to ${to} of ${all.length} trade${all.length === 1 ? '' : 's'} (${PER_PAGE} per page)` : '0 trades';
    $j('#djPagination').innerHTML = pages > 1 ? `<button class="dj-clear" data-pg="-1" ${DJ.page === 0 ? 'disabled' : ''}>← Prev</button><span>Page ${DJ.page + 1} / ${pages}</span><button class="dj-clear" data-pg="1" ${DJ.page >= pages - 1 ? 'disabled' : ''}>Next →</button>` : '';
    const cd = $j('#djClearDate');
    cd.hidden = !DJ.date;
    $$j('[data-dj-status]').forEach(b => { const on = b.dataset.djStatus === DJ.tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    return all;
  }
  function patchItem(t) {
    const el = $j(`.dj-trade[data-id="${CSS.escape(t.id)}"]`);
    if (!el) return;
    const idx = el.style.getPropertyValue('--i') || 0;
    const tmp = document.createElement('div');
    tmp.innerHTML = itemHtml(t, idx, true);
    el.replaceWith(tmp.firstElementChild);
  }

  /* ---------- analytics + counters ---------- */
  function renderAnalytics() {
    let ts = allTr().filter(t => !isOpen(t));
    if (DJ.date) ts = ts.filter(t => dkey(new Date(exitTimeOf(t))) === DJ.date);
    const c = calc(ts);
    $j('#djPnlLabel').textContent = DJ.date ? 'Day P&L' : 'Total P&L';
    const el = $j('#djTotalPnl');
    tween(el, c.net, v => money1(v)); el.className = klass(c.net);
    tween($j('#djWinRate'), c.wr, v => Math.round(v) + '%');
    tween($j('#djWins'), c.w, v => Math.round(v)); tween($j('#djLosses'), c.l, v => Math.round(v));
    tween($j('#djProfitFactor'), c.pf === Infinity ? 0 : c.pf, v => (c.pf === Infinity ? '∞' : v.toFixed(2)));
    tween($j('#djDistributionValue'), c.wr, v => Math.round(v) + '%');
    $j('#djWinBar').style.width = c.wr.toFixed(1) + '%';
    $j('#djDistributionWins').textContent = c.w + (c.w === 1 ? ' win' : ' wins');
    $j('#djDistributionLosses').textContent = c.l + (c.l === 1 ? ' loss' : ' losses');
    tween($j('#djAverageWin'), c.aw, v => money1(v, true));
    tween($j('#djAverageLoss'), Math.abs(c.al), v => (c.al ? '-' : '') + money1(v));
    // counters
    const everything = allTr(), done = everything.filter(isComplete).length;
    tween($j('#djCompleted'), done, v => Math.round(v));
    tween($j('#djRemaining'), Math.max(0, everything.length - done), v => Math.round(v));
  }
  function renderCalendar() {
    if (DJ.calY === null) { const n = new Date(); DJ.calY = n.getFullYear(); DJ.calM = n.getMonth(); }
    $j('#djCalendarMonth').textContent = MON[DJ.calM].slice(0, 3).toUpperCase() + ' ' + DJ.calY;
    const pnl = {};
    allTr().filter(t => !isOpen(t)).forEach(t => { const k = dkey(new Date(exitTimeOf(t))); pnl[k] = (pnl[k] || 0) + t.pnl; });
    const first = new Date(DJ.calY, DJ.calM, 1), days = new Date(DJ.calY, DJ.calM + 1, 0).getDate(), today = dkey(new Date());
    let html = 'SMTWTFS'.split('').map(d => `<div class="dj-calendar-dow">${d}</div>`).join('');
    for (let i = 0; i < first.getDay(); i++) html += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const k = DJ.calY + '-' + pad(DJ.calM + 1) + '-' + pad(d), p = pnl[k];
      html += `<button data-day="${k}" class="${p > 0 ? 'profit' : p < 0 ? 'loss' : ''}${k === today ? ' today' : ''}${k === DJ.date ? ' selected' : ''}" style="animation:djCalPop .35s both;animation-delay:${(d + first.getDay()) * 9}ms" title="${p === undefined ? 'No trades' : money1(p, true)}">${d}</button>`;
    }
    $j('#djCalendar').innerHTML = html;
  }

  /* ---------- toolbar / next step ---------- */
  function refreshToolbar() {
    const t = selectedTrade(), pill = $j('#djReviewState'), nx = $j('#djNextStep');
    const list = filteredTrades(), idx = t ? list.findIndex(x => x.id === t.id) : -1;
    $j('#djPreviousTrade').disabled = !(idx > 0); $j('#djNextTrade').disabled = !(idx >= 0 && idx < list.length - 1);
    if (!t) { pill.textContent = 'In review'; pill.classList.remove('complete'); nx.textContent = 'Select a trade to begin'; nx.disabled = true; nx.dataset.step = ''; return; }
    const done = isComplete(t), n = nextStepOf(t);
    pill.textContent = done ? 'Completed' : 'In review'; pill.classList.toggle('complete', done);
    if (done) { nx.textContent = 'Review complete'; nx.disabled = true; nx.dataset.step = ''; }
    else if (n === -1) { nx.textContent = 'Ready: complete this review'; nx.disabled = false; nx.dataset.step = 'finish'; }
    else { nx.textContent = `Next (${n + 1}/${STEPS.length}): ${STEPS[n][1]}`; nx.disabled = false; nx.dataset.step = STEPS[n][0]; }
  }
  function refreshDetailMeta() {
    const t = selectedTrade(); if (!t) return;
    const card = $j('#djReviewContent .dj-card'); if (!card) return;
    const st = strategyOf(t), chip = $j('.dj-strategy-status', card);
    if (chip) { chip.textContent = st || 'No strategy'; chip.classList.toggle('has-strategy', !!st); }
    const sel = $j('[data-f=strategy]', card); if (sel) sel.classList.toggle('dj-required', !st);
    const prof = $j('.dj-summary-profit-val', card); if (prof) { prof.textContent = fmtFull(t.pnl); prof.className = 'dj-summary-profit-val ' + klass(t.pnl); }
    const meta = $j('.dj-summary-meta', card); if (meta) meta.textContent = metaLine(t);
    const fin2 = $j('#djFinish'); if (fin2) { const all = nextStepOf(t) === -1; fin2.classList.toggle('ready', all); fin2.title = all ? '' : 'Finish the remaining steps first'; }
    patchItem(t); refreshToolbar();
  }
  const fmtFull = v => (v < 0 ? '-' : '') + cur() + Math.abs(v).toFixed(2);
  const metaLine = t => `in ${time24(entryTimeOf(t))} · out ${isOpen(t) ? '—' : time24(exitTimeOf(t))} · ${cur()}${fin(entryOf(t)) ? entryOf(t) : '—'} → ${isOpen(t) ? 'open' : cur() + (fin(exitOf(t)) ? exitOf(t) : '—')} · ${qtyOf(t)} contracts`;

  /* ---------- detail ---------- */
  function fieldHtml(label, key, value, opts) {
    opts = opts || {};
    const ro = opts.ro ? ' readonly' : '';
    return `<label class="dj-field"><span>${label}</span><input data-f="${key}" type="${opts.type || 'text'}" ${opts.step ? 'step="' + opts.step + '"' : ''} value="${esc(value === undefined || value === null || (typeof value === 'number' && !isFinite(value)) ? '' : value)}" placeholder="${opts.ph || '--'}"${ro} autocomplete="off"></label>`;
  }
  function chartBox(t, kind) {
    const src = imgGet(t.id, kind), label = kind === 'entry' ? 'ENTRY' : 'EXIT';
    return `<div class="dj-chart-column"><span class="dj-section-label">${label} CHART</span><div class="dj-chart-box" data-chart="${kind}" tabindex="0">${src ? `<img src="${src}" alt="${label.toLowerCase()} chart" data-zoom="${kind}"><button class="dj-chart-remove" data-chart-remove="${kind}" aria-label="Remove ${label.toLowerCase()} chart">${ic('x', 12)}</button>` : `<span class="dj-chart-empty-icon">${ic('image', 20)}</span><small>NO ${label} CHART</small>`}<button class="dj-chart-add" data-chart-add="${kind}" aria-label="Add ${label.toLowerCase()} chart" title="Upload, paste (Ctrl+V) or drop an image">${ic('plus', 14)}</button></div></div>`;
  }
  const mistakeButtons = r => MISTAKES.concat((S.mistakeList || []).filter(x => !MISTAKES.includes(x))).map(m => `<button type="button" data-mistake="${esc(m)}" class="${(r.mistakes || []).includes(m) ? 'on' : ''}">${esc(m)}</button>`).join('') + `<button type="button" class="dj-button" id="djNewMistake" style="padding:5px 9px">${ic('plus', 10)}New</button>`;
  function detailHtml(t) {
    const r = rv(t.id), st = strategyOf(t), manual = isManual(t), ro = !manual;
    const tags = r.tags || [];
    const strategies = strategyList();
    const collapsed = DJ.collapsed ? ' collapsed' : '';
    return `<div class="dj-detail-enter">
    <section class="dj-card${collapsed}" id="djCard"><button class="dj-card-summary" id="djSummary" aria-expanded="${!DJ.collapsed}"><span class="dj-symbol-tile">${esc(String(t.symbol).slice(0, 4))}</span><div class="dj-summary-main"><div class="dj-summary-title"><span>${esc(t.symbol)}</span><span class="dj-side ${t.side === 'Long' ? 'long' : 'short'}">${esc(t.side.toUpperCase())}</span><span class="dj-strategy-status${st ? ' has-strategy' : ''}">${esc(st || 'No strategy')}</span></div><div class="dj-summary-meta">${esc(metaLine(t))}</div><div class="dj-summary-source">${assetClass(t.symbol)} · ${fin(t.fees) ? t.fees + ' fees' : 'no fees'} · ${manual ? 'journal P&amp;L' : 'broker P&amp;L'}${t.account ? ' · ' + esc(t.account) : ''}</div></div><div class="dj-summary-profit"><span class="dj-summary-profit-val ${klass(t.pnl)}">${fmtFull(t.pnl)}</span><span class="dj-collapse-arrow">${ic('up', 14)}</span></div></button>
      <div class="dj-details-collapse"><div>
        <div class="dj-fields">
          <div class="dj-r5">${fieldHtml('SYMBOL', 'symbol', t.symbol, { ro: true })}${fieldHtml('ENTRY PRICE', 'entry', entryOf(t), { type: 'number', step: 'any', ro })}${fieldHtml('EXIT PRICE', 'exit', isOpen(t) ? '' : exitOf(t), { type: 'number', step: 'any', ro: ro || isOpen(t), ph: isOpen(t) ? 'open' : '--' })}${fieldHtml('ENTRY TIME', 'entryTime', toLocalInput(entryTimeOf(t)), { type: 'datetime-local', ro })}${fieldHtml('EXIT TIME', 'exitTime', isOpen(t) ? '' : toLocalInput(exitTimeOf(t)), { type: 'datetime-local', ro: ro || isOpen(t) })}</div>
          <div class="dj-r4">${fieldHtml('QUANTITY', 'qty', qtyOf(t), { type: 'number', step: 'any', ro })}${fieldHtml('STOP LOSS', 'sl', slOf(t), { type: 'number', step: 'any' })}${fieldHtml('TAKE PROFIT', 'tp', tpOf(t), { type: 'number', step: 'any' })}<div class="dj-field"><span>MOOD${r.mood !== undefined ? ' · ' + MOOD_NAMES[r.mood] : ''}</span><div class="dj-mood-options" data-f="mood">${MOODS.map((m, i) => `<button type="button" data-mood="${i}" class="${r.mood === i ? 'selected' : ''}" aria-label="${MOOD_NAMES[i]}" title="${MOOD_NAMES[i]}">${m}</button>`).join('')}</div></div></div>
          <div class="dj-r2"><div class="dj-field"><span>STRATEGY <em>— required</em></span><div style="display:flex;gap:7px"><select data-f="strategy" class="${st ? '' : 'dj-required'}" style="flex:1"><option value="">Pick a strategy…</option>${strategies.map(s => `<option value="${esc(s)}"${s === st ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select><button type="button" class="dj-button" id="djNewStrategy" style="padding:7px 10px">${ic('plus', 11)}New</button></div></div>
          <div class="dj-field"><span>TAGS</span><div class="dj-tags-field" id="djTags">${tags.map((g, i) => `<span class="dj-tag" style="display:inline-flex;gap:5px;align-items:center">${esc(g)}<button type="button" data-rm-tag="${i}" aria-label="Remove tag ${esc(g)}" style="color:var(--faint);line-height:1">×</button></span>`).join('')}<button type="button" class="dj-button" id="djNewTag" style="padding:6px 9px">${ic('plus', 11)}New</button></div></div></div>
          <div class="dj-r2"><div class="dj-field"><span>PLAN</span><div class="dj-plan" id="djPlan"><button type="button" data-plan="followed" class="${r.plan === 'followed' ? 'selected' : ''}">✓ Followed plan</button><button type="button" data-plan="deviated" class="${r.plan === 'deviated' ? 'selected' : ''}">↯ Deviated</button></div></div><div class="dj-field"><span>MISTAKES</span><div class="dj-mistakes" id="djMistakes">${mistakeButtons(r)}</div></div></div>
        </div>
        <div class="dj-details-footer"><div class="dj-save-line"><span class="dj-saved-dot" id="djSavedDot"></span><span id="djSavedText">${r.updatedAt ? 'Saved ' + ago(r.updatedAt) : 'Changes save automatically'}</span></div><span>tap header to collapse</span><button class="dj-button" id="djSave">Save</button></div>
      </div></div></section>
    <section class="dj-card dj-rating-card"><h3>HOW WAS THIS TRADE?</h3><div class="dj-rating-options">${['poor', 'okay', 'great'].map(k => `<button type="button" class="${k}${r.rating === k ? ' selected' : ''}" data-rate="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></section>
    <div class="dj-charts">${chartBox(t, 'entry')}${chartBox(t, 'exit')}</div>
    <section class="dj-card dj-reflection-fields"><label class="dj-field"><span>WHAT DID YOU DO WELL?</span><textarea data-f="well" placeholder="Followed the plan, waited for confirmation…">${esc(r.well || '')}</textarea></label><label class="dj-field"><span>WHAT WOULD YOU IMPROVE?</span><textarea data-f="improve" placeholder="Entered early, moved my stop…">${esc(r.improve || '')}</textarea></label><label class="dj-field" style="grid-column:1/-1"><span>KEY LESSON</span><textarea data-f="lesson" style="min-height:60px" placeholder="One sentence you want to remember next time.">${esc(r.lesson || '')}</textarea></label></section>
    <div class="dj-finish-row"><p>Finish all eight steps, then complete the review to lock in what this trade taught you.</p><div id="djFinishBox">${finishHtml(t)}</div></div></div>`;
  }
  const ago = ms => { const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); return s < 10 ? 'just now' : s < 60 ? s + 's ago' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
  function finishHtml(t) {
    return isComplete(t)
      ? `<span class="dj-complete-note">${ic('check', 12)}REVIEW COMPLETE</span> <button class="dj-button" id="djReopen">Reopen</button>`
      : `<button class="dj-button complete" id="djFinish">${ic('check', 13)}Complete review</button>`;
  }
  function renderDetail() {
    const t = selectedTrade(), box = $j('#djReviewContent');
    DJ.detailId = t ? t.id : null;
    if (!t) {
      box.innerHTML = `<div class="dj-no-selection"><span class="dj-empty-icon">${ic('pointer', 24)}</span><h3>No Trade Selected</h3><p>Select a trade from the sidebar to view its details and begin your review.</p><small>TIP · USE ↑ ↓ TO MOVE BETWEEN TRADES</small></div>`;
    } else box.innerHTML = detailHtml(t);
    refreshToolbar();
  }

  /* ---------- selection ---------- */
  function selectTrade(id, opts) {
    opts = opts || {};
    DJ.selected = id;
    $$j('.dj-trade').forEach(b => b.classList.toggle('selected', b.dataset.id === id));
    renderDetail();
    if (opts.scroll) { const el = $j(`.dj-trade[data-id="${CSS.escape(id)}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function stepTrade(dir) {
    const list = filteredTrades(); if (!list.length) return;
    const i = list.findIndex(t => t.id === DJ.selected), n = i < 0 ? (dir > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, i + dir));
    if (list[n]) { const pg = Math.floor(n / PER_PAGE); if (pg !== DJ.page) { DJ.page = pg; renderList(); } selectTrade(list[n].id, { scroll: true }); }
  }

  /* ---------- main render ---------- */
  function renderAllJ(force) {
    renderList(); renderAnalytics(); renderCalendar();
    const t = selectedTrade();
    if (DJ.selected && !t) { DJ.selected = null; renderDetail(); }
    else if (force || DJ.detailId !== DJ.selected) renderDetail();
    else refreshToolbar();
  }
  window.renderDailyJournal = function () { renderAllJ(false); };
  window.djOverlay = function (t) { const r = reviews()[t.id]; return r && r.strategy && t.strategy !== r.strategy ? Object.assign({}, t, { strategy: r.strategy }) : t; };
  window.journalOpenDay = function (k) {
    go('journal');
    const d = new Date(k + 'T00:00');
    DJ.calY = d.getFullYear(); DJ.calM = d.getMonth(); DJ.date = k; DJ.page = 0; DJ.tab = 'closed';
    renderAllJ(true);
    toggleNotes(true, k);
  };

  /* ---------- daily notes drawer ---------- */
  function toggleNotes(force, day) {
    const dr = $j('#djNotesDrawer'), btn = $j('#djOpenNotes');
    const open = force === undefined ? dr.hidden : force;
    dr.hidden = !open; btn.setAttribute('aria-expanded', open);
    if (open) {
      const di = $j('#jDate'); di.value = day || DJ.date || dkey(new Date());
      $j('#jText').value = (S.journal && S.journal[di.value]) || '';
      $j('#jTitle').textContent = di.value === dkey(new Date()) ? "Today's notes" : 'Notes for ' + di.value;
      dr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => $j('#jText').focus({ preventScroll: true }), 250);
    }
  }
  $j('#djOpenNotes').onclick = () => toggleNotes();
  $j('#jText').addEventListener('input', () => { const s = $j('#djDaySaved'); if (s) s.textContent = 'Saved on this PC'; });

  /* ---------- CSV import ---------- */
  function parseCsv(text) {
    const rows = []; let row = [], cur2 = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur2 += '"'; i++; } else q = false; } else cur2 += c; }
      else if (c === '"') q = true;
      else if (c === ',' || c === ';' || c === '\t') { row.push(cur2); cur2 = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur2); cur2 = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; }
      else cur2 += c;
    }
    row.push(cur2); if (row.some(x => x.trim() !== '')) rows.push(row);
    return rows;
  }
  function importCsv(text) {
    const rows = parseCsv(text.replace(/^﻿/, ''));
    if (rows.length < 2) { toast('That CSV has no trade rows'); return; }
    const head = rows[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const col = (...names) => head.findIndex(h => names.includes(h));
    const ix = { date: col('date', 'time', 'closetime', 'exittime', 'datetime', 'opentime', 'entrytime'), symbol: col('symbol', 'instrument', 'ticker', 'pair'), side: col('side', 'type', 'direction', 'action'), qty: col('qty', 'quantity', 'volume', 'size', 'lots'), entry: col('entry', 'entryprice', 'openprice', 'priceopen'), exit: col('exit', 'exitprice', 'closeprice', 'priceclose'), fees: col('fees', 'fee', 'commission'), pnl: col('pnl', 'profit', 'netpnl', 'netprofit', 'pl'), strategy: col('strategy', 'setup'), account: col('account'), notes: col('notes', 'comment', 'note') };
    if (ix.symbol < 0 || ix.date < 0) { toast('CSV needs at least “symbol” and “date” columns'); return; }
    const added = []; let skipped = 0;
    rows.slice(1).forEach((r, n) => {
      const g = i => (i >= 0 && r[i] !== undefined ? r[i].trim() : '');
      const d = new Date(g(ix.date)); const symbol = g(ix.symbol).toUpperCase();
      if (!symbol || isNaN(d)) { skipped++; return; }
      const sideRaw = g(ix.side).toLowerCase(), side = /sell|short/.test(sideRaw) ? 'Short' : 'Long';
      const entry = parseFloat(g(ix.entry)), exit = parseFloat(g(ix.exit)), qty = parseFloat(g(ix.qty)) || 1, fees = Math.abs(parseFloat(g(ix.fees))) || 0;
      let pnl = parseFloat(g(ix.pnl));
      if (!isFinite(pnl)) { if (isFinite(entry) && isFinite(exit)) pnl = (exit - entry) * qty * (side === 'Long' ? 1 : -1) - fees; else { skipped++; return; } }
      added.push({ id: 't' + Date.now() + '-' + n, symbol, side, date: dkey(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()), qty, entry: isFinite(entry) ? entry : 0, exit: isFinite(exit) ? exit : 0, fees, strategy: g(ix.strategy), account: g(ix.account) || 'Main Account', notes: g(ix.notes), pnl: +pnl.toFixed(2) });
    });
    if (!added.length) { toast('No valid trades found in that CSV'); return; }
    const before = S.live.slice();
    S.live = S.live.concat(added); S.showManual = true;
    if (!save()) { S.live = before; return; }
    renderAll(); renderAllJ(false);
    toast(`Imported ${added.length} trade${added.length === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}`);
  }
  window.importTradesCsv = importCsv;
  const csvInput = document.createElement('input'); csvInput.type = 'file'; csvInput.accept = '.csv,text/csv'; csvInput.hidden = true; document.body.appendChild(csvInput);
  csvInput.onchange = () => { const f = csvInput.files[0]; csvInput.value = ''; if (!f) return; f.text().then(importCsv).catch(() => toast('Could not read that file')); };
  $j('#djImport').onclick = () => csvInput.click();
  $j('#djNewTrade').onclick = () => openAdd();

  /* ---------- screenshots ---------- */
  const imgInput = document.createElement('input'); imgInput.type = 'file'; imgInput.accept = 'image/*'; imgInput.hidden = true; document.body.appendChild(imgInput);
  let imgKind = null;
  async function attachImage(file, kind) {
    const t = selectedTrade(); if (!t || !file || !/^image\//.test(file.type)) return;
    try { const data = await shrink(file); if (imgSet(t.id, kind, data)) { setRev(t.id, {}); const box = $j(`.dj-chart-box[data-chart="${kind}"]`); if (box) box.closest('.dj-chart-column').outerHTML = chartBox(t, kind); toast((kind === 'entry' ? 'Entry' : 'Exit') + ' chart added'); } }
    catch (e) { toast('Could not read that image'); }
  }
  imgInput.onchange = () => { const f = imgInput.files[0]; imgInput.value = ''; if (f && imgKind) attachImage(f, imgKind); };
  function showImage(src) {
    let ov = $j('#djImageViewer');
    if (!ov) { ov = document.createElement('div'); ov.id = 'djImageViewer'; ov.className = 'overlay'; document.body.appendChild(ov); ov.addEventListener('mousedown', e => { if (e.target === ov || e.target.closest('[data-x]')) ov.classList.remove('open'); }); }
    ov.innerHTML = `<div class="dj-lightbox"><img src="${src}" alt="Chart screenshot"><button class="dj-icon-button" data-x aria-label="Close">${ic('x', 16)}</button></div>`;
    ov.classList.add('open');
  }

  /* ---------- confetti on completion ---------- */
  function burst() {
    const host = $j('.dj-review-toolbar-label'); if (!host || document.documentElement.classList.contains('reduce-motion')) return;
    const colors = ['#18c8ae', '#4c8fff', '#f5c451', '#ff7a9a', '#9a7bff'];
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i'); p.className = 'dj-particle';
      const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 90;
      p.style.setProperty('--particle-color', colors[i % colors.length]); p.style.setProperty('--dx', Math.cos(a) * r + 'px'); p.style.setProperty('--dy', Math.sin(a) * r - 20 + 'px');
      p.style.left = '20px'; p.style.right = 'auto'; p.style.top = '8px'; p.style.animationDuration = 0.6 + Math.random() * 0.5 + 's';
      host.appendChild(p); setTimeout(() => p.remove(), 1200);
    }
  }
  function focusStep(key) {
    const root = $j('#djReviewContent'), map = { entry: '[data-f=entry]', exit: '[data-f=exit]', times: '[data-f=entryTime]', qty: '[data-f=qty]', strategy: '[data-f=strategy]', rating: '.dj-rating-card', reflection: '[data-f=well]', symbol: '[data-f=symbol]' };
    const el = $j(map[key] || '', root); if (!el) return;
    if (DJ.collapsed && el.closest('.dj-details-collapse')) { DJ.collapsed = false; $j('#djCard').classList.remove('collapsed'); }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.remove('dj-shake'); void el.offsetWidth; el.classList.add('dj-shake');
    if (el.focus && el.tagName !== 'SECTION') setTimeout(() => el.focus({ preventScroll: true }), 300);
  }
  function completeReview() {
    const t = selectedTrade(); if (!t) return;
    const n = nextStepOf(t);
    if (n !== -1) { toast('Next: ' + STEPS[n][1].toLowerCase()); focusStep(STEPS[n][0]); return; }
    setRev(t.id, { completed: true, completedAt: Date.now() }); flushSave();
    $j('#djFinishBox').innerHTML = finishHtml(t); refreshDetailMeta(); renderAnalytics(); burst(); toast('Review complete — nice work');
    if (DJ.review !== 'done') setTimeout(() => { const list = filteredTrades(), i = list.findIndex(x => x.id === t.id); const nxt = list.slice(i + 1).find(x => !isComplete(x)) || list.find(x => !isComplete(x)); if (nxt && DJ.selected === t.id) { renderList(); selectTrade(nxt.id, { scroll: true }); } }, 1100);
  }

  /* ---------- events ---------- */
  const root = page();
  $j('#djTradeList').addEventListener('click', e => { const b = e.target.closest('.dj-trade'); if (b) selectTrade(b.dataset.id); });
  $j('#djPagination').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b && !b.disabled) { DJ.page += +b.dataset.pg; renderList(); } });
  $j('#djSearch').addEventListener('input', e => { DJ.q = e.target.value; DJ.page = 0; renderList(); refreshToolbar(); });
  $j('#djFilters').onclick = () => { const p = $j('#djFilterPanel'), open = !p.classList.contains('open'); p.classList.toggle('open', open); $j('#djFilters').setAttribute('aria-expanded', open); };
  $j('#djSide').onchange = e => { DJ.side = e.target.value; DJ.page = 0; renderList(); refreshToolbar(); };
  $j('#djReviewFilter').onchange = e => { DJ.review = e.target.value; DJ.page = 0; renderList(); refreshToolbar(); };
  $j('#djResetFilters').onclick = () => { DJ.side = 'all'; DJ.review = 'all'; DJ.q = ''; DJ.date = null; $j('#djSide').value = 'all'; $j('#djReviewFilter').value = 'all'; $j('#djSearch').value = ''; DJ.page = 0; renderAllJ(false); };
  $$j('[data-dj-status]').forEach(b => b.onclick = () => { DJ.tab = b.dataset.djStatus; DJ.page = 0; renderList(); refreshToolbar(); });
  $j('#djClearDate').onclick = () => { DJ.date = null; DJ.page = 0; renderAllJ(false); };
  $j('#djCalPrev').onclick = () => { DJ.calM--; if (DJ.calM < 0) { DJ.calM = 11; DJ.calY--; } renderCalendar(); };
  $j('#djCalNext').onclick = () => { DJ.calM++; if (DJ.calM > 11) { DJ.calM = 0; DJ.calY++; } renderCalendar(); };
  $j('#djCalendar').addEventListener('click', e => { const b = e.target.closest('[data-day]'); if (!b) return; DJ.date = DJ.date === b.dataset.day ? null : b.dataset.day; DJ.page = 0; DJ.tab = 'closed'; renderAllJ(false); });
  $j('#djPreviousTrade').onclick = () => stepTrade(-1);
  $j('#djNextTrade').onclick = () => stepTrade(1);
  $j('#djToggleAnalytics').onclick = () => { const w = $j('.dj-workspace'), hide = !w.classList.contains('analytics-hidden'); w.classList.toggle('analytics-hidden', hide); $j('#djToggleAnalytics').setAttribute('aria-expanded', !hide); };
  $j('#djNextStep').onclick = e => { const k = e.currentTarget.dataset.step; if (k === 'finish') completeReview(); else if (k) focusStep(k); };

  const content = $j('#djReviewContent');
  content.addEventListener('click', async e => {
    const t = selectedTrade(); if (!t) return;
    const q = s => e.target.closest(s);
    if (q('#djSummary')) { DJ.collapsed = !DJ.collapsed; $j('#djCard').classList.toggle('collapsed', DJ.collapsed); q('#djSummary').setAttribute('aria-expanded', !DJ.collapsed); return; }
    let b;
    if ((b = q('[data-mood]'))) { const i = +b.dataset.mood, cur2 = rv(t.id).mood; setRev(t.id, { mood: cur2 === i ? undefined : i }); $$j('[data-mood]').forEach(x => x.classList.toggle('selected', +x.dataset.mood === rv(t.id).mood)); const lab = $j('[data-f=mood]').previousElementSibling; lab.textContent = 'MOOD' + (rv(t.id).mood !== undefined ? ' · ' + MOOD_NAMES[rv(t.id).mood] : ''); refreshDetailMeta(); return; }
    if ((b = q('[data-rate]'))) { setRev(t.id, { rating: rv(t.id).rating === b.dataset.rate ? undefined : b.dataset.rate }); $$j('[data-rate]').forEach(x => x.classList.remove('selected')); if (rv(t.id).rating) b.classList.add('selected'); refreshDetailMeta(); return; }
    if ((b = q('[data-plan]'))) { const v = b.dataset.plan; setRev(t.id, { plan: rv(t.id).plan === v ? undefined : v }); $$j('[data-plan]').forEach(x => x.classList.toggle('selected', x.dataset.plan === rv(t.id).plan)); refreshDetailMeta(); return; }
    if ((b = q('[data-mistake]'))) { const m = b.dataset.mistake, cur2 = (rv(t.id).mistakes || []).slice(), i = cur2.indexOf(m); if (i >= 0) cur2.splice(i, 1); else cur2.push(m); setRev(t.id, { mistakes: cur2 }); b.classList.toggle('on', cur2.includes(m)); refreshDetailMeta(); return; }
    if (q('#djNewMistake')) { const v = (((await askValue('New mistake type', 'Name (e.g. Chased entry)', '')) || '').trim()).slice(0, 28); if (!v) return; S.mistakeList = Array.from(new Set((S.mistakeList || []).concat(v))); const cur2 = (rv(t.id).mistakes || []).slice(); if (!cur2.includes(v)) cur2.push(v); setRev(t.id, { mistakes: cur2 }); $j('#djMistakes').innerHTML = mistakeButtons(rv(t.id)); refreshDetailMeta(); return; }
    if ((b = q('[data-chart-add]'))) { imgKind = b.dataset.chartAdd; imgInput.click(); return; }
    if ((b = q('[data-chart-remove]'))) { const k = b.dataset.chartRemove; imgSet(t.id, k, ''); const col = b.closest('.dj-chart-column'); col.outerHTML = chartBox(t, k); toast('Chart removed'); return; }
    if ((b = q('[data-zoom]'))) { showImage(b.getAttribute('src')); return; }
    if (q('#djNewStrategy')) { const v = (await askValue('New strategy', 'Strategy name', '')) || ''; const name = v.trim().slice(0, 40); if (!name) return; S.strategies = Array.from(new Set((S.strategies || []).concat(name))); setRev(t.id, { strategy: name }); syncManualStrategy(t, name); const sel = $j('[data-f=strategy]'); sel.innerHTML = '<option value="">Pick a strategy…</option>' + strategyList().map(s => `<option value="${esc(s)}"${s === name ? ' selected' : ''}>${esc(s)}</option>`).join(''); refreshDetailMeta(); renderAnalyticsDash(); return; }
    if (q('#djNewTag')) { const v = (await askValue('New tag', 'Tag name', '')) || ''; const name = v.trim().slice(0, 24); if (!name) return; const tags = (rv(t.id).tags || []).slice(); if (!tags.includes(name)) tags.push(name); setRev(t.id, { tags }); redrawTags(t); refreshDetailMeta(); return; }
    if ((b = q('[data-rm-tag]'))) { const tags = (rv(t.id).tags || []).slice(); tags.splice(+b.dataset.rmTag, 1); setRev(t.id, { tags }); redrawTags(t); refreshDetailMeta(); return; }
    if (q('#djSave')) { flushSave(); toast('Review saved'); return; }
    if (q('#djFinish')) { completeReview(); return; }
    if (q('#djReopen')) { setRev(t.id, { completed: false }); flushSave(); $j('#djFinishBox').innerHTML = finishHtml(t); refreshDetailMeta(); renderAnalytics(); return; }
  });
  function redrawTags(t) {
    const tags = rv(t.id).tags || [];
    $j('#djTags').innerHTML = tags.map((g, i) => `<span class="dj-tag" style="display:inline-flex;gap:5px;align-items:center">${esc(g)}<button type="button" data-rm-tag="${i}" aria-label="Remove tag ${esc(g)}" style="color:var(--faint);line-height:1">×</button></span>`).join('') + `<button type="button" class="dj-button" id="djNewTag" style="padding:6px 9px">${ic('plus', 11)}New</button>`;
  }
  function syncManualStrategy(t, name) {
    const m = S.live.find(x => x.id === t.id);
    if (m) m.strategy = name;
  }
  const renderAnalyticsDash = () => { try { if (typeof renderAll === 'function') { /* dashboard drivers read the overlay */ } } catch (e) { /* ignore */ } };
  content.addEventListener('input', e => {
    const t = selectedTrade(), f = e.target.dataset && e.target.dataset.f; if (!t || !f) return;
    const v = e.target.value;
    if (f === 'well' || f === 'improve' || f === 'lesson') { setRev(t.id, { [f]: v }); refreshDetailMeta(); return; }
    if (f === 'sl' || f === 'tp') { setRev(t.id, { [f]: v === '' ? null : num(v) }); return; }
    if (['entry', 'exit', 'qty', 'entryTime', 'exitTime'].includes(f) && isManual(t)) {
      const patch = {};
      if (f === 'entryTime' || f === 'exitTime') patch[f] = v; else patch[f] = v === '' ? undefined : num(v);
      setRev(t.id, patch);
      const m = S.live.find(x => x.id === t.id);
      if (m) {
        const r = rv(t.id), e1 = fin(r.entry) ? r.entry : m.entry, x1 = fin(r.exit) ? r.exit : m.exit, q1 = fin(r.qty) ? r.qty : m.qty;
        if (e1 && x1 && q1) m.pnl = +(((x1 - e1) * q1 * (m.side === 'Long' ? 1 : -1)) - (m.fees || 0)).toFixed(2);
        m.entry = e1; m.exit = x1; m.qty = q1;
        if (r.exitTime) m.date = toLocalInput(r.exitTime);
      }
      refreshDetailMeta();
    }
  });
  content.addEventListener('change', e => {
    const t = selectedTrade(), f = e.target.dataset && e.target.dataset.f; if (!t || !f) return;
    if (f === 'strategy') { setRev(t.id, { strategy: e.target.value }); syncManualStrategy(t, e.target.value); refreshDetailMeta(); }
    flushSave();
    if (typeof renderAll === 'function' && S.page !== 'journal') renderAll();
  });
  content.addEventListener('focusout', e => { if (e.target.dataset && e.target.dataset.f) flushSave(); });
  content.addEventListener('animationend', e => { if (e.target.classList && e.target.classList.contains('dj-shake')) e.target.classList.remove('dj-shake'); });

  /* drag & drop / paste screenshots */
  content.addEventListener('dragover', e => { const b = e.target.closest('.dj-chart-box'); if (b) { e.preventDefault(); b.classList.add('drop'); } });
  content.addEventListener('dragleave', e => { const b = e.target.closest('.dj-chart-box'); if (b) b.classList.remove('drop'); });
  content.addEventListener('drop', e => { const b = e.target.closest('.dj-chart-box'); if (!b) return; e.preventDefault(); b.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (f) attachImage(f, b.dataset.chart); });
  content.addEventListener('mouseover', e => { const b = e.target.closest('.dj-chart-box'); DJ.hoverKind = b ? b.dataset.chart : null; });
  document.addEventListener('paste', e => {
    if (S.page !== 'journal' || !DJ.selected) return;
    const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('.dj-chart-box');
    const kind = (focused && focused.dataset.chart) || DJ.hoverKind; if (!kind) return;
    const item = Array.from(e.clipboardData.items || []).find(i => i.type.startsWith('image/')); if (!item) return;
    e.preventDefault(); attachImage(item.getAsFile(), kind);
  });

  /* keyboard: ↑ ↓ between trades */
  document.addEventListener('keydown', e => {
    if (S.page !== 'journal' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); stepTrade(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); stepTrade(-1); }
    else if (e.key === 'Escape') { const v = $j('#djImageViewer'); if (v) v.classList.remove('open'); }
  });

  window.addEventListener('beforeunload', () => { if (DJ.saveT) flushSave(); });
  if (S.page === 'journal') renderAllJ(true);
})();
