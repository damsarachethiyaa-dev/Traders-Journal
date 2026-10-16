/* Deterministic 1080p motion design: every frame can be sought and rendered exactly. */
const canvas=document.getElementById('film'),ctx=canvas.getContext('2d',{alpha:false});
const W=1920,H=1080,TAU=Math.PI*2;
let story,images={},ready=false;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>1-Math.pow(1-clamp(x),4);
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const rand=n=>{const a=Math.sin(n*127.1+71.9)*43758.5453;return a-Math.floor(a);};
const C={white:'#f3f5ec',muted:'#8d9c93',bg:'#070b0a',line:'#24312a'};
function round(x,y,w,h,r=18){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function box(x,y,w,h,fill,stroke,r=18){round(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function text(s,x,y,size=24,color=C.white,weight=500,align='left',family='Inter'){
 ctx.font=`${weight} ${size}px "${family}"`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function line(x1,y1,x2,y2,c,w=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();}
function circle(x,y,r,c,stroke=false,w=1){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx[stroke?'strokeStyle':'fillStyle']=c;ctx.lineWidth=w;ctx[stroke?'stroke':'fill']();}
function logo(x,y,size,accent){
 ctx.save();ctx.translate(x,y);ctx.strokeStyle=accent;ctx.lineWidth=size*.065;round(0,0,size*.76,size,4);ctx.stroke();
 for(let i=0;i<3;i++)line(-size*.14,size*(.23+.24*i),size*.12,size*(.23+.24*i),accent,size*.06);
 line(size*.27,size*.72,size*.38,size*.55,accent,size*.055);line(size*.38,size*.55,size*.49,size*.61,accent,size*.055);line(size*.49,size*.61,size*.64,size*.34,accent,size*.055);ctx.restore();
}
function crown(x,y,size,color){ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);ctx.beginPath();ctx.moveTo(0,22);ctx.lineTo(24,42);ctx.lineTo(50,0);ctx.lineTo(76,42);ctx.lineTo(100,22);ctx.lineTo(86,82);ctx.lineTo(14,82);ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();line(16,96,84,96,color,4);ctx.restore();}
function background(T,accent,boost=0){
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
 const g=ctx.createRadialGradient(1380+Math.sin(T*.2)*80,460,0,1280,500,1000);g.addColorStop(0,accent+'18');g.addColorStop(.55,accent+'06');g.addColorStop(1,'#070b0a00');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // Perspective grid and drifting data particles.
 ctx.save();ctx.globalAlpha=.25;const drift=(T*15)%110;
 for(let x=-900;x<2700;x+=160)line(960+(x-960)*.1,520,x,1080,'#263c30');
 for(let j=0;j<9;j++){const p=((j*110+drift)/1000);const y=530+Math.pow(p,2)*630;line(0,y,W,y,'#263c30');}ctx.restore();
 for(let i=0;i<72;i++){const x=(rand(i)*W+T*(4+rand(i+6)*15))%W,y=rand(i+200)*H;ctx.globalAlpha=.08+rand(i+400)*.24;circle(x,y,rand(i+800)*1.7+.5,accent);}ctx.globalAlpha=1;
 ctx.save();ctx.translate(1430,490);ctx.rotate(T*.035);ctx.globalAlpha=.1;
 for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,320+i*75,320+i*75,0,TAU*.12,TAU*.89);ctx.strokeStyle=accent;ctx.lineWidth=1;ctx.stroke();}ctx.restore();
 // Fine textured scanlines, low contrast and stable.
 ctx.fillStyle='#0000000a';for(let y=0;y<H;y+=4)ctx.fillRect(0,y,W,1);
}
function chrome(T,sc,idx){
 logo(78,54,33,sc.accent);text('TRADERS JOURNAL',126,79,22,C.white,700,'left','Space Grotesk');
 text('FULL TUTORIAL & MT5 CONNECTION GUIDE',78,113,11,C.muted,500,'left','JetBrains Mono');
 box(1650,53,190,39,'#131a12','#485d32',20);circle(1670,72,4,sc.accent);text('KING EDITION',1690,79,13,sc.accent,600);
 line(78,139,1840,139,'#27352c');
 text('CREATED BY CHETHIYA RATHNASEKARA',78,1041,11,'#a4b39e',500,'left','JetBrains Mono');
 text(String(idx+1).padStart(2,'0')+' / '+String(story.scenes.length).padStart(2,'0'),1840,1041,12,C.muted,500,'right','JetBrains Mono');
 ctx.fillStyle='#203024';ctx.fillRect(78,1061,1762,2);ctx.fillStyle=sc.accent;ctx.fillRect(78,1061,1762*T/story.duration,2);
}
function title(lines,x,y,size,accent,t,spacing=1.08){
 ctx.font=`700 ${size}px "Space Grotesk"`;const fitted=size*Math.min(1,570/Math.max(...lines.map(s=>ctx.measureText(s).width)));
 lines.forEach((s,i)=>{const e=ease((t-.1-i*.13)/.85);ctx.save();ctx.globalAlpha=e;ctx.translate(x+(1-e)*-100,y+i*size*spacing+(1-e)*46);ctx.scale(1+(1-e)*.14,1);text(s,0,0,fitted,i===lines.length-1?accent:C.white,700,'left','Space Grotesk');ctx.restore();});
}
function pill(s,x,y,accent,p=1){ctx.save();ctx.globalAlpha=p;ctx.font='500 17px Inter';const w=ctx.measureText(s).width+42;box(x,y,w,39,'#151f18',accent+'44',20);circle(x+16,y+20,2.5,accent);text(s,x+27,y+25,16,'#dce8d3');ctx.restore();return w;}
function chips(sc,t,x=84,y=690){let cy=y;for(let i=0;i<(sc.chips||[]).length;i++){const p=ease((t-.65-i*.15)/.6);pill(sc.chips[i],x+(1-p)*-40,cy,sc.accent,p);cy+=51;}}
function appScreen(name,x,y,w,h,t,accent,variant=0){
 const img=images[name];if(!img)return;
 const e=ease(t/.95),z=1.03+.014*Math.sin(t*.4);
 ctx.save();ctx.globalAlpha=e;ctx.translate(x+w/2+(1-e)*190,y+h/2+(1-e)*65+Math.sin(t*.65)*6);ctx.rotate((1-e)*.08+Math.sin(t*.22)*.006);
 ctx.shadowColor='#000000b0';ctx.shadowBlur=55;ctx.shadowOffsetY=28;box(-w/2-2,-h/2-43,w+4,h+47,'#101813',null,18);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 box(-w/2,-h/2-41,w,41,'#111b15',accent+'44',14);
 for(let i=0;i<3;i++)circle(-w/2+21+i*17,-h/2-21,4,['#ff686b','#ffd36e','#b7ff5c'][i]);
 text('TRADERS JOURNAL — WINDOWS APP',-w/2+85,-h/2-16,10,C.muted,500,'left','JetBrains Mono');
 text('DEMONSTRATION DATA',w/2-18,-h/2-16,9,accent,500,'right','JetBrains Mono');
 round(-w/2,-h/2,w,h,6);ctx.save();ctx.clip();
 const sw=img.width,sh=img.height;const fit=Math.max(w/sw,h/sh)*z;
 const dw=sw*fit,dh=sh*fit;
 ctx.drawImage(img,-dw/2+Math.sin(t*.27)*6,-dh/2+Math.cos(t*.21)*5,dw,dh);
 // A restrained diagonal glass reflection.
 const g=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);g.addColorStop(0,'#ffffff07');g.addColorStop(.35,'#ffffff00');g.addColorStop(.7,'#ffffff00');g.addColorStop(1,'#ffffff03');ctx.fillStyle=g;ctx.fillRect(-w/2,-h/2,w,h);ctx.restore();
 round(-w/2,-h/2-41,w,h+41,16);ctx.strokeStyle=accent+'4c';ctx.lineWidth=1;ctx.stroke();ctx.restore();
}
function chart(x,y,w,h,t,accent){
 box(x,y,w,h,'#111a15ee',accent+'3c',16);text('ILLUSTRATIVE EQUITY',x+23,y+31,11,C.muted,500,'left','JetBrains Mono');
 const points=[];for(let i=0;i<31;i++)points.push([x+24+i*(w-48)/30,y+h-22-(i/30*.68+.09*Math.sin(i*1.7)+.06*Math.sin(i*.57))*(h-65)]);
 for(let j=0;j<3;j++)line(x+24,y+61+j*25,x+w-24,y+61+j*25,'#233629');
 const n=1+Math.floor(clamp((t-.6)/1.7)*(points.length-1));ctx.beginPath();points.slice(0,n).forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.stroke();
 const pt=points[n-1];circle(pt[0],pt[1],5,accent);circle(pt[0],pt[1],12,accent+'22');
}
function candles(T,accent,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;
 for(let i=0;i<26;i++){
  const x=96+i*71,y=620-130*Math.sin(i*.25)-i*4+Math.sin(T*.4+i)*8;
  const up=i%4!==0,h=25+rand(i+33)*100,c=up?accent:'#ff737e';
  line(x,y-h-28,x,y+35,c+'70',2);box(x-10,y-h,20,h,c+'55',null,2);
 }ctx.restore();
}
function orbitLogo(t,accent){
 const p=ease(t/1.1);ctx.save();ctx.translate(960,345);ctx.scale(.8+.2*p,.8+.2*p);ctx.globalAlpha=p;
 for(let i=0;i<3;i++){ctx.save();ctx.rotate(t*.16*(i%2?-1:1)+i);ctx.beginPath();ctx.ellipse(0,0,110+i*24,39+i*19,-.35,0,TAU);ctx.strokeStyle=accent+(i?'35':'80');ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}
 box(-49,-59,98,118,'#0b160e',accent+'a0',22);logo(-24,-34,65,accent);ctx.restore();
}
function intro(T,t,sc){
 candles(T,sc.accent,.22);orbitLogo(t,sc.accent);
 const k=ease((t-.25)/.8);ctx.save();ctx.globalAlpha=k;text(sc.label,960,180,14,sc.accent,500,'center','JetBrains Mono');ctx.restore();
 sc.title.forEach((s,i)=>{const e=ease((t-.35-i*.15)/.95);ctx.save();ctx.globalAlpha=e;ctx.translate(960,610+i*145+(1-e)*95);ctx.scale(1+(1-e)*.25,1);text(s,0,0,136,i?sc.accent:C.white,700,'center','Space Grotesk');ctx.restore();});
 text('A TRADING JOURNAL BUILT AROUND YOUR PROCESS',960,847,16,C.muted,500,'center','JetBrains Mono');
}
function overview(T,t,sc){
 text('INTRODUCING',960,194,14,sc.accent,500,'center','JetBrains Mono');
 const e=ease(t/.9);ctx.save();ctx.globalAlpha=e;text('TRADERS JOURNAL',960,279+(1-e)*30,91,C.white,700,'center','Space Grotesk');ctx.restore();
 appScreen(sc.image,250,363,1420,540,t-.18,sc.accent);
 const p=ease((t-1)/.8);ctx.save();ctx.globalAlpha=p;box(1290,803,430,74,'#b7ff5c',null,16);text('YOUR TRADING. IN FULL VIEW.',1505,850,23,'#14200c',700,'center','Space Grotesk');ctx.restore();
}
function sceneView(T,t,sc,idx){
 const entrance=ease(t/.8);ctx.save();ctx.globalAlpha=entrance;
 text(sc.label,84,204,14,sc.accent,500,'left','JetBrains Mono');ctx.restore();
 const size=sc.id==='behavior'?67:['mt5','scanner'].includes(sc.id)?84:sc.id==='journal'?90:77;
 title(sc.title,78,333,size,sc.accent,t);
 const ty=333+(sc.title.length-1)*size*1.08;
 line(84,ty+45,84+150*ease((t-.4)/.7),ty+45,sc.accent,3);
 chips(sc,t,84,Math.max(ty+86,640));
 appScreen(sc.image,678,282,1158,630,t-.1,sc.accent);
 if(['dashboard','performance','progress','edge','analytics'].includes(sc.id)){
  ctx.save();ctx.globalAlpha=ease((t-.9)/.8);const y=795+(1-ease((t-.9)/.8))*60;
  chart(594,y,342,150,t,sc.accent);ctx.restore();
 }
 if(sc.id==='journal'){
  ctx.save();ctx.globalAlpha=ease((t-1.2)/.8);box(1450,820,350,86,'#20172bee',sc.accent+'66',16);text('REVIEW THE PROCESS',1474,854,12,sc.accent,500,'left','JetBrains Mono');text('Every detail has a lesson.',1474,884,20,C.white,600);ctx.restore();
 }
 if(sc.id==='behavior'){
  ctx.save();ctx.globalAlpha=ease((t-1.1)/.7);box(1370,824,430,81,'#20172bee',sc.accent+'66',16);text('PATTERNS START WITH AWARENESS',1394,871,18,sc.accent,600);ctx.restore();
 }
 if(sc.id==='sessions'){
  const cities=['SYDNEY','TOKYO','LONDON','NEW YORK'];
  cities.forEach((v,i)=>{const p=ease((t-1-i*.12)/.7);ctx.save();ctx.globalAlpha=p;box(710+i*267,834+(1-p)*20,247,62,'#101d1bee',sc.accent+'4c',12);circle(730+i*267,865,4,sc.accent);text(v,748+i*267,872,16,C.white,600);ctx.restore();});
 }
 if(sc.id==='mt5'){
  const p=ease((t-1)/.8);ctx.save();ctx.globalAlpha=p;
  box(83,850,450,66,'#111b14',sc.accent+'55',12);text('MT5 TERMINAL',109,890,19,C.white,700,'left','Space Grotesk');text('DIRECT SYNC',335,890,17,sc.accent,700,'left','Space Grotesk');
  line(245,881,320,881,sc.accent+'55',2);for(let k=0;k<4;k++)circle(248+((t*55+k*35)%70),881,3,sc.accent);ctx.restore();
 }
 if(sc.id==='scanner'){
  const p=ease((t-1)/.8);ctx.save();ctx.globalAlpha=p;
  box(83,850,465,66,'#111b14',sc.accent+'55',12);text('SELECT ACCOUNTS',109,890,18,C.white,700,'left','Space Grotesk');text('SAFE DELETION GUARD',305,890,13,sc.accent,700,'left','Space Grotesk');ctx.restore();
 }
 if(sc.id==='king'){
  ctx.save();ctx.globalAlpha=ease((t-.8)/1);crown(150,785,95,sc.accent);ctx.restore();
 }
}
function outro(T,t,sc){
 candles(T,sc.accent,.12);text('TRADERS JOURNAL',960,226,23,sc.accent,600,'center','JetBrains Mono');
 sc.title.forEach((s,i)=>{const e=ease((t-.05-i*.12)/.85);ctx.save();ctx.globalAlpha=e;text(s,960+(1-e)*100,376+i*113,102,i===2?sc.accent:C.white,700,'center','Space Grotesk');ctx.restore();});
 const e=ease((t-.8)/1);ctx.save();ctx.globalAlpha=e;line(680,692,1240,692,sc.accent+'66');text('CREATED BY',960,752,16,C.muted,500,'center','JetBrains Mono');text('Chethiya Rathnasekara',960,824,57,C.white,600,'center','Space Grotesk');text('FULL TUTORIAL & MT5 CONNECTION GUIDE',960,888,13,sc.accent,500,'center','JetBrains Mono');ctx.restore();
}
function captions(T,sc){
 if(T<sc.voiceStart||T>sc.voiceEnd+.15)return;
 ctx.font='500 22px Inter';const words=sc.voice.split(' ');let lines=[''];
 for(const word of words){const i=lines.length-1;if(ctx.measureText(lines[i]+word+' ').width>1490)lines.push(word+' ');else lines[i]+=word+' ';}
 const h=lines.length*29+17,y=997-h;
 box(960-790,y,1580,h,'#070b0ae8',null,10);
 lines.forEach((ln,i)=>text(ln.trim(),960,y+30+i*29,22,'#e5ecdf',500,'center'));
}
window.seek=function(T){
 if(!ready)return;T=clamp(T,0,story.duration-.0001);
 let idx=story.scenes.findIndex(sc=>T>=sc.start&&T<sc.start+sc.duration);if(idx<0)idx=story.scenes.length-1;
 const sc=story.scenes[idx],t=T-sc.start;
 background(T,sc.accent);chrome(T,sc,idx);
 if(sc.id==='intro')intro(T,t,sc);else if(sc.id==='overview')overview(T,t,sc);else if(sc.id==='outro')outro(T,t,sc);else sceneView(T,t,sc,idx);
 captions(T,sc);
 if(t<.7&&idx>0){ctx.save();ctx.globalAlpha=(1-clamp(t/.7))*.22;for(let i=0;i<26;i++){const a=i/26*TAU,r=480+t*850;line(960+Math.cos(a)*r,540+Math.sin(a)*r,960+Math.cos(a)*(r+140),540+Math.sin(a)*(r+140),sc.accent,1.5);}ctx.restore();}
 // Black/acid diagonal shutter between chapters; readable frames hold most of the scene.
 if(t<.42&&idx>0){const p=1-ease(t/.42);ctx.save();ctx.transform(1,0,-.24,1,0,0);ctx.fillStyle=C.bg;ctx.fillRect(-500+(1-p)*2600,0,2500*p,1080);ctx.fillStyle=sc.accent;ctx.fillRect(-500+(1-p)*2600+2500*p,0,7,1080);ctx.restore();}
 // Soft final fade, leaving the creator credit readable for several seconds.
 if(T>(story.duration-0.7)){ctx.fillStyle=`rgba(7,11,10,${smooth((T-(story.duration-0.7))/.7)})`;ctx.fillRect(0,0,W,H);}
};
window.initFilm=async function(data){story=data;await Promise.all(['600 57px "Space Grotesk"','700 136px "Space Grotesk"','500 22px "Inter"','600 22px "Inter"','700 22px "Inter"','500 14px "JetBrains Mono"','600 23px "JetBrains Mono"'].map(font=>document.fonts.load(font)));await Promise.all([...new Set(story.scenes.map(s=>s.image).filter(Boolean))].map(name=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[name]=img;resolve();};img.onerror=()=>reject(new Error('Missing image '+name));img.src='../../media/promo-assets/'+name+'.png';})));ready=true;window.seek(1);return true;};
if(!new URLSearchParams(location.search).has('render')){
 fetch('../../media/promo-audio/timeline.json').then(r=>r.json()).then(window.initFilm).then(()=>{
  const audio=document.getElementById('audio'),play=document.getElementById('play'),seek=document.getElementById('seek'),clock=document.getElementById('time'),sound=document.getElementById('sound');
  audio.muted=false;sound.textContent='Mute';
  play.onclick=()=>{if(audio.paused){audio.play();play.textContent='Pause';}else{audio.pause();play.textContent='Play film';}};
  seek.oninput=()=>{audio.currentTime=+seek.value;window.seek(+seek.value);};sound.onclick=()=>{audio.muted=!audio.muted;sound.textContent=audio.muted?'Sound on':'Mute';};
  const dM=Math.floor(story.duration/60),dS=String(Math.floor(story.duration%60)).padStart(2,'0');
  const tick=()=>{const t=audio.currentTime;window.seek(t);seek.value=t;clock.textContent=Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+' / '+dM+':'+dS;requestAnimationFrame(tick);};tick();
 });
}else document.body.classList.add('render');
