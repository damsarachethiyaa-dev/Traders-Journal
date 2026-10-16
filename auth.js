/* Traders Journal - sign-in window.
   Talks to the local server only (/api/auth/*): session, login, register, Google (start/poll), Windows profile lookup and
   the desktop app's automatic sign-in. Exposes window.tjAuth for the rest of the app (settings.js uses user + logout). */
(function () {
  'use strict';
  const A = window.TJ_AUTH || { authed: false };
  const desktop = window.tjDesktop || null;
  const W = 1430, H = 907;                        // size of the sign-in window / artwork
  const users = Array.isArray(A.users) ? A.users : [];
  const setup = !A.offline && (!!A.needsSetup || users.length === 0);   // nobody exists yet: the first account is the owner
  const canRegister = setup || A.allowSignups !== false;
  const canLogin = !setup;
  const hasPcLogin = !!(desktop && typeof desktop.deviceKey === 'function') && canLogin;
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  let gate = document.getElementById('authGate');
  if (!gate) { gate = document.createElement('div'); gate.id = 'authGate'; document.body.appendChild(gate); }
  gate.hidden = !!A.authed;

  const $ = (s, r) => (r || gate).querySelector(s);
  const $$ = (s, r) => Array.from((r || gate).querySelectorAll(s));
  const el = id => document.getElementById(id);

  let built = false, current = '', flow = null, google = null, auto = false, entering = false, noticeText = '';

  /* ======================================================= markup ======================================================= */
  const ICON = {
    user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
    at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>'
  };
  const ic = (d, cls) => '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const EYE = '<svg class="tj-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>' +
    '<svg class="tj-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13 13 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  const GOOGLE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/><path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"/></svg>';
  const ARROW = '<svg class="tj-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const bannerHtml = (id, kind, d) => '<div class="tj-banner tj-' + kind + '" id="' + id + '" role="' + (kind === 'err' ? 'alert' : 'status') + '">' + ic(d) + '<span></span></div>';
  function field(id, name, label, o) {
    o = o || {};
    const pw = o.type === 'password';
    return '<div class="tj-field"><label for="' + id + '"><span>' + label + '</span>' + (o.hint ? '<span class="tj-hint">' + o.hint + '</span>' : '') + '</label>' +
      '<div class="tj-input-wrap">' + ic(o.icon, 'tj-lead') +
      '<input id="' + id + '" name="' + name + '" type="' + (o.type || 'text') + '" autocomplete="' + (o.ac || 'off') + '" spellcheck="false"' +
      (o.ph ? ' placeholder="' + o.ph + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + '>' +
      (pw ? '<button type="button" class="tj-eye" data-eye="' + id + '" aria-label="Show or hide password">' + EYE + '</button>' : '') + '</div>' +
      (o.after || '') + '</div>';
  }

  function template() {
    return '<div class="tj-drag"></div>' +
    '<div class="tj-win" id="tjWin"><div class="tj-win-in" id="tjWinIn">' +
      '<div class="tj-art-layer" id="tjArtLayer"><div class="tj-art"></div>' +
        '<div class="tj-fx tj-fog"></div><div class="tj-fx tj-fog tj-b"></div>' +
        '<div class="tj-fx tj-seal"></div><div class="tj-fx tj-seal tj-b"></div><div class="tj-fx tj-seal tj-c"></div>' +
        '<div class="tj-fx tj-flame tj-b"></div><div class="tj-fx tj-flame"></div><div class="tj-fx tj-flame tj-c"></div>' +
        '<div class="tj-fx tj-slash"></div></div>' +
      '<canvas class="tj-embers" id="tjEmbers" aria-hidden="true"></canvas><div class="tj-shade"></div><div class="tj-scan"></div>' +

      '<aside class="tj-panel" id="tjPanel" aria-label="Sign in to Traders Journal">' +
        '<header class="tj-brand tj-rise" style="--i:0"><img class="tj-logo-mark" src="media/app-logo.png" alt="" width="30" height="30">' +
          '<span class="tj-brand-name">Traders Journal</span><span class="tj-badge">KING</span></header>' +
        '<div class="tj-mid">' +
          '<div class="tj-tabs tj-rise" style="--i:1" id="tjTabs" data-active="login" role="tablist"><span class="tj-thumb"></span>' +
            '<button type="button" class="tj-tab" role="tab" aria-selected="true" data-go="login">Sign in</button>' +
            '<button type="button" class="tj-tab" role="tab" aria-selected="false" data-go="register">Create account</button></div>' +
          '<div class="tj-views tj-rise" style="--i:2" id="tjViews">' +

            /* ---- sign in ---- */
            '<div class="tj-view" data-view="login">' +
              '<h1 class="tj-title">Welcome back</h1><p class="tj-sub">Open your journal. Each person on this PC has a separate account.</p>' +
              bannerHtml('tjNoticeLogin', 'info', ICON.info) +
              '<form id="tjLoginForm" novalidate>' +
                field('tjIdentifier', 'identifier', 'Username or email', { icon: ICON.user, ac: 'username', ph: 'Username or email' }) +
                field('tjPassword', 'password', 'Password', { icon: ICON.lock, type: 'password', ac: 'current-password', ph: '••••••••' }) +
                '<div class="tj-row"><label class="tj-switch"><input type="checkbox" name="remember" checked><span class="tj-track"></span>Keep me signed in</label>' +
                  '<button type="button" class="tj-link" id="tjForgot">Forgot password?</button></div>' +
                bannerHtml('tjLoginErr', 'err', ICON.alert) +
                '<button type="submit" class="tj-btn tj-primary" id="tjLoginBtn"><span class="tj-spin"></span><span class="tj-lbl">Log in</span>' + ARROW + '</button>' +
              '</form>' +
              '<div class="tj-divider">OR</div>' +
              '<div class="tj-alt' + (hasPcLogin ? '' : ' tj-single') + '"><button type="button" class="tj-btn tj-ghost" id="tjGoogleBtn">' + GOOGLE_SVG + 'Continue with Google</button>' +
                (hasPcLogin ? '<button type="button" class="tj-btn tj-ghost" id="tjPcBtn"><svg viewBox="0 0 24 24" fill="#4aa3ff"><path d="M3 5.5 10.5 4.4v7.1H3zM11.5 4.3 21 3v8.5h-9.5zM3 12.5h7.5v7.1L3 18.5zM11.5 12.5H21V21l-9.5-1.3z"/></svg>This PC</button>' : '') + '</div>' +
            '</div>' +

            /* ---- create account ---- */
            '<div class="tj-view" data-view="register">' +
              '<h1 class="tj-title" id="tjRegTitle"></h1><p class="tj-sub" id="tjRegSub"></p>' +
              bannerHtml('tjNoticeReg', 'info', ICON.info) + bannerHtml('tjGoogleOk', 'ok', ICON.check) +
              '<form id="tjRegForm" novalidate>' +
                '<div class="tj-grid2">' + field('tjFirst', 'firstName', 'First name', { icon: ICON.user, ac: 'given-name', max: 50 }) + field('tjLast', 'lastName', 'Last name', { icon: ICON.user, ac: 'family-name', max: 50 }) + '</div>' +
                field('tjUser', 'username', 'Username', { icon: ICON.at, ac: 'username', max: 30, hint: 'letters, numbers . _ -' }) +
                field('tjEmail', 'email', 'Email', { icon: ICON.mail, type: 'email', ac: 'email', max: 150, hint: 'optional' }) +
                '<div class="tj-grid2">' +
                  field('tjPw1', 'password', 'Password', { icon: ICON.lock, type: 'password', ac: 'new-password', hint: '8+', after: '<div class="tj-meter" id="tjMeter" data-s="0"><i></i><i></i><i></i><i></i></div><div class="tj-meter-txt" id="tjMeterTxt"></div>' }) +
                  field('tjPw2', 'password2', 'Confirm', { icon: ICON.check, type: 'password', ac: 'new-password' }) + '</div>' +
                bannerHtml('tjRegErr', 'err', ICON.alert) +
                '<button type="submit" class="tj-btn tj-primary" id="tjRegBtn"><span class="tj-spin"></span><span class="tj-lbl" id="tjRegLbl">Create account</span>' + ARROW + '</button>' +
              '</form>' +
              '<div class="tj-solo"><button type="button" class="tj-link" id="tjFillWin">Fill my name from this PC\'s Windows profile</button></div>' +
              '<div class="tj-solo" style="margin-top:6px"><button type="button" class="tj-link" id="tjGoogleRegBtn">Sign up with Google instead</button></div>' +
            '</div>' +

            /* ---- waiting (Google / this PC) ---- */
            '<div class="tj-view" data-view="wait"><div class="tj-wait"><div class="tj-rings"><i></i><i></i><i></i>' +
              '<img src="media/app-logo.png" alt="" width="24" height="24"></div>' +
              '<h2 id="tjWaitTitle"></h2><p id="tjWaitText"></p>' +
              '<p><a class="tj-link tj-hidden" id="tjWaitOpen" target="_blank" rel="noopener">Open Google sign-in again</a></p>' +
              '<button type="button" class="tj-link" id="tjWaitCancel">Cancel</button></div></div>' +
          '</div>' +
        '</div>' +
        '<footer class="tj-foot tj-rise" style="--i:5"><span class="tj-local"><i></i>100% LOCAL · NOTHING LEAVES THIS PC</span><span class="tj-ver">v1.0.6</span></footer>' +
      '</aside>' +

      '<section class="tj-showcase" aria-hidden="true">' +
        '<div class="tj-kicker tj-rise" style="--i:3"><i></i>TRADERS JOURNAL · KING EDITION</div>' +
        '<h2 class="tj-rise" style="--i:4">Your trades.<br><em>Your edge.</em><br>Your own private journal.</h2>' +
        '<p class="tj-rise" style="--i:5">Every person on this PC has a separate login, profile, settings and trade history.</p>' +
        '<div class="tj-eq tj-rise" style="--i:6"><div class="tj-eq-head"><span>Equity curve</span><span>ILLUSTRATION</span></div>' +
          '<div class="tj-plot"><svg viewBox="0 0 320 86" preserveAspectRatio="none" id="tjEqSvg"><defs><linearGradient id="tjEqa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#19d38a" stop-opacity=".3"/><stop offset="1" stop-color="#19d38a" stop-opacity="0"/></linearGradient></defs>' +
            '<g class="tj-grid"><line x1="0" y1="22" x2="320" y2="22"/><line x1="0" y1="44" x2="320" y2="44"/><line x1="0" y1="66" x2="320" y2="66"/></g>' +
            '<path id="tjEqArea" fill="url(#tjEqa)"/><path id="tjEqLine" fill="none" stroke="#19d38a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg><span class="tj-dot" id="tjEqDot"></span></div></div>' +
        '<div class="tj-feats tj-rise" style="--i:7">' +
          '<div class="tj-feat">' + ic('<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/>') + '<b>MT5 auto-sync</b><span>Trades flow in from your terminal.</span></div>' +
          '<div class="tj-feat">' + ic('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/>') + '<b>Daily journal</b><span>Notes and screenshots per day.</span></div>' +
          '<div class="tj-feat">' + ic(ICON.lock) + '<b>Private</b><span>Stays on this PC. Always.</span></div></div>' +
      '</section>' +

      '<div class="tj-ticker" aria-hidden="true"><div class="tj-ticker-track" id="tjTicker"></div></div>' +

      '<div class="tj-success" id="tjSuccess" aria-live="polite"><svg class="tj-big" viewBox="0 0 84 84"><circle class="tj-circ" cx="42" cy="42" r="30"/><path class="tj-tick" d="M29 43l9 9 18-20"/></svg>' +
        '<h2 id="tjOkTitle">Welcome back</h2><p>Opening your journal…</p><div class="tj-bar"><i></i></div></div>' +
    '</div></div>';
  }

  /* ======================================================= helpers ======================================================= */
  const order = { login: 0, register: 1, wait: 2 };
  const homeView = () => (canLogin ? 'login' : 'register');
  const regLabel = () => (setup ? 'Create owner account' : 'Create account');

  function showBanner(id, msg, kind) {
    const b = el(id); if (!b) return;
    if (kind) b.className = 'tj-banner tj-' + kind;
    b.querySelector('span').textContent = msg; b.classList.add('tj-on');
  }
  function hideBanners(onlyErrors) {
    $$('.tj-banner').forEach(b => { if (!onlyErrors || b.classList.contains('tj-err')) b.classList.remove('tj-on'); });
    $$('.tj-field.tj-invalid').forEach(f => f.classList.remove('tj-invalid'));
  }
  function markBad(input) {
    const f = input.closest('.tj-field'); if (!f) return;
    f.classList.remove('tj-invalid'); void f.offsetWidth; f.classList.add('tj-invalid');
  }
  function shake() {
    const p = el('tjPanel'); if (!p) return;
    p.classList.remove('tj-shake'); void p.offsetWidth; p.classList.add('tj-shake');
    setTimeout(() => p.classList.remove('tj-shake'), 520);
  }
  function showErr(msg, input) {
    showBanner(current === 'register' ? 'tjRegErr' : 'tjLoginErr', msg);
    if (input) markBad(input);
    shake();
  }
  function setNotice(msg) {
    noticeText = msg || '';
    ['tjNoticeLogin', 'tjNoticeReg'].forEach(id => { const b = el(id); if (!b) return; if (msg) showBanner(id, msg); else b.classList.remove('tj-on'); });
  }
  function busy(btn, on, label) {
    if (!btn) return; btn.disabled = on; btn.classList.toggle('tj-loading', on);
    if (label) btn.querySelector('.tj-lbl').textContent = label;
  }

  async function post(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    let j = {}; try { j = await r.json(); } catch (e) { /* not json */ }
    return { ok: r.ok, status: r.status, j };
  }
  const enter = welcome => { try { sessionStorage.removeItem('tj_no_auto'); if (welcome) sessionStorage.setItem('tj_post_login', '1'); } catch (e) { /* ignore */ } location.reload(); };

  /* ---------- views (the panel height animates between them) ---------- */
  function setView(name, instant) {
    const views = el('tjViews'), tabs = el('tjTabs');
    const to = $('.tj-view[data-view="' + name + '"]');
    if (!to || name === current) return;
    const from = current ? $('.tj-view[data-view="' + current + '"]') : null, fwd = from ? order[name] > order[current] : true;
    if (instant || !from) {
      $$('.tj-view').forEach(v => v.classList.remove('tj-active', 'tj-left'));
      to.classList.add('tj-active'); views.style.height = '';
    } else {
      const h0 = views.offsetHeight;
      from.classList.remove('tj-active'); from.classList.toggle('tj-left', fwd);
      to.style.transition = 'none'; to.classList.toggle('tj-left', !fwd); void to.offsetWidth; to.style.transition = '';
      to.classList.remove('tj-left'); to.classList.add('tj-active');
      views.style.height = 'auto'; const h1 = views.offsetHeight;
      views.style.height = h0 + 'px'; void views.offsetHeight; views.style.height = h1 + 'px';
      clearTimeout(setView.t); setView.t = setTimeout(() => { views.style.height = ''; }, 560);
    }
    current = name;
    if (name !== 'wait') {
      tabs.dataset.active = name;
      $$('.tj-tab', tabs).forEach(t => t.setAttribute('aria-selected', String(t.dataset.go === name)));
    }
    tabs.style.opacity = name === 'wait' ? '.45' : ''; tabs.style.pointerEvents = name === 'wait' ? 'none' : '';
    hideBanners();
    if (noticeText && name !== 'wait') setNotice(noticeText);
    if (google && name === 'register') showBanner('tjGoogleOk', 'Verified by Google · ' + google.email, 'ok');
  }
  function focusFirst() {
    const view = $('.tj-view.tj-active'); if (!view || current === 'wait') return;
    const empty = $$('input:not([type=checkbox]):not([readonly])', view).find(i => !i.value);
    if (empty) empty.focus({ preventScroll: true });
  }
  function switchTo(name) {          // user-driven switch between sign in and create account
    if ((name === 'register' && !canRegister) || (name === 'login' && !canLogin)) return;
    noticeText = ''; setView(name); setTimeout(focusFirst, 380);
  }

  /* ======================================================= build + animation ======================================================= */
  function fit() {
    const win = el('tjWin'); if (!win) return;
    const nativeSized = innerWidth < W + 40 && innerHeight < H + 40;       // the desktop window is already this size: fill it edge to edge
    const pad = nativeSized ? 0 : 36;
    const s = Math.min(1, (innerWidth - pad) / W, (innerHeight - pad) / H);
    win.style.setProperty('--s', s.toFixed(4));
    gate.classList.toggle('tj-fill', nativeSized);
  }

  const anim = { on: false, embers: null, equity: null };
  function loop(now) {
    if (gate.hidden || !anim.on) { anim.on = false; return; }
    if (anim.embers) anim.embers(now);
    if (anim.equity) anim.equity(now);
    requestAnimationFrame(loop);
  }
  function startAnim() { if (anim.on) return; anim.on = true; requestAnimationFrame(loop); }

  function initEmbers() {
    const cv = el('tjEmbers'), ctx = cv.getContext('2d'), FX = 1043, FY = 540, dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const P = [], D = []; let last = 0, acc = 0, t = 0;
    for (let i = 0; i < 46; i++) D.push({ x: Math.random() * W, y: Math.random() * H, r: .5 + Math.random() * 1.1, v: 4 + Math.random() * 9, ph: Math.random() * 6.28, a: .08 + Math.random() * .16 });
    const spawn = () => P.push({ x: FX + (Math.random() - .5) * 26, y: FY + (Math.random() - .5) * 14, vx: (Math.random() - .35) * 16, vy: -(26 + Math.random() * 62),
      age: 0, max: 1.8 + Math.random() * 2.4, r: .8 + Math.random() * 2.1, ph: Math.random() * 6.28, hot: Math.random() < .3 });
    anim.embers = now => {
      const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now; t += dt;
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      if (!reduceMotion) { acc += dt * 34 * (.7 + .5 * Math.sin(t * 1.3)); while (acc >= 1) { acc--; if (P.length < 150) spawn(); } }
      for (const d of D) {
        d.y -= d.v * dt; d.x += Math.sin(t * .4 + d.ph) * 6 * dt; if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; }
        ctx.fillStyle = 'rgba(255,255,255,' + (d.a * (.6 + .4 * Math.sin(t + d.ph))).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
      }
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; p.age += dt; if (p.age >= p.max) { P.splice(i, 1); continue; }
        const k = p.age / p.max; p.x += (p.vx + Math.sin(t * 2.2 + p.ph) * 14) * dt; p.y += p.vy * dt * (1 - k * .35);
        const a = Math.sin(Math.PI * k) * .95, g = p.hot ? '230,150,90' : '255,70,60', r = p.r * (1 - k * .5);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
        gr.addColorStop(0, 'rgba(' + (p.hot ? '255,240,210' : '255,150,110') + ',' + a.toFixed(3) + ')');
        gr.addColorStop(.35, 'rgba(' + g + ',' + (a * .5).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + g + ',0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, r * 5, 0, 6.283); ctx.fill();
      }
    };
  }

  function initEquity() {
    const line = el('tjEqLine'), area = el('tjEqArea'), dot = el('tjEqDot'), svg = el('tjEqSvg'), ns = 'http://www.w3.org/2000/svg';
    const clip = document.createElementNS(ns, 'clipPath'), rect = document.createElementNS(ns, 'rect');
    clip.id = 'tjEqClip'; rect.setAttribute('height', '86'); rect.setAttribute('width', '0'); clip.appendChild(rect); svg.querySelector('defs').appendChild(clip);
    area.setAttribute('clip-path', 'url(#tjEqClip)');
    let len = 1, t0 = 0, phase = 'draw';
    const ease = x => 1 - Math.pow(1 - x, 3);
    function make() {
      const n = 24, pts = []; let v = 0;
      for (let i = 0; i < n; i++) { v += (Math.random() - .34) * 1.6; pts.push(v); }
      const mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), r = (mx - mn) || 1;
      const P = pts.map((p, i) => [i / (n - 1) * 320, 76 - (p - mn) / r * 62]);
      let d = 'M' + P[0][0] + ',' + P[0][1];
      for (let i = 1; i < P.length; i++) { const m = (P[i - 1][0] + P[i][0]) / 2; d += ' C' + m + ',' + P[i - 1][1] + ' ' + m + ',' + P[i][1] + ' ' + P[i][0] + ',' + P[i][1]; }
      line.setAttribute('d', d); area.setAttribute('d', d + ' L320,86 L0,86 Z'); len = line.getTotalLength(); line.style.strokeDasharray = String(len);
    }
    function place(p) {
      line.style.strokeDashoffset = String(len * (1 - p));
      const pt = line.getPointAtLength(len * p), sx = svg.clientWidth / 320, sy = svg.clientHeight / 86;
      dot.style.transform = 'translate(' + (pt.x * sx) + 'px,' + (pt.y * sy) + 'px)'; rect.setAttribute('width', String(pt.x)); area.style.opacity = String(Math.min(1, p * 1.4));
    }
    make(); place(reduceMotion ? 1 : 0);
    anim.equity = now => {
      if (reduceMotion) return;
      if (!t0) t0 = now; const s = (now - t0) / 1000;
      if (phase === 'draw') { const p = Math.min(1, s / 2.6); place(ease(p)); if (p >= 1) { phase = 'hold'; t0 = now; } }
      else if (phase === 'hold') { dot.style.opacity = String(.65 + .35 * Math.sin(s * 5)); if (s > 2.4) { phase = 'out'; t0 = now; } }
      else { const o = 1 - Math.min(1, s / .5); line.style.opacity = area.style.opacity = dot.style.opacity = String(o); if (o <= 0) { line.style.opacity = dot.style.opacity = '1'; make(); phase = 'draw'; t0 = now; } }
    };
  }

  function initParallax() {
    if (reduceMotion) return;
    const art = el('tjArtLayer'), em = el('tjEmbers'); let raf = 0, ev = null;
    gate.addEventListener('mousemove', e => {
      ev = e; if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; const dx = ev.clientX / innerWidth - .5, dy = ev.clientY / innerHeight - .5;
        art.style.transform = 'translate(' + (-dx * 16).toFixed(1) + 'px,' + (-dy * 10).toFixed(1) + 'px)';
        em.style.transform = 'translate(' + (-dx * 7).toFixed(1) + 'px,' + (-dy * 4).toFixed(1) + 'px)';
      });
    });
  }

  function build() {
    if (built) return; built = true;
    gate.innerHTML = template();
    const items = [['EURUSD', '1.0842', 'dn', '−0.12%'], ['GBPUSD', '1.2715', 'up', '+0.08%'], ['USDJPY', '156.40', 'up', '+0.21%'], ['NAS100', '18,245.0', 'up', '+0.44%'],
      ['US30', '39,120', 'dn', '−0.18%'], ['XAUUSD', '2,341.6', 'up', '+0.31%'], ['BTCUSD', '67,420', 'up', '+1.12%']];
    const t = items.map(i => '<span><b>' + i[0] + '</b>' + i[1] + ' <span class="tj-' + i[2] + '">' + (i[2] === 'up' ? '▲' : '▼') + ' ' + i[3] + '</span></span>').join('');
    el('tjTicker').innerHTML = t + t;
    initEmbers(); initEquity(); initParallax(); bind();

    // copy that depends on whether this is the very first account
    el('tjRegTitle').textContent = setup ? 'Create the owner account' : 'Create your journal';
    el('tjRegSub').textContent = setup ? 'You are the first person on this PC, so this account will be the owner. You can add more people later.' : 'A private profile with its own trade history, stored only on this PC.';
    el('tjRegLbl').textContent = regLabel();
    el('tjTabs').classList.toggle('tj-hidden', !(canLogin && canRegister));
    try { const last = localStorage.getItem('tj_last_user'); if (last) el('tjIdentifier').value = last; } catch (e) { /* ignore */ }
  }

  function show(opts) {
    opts = opts || {};
    gate.hidden = false;                 // visible before build so the curve can be measured
    build(); fit(); startAnim();
    try { if (desktop && typeof desktop.setLoginMode === 'function') desktop.setLoginMode(true); } catch (e) { /* ignore */ }
    el('tjSuccess').classList.remove('tj-on'); el('tjWinIn').classList.remove('tj-unlock'); entering = false;
    busy(el('tjLoginBtn'), false, 'Log in'); busy(el('tjRegBtn'), false, regLabel());
    current = ''; noticeText = '';
    setView(opts.startWait ? 'wait' : homeView(), true);
    if (opts.notice) setNotice(opts.notice);
    if (!opts.startWait) setTimeout(focusFirst, 900);
  }

  /* ======================================================= success ======================================================= */
  function success(user, delay, welcome) {
    entering = true; delay = delay || 1900; welcome = welcome !== false;   // a silent start-up sign-in passes false
    const name = user && (user.firstName || user.username);
    el('tjOkTitle').textContent = name ? 'Welcome, ' + name : 'Welcome back';
    const ok = el('tjSuccess');
    $$('.tj-confetti', ok).forEach(c => c.remove());
    const cols = ['#e5383b', '#ff6a3d', '#d4a359', '#ffffff', '#ff8a7a'];
    for (let i = 0; i < 26; i++) {
      const c = document.createElement('i'), a = Math.random() * 6.283, d = 110 + Math.random() * 120; c.className = 'tj-confetti';
      c.style.cssText = 'background:' + cols[i % 5] + ';--dx:' + (Math.cos(a) * d).toFixed(0) + 'px;--dy:' + (Math.sin(a) * d - 20).toFixed(0) + 'px;--r:' + (Math.random() * 540 - 270).toFixed(0) + 'deg';
      ok.appendChild(c);
    }
    ok.classList.add('tj-on');
    setTimeout(() => el('tjWinIn').classList.add('tj-unlock'), delay - 500);
    setTimeout(() => enter(welcome), delay);
  }

  /* ======================================================= Google ======================================================= */
  async function startGoogle(intent) {
    if (flow || entering) return;
    const origin = current === 'register' ? 'register' : 'login';
    const remember = $('input[name=remember]'), btn = el(intent === 'register' ? 'tjGoogleRegBtn' : 'tjGoogleBtn');
    if (btn) btn.disabled = true;
    try {
      const r = await post('/api/auth/google/start', { intent, remember: remember ? remember.checked : true });
      if (!r.ok) { showErr(r.j.error || 'Could not start Google sign-in.'); return; }
      flow = { state: r.j.state, url: r.j.url, intent, origin, timer: 0, started: Date.now() };
      el('tjWaitTitle').textContent = 'Waiting for Google…';
      el('tjWaitText').textContent = 'Finish signing in with the browser window that opened, then return here.';
      const open = el('tjWaitOpen'); open.href = flow.url; open.classList.remove('tj-hidden');
      el('tjWaitCancel').textContent = 'Cancel';
      setView('wait');
      window.open(r.j.url, '_blank', 'noopener');
      flow.timer = setInterval(pollGoogle, 1500);
    } catch (e) { showErr('Could not reach the local server.'); }
    finally { if (btn) btn.disabled = false; }
  }
  function stopGoogle() { if (flow && flow.timer) clearInterval(flow.timer); flow = null; }
  function leaveWait(origin, notice) { noticeText = ''; setView(origin || homeView()); if (notice) setNotice(notice); }

  async function pollGoogle() {
    const f = flow; if (!f) return;
    if (Date.now() - f.started > 10 * 60 * 1000) { stopGoogle(); return leaveWait(f.origin, 'Google sign-in timed out. Please try again.'); }
    try {
      const r = await fetch('/api/auth/google/poll?state=' + encodeURIComponent(f.state), { cache: 'no-store' });
      const j = await r.json();
      if (flow !== f) return;                       // cancelled while the request was in flight
      if (j.status === 'pending') return;
      stopGoogle();
      if (j.status === 'error' || !r.ok) return leaveWait(f.origin, j.error || 'Google sign-in failed.');
      if (f.intent === 'login') return success(j.user);
      google = { email: j.profile.email, state: f.state };
      const set = (id, v) => { const i = el(id); if (i && v) i.value = v; };
      set('tjFirst', j.profile.firstName); set('tjLast', j.profile.lastName); set('tjEmail', j.profile.email);
      if (!el('tjUser').value) set('tjUser', j.profile.username);
      el('tjEmail').readOnly = true; el('tjGoogleRegBtn').classList.add('tj-hidden');
      noticeText = ''; setView('register');
    } catch (e) { /* network hiccup: the next tick tries again */ }
  }

  /* ======================================================= this PC (desktop app) ======================================================= */
  const noAuto = () => { try { return sessionStorage.getItem('tj_no_auto') === '1'; } catch (e) { return false; } };
  async function tryAuto(manual) {
    const started = Date.now(); auto = true;
    el('tjWaitTitle').textContent = 'Signing you in…';
    el('tjWaitText').textContent = 'Recognised this Windows account. One moment.';
    el('tjWaitOpen').classList.add('tj-hidden'); el('tjWaitCancel').textContent = 'Use a different account';
    setView('wait');
    let msg = '';
    try {
      const key = await desktop.deviceKey();
      if (key && auto) {
        const r = await post('/api/auth/auto-login', { key });
        if (r.ok && auto) {
          await new Promise(res => setTimeout(res, Math.max(0, 900 - (Date.now() - started))));
          if (auto) { auto = false; return success(r.j.user, 1700, !!manual); }
        }
        msg = (r.j && r.j.error) || '';
      }
    } catch (e) { msg = 'Could not reach the local server.'; }
    if (auto) { auto = false; leaveWait(homeView(), manual ? (msg || 'Automatic sign-in is not available here.') : ''); }
  }

  /* ======================================================= events ======================================================= */
  function strength(v) {
    let s = 0; if (v.length >= 8) s++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
    return v ? Math.max(1, s) : 0;
  }

  function bind() {
    gate.addEventListener('click', async e => {
      const t = e.target;
      const go = t.closest('[data-go]'); if (go) return switchTo(go.dataset.go);
      const eye = t.closest('[data-eye]');
      if (eye) { const i = el(eye.dataset.eye), reveal = i.type === 'password'; i.type = reveal ? 'text' : 'password'; eye.classList.toggle('tj-shown', reveal); return; }
      if (t.closest('#tjForgot')) return setNotice('Passwords are stored encrypted on this PC and cannot be recovered. Ask the owner of this PC to reset yours in Settings → People.');
      if (t.closest('#tjGoogleBtn')) return startGoogle('login');
      if (t.closest('#tjGoogleRegBtn')) return startGoogle('register');
      if (t.closest('#tjPcBtn')) return tryAuto(true);
      if (t.closest('#tjWaitCancel')) {
        if (flow) { const o = flow.origin; stopGoogle(); return leaveWait(o); }
        if (auto) { auto = false; try { sessionStorage.setItem('tj_no_auto', '1'); } catch (x) { /* ignore */ } return leaveWait(homeView()); }
        return;
      }
      if (t.closest('#tjFillWin')) {
        try {
          const r = await post('/api/auth/lookup-account', { provider: 'windows' });
          if (r.ok && r.j.profile) {
            const p = r.j.profile, set = (id, v) => { const i = el(id); if (i && !i.value && v) i.value = v; };
            set('tjFirst', p.firstName); set('tjLast', p.lastName); set('tjUser', p.username);
          } else showErr("Could not read this PC's profile.");
        } catch (x) { showErr('Could not reach the local server.'); }
      }
    });

    // ripple on buttons (the window may be scaled, so convert the pointer position back to layout pixels)
    gate.addEventListener('pointerdown', e => {
      const b = e.target.closest('.tj-btn'); if (!b || b.disabled) return;
      const r = b.getBoundingClientRect(), k = (r.width / b.offsetWidth) || 1, s = Math.max(b.offsetWidth, b.offsetHeight) / 4, i = document.createElement('i');
      i.className = 'tj-ripple'; i.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + ((e.clientX - r.left) / k - s / 2) + 'px;top:' + ((e.clientY - r.top) / k - s / 2) + 'px';
      b.appendChild(i); setTimeout(() => i.remove(), 650);
    });
    gate.addEventListener('input', e => {
      const f = e.target.closest && e.target.closest('.tj-field'); if (f) f.classList.remove('tj-invalid');
      if (e.target.id === 'tjPw1') { const s = strength(e.target.value); el('tjMeter').dataset.s = String(s); el('tjMeterTxt').textContent = ['', 'Weak', 'Fair', 'Good', 'Strong'][s]; }
    });

    gate.addEventListener('submit', async e => {
      e.preventDefault();
      if (entering) return;
      const f = e.target, d = Object.fromEntries(new FormData(f));
      hideBanners(true);

      if (f.id === 'tjLoginForm') {
        const idEl = el('tjIdentifier'), pwEl = el('tjPassword');
        if (!String(d.identifier || '').trim()) return showErr('Enter your username or email.', idEl);
        if (!d.password) return showErr('Enter your password.', pwEl);
        busy(el('tjLoginBtn'), true, 'Signing in…');
        try {
          const r = await post('/api/auth/login', { identifier: d.identifier.trim(), password: d.password, remember: d.remember === 'on' });
          if (!r.ok) {
            busy(el('tjLoginBtn'), false, 'Log in'); pwEl.value = ''; pwEl.focus();
            return showErr(r.j.error || 'Incorrect username/email or password.', pwEl);
          }
          try { localStorage.setItem('tj_last_user', d.identifier.trim()); } catch (x) { /* ignore */ }
          success(r.j.user);
        } catch (x) {
          busy(el('tjLoginBtn'), false, 'Log in'); showErr('Could not reach the local server. Is Traders Journal running?');
        }
        return;
      }

      if (f.id === 'tjRegForm') {
        if (!String(d.firstName || '').trim()) return showErr('Enter your first name.', el('tjFirst'));
        if (d.password !== d.password2) return showErr('The two passwords do not match.', el('tjPw2'));
        busy(el('tjRegBtn'), true, 'Creating account…');
        try {
          const r = await post('/api/auth/register', {
            firstName: d.firstName, lastName: d.lastName, username: d.username, email: d.email, password: d.password,
            remember: true, googleState: google ? google.state : undefined
          });
          if (!r.ok) { busy(el('tjRegBtn'), false, regLabel()); return showErr(r.j.error || 'Could not create the account.'); }
          try { localStorage.setItem('tj_last_user', String(d.username || '').trim()); } catch (x) { /* ignore */ }
          success(r.j.user);
        } catch (x) {
          busy(el('tjRegBtn'), false, regLabel()); showErr('Could not reach the local server.');
        }
      }
    });
    addEventListener('resize', fit);
  }

  /* ======================================================= public API ======================================================= */
  window.tjAuth = {
    user: A.authed ? A.user : null,
    lock(msg) {
      stopGoogle(); auto = false;
      try { localStorage.removeItem('tj_state'); } catch (e) { /* ignore */ }
      document.documentElement.classList.add('auth-locked');
      show({ notice: msg || '' });
    },
    async logout() {
      try { if (typeof window.flushUserState === 'function') await window.flushUserState(); } catch (e) { /* ignore */ }
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
      try { localStorage.removeItem('tj_state'); sessionStorage.setItem('tj_no_auto', '1'); } catch (e) { /* ignore */ }
      location.reload();
    },
    post,
    autoSignIn() { if (!hasPcLogin) return Promise.resolve(); if (!built) show(); return tryAuto(true); }
  };

  // a signed-in session that the server later rejects sends the person back to the sign-in window
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await nativeFetch(...args);
    if (res.status === 401 && A.authed && gate.hidden) {
      let url = '';
      try { url = typeof args[0] === 'string' ? args[0] : args[0].url; } catch (e) { /* ignore */ }
      if (url.indexOf('/api/auth/') === -1) window.tjAuth.lock('Your session ended. Please sign in again.');
    }
    return res;
  };

  if (!A.authed) {
    document.documentElement.classList.add('auth-locked');
    auto = hasPcLogin && !A.offline && !noAuto();
    if (auto) { show({ startWait: true }); tryAuto(false); }
    else show({ notice: A.offline ? 'Cannot reach the Traders Journal server on this PC. Restart the app and try again.' : '' });
  }
})();
