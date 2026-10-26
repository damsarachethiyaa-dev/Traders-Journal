'use strict';
// Accounts, sessions, per-person isolation and the Google sign-in flow (against a mock Google).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const crypto = require('node:crypto');
const { once } = require('node:events');

async function freePort() {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}

test('accounts: login gate, isolation, lockout and Google sign-in', async () => {
  const port = await freePort(), mockPort = await freePort();
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'tj-auth-test-'));
  Object.assign(process.env, { PORT: String(port), TJ_DATA: data, TJ_ISOLATED: '1' });
  const backend = require('../src/server.js');
  if (!backend.server.listening) await once(backend.server, 'listening');
  const base = `http://127.0.0.1:${port}`;

  // Mock Google: records what the server sends and returns a fixed identity.
  const seen = { token: null };
  let googleUser = { sub: 'g-111', email: 'Ann.Google@example.com', email_verified: true, name: 'Ann Lee', given_name: 'Ann', family_name: 'Lee' };
  const mock = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      if (req.url === '/token') {
        seen.token = Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString()));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ access_token: 'tok-1', token_type: 'Bearer' }));
      }
      if (req.url === '/userinfo' && req.headers.authorization === 'Bearer tok-1') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(googleUser));
      }
      res.writeHead(404); res.end();
    });
  });
  mock.listen(mockPort, '127.0.0.1');
  await once(mock, 'listening');
  backend.auth._setGoogleEndpointsForTest({ tokenUrl: `http://127.0.0.1:${mockPort}/token`, userinfoUrl: `http://127.0.0.1:${mockPort}/userinfo` });

  const jar = {};
  const call = async (who, route, method = 'GET', body, extra = {}) => {
    const r = await fetch(base + route, {
      method, redirect: 'manual',
      headers: { 'Content-Type': 'application/json', ...(jar[who] ? { Cookie: jar[who] } : {}), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const sc = r.headers.get('set-cookie');
    if (sc) jar[who] = sc.split(';')[0] === 'tj_session=' ? '' : sc.split(';')[0];
    const text = await r.text();
    let j = {}; try { j = JSON.parse(text); } catch (e) { j = { text }; }
    return { status: r.status, j, headers: r.headers };
  };
  const pw = 'correct-horse-battery';

  try {
    // fresh install: setup is offered, nothing readable
    assert.equal((await call('x', '/api/state')).status, 401);
    let r = await call('x', '/api/auth/session');
    assert.deepEqual([r.j.needsSetup, r.j.authed], [true, false]);
    assert.ok(!JSON.stringify(r.j).includes('1234'), 'no default passkey');

    // owner
    assert.equal((await call('ann', '/api/auth/register', 'POST', { firstName: 'Ann', username: 'ann', password: 'short' })).status, 400);
    r = await call('ann', '/api/auth/register', 'POST', { firstName: 'Ann', username: 'Ann', password: pw });
    assert.equal(r.status, 201);
    assert.equal(r.j.user.admin, true);
    assert.ok(/HttpOnly/i.test(r.headers.get('set-cookie')) && /SameSite=Strict/i.test(r.headers.get('set-cookie')));
    assert.ok(!JSON.stringify(r.j).match(/passwordHash|passwordSalt/));

    // renaming is a one-field update; identity rules still apply
    r = await call('ann', '/api/auth/update-profile', 'POST', { firstName: 'Anna', lastName: 'Lee' });
    assert.equal(r.j.user.firstName, 'Anna');
    assert.equal((await call('ann', '/api/auth/update-profile', 'POST', { firstName: '' })).status, 400);
    assert.equal((await call('ann', '/api/auth/update-profile', 'POST', { username: 'a b!' })).status, 400);
    assert.equal((await call('ann', '/api/auth/update-profile', 'POST', { photo: 'javascript:alert(1)' })).status, 400);
    r = await call('ann', '/api/auth/session');
    assert.equal(r.j.state.profile.firstName, 'Anna', 'state reflects the renamed profile');

    // per-person journal state; identity cannot be smuggled through it
    await call('ann', '/api/auth/save-state', 'POST', { state: { live: [{ id: 1 }], profile: { firstName: 'Hacker' } } });
    r = await call('ann', '/api/auth/session');
    assert.equal(r.j.state.live.length, 1);
    assert.equal(r.j.state.profile.firstName, 'Anna');

    // second person: separate data, no owner powers
    r = await call('bob', '/api/auth/register', 'POST', { firstName: 'Bob', username: 'bob', password: 'bobs-long-password' });
    assert.equal(r.status, 201);
    assert.equal(r.j.user.admin, false);
    r = await call('bob', '/api/auth/session');
    assert.equal(r.j.state.live, undefined, "bob does not inherit Ann's journal");
    assert.equal((await call('bob', '/api/auth/people')).status, 403);
    assert.equal((await call('bob', '/api/local-mt5/sync', 'POST', {})).status, 403);
    const annConn = (await call('ann', '/api/connections', 'POST', { name: 'Ann MT5' })).j.id;
    assert.equal((await call('bob', '/api/connections/' + annConn, 'PATCH', { name: 'x' })).status, 404);
    assert.equal((await call('bob', '/api/state')).j.connections.length, 0);
    assert.equal((await call('ann', '/api/state')).j.connections.length, 1);

    // owner password confirmation guards people management
    assert.equal((await call('ann', '/api/auth/reset-password', 'POST', { userId: (await call('ann', '/api/auth/people')).j.people.find(p => p.username === 'bob').id, newPassword: 'whatever-long', ownerPassword: 'wrong' })).status, 401);

    // wrong password and lockout
    assert.equal((await call('x', '/api/auth/login', 'POST', { identifier: 'bob', password: 'nope' })).status, 401);
    for (let i = 0; i < 5; i++) await call('x', '/api/auth/login', 'POST', { identifier: 'bob', password: 'nope' });
    assert.equal((await call('x', '/api/auth/login', 'POST', { identifier: 'bob', password: 'bobs-long-password' })).status, 429);

    // logout really ends the session
    await call('ann', '/api/auth/logout', 'POST');
    assert.equal((await call('ann', '/api/state')).status, 401);
    assert.equal((await call('ann', '/api/auth/login', 'POST', { identifier: 'ANN', password: pw })).status, 200);

    // password change signs out other sessions
    jar.ann2 = '';
    assert.equal((await call('ann2', '/api/auth/login', 'POST', { identifier: 'ann', password: pw })).status, 200);
    assert.equal((await call('ann', '/api/auth/change-password', 'POST', { currentPassword: 'bad', newPassword: 'a-new-long-password' })).status, 401);
    assert.equal((await call('ann', '/api/auth/change-password', 'POST', { currentPassword: pw, newPassword: 'a-new-long-password' })).status, 200);
    assert.equal((await call('ann2', '/api/state')).status, 401);
    assert.equal((await call('ann', '/api/state')).status, 200);

    // ---------- Google ----------
    assert.equal((await call('ann', '/api/auth/google/start', 'POST', { intent: 'link' })).status, 400, 'not configured yet');
    assert.equal((await call('bob', '/api/auth/settings', 'POST', { google: { clientId: 'x', clientSecret: 'y' } })).status, 403);
    assert.equal((await call('ann', '/api/auth/settings', 'POST', { google: { clientId: 'cid.apps.googleusercontent.com', clientSecret: 'shh' } })).status, 200);
    assert.ok(!JSON.stringify((await call('ann', '/api/auth/people')).j).includes('shh'), 'secret is never sent back');

    // link
    r = await call('ann', '/api/auth/google/start', 'POST', { intent: 'link', importProfile: true });
    const u = new URL(r.j.url);
    assert.equal(u.searchParams.get('client_id'), 'cid.apps.googleusercontent.com');
    assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(u.searchParams.get('redirect_uri'), `${base}/api/auth/google/callback`);
    const state = r.j.state;
    assert.equal((await call('ann', '/api/auth/google/poll?state=' + state)).j.status, 'pending');
    assert.equal((await call('x', `/api/auth/google/callback?state=bogus&code=1`)).status, 400);
    assert.equal((await call('x', `/api/auth/google/callback?state=${state}&code=abc`)).status, 200);
    assert.equal(seen.token.code, 'abc');
    assert.equal(seen.token.client_secret, 'shh');
    assert.equal(crypto.createHash('sha256').update(seen.token.code_verifier).digest('base64url'), u.searchParams.get('code_challenge'), 'PKCE verifier matches the challenge');
    r = await call('ann', '/api/auth/google/poll?state=' + state);
    assert.equal(r.j.status, 'done');
    assert.equal(r.j.user.linked.google.email, 'ann.google@example.com');
    assert.equal(r.j.user.linked.google.verified, true);
    assert.equal(r.j.user.firstName, 'Ann', 'name imported from Google');
    assert.equal((await call('ann', '/api/auth/google/poll?state=' + state)).status, 404, 'one-time result');

    // another person cannot claim the same Google account
    r = await call('bob', '/api/auth/google/start', 'POST', { intent: 'link' });
    await call('x', `/api/auth/google/callback?state=${r.j.state}&code=abc`);
    assert.equal((await call('bob', '/api/auth/google/poll?state=' + r.j.state)).j.status, 'error');

    // login with Google (no password), only for the linked person
    await call('ann', '/api/auth/logout', 'POST');
    r = await call('ann', '/api/auth/google/start', 'POST', { intent: 'login' });
    await call('x', `/api/auth/google/callback?state=${r.j.state}&code=abc`);
    r = await call('ann', '/api/auth/google/poll?state=' + r.j.state);
    assert.equal(r.j.status, 'done');
    assert.equal((await call('ann', '/api/state')).status, 200);
    await call('ann', '/api/auth/logout', 'POST');
    googleUser = { ...googleUser, sub: 'g-999', email: 'stranger@example.com' };
    r = await call('x', '/api/auth/google/start', 'POST', { intent: 'login' });
    await call('x', `/api/auth/google/callback?state=${r.j.state}&code=abc`);
    r = await call('x', '/api/auth/google/poll?state=' + r.j.state);
    assert.equal(r.j.status, 'error', 'an unlinked Google account cannot sign in');
    assert.equal((await call('x', '/api/state')).status, 401);

    // unverified Google email is refused
    googleUser = { ...googleUser, sub: 'g-5', email_verified: false };
    r = await call('x', '/api/auth/google/start', 'POST', { intent: 'register' });
    await call('x', `/api/auth/google/callback?state=${r.j.state}&code=abc`);
    assert.equal((await call('x', '/api/auth/google/poll?state=' + r.j.state)).j.status, 'error');

    // register with Google: identity comes from the server-held, verified result, never from the client
    googleUser = { sub: 'g-777', email: 'carol@example.com', email_verified: true, name: 'Carol Diaz', given_name: 'Carol', family_name: 'Diaz' };
    r = await call('x', '/api/auth/google/start', 'POST', { intent: 'register' });
    const cs = r.j.state;
    await call('x', `/api/auth/google/callback?state=${cs}&code=abc`);
    r = await call('x', '/api/auth/google/poll?state=' + cs);
    assert.equal(r.j.profile.email, 'carol@example.com');
    r = await call('carol', '/api/auth/register', 'POST', { firstName: 'Carol', username: 'carol', email: 'forged@evil.test', password: 'carols-long-password', googleState: cs });
    assert.equal(r.status, 201);
    assert.equal(r.j.user.email, 'carol@example.com', 'email is taken from Google, not the form');
    assert.equal(r.j.user.linked.google.verified, true);
    // a client cannot assert a Google link without the OAuth result
    r = await call('dave', '/api/auth/register', 'POST', { firstName: 'Dave', username: 'dave', password: 'daves-long-password', connectedAccount: { provider: 'google', email: 'x@y.z' }, googleState: 'forged' });
    assert.equal(r.status, 201);
    assert.deepEqual(r.j.user.linked, {});

    // owner can switch off open sign-ups
    assert.equal((await call('ann', '/api/auth/login', 'POST', { identifier: 'ann', password: 'a-new-long-password' })).status, 200);
    await call('ann', '/api/auth/settings', 'POST', { allowSignups: false });
    assert.equal((await call('x', '/api/auth/register', 'POST', { firstName: 'Eve', username: 'eve', password: 'eves-long-password' })).status, 403);
    assert.equal((await call('ann', '/api/auth/add-person', 'POST', { firstName: 'Eve', username: 'eve', newPassword: 'eves-long-password', ownerPassword: 'a-new-long-password' })).status, 201);

    // removing a person removes their data and sessions
    const bobId = (await call('ann', '/api/auth/people')).j.people.find(p => p.username === 'bob').id;
    r = await call('ann', '/api/auth/delete-user', 'POST', { userId: bobId, password: 'a-new-long-password' });
    assert.equal(r.status, 200);
    assert.ok(!r.j.people.some(p => p.id === bobId));
    assert.equal((await call('bob', '/api/state')).status, 401);
    assert.equal((await call('ann', '/api/auth/delete-user', 'POST', { password: 'a-new-long-password' })).status, 400, 'owner cannot delete self while others remain');

    // ---------- keep me signed in / automatic sign-in ----------
    const lg = async (who, remember) => call(who, '/api/auth/login', 'POST', { identifier: 'ann', password: 'a-new-long-password', remember });
    r = await lg('plain', false);
    assert.ok(!/Max-Age/i.test(r.headers.get('set-cookie')), 'not remembered = session cookie');
    r = await lg('kept', true);
    assert.ok(/Max-Age=\d{6,}/i.test(r.headers.get('set-cookie')), 'remembered = long-lived cookie');
    const token = jar.kept.split('=')[1];
    const stored = JSON.stringify(backend.auth && fs.existsSync(path.join(data, 'db.json')) ? (backend.flush(), JSON.parse(fs.readFileSync(path.join(data, 'db.json'), 'utf8')).deviceSessions) : {});
    assert.ok(stored.length > 5 && !stored.includes(token), 'only a hash of the token is stored');
    backend.auth._clearMemorySessionsForTest(); // what an app restart does
    assert.equal((await call('plain', '/api/state')).status, 401, 'plain sessions end with the app');
    assert.equal((await call('kept', '/api/state')).status, 200, 'remembered sessions survive a restart');
    r = await call('kept', '/api/auth/session');
    assert.equal(r.j.autoLogin.available, false, 'auto sign-in needs the desktop app key');
    assert.equal((await call('kept', '/api/auth/auto-login-setting', 'POST', { enabled: true, password: 'a-new-long-password' })).status, 400);

    process.env.TJ_DEVICE_KEY = 'launch-key-123'; // what the desktop app sets for itself
    assert.equal((await call('kept', '/api/auth/auto-login-setting', 'POST', { enabled: true, password: 'wrong' })).status, 401);
    r = await call('kept', '/api/auth/auto-login-setting', 'POST', { enabled: true, password: 'a-new-long-password' });
    assert.equal(r.j.autoLogin.enabled, true);
    assert.equal((await call('auto', '/api/auth/auto-login', 'POST', { key: 'nope' })).status, 403, 'wrong key');
    assert.equal((await call('auto', '/api/auth/auto-login', 'POST', {})).status, 403, 'no key');
    r = await call('auto', '/api/auth/auto-login', 'POST', { key: 'launch-key-123' });
    assert.equal(r.status, 200);
    assert.equal(r.j.user.username, 'ann');
    assert.equal((await call('auto', '/api/state')).status, 200);
    // one person per Windows account: the next person to turn it on takes it over
    assert.equal((await call('carol', '/api/auth/login', 'POST', { identifier: 'carol', password: 'carols-long-password' })).status, 200);
    await call('carol', '/api/auth/auto-login-setting', 'POST', { enabled: true, password: 'carols-long-password' });
    r = await call('auto2', '/api/auth/auto-login', 'POST', { key: 'launch-key-123' });
    assert.equal(r.j.user.username, 'carol');
    assert.equal((await call('kept', '/api/auth/session')).j.autoLogin.enabled, false);
    await call('carol', '/api/auth/auto-login-setting', 'POST', { enabled: false, password: 'carols-long-password' });
    assert.equal((await call('auto3', '/api/auth/auto-login', 'POST', { key: 'launch-key-123' })).status, 404, 'turned off');
    // sign out the other places
    r = await call('kept', '/api/auth/sign-out-others', 'POST', {});
    assert.equal(r.j.autoLogin.otherSignIns, 0);
    assert.equal((await call('auto', '/api/state')).status, 401);
    assert.equal((await call('kept', '/api/state')).status, 200);
    delete process.env.TJ_DEVICE_KEY;
  } finally {
    mock.close();
    await new Promise(resolve => backend.server.close(resolve));
    await new Promise(resolve => setTimeout(resolve, 200));
    for (const k of ['PORT', 'TJ_DATA', 'TJ_ISOLATED']) delete process.env[k];
    const resolved = path.resolve(data);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('tj-auth-test-')) fs.rmSync(resolved, { recursive: true, force: true });
  }
});
