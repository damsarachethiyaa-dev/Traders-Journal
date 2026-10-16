# 🔌 MetaTrader 5 Connection & Synchronization Guide

This guide provides end-to-end instructions for configuring MetaTrader 5 (MT5) to synchronize real-time and historical trades directly with **Traders Journal**.

---

## 📋 Prerequisites

1. **MetaTrader 5 Desktop Terminal** installed on your Windows PC.
2. **Traders Journal Desktop App** installed and running.
3. Access to your MT5 `MQL5/Experts` folder.

---

## 🛠️ Step-by-Step Installation

### Step 1: Generate Your Pairing Token in Traders Journal

1. Launch **Traders Journal**.
2. Click **Connections** in the sidebar.
3. Click the **"Generate Connection Code"** button.
4. Your unique local pairing token will appear on screen.
5. Click **"Download Connector"**. This will save `TradersJournalSync_MT5.mq5` with your token pre-configured.

---

### Step 2: Copy the Expert Advisor to MT5

1. Open your **MetaTrader 5** terminal.
2. In the top menu, click **File → Open Data Folder**.
3. Windows File Explorer will open. Double-click **MQL5**, then open the **Experts** folder:
   ```text
   ...\MetaQuotes\Terminal\<hash>\MQL5\Experts\
   ```
4. Copy the downloaded `TradersJournalSync_MT5.mq5` (or the pre-compiled `TradersJournalSync_MT5.ex5` located in the `connector/` folder of this project) into this folder.

---

### Step 3: Enable WebRequest Permissions in MT5

MetaTrader 5 restricts Expert Advisors from communicating over HTTP by default. You must allow access to the local Traders Journal server:

1. In MT5, click **Tools → Options** (or press `Ctrl + O`).
2. Select the **Expert Advisors** tab.
3. Ensure the following boxes are checked:
   - ✅ **Allow algorithmic trading**
   - ✅ **Allow WebRequest for listed URL**
4. Click the green **`+` (Add new URL)** button at the bottom of the list.
5. Type:
   ```text
   http://127.0.0.1:8765
   ```
6. Press `Enter`, then click **OK** to save the settings.

> [!IMPORTANT]
> Do NOT use `https://` or `localhost`. Use exact URL: `http://127.0.0.1:8765`.

---

### Step 4: Attach the Expert Advisor to a Chart

1. In MT5, press `Ctrl + N` to open the **Navigator** window on the left side.
2. Scroll to the **Expert Advisors** section.
3. Right-click on **Expert Advisors** and select **Refresh**. You should now see `TradersJournalSync_MT5`.
4. Drag and drop `TradersJournalSync_MT5` onto **any active chart** (timeframe and symbol do not matter).
5. A settings window will appear:
   - In the **Common** tab, check **"Allow Algo Trading"**.
   - In the **Inputs** tab, verify:
     - `ServerUrl`: `http://127.0.0.1:8765`
     - `AuthToken`: Your token from Step 1.
     - `SyncIntervalSeconds`: `10` (default)
     - `SyncOpenPositions`: `true`
6. Click **OK**.

---

### Step 5: Verification & Success

- In the top-right corner of your MT5 chart, you will see a small graduation cap icon:
  - 🧢 **Blue / Solid cap:** EA is running and authorized.
  - 🎓 **Grey / Cross:** Algo trading is disabled. Click the **"Algo Trading"** button in the top toolbar to enable it.
- Check the **Experts** tab in the bottom Terminal toolbox in MT5. You should see:
  ```text
  TradersJournalSync_MT5: Connected to Traders Journal (127.0.0.1:8765)
  TradersJournalSync_MT5: Synced X deals successfully.
  ```
- Switch to your Traders Journal window. Your trades and live statistics will populate instantly!

---

## 🔍 Troubleshooting MT5 Synchronization

### 1. `WebRequest error 4014`
- **Cause:** The URL `http://127.0.0.1:8765` is not listed in `Tools → Options → Expert Advisors`.
- **Fix:** Add `http://127.0.0.1:8765` to the WebRequest allowlist and click OK.

### 2. `WebRequest error 5203` or Connection Refused
- **Cause:** Traders Journal is not running, or the background server has stopped.
- **Fix:** Ensure Traders Journal is open (or minimized to the system tray). If the app was closed, start it again.

### 3. Trades from multiple accounts
- **Behavior:** Traders Journal supports multiple MT5 accounts simultaneously. Simply attach the EA in each terminal. Accounts will appear in the account switcher dropdown on the dashboard.

### 4. Broker Server Time Offset
- Different brokers report times in UTC, UTC+2, or UTC+3. Traders Journal automatically aligns trade timestamps using UTC Unix epochs, ensuring your daily calendar matches your local calendar.
