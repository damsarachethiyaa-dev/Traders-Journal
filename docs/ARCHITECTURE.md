# 🏗️ Architecture & Technical Specification

## Traders Journal (Desktop App — KING Edition)

This document describes the technical architecture, data flow, component interactions, API schemas, and security boundaries of the **Traders Journal** desktop application.

---

## 1. High-Level Architecture Overview

Traders Journal is architected as an offline-first, dual-layer Electron and Node.js hybrid desktop application.

```mermaid
graph TD
    subgraph MetaTrader 5 Terminal
        EA["TradersJournalSync_MT5 (MQL5 EA)"]
    end

    subgraph Desktop Workstation Environment
        subgraph Electron Main Process
            Main["main.js (Electron Lifecycle & Window Manager)"]
            Tray["Windows System Tray & Notification Manager"]
            Preload["preload.js (ContextBridge)"]
        end

        subgraph Local Backend Service
            Server["server.js (Node.js HTTP Server on 127.0.0.1:8765)"]
            DB[("Local Storage: %APPDATA%/Traders Journal/data/db.json")]
        end

        subgraph Renderer Process (Chromium)
            Dashboard["Live Dashboard (index.html, hero.js)"]
            Analytics["Analytics Workstation (analytics.js)"]
            Journal["Daily Journal & Notes (daily-journal.js)"]
            Settings["KING Settings & Profile (settings.js)"]
            Intro["Native App Intro (app-intro.html)"]
        end
    end

    EA -->|"HTTP POST /api/sync (Bearer Token)"| Server
    Server -->|"Read / Write"| DB
    Server -->|"HTTP GET /api/state"| Preload
    Preload -->|"IPC / Window State"| Dashboard
    Main -->|"Coordinates"| Server
    Main -->|"Manages"| Tray
```

---

## 2. Component Breakdown

### A. Electron Main Process (`main.js`)
- **Window Management:** Creates the primary browser window (1400x900 default, maximized on load) and the intro modal splash window.
- **System Tray Integration:** Maintains an active tray icon in the Windows taskbar. Closing the window minimizes the application to the tray rather than terminating it, ensuring unbroken synchronization with MetaTrader 5.
- **IPC Handlers:** Bridges native OS capabilities (e.g., shell file opening, tray notifications, intro dismissal, promo video extraction and playback).
- **Embedded Server Lifecycle:** Automatically initializes and manages the embedded Node.js HTTP server.

### B. Preload Security Bridge (`preload.js` & `intro-preload.js`)
- Built using Electron's `contextBridge` with strict isolation:
  - `contextIsolation: true`
  - `nodeIntegration: false`
- Exposes safe APIs to the renderer window:
  - `window.desktopAPI.openExternal(url)`
  - `window.desktopAPI.showItemInFolder(path)`
  - `window.desktopAPI.notify(title, body)`
  - `window.desktopAPI.getAppVersion()`

### C. Local Ingestion Server (`server.js`)
- Runs strictly on `http://127.0.0.1:8765`.
- Provides REST endpoints for MT5 pairing, deal syncing, and state queries.
- Persists data to `data/db.json` (or the `%APPDATA%\Traders Journal\data\db.json` user directory when packaged).
- Enforces loopback binding to prevent remote network sniffing or unauthorized LAN access.

### D. Renderer User Interface
- **Dashboard (`index.html`, `hero.js`, `hero.css`):** Interactive equity curves, performance clocks, PnL calendar, win rate cards, and profit driver analysis.
- **Analytics Engine (`analytics.js`, `analytics.css`):** Four dedicated modules (Performance, Strategy Edge, Behavioral Discipline, and Progress Over Time).
- **Daily Journal (`daily-journal.js`, `daily-journal.css`):** Daily trading notes, pre-market prep, emotional tagging, and trade ticket links.
- **KING Settings (`settings.js`, `settings.css`):** Account setup, profile customization, custom fee accounting, risk rules, and JSON backup/restore.

### E. MetaTrader 5 Connector (`TradersJournalSync_MT5.mq5`)
- Native MQL5 Expert Advisor attached to any chart in the MetaTrader 5 terminal.
- Uses `WebRequest()` to transmit closed deals, orders, realized profit/loss, commission, swap, and position tickets to the local server.
- Supports automatic reconnect, ticket caching, and configurable sync intervals.

---

## 3. Local API Endpoints Reference

The local server exposes the following REST endpoints on `http://127.0.0.1:8765`:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck and server status check | No |
| `GET` | `/api/state` | Returns all synced accounts, trades, and connection metadata | No (Localhost) |
| `POST` | `/api/connect` | Initiates pairing and generates an EA connection token | No (Localhost) |
| `POST` | `/api/sync` | Ingests deal snapshots and position records from MT5 | Yes (Bearer Token) |
| `GET` | `/api/download-connector` | Serves customized `.mq5` file with embedded token | No (Localhost) |
| `DELETE` | `/api/connection/:id` | Removes an MT5 account connection | No (Localhost) |

---

## 4. Data Models & Schemas

### Trade Record Schema (`db.json`):
```json
{
  "id": "MT5_12345678",
  "ticket": 12345678,
  "symbol": "EURUSD",
  "type": "BUY",
  "volume": 1.0,
  "openPrice": 1.08500,
  "closePrice": 1.08950,
  "openTime": 1729080000000,
  "closeTime": 1729087200000,
  "profit": 450.00,
  "commission": -7.00,
  "swap": -1.50,
  "netProfit": 441.50,
  "comment": "Trend continuation break",
  "magic": 0
}
```

---

## 5. Security & Isolation Matrix

| Layer | Security Rule | Implementation |
| :--- | :--- | :--- |
| **Network** | Loopback Only | Server rejects any binding outside `127.0.0.1`. |
| **Authentication** | Bearer Tokens | MT5 EA requests require the local token in `Authorization: Bearer <token>`. |
| **Renderer** | Process Isolation | Electron `contextIsolation: true`, `nodeIntegration: false`. |
| **Storage** | 100% Offline | Zero external cloud synchronization; all database operations are local. |
| **Display** | Privacy Blur | Real-time CSS blur filter toggle (`data-mask-balance="true"`) for streaming and screen sharing. |
