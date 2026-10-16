const { app, BrowserWindow }=require('electron');
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'../..');
const args=process.argv.slice(2),mode=args[0];
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');
app.setPath('userData',path.join(app.getPath('temp'),'tj-film-render-'+process.pid));
const timeline=JSON.parse(fs.readFileSync(path.join(root,'media/promo-audio/timeline.json'),'utf8'));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:1920,height:1080,useContentSize:true,show:false,frame:false,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 await win.loadFile(path.join(__dirname,'promo.html'),{query:{render:'1'}});
 await win.webContents.executeJavaScript('window.initFilm('+JSON.stringify(timeline)+')');
 const capture=async(t,format='png')=>{const data=await win.webContents.executeJavaScript('window.seek('+t+');document.getElementById("film").toDataURL("image/'+format+'",0.94)');return Buffer.from(data.split(',')[1],'base64');};
 if(mode==='stills'){
  fs.mkdirSync(args[1],{recursive:true});for(const t of args[2].split(',').map(Number)){fs.writeFileSync(path.join(args[1],`frame-${String(t).padStart(3,'0')}.png`),await capture(t));}console.log('stills complete');win.destroy();app.quit();return;
 }
 const out=args[1],from=+args[2],to=+args[3],fps=+(args[4]||30),frames=Math.round((to-from)*fps);
 const ff=spawn(process.env.FFMPEG,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-threads','3','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit'],windowsHide:true});
 let ffError;ff.on('error',e=>ffError=e);ff.stdin.on('error',e=>ffError=e);
 const finished=new Promise((resolve,reject)=>ff.on('close',code=>code===0?resolve():reject(new Error('ffmpeg exited '+code))));
 const start=Date.now();
 for(let i=0;i<frames;i++){
  if(ffError)throw ffError;
  const img=await capture(from+i/fps,'jpeg');
  if(!ff.stdin.write(img))await new Promise(r=>ff.stdin.once('drain',r));
  if(i%150===0)console.log(path.basename(out),i+'/'+frames,Math.round((Date.now()-start)/1000)+'s');
 }
 ff.stdin.end();await finished;console.log('RENDER COMPLETE',out,frames);win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
