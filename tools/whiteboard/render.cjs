// Renders the whiteboard film frame by frame through Electron and pipes JPEG frames into FFmpeg.
//   electron tools/whiteboard/render.cjs stills <outDir> <t1,t2,...>
//   electron tools/whiteboard/render.cjs video  <out.mp4> [from] [to] [fps]
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.setPath('userData', path.join(app.getPath('temp'), 'tj-whiteboard-' + process.pid));
const [mode, out, a3, a4, a5] = process.argv.slice(2);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, useContentSize: true, show: false, frame: false, webPreferences: { offscreen: true, backgroundThrottling: false, contextIsolation: true } });
  await win.loadFile(path.join(__dirname, 'index.html'), { query: { render: '1' } });
  await win.webContents.executeJavaScript('window.boardReady');
  const grab = async (t) => {
    await win.webContents.executeJavaScript(`window.seek(${t}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    await new Promise((r) => setTimeout(r, 40));            // let the offscreen compositor present the new frame
    const img = await win.webContents.capturePage();
    if (!grab.logged) { grab.logged = true; console.log('frame size', JSON.stringify(img.getSize())); }
    return img.toJPEG(94);
  };
  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of a3.split(',').map(Number)) fs.writeFileSync(path.join(out, `t${String(t).padStart(5, '0')}.jpg`), await grab(t));
    console.log('stills complete'); app.quit(); return;
  }
  const from = +(a3 || 0), to = +(a4 || 30), fps = +(a5 || 30), frames = Math.round((to - from) * fps);
  const ffmpeg = process.env.FFMPEG || 'ffmpeg';
  const ff = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-r', String(fps), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-color_range', 'tv', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true });
  let err; ff.on('error', (e) => err = e); ff.stdin.on('error', (e) => err = e);
  const done = new Promise((res, rej) => ff.on('close', (c) => c === 0 ? res() : rej(new Error('ffmpeg exited ' + c))));
  const start = Date.now();
  for (let i = 0; i < frames; i++) {
    if (err) throw err;
    const img = await grab(from + i / fps);
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`${i}/${frames} ${Math.round((Date.now() - start) / 1000)}s`);
  }
  ff.stdin.end(); await done; console.log('RENDER COMPLETE', out, frames); app.quit();
}).catch((e) => { console.error(e); app.exit(1); });
