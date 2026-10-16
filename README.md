# 📈 Traders Journal (Desktop App — KING Edition)

[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6?logo=windows&logoColor=white)](https://github.com)
[![Runtime](https://img.shields.io/badge/Runtime-Electron%2041%20%7C%20Node.js-23272D?logo=electron&logoColor=white)](https://electronjs.org)
[![Sync](https://img.shields.io/badge/Terminal-MetaTrader%205%20Auto--Sync-00A651?logo=tradingview&logoColor=white)](https://www.metatrader5.com)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Localhost%20%7C%20Zero%20Cloud-success)](https://github.com)
[![License](https://img.shields.io/badge/Edition-KING%20Lifetime%20Edition-FFD700?logo=crown&logoColor=black)](https://github.com)

> **Created by Chethiya Rathnasekara**  
> *A privacy-first, professional desktop trading journal and analytics workstation with direct MetaTrader 5 real-time synchronization. 100% offline, zero subscriptions, zero cloud data leaks.*

---

## 📑 Table of Contents

1. [Overview & Philosophy](#-overview--philosophy)
2. [Key Features](#-key-features)
3. [Quick Start & Installation (For Users)](#-quick-start--installation-for-users)
4. [Connecting MetaTrader 5 (Step-by-Step)](#-connecting-metatrader-5-step-by-step)
5. [Dashboard & Analytics Deep Dive](#-dashboard--analytics-deep-dive)
6. [KING Edition Settings & Customization](#-king-edition-settings--customization)
7. [Developer & Build Guide](#-developer--build-guide)
8. [Building the Executable (.EXE) Installer](#-building-the-executable-exe-installer)
9. [How to Update and Maintain the Project](#-how-to-update-and-maintain-the-project)
10. [Project Architecture & File Structure](#-project-architecture--file-structure)
11. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🎯 Overview & Philosophy

Most commercial trading journals charge expensive recurring monthly fees, require cloud logins, and upload your private trading strategies and broker credentials to third-party databases.

**Traders Journal** is built on a different philosophy:
- **100% Local & Private:** Everything runs locally on your computer. All trade history, journal reflections, and balance metrics stay in your local user directory (`%APPDATA%\Traders Journal` or `./data/db.json`). Zero data ever leaves your computer.
- **Direct MetaTrader 5 Sync:** Uses a native MQL5 Expert Advisor (`TradersJournalSync_MT5`) and a local loopback server (`http://127.0.0.1:8765`) to ingest real-time trades, partial closes, and balance events with zero middleman.
- **Background Tray Persistence:** Minimizes to the Windows system tray to continuously listen for MT5 closed deals and positions even when the main window is closed.
- **Cinema-Grade Intro & Film:** Features a custom branded intro window and a complete 2-minute promotional showcase video built into the app.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 📊 **Live Performance Dashboard** | Real-time equity curves, win rate, profit factor, expected payoff, max drawdown, and hourly performance clocks. |
| 📅 **Calendar & Heatmaps** | Daily PnL calendar grid, monthly performance summary, and trade density heatmaps. |
| 📝 **Daily Journaling** | Record emotional states, strategy tags, execution notes, pre-market prep, and trade post-mortems. |
| ⚡ **Instant MT5 EA Sync** | Real-time deal ingestion from MetaTrader 5 without requiring CSV exports or broker passwords. |
| 👑 **KING Edition Profile** | Custom profile picture upload, bio, personal risk thresholds, fee calculations, and theme styling. |
| 🔒 **Privacy & Data Security** | Balance blur masking mode, 1-click JSON backup & restore, and CSV trade export. |
| 🖥️ **Windows Integration** | Native NSIS installer, portable standalone EXE, tray controls, and auto-start on Windows boot. |

---

## 🚀 Quick Start & Installation (For Users)

### Pre-Built Executables (`dist/` folder)

You can find the ready-to-use binaries in the `dist/` directory:

1. **Standard Windows Installer (Recommended for Everyone):**
   - File: `dist/Traders-Journal-Setup-1.0.0.exe`
   - Double-click to install with a standard Windows wizard.
   - Creates a **Desktop Shortcut** and a **Start Menu Shortcut**.
   - Automatically supports clean updates and uninstallation.

2. **Portable Executable:**
   - File: `dist/Traders-Journal-Portable-1.0.0.exe`
   - Runs instantly without installation or admin privileges.
   - Ideal for running from a USB thumb drive or portable folder.

> [!NOTE]
> **Windows SmartScreen Alert:**  
> Because this is a self-built open-source application and does not have an expensive enterprise digital certificate, Windows Defender SmartScreen may display: *"Windows protected your PC - Unknown publisher"*.  
> **How to run:** Click **"More info"**, then click **"Run anyway"**.

---

## 🔌 Connecting MetaTrader 5 (Step-by-Step)

The MT5 connector establishes a high-speed HTTP connection over your PC's local loopback network (`http://127.0.0.1:8765`).

```mermaid
flowchart LR
    MT5["MetaTrader 5 Terminal"] -->|"WebRequest (Localhost)"| EA["TradersJournalSync_MT5 (EA)"]
    EA -->|"POST /api/sync"| LocalServer["Internal Node.js Server (127.0.0.1:8765)"]
    LocalServer -->|"Local JSON DB"| Storage[("%APPDATA%/Traders Journal")]
    LocalServer -->|"WebSocket / IPC"| Dashboard["Desktop Live Dashboard"]
```

### Setup Steps:

1. **Open Traders Journal:**
   - Launch the application and click on **Connections** in the sidebar.
   - Click **Generate Connection Code**. A unique local pairing token will be generated.
   - Click **Download Connector**. The pre-configured EA file will download.

2. **Install the Connector in MT5:**
   - Open **MetaTrader 5**.
   - In the top menu, click **File → Open Data Folder**.
   - Navigate into the folder: `MQL5` ➔ `Experts`.
   - Copy `TradersJournalSync_MT5.mq5` (or `TradersJournalSync_MT5.ex5`) from your project's `connector/` folder into `MQL5/Experts`.
   - In MT5, open the **Navigator** window (Ctrl+N), right-click **Expert Advisors**, and click **Refresh** (or compile in MetaEditor by pressing F7).

3. **Allow WebRequest in MetaTrader 5:**
   - In MT5, click **Tools → Options** (or press Ctrl+O).
   - Switch to the **Expert Advisors** tab.
   - Check **"Allow WebRequest for listed URL"**.
   - Click the green `+` icon and add:
     ```text
     http://127.0.0.1:8765
     ```
   - Click **OK**.

4. **Attach and Sync:**
   - Drag `TradersJournalSync_MT5` from the Navigator onto **any open chart**.
   - In the Inputs tab, verify the server URL is `http://127.0.0.1:8765` and enter your connection token if prompted.
   - Click **OK**.
   - Your account info, historical trades, and live positions will immediately stream to your Traders Journal dashboard!

---

## 📊 Dashboard & Analytics Deep Dive

- **Live Dashboard (`index.html`):**
  - **KPI Cards:** Net Profit, Win Rate %, Profit Factor, Average Trade Duration, and Total Trades.
  - **Equity & Drawdown Graph:** High-resolution chart mapping cumulative account growth over time.
  - **Performance Clock:** Radar/clock visualization revealing your most profitable trading hours of the day.
  - **Profit Drivers:** Breakdowns by trade direction (Long vs. Short), Asset Classes (Forex, Indices, Crypto, Commodities), and Day of Week.
  - **Daily Calendar:** Visual green/red monthly calendar highlighting each trading day's net gain/loss.

- **Daily Trading Journal (`daily-journal.js`):**
  - Log trade execution notes, plan compliance, emotional state, and mistake tags.
  - Review historical trading days with synchronized trade ticket records.

- **Analytics Workstation (`analytics.js`):**
  - Four deep-dive analytics tabs: Performance, Strategy Edge, Behavioral Discipline, and Progress Over Time.
  - Detailed metrics including Sharpe ratio estimation, maximum consecutive losses, and risk-to-reward dispersion.

---

## 👑 KING Edition Settings & Customization

Click your profile avatar or the **Settings** gear in the sidebar to configure:

- **Trader Profile:** Set your trader alias, upload a local avatar photo, and configure your bio.
- **Account Preferences:** Base currency, initial starting balance, target monthly profit goals, and default position sizing.
- **Risk Management Guardrails:** Set max daily loss alerts and trade review triggers.
- **Display Themes:** Switch between sleek dark mode, high contrast, compact density, and motion reduction.
- **Privacy Masking:** 1-click eye toggle to blur all dollar figures on screen for safe streaming or public screenshots.
- **Data Export & Backups:** Create portable JSON snapshots of your journal or export CSV files for Excel/Google Sheets.

---

## 🛠️ Developer & Build Guide

### Prerequisites

- **Node.js:** v18.0.0 or higher ([Download Node.js](https://nodejs.org))
- **npm:** v9.0.0 or higher
- **Python:** v3.10 or higher (optional, required only for `tools/mt5_sync.py` standalone script)
- **MetaTrader 5:** For compiling or modifying `.mq5` connector scripts

### Setup & Development

1. **Clone or Open the Project:**
   ```bash
   cd c:\GPT\local
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run in Development Mode:**
   ```bash
   npm start
   ```

4. **Run MT5 Python Sync Utility (Optional Direct Python Mode):**
   ```bash
   npm run sync
   ```

---

## 📦 Building the Executable (.EXE) Installer

To package this application into a standalone Windows installer and portable `.exe` for distribution:

### Method 1: Using the Automated Batch Script (Easiest)

Simply double-click:
```text
build_installer.bat
```
This script will safely shut down any active background app instances, compile all assets, and run `electron-builder`.

### Method 2: Via Terminal Command

```bash
npm run dist
```

### Build Outputs:

Once completed, the build outputs are stored in `dist/`:

| Output File | Size | Description |
| :--- | :--- | :--- |
| `dist/Traders-Journal-Setup-1.0.0.exe` | ~148 MB | **Full Windows NSIS Setup Installer** with desktop icon, Start menu shortcut, and uninstaller. |
| `dist/Traders-Journal-Portable-1.0.0.exe` | ~148 MB | **Portable Standalone Executable** — runs directly without installation. |
| `dist/win-unpacked/` | — | Unpacked binary directory for instant testing without unpacking. |

---

## 🔄 How to Update and Maintain the Project

When you want to update features, design, or configuration:

### 1. Modifying Code & Assets
- **UI / Dashboard:** Modify `index.html`, `hero.css`, `hero.js`, `analytics.js`, `daily-journal.js`, or `settings.js`.
- **Backend / Sync API:** Modify `server.js` or `main.js`.
- **Intro / Promo Video:** Modify assets in `media/` or scripts in `tools/promo/`.
- **MT5 Connector:** Modify `connector/TradersJournalSync_MT5.mq5`.

### 2. Updating the Version
Open `package.json` and bump the version string:
```json
{
  "name": "traders-journal",
  "version": "1.0.1",
  ...
}
```

### 3. Rebuilding the New `.exe`
Run:
```bash
npm run dist
```
Or double-click `build_installer.bat`.  
Electron-builder will automatically generate `Traders-Journal-Setup-1.0.1.exe` and `Traders-Journal-Portable-1.0.1.exe`.

### 4. Committing and Pushing Updates to GitHub
Run:
```bash
git add .
git commit -m "Update: description of your changes (v1.0.1)"
git push origin main
```
Or double-click `update_project.bat` to automate the whole process!

---

## 📂 Project Architecture & File Structure

```text
Traders-Journal/
├── .gitignore                      # Git ignore rules for node_modules, dist, temp logs
├── .gitattributes                  # Line ending normalization & binary handling
├── package.json                    # Project configuration, scripts & electron-builder settings
├── package-lock.json               # Locked npm dependency tree
├── main.js                         # Electron main process (window, tray, app lifecycle)
├── preload.js                      # Secure Electron preload bridge
├── server.js                       # Local HTTP backend server (http://127.0.0.1:8765)
├── index.html                      # Primary Live Dashboard & Analytics UI
├── hero.js / hero.css              # Main dashboard presentation & KPI rendering
├── analytics.js / analytics.css    # 4-tab advanced analytics workstation
├── daily-journal.js / .css         # Daily trade reflections & notes management
├── settings.js / settings.css      # KING Edition settings panel & data management
├── app-intro.html / .js / .css     # Native animated intro splash window
├── gcal.js                         # Economic calendar / Google calendar integration
├── build_installer.bat             # 1-click script to build Windows .EXE installer
├── update_project.bat              # 1-click script to commit and push updates
├── run_app.bat / start.bat         # Fast launcher batch scripts
│
├── build/
│   └── icon.png                    # Application icon for desktop & installer
├── connector/
│   ├── TradersJournalSync_MT5.mq5  # MetaTrader 5 Expert Advisor source code
│   └── TradersJournalSync_MT5.ex5  # Compiled MetaTrader 5 Expert Advisor binary
├── data/
│   └── db.json                     # Local trades & accounts database (generated)
├── dist/
│   ├── Traders-Journal-Setup-1.0.0.exe    # NSIS Windows Installer
│   └── Traders-Journal-Portable-1.0.0.exe # Portable standalone executable
├── docs/
│   ├── ARCHITECTURE.md             # Detailed architectural specifications & API endpoints
│   ├── MT5_CONNECTOR_GUIDE.md      # Comprehensive MetaTrader 5 connection guide
│   └── UPDATE_AND_RELEASE_GUIDE.md # Maintenance, updates & GitHub release instructions
├── fonts/                          # Bundled fonts (Inter, JetBrains Mono, Space Grotesk)
├── media/                          # Intro video, app film, and graphic assets
└── tools/                          # MT5 direct sync, font copier, icon and video tools
```

---

## 🛡️ Architecture & Security Model

- **Zero Remote Network Exposure:** The backend server binds strictly to the loopback interface (`127.0.0.1:8765`). Requests from external networks or foreign interfaces are rejected.
- **Bearer Token Authorization:** Each MT5 EA connection requires an authenticated token generated within the desktop app UI.
- **Context Isolation:** Electron runs with `contextIsolation: true` and `nodeIntegration: false`, preventing malicious renderer script execution.
- **Zero Cloud Telemetry:** No user tracking, no Google Analytics, no third-party telemetry beacons.

---

## ❓ Troubleshooting & FAQ

#### 1. Windows SmartScreen says "Unknown Publisher"
- **Solution:** Click **"More info"**, then click **"Run anyway"**. This appears because the installer is self-signed/unsigned.

#### 2. The app is already running and won't re-open or rebuild
- **Solution:** The app minimizes to the system tray on close. Right-click the **Traders Journal tray icon** near your Windows clock and select **Quit**. Or run `build_installer.bat` which automatically closes background instances before rebuilding.

#### 3. MT5 says `WebRequest error 4014`
- **Solution:** You haven't added the URL to MT5's allowlist. In MT5, go to `Tools → Options → Expert Advisors`, check *"Allow WebRequest for listed URL"*, and add `http://127.0.0.1:8765`.

#### 4. Where is my trading data stored?
- **Solution:** Synced MT5 records are stored locally on your machine at `%APPDATA%\Traders Journal\data\db.json` (in packaged mode) or `data/db.json` (in dev mode). Manual journal entries and preferences are saved securely in local application storage.

---

## 👤 Author & Credits

- **Developer & Creator:** [Chethiya Rathnasekara](https://github.com)
- **Application:** Traders Journal — KING Edition
- **Version:** 1.0.0

*Happy Trading! Keep your risk managed, follow your journal rules, and protect your edge.*
