// Traders Journal local backend: serves the dashboard and implements the MetaTrader sync API
// used by TradersJournalSync_MT5.mq5 (pair / heartbeat / trades / offline).
// Run:  node server.js        (default http://127.0.0.1:8765)
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = +process.env.PORT || 8765;
const HOST = '127.0.0.1';
const ROOT = __dirname;
function getWritableDataDir() {
  if (process.env.TJ_DATA && !process.env.TJ_DATA.includes('app.asar')) {
    return process.env.TJ_DATA;
  }
  const localProject = 'C:\\GPT\\local\\data';
  if (fs.existsSync(localProject)) return localProject;
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\', 'AppData', 'Roaming');
  return path.join(appData, 'Traders Journal', 'data');
}
const DATA_DIR = getWritableDataDir();
const DB_FILE = path.join(DATA_DIR, 'db.json');
const EA_TEMPLATE = path.join(ROOT, 'connector', 'TradersJournalSync_MT5.mq5');
const HEARTBEAT_S = 60, RECONCILE_S = 900, ONLINE_MS = 150000, CODE_TTL_MS = 30 * 60 * 1000;

const mt5SyncLogs = [
  { time: 'Ready', text: 'Local MetaTrader 5 engine ready', type: 'info' }
];
function addMt5Log(text, type = 'ok') {
  const now = new Date();
  const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
  mt5SyncLogs.unshift({ time: timeStr, text, type });
  if (mt5SyncLogs.length > 20) mt5SyncLogs.pop();
}

let db = { version: 1, connections: [], trades: {}, deletedAccounts: [] };
function loadDb() {
  const candidates = [DB_FILE, 'C:\\GPT\\local\\data\\db.json'];
  for (const f of candidates) {
    if (!f.includes('app.asar') && fs.existsSync(f)) {
      try {
        const raw = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            db = Object.assign(db, parsed);
            if (!Array.isArray(db.deletedAccounts)) db.deletedAccounts = [];
            if (Array.isArray(db.connections) && db.connections.length > 0) break;
          }
        }
      } catch (e) {
        console.error('Failed reading candidate db file', f, e.message);
      }
    }
  }
  if (!Array.isArray(db.deletedAccounts)) db.deletedAccounts = [];
}
loadDb();

const runs = {}; // in-memory snapshot tracking per connection
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = JSON.stringify(db, null, 2);
    const targets = new Set();
    if (!DB_FILE.includes('app.asar')) targets.add(DB_FILE);
    const projDb = 'C:\\GPT\\local\\data\\db.json';
    if (!projDb.includes('app.asar') && fs.existsSync('C:\\GPT\\local\\data')) targets.add(projDb);
    for (const f of targets) {
      try {
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, data);
      } catch (e) {
        console.error('save failed for', f, e.message);
      }
    }
  }, 150);
}
const bump = () => { db.version++; save(); };
const now = () => Date.now();

function send(res, code, obj, extra) {
  const b = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {}));
  res.end(b);
}
function readBody(req) {
  return new Promise((ok, no) => {
    const a = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 25e6) { no(Object.assign(new Error('payload too large'), { status: 413 })); req.destroy(); } else a.push(c); });
    req.on('end', () => {
      try { const s = Buffer.concat(a).toString('utf8').replace(/\u0000/g, ''); ok(s.trim() ? JSON.parse(s) : {}); }
      catch (e) { no(Object.assign(new Error('invalid JSON'), { status: 400 })); }
    });
    req.on('error', no);
  });
}

function statusOf(c) {
  if (c.token === 'direct-local-token') {
    if (c.account && c.account.source === 'local_history') return 'online';
    return now() - (c.lastSeen || 0) < 20000 ? 'online' : 'offline';
  }
  if (!c.token) return c.codeExpires && now() > c.codeExpires ? 'expired' : 'pending';
  return now() - (c.lastSeen || 0) < ONLINE_MS ? 'online' : 'offline';
}
function pub(c) {
  const T = db.trades[c.id] || {};
  const list = Object.values(T);
  const isLive = !!(c.isLiveTerminal || (c.account && c.account.source === 'live_terminal'));
  return {
    id: c.id, name: c.name, platform: c.platform, status: statusOf(c), account: c.account || null,
    isLiveTerminal: isLive,
    createdAt: c.createdAt, pairedAt: c.pairedAt || null, lastSeen: c.lastSeen || null, lastSyncAt: c.lastSyncAt || null,
    syncEnabled: c.syncEnabled, syncOpenPositions: c.syncOpenPositions, importStartDate: c.importStartDate || '',
    tradeCount: list.filter(t => t.status !== 'open').length, openCount: list.filter(t => t.status === 'open').length,
    code: c.token ? null : c.code, codeExpires: c.token ? null : c.codeExpires, terminalBuild: c.terminalBuild || null,
    syncRequestVersion: c.syncRequestVersion, completedVersion: c.completedVersion || 0
  };
}
function settings(c) {
  return {
    heartbeatIntervalSeconds: HEARTBEAT_S, reconcileIntervalSeconds: RECONCILE_S,
    importStartDate: c.importStartDate || '', importEndDate: '',
    syncOpenPositions: !!c.syncOpenPositions, syncEnabled: !!c.syncEnabled, syncRequestVersion: c.syncRequestVersion | 0
  };
}
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const nnum = v => (v === null || v === undefined || v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
function genCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
  const b = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) s += A[b[i] % A.length];
  return s.slice(0, 4) + '-' + s.slice(4);
}
function authConn(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!t) return null;
  return db.connections.find(c => c.token && c.token.length === t.length && crypto.timingSafeEqual(Buffer.from(c.token), Buffer.from(t))) || null;
}
function touch(c, b) {
  c.lastSeen = now();
  if (b && b.account && typeof b.account === 'object') c.account = Object.assign({}, c.account, b.account);
  if (b && b.terminalBuild) c.terminalBuild = num(b.terminalBuild);
}

async function handleEA(req, res, pathname) {
  const b = await readBody(req);
  if (pathname === '/api/metatrader/pair') {
    const code = String(b.code || '').trim().toUpperCase();
    const c = db.connections.find(x => x.code === code);
    if (!code || !c) return send(res, 404, { error: 'Unknown connection code. Generate a new one in the dashboard.' });
    if (c.token && c.deviceId !== b.deviceId) return send(res, 409, { error: 'This code was already used by another terminal.' });
    if (!c.token && now() > c.codeExpires) return send(res, 410, { error: 'Connection code expired. Generate a new one.' });
    if (b.platform && b.platform !== c.platform) return send(res, 400, { error: 'This code was generated for ' + c.platform.toUpperCase() + ', not ' + String(b.platform).toUpperCase() + '.' });
    if (!c.token) { c.token = crypto.randomBytes(24).toString('hex'); c.pairedAt = now(); }
    c.deviceId = String(b.deviceId || '');
    touch(c, b);
    bump();
    console.log('[pair]', c.name, b.account && b.account.login, b.account && b.account.server);
    return send(res, 200, Object.assign({ token: c.token }, settings(c)));
  }
  const c = authConn(req);
  if (!c) return send(res, 401, { error: 'Connection revoked or invalid token.' });
  if (pathname === '/api/metatrader/heartbeat') {
    touch(c, b); save();
    return send(res, 200, settings(c));
  }
  if (pathname === '/api/metatrader/offline') {
    c.lastSeen = 0; if (b.account) c.account = Object.assign({}, c.account, b.account); bump();
    console.log('[offline]', c.name);
    return send(res, 200, { ok: true });
  }
  if (pathname === '/api/metatrader/trades') {
    if (!c.syncEnabled) return send(res, 200, Object.assign({ ok: true, paused: true }, settings(c)));
    touch(c, b);
    if (!Array.isArray(b.trades)) return send(res, 422, { error: 'trades must be an array' });
    const T = db.trades[c.id] || (db.trades[c.id] = {});
    const run = runs[c.id] && runs[c.id].id === b.runId ? runs[c.id] : (runs[c.id] = { id: b.runId, seen: {}, batches: new Set() });
    let accepted = 0;
    for (const t of b.trades) {
      if (!t || t.externalId === undefined || !t.symbol) continue;
      const id = String(t.externalId);
      const side = String(t.side || '').toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';
      const status = t.status === 'open' ? 'open' : 'closed';
      const entryTime = new Date(t.entryTime);
      if (isNaN(entryTime)) continue;
      const exitTime = t.exitTime ? new Date(t.exitTime) : null;
      T[id] = {
        externalId: id, symbol: String(t.symbol), side, status,
        entryTime: entryTime.toISOString(), exitTime: exitTime && !isNaN(exitTime) ? exitTime.toISOString() : null,
        entryPrice: num(t.entryPrice), exitPrice: nnum(t.exitPrice), quantity: num(t.quantity),
        profit: num(t.profit), commission: num(t.commission), swap: num(t.swap),
        stopLoss: nnum(t.stopLoss), takeProfit: nnum(t.takeProfit), comment: String(t.comment || '').slice(0, 500),
        receivedAt: now()
      };
      run.seen[id] = 1; accepted++;
    }
    run.batches.add(num(b.batchIndex));
    if (b.snapshot && run.batches.size >= Math.max(1, num(b.batchCount))) {
      let removed = 0;
      for (const id of Object.keys(T)) if (!run.seen[id]) { delete T[id]; removed++; }
      c.lastSyncAt = now(); c.completedVersion = num(b.requestVersion);
      delete runs[c.id];
      console.log('[sync]', c.name, 'trades:', Object.keys(T).length, removed ? '(removed ' + removed + ')' : '');
    }
    bump();
    return send(res, 200, Object.assign({ ok: true, accepted }, settings(c)));
  }
  return send(res, 404, { error: 'unknown endpoint' });
}

async function handleApp(req, res, url) {
  const p = url.pathname, m = req.method;
  if (p === '/api/health') return send(res, 200, { ok: true, version: db.version });
  if (p.startsWith('/api/gcal/')) return require('./gcal.js').handle(req, res, url, { db, save, bump, send, readBody });
  if (p === '/api/state' && m === 'GET') {
    const v = +url.searchParams.get('v');
    const out = { version: db.version, serverTime: now(), connections: db.connections.map(pub) };
    if (v !== db.version) {
      out.trades = [];
      for (const c of db.connections) for (const t of Object.values(db.trades[c.id] || {})) out.trades.push(Object.assign({ connId: c.id, connName: c.name }, t));
    }
    return send(res, 200, out);
  }
  if (p === '/api/direct-sync' && m === 'POST') {
    const b = await readBody(req);
    const acc = b.account || {};
    if (!acc.login) return send(res, 400, { error: 'Missing MT5 account login' });
    const login = String(acc.login);
    if (!Array.isArray(db.deletedAccounts)) db.deletedAccounts = [];
    if (db.deletedAccounts.includes(login) && !b.force) {
      return send(res, 200, { ok: true, skipped: true, reason: 'account_deleted' });
    }
    if (b.force && db.deletedAccounts.includes(login)) {
      db.deletedAccounts = db.deletedAccounts.filter(x => x !== login);
    }
    const serverName = acc.server || 'MetaTrader 5';
    const connId = 'mt5-' + login;
    const isLive = b.isLiveTerminal !== undefined ? !!b.isLiveTerminal : (acc.source !== 'local_history');
    if (isLive) {
      db.connections.forEach(x => {
        if (x.id && x.id.startsWith('mt5-') && x.id !== connId) x.isLiveTerminal = false;
      });
    }
    let c = db.connections.find(x => x.id === connId);
    if (!c) {
      c = {
        id: connId,
        name: `${serverName} (${login})`,
        platform: 'mt5',
        token: 'direct-local-token',
        deviceId: 'local-direct',
        isLiveTerminal: isLive,
        account: acc,
        createdAt: now(),
        pairedAt: now(),
        lastSeen: now(),
        lastSyncAt: now(),
        syncEnabled: true,
        syncOpenPositions: true,
        syncRequestVersion: 0,
        completedVersion: 1,
        importStartDate: ''
      };
      db.connections.push(c);
    } else {
      c.account = Object.assign({}, c.account, acc);
      c.isLiveTerminal = isLive;
      c.lastSeen = now();
      c.lastSyncAt = now();
      c.name = `${serverName} (${login})`;
    }
    if (Array.isArray(b.trades)) {
      const T = (db.trades[connId] = {});
      for (const t of b.trades) {
        if (!t || t.externalId === undefined) continue;
        const id = String(t.externalId);
        T[id] = Object.assign({ receivedAt: now() }, t, { externalId: id });
      }
      c.tradeCount = Object.values(T).filter(t => t.status !== 'open').length;
      c.openCount = Object.values(T).filter(t => t.status === 'open').length;
    }
    bump();
    return send(res, 200, { ok: true, connection: pub(c), count: b.trades ? b.trades.length : 0 });
  }
  if (p === '/api/local-mt5/status' && m === 'GET') {
    const mt5Conns = db.connections.filter(x => x.id && x.id.startsWith('mt5-'));
    const liveConn = mt5Conns.find(x => x.isLiveTerminal || (x.account && x.account.source === 'live_terminal')) || mt5Conns[0] || null;
    return send(res, 200, {
      autoSync: isAutoSyncEnabled,
      workerRunning: !!mt5Worker,
      connection: liveConn ? pub(liveConn) : null,
      accounts: mt5Conns.map(pub),
      logs: mt5SyncLogs
    });
  }
  if ((p === '/api/local-mt5/sync' || p === '/api/local-mt5/auto-connect') && m === 'POST') {
    const isAutoConnect = p === '/api/local-mt5/auto-connect';
    addMt5Log(isAutoConnect ? 'Running PowerShell / Python Multi-Account Auto-Connect...' : 'Manual sync requested by user', 'info');
    const pyExe = findLocalPath('.venv/Scripts/python.exe');
    const pyScript = findLocalPath('tools/mt5_sync.py');
    const psScript = findLocalPath('tools/auto_connect_mt5.ps1');
    if (!fs.existsSync(pyScript)) {
      addMt5Log('Sync script not found', 'err');
      return send(res, 500, { error: 'Sync tools not found' });
    }
    try {
      const runCmd = isAutoConnect && fs.existsSync(psScript)
        ? { exe: 'powershell.exe', args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScript] }
        : { exe: fs.existsSync(pyExe) ? pyExe : getPythonExe(), args: [pyScript, '--scan-all'] };

      require('child_process').execFile(runCmd.exe, runCmd.args, { cwd: path.dirname(pyScript), windowsHide: true, timeout: 25000 }, (err, stdout, stderr) => {
        const outStr = String(stdout || '').trim();
        const errStr = String(stderr || '').trim();
        if (outStr) {
          outStr.split(/\r?\n/).forEach(line => {
            const clean = line.trim();
            if (clean && !clean.startsWith('=')) addMt5Log(clean, clean.startsWith('[-]') ? 'err' : 'ok');
          });
        }
        if (err && !outStr) {
          addMt5Log('Sync error: ' + (errStr || err.message), 'err');
        } else {
          addMt5Log('Multi-account scan & sync completed successfully', 'ok');
        }
        const mt5Conns = db.connections.filter(x => x.id && x.id.startsWith('mt5-')).map(pub);
        if (!res.headersSent) {
          send(res, 200, {
            ok: !err || mt5Conns.length > 0,
            output: outStr || errStr || 'Multi-account sync finished.',
            accounts: mt5Conns
          });
        }
      });
      return;
    } catch (e) {
      addMt5Log('Sync failed to launch: ' + e.message, 'err');
      return send(res, 500, { error: e.message });
    }
  }
  if (p === '/api/local-mt5/open-shell' && m === 'POST') {
    const b = await readBody(req);
    const shell = b.shell === 'cmd' ? 'cmd' : 'powershell';
    const psScript = findLocalPath('tools/auto_connect_mt5.ps1');
    const pyExe = findLocalPath('.venv/Scripts/python.exe');
    const pyScript = findLocalPath('tools/mt5_sync.py');
    try {
      if (shell === 'powershell') {
        require('child_process').spawn('cmd.exe', ['/c', 'start', 'powershell.exe', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', psScript], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      } else {
        require('child_process').spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `"${pyExe}" "${pyScript}" --scan-all`], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      }
      addMt5Log(`Launched ${shell.toUpperCase()} auto-connect terminal`, 'info');
      return send(res, 200, { ok: true });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  }
  if (p === '/api/local-mt5/toggle-auto' && m === 'POST') {
    const b = await readBody(req);
    isAutoSyncEnabled = !!b.enabled;
    if (isAutoSyncEnabled) {
      startMt5SyncWorker();
      addMt5Log('Automatic live watcher turned ON', 'ok');
    } else {
      if (mt5Worker) { try { mt5Worker.kill(); } catch (e) {} mt5Worker = null; }
      addMt5Log('Automatic live watcher paused', 'info');
    }
    return send(res, 200, { ok: true, autoSync: isAutoSyncEnabled, workerRunning: !!mt5Worker });
  }
  if (p === '/api/local-mt5/disconnect' && m === 'POST') {
    const b = await readBody(req);
    const targetId = b && b.id ? String(b.id) : null;
    if (!Array.isArray(db.deletedAccounts)) db.deletedAccounts = [];
    if (targetId) {
      const idx = db.connections.findIndex(x => x.id === targetId);
      if (idx !== -1) {
        const removed = db.connections.splice(idx, 1)[0];
        delete db.trades[removed.id];
        const logStr = String((removed.account && removed.account.login) || removed.id.replace('mt5-', ''));
        if (!db.deletedAccounts.includes(logStr)) db.deletedAccounts.push(logStr);
        bump();
        addMt5Log(`Removed account ${removed.name}`, 'info');
      }
      return send(res, 200, { ok: true, deletedAccounts: db.deletedAccounts });
    }
    if (mt5Worker) { try { mt5Worker.kill(); } catch (e) {} mt5Worker = null; }
    isAutoSyncEnabled = false;
    const removedNames = [];
    db.connections = db.connections.filter(x => {
      if (x.id && x.id.startsWith('mt5-')) {
        delete db.trades[x.id];
        removedNames.push(x.name);
        const logStr = String((x.account && x.account.login) || x.id.replace('mt5-', ''));
        if (!db.deletedAccounts.includes(logStr)) db.deletedAccounts.push(logStr);
        return false;
      }
      return true;
    });
    if (removedNames.length) {
      bump();
      addMt5Log(`Disconnected ${removedNames.length} MT5 account(s)`, 'info');
    }
    return send(res, 200, { ok: true, deletedAccounts: db.deletedAccounts });
  }
  if (p === '/api/local-mt5/scan-accounts' && m === 'GET') {
    const pyExe = findLocalPath('.venv/Scripts/python.exe');
    const pyScript = findLocalPath('tools/mt5_sync.py');
    const exe = fs.existsSync(pyExe) ? pyExe : getPythonExe();
    if (!Array.isArray(db.deletedAccounts)) db.deletedAccounts = [];

    require('child_process').execFile(exe, [pyScript, '--scan-json'], { cwd: path.dirname(pyScript), windowsHide: true, timeout: 12000 }, (err, stdout, stderr) => {
      let rawList = [];
      try {
        const outStr = String(stdout || '').trim();
        const startIdx = outStr.indexOf('[');
        const endIdx = outStr.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
          rawList = JSON.parse(outStr.slice(startIdx, endIdx + 1));
        }
      } catch (e) {
        rawList = [];
      }
      if (!rawList.length && db.connections.length) {
        rawList = db.connections.filter(c => c.id && c.id.startsWith('mt5-')).map(c => {
          const a = c.account || {};
          return {
            login: a.login || c.id.replace('mt5-', ''),
            server: a.server || 'MetaTrader 5',
            name: c.name,
            company: a.company || '',
            currency: a.currency || 'USD',
            balance: a.balance || 0,
            initialBalance: a.initialBalance || 100000,
            tradeCount: c.tradeCount || 0,
            isLive: Boolean(c.isLiveTerminal)
          };
        });
      }
      const accounts = rawList.map(a => {
        const logStr = String(a.login);
        const isImported = db.connections.some(c => c.id === 'mt5-' + logStr || String(c.account && c.account.login) === logStr);
        const isDeleted = db.deletedAccounts.includes(logStr);
        return Object.assign({}, a, {
          isImported,
          isDeleted,
          isLive: Boolean(a.isLive)
        });
      });
      return send(res, 200, { ok: true, accounts, deletedAccounts: db.deletedAccounts });
    });
    return;
  }
  if (p === '/api/local-mt5/apply-accounts' && m === 'POST') {
    const b = await readBody(req);
    if (!Array.isArray(db.deletedAccounts)) db.deletedAccounts = [];
    const selected = (b.selectedLogins || []).map(String);

    // 1. Filter out unselected MT5 accounts and blacklist them
    db.connections = db.connections.filter(c => {
      if (c.id && c.id.startsWith('mt5-')) {
        const logStr = String((c.account && c.account.login) || c.id.replace('mt5-', ''));
        if (!selected.includes(logStr)) {
          delete db.trades[c.id];
          if (!db.deletedAccounts.includes(logStr)) db.deletedAccounts.push(logStr);
          return false;
        }
      }
      return true;
    });

    // 2. Clear selected accounts from deletedAccounts blacklist
    selected.forEach(logStr => {
      db.deletedAccounts = db.deletedAccounts.filter(x => x !== logStr);
    });

    bump();

    // 3. Trigger immediate sync for selected accounts
    if (selected.length > 0) {
      const pyExe = findLocalPath('.venv/Scripts/python.exe');
      const pyScript = findLocalPath('tools/mt5_sync.py');
      const exe = fs.existsSync(pyExe) ? pyExe : getPythonExe();
      try {
        require('child_process').execFile(exe, [pyScript, '--sync-logins', selected.join(',')], { cwd: path.dirname(pyScript), windowsHide: true, timeout: 20000 }, () => {});
      } catch (e) {}
    }

    addMt5Log(`Updated account selection (${selected.length} active)`, 'ok');
    return send(res, 200, { ok: true, connections: db.connections.map(pub), deletedAccounts: db.deletedAccounts });
  }
  if (p === '/api/connections' && m === 'POST') {
    const b = await readBody(req);
    const platform = b.platform === 'mt4' ? 'mt4' : 'mt5';
    const c = {
      id: crypto.randomBytes(6).toString('hex'), name: String(b.name || 'MetaTrader Account').slice(0, 60), platform,
      code: genCode(), codeExpires: now() + CODE_TTL_MS, token: null, deviceId: null, account: null, createdAt: now(),
      lastSeen: 0, syncEnabled: true, syncOpenPositions: true, syncRequestVersion: 0, completedVersion: 0,
      importStartDate: /^\d{4}-\d{2}-\d{2}$/.test(b.importStartDate || '') ? b.importStartDate : ''
    };
    db.connections.push(c); bump();
    return send(res, 201, Object.assign(pub(c), { apiUrl: 'http://' + HOST + ':' + PORT }));
  }
  const mm = p.match(/^\/api\/connections\/([a-zA-Z0-9_-]+)(\/sync)?$/);
  if (mm) {
    const c = db.connections.find(x => x.id === mm[1]);
    if (!c) return send(res, 404, { error: 'not found' });
    if (mm[2] && m === 'POST') {
      c.syncRequestVersion = (c.syncRequestVersion | 0) + 1;
      bump();
      try {
        const pyExe = findLocalPath('.venv/Scripts/python.exe');
        const pyScript = findLocalPath('tools/mt5_sync.py');
        if (fs.existsSync(pyExe) && fs.existsSync(pyScript)) {
          require('child_process').spawn(pyExe, [pyScript, '--scan-all'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
        }
      } catch (e) { /* ignore */ }
      return send(res, 200, pub(c));
    }
    if (m === 'PATCH') {
      const b = await readBody(req);
      if ('syncEnabled' in b) c.syncEnabled = !!b.syncEnabled;
      if ('syncOpenPositions' in b) c.syncOpenPositions = !!b.syncOpenPositions;
      if ('name' in b) c.name = String(b.name).slice(0, 60);
      if (b.syncOpenPositions !== undefined) c.syncRequestVersion = (c.syncRequestVersion | 0) + 1;
      bump(); return send(res, 200, pub(c));
    }
    if (m === 'DELETE') {
      if (!Array.isArray(db.deletedAccounts)) db.deletedAccounts = [];
      const logStr = String((c.account && c.account.login) || c.id.replace('mt5-', ''));
      if (!db.deletedAccounts.includes(logStr)) db.deletedAccounts.push(logStr);
      db.connections = db.connections.filter(x => x.id !== c.id);
      if (url.searchParams.get('keepTrades') !== '1') delete db.trades[c.id];
      delete runs[c.id]; bump();
      return send(res, 200, { ok: true, deletedAccounts: db.deletedAccounts });
    }
  }
  if (p === '/download/mt5' && m === 'GET') {
    let src;
    try { src = fs.readFileSync(EA_TEMPLATE, 'utf8'); } catch (e) { return send(res, 404, { error: 'connector template missing' }); }
    const c = db.connections.find(x => x.id === url.searchParams.get('conn'));
    src = src.replace(/(input\s+string\s+ApiBaseUrl\s*=\s*)"[^"]*"/, '$1"http://' + HOST + ':' + PORT + '"');
    if (c && !c.token) src = src.replace(/(input\s+string\s+ConnectionCode\s*=\s*)"[^"]*"/, '$1"' + c.code + '"');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="TradersJournalSync_MT5.mq5"', 'Cache-Control': 'no-store' });
    return res.end(src);
  }
  return false;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  try {
    const hosts = [HOST + ':' + PORT, 'localhost:' + PORT];
    if (!hosts.includes((req.headers.host || '').toLowerCase())) return send(res, 403, { error: 'Only local journal requests are allowed.' });
    if (req.headers.origin && !hosts.some(h => req.headers.origin === 'http://' + h)) return send(res, 403, { error: 'Only the local dashboard may access this API.' });
    const url = new URL(req.url, 'http://' + HOST + ':' + PORT);
    if (req.method === 'POST' && url.pathname.startsWith('/api/metatrader/')) return await handleEA(req, res, url.pathname);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/download/')) {
      const r = await handleApp(req, res, url);
      if (r === false) send(res, 404, { error: 'not found' });
      return;
    }
    let rel = decodeURIComponent(url.pathname); if (rel === '/') rel = '/index.html';
    const cleanRel = rel.replace(/^[/\\]+/, '');
    const publicFile = ['index.html','settings.js','settings.css','daily-journal.js','daily-journal.css','hero.js','hero.css','analytics.js','analytics.css'].includes(cleanRel) || /^fonts[\\/][^\\/]+\.(css|woff2|woff)$/.test(cleanRel) || /^media[\\/][^\\/]+\.(mp4|webm|jpg|png|mp3)$/.test(cleanRel);
    if (!publicFile) { res.writeHead(404); return res.end('Not found'); }
    const liveCandidate = path.join('C:\\GPT\\local', cleanRel);
    const file = (!liveCandidate.includes('app.asar') && fs.existsSync(liveCandidate)) ? liveCandidate : path.normalize(path.join(ROOT, cleanRel));
    const ext = path.extname(file).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    if (ext === '.mp4' || ext === '.webm') {
      fs.stat(file, (stErr, stat) => {
        if (stErr || !stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
        const total = stat.size;
        const range = req.headers.range;
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
          const chunk = (end - start) + 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunk,
            'Content-Type': contentType
          });
          fs.createReadStream(file, { start, end }).pipe(res);
        } else {
          res.writeHead(200, { 'Content-Length': total, 'Content-Type': contentType, 'Accept-Ranges': 'bytes' });
          fs.createReadStream(file).pipe(res);
        }
      });
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  } catch (e) {
    console.error('[error]', req.method, req.url, e.message);
    if (!res.headersSent) send(res, e.status || 500, { error: e.message });
  }
});
function findLocalPath(rel) {
  const candidates = [
    path.join(ROOT, rel),
    path.join(process.cwd(), rel),
    path.join(__dirname, '..', rel),
    path.join(path.dirname(process.execPath), rel),
    path.join(path.dirname(process.execPath), '..', rel),
    path.join(path.dirname(process.execPath), '..', '..', rel),
    path.join('c:\\GPT\\local', rel)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(ROOT, rel);
}

function getPythonExe() {
  const candidates = [
    findLocalPath('.venv/Scripts/pythonw.exe'),
    findLocalPath('.venv/Scripts/python.exe'),
    'C:\\GPT\\local\\.venv\\Scripts\\pythonw.exe',
    'C:\\GPT\\local\\.venv\\Scripts\\python.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'pythonw.exe';
}

let mt5Worker = null;
let isAutoSyncEnabled = true;

function startMt5SyncWorker() {
  if (!isAutoSyncEnabled) return;
  if (mt5Worker) return;
  const pyExe = getPythonExe();
  const pyScript = findLocalPath('tools/mt5_sync.py');
  if (!fs.existsSync(pyExe) || !fs.existsSync(pyScript)) {
    addMt5Log('Local python environment or sync script not found', 'err');
    return;
  }
  addMt5Log('Starting MetaTrader 5 live background synchronizer...', 'info');
  try {
    const child = require('child_process').spawn(pyExe, [pyScript, '--daemon'], {
      cwd: path.dirname(pyScript),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    child.stdout.on('data', d => {
      const s = d.toString().trim();
      if (s) addMt5Log(s, s.includes('error') ? 'err' : 'ok');
    });
    child.stderr.on('data', d => {
      const s = d.toString().trim();
      if (s) addMt5Log(s, 'err');
    });
    child.on('exit', code => {
      mt5Worker = null;
      if (isAutoSyncEnabled && code !== 0) {
        addMt5Log(`Worker stopped (code ${code}), restarting in 5s...`, 'info');
        setTimeout(startMt5SyncWorker, 5000);
      }
    });
    mt5Worker = child;
  } catch (err) {
    addMt5Log('Failed to start sync worker: ' + err.message, 'err');
  }
}

server.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? 'Port ' + PORT + ' is already in use (is Traders Journal already running?)' : 'Server error: ' + e.message);
  if (require.main === module) process.exit(1);
});
server.listen(PORT, HOST, () => {
  console.log('Traders Journal running at http://' + HOST + ':' + PORT);
  startMt5SyncWorker();
});

module.exports = {
  server,
  PORT,
  HOST,
  flush: () => {
    try {
      const data = JSON.stringify(db, null, 2);
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE, data);
      fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, 'data', 'db.json'), data);
    } catch (e) { /* ignore */ }
  },
  stopWorker: () => {
    if (mt5Worker) {
      try { mt5Worker.kill(); } catch (e) {}
      mt5Worker = null;
    }
  }
};
