'use strict';
// Local multi-person accounts for Traders Journal (server side).
//  - Every person has a username/email + password (scrypt). Nothing is readable without a session cookie.
//  - The first account created on a fresh install becomes the PC owner ("admin").
//  - Google sign-in / linking uses real OAuth (authorization code + PKCE) with the owner's own Google OAuth client,
//    so name, e-mail and photo come from Google and are verified, not guessed.
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const COOKIE = 'tj_session';
const SESSION_MAX_MS = 14 * 24 * 3600 * 1000;      // browser-session logins (kept in memory only)
const DEVICE_MAX_MS = 30 * 24 * 3600 * 1000;       // "keep me signed in" logins (stored hashed, survive restarts)
const MIN_PASSWORD = 8;
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHOTO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const PHOTO_MAX = 700 * 1024;
const PROVIDERS = ['google', 'github', 'windows'];

const GOOGLE = {
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo'
};

function createAuth(ctx) {
  const { send, readBody, save, httpsFetchBuffer, HOST, PORT } = ctx;
  const getDb = () => ctx.db;
  const sessions = new Map();           // token -> { userId, createdAt }
  const attempts = new Map();           // login key -> { fails, until }
  const pending = new Map();            // google state -> flow
  let google = Object.assign({}, GOOGLE);
  const redirectUri = () => 'http://' + HOST + ':' + PORT + '/api/auth/google/callback';
  const now = () => Date.now();

  /* ---------- passwords ---------- */
  function hashPassword(pw, salt) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    return { salt: s, hash: crypto.scryptSync(String(pw || ''), s, 64).toString('hex') };
  }
  function verifyPassword(pw, salt, hash) {
    try {
      if (!salt || !hash) return false;
      const h = crypto.scryptSync(String(pw || ''), salt, 64), b = Buffer.from(hash, 'hex');
      return h.length === b.length && crypto.timingSafeEqual(h, b);
    } catch (e) { return false; }
  }
  const DUMMY = hashPassword('not-a-real-password');
  function passwordProblem(pw, user) {
    if (typeof pw !== 'string' || pw.length < MIN_PASSWORD) return 'Password must be at least ' + MIN_PASSWORD + ' characters.';
    if (pw.length > 200) return 'Password is too long.';
    if (user && user.username && pw.toLowerCase() === String(user.username).toLowerCase()) return 'Password cannot be the same as your username.';
    return '';
  }

  /* ---------- users ---------- */
  function users() { const db = getDb(); if (!Array.isArray(db.users)) db.users = []; return db.users; }
  function settings() {
    const db = getDb();
    if (!db.authSettings || typeof db.authSettings !== 'object') db.authSettings = {};
    if (db.authSettings.allowSignups === undefined) db.authSettings.allowSignups = true;
    return db.authSettings;
  }
  function migrateLegacy() {
    // Earlier drafts stored a default "1234" account and a single connectedAccount. Convert, never keep a default password.
    for (const u of users()) {
      if (!u.linked || typeof u.linked !== 'object') u.linked = {};
      if (u.connectedAccount && u.connectedAccount.provider && !u.linked[u.connectedAccount.provider]) {
        const c = u.connectedAccount;
        u.linked[c.provider] = { email: c.email || '', name: c.name || '', handle: c.handle || '', verified: false, connectedAt: c.connectedAt || now() };
      }
      delete u.connectedAccount; delete u.isDefaultPin; delete u.requireLogin;
    }
    const list = users();
    if (list.length && !list.some(u => u.admin)) list[0].admin = true;
    delete getDb().activeUserId;
  }
  const findById = id => users().find(u => u.id === id) || null;
  const findByIdentifier = s => {
    const k = String(s || '').trim().toLowerCase();
    if (!k) return null;
    return users().find(u => (u.username || '').toLowerCase() === k || (u.email || '').toLowerCase() === k) || null;
  };
  const primaryAdmin = () => users().find(u => u.admin) || users()[0] || null;

  function pubUser(u) {
    if (!u) return null;
    const linked = {};
    for (const p of PROVIDERS) if (u.linked && u.linked[p]) {
      const l = u.linked[p];
      linked[p] = { email: l.email || '', name: l.name || '', handle: l.handle || '', verified: !!l.verified, connectedAt: l.connectedAt || null };
    }
    return {
      id: u.id, firstName: u.firstName || '', lastName: u.lastName || '', username: u.username || '', email: u.email || '',
      phone: u.phone || '', country: u.country || '', location: u.location || '', bio: u.bio || '', photo: u.photo || '',
      role: u.role || 'KING Member', admin: !!u.admin, linked, createdAt: u.createdAt || null, lastLoginAt: u.lastLoginAt || null
    };
  }
  const identityOf = u => ({ firstName: u.firstName || '', lastName: u.lastName || '', username: u.username || '', email: u.email || '', phone: u.phone || '', country: u.country || '', location: u.location || '', bio: u.bio || '', photo: u.photo || '', role: u.role || 'KING Member' });
  function stateFor(u) {
    const st = u.state && typeof u.state === 'object' ? JSON.parse(JSON.stringify(u.state)) : {};
    st.profile = Object.assign({}, st.profile, identityOf(u), { linked: pubUser(u).linked });
    return st;
  }

  /* ---------- sessions ---------- */
  function parseCookies(req) {
    const out = {};
    String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
    return out;
  }
  const sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');
  function devices() {
    const db = getDb();
    if (!db.deviceSessions || typeof db.deviceSessions !== 'object') db.deviceSessions = {};
    return db.deviceSessions;
  }
  function sessionFrom(req) {
    const t = parseCookies(req)[COOKIE];
    if (!t) return null;
    let s = sessions.get(t), max = SESSION_MAX_MS;
    if (!s) { s = devices()[sha(t)]; max = DEVICE_MAX_MS; }
    if (!s) return null;
    if (now() - s.createdAt > max) { sessions.delete(t); delete devices()[sha(t)]; return null; }
    const user = findById(s.userId);
    if (!user) { sessions.delete(t); delete devices()[sha(t)]; return null; }
    return { token: t, user, userId: user.id };
  }
  function startSession(user, opts = {}) {
    const token = crypto.randomBytes(32).toString('hex');
    const d = devices();
    for (const [h, v] of Object.entries(d)) if (now() - v.createdAt > DEVICE_MAX_MS) delete d[h];
    let maxAge = '';
    if (opts.remember) {
      d[sha(token)] = { userId: user.id, createdAt: now(), label: opts.label || 'Signed in' };
      maxAge = '; Max-Age=' + Math.floor(DEVICE_MAX_MS / 1000);
    } else sessions.set(token, { userId: user.id, createdAt: now(), label: opts.label || 'Signed in' });
    user.lastLoginAt = now();
    save();
    return { 'Set-Cookie': COOKIE + '=' + token + '; HttpOnly; SameSite=Strict; Path=/' + maxAge };
  }
  const clearCookie = () => ({ 'Set-Cookie': COOKIE + '=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  function endSession(token) { sessions.delete(token); delete devices()[sha(token)]; save(); }
  function dropSessionsOf(userId, exceptToken) {
    for (const [t, s] of sessions) if (s.userId === userId && t !== exceptToken) sessions.delete(t);
    const keep = exceptToken ? sha(exceptToken) : '';
    for (const [h, v] of Object.entries(devices())) if (v.userId === userId && h !== keep) delete devices()[h];
  }
  function otherSignIns(userId, token) {
    let n = 0;
    for (const [t, s] of sessions) if (s.userId === userId && t !== token) n++;
    const keep = sha(token);
    for (const [h, v] of Object.entries(devices())) if (v.userId === userId && h !== keep) n++;
    return n;
  }
  const winUser = () => { try { return require('os').userInfo().username || ''; } catch (e) { return ''; } };
  const safeEq = (a, b) => { a = Buffer.from(String(a || '')); b = Buffer.from(String(b || '')); return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b); };
  const autoInfo = (user, token) => ({ available: !!process.env.TJ_DEVICE_KEY, enabled: !!user.autoLogin, windowsUser: winUser(), otherSignIns: otherSignIns(user.id, token) });
  const deviceLabel = req => (String(req.headers['user-agent'] || '').includes('Electron') ? 'Desktop app' : 'Browser');
  function loginKey(s) { return String(s || '').trim().toLowerCase().slice(0, 100); }
  function lockRemaining(key) { const a = attempts.get(key); return a && a.until > now() ? Math.ceil((a.until - now()) / 1000) : 0; }
  function noteFail(key) {
    const a = attempts.get(key) || { fails: 0, until: 0 };
    a.fails++;
    if (a.fails >= 5) a.until = now() + Math.min(15 * 60, 15 * Math.pow(2, a.fails - 5)) * 1000;
    attempts.set(key, a);
  }

  /* ---------- validation ---------- */
  const clean = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
  function applyFields(u, b, { creating } = {}) {
    const next = {};
    const text = { firstName: 50, lastName: 50, phone: 40, country: 60, location: 80, bio: 1000, role: 40 };
    for (const k of Object.keys(text)) if (b[k] !== undefined) next[k] = clean(b[k], text[k]);
    if (b.username !== undefined) {
      next.username = clean(b.username, 40).toLowerCase().replace(/\s+/g, '.');
      if (!USERNAME_RE.test(next.username)) return { error: 'Username must be 3–30 characters: letters, numbers, dot, dash or underscore.' };
      const clash = users().find(x => x.id !== u.id && (x.username || '').toLowerCase() === next.username);
      if (clash) return { error: 'That username is already taken on this PC.' };
    }
    if (b.email !== undefined) {
      next.email = clean(b.email, 150).toLowerCase();
      if (next.email && !EMAIL_RE.test(next.email)) return { error: 'That email address does not look right.' };
      if (next.email) {
        const clash = users().find(x => x.id !== u.id && (x.email || '').toLowerCase() === next.email);
        if (clash) return { error: 'That email is already used by another person on this PC.' };
      }
    }
    if (b.photo !== undefined) {
      if (!b.photo) next.photo = '';
      else if (!PHOTO_RE.test(b.photo) || b.photo.length > PHOTO_MAX) return { error: 'Photo must be a PNG, JPG or WebP under 500 KB.' };
      else next.photo = b.photo;
    }
    if ((creating || next.firstName !== undefined) && !(next.firstName !== undefined ? next.firstName : u.firstName)) return { error: 'First name is required.' };
    return { next };
  }

  /* ---------- HTTP helpers ---------- */
  function httpRequest(rawUrl, { method = 'GET', headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
      let u; try { u = new URL(rawUrl); } catch (e) { return reject(e); }
      const lib = u.protocol === 'http:' ? http : https;
      const req = lib.request(u, { method, headers, timeout: 10000 }, res => {
        const chunks = []; let n = 0;
        res.on('data', c => { n += c.length; if (n > 2 * 1024 * 1024) req.destroy(new Error('Response too large')); else chunks.push(c); });
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      });
      req.on('timeout', () => req.destroy(new Error('Timed out talking to Google.')));
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }
  const b64url = buf => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const page = (title, msg) => '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#09090b;color:#ececee;font:15px Inter,system-ui,sans-serif"><div style="text-align:center;max-width:380px;padding:24px"><div style="font:700 18px \'Space Grotesk\',sans-serif;margin-bottom:10px">Traders Journal</div><p style="color:#8b8b93;line-height:1.5">' + msg + '</p></div></body>';
  function cleanupPending() { for (const [k, f] of pending) if (now() - f.created > 15 * 60 * 1000) pending.delete(k); }

  async function photoFromUrl(url) {
    try {
      if (!/^https:\/\//i.test(url || '')) return '';
      const img = await httpsFetchBuffer(url);
      const ct = String(img.contentType || '').toLowerCase();
      const mime = ct.includes('png') ? 'image/png' : ct.includes('webp') ? 'image/webp' : ct.includes('jpeg') || ct.includes('jpg') ? 'image/jpeg' : '';
      if (!mime) return '';
      const uri = 'data:' + mime + ';base64,' + img.buffer.toString('base64');
      return uri.length <= PHOTO_MAX ? uri : '';
    } catch (e) { return ''; }
  }

  /* ---------- Google OAuth ---------- */
  const googleCfg = () => { const g = settings().google; return g && g.clientId && g.clientSecret ? g : null; };
  async function finishGoogle(flow, code) {
    const g = googleCfg();
    const form = new URLSearchParams({ code, client_id: g.clientId, client_secret: g.clientSecret, redirect_uri: redirectUri(), grant_type: 'authorization_code', code_verifier: flow.verifier }).toString();
    const tok = await httpRequest(google.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) }, body: form });
    let tj; try { tj = JSON.parse(tok.body); } catch (e) { tj = {}; }
    if (tok.status !== 200 || !tj.access_token) throw new Error(tj.error_description || tj.error || 'Google did not accept the sign-in. Check the Client ID and secret in Settings.');
    const ui = await httpRequest(google.userinfoUrl, { headers: { Authorization: 'Bearer ' + tj.access_token, Accept: 'application/json' } });
    let info; try { info = JSON.parse(ui.body); } catch (e) { info = {}; }
    if (ui.status !== 200 || !info.sub) throw new Error('Could not read your Google profile.');
    if (!info.email || info.email_verified === false) throw new Error('That Google account has no verified email address.');
    const fullName = clean(info.name || '', 100);
    const first = clean(info.given_name || fullName.split(' ')[0] || '', 50);
    const last = clean(info.family_name || fullName.split(' ').slice(1).join(' '), 50);
    return { sub: String(info.sub), email: String(info.email).toLowerCase(), name: fullName, firstName: first, lastName: last, photo: await photoFromUrl(info.picture) };
  }
  const googleInfo = () => ({ configured: !!googleCfg(), clientId: (settings().google || {}).clientId || '', redirectUri: redirectUri() });

  /* ---------- request handler ---------- */
  async function handle(req, res, url) {
    const p = url.pathname, m = req.method;
    const sess = sessionFrom(req);

    if (p === '/api/auth/session' && m === 'GET') {
      const out = {
        ok: true,
        authed: !!sess,
        needsSetup: users().length === 0,
        allowSignups: settings().allowSignups !== false,
        googleConfigured: !!googleCfg(),
        users: users().map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, username: u.username, email: u.email, photo: u.photo, admin: !!u.admin }))
      };
      if (sess) { out.user = pubUser(sess.user); out.state = stateFor(sess.user); out.autoLogin = autoInfo(sess.user, sess.token); }
      return send(res, 200, out);
    }

    if (p === '/api/auth/login' && m === 'POST') {
      const b = await readBody(req);
      const key = loginKey(b.identifier);
      const wait = lockRemaining(key);
      if (wait) return send(res, 429, { error: 'Too many wrong attempts. Try again in ' + wait + ' seconds.', retryAfter: wait });
      const u = findByIdentifier(b.identifier);
      const ok = u ? verifyPassword(b.password, u.passwordSalt, u.passwordHash) : (verifyPassword(b.password, DUMMY.salt, DUMMY.hash), false);
      if (!ok) { noteFail(key); return send(res, 401, { error: 'Incorrect username/email or password.' }); }
      attempts.delete(key);
      const headers = startSession(u, { remember: !!b.remember, label: deviceLabel(req) });
      return send(res, 200, { ok: true, user: pubUser(u) }, headers);
    }

    if (p === '/api/auth/register' && m === 'POST') {
      const b = await readBody(req);
      const first = users().length === 0;
      if (!first && settings().allowSignups === false) return send(res, 403, { error: 'New accounts are turned off. Ask the owner of this PC to add you.' });
      const flow = b.googleState ? pending.get(String(b.googleState)) : null;
      const g = flow && flow.intent === 'register' && flow.result ? flow.result : null;
      const u = { id: 'usr_' + crypto.randomBytes(6).toString('hex'), linked: {}, state: null };
      const fields = applyFields(u, {
        firstName: b.firstName, lastName: b.lastName, username: b.username, email: g ? g.email : b.email,
        photo: g ? g.photo : '', country: b.country, location: b.location
      }, { creating: true });
      if (fields.error) return send(res, 400, { error: fields.error });
      if (!fields.next.username) return send(res, 400, { error: 'Choose a username.' });
      const pwErr = passwordProblem(b.password, fields.next);
      if (pwErr) return send(res, 400, { error: pwErr });
      if (g) {
        const taken = users().find(x => x.linked && x.linked.google && x.linked.google.sub === g.sub);
        if (taken) return send(res, 409, { error: 'That Google account is already linked to another person on this PC.' });
        u.linked.google = { sub: g.sub, email: g.email, name: g.name, handle: g.email.split('@')[0], verified: true, connectedAt: now() };
        pending.delete(String(b.googleState));
      }
      const pw = hashPassword(b.password);
      Object.assign(u, { phone: '', country: '', location: '', bio: '', photo: '', role: first ? 'KING Founder' : 'KING Member' }, fields.next);
      u.passwordSalt = pw.salt; u.passwordHash = pw.hash; u.admin = first; u.createdAt = now();
      users().push(u);
      if (first && ctx.onFirstUser) ctx.onFirstUser(u);
      const headers = startSession(u, { remember: !!b.remember, label: deviceLabel(req) });
      return send(res, 201, { ok: true, user: pubUser(u) }, headers);
    }

    if (p === '/api/auth/logout' && m === 'POST') {
      if (sess) endSession(sess.token);
      return send(res, 200, { ok: true }, clearCookie());
    }

    /* Google flow: start / callback / poll */
    if (p === '/api/auth/google/start' && m === 'POST') {
      const b = await readBody(req);
      const intent = ['login', 'link', 'register'].includes(b.intent) ? b.intent : 'login';
      const g = googleCfg();
      if (!g) return send(res, 400, { error: 'Google sign-in is not set up yet. The owner can add a Google Client ID in Settings → Connected accounts.' });
      if (intent === 'link' && !sess) return send(res, 401, { error: 'Log in first.' });
      if (intent === 'register' && users().length > 0 && settings().allowSignups === false) return send(res, 403, { error: 'New accounts are turned off.' });
      cleanupPending();
      const state = b64url(crypto.randomBytes(24)), verifier = b64url(crypto.randomBytes(32));
      pending.set(state, { intent, userId: sess ? sess.userId : null, verifier, created: now(), status: 'pending', importProfile: b.importProfile !== false, remember: !!b.remember });
      const q = new URLSearchParams({
        client_id: g.clientId, redirect_uri: redirectUri(), response_type: 'code', scope: 'openid email profile', state,
        code_challenge: b64url(crypto.createHash('sha256').update(verifier).digest()), code_challenge_method: 'S256', prompt: 'select_account'
      });
      return send(res, 200, { ok: true, state, url: google.authUrl + '?' + q.toString() });
    }
    if (p === '/api/auth/google/callback' && m === 'GET') {
      const state = url.searchParams.get('state') || '';
      const flow = pending.get(state);
      const html = (code, title, msg) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(page(title, msg)); };
      if (!flow || flow.status !== 'pending') return html(400, 'Link expired', 'This sign-in link is no longer valid. Go back to Traders Journal and try again.');
      if (url.searchParams.get('error')) { flow.status = 'error'; flow.error = 'Google sign-in was cancelled.'; return html(200, 'Cancelled', 'Sign-in was cancelled. You can close this tab.'); }
      try {
        flow.result = await finishGoogle(flow, url.searchParams.get('code') || '');
        flow.status = 'done';
        return html(200, 'Connected', 'Google confirmed your identity. You can close this tab and return to Traders Journal.');
      } catch (e) {
        flow.status = 'error'; flow.error = e.message || 'Google sign-in failed.';
        return html(200, 'Sign-in failed', 'Something went wrong. Return to Traders Journal for details.');
      }
    }
    if (p === '/api/auth/google/poll' && m === 'GET') {
      const state = url.searchParams.get('state') || '';
      const flow = pending.get(state);
      if (!flow) return send(res, 404, { error: 'This sign-in expired. Start again.' });
      if (flow.status === 'pending') return send(res, 200, { status: 'pending' });
      if (flow.status === 'error') { pending.delete(state); return send(res, 200, { status: 'error', error: flow.error }); }
      const g = flow.result;
      if (flow.intent === 'login') {
        pending.delete(state);
        const u = users().find(x => x.linked && x.linked.google && x.linked.google.sub === g.sub);
        if (!u) return send(res, 200, { status: 'error', error: 'No account on this PC is linked to ' + g.email + '. Log in with your password and connect Google in Settings, or create an account.' });
        return send(res, 200, { status: 'done', intent: 'login', user: pubUser(u) }, startSession(u, { remember: flow.remember, label: 'Signed in with Google' }));
      }
      if (flow.intent === 'link') {
        pending.delete(state);
        if (!sess || sess.userId !== flow.userId) return send(res, 200, { status: 'error', error: 'You were signed out while connecting. Try again.' });
        const other = users().find(x => x.id !== sess.userId && x.linked && x.linked.google && x.linked.google.sub === g.sub);
        if (other) return send(res, 200, { status: 'error', error: 'That Google account is already linked to another person on this PC.' });
        const u = sess.user;
        u.linked = u.linked || {};
        u.linked.google = { sub: g.sub, email: g.email, name: g.name, handle: g.email.split('@')[0], verified: true, connectedAt: now() };
        if (flow.importProfile) {
          if (g.firstName) u.firstName = g.firstName;
          if (g.lastName) u.lastName = g.lastName;
          if (g.photo) u.photo = g.photo;
          if (!u.email && !users().some(x => x.id !== u.id && (x.email || '').toLowerCase() === g.email)) u.email = g.email;
        }
        save();
        return send(res, 200, { status: 'done', intent: 'link', user: pubUser(u), state: stateFor(u) });
      }
      // register: keep the verified result server-side until the form is submitted
      const dupe = users().find(x => x.linked && x.linked.google && x.linked.google.sub === g.sub);
      if (dupe) { pending.delete(state); return send(res, 200, { status: 'error', error: 'That Google account already has an account here. Use "Continue with Google" on the login screen.' }); }
      return send(res, 200, { status: 'done', intent: 'register', profile: { firstName: g.firstName, lastName: g.lastName, email: g.email, photo: g.photo, username: g.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') } });
    }

    /* Automatic sign-in for the desktop app: only the app itself knows the launch key, so other programs and
       browser tabs on this PC cannot use it. It signs in the person who turned this on for this Windows account. */
    if (p === '/api/auth/auto-login' && m === 'POST') {
      const b = await readBody(req);
      if (!safeEq(b.key, process.env.TJ_DEVICE_KEY)) return send(res, 403, { error: 'Automatic sign-in is only available inside the desktop app.' });
      const wu = winUser().toLowerCase();
      const hits = users().filter(x => x.autoLogin && String(x.autoLogin.windowsUser || '').toLowerCase() === wu);
      if (!wu || hits.length !== 1) return send(res, 404, { error: 'Automatic sign-in is not set up for this Windows account.' });
      return send(res, 200, { ok: true, user: pubUser(hits[0]) }, startSession(hits[0], { label: 'Desktop app (automatic)' }));
    }

    if (p === '/api/auth/lookup-account' && m === 'POST') {
      const b = await readBody(req);
      if (b.provider !== 'windows' && !sess) return send(res, 401, { error: 'Log in first.', code: 'AUTH' });
      try { return send(res, 200, { ok: true, profile: await ctx.lookupExternalAccount(b.provider, b.query) }); }
      catch (e) { return send(res, 400, { error: e.message || 'Could not fetch account details.' }); }
    }

    if (!sess) return send(res, 401, { error: 'Log in to continue.', code: 'AUTH' });
    const me = sess.user;

    if (p === '/api/auth/update-profile' && m === 'POST') {
      const b = await readBody(req);
      const f = applyFields(me, b);
      if (f.error) return send(res, 400, { error: f.error });
      Object.assign(me, f.next);
      const l = b.linkImported;
      if (l && PROVIDERS.includes(l.provider) && l.provider !== 'google') {
        me.linked = me.linked || {};
        me.linked[l.provider] = { email: clean(l.email, 150), name: clean(l.name, 100), handle: clean(l.handle, 60), verified: false, connectedAt: now() };
      }
      save();
      return send(res, 200, { ok: true, user: pubUser(me) });
    }
    if (p === '/api/auth/unlink' && m === 'POST') {
      const b = await readBody(req);
      if (PROVIDERS.includes(b.provider) && me.linked) { delete me.linked[b.provider]; save(); }
      return send(res, 200, { ok: true, user: pubUser(me) });
    }
    if (p === '/api/auth/change-password' && m === 'POST') {
      const b = await readBody(req);
      if (!verifyPassword(b.currentPassword, me.passwordSalt, me.passwordHash)) return send(res, 401, { error: 'Your current password is not correct.' });
      const err = passwordProblem(b.newPassword, me);
      if (err) return send(res, 400, { error: err });
      const pw = hashPassword(b.newPassword);
      me.passwordSalt = pw.salt; me.passwordHash = pw.hash;
      dropSessionsOf(me.id, sess.token);
      save();
      return send(res, 200, { ok: true });
    }
    if (p === '/api/auth/auto-login-setting' && m === 'POST') {
      const b = await readBody(req);
      if (!verifyPassword(b.password, me.passwordSalt, me.passwordHash)) return send(res, 401, { error: 'Your password is not correct.' });
      if (b.enabled) {
        if (!process.env.TJ_DEVICE_KEY) return send(res, 400, { error: 'Automatic sign-in works inside the Traders Journal desktop app.' });
        const wu = winUser();
        if (!wu) return send(res, 400, { error: "Could not read this PC's Windows account." });
        for (const x of users()) if (x.id !== me.id && x.autoLogin && String(x.autoLogin.windowsUser).toLowerCase() === wu.toLowerCase()) delete x.autoLogin;
        me.autoLogin = { windowsUser: wu, enabledAt: now() };
      } else delete me.autoLogin;
      save();
      return send(res, 200, { ok: true, autoLogin: autoInfo(me, sess.token) });
    }
    if (p === '/api/auth/sign-out-others' && m === 'POST') {
      dropSessionsOf(me.id, sess.token); save();
      return send(res, 200, { ok: true, autoLogin: autoInfo(me, sess.token) });
    }
    if (p === '/api/auth/save-state' && m === 'POST') {
      const b = await readBody(req);
      if (b.state && typeof b.state === 'object') {
        const st = Object.assign({}, b.state); delete st.profile;
        me.state = st; save();
      }
      return send(res, 200, { ok: true });
    }

    /* ---- people (owner) ---- */
    if (p === '/api/auth/people' && m === 'GET') {
      if (!me.admin) return send(res, 403, { error: 'Only the owner can manage people.' });
      return send(res, 200, { ok: true, people: users().map(pubUser), allowSignups: settings().allowSignups !== false, google: googleInfo() });
    }
    if (p === '/api/auth/settings' && m === 'POST') {
      if (!me.admin) return send(res, 403, { error: 'Only the owner can change this.' });
      const b = await readBody(req);
      const cfg = settings();
      if (b.allowSignups !== undefined) cfg.allowSignups = !!b.allowSignups;
      if (b.google !== undefined) {
        if (b.google === null || (!b.google.clientId && !b.google.clientSecret)) delete cfg.google;
        else {
          const id = clean(b.google.clientId, 300), secret = clean(b.google.clientSecret, 200) || (cfg.google && cfg.google.clientSecret) || '';
          if (!id || !secret) return send(res, 400, { error: 'Enter both the Client ID and the Client secret.' });
          cfg.google = { clientId: id, clientSecret: secret };
        }
      }
      save();
      return send(res, 200, { ok: true, allowSignups: cfg.allowSignups !== false, google: googleInfo() });
    }
    if (p === '/api/auth/add-person' && m === 'POST') {
      if (!me.admin) return send(res, 403, { error: 'Only the owner can add people.' });
      const b = await readBody(req);
      if (!verifyPassword(b.ownerPassword, me.passwordSalt, me.passwordHash)) return send(res, 401, { error: 'Your own password is not correct.' });
      const u = { id: 'usr_' + crypto.randomBytes(6).toString('hex'), linked: {}, state: null };
      const f = applyFields(u, { firstName: b.firstName, lastName: b.lastName, username: b.username, email: b.email }, { creating: true });
      if (f.error) return send(res, 400, { error: f.error });
      if (!f.next.username) return send(res, 400, { error: 'Choose a username.' });
      const pwErr = passwordProblem(b.newPassword, f.next);
      if (pwErr) return send(res, 400, { error: pwErr });
      const pw = hashPassword(b.newPassword);
      Object.assign(u, { phone: '', country: '', location: '', bio: '', photo: '', role: 'KING Member' }, f.next);
      u.passwordSalt = pw.salt; u.passwordHash = pw.hash; u.admin = false; u.createdAt = now();
      users().push(u); save();
      return send(res, 201, { ok: true, people: users().map(pubUser) });
    }
    if (p === '/api/auth/reset-password' && m === 'POST') {
      if (!me.admin) return send(res, 403, { error: 'Only the owner can reset another person\'s password.' });
      const b = await readBody(req);
      if (!verifyPassword(b.ownerPassword, me.passwordSalt, me.passwordHash)) return send(res, 401, { error: 'Your own password is not correct.' });
      const t = findById(b.userId);
      if (!t || t.id === me.id) return send(res, 404, { error: 'Person not found.' });
      const err = passwordProblem(b.newPassword, t);
      if (err) return send(res, 400, { error: err });
      const pw = hashPassword(b.newPassword);
      t.passwordSalt = pw.salt; t.passwordHash = pw.hash;
      dropSessionsOf(t.id);
      save();
      return send(res, 200, { ok: true });
    }
    if (p === '/api/auth/delete-user' && m === 'POST') {
      const b = await readBody(req);
      const t = findById(b.userId || me.id);
      if (!t) return send(res, 404, { error: 'Person not found.' });
      if (t.id !== me.id && !me.admin) return send(res, 403, { error: 'Only the owner can remove other people.' });
      if (!verifyPassword(b.password, me.passwordSalt, me.passwordHash)) return send(res, 401, { error: 'Your password is not correct.' });
      if (t.admin && users().length > 1) return send(res, 400, { error: 'Remove the other people first. The owner account can only be deleted when it is the last one.' });
      dropSessionsOf(t.id);
      if (ctx.onUserDeleted) ctx.onUserDeleted(t);
      getDb().users = users().filter(x => x.id !== t.id);
      save();
      return send(res, 200, { ok: true, selfDeleted: t.id === me.id, people: me.admin && t.id !== me.id ? users().map(pubUser) : undefined }, t.id === me.id ? clearCookie() : undefined);
    }
    return false;
  }

  return {
    handle, sessionFrom, migrateLegacy, primaryAdmin, pubUser, findById, users,
    _setGoogleEndpointsForTest: e => { google = Object.assign({}, GOOGLE, e); },
    _pendingForTest: pending,
    _clearMemorySessionsForTest: () => sessions.clear()
  };
}

module.exports = { createAuth, MIN_PASSWORD };
