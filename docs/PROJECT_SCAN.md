# Traders Journal project scan

Date: 15 October 2026

## Scope and result

Reviewed the application source in `C:/GPT/local`: Electron shell, preload bridge, dashboard, Node HTTP API and persistence, MT5 connector, package configuration and lockfile, startup script, font/icon utilities, and existing zoom diagnostic. Inspected bundled assets and compared the unpacked distribution's application archive with source.

The application starts and its basic manual-trade workflow works. The scan found security, sync-integrity, and accounting issues that should be addressed before relying on it for trading records. This was a review; application source and existing user data were not changed.

P1 means a high-priority security, data-integrity, or accounting issue. P2 means an actionable issue with a narrower trigger or impact. Runtime-confirmed findings are distinguished from source-review findings.

## Findings

### 1. P1 — Capitalized static paths expose the server-mode database

Location: [server.js:222](C:/GPT/local/server.js:222)

The directory denylist is case-sensitive, while the Windows filesystem accepts different capitalization. In an isolated copy running the backend with its default in-project data location, `/data/db.json` returned 404 but `/DATA/db.json` returned 200, including a paired connection's bearer token. Similar capitalization bypasses other blocked directory names.

Impact: access to private trade records and connector credentials through an endpoint intended to be blocked. The database exposure applies to standalone server mode; the desktop shell puts its active database outside the static root.

Fix: serve an explicit allowlist of dashboard files and font assets. Do not expose arbitrary paths below the project root. Use filesystem-aware containment checks as an additional safeguard.

Evidence: runtime-confirmed with synthetic credentials; no real token was printed.

### 2. P1 — Trade symbols can execute script in the dashboard

Location: [index.html:901](C:/GPT/local/index.html:901); related unescaped identifier attributes at [index.html:907](C:/GPT/local/index.html:907) and [index.html:964](C:/GPT/local/index.html:964).

The activity summary inserts its most-traded symbol into `innerHTML` without escaping. Other table cells escape symbols, but this summary does not. A symbol containing an image error handler executed JavaScript during the hidden Electron test. Numeric HTML entities survived the manual form's uppercase normalization.

Impact: a malicious stored symbol can run with the dashboard's privileges, access manual trades and notes, and call the local management API. This proves renderer script execution, not native Node execution or a sandbox escape. Manual entry requires entering malicious content; the sync API also accepts unrestricted symbol strings. Raw external IDs create additional HTML-attribute injection surfaces.

Fix: use text nodes or `textContent` for user-controlled values, escape every attribute, validate connector IDs, and add an appropriate Content Security Policy after removing incompatible inline handlers.

Evidence: runtime-confirmed by setting a harmless test-only DOM attribute in a temporary Electron profile.

### 3. P1 — An invalid snapshot deletes valid trades and reports success

Location: [server.js:121](C:/GPT/local/server.js:121) and [server.js:140](C:/GPT/local/server.js:140)

Invalid records are skipped, but the batch is still counted as complete. Completion deletes every stored trade not present in the accepted-record set. In the test, two valid stored trades were followed by a one-batch snapshot containing a record with an invalid entry date. The server returned 200 with `accepted: 0` and removed both valid trades.

Impact: malformed connector data can erase previously imported history. A legitimate empty snapshot must remain distinguishable from a rejected snapshot.

Fix: validate the entire batch and snapshot metadata before mutating stored trades. Stage snapshots separately and commit only a complete, valid snapshot. Reject inconsistent batch counts and indices.

Evidence: runtime-confirmed through the authenticated API using disposable trades.

### 4. P1 — Disabling open-position sync marks partial closes as completed trades

Location: [TradersJournalSync_MT5.mq5:274](C:/GPT/local/connector/TradersJournalSync_MT5.mq5:274), completion validation at [line 344](C:/GPT/local/connector/TradersJournalSync_MT5.mq5:344), and serialization at [line 419](C:/GPT/local/connector/TradersJournalSync_MT5.mq5:419).

When open-position sync is off, the connector returns before examining live positions. A position with both an entry and a partial exit passes the completion filter even while some volume remains open. Its `active` flag stays false, so it is sent as closed, with the full entry quantity and only the partial exit's results. The dashboard includes it in completed-trade statistics.

Fix: always identify active position IDs before filtering. Exclude active records when open-position sync is disabled, or deliberately model partial exits as separate realized records with matching quantities.

Evidence: source-review finding. MetaTrader compilation and a live broker test were not performed. The deal/position distinction is documented in the [official MQL5 deal reference](https://www.mql5.com/en/docs/constants/tradingconstants/dealproperties).

### 5. P1 — The locked Electron runtime has published security advisories

Location: [package.json:70](C:/GPT/local/package.json:70) and `package-lock.json`.

Installed Electron is 41.7.1. `npm audit --json` reported 10 affected packages: 2 high and 8 moderate, with no critical findings. The high-severity package entries are Electron and extract-zip; the remaining entries include build/download dependencies. These are affected-package counts, not ten demonstrated exploits in this application.

Electron is declared as a development dependency but supplies the desktop runtime. Several reported advisories concern Electron sandbox behavior. The current window restrictions can limit exposure; the scan did not establish application-specific exploitability for each advisory. One example is the [Electron sandbox inheritance advisory](https://github.com/electron/electron/security/advisories/GHSA-gr2m-v5gq-v685).

Fix: update the runtime and build dependency tree to reviewed, patched versions, then rebuild and verify both distributions. Review proposed dependency changes rather than applying a forced audit fix blindly.

Evidence: npm registry audit and installed-version inspection on the scan date.

### 6. P2 — Management endpoints accept foreign Host and Origin values

Location: [server.js:153](C:/GPT/local/server.js:153) and [server.js:210](C:/GPT/local/server.js:210).

The app API has no management credential or Host/Origin validation. A request with an unrelated Host received the full state response. A POST with a foreign Origin and `Content-Type: text/plain` successfully created a connection. Loopback binding limits network reach but does not authenticate request provenance.

Impact: this leaves the service susceptible to unwanted cross-origin mutations and DNS-rebinding-style access where browser/network conditions permit. A full remote browser attack was not performed; browser local-network restrictions may affect practical reachability.

Fix: validate allowed hosts and origins, reject unexpected body media types, and protect management operations with a session credential or CSRF token. Preserve the separate bearer-authenticated EA protocol.

Evidence: runtime-confirmed HTTP behavior, with the browser attack surface qualified above.

### 7. P2 — A strategy called `constructor` crashes dashboard rendering

Location: [index.html:872](C:/GPT/local/index.html:872)

Strategy grouping uses an ordinary object and assumes every existing property is an array. Names such as `constructor`, `toString`, or `__proto__` resolve to inherited properties and cause `.push` to fail. Saving a trade with such a tag triggers a render exception; the saved value can trigger the same failure on subsequent loads.

Fix: use `Map` or a null-prototype dictionary for user-controlled keys. Audit similar grouping dictionaries.

Evidence: reproduced in both a JavaScript harness and the hidden Electron renderer.

### 8. P2 — Today and date ranges become stale after midnight

Location: [index.html:688](C:/GPT/local/index.html:688), [index.html:726](C:/GPT/local/index.html:726), and [index.html:778](C:/GPT/local/index.html:778).

`NOW` and `TODAY` are created once at page load. Regular polling does not update them. A long-running desktop or tray session therefore keeps yesterday's Today summary, greeting date, relative date ranges, and chart endpoint. New trades can appear in total statistics while falling beyond the chart's stale final day.

Fix: calculate the current day at render time or refresh date state on midnight and resume from sleep.

Evidence: source-review finding; a real overnight session was not run.

### 9. P2 — Manual saves report success even when storage fails

Location: [index.html:694](C:/GPT/local/index.html:694) and [index.html:951](C:/GPT/local/index.html:951).

The storage helper silently ignores `localStorage.setItem` failures. Trade submission updates memory, closes the form, and displays a saved message regardless. When storage is full or unavailable, trades and notes appear saved but disappear after reload.

Fix: return a persistence result, display a useful failure message, and avoid confirming a durable save until it succeeds. Consider moving manual records and notes into the same backed-up data store as synced records.

Evidence: source-review finding; no quota exhaustion was induced in the user's profile.

### 10. P2 — Non-USD account results are labeled and combined as dollars

Location: [index.html:693](C:/GPT/local/index.html:693), [index.html:720](C:/GPT/local/index.html:720), and [index.html:1015](C:/GPT/local/index.html:1015).

The dashboard forces `$` and All Accounts at startup. Trade conversion keeps numerical profit but drops the account's currency, even though connection metadata records it. A EUR account's profit is therefore displayed as dollars, and accounts in different currencies are added without conversion.

Fix: retain currency with each synced record/account, label results with the actual currency, and separate currency totals or use an explicitly defined conversion method.

Evidence: source-review finding. No external exchange-rate calculation was attempted.

## Additional observations

- **Retained trades become inaccessible:** `DELETE ...?keepTrades=1` preserves records on disk, but `/api/state` enumerates only existing connections. The isolated test confirmed one retained trade on disk and zero visible trades. The current UI does not use this flag. See [server.js:160](C:/GPT/local/server.js:160) and [server.js:190](C:/GPT/local/server.js:190).
- **Database writes are not atomic:** the backend overwrites its only JSON file directly. A damaged/truncated file is silently treated as a first run and may later be overwritten. Add atomic replacement, a recoverable backup, and visible corruption handling. See [server.js:15](C:/GPT/local/server.js:15).
- **Reversal aggregation needs dedicated cases:** `DEAL_ENTRY_INOUT` adds the full reversal volume to both entry and exit totals. A netting reversal includes closing existing volume and opening the remainder, so weighted prices and quantities can be misleading. This is a source-review concern requiring MT5 scenario tests. See [connector line 253](C:/GPT/local/connector/TradersJournalSync_MT5.mq5:253) and the [official reversal definition](https://www.mql5.com/en/docs/constants/tradingconstants/dealproperties).
- **Hidden startup races window display:** `--hidden` schedules one hide after 50 ms, while `ready-to-show` later calls `show()` unconditionally. See [main.js:58](C:/GPT/local/main.js:58) and [main.js:130](C:/GPT/local/main.js:130).
- **Test infrastructure is minimal:** there is no package test or lint script. The existing zoom utility prints observations without assertions. The core sync, persistence, accounting, and date-boundary paths need regression coverage.
- **Some visible functions remain placeholders:** MT4 has no bundled connector; the setup-video button has no playback handler; settings leads to a placeholder. The profile action labeled “Reset demo data” actually clears manual trades and journal entries after confirmation.
- **No Git repository was found:** branch history and change attribution could not be reviewed.

## Verification performed

| Check | Result |
| --- | --- |
| Syntax of main, preload, server, three tools, and inline dashboard JavaScript | All seven parsed successfully |
| Temporary backend startup, health, and dashboard responses | Passed |
| Connection creation, pairing, unauthorized heartbeat rejection, connector download | Passed basic smoke checks |
| Valid authenticated snapshot | Two synthetic trades imported |
| Invalid snapshot preservation | Failed: both valid trades removed |
| Static directory case protection on Windows | Failed: capitalized path returned database with synthetic token |
| Foreign Host and Origin rejection | Failed: state read and connection creation accepted |
| Hidden Electron load with actual preload | Passed; desktop bridge available |
| Manual add and navigation through logging, connections, dashboard | Passed; entry 100, exit 110, quantity 1, fee 2 produced net 8 |
| Reserved strategy-name handling | Failed: renderer exception |
| Symbol rendered strictly as text | Failed: harmless injected handler executed |
| Retained disconnected trades visible in state | Failed; preserved only on disk |
| Installed dependency tree | Top-level dependencies resolved |
| Dependency vulnerability audit | 10 affected packages: 2 high, 8 moderate |
| Unpacked distribution application-source comparison | Main, preload, server, dashboard, and connector matched source byte for byte |

The packaged `package.json` omits build/development metadata, as expected for the distribution. No installer was executed or rebuilt. Binary internals and third-party dependency source were not exhaustively audited. MT5 compilation, live trading-terminal integration, full visual/accessibility testing, and a real overnight session remain unverified.

All runtime tests used a temporary project copy or temporary database/profile on ports 18765 and 18766. Test servers and the hidden Electron process exited. Temporary harnesses and synthetic results remain under `C:/Users/LEGION/AppData/Local/Temp/tj-scan-78dd9d9e847b4c96b3e95cbbe176f4ea`.

## Suggested repair order

1. Restrict static file serving, eliminate HTML injection, and secure management requests.
2. Make snapshot validation/commit safe and correct partial-close handling.
3. Update affected dependencies and rebuild distributions.
4. Repair strategy grouping, date rollover, persistence reporting, and currency handling.
5. Add regression tests for the reproduced failures and run MT5 partial-close/reversal scenarios.
