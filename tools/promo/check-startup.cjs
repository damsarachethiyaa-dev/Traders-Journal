// Exercise actual main.js startup using an isolated profile and a disposable fake backend.
// Native windows remain hidden during the check; no MT5 code or saved journal is opened.
const electron=require('electron'),{app}=electron;
const path=require('path'),fs=require('fs'),http=require('http'),Module=require('module'),assert=require('node:assert/strict');
const workspaceRoot=path.resolve(__dirname,'../..'),appArg=process.argv.find(a=>a.startsWith('--app-root='));
const root=appArg?path.resolve(appArg.slice('--app-root='.length)):workspaceRoot,hidden=process.argv.includes('--hidden');
app.disableHardwareAcceleration();app.setPath('userData',path.join(app.getPath('temp'),'tj-startup-check-'+process.pid));
app.on('window-all-closed',()=>{});
const windows=[];let openedFilm='';
class TestWindow extends electron.BrowserWindow{
 constructor(options){super({...options,webPreferences:{...options.webPreferences,offscreen:true}});this.showCount=0;this.maximizeCount=0;windows.push(this);}
 show(){this.showCount++;}focus(){}moveTop(){}center(){}maximize(){this.maximizeCount++;}
}
class TestTray{constructor(){TestTray.instance=this;}on(){}setToolTip(){}setContextMenu(m){this.menu=m;}showItemInFolder(){}}
const server=http.createServer((_q,r)=>{r.writeHead(200,{'Content-Type':'text/html'});r.end('<!doctype html><title>Isolated startup check</title><h1>Ready</h1>');});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const backend={HOST:'127.0.0.1',PORT:server.address().port,server,stopWorker(){},flush(){}};
 const load=Module._load;
 Module._load=function(request,parent,isMain){
  if(request==='electron')return {...electron,BrowserWindow:TestWindow,Tray:TestTray,shell:{...electron.shell,openPath:f=>{openedFilm=f;return Promise.resolve('');}}};
  if(request==='./server.js'&&parent?.filename===path.join(root,'main.js'))return backend;
  return load.call(this,request,parent,isMain);
 };
 require(path.join(root,'main.js'));
 for(let i=0;i<60;i++){if(windows.length===(hidden?1:2)&&windows[0].webContents.getURL())break;await sleep(100);}
 await sleep(650);
 assert.equal(windows.length,hidden?1:2);assert.equal(windows[0].showCount,0,'The dashboard must stay hidden during startup intro/hidden launch');
 assert.ok(TestTray.instance.menu.items.find(i=>i.label==='Watch app film'));
 if(hidden){TestTray.instance.menu.items.find(i=>i.label==='Open Traders Journal').click();await sleep(100);}
 else{
  const intro=windows[1];assert.ok(intro.webContents.getURL().endsWith('/app-intro.html'));
  await intro.webContents.executeJavaScript(`document.getElementById('enter').click()`,true).catch(()=>{});await sleep(100);
  assert.equal(intro.isDestroyed(),true);
 }
 assert.ok(windows[0].showCount>=1,'Dashboard opens after skip or tray request');assert.ok(windows[0].maximizeCount>=1);
 TestTray.instance.menu.items.find(i=>i.label==='Watch app film').click();await sleep(50);assert.ok(fs.existsSync(openedFilm));assert.equal(fs.statSync(openedFilm).size,fs.statSync(path.join(root,'media/traders-journal-promo.mp4')).size);
 if(appArg)assert.ok(!openedFilm.includes('app.asar'),'System player receives an extracted real file');
 const result={hiddenLaunch:hidden,nativeWindows:windows.length,dashboardHeldAtStartup:true,dashboardReleased:true,filmInTray:true,filmExtraction:true,isolatedBackend:true,packaged:!!appArg};
 fs.writeFileSync(path.join(workspaceRoot,'media/promo-assets',(appArg?'packaged-':'')+(hidden?'hidden-startup-check.json':'startup-check.json')),JSON.stringify(result,null,2));
 console.log('STARTUP CHECK PASSED',JSON.stringify(result));Module._load=load;server.close();app.quit();
}).catch(e=>{console.error(e);server.close();app.exit(1);});
