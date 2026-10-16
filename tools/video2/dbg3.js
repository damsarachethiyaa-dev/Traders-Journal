const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
app.commandLine.appendSwitch('force-device-scale-factor', '2'); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 540, height: 960, show: false, useContentSize: true, frame: false, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.setContentSize(540, 960); win.webContents.setFrameRate(60);
  await win.loadFile(path.join(__dirname, 'scenes2.html'));
  await win.webContents.executeJavaScript('window.initVideo(' + fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8') + ')');
  let last = null, paints = 0; win.webContents.on('paint', (e, d, img) => { last = img; paints++; });
  const wp = async (c, ms) => { const t0 = Date.now(); while (paints <= c && Date.now() - t0 < (ms || 400)) await new Promise(r => setTimeout(r, 1)); return paints > c };
  const ok = (img, tk) => { const bm = img.toBitmap(); return Math.abs(bm[2] - (tk % 16) * 16) <= 6 && Math.abs(bm[1] - (Math.floor(tk / 16) % 16) * 16) <= 6 };
  let bad = 0, nud = 0; const t0 = Date.now();
  for (let i = 0; i < 90; i++) {
    const tk = await win.webContents.executeJavaScript(`seek(${20 + i / 30})`);
    let c = paints; await wp(c - 1 < 0 ? 0 : c); // wait at least one new paint
    let good = false;
    for (let k = 0; k < 6 && !(good = ok(last, tk)); k++) { nud++; c = paints; await win.webContents.executeJavaScript('window.nudge()'); await wp(c); }
    if (!good) bad++;
  }
  console.log('frames 90 ms/frame', ((Date.now() - t0) / 90).toFixed(0), 'bad', bad, 'nudges', nud);
  app.quit();
});
