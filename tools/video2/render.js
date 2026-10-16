/* Offscreen renderer (paint events + frame-marker verification).
   electron render.js --stills <dir> T1,T2 | --video out.mp4 FROM TO [FPS] | --cues out.json   env: FFMPEG */
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const FFMPEG = process.env.FFMPEG;
app.commandLine.appendSwitch('force-device-scale-factor', '2');
app.disableHardwareAcceleration();
app.setPath('userData', path.join(require('os').tmpdir(), 'tj-render-' + process.pid));
const args = process.argv.slice(2).filter(a => !a.endsWith('render.js') && a !== '.');
const mode = args[0];
const timeline = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 540, height: 960, show: false, useContentSize: true, frame: false, webPreferences: { offscreen: true, backgroundThrottling: false, contextIsolation: true } });
  win.setContentSize(540, 960); win.webContents.setFrameRate(60);
  win.webContents.on('console-message', (e) => { const m = e.message || ''; if ((e.level === 'error' || e.level === 3) && !/Security Warning/.test(m)) console.log('PAGE ERR:', m); });
  await win.loadFile(path.join(__dirname, 'scenes2.html'));
  await win.webContents.executeJavaScript('window.initVideo(' + JSON.stringify(timeline) + ')');
  let last = null, paints = 0; win.webContents.on('paint', (e, d, img) => { last = img; paints++; });
  const wp = async (c, ms) => { const t0 = Date.now(); while (paints <= c && Date.now() - t0 < (ms || 400)) await new Promise(r => setTimeout(r, 1)); return paints > c; };
  const marker = (bm, tk) => Math.abs(bm[2] - (tk % 16) * 16) <= 6 && Math.abs(bm[1] - (Math.floor(tk / 16) % 16) * 16) <= 6;
  let warns = 0;
  { const c0 = paints; await win.webContents.executeJavaScript('window.nudge()'); await wp(c0, 8000); }
  const shot = async T => {
    const tk = await win.webContents.executeJavaScript(`(()=>{try{return seek(${T})}catch(e){console.error(e.stack);return -1}})()`);
    await wp(paints - 1);
    if (!last) await wp(0, 8000);
    let bm = last.toBitmap(), good = marker(bm, tk);
    for (let k = 0; k < 8 && !good; k++) { const c = paints; await win.webContents.executeJavaScript('window.nudge()'); await wp(c); bm = last.toBitmap(); good = marker(bm, tk); }
    if (!good) { warns++; console.log('WARN: stale frame at', T); }
    return { bm, img: last };
  };
  await shot(0); await shot(1);
  if (mode === '--cues') { const c = await win.webContents.executeJavaScript('window.getCues()'); fs.writeFileSync(args[1], JSON.stringify(c, null, 1)); console.log('cues', c.length); app.quit(); return; }
  if (mode === '--stills') {
    const dir = args[1]; fs.mkdirSync(dir, { recursive: true });
    for (const T of args[2].split(',').map(Number)) { const s = await shot(T); fs.writeFileSync(path.join(dir, 'f_' + String(T).padStart(7, '0') + '.png'), s.img.toPNG()); }
    console.log('stills done'); app.quit(); return;
  }
  if (mode === '--video') {
    const out = args[1], from = Number(args[2]), to = Number(args[3]), fps = Number(args[4] || 30);
    const ff = spawn(FFMPEG, ['-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', '1080x1920', '-r', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const frames = Math.round((to - from) * fps), t0 = Date.now();
    for (let i = 0; i < frames; i++) {
      const s = await shot(from + i / fps); const sz = s.img.getSize();
      if (sz.width !== 1080 || sz.height !== 1920) { console.log('BAD SIZE', sz.width, sz.height); }
      if (!ff.stdin.write(s.bm)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log(`frame ${i}/${frames} ${((Date.now() - t0) / 1000).toFixed(0)}s warns ${warns}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log('video chunk done', out, frames, 'warns', warns); app.quit(); return;
  }
  app.quit();
});
