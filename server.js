// Traders Journal local backend: serves the dashboard and implements the MetaTrader sync API
// used by TradersJournalSync_MT5.mq5 (pair / heartbeat / trades / offline).
// Run:  node server.js        (default http://127.0.0.1:8765)
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = +process.env.PORT || 8765;
const ISOLATED = !!process.env.TJ_ISOLATED; // tests: never read or write the project's real data folder
const HOST = '127.0.0.1';
const ROOT = __dirname;
function getWritableDataDir() {
  if (process.env.TJ_DATA && !process.env.TJ_DATA.includes('app.asar')) {
    return process.env.TJ_DATA;
  }
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
  const candidates = [DB_FILE];
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

function httpsFetchBuffer(rawUrl, depth = 0) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(rawUrl); } catch (e) { return reject(e); }
    const req = https.get(u, {
      headers: { 'User-Agent': 'TradersJournal-Local/1.0', 'Accept': 'application/json, image/*, */*' },
      timeout: 5500
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (depth >= 4) return reject(new Error('Too many redirects'));
        return httpsFetchBuffer(new URL(res.headers.location, u).toString(), depth + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const chunks = [];
      let len = 0;
      res.on('data', c => {
        len += c.length;
        if (len > 4 * 1024 * 1024) { req.destroy(new Error('Response too large')); }
        else chunks.push(c);
      });
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || '' }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Timeout')));
    req.on('error', reject);
  });
}

function smartSplitName(fullOrLocal, fallbackEmail = '') {
  const raw = String(fullOrLocal || '').trim();
  const cleaned = raw.replace(/@.*$/, '').replace(/[._+-]+/g, ' ').replace(/\d+$/g, '').trim();
  if (!cleaned) return { firstName: 'Trader', lastName: '' };
  const parts = cleaned.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return {
    firstName: parts[0] || 'Trader',
    lastName: parts.slice(1).join(' ')
  };
}

async function lookupExternalAccount(provider, query) {
  const prov = String(provider || 'google').toLowerCase();
  const q = String(query || '').trim();

  if (prov === 'windows') {
    const os = require('os');
    const cp = require('child_process');
    const info = os.userInfo();
    let gitName = '', gitEmail = '';
    try { gitName = cp.execSync('git config --global user.name', { encoding: 'utf8', timeout: 1500, windowsHide: true }).trim(); } catch (e) {}
    try { gitEmail = cp.execSync('git config --global user.email', { encoding: 'utf8', timeout: 1500, windowsHide: true }).trim(); } catch (e) {}
    const displaySource = gitName || info.username || process.env.USERNAME || 'Windows User';
    const names = smartSplitName(displaySource, gitEmail);
    const handle = (info.username || names.firstName).toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return {
      firstName: names.firstName,
      lastName: names.lastName,
      username: handle || 'trader.pc',
      email: gitEmail || `${handle}@local.pc`,
      country: 'Sri Lanka',
      location: os.hostname() ? `${os.hostname()} · Local PC` : 'Windows Workstation',
      bio: `Verified local Windows workstation profile (${info.username || 'PC'})`,
      photo: '',
      connectedAccount: {
        provider: 'windows',
        email: gitEmail || `${handle}@local.pc`,
        name: [names.firstName, names.lastName].filter(Boolean).join(' '),
        handle: info.username || handle,
        connectedAt: Date.now()
      }
    };
  }

  if (prov === 'github') {
    if (!q) throw new Error('Enter a GitHub username or email address first.');
    let ghUser = null;
    try {
      if (q.includes('@')) {
        const searchRes = await httpsFetchBuffer(`https://api.github.com/search/users?q=${encodeURIComponent(q)}+in:email`);
        const parsed = JSON.parse(searchRes.buffer.toString('utf8'));
        if (parsed.items && parsed.items[0] && parsed.items[0].login) {
          const uRes = await httpsFetchBuffer(`https://api.github.com/users/${encodeURIComponent(parsed.items[0].login)}`);
          ghUser = JSON.parse(uRes.buffer.toString('utf8'));
        }
      } else {
        const cleanHandle = q.replace(/^@/, '');
        const uRes = await httpsFetchBuffer(`https://api.github.com/users/${encodeURIComponent(cleanHandle)}`);
        ghUser = JSON.parse(uRes.buffer.toString('utf8'));
      }
    } catch (e) {
      throw new Error('Could not find that GitHub profile. Check the username or internet connection.');
    }
    if (!ghUser || !ghUser.login) throw new Error('GitHub user not found.');
    let photoData = '';
    if (ghUser.avatar_url) {
      try {
        const imgRes = await httpsFetchBuffer(ghUser.avatar_url);
        const mime = imgRes.contentType.includes('jpeg') || imgRes.contentType.includes('jpg') ? 'image/jpeg' : (imgRes.contentType.includes('webp') ? 'image/webp' : 'image/png');
        photoData = `data:${mime};base64,${imgRes.buffer.toString('base64')}`;
      } catch (e) {}
    }
    const names = smartSplitName(ghUser.name || ghUser.login, ghUser.email || q);
    return {
      firstName: names.firstName,
      lastName: names.lastName,
      username: ghUser.login,
      email: ghUser.email || (q.includes('@') ? q : `${ghUser.login}@users.noreply.github.com`),
      location: ghUser.location || '',
      country: ghUser.location ? ghUser.location.split(',').pop().trim() : '',
      bio: ghUser.bio || `Connected via GitHub (@${ghUser.login})`,
      photo: photoData,
      connectedAccount: {
        provider: 'github',
        email: ghUser.email || (q.includes('@') ? q : ''),
        name: ghUser.name || ghUser.login,
        handle: ghUser.login,
        connectedAt: Date.now()
      }
    };
  }

  throw new Error('Unknown account provider.');
}

const runs = {}; // in-memory snapshot tracking per connection
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = JSON.stringify(db, null, 2);
    if (DB_FILE.includes('app.asar')) return;
    try {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      // write-then-rename so a crash mid-save never leaves a half-written db.json
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, data);
      fs.renameSync(tmp, DB_FILE);
    } catch (e) {
      console.error('save failed for', DB_FILE, e.message);
    }
  }, 150);
}
const bump = () => { db.version++; save(); };
const now = () => Date.now();

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
};
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
    return now() - (c.lastSeen || 0) < ONLINE_MS ? 'online' : 'offline';
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
  return db.connections.find(c => c.token && c.token !== 'direct-local-token' && safeEqual(c.token, t)) || null;
}
function touch(c, b) {
  c.lastSeen = now();
  if (b && b.account && typeof b.account === 'object') c.account = Object.assign({}, c.account, b.account);
  if (b && b.terminalBuild) c.terminalBuild = num(b.terminalBuild);
}

/* ---------- accounts, sessions and per-person data ---------- */
const DAEMON_KEY = crypto.randomBytes(24).toString('hex'); // lets the local MT5 sync script post without a browser session
process.env.TJ_DAEMON_KEY = DAEMON_KEY;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(path.join(DATA_DIR, '.daemon-key'), DAEMON_KEY, { mode: 0o600 }); } catch (e) { /* the sync script then needs the env var */ }
const safeEqual = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const auth = require('./accounts.js').createAuth({
  get db() { return db; }, send, readBody, save, httpsFetchBuffer, lookupExternalAccount, HOST, PORT,
  onFirstUser(u) { if (db.gcal) { u.gcal = db.gcal; delete db.gcal; } },
  onUserDeleted(u) {
    for (const c of db.connections.filter(x => x.ownerId === u.id)) delete db.trades[c.id];
    db.connections = db.connections.filter(x => x.ownerId !== u.id);
    bump();
  }
});
auth.migrateLegacy();
const ownerIdOf = c => c.ownerId || (auth.primaryAdmin() || {}).id || null;

async function handleEA(req, res, pathname) {
  const b = await readBody(req);
  if (pathname === '/api/metatrader/pair') {
    const code = String(b.code || '').trim().toUpperCase();
    const c = db.connections.find(x => x.code === code);
    if (!code || !c) return send(res, 404, { error: 'Unknown connection code. Generate a new one in the dashboard.' });
    if (c.token && c.deviceId !== b.deviceId) return send(res, 409, { error: 'This code was already used by another terminal.' });
    if (!c.token && now() > c.codeExpires) return send(res, 410, { error: 'Connection code expired. Generate a new one.' });
    if (b.platform && b.platform !== c.platform) return send(res, 400, { error: 'This code was generated for ' + c.platform.toUpperCase() + ', not ' + String(b.platform).toUpperCase() + '.' });
    if (!c.token) { c.token = crypto.randomBytes(24).toString('hex'); c.pairedAt = now(); clearPairCodeFile(code); }
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

  if (p.startsWith('/api/auth/')) return await auth.handle(req, res, url);

  // Everything below needs a logged-in person (or the local sync script's key for /api/direct-sync).
  const sess = auth.sessionFrom(req);
  const isDaemon = p === '/api/direct-sync' && m === 'POST' && req.headers['x-tj-key'] && safeEqual(req.headers['x-tj-key'], DAEMON_KEY);
  if (!sess && !isDaemon) return send(res, 401, { error: 'Log in to continue.', code: 'AUTH' });
  const me = sess ? sess.user : null;
  if (p === '/api/direct-sync' && !isDaemon && !(me && me.admin)) return send(res, 403, { error: 'Only the owner of this PC can push local MetaTrader data.' });
  const mine = c => !!me && ownerIdOf(c) === me.id;
  if (p.startsWith('/api/gcal/')) {
    const view = new Proxy({}, {
      get: (_, k) => (k === 'gcal' ? me.gcal : undefined),
      set: (_, k, v) => { if (k === 'gcal') me.gcal = v; return true; },
      deleteProperty: (_, k) => { if (k === 'gcal') delete me.gcal; return true; }
    });
    return require('./gcal.js').handle(req, res, url, { db: view, save, bump, send, readBody });
  }
  if (p.startsWith('/api/local-mt5/') && p !== '/api/local-mt5/status' && !me.admin) return send(res, 403, { error: 'Only the owner of this PC can manage the local MetaTrader terminal.' });

  if (p === '/api/state' && m === 'GET') {
    const v = +url.searchParams.get('v');
    if (!me) return send(res, 401, { error: 'Log in to continue.', code: 'AUTH' });
    const conns = db.connections.filter(mine);
    const out = { version: db.version, serverTime: now(), connections: conns.map(pub) };
    if (v !== db.version) {
      out.trades = [];
      for (const c of conns) for (const t of Object.values(db.trades[c.id] || {})) out.trades.push(Object.assign({ connId: c.id, connName: c.name }, t));
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
        importStartDate: '',
        ownerId: ((me && me.admin ? me : auth.primaryAdmin()) || {}).id || null
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
    const mt5Conns = db.connections.filter(x => x.id && x.id.startsWith('mt5-') && mine(x));
    const liveConn = mt5Conns.find(x => x.isLiveTerminal || (x.account && x.account.source === 'live_terminal')) || mt5Conns[0] || null;
    return send(res, 200, {
      autoSync: isAutoSyncEnabled,
      openMt5: openMt5Setting(),
      mt5Found: mt5Installs().length > 0,
      workerRunning: !!mt5Worker,
      connection: liveConn ? pub(liveConn) : null,
      accounts: mt5Conns.map(pub),
      logs: mt5SyncLogs,
      root: path.dirname(path.dirname(getSyncScriptPath()))
    });
  }
  if ((p === '/api/local-mt5/sync' || p === '/api/local-mt5/auto-connect') && m === 'POST') {
    const isAutoConnect = p === '/api/local-mt5/auto-connect';
    addMt5Log(isAutoConnect ? 'Running PowerShell / Python Multi-Account Auto-Connect...' : 'Manual sync requested by user', 'info');
    const pyExe = findPythonCli();
    const pyScript = getSyncScriptPath();
    const psScript = findLocalPath('tools/auto_connect_mt5.ps1');
    if (!fs.existsSync(pyScript)) {
      addMt5Log('Sync script not found', 'err');
      return send(res, 500, { error: 'Sync tools not found' });
    }
    try {
      const runCmd = isAutoConnect && fs.existsSync(psScript) && !psScript.includes('app.asar')
        ? { exe: 'powershell.exe', args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScript] }
        : { exe: fs.existsSync(pyExe) ? pyExe : getPythonExe().replace(/pythonw\.exe$/i, 'python.exe'), args: [pyScript, '--scan-all'] };

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
    const pyExe = findPythonCli();
    const pyScript = getSyncScriptPath();
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
  if (p === '/api/local-mt5/addon-install' && m === 'POST') {
    try {
      const out = installMt5Addon(me);
      addMt5Log(`MT5 add-on installed in ${out.installed.length} MetaTrader 5 folder${out.installed.length === 1 ? '' : 's'}`, 'ok');
      return send(res, 200, out);
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
  }
  if (p === '/api/local-mt5/open-mt5' && m === 'POST') {
    const r = await openMt5();
    if (r.started) addMt5Log('Opened MetaTrader 5', 'info');
    return send(res, r.ok ? 200 : 400, r);
  }
  if (p === '/api/local-mt5/open-mt5-setting' && m === 'POST') {
    const b = await readBody(req);
    db.localSync = Object.assign({}, db.localSync, { openMt5: !!b.enabled });
    save();
    return send(res, 200, { ok: true, openMt5: openMt5Setting() });
  }
  if (p === '/api/local-mt5/toggle-auto' && m === 'POST') {
    const b = await readBody(req);
    setPythonSync(!!b.enabled);
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
    setPythonSync(false);
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
    const pyExe = findPythonCli();
    const pyScript = getSyncScriptPath();
    const exe = fs.existsSync(pyExe) ? pyExe : getPythonExe().replace(/pythonw\.exe$/i, 'python.exe');
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
      const pyExe = findPythonCli();
      const pyScript = getSyncScriptPath();
      const exe = fs.existsSync(pyExe) ? pyExe : getPythonExe().replace(/pythonw\.exe$/i, 'python.exe');
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
      importStartDate: /^\d{4}-\d{2}-\d{2}$/.test(b.importStartDate || '') ? b.importStartDate : '', ownerId: me.id
    };
    db.connections.push(c); bump();
    return send(res, 201, Object.assign(pub(c), { apiUrl: 'http://' + HOST + ':' + PORT }));
  }
  const mm = p.match(/^\/api\/connections\/([a-zA-Z0-9_-]+)(\/sync)?$/);
  if (mm) {
    const c = db.connections.find(x => x.id === mm[1] && mine(x));
    if (!c) return send(res, 404, { error: 'not found' });
    if (mm[2] && m === 'POST') {
      c.syncRequestVersion = (c.syncRequestVersion | 0) + 1;
      bump();
      try {
        const pyExe = findPythonCli();
        const pyScript = getSyncScriptPath();
        const exe = fs.existsSync(pyExe) ? pyExe : getPythonExe().replace(/pythonw\.exe$/i, 'python.exe');
        if (fs.existsSync(exe) && fs.existsSync(pyScript)) {
          require('child_process').spawn(exe, [pyScript, '--scan-all'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
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
    const c = db.connections.find(x => x.id === url.searchParams.get('conn') && mine(x));
    src = src.replace(/(input\s+string\s+ApiBaseUrl\s*=\s*)"[^"]*"/, '$1"http://' + HOST + ':' + PORT + '"');
    if (c && !c.token) src = src.replace(/(input\s+string\s+ConnectionCode\s*=\s*)"[^"]*"/, '$1"' + c.code + '"');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="TradersJournalSync_MT5.mq5"', 'Cache-Control': 'no-store' });
    return res.end(src);
  }
  return false;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
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
    const publicFile = ['index.html','auth-boot.js','auth.css','auth.js','settings.js','settings.css','daily-journal.js','daily-journal.css','hero.js','hero.css','analytics.js','analytics.css','guide.js','guide.css'].includes(cleanRel) || /^fonts[\\/][^\\/]+\.(css|woff2|woff)$/.test(cleanRel) || /^media[\\/][^\\/]+\.(mp4|webm|jpg|png|mp3)$/.test(cleanRel);
    if (!publicFile) { res.writeHead(404); return res.end('Not found'); }
    const file = path.normalize(path.join(ROOT, cleanRel));
    const ext = path.extname(file).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    if (ext === '.mp4' || ext === '.webm') {
      fs.stat(file, (stErr, stat) => {
        if (stErr || !stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
        const total = stat.size;
        const range = req.headers.range;
        const rm = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        const unsatisfiable = () => { res.writeHead(416, { 'Content-Range': `bytes */${total}` }); res.end(); };
        if (range && (!rm || (!rm[1] && !rm[2]))) return unsatisfiable();
        if (rm) {
          const start = rm[1] ? parseInt(rm[1], 10) : Math.max(0, total - parseInt(rm[2], 10));
          const end = rm[1] && rm[2] ? Math.min(parseInt(rm[2], 10), total - 1) : total - 1;
          if (start >= total || start > end) return unsatisfiable();
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
    // only next to the app: never the current directory or a fixed folder other users could create
    path.join(ROOT, rel),
    path.join(ROOT, '..', rel),
    path.join(path.dirname(process.execPath), rel)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(ROOT, rel);
}

function getSyncScriptPath() {
  const candidates = [
    path.join(ROOT, 'tools', 'mt5_sync.py'),
    path.join(process.resourcesPath || '', 'tools', 'mt5_sync.py')
  ];
  for (const c of candidates) {
    if (!c.includes('app.asar') && fs.existsSync(c)) return c;
  }
  // Packaged app: the script lives inside app.asar, which Python cannot read, so extract a copy.
  const packed = path.join(ROOT, 'tools', 'mt5_sync.py');
  if (fs.existsSync(packed)) {
    try {
      const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\', 'AppData', 'Roaming');
      const dir = path.join(appData, 'Traders Journal', 'tools');
      fs.mkdirSync(dir, { recursive: true });
      const target = path.join(dir, 'mt5_sync.py');
      fs.writeFileSync(target, fs.readFileSync(packed));
      return target;
    } catch (e) { /* fall through */ }
  }
  return path.join(ROOT, 'tools', 'mt5_sync.py');
}

// Python that ships inside the installer (resources/python, built by tools/prepare-python-runtime.js).
function findBundledPython(exeName) {
  if (!process.resourcesPath) return null;
  const p = path.join(process.resourcesPath, 'python', exeName);
  return fs.existsSync(p) ? p : null;
}

// Console Python: bundled runtime first, then the project .venv.
function findPythonCli() {
  return findBundledPython('python.exe') || findLocalPath('.venv/Scripts/python.exe');
}

function getPythonExe() {
  const bundled = findBundledPython('pythonw.exe') || findBundledPython('python.exe');
  if (bundled) return bundled;
  const candidates = [
    findLocalPath('.venv/Scripts/pythonw.exe'),
    findLocalPath('.venv/Scripts/python.exe')
  ];
  for (const c of candidates) {
    if (!c.includes('app.asar') && fs.existsSync(c)) return c;
  }
  // No project environment: fall back to whatever Python is on PATH.
  for (const dir of String(process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const exe of ['pythonw.exe', 'python.exe']) {
      const full = path.join(dir, exe);
      if (fs.existsSync(full) && !full.includes('WindowsApps')) return full;
    }
  }
  return 'python.exe';
}

let mt5Worker = null;
// The always-on Python watcher is opt-in: a hidden Python process reading MetaTrader data is what antivirus
// heuristics flag. The MT5 add-on (connector/) is the default way to sync; this stays for people who turn it on.
let isAutoSyncEnabled = !!(db.localSync && db.localSync.auto);
function setPythonSync(on) {
  isAutoSyncEnabled = !!on;
  db.localSync = Object.assign({}, db.localSync, { auto: isAutoSyncEnabled });
  save();
}

/* ---------- MT5 add-on install: copy the Expert Advisor into MetaTrader and leave a one-time pairing code ---------- */
const ADDON_FILE = 'TradersJournalSync_MT5.ex5';
const PAIR_CODE_FILE = 'TradersJournalSync_MT5.paircode';   // read by the add-on from MetaTrader's shared Files folder
const ADDON_CODE_TTL_MS = 24 * 3600 * 1000;
const metaQuotesDir = () => path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\', 'AppData', 'Roaming'), 'MetaQuotes', 'Terminal');
function mt5Terminals() {
  let dirs = [];
  try { dirs = fs.readdirSync(metaQuotesDir(), { withFileTypes: true }).filter(d => d.isDirectory() && /^[0-9A-F]{32}$/i.test(d.name)).map(d => path.join(metaQuotesDir(), d.name)); } catch (e) { /* MT5 not installed */ }
  return dirs.filter(d => fs.existsSync(path.join(d, 'MQL5', 'Experts')));
}
function pairCodePath() { return path.join(metaQuotesDir(), 'Common', 'Files', PAIR_CODE_FILE); }
function clearPairCodeFile(code) {
  try { if (fs.readFileSync(pairCodePath(), 'utf8').trim().toUpperCase() === code) fs.unlinkSync(pairCodePath()); } catch (e) { /* already gone */ }
}
function installMt5Addon(me) {
  const terminals = mt5Terminals();
  if (!terminals.length) throw new Error('MetaTrader 5 was not found on this PC. Install MetaTrader 5, open it once, then try again.');
  const ex5 = fs.readFileSync(path.join(ROOT, 'connector', ADDON_FILE)); // works from inside app.asar too
  const installed = [];
  for (const t of terminals) {
    try { fs.writeFileSync(path.join(t, 'MQL5', 'Experts', ADDON_FILE), ex5); installed.push(t); } catch (e) { /* folder locked: skip it */ }
  }
  if (!installed.length) throw new Error('Could not copy the add-on into MetaTrader 5. Close MetaTrader 5 and try again.');
  // reuse a waiting add-on code, otherwise make a new one
  let c = db.connections.find(x => x.addon && !x.token && x.ownerId === me.id && x.codeExpires > now());
  if (!c) {
    c = {
      id: crypto.randomBytes(6).toString('hex'), name: 'MetaTrader 5', platform: 'mt5', addon: true,
      code: genCode(), codeExpires: now() + ADDON_CODE_TTL_MS, token: null, deviceId: null, account: null, createdAt: now(),
      lastSeen: 0, syncEnabled: true, syncOpenPositions: true, syncRequestVersion: 0, completedVersion: 0, importStartDate: '', ownerId: me.id
    };
    db.connections.push(c); bump();
  }
  fs.mkdirSync(path.dirname(pairCodePath()), { recursive: true });
  fs.writeFileSync(pairCodePath(), c.code, 'ascii');
  return { ok: true, installed: installed.map(t => path.basename(t)), code: c.code, codeExpires: c.codeExpires, apiUrl: 'http://' + HOST + ':' + PORT };
}

function startMt5SyncWorker() {
  if (!isAutoSyncEnabled || ISOLATED) return;
  if (mt5Worker) return;
  const pyExe = getPythonExe();
  const pyScript = getSyncScriptPath();
  if (!fs.existsSync(pyExe) || !fs.existsSync(pyScript)) {
    addMt5Log('Python environment or sync script not found - run setup-mt5.bat (retrying in 10s)', 'err');
    setTimeout(startMt5SyncWorker, 10000);
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
    child.on('error', err => {
      addMt5Log('Sync worker error: ' + err.message, 'err');
      mt5Worker = null;
      if (isAutoSyncEnabled) setTimeout(startMt5SyncWorker, 10000);
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
/* ---------- open MetaTrader 5 ----------
   Starts the terminal the way a double-click does: one visible program, no helper process, no script. It only
   starts MetaTrader when it is not already running, and it can be switched off. */
const openMt5Setting = () => !(db.localSync && db.localSync.openMt5 === false); // on unless turned off
function mt5Installs() {
  const found = [];
  const add = (exe, hasAddon) => { if (exe && fs.existsSync(exe) && !found.some(f => f.exe.toLowerCase() === exe.toLowerCase())) found.push({ exe, hasAddon: !!hasAddon }); };
  // every MetaTrader data folder records the folder it was installed in (origin.txt, UTF-16)
  try {
    for (const d of fs.readdirSync(metaQuotesDir(), { withFileTypes: true })) {
      if (!d.isDirectory() || !/^[0-9A-F]{32}$/i.test(d.name)) continue;
      try {
        const origin = fs.readFileSync(path.join(metaQuotesDir(), d.name, 'origin.txt'), 'utf16le').replace(/^﻿/, '').trim();
        if (origin) add(path.join(origin, 'terminal64.exe'), fs.existsSync(path.join(metaQuotesDir(), d.name, 'MQL5', 'Experts', ADDON_FILE)));
      } catch (e) { /* no origin.txt: skip */ }
    }
  } catch (e) { /* MetaTrader not installed */ }
  for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')]) {
    if (base) add(path.join(base, 'MetaTrader 5', 'terminal64.exe'), false);
  }
  return found.sort((a, b) => b.hasAddon - a.hasAddon); // the terminal that already has the add-on comes first
}
function isMt5Running(cb) {
  require('child_process').execFile('tasklist', ['/FI', 'IMAGENAME eq terminal64.exe', '/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 5000 },
    (err, out) => cb(!err && /terminal64\.exe/i.test(String(out))));
}
function openMt5() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve({ ok: false, error: 'Opening MetaTrader 5 is only supported on Windows.' });
    const installs = mt5Installs();
    if (!installs.length) return resolve({ ok: false, error: 'MetaTrader 5 was not found on this PC.' });
    isMt5Running(running => {
      if (running) return resolve({ ok: true, already: true });
      let done = false;
      const finish = r => { if (!done) { done = true; resolve(r); } };
      try {
        const exe = installs[0].exe;
        const child = require('child_process').spawn(exe, [], { detached: true, stdio: 'ignore', cwd: path.dirname(exe) });
        child.on('error', e => finish({ ok: false, error: 'Could not open MetaTrader 5: ' + e.message }));
        child.unref();
        setTimeout(() => finish({ ok: true, started: true }), 400);
      } catch (e) { finish({ ok: false, error: 'Could not open MetaTrader 5: ' + e.message }); }
    });
  });
}

server.listen(PORT, HOST, () => {
  console.log('Traders Journal running at http://' + HOST + ':' + PORT);
  startMt5SyncWorker();
  // give the app a moment to finish starting, then open MetaTrader 5 if the person wants that
  if (!ISOLATED) setTimeout(() => {
    if (!openMt5Setting()) return;
    openMt5().then(r => { if (r.started) addMt5Log('Opened MetaTrader 5', 'info'); }).catch(() => {});
  }, 5000);
});

module.exports = {
  server,
  auth,
  PORT,
  HOST,
  flush: () => {
    try {
      const data = JSON.stringify(db, null, 2);
      clearTimeout(saveTimer);
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE + '.tmp', data);
      fs.renameSync(DB_FILE + '.tmp', DB_FILE);
    } catch (e) { /* ignore */ }
  },
  openMt5,
  stopWorker: () => {
    if (mt5Worker) {
      try { mt5Worker.kill(); } catch (e) {}
      mt5Worker = null;
    }
  }
};
