'use strict';
const fs=require('fs'),path=require('path');

// Each native intro has a narrow, sender-checked bridge. It never shares journal storage.
function showAppIntro({app,BrowserWindow,ipcMain,icon,onFinish,timeout=12000}){
  const media=path.join(__dirname,'media','traders-journal-intro.mp4');
  if(!fs.existsSync(media))return null;
  let win=null,done=false,timer=null;
  const finish=()=>{
    if(done)return;done=true;clearTimeout(timer);ipcMain.removeListener('tj:intro:finish',onMessage);
    if(win&&!win.isDestroyed())win.destroy();win=null;onFinish();
  };
  const onMessage=e=>{if(win&&!win.isDestroyed()&&e.sender===win.webContents)finish();};
  win=new BrowserWindow({width:1280,height:720,minWidth:800,minHeight:450,useContentSize:true,show:false,resizable:false,maximizable:false,fullscreenable:false,autoHideMenuBar:true,frame:false,backgroundColor:'#070b0a',title:'Traders Journal',icon,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,partition:'traders-journal-intro',preload:path.join(__dirname,'intro-preload.js'),backgroundThrottling:false}});
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.once('render-process-gone',finish);
  win.webContents.on('did-fail-load',(_e,code)=>{if(code!==-3)finish();});
  win.once('ready-to-show',()=>{if(!done){win.center();win.show();win.focus();}});
  win.once('closed',finish);
  ipcMain.on('tj:intro:finish',onMessage);
  timer=setTimeout(finish,timeout);
  win.loadFile(path.join(__dirname,'app-intro.html')).catch(finish);
  return {finish,get active(){return !done;}};
}
module.exports={showAppIntro};
