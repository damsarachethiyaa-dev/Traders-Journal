const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 540, height: 960, show: false, useContentSize: true, frame: false, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.setContentSize(540, 960); win.webContents.setFrameRate(30);
  await win.loadFile(path.join(__dirname, 'scenes2.html'));
  await win.webContents.executeJavaScript('window.initVideo(' + fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8') + ')');
  const dbg = win.webContents.debugger; dbg.attach('1.3');
  await dbg.sendCommand('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: false });
  let CAP = { format: 'png' };
  const run = async (label, css) => {
    await win.webContents.executeJavaScript(`(()=>{let s=document.getElementById('dbgcss');if(!s){s=document.createElement('style');s.id='dbgcss';document.head.appendChild(s)}s.textContent=${JSON.stringify(css)};0})()`);
    const t0 = Date.now(); let ts = 0, tc = 0;
    for (let i = 0; i < 8; i++) {
      const a = Date.now(); await win.webContents.executeJavaScript(`seek(${20 + i / 30})`); ts += Date.now() - a;
      const b = Date.now(); await dbg.sendCommand('Page.captureScreenshot', CAP); tc += Date.now() - b;
    }
    console.log(label.padEnd(18), 'seek ms/frame', (ts / 8).toFixed(0), 'capture ms/frame', (tc / 8).toFixed(0));
  };
  await run('png baseline', '');
  CAP = { format: 'png', optimizeForSpeed: true }; await run('png speed', '');
  CAP = { format: 'jpeg', quality: 96 }; await run('jpeg 96', '');
  CAP = { format: 'jpeg', quality: 96, optimizeForSpeed: true }; await run('jpeg 96 speed', '');
  app.quit();
});
