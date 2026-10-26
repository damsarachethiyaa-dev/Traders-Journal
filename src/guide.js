/* Traders Journal guide: the one place to learn the app, A to Z.
   - Help center: chapters on the left, a short step with an animated preview on the right.
   - Spotlight tour: the same steps shown on the real screens, one highlighted control at a time.
   - Welcome card: offered once per person after their first sign-in.
   Every step lives in CHAPTERS below; both views read from it, so adding a step is one line. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const icon = (n, s = 14) => (typeof ic === 'function' ? ic(n, s) : '');
  const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const calm = () => document.documentElement.classList.contains('reduce-motion') || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const d = s => ` style="--dl:${s}s"`;
  const CURSOR = (x0, y0, x1, y1, delay) => `<svg class="gd-cursor" viewBox="0 0 24 24" style="--x0:${x0}px;--y0:${y0}px;--x1:${x1}px;--y1:${y1}px;--dl:${delay}s"><path fill="currentColor" stroke="#000" stroke-width="1" d="M5.5 3.2v17.6c0 .45.54.67.85.35l4.4-4.5h6.9c.45 0 .67-.54.35-.85L6.35 2.85A.5.5 0 0 0 5.5 3.2z"/></svg>`;
  const CHECK = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

  /* ---------- animated previews (built from the app's own look) ---------- */
  const DEMOS = {
    welcome: () => `<div class="gd-hero"><img class="gd-p" src="media/app-logo.png" alt="">
      <div class="gd-feats">${[['list', 'Log trades', .25], ['book', 'Journal', .4], ['chartline', 'Analyze', .55], ['shield', 'Private', .7]]
        .map(([i, t, s]) => `<span class="gd-feat gd-a"${d(s)}>${icon(i, 13)}${t}</span>`).join('')}</div></div>`,
    nav: () => `<div class="gd-win gd-narrow"><div class="gd-nav">${[['grid', 'Dashboard'], ['list', 'Trade Logging'], ['sparkles', 'Daily Journal'], ['chartline', 'Analytics'], ['link', 'Connections'], ['settings', 'Settings']]
        .map(([i, t], k) => `<div class="gd-flash"${d(.3 + k * .55)}>${icon(i, 14)}${t}</div>`).join('')}</div></div>`,
    topbar: () => `<div class="gd-win"><div class="gd-top"><span class="it">${icon('panel', 15)}</span><span class="ttl">Dashboard</span>
      <span class="it fire gd-flash"${d(.3)}>${icon('flame', 14)}<span class="badge">4</span></span>
      <span class="it gd-flash"${d(.9)}>${icon('bell', 15)}<span class="badge">2</span></span>
      <span class="it gd-flash"${d(1.5)}>${icon('moon', 15)}</span><span class="it gd-flash"${d(2.1)}><span class="av"></span></span></div>
      <div class="gd-labels"><span class="gd-a"${d(.4)}>Streak</span><span class="gd-a"${d(1)}>Alerts</span><span class="gd-a"${d(1.6)}>Theme</span><span class="gd-a"${d(2.2)}>Profile</span></div></div>`,
    mt5: () => `<div class="gd-win gd-narrow"><div class="gd-wt"><span class="dots"><i></i><i></i><i></i></span>MetaTrader 5</div>
      <div class="gd-row gd-a"${d(.2)}>${icon('user', 13)}<span>Login</span><span class="r">243029</span></div>
      <div class="gd-row gd-a"${d(.4)}>${icon('link', 13)}<span>Server</span><span class="r">Broker-Live</span></div>
      <div class="gd-row gd-a"${d(.7)}><span class="gd-dot"></span><span>Connected</span><span class="r gd-g">ready</span></div></div>`,
    connect: () => `<div class="gd-win"><div class="gd-wt">${icon('shield', 13)}MetaTrader 5 add-on<span class="r gd-pill g">RECOMMENDED</span></div>
      <span class="gd-btn pri gd-press"${d(.5)}>${icon('download', 13)}Install add-on</span>
      <div style="margin-top:10px">${[['Copied into MetaTrader 5', 1.1], ['One-time code ready', 1.6]]
        .map(([t, s]) => `<div class="gd-row gd-a"${d(s)}><span class="gd-chk on"${d(s + .15)}>${CHECK}</span>${t}</div>`).join('')}
      <div class="gd-row gd-a"${d(2.1)}><span class="gd-pill b">WAITING</span>for MetaTrader</div></div>${CURSOR(260, 120, 80, 20, .1)}</div>`,
    webreq: () => `<div class="gd-win"><div class="gd-wt"><span class="dots"><i></i><i></i><i></i></span>Options · Expert Advisors</div>
      <div class="gd-row"><span class="gd-chk on"${d(.6)}>${CHECK}</span>Allow WebRequest for listed URL</div>
      <div class="gd-row" style="margin-left:24px">${icon('plus', 12)}<span class="gd-type" style="--n:21;--dl:1.1s">http://127.0.0.1:8765</span></div>
      <div style="margin-top:10px;text-align:right"><span class="gd-btn pri gd-press"${d(2.6)}>OK</span></div></div>`,
    attach: () => `<div class="gd-win" style="display:grid;grid-template-columns:196px 1fr;gap:10px;position:relative">
      <div><div class="gd-wt">${icon('list', 13)}Navigator</div><div class="gd-row gd-muted" style="font-size:10.5px">Expert Advisors</div>
      <div class="gd-row gd-flash" style="--dl:.3s;font-size:10.5px">${icon('zap', 11)}TradersJournalSync_MT5</div></div>
      <div style="border:1px dashed var(--border2);border-radius:8px;display:grid;place-items:center;min-height:110px;position:relative">
      <svg viewBox="0 0 120 50" width="80%" height="60"><polyline points="0,40 20,32 40,36 60,20 80,26 100,12 120,16" fill="none" stroke="var(--faint)" stroke-width="2"/></svg>
      <span class="gd-pill g gd-p" style="--dl:1.5s;position:absolute;top:8px;right:8px">${CHECK} CONNECTED</span></div>
      ${CURSOR(60, 70, 230, 80, .5)}</div>`,
    sync: () => `<div class="gd-win"><div class="gd-wt"><span class="gd-pill g"><span class="gd-dot"></span>LIVE</span><span class="r gd-mono">every 3s</span></div>
      ${[['US30', 'Long', '+$118.00', 'g', 2.4], ['EURUSD', 'Short', '−$35.20', 'r', 1.5], ['XAUUSD', 'Long', '+$240.50', 'g', .6]]
        .map(([s, side, p, c, t]) => `<div class="gd-row gd-a"${d(t)}><b class="gd-mono">${s}</b><span class="gd-pill ${side === 'Long' ? 'b' : 'r'}">${side.toUpperCase()}</span><span class="r gd-${c}">${p}</span></div>`).join('')}</div>`,
    hero: () => `<div class="gd-win"><div style="display:flex;align-items:baseline;justify-content:space-between"><b style="font:700 15px var(--head)">Good morning, Trader</b><span class="gd-mono" style="font-size:18px;font-weight:700">09:41</span></div>
      <div class="gd-sess" style="margin-top:12px"><span>SYD<small>Closed</small></span><span>TYO<small>Closed</small></span><span class="open"${d(.8)}>LDN<small class="gd-g">Open</small></span><span>NYC<small>Opens 4h</small></span></div>
      <div style="display:flex;gap:8px;margin-top:10px"><div class="gd-tile gd-a"${d(1.1)}><small>TODAY'S P&amp;L</small><b class="gd-g">+$320</b></div><div class="gd-tile gd-a"${d(1.25)}><small>TRADES</small><b>3</b></div><div class="gd-tile gd-a"${d(1.4)}><small>WIN STREAK</small><b>2</b></div></div></div>`,
    stats: () => `<div class="gd-win" style="width:min(480px,92%)"><div style="display:flex;gap:7px">${[['NET P&amp;L', '+$2,480', 'g', '72%'], ['WIN RATE', '62%', '', '62%'], ['PROFIT FACTOR', '1.84', '', '55%'], ['RISK : REWARD', '1:1.6', '', '64%']]
        .map(([t, v, c, w], k) => `<div class="gd-tile gd-a"${d(.15 + k * .15)}><small>${t}</small><b class="${c ? 'gd-' + c : ''}">${v}</b><div class="gd-bar"><i class="gd-w" style="--w:${w};--dl:${.5 + k * .15}s"></i></div></div>`).join('')}</div></div>`,
    chart: () => `<div class="gd-win"><div class="gd-wt">${icon('chartline', 13)}Net P&amp;L &amp; account equity</div>
      <svg viewBox="0 0 400 130" width="100%" height="130"><defs><linearGradient id="gdArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" stop-opacity=".28"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs>
      <path class="gd-a" style="--dl:1s" d="M0 110 L40 100 L80 104 L120 80 L160 86 L200 62 L240 70 L280 44 L320 50 L360 26 L400 20 L400 130 L0 130Z" fill="url(#gdArea)"/>
      <path d="M0 110 L40 100 L80 104 L120 80 L160 86 L200 62 L240 70 L280 44 L320 50 L360 26 L400 20" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" style="animation:gdDraw 1.4s .2s cubic-bezier(.22,1,.36,1) both"/>
      <circle class="gd-p" style="--dl:1.4s" cx="280" cy="44" r="5" fill="#3b82f6" stroke="#fff" stroke-width="2"/></svg>
      <div class="gd-row gd-a" style="--dl:1.7s;position:absolute;right:30px;top:52px;width:auto"><span class="gd-mono">Oct 14</span><span class="gd-g gd-mono">+$320</span></div></div>`,
    calendar: () => {
      const pat = 'wlw_ww_lw_wwl_w_wlww__lwwl_w';
      return `<div class="gd-win"><div class="gd-wt">${icon('calendar', 13)}October<span class="r gd-pill g">+$1,940</span></div><div class="gd-cal">${[...pat].map((c, k) =>
        `<i class="gd-p${c === 'w' ? ' w' : c === 'l' ? ' l' : ''}"${d(.1 + k * .03)}>${c === '_' ? '' : (c === 'w' ? '+' : '−')}</i>`).join('')}</div></div>`;
    },
    toolbar: () => `<div class="gd-win" style="width:min(470px,92%);padding-bottom:18px"><div style="display:flex;gap:7px;justify-content:flex-end">
      <span class="gd-btn gd-flash"${d(.3)}>${icon('wallet', 13)}All Accounts</span><span class="gd-btn gd-flash"${d(1)}>${icon('filter', 13)}Filter</span><span class="gd-btn gd-flash"${d(1.7)}>${icon('calendar', 13)}Last 30 Days</span></div>
      <div class="gd-a" style="--dl:2.1s;margin:8px 0 0 auto;width:150px;border:1px solid var(--border2);border-radius:9px;background:var(--card);padding:5px;box-shadow:var(--shadow)">${['Today', 'This week', 'Last 30 days', 'This year']
        .map(t => `<div style="padding:6px 8px;border-radius:6px;font-size:11px;${t === 'Last 30 days' ? 'background:var(--blue-bg);color:var(--blue);font-weight:600' : 'color:var(--muted)'}">${t}</div>`).join('')}</div></div>`,
    customize: () => `<div class="gd-win gd-narrow"><div class="gd-wt">${icon('settings', 13)}Customize dashboard</div>${[['Key numbers', 0], ['Equity curve', 0], ['Calendar', 0], ['Performance clock', 1], ['Activity heatmap', 1.6]]
        .map(([t, off]) => `<div class="gd-row"><span>${t}</span><span class="gd-sw${off ? ' off' : ''}" style="margin-left:auto;--dl:${off || 0}s"></span></div>`).join('')}</div>`,
    addtrade: () => `<div class="gd-win"><div class="gd-wt">${icon('plus', 13)}Add Trade</div><div class="gd-form">
      <div class="gd-field"><small>SYMBOL</small><span class="gd-type" style="--n:6;--dl:.3s">EURUSD</span></div>
      <div class="gd-field"><small>SIDE</small><span class="gd-pill b gd-p"${d(.8)}>LONG</span></div>
      <div class="gd-field"><small>ENTRY</small><span class="gd-type" style="--n:6;--dl:1s">1.0850</span></div>
      <div class="gd-field"><small>EXIT</small><span class="gd-type" style="--n:6;--dl:1.5s">1.0890</span></div></div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px"><span class="gd-pill g gd-p"${d(2.4)}>+$400.00</span><span class="gd-btn pri gd-press" style="margin-left:auto;--dl:2.1s">Save trade</span></div></div>`,
    table: () => `<div class="gd-win" style="width:min(480px,92%)">${[['LONG', 'XAUUSD', '+$240.50', 'g'], ['SHORT', 'EURUSD', '−$35.20', 'r'], ['LONG', 'US30', '+$118.00', 'g'], ['LONG', 'GBPJPY', '+$62.10', 'g']]
        .map(([s, sym, p, c], k) => `<div class="gd-row gd-a${k === 1 ? ' gd-sel' : ''}" style="--dl:${k === 1 ? 1.2 : .1 + k * .1}s"><span class="gd-pill ${s === 'LONG' ? 'b' : 'r'}">${s}</span><b class="gd-mono">${sym}</b><span class="r gd-${c}">${p}</span>${k === 1 ? `<span class="gd-p gd-b" style="--dl:1.4s;display:inline-flex">${icon('settings', 12)}</span>` : ''}</div>`).join('')}
      ${CURSOR(330, 150, 200, 54, .5)}</div>`,
    review: () => `<div class="gd-win"><div class="gd-wt">${icon('book', 13)}Review · XAUUSD<span class="r gd-pill g">+$240</span></div>
      <div class="gd-field" style="min-height:44px"><small>WHAT HAPPENED</small><span class="gd-type" style="--n:35;--dl:.3s;font-size:11px">Waited for the retest, then entered</span></div>
      <div class="gd-chips" style="margin-top:9px"><span class="gd-pill">FOMO</span><span class="gd-pill r gd-p"${d(2.2)}>Moved stop</span><span class="gd-pill">Early exit</span><span class="gd-pill g gd-p" style="margin-left:auto;--dl:2.6s">Entry: Great</span></div></div>`,
    streak: () => `<div><div class="gd-flame"><span class="f">${icon('flame', 30)}</span><span class="num"><span class="gd-out"${d(.9)}>3</span><span class="gd-a gd-g"${d(1.1)}>4</span></span></div>
      <div class="gd-days">${['M', 'T', 'W', 'T', 'F'].map((t, k) => `<i class="${k < 4 ? 'on' : ''} gd-p"${d(.1 + k * .15)}>${t}</i>`).join('')}</div><div class="gd-cap">Every trade reviewed today keeps the streak going</div></div>`,
    antabs: () => `<div class="gd-win"><div class="gd-tabs"><span>Performance</span><span>Edge</span><span>Behavior</span><span>Progress</span></div>
      <div class="gd-cols">${[40, 62, 35, 78, 55, 22, 70, 88, 60].map((h, k) => `<i class="gd-h${h === 22 ? ' n' : ''}" style="--h:${h}%;--dl:${.1 + k * .07}s"></i>`).join('')}</div></div>`,
    edge: () => `<div class="gd-win"><div class="gd-wt">${icon('target', 13)}Best and worst symbols</div>${[['XAUUSD', 90, '+$1,240', 0], ['US30', 55, '+$410', 0], ['EURUSD', 18, '−$120', 1], ['GBPJPY', 40, '−$380', 1]]
        .map(([s, w, v, n], k) => `<div class="gd-hb"><b class="gd-mono">${s}</b><span class="t"><i class="gd-w${n ? ' n' : ''}" style="--w:${w}%;--dl:${.2 + k * .15}s"></i></span><span class="v gd-${n ? 'r' : 'g'}">${v}</span></div>`).join('')}</div>`,
    behavior: () => `<div class="gd-win"><div class="gd-wt">${icon('activity', 13)}Habits that cost you</div>${[['Revenge trades', 70, '−$520'], ['Moved stop', 45, '−$310'], ['Early exit', 25, '−$140']]
        .map(([s, w, v], k) => `<div class="gd-hb" style="grid-template-columns:100px 1fr 56px"><span>${s}</span><span class="t"><i class="gd-w n" style="--w:${w}%;--dl:${.2 + k * .15}s"></i></span><span class="v gd-r">${v}</span></div>`).join('')}
      <div class="gd-row gd-a" style="--dl:1.2s;margin-top:12px"><span>Calm</span><span class="gd-pill g">68% wins</span><span style="margin-left:12px">Rushed</span><span class="gd-pill r">31% wins</span></div></div>`,
    profile: () => `<div class="gd-win" style="width:min(340px,88%)"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <div class="gd-p" style="flex:none;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#3b82f6)"></div>
      <div style="min-width:0"><b class="gd-a" style="--dl:.3s;display:block;font:700 15px var(--head)">Your name</b><span class="gd-pill gd-a" style="--dl:.45s;margin-top:4px">KING Founder</span></div></div>
      ${['Username', 'Email', 'Photo'].map((t, k) => `<div class="gd-row gd-a"${d(.6 + k * .12)}>${t}<span class="r gd-muted">${icon('right', 12)}</span></div>`).join('')}</div>`,
    display: () => `<div class="gd-win gd-narrow"><div class="gd-wt">${icon('settings', 13)}Comfort &amp; display</div>
      <div class="gd-row">Theme<span class="gd-swap" style="margin-left:auto"><span class="gd-out"${d(.8)}>Dark</span><span class="gd-a"${d(1)}>Light</span></span></div>
      <div class="gd-row">Interface zoom<span class="gd-swap" style="margin-left:auto"><span class="gd-out"${d(1.6)}>100%</span><span class="gd-a gd-b"${d(1.8)}>120%</span></span></div>
      <div class="gd-row">Opening sidebar<span class="r">Expanded</span></div>
      <div class="gd-row">Reduce motion<span class="gd-sw off" style="margin-left:auto;--dl:2.4s"></span></div></div>`,
    backup: () => `<div><div class="gd-file"><div class="doc fly"><span class="ic-box">${icon('download', 22)}</span>backup.json</div><div class="folder gd-p"${d(.2)}>${icon('folder', 24)}</div></div>
      <div class="gd-cap gd-a"${d(1.9)}><span class="gd-pill g">${CHECK} Backup saved</span></div></div>`,
    privacy: () => `<div><div class="gd-priv"><div class="box pc gd-a"${d(.1)}><div class="ib">${icon('lock', 20)}</div>This PC<br><span class="gd-g" style="font-size:10px">all your data</span></div>
      <div class="shield gd-p"${d(.5)}>${icon('shield', 26)}</div>
      <div class="box cloud gd-a"${d(.8)}><div class="ib">${icon('send', 20)}</div>Cloud<br><span class="gd-muted" style="font-size:10px">nothing sent</span></div></div></div>`,
    finish: () => `<div class="gd-hero"><img class="gd-p" src="media/app-logo.png" alt=""><div class="gd-feats">${[['help', 'Guide button on the dashboard', .3], ['chat', 'Help button, bottom right', .5]]
        .map(([i, t, s]) => `<span class="gd-feat gd-a"${d(s)}>${icon(i, 13)}${t}</span>`).join('')}</div></div>`
  };

  /* ---------- the guide, A to Z ----------
     page: page to open for the spotlight (an-* opens an Analytics view); settings: Settings section to open;
     sel: the control to highlight. Steps without sel show a centred card in the tour. */
  const CHAPTERS = [
    { id: 'start', name: 'Getting started', icon: 'sparkles', steps: [
      { t: 'Welcome to Traders Journal', d: 'Log trades, review them in a journal and see your real edge. <b>Everything stays on this PC.</b>', demo: 'welcome' },
      { t: 'Move between pages', d: 'The sidebar opens every page. The <b>panel button</b> at the top left hides or shows it.', demo: 'nav', page: 'dashboard', sel: '#menu' },
      { t: 'The top bar', d: 'Your review <b>streak</b>, <b>notifications</b>, the <b>light/dark</b> switch and your <b>profile</b>.', demo: 'topbar', page: 'dashboard', sel: '.top-right' }
    ] },
    { id: 'connect', name: 'Connect MetaTrader 5', icon: 'link', steps: [
      { t: 'Open MetaTrader 5', d: 'Traders Journal can open it for you: use <b>Open MetaTrader 5</b> on Connections, or leave the start-up switch on. Log in to your broker as usual.', demo: 'mt5', page: 'connect', sel: '#bOpenMt5' },
      { t: 'Install the add-on', d: 'On <b>Connections</b>, press <b>Install add-on</b>. It goes into MetaTrader 5 with a one-time code, so you never type one.', demo: 'connect', page: 'connect', sel: '#bAddonInstall' },
      { t: 'Let it talk to this app', d: 'In MT5: <b>Tools → Options → Expert Advisors</b>, tick <b>Allow WebRequest</b> and add <b>http://127.0.0.1:8765</b>.', demo: 'webreq', page: 'connect', sel: '#addonStep2' },
      { t: 'Start it on any chart', d: 'Drag <b>TradersJournalSync_MT5</b> from the Navigator onto any chart and tick <b>Allow Algo Trading</b>.', demo: 'attach', page: 'connect', sel: '#addonStep3' },
      { t: 'Trades arrive live', d: 'When the badge says <b>Connected</b>, closed trades appear within seconds. Repeat step 4 in each MT5 you use.', demo: 'sync', page: 'connect', sel: '#addonState' }
    ] },
    { id: 'dashboard', name: 'Dashboard', icon: 'grid', steps: [
      { t: 'Today at a glance', d: 'Time, market sessions, your agenda, a pre-trade checklist and today\'s P&amp;L.', demo: 'hero', page: 'dashboard', sel: '#hero' },
      { t: 'Key numbers', d: 'Net P&amp;L, win rate, profit factor, equity and risk:reward for the dates you pick.', demo: 'stats', page: 'dashboard', sel: '#sec-stats' },
      { t: 'Equity curve', d: 'Your account growth over time. <b>Hover</b> the chart to see any day.', demo: 'chart', page: 'dashboard', sel: '#sec-chart' },
      { t: 'Trading calendar', d: 'Green days won, red days lost. <b>Click a day</b> to see or add its trades.', demo: 'calendar', page: 'dashboard', sel: '#sec-calendar' },
      { t: 'Account, filter and dates', d: 'Switch MT5 account, filter trades and change the date range. Every number follows.', demo: 'toolbar', page: 'dashboard', sel: '.toolbar .right' },
      { t: 'Make it yours', d: '<b>Customize</b> shows or hides any dashboard section.', demo: 'customize', page: 'dashboard', sel: '#bCust' }
    ] },
    { id: 'logging', name: 'Trade Logging', icon: 'list', steps: [
      { t: 'Add a trade by hand', d: 'Press <b>Add Trade</b>, fill symbol, side, entry, exit and size, then save. P&amp;L is worked out for you.', demo: 'addtrade', page: 'logging', sel: '#page-logging .page-head' },
      { t: 'All your trades', d: 'Every trade in one table. <b>Click a row</b> to edit or delete it.', demo: 'table', page: 'logging', sel: '#page-logging table.tbl' }
    ] },
    { id: 'journal', name: 'Daily Journal', icon: 'book', steps: [
      { t: 'Pick a trade to review', d: 'Search or filter on the left, then pick a trade. <b>CSV import</b> brings in trades from a file.', demo: 'table', page: 'journal', sel: '.dj-trades' },
      { t: 'Write your review', d: 'Note what happened, tag mistakes, rate the entry and add chart screenshots.', demo: 'review', page: 'journal', sel: '.dj-review' },
      { t: 'Keep the streak', d: 'Review every trade of the day to grow your streak. It shows in the top bar.', demo: 'streak', page: 'journal', sel: '#pFire' }
    ] },
    { id: 'analytics', name: 'Analytics', icon: 'chartline', steps: [
      { t: 'Four views', d: '<b>Performance</b>, <b>Edge</b>, <b>Behavior</b> and <b>Progress</b>. Switch with the tabs.', demo: 'antabs', page: 'an-performance', sel: '#page-analytics .an-tabs' },
      { t: 'Find your edge', d: 'Edge shows which symbols, sessions and setups make or lose you money.', demo: 'edge', page: 'an-edge', sel: '#page-analytics .an-tabs' },
      { t: 'Fix costly habits', d: 'Behavior shows the mistakes and moods behind your losses, from your journal tags.', demo: 'behavior', page: 'an-behavior', sel: '#page-analytics .an-tabs' }
    ] },
    { id: 'settings', name: 'Settings & privacy', icon: 'settings', steps: [
      { t: 'Your profile', d: 'Name, photo and sign-in. Click your name in the sidebar to open it any time.', demo: 'profile', settings: 'profile', sel: '#profile' },
      { t: 'Display and comfort', d: 'Theme, <b>interface zoom</b> (120% by default), opening sidebar and reduce motion live in <b>Account</b>.', demo: 'display', settings: 'account', sel: '#settingsNav [data-settings-tab="account"]' },
      { t: 'Back up your journal', d: '<b>Privacy &amp; data</b> downloads a backup file and restores it on any PC.', demo: 'backup', settings: 'security', sel: '#settingsNav [data-settings-tab="security"]' },
      { t: 'Private by design', d: 'Trades, notes and logins never leave this PC. Your broker password is never stored here.', demo: 'privacy' },
      { t: 'You\'re all set', d: 'Open this guide any time with <b>Guide</b> on the dashboard or the <b>help button</b> at the bottom right.', demo: 'finish', page: 'dashboard', sel: '#bTour' }
    ] }
  ];

  /* ---------- progress (per person on this PC) ---------- */
  const doneKey = () => 'tj_guide_done_' + (window.TJ_USER_ID || 'local');
  const readDone = () => { try { return JSON.parse(localStorage.getItem(doneKey()) || '[]'); } catch (e) { return []; } };
  function markDone(id) {
    const done = readDone(); if (done.includes(id)) return;
    done.push(id); try { localStorage.setItem(doneKey(), JSON.stringify(done)); } catch (e) { /* storage blocked */ }
  }

  /* ---------- help center ---------- */
  let ov = null, ci = 0, si = 0, replayTimer = null;
  function build() {
    if (ov) return;
    ov = document.createElement('div');
    ov.className = 'overlay gd-ov'; ov.id = 'gdOv';
    ov.innerHTML = `<div class="modal gd-box" role="dialog" aria-modal="true" aria-labelledby="gdTitle">
      <aside class="gd-side"><div class="gd-brand"><img src="media/app-logo.png" alt=""><div><b>Guide</b><small>Traders Journal, A to Z</small></div></div>
        <nav class="gd-chapters" id="gdChapters"></nav>
        <div class="gd-side-foot"><div class="gd-progress"><span>Chapters done</span><b id="gdDoneN"></b></div>
          <button class="btn pri" id="gdTour">${icon('play', 13)}Take the full tour</button>
          <button class="btn gh" id="gdFilm">${icon('youtube', 13)}Watch the app film</button></div></aside>
      <section class="gd-main"><div class="gd-head"><span class="gd-kick" id="gdKick"></span><button class="gd-x" id="gdX" aria-label="Close guide">${icon('x', 16)}</button></div>
        <div class="gd-segs" id="gdSegs"></div><div class="gd-stage" id="gdStage"></div>
        <div class="gd-text"><h3 id="gdTitle"></h3><p id="gdDesc"></p></div>
        <div class="gd-foot"><button class="btn gh" id="gdBack">${icon('left', 13)}Back</button><span class="sp"></span>
          <button class="btn gh" id="gdShow">${icon('target', 13)}Show me</button><button class="btn pri" id="gdNext"></button></div></section></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    $('#gdX').onclick = close;
    $('#gdBack').onclick = () => move(-1);
    $('#gdNext').onclick = () => move(1);
    $('#gdShow').onclick = () => { const c = ci, s = si; close(); tour(chapterSteps(c, s)); };
    $('#gdTour').onclick = () => { close(); tour(allSteps()); };
    $('#gdFilm').onclick = playFilm;
    $('#gdChapters').onclick = e => { const b = e.target.closest('[data-ch]'); if (b) { ci = +b.dataset.ch; si = 0; render(); } };
    $('#gdSegs').onclick = e => { const b = e.target.closest('[data-st]'); if (b) { si = +b.dataset.st; render(); } };
  }
  function renderStage() {
    const st = CHAPTERS[ci].steps[si];
    $('#gdStage').innerHTML = `<button class="gd-replay" id="gdReplay">${icon('refresh', 11)}Replay</button>${DEMOS[st.demo] ? DEMOS[st.demo]() : ''}`;
    $('#gdReplay').onclick = renderStage;
  }
  function render() {
    const ch = CHAPTERS[ci], st = ch.steps[si];
    if (si === ch.steps.length - 1) markDone(ch.id);
    const doneNow = readDone();
    $('#gdChapters').innerHTML = CHAPTERS.map((c, k) => `<button class="gd-ch${k === ci ? ' on' : ''}${doneNow.includes(c.id) ? ' done' : ''}" data-ch="${k}" style="--k:${k}">
      <span class="n">${doneNow.includes(c.id) && k !== ci ? icon('check', 12) : icon(c.icon, 12)}</span><span class="t">${c.name}</span><small>${c.steps.length}</small></button>`).join('');
    $('#gdDoneN').textContent = doneNow.filter(id => CHAPTERS.some(c => c.id === id)).length + ' / ' + CHAPTERS.length;
    $('#gdKick').textContent = `${ch.name} · Step ${si + 1} of ${ch.steps.length}`;
    $('#gdSegs').innerHTML = ch.steps.map((_, k) => `<i class="${k < si ? 'done' : k === si ? 'on' : ''}" data-st="${k}" title="Step ${k + 1}"></i>`).join('');
    $('#gdTitle').textContent = st.t;
    $('#gdDesc').innerHTML = st.d;
    // restart the text animation for each step
    for (const el of [$('#gdTitle'), $('#gdDesc')]) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
    renderStage();
    const first = ci === 0 && si === 0, last = ci === CHAPTERS.length - 1 && si === ch.steps.length - 1;
    $('#gdBack').hidden = first;
    $('#gdShow').hidden = !st.sel;
    $('#gdNext').innerHTML = last ? `Finish ${icon('check', 13)}` : si === ch.steps.length - 1 ? `Next: ${CHAPTERS[ci + 1].name} ${icon('right', 13)}` : `Next ${icon('right', 13)}`;
  }
  function move(dir) {
    const n = CHAPTERS[ci].steps.length;
    if (dir > 0) {
      if (si < n - 1) si++;
      else if (ci < CHAPTERS.length - 1) { ci++; si = 0; }
      else return close();
    } else {
      if (si > 0) si--;
      else if (ci > 0) { ci--; si = CHAPTERS[ci].steps.length - 1; }
    }
    render();
  }
  function playFilm() {
    $('#gdStage').innerHTML = '<video class="gd-video" src="media/traders-journal-promo.mp4" poster="media/traders-journal-poster.jpg" controls autoplay></video>';
    $('#gdKick').textContent = 'The Traders Journal film';
  }
  function open(chapter, step) {
    endTour(true); build();
    const k = typeof chapter === 'string' ? CHAPTERS.findIndex(c => c.id === chapter) : chapter;
    if (k >= 0 && k < CHAPTERS.length) { ci = k; si = Math.min(Math.max(0, step | 0), CHAPTERS[k].steps.length - 1); }
    render();
    ov.classList.add('open');
    clearInterval(replayTimer);
    if (!calm()) replayTimer = setInterval(() => { if (ov.classList.contains('open') && !$('#gdStage video') && !document.hidden) renderStage(); }, 7000);
    setTimeout(() => { const n = $('#gdNext'); if (n) n.focus(); }, 50);
  }
  function close() {
    clearInterval(replayTimer);
    if (!ov) return;
    const v = $('#gdStage video'); if (v) v.pause();
    ov.classList.remove('open');
  }

  /* ---------- spotlight tour ---------- */
  let T = null; // { list, i, raf, restoreCollapsed }
  const allSteps = () => CHAPTERS.flatMap((c, k) => c.steps.map((s, j) => ({ c: k, s: j })));
  const chapterSteps = (c, from) => CHAPTERS[c].steps.map((s, j) => ({ c, s: j })).slice(from || 0);
  function curPageIs(page) {
    if (typeof S === 'undefined') return false;
    if (page.indexOf('an-') === 0) return S.page === 'analytics' && S.anTab === page.slice(3);
    return S.page === page;
  }
  function openFor(st) {
    if (st.settings && typeof openSettings === 'function') {
      if (typeof S !== 'undefined' && S.page === 'settings' && typeof settingsTab !== 'undefined' && settingsTab === st.settings) return false;
      openSettings(st.settings); return true;
    }
    if (st.page && typeof go === 'function' && !curPageIs(st.page)) { go(st.page); return true; }
    return false;
  }
  function targetOf(sel) {
    if (!sel) return null;
    let el = document.querySelector(sel);
    if (!el) return null;
    if (el.matches('input') && el.closest('label')) el = el.closest('label'); // highlight a switch with its words
    const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    if (!visible(el)) el = el.closest('label') || el.parentElement;
    return el && visible(el) ? el : null;
  }
  function tourDom() {
    if ($('#gdRing')) return;
    document.body.insertAdjacentHTML('beforeend', '<div id="gdBlock"></div><div id="gdRing" class="none"></div><div id="gdCard" role="dialog" aria-live="polite"></div>');
    $('#gdBlock').addEventListener('mousedown', e => e.preventDefault());
  }
  function tour(list) {
    close(); endTour(true);
    if (!list || !list.length) return;
    tourDom();
    T = { list, i: 0, el: null, raf: 0, restoreCollapsed: false };
    show();
    const loop = () => { if (!T) return; place(); T.raf = requestAnimationFrame(loop); };
    T.raf = requestAnimationFrame(loop);
  }
  function show() {
    const { c, s } = T.list[T.i], ch = CHAPTERS[c], st = ch.steps[s];
    if (s === ch.steps.length - 1) markDone(ch.id);
    const moved = openFor(st);
    const card = $('#gdCard');
    card.innerHTML = `<div class="k">${ch.name}</div><h4>${st.t}</h4><p>${st.d}</p>
      <div class="bar"><i style="width:${(T.i + 1) / T.list.length * 100}%"></i></div>
      <div class="ft"><span class="n">${T.i + 1} / ${T.list.length}</span><button class="btn gh" data-gd="end">End tour</button>
      ${T.i ? '<button class="btn gh" data-gd="back">Back</button>' : ''}<button class="btn pri" data-gd="next">${T.i === T.list.length - 1 ? 'Done' : 'Next'}</button></div>`;
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    card.onclick = e => { const b = e.target.closest('[data-gd]'); if (!b) return; const a = b.dataset.gd; if (a === 'next') next(); else if (a === 'back') back(); else endTour(); };
    T.el = null;
    const find = () => {
      if (!T) return;
      const el = targetOf(st.sel);
      if (el && el.closest('#sidebar') && document.body.classList.contains('collapsed')) { document.body.classList.remove('collapsed'); T.restoreCollapsed = true; }
      T.el = el;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > innerHeight - 20) {
          const top = r.height > innerHeight - 180 ? r.top + scrollY - 80 : r.top + scrollY - (innerHeight - r.height) / 2;
          window.scrollTo({ top: Math.max(0, top), behavior: calm() ? 'auto' : 'smooth' });
        }
      }
      const n = card.querySelector('[data-gd="next"]'); if (n) n.focus();
    };
    moved ? setTimeout(find, 320) : find();
  }
  function place() {
    const ring = $('#gdRing'), card = $('#gdCard');
    if (!ring || !card) return;
    const cw = card.offsetWidth, chh = card.offsetHeight, m = 12;
    if (!T.el || !document.body.contains(T.el)) {
      ring.classList.add('none');
      card.style.left = Math.round((innerWidth - cw) / 2) + 'px';
      card.style.top = Math.round((innerHeight - chh) / 2) + 'px';
      return;
    }
    ring.classList.remove('none');
    const r = T.el.getBoundingClientRect(), pad = 6;
    const top = Math.max(6, r.top - pad), bottom = Math.min(innerHeight - 6, r.bottom + pad);
    const left = Math.max(6, r.left - pad), right = Math.min(innerWidth - 6, r.right + pad);
    Object.assign(ring.style, { left: left + 'px', top: top + 'px', width: Math.max(0, right - left) + 'px', height: Math.max(0, bottom - top) + 'px' });
    let x, y;
    if (bottom + m + chh < innerHeight) { y = bottom + m; x = left; }                       // below
    else if (top - m - chh > 0) { y = top - m - chh; x = left; }                            // above
    else if (right + m + cw < innerWidth) { x = right + m; y = top; }                       // right
    else if (left - m - cw > 0) { x = left - m - cw; y = top; }                             // left
    else { x = innerWidth - cw - 20; y = innerHeight - chh - 20; }                          // big target: corner
    card.style.left = Math.round(Math.min(Math.max(m, x), innerWidth - cw - m)) + 'px';
    card.style.top = Math.round(Math.min(Math.max(m, y), innerHeight - chh - m)) + 'px';
  }
  function next() { if (!T) return; if (T.i >= T.list.length - 1) return endTour(); T.i++; show(); }
  function back() { if (!T || !T.i) return; T.i--; show(); }
  function endTour(silent) {
    if (!T) return;
    cancelAnimationFrame(T.raf);
    if (T.restoreCollapsed) document.body.classList.add('collapsed');
    const full = T.list.length === allSteps().length;
    T = null;
    for (const id of ['gdBlock', 'gdRing', 'gdCard']) { const e = document.getElementById(id); if (e) e.remove(); }
    if (!silent && full && typeof go === 'function' && !curPageIs('dashboard')) go('dashboard');
  }

  /* ---------- welcome card (once per person, after signing in) ---------- */
  function welcome() {
    const key = 'tj_guide_welcomed_' + (window.TJ_USER_ID || 'local');
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) { return; }
    const name = (window.TJ_AUTH && window.TJ_AUTH.user && window.TJ_AUTH.user.firstName) || '';
    const w = document.createElement('div');
    w.className = 'overlay gd-ov open';
    w.innerHTML = `<div class="modal gd-welcome" role="dialog" aria-modal="true" aria-labelledby="gdWTitle"><img src="media/app-logo.png" alt="">
      <h3 id="gdWTitle">Welcome${name ? ', ' + escH(name) : ''}</h3><p>Take a 2-minute tour of every page, or open the guide and learn at your own pace.</p>
      <div class="acts"><button class="btn pri" data-w="tour">${icon('play', 13)}Take the tour</button><button class="btn gh" data-w="guide">${icon('book', 13)}Open the guide</button></div>
      <button class="later" data-w="later">Maybe later</button></div>`;
    document.body.appendChild(w);
    const done = () => w.remove();
    w.addEventListener('click', e => {
      const b = e.target.closest('[data-w]');
      if (!b && e.target !== w) return;
      done();
      if (b && b.dataset.w === 'tour') tour(allSteps());
      else if (b && b.dataset.w === 'guide') open(0, 0);
    });
    setTimeout(() => { const b = w.querySelector('[data-w="tour"]'); if (b) b.focus(); }, 60);
  }

  /* ---------- keyboard and entry points ---------- */
  document.addEventListener('keydown', e => {
    if (T) {
      if (e.key === 'Escape') { e.preventDefault(); endTour(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      return;
    }
    if (!ov || !ov.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight' && !e.target.closest('video')) move(1);
    else if (e.key === 'ArrowLeft' && !e.target.closest('video')) move(-1);
  });
  const wire = (sel, fn) => { const el = $(sel); if (el) el.addEventListener('click', fn); };
  wire('#bTour', () => open());
  wire('#cnTutBtn', () => open('connect', 0));
  wire('#chat', () => open());

  window.TJGuide = { open, close: () => { close(); endTour(true); }, tour: id => tour(id ? chapterSteps(CHAPTERS.findIndex(c => c.id === id), 0) : allSteps()), welcome, chapters: CHAPTERS };
})();
