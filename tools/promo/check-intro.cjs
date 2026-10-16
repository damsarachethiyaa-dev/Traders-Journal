// Real Electron check of local video decoding, sandboxed bridge, sound and skip.
const {app,BrowserWindow,ipcMain}=require('electron');
const path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');
app.setPath('userData',path.join(app.getPath('temp'),'tj-intro-check-'+process.pid));
app.on('window-all-closed',()=>{});
class HiddenWindow extends BrowserWindow{constructor(o){super({...o,webPreferences:{...o.webPreferences,offscreen:true}});HiddenWindow.last=this;this.webContents.setFrameRate(30);}show(){}focus(){}}
app.whenReady().then(async()=>{
 const appRoot=process.argv[2]?path.resolve(process.argv[2]):path.resolve(__dirname,'../..');
 let finishes=0;const c=require(path.join(appRoot,'app-intro.js')).showAppIntro({app,BrowserWindow:HiddenWindow,ipcMain,onFinish:()=>finishes++});assert.ok(c);
 const win=HiddenWindow.last;
 await new Promise(r=>win.webContents.once('did-finish-load',r));
 for(let i=0;i<50;i++){if(await win.webContents.executeJavaScript('document.getElementById("introFilm").readyState>=2'))break;await new Promise(r=>setTimeout(r,100));}
 const info=await win.webContents.executeJavaScript(`(()=>{const v=document.getElementById('introFilm');return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted,bridge:typeof window.tjIntro?.finish,credit:document.querySelector('.credit strong').textContent}})()`);
 assert.equal(info.width,1280);assert.equal(info.height,720);assert.ok(info.duration>=23.9&&info.duration<=24.1);assert.equal(info.muted,true);assert.equal(info.bridge,'function');assert.equal(info.credit,'Chethiya Rathnasekara');
 const viewport=win.getContentSize();assert.ok(viewport[0]>=1200&&viewport[0]<=1280&&viewport[1]>=675&&viewport[1]<=720,'Intro keeps its requested size or fits the available desktop work area');
 const layout=await win.webContents.executeJavaScript(`(()=>{const top=document.querySelector('.top').getBoundingClientRect(),bottom=document.querySelector('.bottom').getBoundingClientRect();return {height:innerHeight,top:top.bottom,bottom:bottom.top,bg:getComputedStyle(document.body).backgroundColor,button:getComputedStyle(document.getElementById('enter')).backgroundColor}})()`);
 assert.ok(layout.top/layout.height<=.092&&layout.bottom/layout.height>=.863,'Brand furniture must leave the film content visible');assert.equal(layout.bg,'rgb(9, 9, 11)');assert.equal(layout.button,'rgb(59, 130, 246)');
 await win.webContents.executeJavaScript(`new Promise(r=>{const v=document.getElementById('introFilm');v.pause();v.addEventListener('seeked',()=>r(true),{once:true});v.currentTime=6;})`);
 await new Promise(r=>setTimeout(r,150));fs.writeFileSync(path.resolve(__dirname,'../../media/app-intro-preview.png'),(await win.webContents.capturePage()).toPNG());
 await win.webContents.executeJavaScript(`document.getElementById('sound').click();`,true);
 assert.equal(await win.webContents.executeJavaScript(`document.getElementById('introFilm').muted`),false);
 await win.webContents.executeJavaScript(`document.getElementById('enter').click();`,true).catch(()=>{});
 await new Promise(r=>setTimeout(r,100));assert.equal(c.active,false);assert.equal(finishes,1);
 fs.writeFileSync(path.resolve(__dirname,'../../media/promo-assets/'+(process.argv[2]?'packaged-intro-check.json':'intro-check.json')),JSON.stringify({...info,layout,soundToggle:true,skip:true,finishes},null,2));
 console.log('NATIVE INTRO CHECK PASSED',JSON.stringify(info));app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
