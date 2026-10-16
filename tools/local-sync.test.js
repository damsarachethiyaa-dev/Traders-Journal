'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { once } = require('node:events');

test('MT5 pairing, download and sync stay on the local server', async () => {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'tj-local-test-'));
  const originalPort = process.env.PORT, originalData = process.env.TJ_DATA;
  process.env.PORT = String(port);
  process.env.TJ_DATA = data;
  process.env.TJ_ISOLATED = '1'; // never touch the real project data folder
  const backend = require('../server.js');
  if (!backend.server.listening) await once(backend.server, 'listening');
  const base = `http://127.0.0.1:${port}`;
  let cookie = '';
  const request = async (route, method = 'GET', body, extra = {}) => {
    const response = await fetch(base + route, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  };
  try {
    assert.equal(backend.server.address().address, '127.0.0.1');
    assert.equal((await request('/')).status, 200);
    assert.equal((await request('/fonts/fonts.css')).status, 200);
    assert.equal((await request('/settings.js')).status, 200);
    assert.equal((await request('/settings.css')).status, 200);
    for (const route of ['/data/db.json', '/DATA/db.json', '/server.js', '/preload.js', '/package.json']) {
      assert.equal((await request(route)).status, 404, route);
    }
    const foreignHostStatus = await new Promise((resolve, reject) => {
      http.get(base + '/api/state', { headers: { Host: `remote.example:${port}` } }, response => {
        response.resume();
        resolve(response.statusCode);
      }).on('error', reject);
    });
    assert.equal(foreignHostStatus, 403);
    assert.equal((await request('/api/connections', 'POST', { name: 'Untrusted' }, { Origin: 'https://remote.example' })).status, 403);
    assert.equal((await request('/api/connections', 'POST', { name: 'Anonymous' }, { Origin: base })).status, 401, 'the API needs a login');
    assert.equal((await request('/api/auth/register', 'POST', { firstName: 'Test', username: 'tester', password: 'a-long-test-password' }, { Origin: base })).status, 201);
    const response = await request('/api/connections', 'POST', { name: 'Local test', platform: 'mt5' }, { Origin: base });
    assert.equal(response.status, 201);
    const connection = await response.json();
    assert.equal(connection.apiUrl, base);
    const source = await (await request('/download/mt5?conn=' + connection.id)).text();
    assert.ok(source.includes(`input string ApiBaseUrl = "${base}";`));
    assert.ok(source.includes(`input string ConnectionCode = "${connection.code}";`));
    assert.ok(source.includes('if(!IsLocalApiUrl(ApiBaseUrl))'));
    assert.ok(!source.includes('https://tradersjournal.app'));
    assert.equal((await request('/api/metatrader/heartbeat', 'POST', {})).status, 401);
    const pairing = await request('/api/metatrader/pair', 'POST', { code: connection.code, platform: 'mt5', deviceId: 'local-test' });
    assert.equal(pairing.status, 200);
    const { token } = await pairing.json();
    const authorization = { Authorization: 'Bearer ' + token };
    const sync = await request('/api/metatrader/trades', 'POST', {
      runId: 'local-test', snapshot: true, batchIndex: 0, batchCount: 1, requestVersion: 0,
      trades: [{ externalId: '1', symbol: 'EURUSD', side: 'LONG', status: 'closed', entryTime: '2026-10-01T09:00:00Z', exitTime: '2026-10-01T10:00:00Z', entryPrice: 1, exitPrice: 2, quantity: 1, profit: 10, commission: -1, swap: 0 }]
    }, authorization);
    assert.equal(sync.status, 200);
    const state = await (await request('/api/state')).json();
    assert.equal(state.trades.length, 1);
    assert.equal(state.connections[0].status, 'online');
    assert.ok(!JSON.stringify(state).includes(token));
    backend.flush();
    assert.equal(JSON.parse(fs.readFileSync(path.join(data, 'db.json'))).trades[connection.id]['1'].profit, 10);
  } finally {
    await new Promise(resolve => backend.server.close(resolve));
    // Let the backend's pending debounced write finish before cleaning its temporary directory.
    await new Promise(resolve => setTimeout(resolve, 200));
    if (originalPort === undefined) delete process.env.PORT; else process.env.PORT = originalPort;
    if (originalData === undefined) delete process.env.TJ_DATA; else process.env.TJ_DATA = originalData;
    delete process.env.TJ_ISOLATED;
    const resolved = path.resolve(data);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('tj-local-test-')) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
});
