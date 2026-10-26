// Ctrl + mouse wheel (and touchpad pinch) zoom for the desktop window.
const { webFrame, contextBridge, ipcRenderer } = require('electron');
const STEP = 0.1, MIN = 0.5, MAX = 3, DEFAULT_ZOOM = 1.2; // 120% unless the person chose another zoom
let hud, hudTimer;

function showHud(z) {
  if (!document.body) return;
  if (!hud) {
    hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;top:60px;right:20px;z-index:2147483647;padding:8px 14px;border-radius:10px;background:rgba(20,20,24,.92);color:#fff;font:600 13px system-ui,sans-serif;border:1px solid rgba(255,255,255,.15);box-shadow:0 8px 24px rgba(0,0,0,.4);pointer-events:none;transition:opacity .25s;opacity:0';
    document.body.appendChild(hud);
  }
  hud.textContent = Math.round(z * 100) + '%';
  hud.style.opacity = '1';
  clearTimeout(hudTimer);
  hudTimer = setTimeout(() => { hud.style.opacity = '0'; }, 900);
}

function applyChrome(z) {
  // keep the native window buttons aligned with the page's top bar at any zoom
  document.documentElement.style.setProperty('--ctl-pad', Math.round(150 / z) + 'px');
  ipcRenderer.invoke('tj:zoom', z).catch(() => {});
}

function setZoom(z) {
  z = Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));
  webFrame.setZoomFactor(z);
  applyChrome(z);
  try { localStorage.setItem('tj_zoom', String(z)); } catch (e) { /* ignore */ }
  showHud(z);
}

contextBridge.exposeInMainWorld('tjDesktop', {
  setTheme: t => ipcRenderer.invoke('tj:theme', t),
  setZoom: z => setZoom(Number(z) || 1),
  getZoom: () => webFrame.getZoomFactor(),
  defaultZoom: DEFAULT_ZOOM,
  notify: (title, body) => ipcRenderer.invoke('tj:notify', { title, body }),
  openDataFolder: () => ipcRenderer.invoke('tj:open-data'),
  deviceKey: () => ipcRenderer.invoke('tj:device-key'),
  setLoginMode: on => ipcRenderer.send('tj:login-mode', !!on),
  onOpen: callback => { ipcRenderer.on('tj:open', () => callback()); }
});

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('is-electron');
  let zoom = DEFAULT_ZOOM;
  try { const saved = parseFloat(localStorage.getItem('tj_zoom')); if (saved >= MIN && saved <= MAX) zoom = saved; } catch (e) { /* ignore */ }
  webFrame.setZoomFactor(zoom);
  applyChrome(webFrame.getZoomFactor());
});

window.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  setZoom(webFrame.getZoomFactor() + (e.deltaY < 0 ? STEP : -STEP));
}, { passive: false });

window.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key === '0') { e.preventDefault(); setZoom(DEFAULT_ZOOM); }
  else if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(webFrame.getZoomFactor() + STEP); }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(webFrame.getZoomFactor() - STEP); }
});
