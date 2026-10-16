/* Offscreen Electron renderer for scenes.html.
   stills : electron render.js --stills out_dir T1,T2,...      (absolute seconds, PNG per time)
   video  : electron render.js --video out.mp4 FROM TO [FPS]   (silent h264 chunk) */
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG = process.env.FFMPEG;
const SCALE = 1.5;
app.commandLine.appendSwitch('force-device-scale-factor', String(SCALE));
app.commandLine.appendSwitch('high-dpi-support', '1');
app.disableHardwareAcceleration();

const args = process.argv.slice(2).filter(a => !a.endsWith('render.js') && a !== '.');
const mode = args[0];
const timeline = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8'));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 720, show: false, useContentSize: true, frame: false, webPreferences: { offscreen: true, backgroundThrottling: false, contextIsolation: true } });
  win.webContents.setFrameRate(30);
  await win.loadFile(path.join(__dirname, 'scenes.html'));
  await win.webContents.executeJavaScript('window.initVideo(' + JSON.stringify(timeline) + ')');
  win.webContents.on('console-message', (e, lvl, msg, line) => { if (lvl >= 2) console.log('PAGE ERR:', msg, line); });
  let lastPaint = null, paints = 0;
  win.webContents.on('paint', (e, dirty, image) => { lastPaint = image; paints++; });
  const waitPaint = async (c) => { const t0 = Date.now(); while (paints <= c && Date.now() - t0 < 1500) await new Promise(r => setTimeout(r, 1)); };
  const shot = async (T) => {
    let c = paints;
    await win.webContents.executeJavaScript(`try{seek(${T})}catch(e){console.error(e.stack)}; 0`);
    await waitPaint(c);
    c = paints;
    await win.webContents.executeJavaScript(`try{seek(${T})}catch(e){console.error(e.stack)}; 0`);
    await waitPaint(c);
    return lastPaint;
  };
  await shot(0); await shot(1);
  if (process.env.POSTER) await win.webContents.executeJavaScript('window.POSTER=true');
  if (mode === '--stills') {
    const dir = args[1]; fs.mkdirSync(dir, { recursive: true });
    for (const T of args[2].split(',').map(Number)) {
      const img = await shot(T);
      fs.writeFileSync(path.join(dir, 'f_' + String(T).padStart(7, '0') + '.png'), img.toPNG());
    }
    console.log('stills done', await shot(0).then(i => i.getSize()));
    app.quit(); return;
  }
  if (mode === '--video') {
    const out = args[1], from = Number(args[2]), to = Number(args[3]), fps = Number(args[4] || 30);
    const first = await shot(from); const { width, height } = first.getSize();
    const ff = spawn(FFMPEG, ['-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${width}x${height}`, '-r', String(fps), '-i', '-', '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const frames = Math.round((to - from) * fps);
    const t0 = Date.now();
    for (let i = 0; i < frames; i++) {
      const T = from + i / fps;
      const img = i === 0 ? first : await shot(T);
      const buf = img.toBitmap();
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log(`frame ${i}/${frames} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('video chunk done', out, frames, 'frames');
    app.quit(); return;
  }
  app.quit();
});
