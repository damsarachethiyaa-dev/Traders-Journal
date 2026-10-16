// Traders Journal desktop app (Electron shell).
// Starts the local backend (server.js) inside the app and shows the dashboard in a native window.
// The backend keeps running in the system tray so MetaTrader can keep syncing when the window is closed.
'use strict';
const { app, BrowserWindow, Tray, Menu, shell, dialog, nativeImage, session, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const LOG_FILE = 'C:\\GPT\\local\\startup.log';
function slog(...args) {
  try { fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} [${process.pid}] ${args.join(' ')}\n`); } catch(e){}
}
slog('=== MAIN LAUNCHED ===', process.execPath, process.argv.join(' '));
process.on('uncaughtException', err => slog('UNCAUGHT:', err.stack || err));
process.on('unhandledRejection', r => slog('REJECTION:', r?.stack || r));
process.on('exit', code => slog('PROCESS EXIT:', code));

const gotLock = app.requestSingleInstanceLock();
slog('Single instance lock:', gotLock);
if (!gotLock) { slog('Lock failed, quitting'); app.quit(); } else { boot(); }

function boot() {
  const localData = path.join(__dirname, 'data');
  const userData = app.getPath('userData');
  const appData = path.join(userData, 'data');
  process.env.TJ_DATA = fs.existsSync(localData) ? localData : appData;
  const SETTINGS_FILE = path.join(userData, 'settings.json');
  const settings = Object.assign({ hideOnClose: true, bounds: null, maximized: false }, readJson(SETTINGS_FILE));
  const saveSettings = () => { try { fs.mkdirSync(userData, { recursive: true }); fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings)); } catch (e) { /* ignore */ } };

  let win = null, tray = null, quitting = false, backend = null, shownTrayHint = false;
  let intro = null, mainReady = false;
  const startHidden = process.argv.includes('--hidden');
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  app.on('second-instance', () => showWindow());

  app.whenReady().then(async () => {
    slog('app.whenReady fired');
    try { backend = require('./server.js'); slog('backend required'); }
    catch (e) { slog('backend require error:', e.message); dialog.showErrorBox('Traders Journal', 'Could not start the local server:\n' + e.message); return app.quit(); }
    const ok = await waitForServer(backend.server);
    slog('waitForServer result:', ok);
    if (!ok) {
      dialog.showErrorBox('Traders Journal', 'Port ' + backend.PORT + ' is already in use by another program.\nClose it (or another copy of Traders Journal) and start the app again.');
      return app.quit();
    }
    setupDownloads();
    buildMenu();
    createWindow();
    if (!startHidden && !process.argv.includes('--skip-intro')) {
      intro = require('./app-intro.js').showAppIntro({ app, BrowserWindow, ipcMain, icon,
        onFinish: () => { intro = null; if (!quitting && mainReady) revealWindow(); } });
    }
    createTray();
    slog('createWindow and createTray done');
  });

  function waitForServer(server) {
    return new Promise(resolve => {
      if (server.listening) return resolve(true);
      server.once('listening', () => resolve(true));
      server.once('error', () => resolve(false));
    });
  }

  function createWindow() {
    const b = settings.bounds || {};
    win = new BrowserWindow({
      width: b.width || 1480, height: b.height || 920, x: b.x, y: b.y, minWidth: 1000, minHeight: 640,
      backgroundColor: '#09090b', title: 'Traders Journal', icon, show: false, autoHideMenuBar: true,
      titleBarStyle: 'hidden', titleBarOverlay: { color: '#09090b', symbolColor: '#e8e8ea', height: 50 },
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, preload: path.join(__dirname, 'preload.js') }
    });
    const URL = 'http://' + backend.HOST + ':' + backend.PORT + '/';
    win.loadURL(URL);
    win.once('ready-to-show', () => {
      mainReady = true;
      if (!startHidden && !intro?.active) revealWindow();
    });
    win.webContents.on('did-finish-load', () => slog('webContents did-finish-load'));
    win.webContents.on('did-fail-load', (e, code, desc) => {
      slog('webContents did-fail-load:', code, desc);
      if (code !== -3) setTimeout(() => win && win.loadURL(URL), 800);
    });
    win.webContents.on('render-process-gone', (e, details) => {
      slog('webContents render-process-gone:', JSON.stringify(details));
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url) && !url.startsWith(URL)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith(URL)) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
    });
    win.on('resize', rememberBounds); win.on('move', rememberBounds);
    win.on('close', e => {
      slog('win close event fired, quitting:', quitting, 'hideOnClose:', settings.hideOnClose);
      if (!quitting && settings.hideOnClose) {
        e.preventDefault(); win.hide();
        if (tray && !shownTrayHint) { shownTrayHint = true; try { tray.displayBalloon({ title: 'Traders Journal is still running', content: 'It keeps syncing MetaTrader in the background. Right-click the tray icon to quit.' }); } catch (x) { /* not Windows */ } }
      }
    });
    win.on('closed', () => { slog('win closed event fired'); win = null; });
  }
  const OVERLAY = { dark: { color: '#09090b', symbolColor: '#e8e8ea' }, light: { color: '#f5f6f8', symbolColor: '#14161a' } };
  let overlayTheme = 'dark', overlayHeight = 50;
  const applyOverlay = () => {};
  ipcMain.handle('tj:theme', (e, t) => {});
  ipcMain.handle('tj:zoom', (e, z) => {});
  ipcMain.handle('tj:notify', (e, message) => {
    if (!win || e.sender !== win.webContents || !Notification.isSupported()) return false;
    const notice = new Notification({ title: String(message?.title || 'Traders Journal').slice(0, 100), body: String(message?.body || '').slice(0, 400), icon: iconPath });
    notice.on('click', showWindow); notice.show(); return true;
  });
  ipcMain.handle('tj:open-data', async e => {
    if (!win || e.sender !== win.webContents) return false;
    fs.mkdirSync(process.env.TJ_DATA, { recursive: true });
    return !(await shell.openPath(process.env.TJ_DATA));
  });
  let bTimer;
  function rememberBounds() {
    clearTimeout(bTimer);
    bTimer = setTimeout(() => { if (win && !win.isMaximized() && !win.isMinimized() && !win.isFullScreen()) { settings.bounds = win.getBounds(); saveSettings(); } }, 400);
  }

  function showWindow() {
    if (!win) return createWindow();
    if (intro?.active) { intro.finish(); return; }
    revealWindow();
    win.webContents.send('tj:open');
  }

  function revealWindow() {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.maximize();
    win.show();
    win.focus();
    win.moveTop();
  }

  function createTray() {
    const img = icon ? icon.resize({ width: 16, height: 16 }) : nativeImage.createEmpty();
    tray = new Tray(img);
    tray.setToolTip('Traders Journal');
    tray.on('click', showWindow);
    refreshTrayMenu();
  }
  function refreshTrayMenu() {
    if (!tray) return;
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Traders Journal', click: showWindow },
      { label: 'Watch app film', click: openFilm },
      { type: 'separator' },
      { label: 'Keep running in tray when window is closed', type: 'checkbox', checked: settings.hideOnClose, click: m => { settings.hideOnClose = m.checked; saveSettings(); } },
      { label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: m => app.setLoginItemSettings({ openAtLogin: m.checked, args: ['--hidden'] }) },
      { label: 'Open data folder', click: () => shell.openPath(process.env.TJ_DATA) },
      { type: 'separator' },
      { label: 'Quit', click: () => { quitting = true; app.quit(); } }
    ]));
  }

  function buildMenu() {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { type: 'separator' }, { type: 'separator' }, { role: 'togglefullscreen' }, { role: 'toggleDevTools' }] },
      { label: 'Window', submenu: [{ role: 'minimize' }, { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => { quitting = true; app.quit(); } }] },
      { label: 'Help', submenu: [{ label: 'Watch Traders Journal film', click: openFilm }] }
    ]));
  }

  function openFilm() {
    // Shell video players need a real file: export the bundled ASAR asset to app cache.
    const bundledFilm = path.join(__dirname, 'media', 'traders-journal-promo.mp4');
    if (!fs.existsSync(bundledFilm)) return dialog.showMessageBox({ type: 'info', title: 'Traders Journal film', message: 'The app film is not included in this build.' });
    try {
      let film = bundledFilm;
      if (__dirname.includes('app.asar')) {
        const cache = path.join(app.getPath('userData'), 'media');
        fs.mkdirSync(cache, { recursive: true });
        film = path.join(cache, 'traders-journal-promo.mp4');
        if (!fs.existsSync(film) || fs.statSync(film).size !== fs.statSync(bundledFilm).size) fs.copyFileSync(bundledFilm, film);
      }
      shell.openPath(film).then(error => { if (error) dialog.showErrorBox('Traders Journal film', error); });
    } catch (error) { dialog.showErrorBox('Traders Journal film', error.message); }
  }

  function setupDownloads() {
    session.defaultSession.on('will-download', (e, item) => {
      const dest = path.join(app.getPath('downloads'), item.getFilename());
      item.setSavePath(dest);
      item.once('done', (ev, state) => { if (state === 'completed') shell.showItemInFolder(dest); });
    });
  }

  app.on('before-quit', () => { slog('app before-quit fired'); quitting = true; if (intro?.active) intro.finish(); if (backend && backend.stopWorker) backend.stopWorker(); if (backend && backend.flush) backend.flush(); });
  app.on('will-quit', () => slog('app will-quit fired'));
  app.on('quit', (e, code) => slog('app quit fired with code:', code));
  app.on('window-all-closed', () => { slog('app window-all-closed fired, hideOnClose:', settings.hideOnClose); if (!settings.hideOnClose) app.quit(); });
}

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return {}; } }
