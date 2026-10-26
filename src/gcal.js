'use strict';
// Read-only calendar link for the dashboard greeting.
// The user pastes their private iCal address (Google Calendar → Settings → Integrate calendar →
// "Secret address in iCal format"). This module downloads it, parses events (including repeating
// ones) and serves today's agenda. No OAuth, no Google account access; the address stays in db.json.
const https = require('https');
const dns = require('dns').promises;
const net = require('net');

const MAX_BYTES = 6 * 1024 * 1024;
const CACHE_MS = 5 * 60 * 1000;
let cache = { url: '', at: 0, events: null, name: '', error: '' };

/* ---------- safe download ---------- */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
}
async function fetchText(rawUrl, depth = 0) {
  let u;
  try { u = new URL(rawUrl.replace(/^webcal:/i, 'https:')); } catch (e) { throw new Error('That does not look like a valid link.'); }
  if (u.protocol !== 'https:') throw new Error('The calendar link must start with https:// (or webcal://).');
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => { throw new Error('Could not reach that address. Check your internet connection and the link.'); });
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('Local network addresses are not allowed.');
  return new Promise((resolve, reject) => {
    const req = https.get(u, { headers: { 'User-Agent': 'TradersJournal-Local/1.0', Accept: 'text/calendar, text/plain, */*' }, timeout: 12000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (depth >= 4) return reject(new Error('Too many redirects.'));
        return fetchText(new URL(res.headers.location, u).toString(), depth + 1).then(resolve, reject);
      }
      if (res.statusCode === 404 || res.statusCode === 403) { res.resume(); return reject(new Error('Calendar not found or the secret link was reset. Copy a fresh iCal address.')); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('The calendar server answered with HTTP ' + res.statusCode + '.')); }
      const chunks = []; let n = 0;
      res.on('data', c => { n += c.length; if (n > MAX_BYTES) { req.destroy(new Error('That calendar file is too large.')); } else chunks.push(c); });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('The calendar server took too long to answer.')));
    req.on('error', e => reject(e));
  });
}

/* ---------- iCal parsing ---------- */
const unfold = t => t.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
function parseLine(line) {
  const i = line.indexOf(':'); if (i < 0) return null;
  const left = line.slice(0, i), val = line.slice(i + 1), parts = left.split(';'), params = {};
  parts.slice(1).forEach(p => { const k = p.indexOf('='); if (k > 0) params[p.slice(0, k).toUpperCase()] = p.slice(k + 1).replace(/^"|"$/g, ''); });
  return { name: parts[0].toUpperCase(), params, val };
}
const unesc = s => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
function parseDt(val, params) {
  const m = String(val).trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  if (m[4] === undefined) return { allDay: true, y: +m[1], mo: +m[2], d: +m[3], h: 0, mi: 0, s: 0, tz: null };
  return { allDay: false, y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +m[6], tz: m[7] ? 'UTC' : (params.TZID || null) };
}
const tzFmt = {};
function offsetAt(tz, t) {
  const f = tzFmt[tz] || (tzFmt[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }));
  const o = {}; for (const x of f.formatToParts(new Date(t))) o[x.type] = +x.value;
  return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - t;
}
function toMs(p, y, mo, d) {
  y = y === undefined ? p.y : y; mo = mo === undefined ? p.mo : mo; d = d === undefined ? p.d : d;
  if (p.allDay) return new Date(y, mo - 1, d).getTime();
  if (p.tz === 'UTC') return Date.UTC(y, mo - 1, d, p.h, p.mi, p.s);
  if (p.tz) { try { const g = Date.UTC(y, mo - 1, d, p.h, p.mi, p.s); let t = g - offsetAt(p.tz, g); t = g - offsetAt(p.tz, t); return t; } catch (e) { /* unknown zone: floating */ } }
  return new Date(y, mo - 1, d, p.h, p.mi, p.s).getTime();
}
function parseDuration(s) {
  const m = String(s).match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/); if (!m) return 0;
  const ms = ((+m[2] || 0) * 7 * 86400 + (+m[3] || 0) * 86400 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0)) * 1000;
  return m[1] === '-' ? -ms : ms;
}
function parseIcs(text) {
  const lines = unfold(text), events = []; let cur = null, name = '';
  for (const ln of lines) {
    if (ln === 'BEGIN:VEVENT') { cur = { ex: [], raw: {} }; continue; }
    if (ln === 'END:VEVENT') { if (cur && cur.start) events.push(cur); cur = null; continue; }
    const p = parseLine(ln); if (!p) continue;
    if (!cur) { if (p.name === 'X-WR-CALNAME') name = unesc(p.val); continue; }
    switch (p.name) {
      case 'SUMMARY': cur.title = unesc(p.val); break;
      case 'LOCATION': cur.location = unesc(p.val); break;
      case 'UID': cur.uid = p.val; break;
      case 'STATUS': cur.status = p.val.toUpperCase(); break;
      case 'DTSTART': cur.start = parseDt(p.val, p.params); break;
      case 'DTEND': cur.end = parseDt(p.val, p.params); break;
      case 'DURATION': cur.dur = parseDuration(p.val); break;
      case 'RRULE': cur.rrule = p.val; break;
      case 'EXDATE': p.val.split(',').forEach(v => { const d = parseDt(v, p.params); if (d) cur.ex.push(toMs(d)); }); break;
      case 'RECURRENCE-ID': cur.recId = parseDt(p.val, p.params); break;
    }
  }
  return { events, name };
}
const DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function parseRrule(s) {
  const o = {}; s.split(';').forEach(kv => { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i).toUpperCase()] = kv.slice(i + 1); });
  const byday = (o.BYDAY || '').split(',').filter(Boolean).map(x => { const m = x.match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/); return m ? { n: m[1] ? +m[1] : 0, d: DAYS[m[2]] } : null; }).filter(Boolean);
  return { freq: o.FREQ, interval: Math.max(1, +o.INTERVAL || 1), count: o.COUNT ? +o.COUNT : 0, until: o.UNTIL ? parseDt(o.UNTIL, {}) : null, byday, bymonthday: (o.BYMONTHDAY || '').split(',').filter(Boolean).map(Number), bymonth: (o.BYMONTH || '').split(',').filter(Boolean).map(Number) };
}
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
function* civilDates(rr, b) {
  const base = Date.UTC(b.y, b.mo - 1, b.d), DAY = 86400000;
  const fromUtc = t => { const d = new Date(t); return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() }; };
  if (rr.freq === 'DAILY') { for (let k = 0; ; k++) yield fromUtc(base + k * rr.interval * DAY); }
  else if (rr.freq === 'WEEKLY') {
    const wd0 = new Date(base).getUTCDay(), mon = base - ((wd0 + 6) % 7) * DAY;
    const days = (rr.byday.length ? rr.byday.map(x => x.d) : [wd0]).map(d => (d + 6) % 7).sort((a, c) => a - c);
    for (let w = 0; ; w++) for (const off of days) { const t = mon + (w * rr.interval * 7 + off) * DAY; if (t >= base) yield fromUtc(t); }
  } else if (rr.freq === 'MONTHLY') {
    for (let k = 0; ; k++) {
      const idx = (b.mo - 1) + k * rr.interval, y = b.y + Math.floor(idx / 12), mo = (idx % 12) + 1, n = dim(y, mo), out = [];
      if (rr.bymonthday.length) rr.bymonthday.forEach(d => { const dd = d > 0 ? d : n + d + 1; if (dd >= 1 && dd <= n) out.push(dd); });
      else if (rr.byday.length) rr.byday.forEach(x => {
        const ds = []; for (let d = 1; d <= n; d++) if (new Date(Date.UTC(y, mo - 1, d)).getUTCDay() === x.d) ds.push(d);
        if (!x.n) out.push(...ds); else { const d = x.n > 0 ? ds[x.n - 1] : ds[ds.length + x.n]; if (d) out.push(d); }
      });
      else if (b.d <= n) out.push(b.d);
      for (const d of out.sort((a, c) => a - c)) if (Date.UTC(y, mo - 1, d) >= base) yield { y, mo, d, wd: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() };
    }
  } else if (rr.freq === 'YEARLY') {
    for (let k = 0; ; k++) {
      const y = b.y + k * rr.interval;
      for (const mo of (rr.bymonth.length ? rr.bymonth : [b.mo])) { const d = rr.bymonthday[0] || b.d; if (d <= dim(y, mo)) yield { y, mo, d, wd: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() }; }
    }
  }
}
function occurrences(ev, winStart, winEnd) {
  const s0 = toMs(ev.start);
  let dur = ev.end ? toMs(ev.end) - s0 : (ev.dur !== undefined ? ev.dur : (ev.start.allDay ? 86400000 : 0));
  if (dur < 0) dur = 0;
  const out = [];
  if (!ev.rrule) { if (s0 < winEnd && s0 + Math.max(dur, 1) > winStart) out.push({ start: s0, end: s0 + dur }); return out; }
  const rr = parseRrule(ev.rrule); if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(rr.freq)) return out;
  const untilMs = rr.until ? toMs(rr.until) : Infinity, exset = new Set(ev.ex);
  let count = 0, guard = 0;
  for (const c of civilDates(rr, ev.start)) {
    if (++guard > 20000) break;
    const st = toMs(ev.start, c.y, c.mo, c.d);
    if (st > untilMs || st >= winEnd + 86400000 * 2) break;
    count++;
    if (rr.count && count > rr.count) break;
    if (exset.has(st)) continue;
    if (st < winEnd && st + Math.max(dur, 1) > winStart) out.push({ start: st, end: st + dur });
  }
  return out;
}
function expandAll(parsed, winStart, winEnd) {
  const overridden = new Set(parsed.events.filter(e => e.recId && e.uid).map(e => e.uid + '|' + toMs(e.recId)));
  const res = [];
  for (const ev of parsed.events) {
    if (ev.status === 'CANCELLED') continue;
    for (const o of occurrences(ev, winStart, winEnd)) {
      if (!ev.recId && ev.uid && overridden.has(ev.uid + '|' + o.start)) continue;
      res.push({ title: ev.title || '(No title)', start: o.start, end: o.end, allDay: !!ev.start.allDay, location: ev.location || '' });
    }
  }
  return res.sort((a, b) => a.start - b.start || a.end - b.end);
}

/* ---------- http handlers ---------- */
async function load(db, force) {
  const cfg = db.gcal; if (!cfg || !cfg.url) return null;
  if (!force && cache.url === cfg.url && cache.events && Date.now() - cache.at < CACHE_MS) return cache;
  try {
    const text = await fetchText(cfg.url);
    if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('That link did not return a calendar. Use the “Secret address in iCal format”.');
    const parsed = parseIcs(text);
    cache = { url: cfg.url, at: Date.now(), events: parsed, name: parsed.name || cfg.name || 'Google Calendar', error: '' };
  } catch (e) {
    cache = Object.assign({}, cache.url === cfg.url ? cache : { events: null, at: 0 }, { url: cfg.url, error: e.message, failedAt: Date.now() });
  }
  return cache;
}
async function handle(req, res, url, ctx) {
  const { db, save, bump, send, readBody } = ctx, p = url.pathname, m = req.method;
  if (p === '/api/gcal/status' && m === 'GET') {
    const c = db.gcal ? await load(db, false) : null;
    return send(res, 200, { linked: !!db.gcal, name: db.gcal ? (c && c.name) || db.gcal.name : '', linkedAt: db.gcal ? db.gcal.linkedAt : null, lastSync: c && c.events ? c.at : null, error: c ? c.error : '' });
  }
  if (p === '/api/gcal/link' && m === 'POST') {
    const b = await readBody(req), raw = String(b.url || '').trim();
    if (!raw) return send(res, 400, { error: 'Paste your calendar’s iCal address first.' });
    let text;
    try { text = await fetchText(raw); } catch (e) { return send(res, 400, { error: e.message }); }
    if (!/BEGIN:VCALENDAR/.test(text)) return send(res, 400, { error: 'That link did not return a calendar. Use the “Secret address in iCal format”.' });
    const parsed = parseIcs(text);
    db.gcal = { url: raw.replace(/^webcal:/i, 'https:'), name: parsed.name || 'Google Calendar', linkedAt: Date.now() };
    cache = { url: db.gcal.url, at: Date.now(), events: parsed, name: db.gcal.name, error: '' };
    save(); if (bump) bump();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return send(res, 200, { ok: true, name: db.gcal.name, eventsNext7Days: expandAll(parsed, start.getTime(), start.getTime() + 7 * 86400000).length });
  }
  if (p === '/api/gcal/unlink' && m === 'POST') {
    delete db.gcal; cache = { url: '', at: 0, events: null, name: '', error: '' };
    save(); if (bump) bump();
    return send(res, 200, { ok: true });
  }
  if (p === '/api/gcal/events' && m === 'GET') {
    if (!db.gcal) return send(res, 200, { linked: false, events: [] });
    const days = Math.max(1, Math.min(14, +url.searchParams.get('days') || 2));
    const c = await load(db, url.searchParams.get('refresh') === '1');
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const events = c && c.events ? expandAll(c.events, start.getTime(), start.getTime() + days * 86400000).map(e => ({ title: e.title, start: new Date(e.start).toISOString(), end: new Date(e.end).toISOString(), allDay: e.allDay, location: e.location })) : [];
    return send(res, 200, { linked: true, name: (c && c.name) || db.gcal.name, events, error: c ? c.error : '', fetchedAt: c ? c.at : null });
  }
  return false;
}
module.exports = { handle, parseIcs, expandAll };
