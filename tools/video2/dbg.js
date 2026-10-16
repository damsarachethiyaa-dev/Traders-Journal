const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
app.commandLine.appendSwitch('force-device-scale-factor', '2'); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 540, height: 960, show: false, useContentSize: true, frame: false, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.setContentSize(540, 960); win.webContents.setFrameRate(30);
  await win.loadFile(path.join(__dirname, 'scenes2.html'));
  await win.webContents.executeJavaScript('window.initVideo(' + fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8') + ')');
  let last = null, paints = 0; win.webContents.on('paint', (e, d, img) => { last = img; paints++; });
  for (let i = 0; i < 6; i++) {
    const c = paints; const tk = await win.webContents.executeJavaScript('seek(' + (10 + i * 0.1) + ')');
    const t0 = Date.now(); while (paints <= c && Date.now() - t0 < 1500) await new Promise(r => setTimeout(r, 1));
    const bm = last.toBitmap(); const sz = last.getSize();
    console.log('tk', tk, 'exp R', (tk % 16) * 16, 'G', (Math.floor(tk / 16) % 16) * 16, 'px(0,0) B,G,R', bm[0], bm[1], bm[2], 'px(8,8)', bm[(8*sz.width+8)*4+2], bm[(8*sz.width+8)*4+1], 'size', sz.width, sz.height, 'len', bm.length);
  }
  app.quit();
});
