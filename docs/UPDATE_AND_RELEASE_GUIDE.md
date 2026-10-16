# 🔄 Update & Release Maintenance Guide

This guide explains how to maintain, update, rebuild, and release new versions of **Traders Journal**.

---

## 📑 Contents

1. [Making Code Changes](#1-making-code-changes)
2. [Updating the Application Version](#2-updating-the-application-version)
3. [Rebuilding the Executable (.EXE) Installer](#3-rebuilding-the-executable-exe-installer)
4. [Pushing Updates to GitHub](#4-pushing-updates-to-github)
5. [Publishing Releases on GitHub](#5-publishing-releases-on-github)
6. [Automated Update Scripts](#6-automated-update-scripts)

---

## 1. Making Code Changes

Depending on what feature you are updating:

| File | What It Controls |
| :--- | :--- |
| `index.html` | Core HTML markup, dashboard layout, dialogs, and navigation structure. |
| `hero.js` / `hero.css` | Main dashboard visuals, KPI cards, charts, and summary statistics. |
| `analytics.js` / `analytics.css` | The 4-tab advanced analytics engine (Performance, Edge, Discipline, Progress). |
| `daily-journal.js` / `daily-journal.css` | Daily trade journaling, notes, review cards, and psychological tags. |
| `settings.js` / `settings.css` | KING Edition settings, profile editing, themes, and backup/restore. |
| `server.js` | Local backend API, MT5 pairing logic, trade parsing, and persistence. |
| `main.js` | Desktop window lifecycle, system tray logic, and auto-launch handlers. |
| `connector/TradersJournalSync_MT5.mq5` | The MetaTrader 5 Expert Advisor synchronization script. |

---

## 2. Updating the Application Version

Always bump your version before generating a new release:

1. Open `package.json`.
2. Find the `"version"` field (e.g. line 4):
   ```json
   {
     "name": "traders-journal",
     "productName": "Traders Journal",
     "version": "1.0.1",
     ...
   }
   ```
3. Save the file.

---

## 3. Rebuilding the Executable (.EXE) Installer

### Automated (Recommended)
Double-click `build_installer.bat` in the project root.

### Manual Terminal Command
```powershell
# 1. Stop any running background instances of Traders Journal
Stop-Process -Name "Traders Journal" -Force -ErrorAction SilentlyContinue

# 2. Build the Windows installer and portable executable
npm run dist
```

### Generated Files:
Once the build completes, your new files will be located in the `dist/` directory:
- `dist/Traders-Journal-Setup-<version>.exe` (Full NSIS Installer)
- `dist/Traders-Journal-Portable-<version>.exe` (Portable Single-file EXE)

---

## 4. Pushing Updates to GitHub

To sync your code and documentation changes to GitHub:

### Quick Command:
```powershell
# 1. Check changed files
git status

# 2. Stage all changes
git add .

# 3. Commit your changes
git commit -m "Update: Added new features (v1.0.1)"

# 4. Push to GitHub
git push origin main
```

---

## 5. Publishing Releases on GitHub

Because GitHub rejects git repository files larger than 100MB, the packaged `.exe` files (~148MB) should be published as **GitHub Releases**:

1. Go to your GitHub repository in your web browser:
   ```text
   https://github.com/<your-username>/<your-repo>/releases/new
   ```
2. Enter the Tag: `v1.0.1` (matching your `package.json`).
3. Title: `Traders Journal v1.0.1 - KING Edition`.
4. Add release notes describing your new features or bug fixes.
5. Drag and drop the generated files from `dist/`:
   - `dist/Traders-Journal-Setup-1.0.1.exe`
   - `dist/Traders-Journal-Portable-1.0.1.exe`
6. Click **Publish release**.

Anyone around the world can now download and install your latest update!

---

## 6. Automated Update Scripts

We have provided two ready-to-run automation scripts in your project root:

- **`build_installer.bat`**: Shuts down any running instances of Traders Journal and triggers a fresh compilation of the Windows installer and portable `.exe`.
- **`update_project.bat`**: Asks for a commit message, stages all modified code and docs, commits to git, and pushes directly to your GitHub repository.
