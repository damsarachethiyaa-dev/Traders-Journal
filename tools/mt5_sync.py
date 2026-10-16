#!/usr/bin/env python3
"""
Direct MetaTrader 5 Multi-Account Synchronizer & Scanner for Traders Journal.
1. Connects directly to the running MT5 terminal via the official MetaTrader5 Python API.
2. Automatically scans local MetaTrader 5 data folders (%APPDATA%/MetaQuotes/Terminal/*)
   to discover all trading accounts and historical trades stored on this PC.
"""
import os
import re
import sys
import glob
import time
import datetime
import json
import math
import calendar
import requests
import MetaTrader5 as mt5

# ---------------------------------------------------------------------------
# Broker server time -> real UTC
# ---------------------------------------------------------------------------
_HERE = os.path.dirname(os.path.abspath(__file__))
_OFFSET_CACHE = os.path.join(_HERE, ".mt5_server_offset.json")
_TIME_CFG = os.path.join(_HERE, "mt5_time.json")
_TZ = {"now": 0, "rule": "fixed", "mode": "unknown"}


def _read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _nth_sunday(year, month, n):
    days = [
        d
        for d in calendar.Calendar(firstweekday=6).itermonthdates(year, month)
        if d.month == month and d.weekday() == 6
    ]
    return days[n - 1] if n > 0 else days[-1]


def _dst_active(rule, d):
    if rule == "eu":
        return _nth_sunday(d.year, 3, -1) <= d < _nth_sunday(d.year, 10, -1)
    if rule == "us":
        return _nth_sunday(d.year, 3, 2) <= d < _nth_sunday(d.year, 11, 1)
    return False


def detect_server_offset(extra_symbols=()):
    """Seconds the broker clock is ahead of real UTC."""
    cfg = _read_json(_TIME_CFG)
    if isinstance(cfg.get("offsetHours"), (int, float)):
        _TZ["mode"] = "configured"
        return int(round(float(cfg["offsetHours"]) * 3600))
    candidates = list(extra_symbols) + [
        "XAUUSD",
        "EURUSD",
        "GBPUSD",
        "USDJPY",
        "US30",
        "NAS100",
        "BTCUSD",
        "GOLD",
        "USTEC",
    ]
    best = None
    for sym in candidates[:16]:
        try:
            if not mt5.symbol_select(sym, True):
                continue
            tick = mt5.symbol_info_tick(sym)
        except Exception:
            continue
        if tick and tick.time and (best is None or tick.time > best):
            best = tick.time
    cached = _read_json(_OFFSET_CACHE).get("seconds")
    if best is None:
        _TZ["mode"] = "cached" if cached is not None else "unknown"
        return int(cached) if cached is not None else 0
    hours = (best - time.time()) / 3600.0
    grid = round(hours * 2) / 2.0
    if abs(hours - grid) * 3600.0 <= 45:
        seconds = int(grid * 3600)
        _TZ["mode"] = "measured"
        try:
            with open(_OFFSET_CACHE, "w", encoding="utf-8") as f:
                json.dump({"seconds": seconds, "at": int(time.time())}, f)
        except Exception:
            pass
        return seconds
    if (
        cached is not None
        and (cached - (best - time.time())) >= -120
        and (cached - (best - time.time())) <= 60 * 3600
    ):
        _TZ["mode"] = "cached"
        return int(cached)
    _TZ["mode"] = "estimated"
    return int(math.ceil(hours)) * 3600


def init_time_offset(extra_symbols=()):
    off = detect_server_offset(extra_symbols)
    cfg = _read_json(_TIME_CFG)
    rule = cfg.get("rule") if cfg.get("rule") in ("eu", "us", "fixed") else "eu"
    now_wall = datetime.datetime.fromtimestamp(
        time.time() + off, tz=datetime.timezone.utc
    ).replace(tzinfo=None)
    expected = 2 * 3600 + (3600 if _dst_active(rule, now_wall.date()) else 0)
    if rule == "fixed" or off != expected:
        rule = "fixed"
    _TZ["now"] = off
    _TZ["rule"] = rule
    return off


def server_ts_to_utc(ts):
    """MT5 epoch (broker clock) -> timezone-aware real-UTC datetime."""
    wall = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc).replace(
        tzinfo=None
    )
    off = _TZ["now"]
    if _TZ["rule"] != "fixed":
        off = 2 * 3600 + (3600 if _dst_active(_TZ["rule"], wall.date()) else 0)
    return (wall - datetime.timedelta(seconds=off)).replace(
        tzinfo=datetime.timezone.utc
    )


SERVER_URL = "http://127.0.0.1:8765"


def _calc_symbol_profit(side, symbol, volume, entry_price, exit_price):
    """Calculate profit for log-reconstructed trades using MT5 or standard contract sizes."""
    diff = (
        (exit_price - entry_price)
        if side == "LONG"
        else (entry_price - exit_price)
    )
    sym_u = symbol.upper()
    if "XAU" in sym_u or "GOLD" in sym_u:
        mult = 100.0
    elif "XAG" in sym_u or "SILVER" in sym_u:
        mult = 5000.0
    elif len(sym_u) == 6 and sym_u.endswith("USD"):
        mult = 100000.0
    elif "BTC" in sym_u or "ETH" in sym_u or "US30" in sym_u or "NAS" in sym_u or "USTEC" in sym_u:
        mult = 1.0
    else:
        mult = 100.0
    return round(diff * volume * mult, 2)


def scan_local_mt5_logs_and_folders(skip_login=None, quiet=False, target_logins=None, force=False):
    """
    Scan %APPDATA%/MetaQuotes/Terminal/* for all MT5 accounts and reconstruct
    their trade history from terminal logs when not currently active in the terminal.
    """
    appdata = os.environ.get("APPDATA", "")
    if not appdata:
        return []

    term_roots = glob.glob(os.path.join(appdata, "MetaQuotes", "Terminal", "*"))
    accounts = {}  # login -> metadata dict

    # 1. Discover accounts from bases/<Server>/trades/<Login> folders
    for root in term_roots:
        for trade_dir in glob.glob(os.path.join(root, "bases", "*", "trades", "*")):
            if not os.path.isdir(trade_dir):
                continue
            login = os.path.basename(trade_dir)
            if not login.isdigit() or login == "0":
                continue
            server = os.path.basename(os.path.dirname(os.path.dirname(trade_dir)))
            accounts.setdefault(
                login,
                {
                    "login": int(login),
                    "server": server,
                    "name": f"MT5 Account {login}",
                    "company": server.split("-")[0] if "-" in server else "MetaTrader 5",
                    "currency": "USD",
                    "leverage": 100,
                    "in_bases": True,
                    "open_deals": {},
                    "pending_close": {},
                    "closed_trades": [],
                },
            )

    # Regex patterns for MT5 terminal logs
    re_auth = re.compile(
        r"'(\d+)':\s+authorized on\s+([^\s]+)"
    )
    re_sync = re.compile(
        r"'(\d+)':\s+terminal synchronized with\s+([^:]+):"
    )
    re_deal = re.compile(
        r"^([A-Z0-9]{2})\t\d+\t(\d{2}:\d{2}:\d{2}\.\d{3})\tTrades\t'(\d+)':\s+deal #(\d+)\s+(buy|sell)\s+([\d.]+)\s+([A-Za-z0-9._#-]+)\s+at\s+([\d.]+)\s+done\s+\(based on order #(\d+)\)"
    )
    re_close_req = re.compile(
        r"^([A-Z0-9]{2})\t\d+\t(\d{2}:\d{2}:\d{2}\.\d{3})\tTrades\t'(\d+)':\s+(?:accepted\s+)?market\s+(buy|sell)\s+([\d.]+)\s+([A-Za-z0-9._#-]+),\s+close\s+#(\d+)\s+(buy|sell)\s+([\d.]+)\s+[A-Za-z0-9._#-]+\s+([\d.]+)"
    )

    # 2. Parse logs in chronological order
    for root in term_roots:
        log_files = sorted(glob.glob(os.path.join(root, "logs", "20*.log")))
        for lf in log_files:
            base = os.path.basename(lf)
            m_date = re.match(r"^(\d{4})(\d{2})(\d{2})\.log$", base)
            if not m_date:
                continue
            date_str = f"{m_date.group(1)}-{m_date.group(2)}-{m_date.group(3)}"
            try:
                with open(lf, "r", encoding="utf-16", errors="ignore") as f:
                    for raw_line in f:
                        line = raw_line.strip()
                        if not line:
                            continue

                        m_a = re_auth.search(line)
                        if m_a:
                            login, srv = m_a.group(1), m_a.group(2)
                            acc = accounts.setdefault(
                                login,
                                {
                                    "login": int(login),
                                    "server": srv,
                                    "name": f"MT5 Account {login}",
                                    "company": srv.split("-")[0] if "-" in srv else "MetaTrader 5",
                                    "currency": "USD",
                                    "leverage": 100,
                                    "in_bases": False,
                                    "open_deals": {},
                                    "pending_close": {},
                                    "closed_trades": [],
                                },
                            )
                            acc["server"] = srv
                            continue

                        m_s = re_sync.search(line)
                        if m_s:
                            login, comp = m_s.group(1), m_s.group(2).strip()
                            if login in accounts:
                                accounts[login]["company"] = comp
                            continue

                        m_c = re_close_req.match(line)
                        if m_c:
                            _, t_str, login, close_dir, vol, sym, orig_order, orig_dir, orig_vol, orig_price = m_c.groups()
                            if login in accounts:
                                accounts[login]["pending_close"][sym] = {
                                    "orig_order": orig_order,
                                    "orig_dir": orig_dir,
                                    "orig_vol": float(orig_vol),
                                    "orig_price": float(orig_price),
                                    "time_iso": f"{date_str}T{t_str[:8]}Z",
                                }
                            continue

                        m_d = re_deal.match(line)
                        if m_d:
                            _, t_str, login, deal_id, deal_dir, vol_s, sym, price_s, order_id = m_d.groups()
                            if login not in accounts:
                                continue
                            acc = accounts[login]
                            vol = float(vol_s)
                            price = float(price_s)
                            time_iso = f"{date_str}T{t_str[:8]}Z"

                            # Check if this deal fulfills a pending close request
                            pc = acc["pending_close"].get(sym)
                            if pc and order_id != pc["orig_order"]:
                                orig_ord = pc["orig_order"]
                                open_info = acc["open_deals"].pop(orig_ord, None)
                                entry_time = open_info["entryTime"] if open_info else pc["time_iso"]
                                entry_price = open_info["entryPrice"] if open_info else pc["orig_price"]
                                side = "LONG" if (open_info["dir"] if open_info else pc["orig_dir"]) == "buy" else "SHORT"
                                profit = _calc_symbol_profit(side, sym, vol, entry_price, price)
                                acc["closed_trades"].append(
                                    {
                                        "externalId": orig_ord,
                                        "symbol": sym,
                                        "side": side,
                                        "status": "closed",
                                        "entryTime": entry_time,
                                        "exitTime": time_iso,
                                        "entryPrice": round(entry_price, 5),
                                        "exitPrice": round(price, 5),
                                        "quantity": round(vol, 4),
                                        "profit": profit,
                                        "commission": 0.0,
                                        "swap": 0.0,
                                        "comment": f"Deal #{deal_id}",
                                        "stopLoss": None,
                                        "takeProfit": None,
                                    }
                                )
                                acc["pending_close"].pop(sym, None)
                            else:
                                # Opening deal
                                acc["open_deals"][order_id] = {
                                    "order_id": order_id,
                                    "deal_id": deal_id,
                                    "dir": deal_dir,
                                    "symbol": sym,
                                    "volume": vol,
                                    "entryPrice": price,
                                    "entryTime": time_iso,
                                }
            except Exception:
                continue

    synced_accounts = []
    target_set = {str(x) for x in target_logins} if target_logins else None
    for login, acc in sorted(accounts.items()):
        if skip_login and str(login) == str(skip_login):
            continue
        if target_set and str(login) not in target_set:
            continue
        trades = acc["closed_trades"]
        # Determine starting balance based on broker/server conventions
        srv_upper = (acc["server"] or "").upper()
        init_bal = 200000.0 if "FTMO" in srv_upper else 100000.0
        net_pnl = sum(float(t.get("profit", 0.0)) for t in trades)
        curr_bal = round(init_bal + net_pnl, 2)

        payload = {
            "isLiveTerminal": False,
            "force": force,
            "account": {
                "login": int(login),
                "server": acc["server"],
                "name": acc["name"],
                "company": acc["company"],
                "currency": acc["currency"],
                "leverage": acc["leverage"],
                "balance": curr_bal,
                "equity": curr_bal,
                "margin": 0.0,
                "margin_free": curr_bal,
                "margin_level": 0.0,
                "initialBalance": init_bal,
                "source": "local_history",
            },
            "trades": trades,
        }
        try:
            r = requests.post(
                f"{SERVER_URL}/api/direct-sync",
                json=payload,
                headers={"Host": "127.0.0.1:8765"},
                timeout=5,
            )
            if r.status_code == 200:
                if not quiet:
                    print(
                        f"[+] Synced PC Account: {login} ({acc['server']}) | {len(trades)} trades | Balance: ${curr_bal:,.2f}"
                    )
                synced_accounts.append(payload["account"])
        except Exception as e:
            if not quiet:
                print(f"[-] Failed syncing PC account {login}: {e}")

    return synced_accounts


def sync_once(quiet=False, scan_all=False, force=False):
    # Ensure MT5 connection is initialized
    if not mt5.terminal_info():
        if not mt5.initialize():
            if not quiet:
                print(f"[-] MT5 live terminal initialize failed: {mt5.last_error()}")
            if scan_all:
                scan_local_mt5_logs_and_folders(skip_login=None, quiet=quiet, force=force)
            return False

    term_info = mt5.terminal_info()
    acc_info = mt5.account_info()

    if not term_info or not acc_info:
        if not quiet:
            print("[-] Could not retrieve terminal or account information. Is MT5 logged in?")
        if scan_all:
            scan_local_mt5_logs_and_folders(skip_login=None, quiet=quiet, force=force)
        return False

    # 0. Broker clock -> real UTC
    open_syms = [p.symbol for p in (mt5.positions_get() or [])]
    init_time_offset(open_syms)

    # 1. Retrieve history deals
    from_date = datetime.datetime(2020, 1, 1)
    to_date = datetime.datetime.now() + datetime.timedelta(days=2)
    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        deals = []

    # 2. Extract initial balance & group positions
    positions = {}
    initial_balance = 0.0

    for d in deals:
        dd = d._asdict()
        pos_id = str(dd["position_id"])

        if pos_id == "0" or dd.get("entry") == 2 or not dd.get("symbol"):
            if dd.get("profit", 0) > 0:
                initial_balance += float(dd["profit"])
            continue

        if pos_id not in positions:
            positions[pos_id] = {
                "position_id": pos_id,
                "symbol": dd["symbol"],
                "side": "LONG" if dd["type"] == mt5.DEAL_TYPE_BUY else "SHORT",
                "deals": [],
            }
        positions[pos_id]["deals"].append(dd)

    # 3. Retrieve currently open positions from terminal
    open_pos = mt5.positions_get()
    if open_pos:
        for p in open_pos:
            pid = str(p.identifier or p.ticket)
            if pid not in positions:
                positions[pid] = {
                    "position_id": pid,
                    "symbol": p.symbol,
                    "side": "LONG" if p.type == mt5.POSITION_TYPE_BUY else "SHORT",
                    "deals": [],
                }
            positions[pid]["_live_open"] = p._asdict()

    # 4. Format trades for Traders Journal
    formatted_trades = []
    for pid, p in positions.items():
        deals_list = p.get("deals", [])
        live_open = p.get("_live_open")

        entry_d = next(
            (x for x in deals_list if x.get("entry") == 0),
            deals_list[0] if deals_list else None,
        )
        exit_d = next((x for x in deals_list if x.get("entry") == 1), None)

        if live_open:
            status = "open"
            symbol = live_open["symbol"]
            side = "LONG" if live_open["type"] == mt5.POSITION_TYPE_BUY else "SHORT"
            open_time_dt = server_ts_to_utc(live_open["time"])
            entry_time = open_time_dt.isoformat()
            exit_time = None
            entry_price = float(live_open["price_open"])
            exit_price = float(live_open["price_current"])
            volume = float(live_open["volume"])
            profit = float(live_open["profit"])
            swap = float(live_open.get("swap", 0.0))
            commission = sum(float(x.get("commission", 0.0)) for x in deals_list)
            comment = str(live_open.get("comment", ""))
            sl = float(live_open.get("sl", 0.0)) or None
            tp = float(live_open.get("tp", 0.0)) or None
        elif exit_d and entry_d:
            status = "closed"
            symbol = p["symbol"]
            side = "LONG" if entry_d["type"] == mt5.DEAL_TYPE_BUY else "SHORT"
            open_time_dt = server_ts_to_utc(entry_d["time"])
            close_time_dt = server_ts_to_utc(exit_d["time"])
            entry_time = open_time_dt.isoformat()
            exit_time = close_time_dt.isoformat()
            entry_price = float(entry_d["price"])
            exit_price = float(exit_d["price"])
            volume = float(entry_d["volume"])
            profit = sum(float(x.get("profit", 0.0)) for x in deals_list)
            commission = sum(float(x.get("commission", 0.0)) for x in deals_list)
            swap = sum(float(x.get("swap", 0.0)) for x in deals_list)
            comment = str(exit_d.get("comment") or entry_d.get("comment") or "")
            sl = None
            tp = None
        elif entry_d:
            status = "open"
            symbol = p["symbol"]
            side = "LONG" if entry_d["type"] == mt5.DEAL_TYPE_BUY else "SHORT"
            open_time_dt = server_ts_to_utc(entry_d["time"])
            entry_time = open_time_dt.isoformat()
            exit_time = None
            entry_price = float(entry_d["price"])
            exit_price = float(entry_d["price"])
            volume = float(entry_d["volume"])
            profit = sum(float(x.get("profit", 0.0)) for x in deals_list)
            commission = sum(float(x.get("commission", 0.0)) for x in deals_list)
            swap = sum(float(x.get("swap", 0.0)) for x in deals_list)
            comment = str(entry_d.get("comment") or "")
            sl = None
            tp = None
        else:
            continue

        trade_item = {
            "externalId": pid,
            "symbol": symbol,
            "side": side,
            "status": status,
            "entryTime": entry_time,
            "exitTime": exit_time,
            "entryPrice": round(entry_price, 5),
            "exitPrice": round(exit_price, 5) if exit_price is not None else None,
            "quantity": round(volume, 4),
            "profit": round(profit, 2),
            "commission": round(commission, 2),
            "swap": round(swap, 2),
            "comment": comment[:120] if comment else "",
            "stopLoss": sl,
            "takeProfit": tp,
        }
        formatted_trades.append(trade_item)

    formatted_trades.sort(key=lambda t: t.get("entryTime") or "")

    net_closed = sum(
        float(t.get("profit", 0))
        + float(t.get("commission", 0))
        + float(t.get("swap", 0))
        for t in formatted_trades
        if t.get("status") == "closed"
    )

    max_trades = int(os.environ.get("TJ_MAX_TRADES", "0"))
    if max_trades > 0 and len(formatted_trades) > max_trades:
        formatted_trades = formatted_trades[-max_trades:]

    payload = {
        "isLiveTerminal": True,
        "force": force,
        "account": {
            "login": acc_info.login,
            "server": acc_info.server,
            "name": acc_info.name,
            "company": acc_info.company,
            "currency": acc_info.currency,
            "leverage": acc_info.leverage,
            "balance": round(float(acc_info.balance), 2),
            "equity": round(float(acc_info.equity), 2),
            "margin": round(float(acc_info.margin), 2),
            "margin_free": round(float(acc_info.margin_free), 2),
            "margin_level": round(float(acc_info.margin_level or 0.0), 2),
            "initialBalance": round(float(acc_info.balance) - net_closed, 2),
            "serverUtcOffsetMinutes": int(_TZ["now"] // 60),
            "serverTimeMode": _TZ["mode"],
            "terminalBuild": term_info.build,
            "terminalPath": term_info.path,
            "source": "live_terminal",
        },
        "trades": formatted_trades,
    }

    ok = False
    try:
        r = requests.post(
            f"{SERVER_URL}/api/direct-sync",
            json=payload,
            headers={"Host": "127.0.0.1:8765"},
            timeout=5,
        )
        if r.status_code == 200:
            if not quiet:
                print(
                    f"[+] Synced Active MT5 Account: {acc_info.login} ({acc_info.server}) | {len(formatted_trades)} positions | Balance: ${acc_info.balance:,.2f} | Initial: ${payload['account']['initialBalance']:,.2f}"
                )
            ok = True
        else:
            if not quiet:
                print(f"[-] Server returned {r.status_code}: {r.text}")
    except Exception as e:
        if not quiet:
            print(f"[-] Cannot reach Traders Journal server at {SERVER_URL}: {e}")

    if scan_all:
        scan_local_mt5_logs_and_folders(skip_login=acc_info.login, quiet=quiet, force=force)

    return ok


def discover_all_accounts():
    """
    Discovers all MetaTrader 5 accounts on this PC:
    1. Active account in running MT5 terminal
    2. Historical accounts in bases/ and logs/
    Returns list of account summary objects without modifying the database.
    """
    discovered = {}

    # Check live terminal first
    try:
        if not mt5.terminal_info():
            mt5.initialize()
        acc = mt5.account_info() if mt5.terminal_info() else None
        if acc:
            live_login = str(acc.login)
            deals = mt5.history_deals_get(datetime.datetime(2020, 1, 1), datetime.datetime.now() + datetime.timedelta(days=2)) or []
            trade_count = sum(1 for d in deals if d.entry == mt5.DEAL_ENTRY_OUT)
            init_bal = 200000.0 if "FTMO" in (acc.server or "").upper() else 100000.0
            discovered[live_login] = {
                "login": int(acc.login),
                "server": acc.server or "MetaTrader 5",
                "name": acc.name or f"MT5 Account {acc.login}",
                "company": acc.company or (acc.server.split("-")[0] if "-" in acc.server else "MetaTrader 5"),
                "currency": acc.currency or "USD",
                "balance": round(float(acc.balance), 2),
                "equity": round(float(acc.equity), 2),
                "initialBalance": init_bal,
                "tradeCount": trade_count,
                "isLive": True,
            }
    except Exception:
        pass

    # Next check folders and logs for all accounts on this machine
    appdata = os.environ.get("APPDATA", "")
    if appdata:
        term_roots = glob.glob(os.path.join(appdata, "MetaQuotes", "Terminal", "*"))
        for root in term_roots:
            for trade_dir in glob.glob(os.path.join(root, "bases", "*", "trades", "*")):
                if not os.path.isdir(trade_dir):
                    continue
                login = os.path.basename(trade_dir)
                if not login.isdigit() or login == "0":
                    continue
                server = os.path.basename(os.path.dirname(os.path.dirname(trade_dir)))
                if login not in discovered:
                    srv_u = (server or "").upper()
                    init_b = 200000.0 if "FTMO" in srv_u else 100000.0
                    discovered[login] = {
                        "login": int(login),
                        "server": server,
                        "name": f"MT5 Account {login}",
                        "company": server.split("-")[0] if "-" in server else "MetaTrader 5",
                        "currency": "USD",
                        "balance": init_b,
                        "initialBalance": init_b,
                        "tradeCount": 0,
                        "isLive": False,
                    }

        re_auth = re.compile(r"'(\d+)':\s+authorized on\s+([^\s]+)")
        re_close_req = re.compile(
            r"^([A-Z0-9]{2})\t\d+\t(\d{2}:\d{2}:\d{2}\.\d{3})\tTrades\t'(\d+)':\s+(?:accepted\s+)?market\s+(buy|sell)\s+([\d.]+)\s+([A-Za-z0-9._#-]+),\s+close\s+#(\d+)\s+(buy|sell)\s+([\d.]+)\s+[A-Za-z0-9._#-]+\s+([\d.]+)"
        )
        for root in term_roots:
            log_files = sorted(glob.glob(os.path.join(root, "logs", "20*.log")))
            for lf in log_files:
                try:
                    with open(lf, "r", encoding="utf-16", errors="ignore") as f:
                        for line in f:
                            ma = re_auth.search(line)
                            if ma:
                                l, s = ma.group(1), ma.group(2)
                                if l not in discovered:
                                    srv_u = (s or "").upper()
                                    init_b = 200000.0 if "FTMO" in srv_u else 100000.0
                                    discovered[l] = {
                                        "login": int(l),
                                        "server": s,
                                        "name": f"MT5 Account {l}",
                                        "company": s.split("-")[0] if "-" in s else "MetaTrader 5",
                                        "currency": "USD",
                                        "balance": init_b,
                                        "initialBalance": init_b,
                                        "tradeCount": 0,
                                        "isLive": False,
                                    }
                                continue
                            mc = re_close_req.match(line)
                            if mc:
                                l = mc.group(3)
                                if l in discovered and not discovered[l].get("isLive"):
                                    discovered[l]["tradeCount"] += 1
                except Exception:
                    pass

    return sorted(discovered.values(), key=lambda a: (not a.get("isLive"), str(a.get("login"))))


def main():
    if "--scan-json" in sys.argv:
        accs = discover_all_accounts()
        print(json.dumps(accs))
        mt5.shutdown()
        sys.exit(0)

    if "--sync-logins" in sys.argv:
        arg_idx = sys.argv.index("--sync-logins")
        raw_logins = sys.argv[arg_idx + 1] if arg_idx + 1 < len(sys.argv) else ""
        logins = [x.strip() for x in raw_logins.split(",") if x.strip()]
        acc_info = mt5.account_info() if (mt5.terminal_info() or mt5.initialize()) else None
        if acc_info and str(acc_info.login) in logins:
            sync_once(quiet=False, scan_all=False, force=True)
        scan_local_mt5_logs_and_folders(
            skip_login=(acc_info.login if acc_info else None),
            quiet=False,
            target_logins=logins,
            force=True,
        )
        mt5.shutdown()
        sys.exit(0)

    daemon_mode = "--daemon" in sys.argv
    scan_all = "--scan-all" in sys.argv

    if not daemon_mode:
        print("=" * 64)
        print(" Traders Journal - MetaTrader 5 Auto-Connector")
        print("=" * 64)
        ok = sync_once(quiet=False, scan_all=scan_all)
        mt5.shutdown()
        sys.exit(0 if ok else 1)

    print("[mt5-sync] Running continuous MT5 background sync daemon (interval: 3s)...")
    last_state = ""
    while True:
        try:
            acc = mt5.account_info() if mt5.terminal_info() else None
            state_key = f"{acc.login}:{acc.balance}:{acc.equity}" if acc else "none"
            quiet = state_key == last_state

            ok = sync_once(quiet=quiet, scan_all=False)
            if ok and acc:
                last_state = state_key
        except Exception as e:
            print(f"[mt5-sync loop error] {e}")
        time.sleep(3)


if __name__ == "__main__":
    main()
