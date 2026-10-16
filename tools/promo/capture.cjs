// Capture the actual app in a disposable browser partition, with synthetic records.
// The production backend, MT5 terminals, and saved user data are never opened.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const output = process.env.TJ_PROMO_CAPTURE_DIR || path.join(root, 'media/promo-assets');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.setPath('userData', path.join(app.getPath('temp'), 'tj-promo-' + process.pid));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const state = {showManual:true, startEquity:10000, range:'30', theme:'dark', collapsed:false,
  profile:{firstName:'Demo',lastName:'Trader',username:'demo.trader',email:'',phone:'',country:'',location:'',bio:'Review the process. Learn from every trade.',photo:''},
  preferences:{collapsed:false,theme:'dark',range:'30',monthlyGoal:2500}, live:[],reviews:{},journal:{}};
let seed = 546;
const rand = () => {seed = (seed * 16807) % 2147483647; return seed/2147483647;};
const today = new Date();
for (let d=89;d>=0;d--) {
  const date = new Date(today); date.setDate(date.getDate()-d); date.setHours(0,0,0,0);
  if ([0,6].includes(date.getDay())) continue;
  for (let j=0;j<2+Math.floor(rand()*3);j++) {
    const i=state.live.length, win=rand()>.34;
    const pnl=+(win?55+rand()*170:-35-rand()*100).toFixed(2);
    const symbol=['XAUUSD','EURUSD','GBPUSD','US100'][i%4];
    const entry=[2650,1.09,1.30,20500][i%4];
    const t=new Date(date);t.setHours(8+j*2+i%2,12+i%40);
    const iso=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')+'T'+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
    const side=i%3?'Long':'Short',qty=[10,10000,10000,1][i%4],fees=3.5;
    const strategy=['Breakout','Pullback','Momentum','Reversal'][i%4];
    const id='demo-'+i;
    state.live.push({id,symbol,side,date:iso,entryTime:iso,exitTime:new Date(+t+1200000+i%8*60000).toISOString(),entry,exit:entry+(pnl+fees)/qty*(side==='Long'?1:-1),qty,fees,pnl,strategy,account:'Demo Account',notes:'Illustrative sample trade. Not actual performance.'});
    state.reviews[id]={strategy,rating:win?'great':'okay',plan:win?'followed':'deviated',mood:win?3:1,mistakes:win?[]:['Early exit'],reflection:win?'Waited for confirmation. Followed the plan and respected the risk.':'Review the entry. Be patient and avoid acting before confirmation.',reviewed:true,completed:true};
  }
}
const net=state.live.reduce((a,t)=>a+t.pnl,0);
const connection={id:'demo-connection',name:'Demo Account',platform:'mt5',status:'online',isLiveTerminal:true,tradeCount:state.live.length,lastSeen:Date.now(),account:{login:100000,server:'MT5 Demo',name:'Demo Trader',company:'Demonstration',currency:'USD',initialBalance:10000,balance:10000+net,equity:10000+net,source:'live_terminal'}};
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const json=o=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(o));};
  if(u.pathname==='/seed'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<script>localStorage.clear();localStorage.setItem("tj_state",'+JSON.stringify(JSON.stringify(state))+');localStorage.setItem("tj_tut_seen","1");location.href="/"</script>');return;}
  if(u.pathname==='/api/state')return json({version:1,connections:[connection],trades:[],serverTime:Date.now()});
  if(u.pathname==='/api/local-mt5/status')return json({connection,accounts:[connection],autoSync:true,logs:[{time:'10:00:00',type:'ok',text:'DEMO PREVIEW — illustrative connection and history'},{time:'10:00:01',type:'ok',text:'Read-only local sync · sample records ready'}]});
  if(u.pathname==='/api/local-mt5/scan-accounts')return json({ok:true,accounts:[{login:1514969074,server:'FTMO-Demo',name:'Chethiya Demo',balance:100000,equity:104250,currency:'USD',path:'C:/Program Files/MetaTrader 5/terminal64.exe'},{login:20884129,server:'ICMarkets-Live',name:'Chethiya Live',balance:25400,equity:26180,currency:'USD',path:'C:/Program Files/ICMarkets MT5/terminal64.exe'}],deletedLogins:[]});
  if(u.pathname.startsWith('/api/gcal'))return json({linked:false,events:[]});
  if(u.pathname.startsWith('/api/'))return json({ok:true});
  const rel=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1));
  if(!/^(index\.html|[a-z-]+\.(js|css)|fonts\/[a-z0-9.-]+|build\/icon\.png)$/.test(rel)){res.writeHead(404);res.end();return;}
  const file=path.join(root,rel);
  try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch(e){res.writeHead(404);res.end();}
});
app.whenReady().then(async()=>{
  fs.mkdirSync(output,{recursive:true});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const win=new BrowserWindow({width:1600,height:1000,useContentSize:true,show:false,webPreferences:{offscreen:true,partition:'promo-'+process.pid,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.setFrameRate(30);
  const errors=[];
  win.webContents.on('console-message',(_e,level,message)=>{if(level>=3)errors.push(message);});
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/seed');
  await sleep(2000);
  await win.webContents.executeJavaScript(`document.documentElement.style.scrollBehavior='auto';document.body.classList.remove('collapsed');const st=document.createElement('style');st.textContent='*{scrollbar-width:none!important;animation:none!important;transition:none!important}::-webkit-scrollbar{display:none!important}';document.head.appendChild(st);`);
  const shots=[
    ['dashboard',`go('dashboard')`],
    ['dashboard-lower',`go('dashboard');window.scrollTo(0,660)`],
    ['logging',`go('logging')`],
    ['journal',`go('journal');document.querySelector('.dj-trade')?.click()`],
    ['performance',`go('an-performance')`],
    ['edge',`go('an-edge')`],
    ['behavior',`go('an-behavior')`],
    ['progress',`go('an-progress')`],
    ['connect',`go('connect')`],
    ['scanner',`go('connect');openAccountScanner()`],
    ['privacy',`openSettings('security')`],
    ['king',`openSettings('subscription')`]
  ];
  const checks=[];
  for(const [id,code] of shots){
    await win.webContents.executeJavaScript(code);await sleep(1450);
    await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    const info=await win.webContents.executeJavaScript(`({title:document.querySelector('.page.active')?.id,text:document.querySelector('.page.active')?.innerText.slice(0,220),trades:sourceTrades().length})`);
    const img=await win.webContents.capturePage();fs.writeFileSync(path.join(output,id+'.png'),img.toPNG());checks.push({id,...info,size:img.getSize()});console.log('captured',id,info.title);
  }
  fs.writeFileSync(path.join(output,'capture-checks.json'),JSON.stringify({checks,errors,syntheticTrades:state.live.length},null,2));
  // Inventory and hash every first-party text source. Never inspect saved account records.
  const files=[];
  const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.venv','dist','data','media','.git'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(js|cjs|html|css|py|ps1|mq5|json|md|bat|vbs|sh)$/.test(e.name)){const text=fs.readFileSync(p,'utf8');files.push({file:path.relative(root,p).replaceAll('\\','/'),bytes:Buffer.byteLength(text),lines:text.split('\n').length,sha256:crypto.createHash('sha256').update(text).digest('hex')});}}};walk(root);
  fs.writeFileSync(path.join(output,'source-inventory.json'),JSON.stringify(files,null,2));
  console.log('source inventory',files.length,'files; captured',checks.length,'screens; renderer errors',errors.length);
  win.destroy();server.close(()=>app.quit());
}).catch(e=>{console.error(e);app.exit(1);});
