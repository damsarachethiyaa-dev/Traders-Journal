/* Dashboard hero: time-aware greeting, market sessions, agenda (private iCal link) and daily checklist. */
(function () {
  'use strict';
  const hero = document.getElementById('hero');
  if (!hero) return;
  const $h = (s, r) => (r || hero).querySelector(s);
  const pad2 = n => String(n).padStart(2, '0');
  const ICONS = {
    morning: '<svg viewBox="0 0 48 48" class="hi hi-morning" aria-hidden="true"><g class="rays"><path d="M24 6v6M10 13l4 4M38 13l-4 4M4 30h6M38 30h6"/></g><path class="sun" d="M14 32a10 10 0 0 1 20 0z"/><path class="hz" d="M6 36h36M12 41h24"/></svg>',
    afternoon: '<svg viewBox="0 0 48 48" class="hi hi-afternoon" aria-hidden="true"><g class="rays"><path d="M24 4v7M24 37v7M4 24h7M37 24h7M9.9 9.9l5 5M33.1 33.1l5 5M9.9 38.1l5-5M33.1 14.9l5-5"/></g><circle class="sun" cx="24" cy="24" r="8"/></svg>',
    evening: '<svg viewBox="0 0 48 48" class="hi hi-evening" aria-hidden="true"><path class="sun" d="M12 32a12 12 0 0 1 24 0z"/><path class="hz" d="M5 36h38M11 41h26"/><path class="cloud" d="M30 14h10M6 20h12"/></svg>',
    night: '<svg viewBox="0 0 48 48" class="hi hi-night" aria-hidden="true"><path class="moon" d="M34 30A15 15 0 0 1 18 10a15 15 0 1 0 16 20z"/><path class="star s1" d="M36 8v6M33 11h6"/><path class="star s2" d="M40 22v4M38 24h4"/><path class="star s3" d="M28 6v3M26.5 7.5h3"/></svg>'
  };
  const LINE_ICON = {
    pin: '<path d="M12 21s-7-5.4-7-11a7 7 0 0 1 14 0c0 5.6-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    plus: '<path d="M5 12h14M12 5v14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>'
  };
  const li = (n, s) => `<svg width="${s || 13}" height="${s || 13}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE_ICON[n]}</svg>`;
  const el = s => document.getElementById(s);
  const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- period + messages ---------- */
  function periodOf(d) { const h = d.getHours(); return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night'; }
  const GREET = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good night' };
  const LINES = {
    morning: ['Fresh candles, fresh mindset. Plan the trade, then trade the plan.', 'Set your max daily loss before the first entry.', 'Check the news calendar before the session opens.'],
    afternoon: ['Stay patient — the best setups come to those who wait.', 'Midday check-in: are you still following your plan?', 'A short break keeps your eyes clear for the next entry.'],
    evening: ['The day is winding down — a good time to review your trades.', 'Journal your trades while the lessons are fresh.', 'Win or lose, the process is what you improve.'],
    night: ['Rest well — discipline starts with good sleep.', 'Close the charts, recharge, and come back sharper.', 'Tomorrow’s edge is built tonight: review, then rest.']
  };
  const baseTrades = () => sourceTrades().filter(t => !t.open);
  function dayStats() {
    const now = new Date(), key = dkey(now), ts = baseTrades();
    const byDay = {}; ts.forEach(t => { const k = String(t.date).slice(0, 10); (byDay[k] = byDay[k] || []).push(t); });
    const sum = a => a.reduce((x, t) => x + t.pnl, 0);
    const today = byDay[key] || [];
    const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const monKey = dkey(mon), week = ts.filter(t => String(t.date).slice(0, 10) >= monKey);
    const month = ts.filter(t => String(t.date).slice(0, 7) === key.slice(0, 7));
    let streak = 0; const days = Object.keys(byDay).sort().reverse();
    for (const k of days) { if (k > key) continue; if (sum(byDay[k]) > 0) streak++; else if (k === key && !byDay[k].length) continue; else break; }
    return { net: sum(today), n: today.length, wins: today.filter(t => t.pnl > 0).length, weekNet: sum(week), weekN: week.length, monthNet: sum(month), streak };
  }

  /* ---------- sessions ---------- */
  const SESSIONS = [
    { id: 'SYD', city: 'Sydney', tz: 'Australia/Sydney', o: 7, c: 16, col: '#f472b6' },
    { id: 'TYO', city: 'Tokyo', tz: 'Asia/Tokyo', o: 9, c: 18, col: '#fbbf24' },
    { id: 'LDN', city: 'London', tz: 'Europe/London', o: 8, c: 17, col: '#60a5fa' },
    { id: 'NYC', city: 'New York', tz: 'America/New_York', o: 8, c: 17, col: '#34d399' }
  ];
  const fmts = {};
  function parts(tz, t) {
    const f = fmts[tz] || (fmts[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', weekday: 'short', hour: 'numeric', minute: 'numeric' }));
    const o = {}; for (const x of f.formatToParts(new Date(t))) o[x.type] = x.value;
    return { wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), min: (+o.hour) * 60 + (+o.minute) };
  }
  const isOpen = (s, t) => { const p = parts(s.tz, t); return p.wd >= 1 && p.wd <= 5 && p.min >= s.o * 60 && p.min < s.c * 60; };
  function nextChange(s, t0) {
    const cur = isOpen(s, t0), STEP = 5 * 60000;
    for (let t = t0 + STEP; t < t0 + 8 * 86400000; t += STEP) {
      if (isOpen(s, t) !== cur) { let lo = t - STEP, hi = t; while (hi - lo > 60000) { const mid = Math.floor((lo + hi) / 2); if (isOpen(s, mid) === cur) lo = mid; else hi = mid; } return hi; }
    }
    return null;
  }
  const human = ms => { const m = Math.max(1, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60; return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm}m`; };
  const sessCache = { at: 0, data: null };
  function sessionData(now) {
    const t = now.getTime(); if (sessCache.data && t - sessCache.at < 20000) return sessCache.data;
    const data = SESSIONS.map(s => { const open = isOpen(s, t), nc = nextChange(s, t); return { s, open, nc }; });
    sessCache.at = t; sessCache.data = data; return data;
  }
  function renderSessions(now) {
    const t = now.getTime(), data = sessionData(now);
    $h('#heroSessions').innerHTML = data.map(({ s, open, nc }) => {
      const lt = new Intl.DateTimeFormat('en-GB', { timeZone: s.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
      const msg = nc ? (open ? 'Closes in ' : 'Opens in ') + human(nc - t) : (open ? 'Open' : 'Closed');
      return `<div class="ses ${open ? 'open' : ''}" style="--c:${s.col}" title="${s.city} · ${s.o}:00–${s.c}:00 local"><span class="ses-top"><i class="dot"></i><b>${s.id}</b><span class="ses-t">${lt}</span></span><small>${open ? '<em>Open</em> · ' : ''}${msg}</small></div>`;
    }).join('');
    const o = id => data.find(x => x.s.id === id);
    const pairs = [['LDN', 'NYC', 'London × New York'], ['TYO', 'LDN', 'Tokyo × London'], ['SYD', 'TYO', 'Sydney × Tokyo']];
    const hit = pairs.find(([a, b]) => o(a).open && o(b).open);
    const ov = $h('#heroOverlap');
    if (hit) {
      const end = Math.min(o(hit[0]).nc || Infinity, o(hit[1]).nc || Infinity);
      ov.innerHTML = `<span class="pulse"></span><b>${hit[2]} overlap</b> — peak liquidity${isFinite(end) ? ` · ends in ${human(end - t)}` : ''}`; ov.className = 'hero-overlap on';
    } else {
      const anyOpen = data.some(x => x.open), wd = now.getDay();
      if (!anyOpen && (wd === 6 || wd === 0)) { ov.innerHTML = 'Weekend — markets are closed. A good time to review your week.'; }
      else if (!anyOpen) { ov.innerHTML = 'All major sessions are closed right now.'; }
      else { const op = data.filter(x => x.open).map(x => x.s.city).join(' · '); ov.innerHTML = `Live now: <b>${op}</b>`; }
      ov.className = 'hero-overlap';
    }
  }

  /* ---------- sparkles (black & white, shining) ---------- */
  function buildSparks(p) {
    let box = hero.querySelector('.hero-sparks');
    if (!box) { box = document.createElement('div'); box.className = 'hero-sparks'; box.setAttribute('aria-hidden', 'true'); hero.insertBefore(box, hero.firstChild.nextSibling); }
    const N = { morning: 24, afternoon: 28, evening: 22, night: 38 }[p] || 24, rnd = (a, b) => a + Math.random() * (b - a);
    let html = '';
    for (let i = 0; i < N; i++) { const big = i % 7 === 0; html += `<i class="spk${big ? ' big' : ''}" style="--x:${rnd(2, 98).toFixed(1)}%;--y:${rnd(4, 96).toFixed(1)}%;--s:${big ? rnd(12, 19).toFixed(0) : rnd(4, 9).toFixed(0)}px;--d:${rnd(0, 6).toFixed(2)}s;--t:${rnd(2.6, 5.8).toFixed(2)}s;--o:${rnd(.5, 1).toFixed(2)}"></i>`; }
    if (p === 'night') html += '<i class="shoot" style="--y:16%;--d:2s"></i><i class="shoot" style="--y:44%;--d:7.5s"></i>';
    box.innerHTML = html;
    const icon = el('heroIcon'); icon.querySelectorAll('.isp').forEach(n => n.remove());
    icon.insertAdjacentHTML('beforeend', '<i class="isp a"></i><i class="isp b"></i><i class="isp c"></i>');
  }

  /* ---------- greeting + clock + stats ---------- */
  let lastPeriod = '', msgSeed = 0;
  function renderGreeting(now) {
    const p = periodOf(now);
    if (p !== lastPeriod) {
      lastPeriod = p; hero.dataset.period = p;
      el('heroIcon').innerHTML = ICONS[p];
      buildSparks(p);
      el('greet').textContent = GREET[p];
      const dayN = Math.floor(now / 86400000); msgSeed = dayN % LINES[p].length;
      hero.classList.remove('swap'); void hero.offsetWidth; hero.classList.add('swap');
    }
    el('dateLine').textContent = `${DAYN[now.getDay()]}, ${MON[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    const tz = (new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(now).find(x => x.type === 'timeZoneName') || {}).value || '';
    el('heroClock').innerHTML = `<span class="hc-t">${pad2(now.getHours())}<i>:</i>${pad2(now.getMinutes())}<small>:${pad2(now.getSeconds())}</small></span><span class="hc-z">${escH(tz)}</span>`;
  }
  function renderTagline(now, st) {
    const p = periodOf(now), wd = now.getDay();
    let text = LINES[p][msgSeed];
    if (wd === 6 || wd === 0) text = 'Markets are closed this weekend — a perfect time to review your week and plan the next.';
    else if (st.n) { const sign = st.net >= 0 ? 'up' : 'down'; text = `You’re ${sign} ${money(Math.abs(st.net))} across ${st.n} trade${st.n > 1 ? 's' : ''} today. ${st.net >= 0 ? 'Protect it — don’t give it back.' : 'Stay calm; one trade doesn’t define the day.'}`; }
    el('heroTagText').textContent = text;
  }
  const setTween = (id, v, f) => { const e = el(id); if (e) tween(e, v, f); };
  function renderStatsExtra(st) {
    setTween('hWeek', st.weekNet, v => money(v, { sign: v > 0.004 })); el('hWeek').className = cls(st.weekNet) || 'green';
    setTween('hStreak', st.streak, v => Math.round(v));
    const goal = +((S.preferences || {}).monthlyGoal) || 0, lab = el('hMonthLbl'), box = el('hMonth'), bar = el('hGoalBar');
    if (goal > 0) { lab.textContent = 'MONTH GOAL'; const pr = Math.max(0, Math.min(100, st.monthNet / goal * 100)); tween(box, pr, v => Math.round(v) + '%'); box.className = ''; bar.hidden = false; bar.firstElementChild.style.width = pr + '%'; }
    else { lab.textContent = 'MONTH P&L'; tween(box, st.monthNet, v => money(v, { sign: v > 0.004 })); box.className = cls(st.monthNet) || 'green'; bar.hidden = true; }
    const f = el('hStreakIcon'); if (f) f.classList.toggle('lit', st.streak > 0);
    const bd = document.querySelector('#pFire .badge'); if (bd) { bd.textContent = st.streak; bd.style.display = st.streak ? '' : 'none'; }
  }

  /* ---------- checklist ---------- */
  const PRE = ['Review the economic calendar', 'Define today’s plan and key levels', 'Set max daily loss and risk per trade', 'Check your mindset — calm and focused', 'Review yesterday’s trades'];
  const POST = ['Log all of today’s trades', 'Tag strategies and rate each trade', 'Write one lesson learned', 'Check tomorrow’s calendar'];
  function ckState() {
    const key = dkey(new Date());
    if (!S.heroCheck || S.heroCheck.date !== key) S.heroCheck = { date: key, done: {} };
    if (!S.heroCustom) S.heroCustom = { pre: [], post: [] };
    return S.heroCheck;
  }
  const modeOf = now => (periodOf(now) === 'evening' || periodOf(now) === 'night') ? 'post' : 'pre';
  function renderChecklist(now) {
    const st = ckState(), mode = modeOf(now), base = mode === 'pre' ? PRE : POST, custom = (S.heroCustom[mode] || []);
    const items = base.map((t, i) => ({ id: mode + ':' + i, t, custom: false })).concat(custom.map((t, i) => ({ id: mode + ':c' + i, t, custom: true, ci: i })));
    const done = items.filter(i => st.done[i.id]).length, pct = items.length ? done / items.length : 0, C = 2 * Math.PI * 14;
    const box = el('heroCheck');
    box.querySelector('.ck-title').textContent = mode === 'pre' ? 'Pre-trade checklist' : 'End-of-day review';
    box.querySelector('.ck-ring').innerHTML = `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" opacity=".15" stroke-width="3.5"/><circle class="pr" cx="18" cy="18" r="14" fill="none" stroke="var(--hero-a)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 18 18)"/></svg><b>${done}/${items.length}</b>`;
    box.querySelector('.ck-list').innerHTML = items.map(i => `<label class="ck-item ${st.done[i.id] ? 'on' : ''}"><input type="checkbox" data-ck="${i.id}" ${st.done[i.id] ? 'checked' : ''}><span class="ck-box">${li('check', 11)}</span><span class="ck-t">${escH(i.t)}</span>${i.custom ? `<button class="ck-x" data-ck-rm="${mode}:${i.ci}" aria-label="Remove item" title="Remove">${li('x', 11)}</button>` : ''}</label>`).join('');
    box.classList.toggle('all-done', pct === 1 && items.length > 0);
    box.querySelector('.ck-msg').textContent = pct === 1 ? (mode === 'pre' ? 'Ready to trade — good luck today.' : 'Review done. Rest well.') : '';
  }
  el('heroCheck').addEventListener('change', e => {
    const id = e.target.dataset && e.target.dataset.ck; if (!id) return;
    const st = ckState(); if (e.target.checked) st.done[id] = true; else delete st.done[id];
    save(); renderChecklist(new Date());
  });
  el('heroCheck').addEventListener('click', async e => {
    const rm = e.target.closest('[data-ck-rm]');
    if (rm) { e.preventDefault(); const [mode, ix] = rm.dataset.ckRm.split(':'); (S.heroCustom[mode] || []).splice(+ix, 1); const st = ckState(); Object.keys(st.done).forEach(k => { if (k.startsWith(mode + ':c')) delete st.done[k]; }); save(); renderChecklist(new Date()); return; }
    if (e.target.closest('#heroCkAdd')) {
      const v = ((await askValue('Add checklist item', 'What do you want to remember?', '')) || '').trim().slice(0, 60); if (!v) return;
      const mode = modeOf(new Date()); ckState(); (S.heroCustom[mode] = S.heroCustom[mode] || []).push(v); save(); renderChecklist(new Date());
    }
  });

  /* ---------- agenda (private iCal link) ---------- */
  let AG = { linked: false, name: '', events: [], error: '', loaded: false, at: 0 };
  async function loadAgenda(force) {
    try {
      const r = await fetch('/api/gcal/events?days=2' + (force ? '&refresh=1' : ''), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); AG = Object.assign({ loaded: true, at: Date.now() }, j);
    } catch (e) { AG.loaded = true; AG.error = 'Calendar service unavailable'; }
    renderAgenda(new Date());
  }
  const t12 = d => { let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${pad2(d.getMinutes())} ${ap}`; };
  function renderAgenda(now) {
    const box = el('heroAgenda'), body = box.querySelector('.ag-body'), sub = box.querySelector('.ag-sub');
    if (!AG.loaded) { body.innerHTML = '<div class="ag-empty">Loading…</div>'; return; }
    if (!AG.linked) {
      sub.textContent = 'Not linked';
      body.innerHTML = `<div class="ag-cta"><div class="ag-cta-ic">${li('cal', 20)}</div><div><b>See your day at a glance</b><p>Link Google Calendar to show today’s meetings and events here. Read-only, and the link stays on this PC.</p><button class="hero-btn" id="heroLink">${li('link', 12)}Link calendar</button></div></div>`;
      return;
    }
    const ev = (AG.events || []).map(e => ({ t: e.title, s: new Date(e.start), e: new Date(e.end), all: e.allDay, loc: e.location }));
    const today = dkey(now), tm = new Date(now); tm.setDate(tm.getDate() + 1);
    const isDay = (e, key) => { const sd = dkey(e.s), ed = dkey(new Date(e.e.getTime() - (e.all ? 1 : 0))); return sd <= key && ed >= key; };
    const tdy = ev.filter(e => isDay(e, today)), tmr = ev.filter(e => isDay(e, dkey(tm)));
    sub.innerHTML = `<i class="live-dot"></i>${escH(AG.name || 'Google Calendar')}`;
    if (AG.error && !ev.length) { body.innerHTML = `<div class="ag-empty err">${escH(AG.error)}<br><button class="hero-btn" id="heroLink">Fix link</button></div>`; return; }
    const upcoming = tdy.filter(e => !e.all && e.e > now).sort((a, b) => a.s - b.s)[0];
    let html = '';
    if (!tdy.length) html += '<div class="ag-empty">Nothing scheduled today — a clear day for trading.</div>';
    else {
      html += '<ul class="ag-list">' + tdy.sort((a, b) => (b.all - a.all) || (a.s - b.s)).slice(0, 5).map(e => {
        const live = !e.all && e.s <= now && e.e > now, past = !e.all && e.e <= now;
        const when = e.all ? 'All day' : `${t12(e.s)}${e.e > e.s ? ' – ' + t12(e.e) : ''}`;
        return `<li class="${live ? 'live' : ''} ${past ? 'past' : ''}"><span class="ag-time">${when}</span><span class="ag-title">${escH(e.t)}</span>${live ? '<em>NOW</em>' : (upcoming && e === upcoming ? `<em class="nx">in ${human(e.s - now)}</em>` : '')}${e.loc ? `<small>${li('pin', 10)}${escH(e.loc)}</small>` : ''}</li>`;
      }).join('') + '</ul>';
      if (tdy.length > 5) html += `<div class="ag-more">+${tdy.length - 5} more today</div>`;
    }
    if (tmr.length) html += `<div class="ag-tomorrow">Tomorrow · <b>${tmr.length}</b> event${tmr.length > 1 ? 's' : ''}${tmr.find(e => !e.all) ? ` — first at ${t12(tmr.filter(e => !e.all).sort((a, b) => a.s - b.s)[0].s)}` : ''}</div>`;
    body.innerHTML = html;
  }
  /* link / manage dialog */
  let ov = null;
  function dialog() {
    if (ov) return ov;
    ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'ovGcal';
    ov.innerHTML = `<div class="modal" style="width:520px"><header><h3>Google Calendar</h3><button class="icon-btn" data-gx aria-label="Close">${li('x', 16)}</button></header><div class="gc-body"></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('mousedown', e => { if (e.target === ov || e.target.closest('[data-gx]')) ov.classList.remove('open'); });
    ov.addEventListener('click', e => { if (e.target.closest('[data-gx]')) ov.classList.remove('open'); });
    return ov;
  }
  async function openDialog() {
    const d = dialog(), body = d.querySelector('.gc-body');
    d.classList.add('open');
    if (AG.linked) {
      body.innerHTML = `<div class="gc-linked"><div class="gc-ok">${li('check', 16)}</div><div><b>${escH(AG.name || 'Google Calendar')}</b><p>Linked · ${AG.fetchedAt ? 'last updated ' + new Date(AG.fetchedAt).toLocaleTimeString() : 'waiting for first sync'}</p>${AG.error ? `<p class="gc-err">${escH(AG.error)}</p>` : ''}</div></div><div class="gc-actions"><button class="btn gh" id="gcRefresh">Refresh now</button><button class="btn gh" id="gcUnlink" style="color:var(--red)">Unlink</button></div><p class="gc-note">Events are read from your private calendar address and never leave this PC.</p>`;
    } else {
      body.innerHTML = `<ol class="gc-steps"><li>Open <b>Google Calendar</b> on the web → <b>Settings</b> (gear icon).</li><li>Choose your calendar on the left → <b>Integrate calendar</b>.</li><li>Copy <b>Secret address in iCal format</b> and paste it below.</li></ol><label class="gc-l">iCal address<input id="gcUrl" type="text" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autocomplete="off" spellcheck="false"></label><div id="gcErr" class="gc-err" hidden></div><div class="gc-actions"><button class="btn pri" id="gcLink">Link calendar</button></div><p class="gc-note">Read-only. Anyone with this address can read your calendar, so keep it private — it is stored only on this PC. Reset it any time in Google Calendar to revoke access.</p>`;
      setTimeout(() => { const i = d.querySelector('#gcUrl'); if (i) i.focus(); }, 80);
    }
  }
  document.addEventListener('click', async e => {
    if (e.target.closest('#heroLink') || e.target.closest('#heroAgMore')) { openDialog(); return; }
    const t = e.target;
    if (t.id === 'gcLink') {
      const url = (document.getElementById('gcUrl').value || '').trim(), err = document.getElementById('gcErr');
      t.disabled = true; t.textContent = 'Linking…'; err.hidden = true;
      try {
        const r = await fetch('/api/gcal/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
        const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Could not link that calendar.');
        document.getElementById('ovGcal').classList.remove('open'); toast('Calendar linked · ' + (j.eventsNext7Days || 0) + ' events in the next 7 days'); await loadAgenda(true);
      } catch (x) { err.textContent = x.message === 'Failed to fetch' ? 'The local server is not reachable.' : x.message; err.hidden = false; }
      t.disabled = false; t.textContent = 'Link calendar'; return;
    }
    if (t.id === 'gcUnlink') { if (!confirm('Unlink this calendar from the dashboard?')) return; await fetch('/api/gcal/unlink', { method: 'POST' }); document.getElementById('ovGcal').classList.remove('open'); toast('Calendar unlinked'); await loadAgenda(); return; }
    if (t.id === 'gcRefresh') { t.textContent = 'Refreshing…'; await loadAgenda(true); openDialog(); toast('Calendar refreshed'); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const o = document.getElementById('ovGcal'); if (o) o.classList.remove('open'); } });

  /* ---------- loop ---------- */
  let lastMin = -1;
  function tick() {
    const now = new Date();
    renderGreeting(now);
    if (now.getMinutes() !== lastMin) {
      lastMin = now.getMinutes();
      const st = dayStats();
      renderSessions(now); renderChecklist(now); renderAgenda(now); renderTagline(now, st); renderStatsExtra(st);
    }
  }
  window.heroTick = function () { lastMin = -1; tick(); };
  window.heroStats = dayStats;
  window.heroRefreshStats = function () { const st = dayStats(); renderTagline(new Date(), st); renderStatsExtra(st); };
  hydrate(hero);
  tick(); loadAgenda(false);
  setInterval(() => { if (!document.hidden) tick(); }, 1000);
  setInterval(() => { if (!document.hidden) loadAgenda(false); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { heroTick(); loadAgenda(false); } });
})();

/* ---------- Weekly Breakdown card (Month / Year) ---------- */
(function () {
  'use strict';
  const card = document.getElementById('sec-weekly');
  if (!card) return;
  const MN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let mode = 'month', sig = '';
  try { mode = localStorage.getItem('tj_wk_mode') === 'year' ? 'year' : 'month'; } catch (e) { /* ignore */ }
  const fmt = (v, kind) => {
    if (Math.abs(v) < 0.005) return cur() + '0.00';
    const t = cur() + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (v < 0 ? '-' : kind === 'gain' ? '+' : '') + t;
  };
  function add(b, t) { b.n++; if (t.pnl > 0) { b.w++; b.gain += t.pnl; } else if (t.pnl < 0) b.loss += t.pnl; }
  function buckets() {
    const y = S.year, m = S.month, now = new Date(), ts = allTrades(), out = [];
    if (mode === 'month') {
      const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), rows = Math.ceil((first.getDay() + days) / 7);
      let last = rows;
      if (y === now.getFullYear() && m === now.getMonth()) last = Math.floor((now.getDate() - 1 + first.getDay()) / 7) + 1;
      for (let i = 0; i < last; i++) out.push({ label: 'Week ' + (i + 1), n: 0, w: 0, gain: 0, loss: 0 });
      ts.forEach(t => { const d = tdate(t); if (d.getFullYear() !== y || d.getMonth() !== m) return; const b = out[Math.floor((d.getDate() - 1 + first.getDay()) / 7)]; if (b) add(b, t); });
    } else {
      const last = y === now.getFullYear() ? now.getMonth() + 1 : y < now.getFullYear() ? 12 : 0;
      for (let i = 0; i < last; i++) out.push({ label: MN3[i], n: 0, w: 0, gain: 0, loss: 0 });
      ts.forEach(t => { const d = tdate(t); if (d.getFullYear() !== y) return; const b = out[d.getMonth()]; if (b) add(b, t); });
    }
    return out;
  }
  function render() {
    const seg = document.getElementById('wkSeg');
    seg.dataset.mode = mode;
    seg.querySelectorAll('button').forEach(b => { const on = b.dataset.wk === mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    document.getElementById('wkSub').textContent = mode === 'month' ? `${MON[S.month]} ${S.year} · weeks run Sunday to Saturday` : `${S.year} · totals by month`;
    const bs = buckets();
    const tot = bs.reduce((a, b) => ({ n: a.n + b.n, w: a.w + b.w, gain: a.gain + b.gain, loss: a.loss + b.loss }), { n: 0, w: 0, gain: 0, loss: 0 });
    const k = bs.length || 1, avg = { n: Math.round(tot.n / k), w: Math.round(tot.w / k), gain: tot.gain / k, loss: tot.loss / k };
    const money = (v, kind) => `<span class="wk-m ${kind}${Math.abs(v) < 0.005 ? ' zero' : ''}" data-v="${v}" data-k="${kind}">${fmt(v, kind)}</span>`;
    const badge = (v, c) => `<em class="wk-b ${c}" data-v="${v}" data-k="int">${v}</em>`;
    let html = `<div class="wk-row wk-hd"><span>${mode === 'month' ? 'Week' : 'Month'}</span><span>Trade</span><span>Win</span><span>Gross gain</span><span>Gross loss</span></div>`;
    bs.forEach((b, i) => { html += `<div class="wk-row" style="--i:${i}"><span class="wk-l">${b.label}</span><span>${badge(b.n, 'blue')}</span><span>${badge(b.w, 'green')}</span>${money(b.gain, 'gain')}${money(b.loss, 'loss')}</div>`; });
    if (!bs.length) html += '<div class="wk-empty">Nothing to show for this period yet.</div>';
    html += `<div class="wk-row wk-avg" style="--i:${bs.length}"><span class="wk-l">Average</span><span class="wk-n" data-v="${avg.n}" data-k="int">${avg.n}</span><span class="wk-n" data-v="${avg.w}" data-k="int">${avg.w}</span>${money(avg.gain, 'gain')}${money(avg.loss, 'loss')}</div>`;
    html += `<div class="wk-row wk-total" style="--i:${bs.length + 1}"><span class="wk-l">Total</span><span>${badge(tot.n, 'blue')}</span><span>${badge(tot.w, 'green')}</span>${money(tot.gain, 'gain')}${money(tot.loss, 'loss')}</div>`;
    const sg = [mode, S.year, S.month, bs.length, tot.n, tot.w, tot.gain.toFixed(2), tot.loss.toFixed(2)].join('|');
    const tbl = document.getElementById('wkTable'), changed = sg !== sig;
    tbl.classList.toggle('anim', changed); tbl.innerHTML = html; sig = sg;
    if (changed && typeof tween === 'function') tbl.querySelectorAll('[data-v]').forEach(e => { const v = +e.dataset.v, kd = e.dataset.k; e._v = 0; tween(e, v, x => kd === 'int' ? Math.round(x) : fmt(x, kd), 750); });
  }
  card.querySelector('#wkSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-wk]'); if (!b || b.dataset.wk === mode) return;
    mode = b.dataset.wk; try { localStorage.setItem('tj_wk_mode', mode); } catch (x) { /* ignore */ }
    render();
  });
  window.renderWeekly = render;
  hydrate(card); render();
})();

/* ---------- Trading Activity heatmap: animated hover card ---------- */
(function () {
  'use strict';
  const hm = document.getElementById('hm');
  if (!hm) return;
  const tip = document.createElement('div');
  tip.className = 'hm-tip'; tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let cur = null, raf = 0;
  const label = k => { const d = new Date(k + 'T00:00'); return `${DAYN[d.getDay()].slice(0, 3)}, ${MON[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`; };
  function place(c) {
    const r = c.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = innerWidth, gap = 12;
    let left = r.left + r.width / 2 - w / 2, top = r.top - h - gap, below = false;
    if (top < 8) { top = r.bottom + gap; below = true; }
    left = Math.max(8, Math.min(vw - w - 8, left));
    tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.round(top) + 'px';
    tip.style.setProperty('--ax', Math.round(r.left + r.width / 2 - left) + 'px');
    tip.classList.toggle('below', below);
  }
  function show(c) {
    if (cur === c) return;
    if (cur) cur.classList.remove('hot');
    const wasOn = tip.classList.contains('on');
    cur = c; c.classList.add('hot'); hm.classList.add('hovering');
    const n = +c.dataset.n, p = +c.dataset.p;
    tip.innerHTML = `<b class="d">${label(c.dataset.k)}</b>` + (n
      ? `<b class="n">${n} trade${n > 1 ? 's' : ''}</b><span class="p ${p > 0 ? 'pos' : p < 0 ? 'neg' : ''}">${money(p, { sign: p > 0, compact: false, dec: 2 })}</span>`
      : '<span class="none">No trades</span>');
    place(c);
    if (!wasOn) { void tip.offsetWidth; clearTimeout(raf); raf = setTimeout(() => tip.classList.add('on'), 20); }
  }
  function hide() {
    clearTimeout(raf);
    if (cur) cur.classList.remove('hot');
    cur = null; hm.classList.remove('hovering'); tip.classList.remove('on');
  }
  hm.addEventListener('mouseover', e => { const c = e.target.closest('.hm-c:not(.nofill)'); if (c && c.dataset.k) show(c); else if (!c) hide(); });
  hm.addEventListener('mouseleave', hide);
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('blur', hide);
})();

/* ---------- Trade Logging: manual / imported trades are opt-in (MetaTrader data only by default) ---------- */
(function () {
  'use strict';
  const head = document.querySelector('#page-logging .page-head');
  if (!head) return;
  const btn = head.querySelector('button');
  const right = document.createElement('div');
  right.style.cssText = 'display:flex;gap:10px;align-items:center';
  const lab = document.createElement('label');
  lab.className = 'manual-tgl';
  lab.title = 'Show trades you added by hand or imported from a file. Off = only your connected MetaTrader account.';
  lab.innerHTML = '<input type="checkbox" id="manualChk"><span>Include manual &amp; imported trades <b id="manualN">0</b></span>';
  if (btn) { head.insertBefore(right, btn); right.appendChild(lab); right.appendChild(btn); } else head.appendChild(lab);
  const chk = lab.querySelector('input');
  chk.addEventListener('change', () => { S.showManual = chk.checked; save(); renderAll(); toast(chk.checked ? 'Showing manual and imported trades' : 'Showing MetaTrader data only'); });
  function sync() { chk.checked = S.showManual === true; lab.querySelector('#manualN').textContent = S.live.length; lab.style.display = (S.live.length || S.showManual) ? '' : 'none'; }
  if (typeof renderLog === 'function') { const orig = renderLog; window.renderLog = function () { const r = orig.apply(this, arguments); sync(); return r; }; }
  sync();
})();
