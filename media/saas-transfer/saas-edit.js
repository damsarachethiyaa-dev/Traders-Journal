// Editable native Higgsedit composition: 1280x720 / 60 fps / 24 seconds.
// Set TJ_SAAS_ROOT to the folder containing inputs/ and project/ when rebuilding.
export default async ({project,frame,text,rect,media,path,icon}) => {
  const root=process.env.TJ_SAAS_ROOT||'/home/user/tj-intro-remake';
  const p=await project({dir:root+'/project',size:'1280x720',fps:60,background:'#09090b'});
  const A={};
  for(const n of ['dashboard','dashboard-lower','logging','journal','performance','edge','behavior','progress','connect','privacy','king']) A[n]=await p.add(root+'/inputs/'+n+'.png');
  const music=await p.add(root+'/inputs/soundtrack.mp3');p.cut(music,{from:0,dur:24,at:0});
  const C={bg:'#09090b',card:'#0e0e10',line:'#27272e',ink:'#ececee',muted:'#8b8b93',blue:'#3b82f6',gold:'#e8be6b',green:'#19d38a',purple:'#8b5cf6'};
  const tween=(property,from,to,duration=.6,at=0)=>({property,from,to,duration,at,easing:'house'});
  const label=(s,x,y,w,size=12,color=C.muted,extra={})=>text(s,{x,y,width:w,height:size*1.8,fontFamily:'JetBrains Mono',fontWeight:500,fontSize:size,color,...extra});
  const title=(s,x,y,w,size=48,color=C.ink,delay=.1)=>text(s,{x,y,width:w,height:size*1.45,fontFamily:'Space Grotesk',fontWeight:700,fontSize:size,color,motion:{by:'word',from:{y:32,opacity:0},at:delay,duration:.48,overlap:.72,easing:'house'}});
  const body=(s,x,y,w,size=15,color=C.muted,extra={})=>text(s,{x,y,width:w,height:size*2.7,fontFamily:'Inter',fontWeight:400,fontSize:size,color,...extra});
  const compose=(nodes,at,dur,name)=>p.compose(frame({width:1280,height:720,layout:'none'},nodes),{at,dur,name});
  const bg=(accent=C.blue)=>[
    rect({width:1280,height:720,fill:C.bg}),
    rect({x:360,y:60,width:920,height:570,fill:{kind:'radial',stops:[{offset:0,color:accent,opacity:.12},{offset:1,color:C.bg,opacity:0}]}}),
    ...Array.from({length:11},(_,i)=>rect({x:44+i*119,y:70,width:1,height:550,fill:'#ffffff05'})),
    ...Array.from({length:7},(_,i)=>rect({x:44,y:90+i*82,width:1192,height:1,fill:'#ffffff05'})),
  ];
  const panel=(nodes,x,y,w,h,d,side=1,delay=.08)=>frame({x,y,width:w,height:h,layout:'none',at:delay,duration:d-delay,
    motion:{enter:{from:{x:side*210,y:32,scale:.90,opacity:0,rotation:side*2.4},to:{x:0,y:0,scale:1,opacity:1,rotation:0},duration:.64,easing:'house'},
    settle:{to:{y:-4,scale:1.006},duration:Math.max(.05,d-delay-.9),easing:'smooth'},exit:{to:{x:-side*34,opacity:0,scale:.98},duration:.16,anchor:'end',easing:'smooth'}}},nodes);
  const screen=(name,x,y,w,d,side=1)=>panel([
    rect({x:-2,y:-25,width:w+4,height:w/1.6+27,fill:C.card,radius:11,strokeColor:'#32323b',strokeWidth:1}),
    ...[C.blue,C.gold,C.green].map((c,i)=>rect({x:12+i*12,y:-15,width:5,height:5,radius:3,fill:c})),
    label('TRADERS JOURNAL',58,-21,220,8),label('DEMO WORKSPACE',w-115,-21,110,7),
    media({file:A[name],x:0,y:0,width:w,height:w/1.6,fit:'contain',radius:8}),
  ],x,y,w,w/1.6,d,side);
  const chip=(s,x,y,w,accent=C.blue,delay=.4)=>frame({x,y,width:w,height:38,layout:'none',at:delay,motion:{enter:{from:{y:12,opacity:0},duration:.4}}},[
    rect({width:w,height:38,fill:C.card,radius:9,strokeColor:accent+'66',strokeWidth:1}),
    rect({x:12,y:16,width:6,height:6,fill:accent,radius:3}),
    label(s,26,11,w-35,10,C.ink),
  ]);
  const streak=(d,accent)=>frame({x:0,y:0,width:1280,height:720,layout:'none',at:d-.16,duration:.16},[
    rect({x:-1280,y:64,width:1280,height:560,fill:C.bg,animate:[tween('offsetX',0,2560,.16)]}),
    rect({x:-1280,y:64,width:5,height:560,fill:accent,animate:[tween('offsetX',0,2560,.16)]}),
  ]);
  const notebook=(x,y,size,accent=C.blue)=>frame({x,y,width:size,height:size,layout:'none'},[
    rect({width:size,height:size,fill:'#101725',radius:size*.24,strokeColor:accent+'88',strokeWidth:1}),
    icon('notebook-pen',{x:size*.21,y:size*.19,size:size*.59,color:accent,strokeWidth:1.5}),
  ]);
  // 00–03: four native feature cards converge around the journal identity.
  compose([...bg(),
    ...[['dashboard',-88,126,400],['performance',958,117,420],['journal',-38,402,345],['edge',1010,414,340]].map(([n,x,y,w],i)=>panel([
      media({file:A[n],width:w,height:w/1.6,fit:'contain',radius:12}),rect({width:w,height:w/1.6,fill:'#09090b99',radius:12}),
    ],x,y,w,w/1.6,3,i%2?1:-1,.08+i*.09)),
    frame({x:588,y:96,width:104,height:104,layout:'none',motion:{enter:{from:{scale:.45,rotation:-12,opacity:0},duration:.65,easing:'house'}}},[notebook(0,0,104)]),
    title('Every trade.',240,224,800,76,C.ink,.1),
    title('A clearer story.',240,311,800,76,C.blue,.25),
    body('YOUR TRADING. YOUR PROCESS. YOUR JOURNAL.',240,422,800,14,C.muted,{align:'center'}),
    chip('CAPTURE',393,491,142,C.blue,.65),chip('REVIEW',553,491,142,C.purple,.8),chip('IMPROVE',713,491,168,C.gold,.95),
    streak(3,C.blue),
  ],0,3,'01 · Journal identity');
  // 03–07: complete dashboard, with a second native card showing its lower section.
  compose([...bg(),label('01 / YOUR COMMAND CENTER',44,112,340,11,C.blue),
    title('Everything.\nIn view.',44,160,330,56),body('A complete picture of your trading day.',46,327,300,16),
    chip('RESULTS + EQUITY',46,410,250,C.blue),label('CALENDAR + HISTORY',46,462,270,10,C.green),
    screen('dashboard',392,96,832,4),
    panel([media({file:A['dashboard-lower'],width:220,height:137.5,fit:'contain',radius:9})],46,480,220,137.5,4,-1,.8),
    streak(4,C.blue),
  ],3,4,'02 · Whole dashboard');
  compose([...bg(C.green),label('02 / TRADE LOGGING',44,111,330,11,C.green),title('Capture\nthe details.',44,164,340,53),
    body('Entries, exits, setups and notes.\nKeep the complete record.',46,326,300,16),
    chip('YOUR EXECUTION',46,433,260,C.green),screen('logging',392,96,832,3,-1),streak(3,C.green),
  ],7,3,'03 · Trade logging');
  compose([...bg(C.purple),label('03 / DAILY JOURNAL',44,111,330,11,C.purple),title('Replay.\nReflect.\nRefine.',44,156,340,53,C.ink),
    body('Review your mindset.\nWrite the lesson forward.',46,404,300,16),chip('PROCESS OVER NOISE',46,493,270,C.purple),
    screen('journal',392,96,832,3),streak(3,C.purple),
  ],10,3,'04 · Daily review');
  // 13–18: the analytics switcher is native editable typography and geometry.
  for(const [i,name,headline,sub,accent] of [
    [0,'performance','See your\nperformance.','Growth, risk and drawdown.',C.blue],
    [1,'edge','Find\nyour edge.','Strategy, symbol and session.',C.green],
    [2,'behavior','Understand\nyour habits.','Turn patterns into awareness.',C.purple],
    [3,'progress','Measure\nyour progress.','Build a process you can repeat.',C.gold],
  ]) compose([...bg(accent),label('04 / ANALYTICS',44,111,330,11,accent),title(headline,44,163,340,48),body(sub,46,328,300,15),
    ...['Performance','Edge','Behavior','Progress'].map((s,j)=>frame({x:46,y:402+j*42,width:278,height:34,layout:'none'},[
      rect({width:278,height:34,fill:j===i?accent+'22':'#101014',radius:7,strokeColor:j===i?accent+'88':C.line,strokeWidth:1}),
      label(s.toUpperCase(),14,9,245,10,j===i?C.ink:C.muted),
      ...(j===i?[rect({x:261,y:12,width:8,height:8,fill:accent,radius:4})]:[]),
    ])),screen(name,392,96,832,1.25,i%2?-1:1),streak(1.25,accent),
  ],13+i*1.25,1.25,'05.'+(i+1)+' · '+name);
  compose([...bg(C.blue),label('05 / METATRADER 5',44,111,330,11,C.blue),title('Connect.\nSync.\nReview.',44,155,330,53),
    body('Bring your trading records\ninto one local workspace.',46,404,300,15),chip('LOCAL MT5 CONNECTION',46,489,280,C.blue),
    screen('connect',392,96,832,2),streak(2,C.blue),
  ],18,2,'06 · MT5 connections');
  compose([...bg(C.gold),label('06 / YOUR WORKSPACE',44,111,330,11,C.gold),title('Your journal.\nYour control.',44,172,340,46),
    body('Preferences and privacy,\nright inside your desktop app.',46,340,300,15),chip('BUILT AROUND YOU',46,446,270,C.gold),
    screen('privacy',392,96,832,1.5,-1),streak(1.5,C.gold),
  ],20,1.5,'07 · Privacy and preferences');
  // 21.5–24: clean logo reveal, no synthetic promises or invented trading metrics.
  compose([...bg(C.gold),
    panel([media({file:A.king,width:360,height:225,fit:'contain',radius:14}),rect({width:360,height:225,fill:'#09090baa',radius:14})],-100,180,360,225,2.5,-1),
    panel([media({file:A.dashboard,width:360,height:225,fit:'contain',radius:14}),rect({width:360,height:225,fill:'#09090baa',radius:14})],1020,180,360,225,2.5,1),
    frame({x:589,y:105,width:102,height:102,layout:'none',motion:{enter:{from:{scale:.6,y:24,opacity:0},duration:.6,easing:'house'}}},[notebook(0,0,102,C.gold)]),
    text('TRADERS JOURNAL',{x:180,y:246,width:920,height:95,fontFamily:'Space Grotesk',fontWeight:700,fontSize:70,color:C.ink,align:'center',motion:{by:'character',from:{y:32,opacity:0},at:.15,duration:.4,overlap:.9,easing:'house'}}),
    body('YOUR TRADES. YOUR PROCESS. YOUR STORY.',190,350,900,16,C.muted,{align:'center'}),
    frame({x:522,y:418,width:236,height:46,layout:'none',at:.6,motion:{enter:{from:{y:14,opacity:0},duration:.4}}},[
      rect({width:236,height:46,fill:'#211b12',radius:23,strokeColor:C.gold+'88',strokeWidth:1}),
      icon('crown',{x:20,y:12,size:22,color:C.gold,strokeWidth:1.5}),label('KING EDITION',58,15,158,12,C.gold),
    ]),
    label('CREATED BY',290,499,700,10,C.muted,{align:'center'}),
    text('Chethiya Rathnasekara',{x:190,y:527,width:900,height:58,fontFamily:'Space Grotesk',fontWeight:700,fontSize:32,color:C.ink,align:'center',animate:[tween('opacity',0,1,.5,.55)]}),
  ],21.5,2.5,'08 · Final logo and creator');
  // Shared brand furniture matches the native intro shell and remains editable.
  compose([
    rect({width:1280,height:64,fill:C.bg}),rect({x:44,y:63,width:1192,height:1,fill:C.line}),
    icon('notebook-pen',{x:44,y:22,size:23,color:C.blue,strokeWidth:1.6}),
    text('TRADERS JOURNAL',{x:78,y:23,width:245,height:28,fontFamily:'Space Grotesk',fontWeight:700,fontSize:15,color:C.ink}),
    rect({x:280,y:21,width:101,height:25,fill:'#211b12',radius:12,strokeColor:C.gold+'55',strokeWidth:1}),label('KING EDITION',291,29,88,8,C.gold),
    label('YOUR DESKTOP WORKSPACE',980,28,256,9,C.muted,{align:'right'}),
    rect({x:0,y:624,width:1280,height:96,fill:C.bg}),rect({x:44,y:624,width:1192,height:1,fill:C.line}),
    label('CREATED BY',44,643,300,9,C.muted),text('Chethiya Rathnasekara',{x:44,y:662,width:600,height:32,fontFamily:'Space Grotesk',fontWeight:700,fontSize:20,color:C.ink}),
    label('EVERY TRADE TELLS A STORY.',890,665,346,10,C.gold,{align:'right'}),
    rect({x:44,y:704,width:1192,height:2,fill:'#27272e'}),rect({x:44,y:704,width:1192,height:2,fill:C.blue,animate:[tween('scaleX',.001,1,24)]}),
  ],0,24,'Brand and creator furniture');
  for(const t of [.8,2,4.8,8.7,11.6,13.8,15.1,16.3,17.6,19.3,20.9,23.1])await p.frame(t,'renders/preview-'+t+'.png');
  if(process.env.TJ_SAAS_RENDER==='1')await p.render('renders/saas-native.mp4',{shards:4,concurrency:2,bitrate:10000000});
};
