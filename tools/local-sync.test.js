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
  const originalPort = process.env.PORT, originalData = process.env.TJ_DATA, originalAppData = process.env.APPDATA;
  process.env.PORT = String(port);
  process.env.TJ_DATA = data;
  // a fake MetaTrader 5 install, so the add-on install never touches the real one
  const fakeAppData = path.join(data, 'appdata'), fakeTerminal = path.join(fakeAppData, 'MetaQuotes', 'Terminal', 'D0E8209F77C8CF37AD8BF550E51FF075');
  fs.mkdirSync(path.join(fakeTerminal, 'MQL5', 'Experts'), { recursive: true });
  process.env.APPDATA = fakeAppData;
  // ...and no real Program Files, so a test can never start the real MetaTrader
  const originalEnv = { ProgramFiles: process.env.ProgramFiles, pf86: process.env['ProgramFiles(x86)'], LOCALAPPDATA: process.env.LOCALAPPDATA };
  process.env.ProgramFiles = process.env['ProgramFiles(x86)'] = process.env.LOCALAPPDATA = path.join(data, 'nowhere');
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
    // Open MetaTrader 5: found through the install folder MetaTrader records itself; the start-up switch is saved
    const noMt5 = await request('/api/local-mt5/open-mt5', 'POST', {}, { Origin: base });
    assert.equal(noMt5.status, 400, 'a clear error when MetaTrader is not installed');
    assert.equal((await (await request('/api/local-mt5/status')).json()).mt5Found, false);
    const fakeInstall = path.join(data, 'MetaTrader 5');
    fs.mkdirSync(fakeInstall, { recursive: true });
    fs.writeFileSync(path.join(fakeInstall, 'terminal64.exe'), '');
    fs.writeFileSync(path.join(fakeTerminal, 'origin.txt'), '﻿' + fakeInstall, 'utf16le');
    const mt5Status = await (await request('/api/local-mt5/status')).json();
    assert.equal(mt5Status.mt5Found, true);
    assert.equal(mt5Status.openMt5, true, 'on by default');
    assert.equal((await (await request('/api/local-mt5/open-mt5-setting', 'POST', { enabled: false }, { Origin: base })).json()).openMt5, false);
    assert.equal((await (await request('/api/local-mt5/status')).json()).openMt5, false, 'the choice is remembered');
    assert.equal((await request('/api/local-mt5/open-mt5-setting', 'POST', { enabled: true }, { Origin: base })).status, 200);
    // MT5 add-on: install copies the EA and leaves a one-time code the EA pairs with by itself
    const install = await request('/api/local-mt5/addon-install', 'POST', {}, { Origin: base });
    assert.equal(install.status, 200);
    const addon = await install.json();
    assert.ok(fs.existsSync(path.join(fakeTerminal, 'MQL5', 'Experts', 'TradersJournalSync_MT5.ex5')), 'EA copied into MetaTrader');
    const codeFile = path.join(fakeAppData, 'MetaQuotes', 'Terminal', 'Common', 'Files', 'TradersJournalSync_MT5.paircode');
    assert.equal(fs.readFileSync(codeFile, 'utf8'), addon.code);
    assert.equal((await (await request('/api/local-mt5/addon-install', 'POST', {}, { Origin: base })).json()).code, addon.code, 'a waiting code is reused');
    const addonPair = await request('/api/metatrader/pair', 'POST', { code: fs.readFileSync(codeFile, 'utf8'), platform: 'mt5', deviceId: 'addon-test', account: { login: 243029, server: 'Broker-Live' } });
    assert.equal(addonPair.status, 200);
    assert.ok(!fs.existsSync(codeFile), 'the one-time code is removed once used');
    const addonAuth = { Authorization: 'Bearer ' + (await addonPair.json()).token };
    assert.equal((await request('/api/metatrader/trades', 'POST', {
      runId: 'addon', snapshot: true, batchIndex: 0, batchCount: 1, requestVersion: 0,
      trades: [{ externalId: '9', symbol: 'XAUUSD', side: 'LONG', status: 'closed', entryTime: '2026-10-02T09:00:00Z', exitTime: '2026-10-02T10:00:00Z', entryPrice: 1, exitPrice: 2, quantity: 1, profit: 240, commission: 0, swap: 0 }]
    }, addonAuth)).status, 200);
    const addonConn = (await (await request('/api/state?v=-1')).json()).connections.find(c => c.account && String(c.account.login) === '243029');
    assert.equal(addonConn.status, 'online');
    assert.equal(addonConn.tradeCount, 1);
    // direct-sync connections share a fixed placeholder token; it must never authenticate the EA API
    assert.equal((await request('/api/metatrader/heartbeat', 'POST', {}, { Authorization: 'Bearer direct-local-token' })).status, 401);
    assert.equal((await request('/api/metatrader/heartbeat', 'POST', {}, { Authorization: 'Bearer ' + 'é'.repeat(token.length) })).status, 401, 'multi-byte tokens are rejected, not a crash');
    const page = await request('/');
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(page.headers.get('x-frame-options'), 'DENY');
    const video = '/media/traders-journal-intro.mp4';
    if (fs.existsSync(path.join(__dirname, '..', video))) {
      assert.equal((await request(video, 'GET', undefined, { Range: 'bytes=0-9' })).status, 206);
      assert.equal((await request(video, 'GET', undefined, { Range: 'bytes=-10' })).status, 206);
      for (const range of ['bytes=abc', 'bytes=999999999999-', 'bytes=-']) {
        assert.equal((await request(video, 'GET', undefined, { Range: range })).status, 416, range);
      }
    }
    backend.flush();
    assert.equal(JSON.parse(fs.readFileSync(path.join(data, 'db.json'))).trades[connection.id]['1'].profit, 10);
  } finally {
    await new Promise(resolve => backend.server.close(resolve));
    // Let the backend's pending debounced write finish before cleaning its temporary directory.
    await new Promise(resolve => setTimeout(resolve, 200));
    if (originalPort === undefined) delete process.env.PORT; else process.env.PORT = originalPort;
    if (originalData === undefined) delete process.env.TJ_DATA; else process.env.TJ_DATA = originalData;
    if (originalAppData === undefined) delete process.env.APPDATA; else process.env.APPDATA = originalAppData;
    for (const [key, value] of [['ProgramFiles', originalEnv.ProgramFiles], ['ProgramFiles(x86)', originalEnv.pf86], ['LOCALAPPDATA', originalEnv.LOCALAPPDATA]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    delete process.env.TJ_ISOLATED;
    const resolved = path.resolve(data);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('tj-local-test-')) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
});
