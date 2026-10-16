// Native Higgsedit / Katana motion composition. No browser or runtime animation callbacks.
export default async ({project,frame,text,rect,media,path,icon}) => {
  const p=await project({dir:'/home/user/tj-katana/project',size:'1920x1080',fps:30,background:'#070a08'});
  const A={};
  for(const n of ['dashboard','performance','journal','edge','connect','king'])A[n]=await p.add('/home/user/tj-katana/inputs/'+n+'.jpg');
  const music=await p.add('/home/user/tj-katana/inputs/soundtrack.mp3');
  p.cut(music,{from:0,dur:30,at:0});
  const lime='#baff50',paper='#f1f3e9',black='#080c09',muted='#81927f';
  const compose=(nodes,options)=>p.compose(frame({width:1920,height:1080,layout:'none'},nodes),options);
  const txt=(s,x,y,w,size,color=paper,extra={})=>text(s,{x,y,width:w,height:size*1.6,fontFamily:'Anton',fontWeight:400,fontSize:size,color,...extra});
  const mono=(s,x,y,w,color=muted,size=17)=>text(s,{x,y,width:w,height:size*1.8,fontFamily:'Space Mono',fontWeight:400,fontSize:size,color});
  const ease=(property,from,to,duration=.55,at=0)=>({property,from,to,duration,at,easing:'house'});
  const float=(property,a,b,d)=>({property,keyframes:[{at:0,value:a},{at:d*.55,value:b,easing:'smooth'},{at:d,value:a,easing:'smooth'}]});
  const movingFrame=(x,y,w,h,children,d,side=1,delay=0,rotation=0)=>frame({x,y,width:w,height:h,layout:'none',at:delay,duration:d-delay,
    motion:{enter:{from:{x:side*330,y:80,scale:.83,opacity:0,rotation:side*7},to:{x:0,y:0,scale:1,opacity:1,rotation},duration:.7,easing:'house'},
      settle:{to:{x:-side*18,y:-8,scale:1.025,opacity:1,rotation:rotation*.35},duration:Math.max(.1,d-delay-.9),easing:'smooth'}},
  },children);
  const screen=(name,x,y,w,h,d,side=1,rot=0)=>movingFrame(x,y,w,h,[
    rect({x:-3,y:-39,width:w+6,height:h+42,fill:'#172318',radius:17,strokeColor:'#577747',strokeWidth:1}),
    rect({x:0,y:0,width:w,height:h,fill:'#080b09',radius:12}),
    ...[0,1,2].map(i=>rect({x:17+i*16,y:-22,width:6,height:6,radius:3,fill:[lime,'#f4ce75','#6d9474'][i]})),
    mono('TRADERS JOURNAL',80,-31,360,'#b2c5a7',12),
    mono('DEMO DATA',w-120,-31,120,'#b2c5a7',11),
    media({file:A[name],x:0,y:0,width:w,height:h,fit:'cover',radius:10}),
  ],d,side,.1,rot);
  const header=(light=false,chapter='')=>[
    mono('TRADERS JOURNAL',80,47,550,light?black:paper,20),
    mono(chapter,1250,49,590,light?black:lime,15),
    rect({x:80,y:91,width:1760,height:1,fill:light?'#080c0933':'#c6f4a326'}),
    mono('CREATED BY CHETHIYA RATHNASEKARA',80,1022,960,light?'#26371d':'#90a380',13),
    mono('KING EDITION',1620,1022,230,light?'#26371d':'#90a380',13),
  ];
  const bg=(accent=lime)=>[
    rect({width:1920,height:1080,fill:black}),
    rect({x:630,y:120,width:1280,height:880,fill:{kind:'radial',stops:[{offset:0,color:accent,opacity:.10},{offset:1,color:black,opacity:0}]}}),
    ...Array.from({length:13},(_,i)=>rect({x:80+i*147,y:150,width:1,height:850,fill:'#c2ff7a0b',animate:[float('offsetX',0,18,4)]})),
    ...Array.from({length:8},(_,i)=>rect({x:80,y:180+i*110,width:1760,height:1,fill:'#c2ff7a0b'})),
  ];
  const shutter=(d)=>frame({x:0,y:0,width:1920,height:1080,layout:'none',at:d-.18,duration:.18},[
    rect({x:-2100,y:0,width:2100,height:1080,fill:lime,animate:[ease('offsetX',0,4200,.18)]}),
  ]);
  const lineTitle=(lines,x,y,w,size,color,delay=0)=>lines.map((s,i)=>txt(s,x,y+i*size*1.14,w,size,i===lines.length-1?color:paper,{motion:{by:'word',from:{y:90,opacity:0,scale:.9},at:delay+i*.1,duration:.42,overlap:.7,easing:'house'}}));
  const tag=(label,x,y,w,accent,delay)=>frame({x,y,width:w,height:51,layout:'none',at:delay},[
    rect({width:w,height:51,fill:'#102012',radius:8,strokeColor:accent,strokeWidth:1}),
    text(label,{x:18,y:14,width:w-36,height:30,fontFamily:'Inter',fontWeight:700,fontSize:19,color:paper}),
  ]);
  // 0–3: a hard lime identity card, with real product panels cascading behind the hook.
  compose([
    rect({width:1920,height:1080,fill:lime}),
    movingFrame(1120,320,690,432,[media({file:A.edge,x:0,y:0,width:690,height:432,fit:'cover',radius:18})],3,1,.12,5),
    screen('dashboard',1010,190,750,469,3,1,-4),
    txt('EVERY',82,160,900,240,black,{motion:{by:'character',from:{y:160,opacity:0},at:.05,duration:.38,overlap:.85,easing:'house'}}),
    txt('TRADE.',82,430,900,240,black,{motion:{by:'character',from:{y:160,opacity:0},at:.25,duration:.38,overlap:.85,easing:'house'}}),
    rect({x:0,y:865,width:1920,height:150,fill:black}),
    txt('MAKE IT COUNT.',80,887,1760,83,paper,{animate:[ease('offsetX',-450,0,.5,.6)]}),
    ...header(true,'A COMPLETE DESKTOP WORKSPACE'),shutter(3),
  ],{at:0,dur:3,name:'01 · Every trade'});
  // 3–8: dashboard flies into a stable, readable product view.
  compose([...bg(),...header(false,'01 / COMMAND CENTER'),
    ...lineTitle(['YOUR','TRADING.','IN VIEW.'],80,204,570,135,lime,.05),
    mono('YOUR ENTIRE TRADING PICTURE.',84,740,540,paper,16),
    tag('EQUITY / RESULTS / HISTORY',84,804,472,lime,.6),
    screen('dashboard',655,223,1165,728,5,1,-1.8),
    shutter(5),
  ],{at:3,dur:5,name:'02 · Dashboard'});
  // 8–13: the layout reverses with a measured whip; profit and drawdown remain in real UI.
  compose([...bg('#6bd8ff'),...header(false,'02 / PERFORMANCE & ANALYTICS'),
    screen('performance',84,250,1150,719,5,-1,1.7),
    ...lineTitle(['SEE THE','BIGGER','PICTURE.'],1285,210,550,116,'#6bd8ff',.1),
    tag('GROWTH + DRAWDOWN',1290,750,510,'#6bd8ff',.8),
    mono('UNDERSTAND YOUR RESULTS.',1290,830,520,paper,15),
    shutter(5),
  ],{at:8,dur:5,name:'03 · Performance'});
  // 13–18: reflections get a slower hold after a quick three-word title entrance.
  compose([...bg('#c5a0ff'),...header(false,'03 / DAILY JOURNAL'),
    ...lineTitle(['REPLAY.','REFLECT.','REFINE.'],80,215,570,133,'#c5a0ff',.03),
    tag('RATINGS / MINDSET / LESSONS',84,793,480,'#c5a0ff',.7),
    screen('journal',650,224,1170,731,5,1,-1),shutter(5),
  ],{at:13,dur:5,name:'04 · Review the process'});
  // 18–22: two product surfaces snap into a deliberate layered composition.
  compose([...bg(),...header(false,'04 / EDGE ANALYSIS'),
    txt('KNOW YOUR EDGE.',80,150,1760,154,paper,{motion:{by:'word',from:{x:-140,y:50,opacity:0},at:.04,duration:.43,overlap:.6,easing:'house'}}),
    screen('performance',1110,490,680,425,4,1,3),
    screen('edge',95,380,1100,619,4,-1,-2),
    tag('STRATEGY. SYMBOL. SESSION.',1230,350,580,lime,.7),
    shutter(4),
  ],{at:18,dur:4,name:'05 · Find your edge'});
  // 22–26: read-only MT5 sync framed as a flow between two native graphic endpoints.
  compose([...bg(),...header(false,'05 / METATRADER 5'),
    txt('CONNECT. SYNC. REVIEW.',80,148,1760,132,paper,{motion:{by:'word',from:{y:100,opacity:0},at:0,duration:.42,overlap:.65,easing:'house'}}),
    rect({x:190,y:660,width:1500,height:3,fill:'#baff5044'}),
    rect({x:210,y:653,width:18,height:18,radius:9,fill:lime,animate:[{property:'offsetX',keyframes:[{at:.5,value:0},{at:3.7,value:1470,easing:'linear'}]}]}),
    frame({x:86,y:562,width:195,height:195,layout:'none',background:'#172113',radius:28},[
      txt('MT5',0,54,195,62,lime,{align:'center'}),mono('READ ONLY',10,145,175,paper,13),
    ]),
    frame({x:1650,y:562,width:195,height:195,layout:'none',background:'#172113',radius:28},[
      icon('notebook-pen',{x:52,y:35,size:90,color:lime,strokeWidth:1.5}),mono('YOUR JOURNAL',13,145,175,paper,13),
    ]),
    screen('connect',385,345,1150,647,4,1,0),shutter(4),
  ],{at:22,dur:4,name:'06 · Connect and sync'});
  // 26–30: keep the creator identity large and readable after the final musical hit.
  compose([
    rect({width:1920,height:1080,fill:lime}),
    txt('TRADERS',80,156,1760,238,black,{align:'center',motion:{by:'character',from:{y:120,opacity:0},at:0,duration:.35,overlap:.85,easing:'house'}}),
    txt('JOURNAL',80,427,1760,238,black,{align:'center',motion:{by:'character',from:{y:120,opacity:0},at:.12,duration:.35,overlap:.85,easing:'house'}}),
    text('YOUR TRADES. YOUR PROCESS. YOUR STORY.',{x:80,y:728,width:1760,height:45,fontFamily:'Inter',fontWeight:700,fontSize:27,color:black,align:'center'}),
    mono('CREATED BY',80,813,1760,black,17),
    text('Chethiya Rathnasekara',{x:80,y:855,width:1760,height:95,fontFamily:'Inter',fontWeight:700,fontSize:62,color:black,animate:[ease('opacity',0,1,.45,.4),ease('offsetY',30,0,.45,.4)]}),
    icon('crown',{x:1670,y:830,size:110,color:black,strokeWidth:1.3}),
    ...header(true,'YOUR WORKSPACE. YOUR RULES.'),
  ],{at:26,dur:4,name:'07 · Creator credit'});
  for(const t of [1.5,5.1,10.1,15.2,20.2,24.2,28])await p.frame(t,'renders/preview-'+String(t).replace('.','-')+'.png');
  if(process.env.TJ_KATANA_RENDER==='1')await p.render('renders/katana-native.mp4',{shards:4,concurrency:2,bitrate:9000000});
};
