'use strict';
const $=id=>document.getElementById(id);
const film=$('introFilm'),stage=$('stage'),frame=$('frame'),now=$('now'),chapters=$('chapters'),enter=$('enter'),sound=$('sound');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let finished=false;

/* ---- fit the fixed 1280 x 720 stage into whatever window shows it (never scales up) ---- */
function fit(){const s=Math.min(1,innerWidth/1280,innerHeight/720);stage.style.transform='scale('+s.toFixed(4)+')'}
addEventListener('resize',fit);fit();

/* ---- leaving ---- */
const finish=()=>{if(finished)return;finished=true;film.pause();window.tjIntro?.finish()};
enter.addEventListener('click',finish);
film.addEventListener('ended',finish);
film.addEventListener('error',finish);

/* ---- sound ---- */
const setSound=on=>{film.muted=!on;$('soundLbl').textContent=on?'Sound on':'Sound off';sound.setAttribute('aria-pressed',String(on));if(film.paused&&!finished)film.play().catch(finish)};
sound.addEventListener('click',()=>setSound(film.muted));

/* ---- play / pause by clicking the film ---- */
const pf=$('playflash'),pfIcon=$('pfIcon');
function flashIcon(paused){
  pfIcon.className=paused?'pause':'';pf.classList.remove('show');void pf.offsetWidth;pf.classList.add('show');
}
frame.addEventListener('click',()=>{if(film.paused){film.play().catch(()=>{});flashIcon(false)}else{film.pause();flashIcon(true)}});

/* ---- chapters (the film's six scenes) ---- */
const AMB_Y=0,AMB_H=1;   // the film is already cropped to its content area
const CH=[
  {from:0,  n:'01',s:'COMMAND CENTER',c:'#3b82f6',k:'#ffffff',t:'Your command center',d:'P&L, equity curve, calendar and a year-long heatmap, all in one view.'},
  {from:7,  n:'02',s:'TRADE LOGGING', c:'#22c55e',k:'#04210f',t:'Trade logging',d:'Add trades by hand or let MetaTrader 5 sync them. Every entry, exit and note in one place.'},
  {from:10, n:'03',s:'DAILY JOURNAL',c:'#a78bfa',k:'#1c1036',t:'Daily journal',d:'Replay each trade, write the lesson and attach your chart screenshots.'},
  {from:13, n:'04',s:'ANALYTICS',    c:'#22d3ee',k:'#032a33',t:'Analytics',d:'Performance, Edge, Behavior and Progress show what really makes you money.'},
  {from:18, n:'05',s:'METATRADER 5', c:'#f59e0b',k:'#2b1700',t:'MetaTrader 5',d:'One-click auto-connect finds every broker account on this PC and syncs it live.'},
  {from:21.5,n:'06',s:'YOUR STORY',  c:'#e8be6b',k:'#211804',t:'Your story',d:'Your trades. Your process. Your story. Everything stays private on this PC.'}
];
const TOTAL=()=>Number.isFinite(film.duration)&&film.duration>0?film.duration:24;
const segs=[];let current=-1;
function build(){
  chapters.textContent='';segs.length=0;
  CH.forEach((c,i)=>{
    const end=i<CH.length-1?CH[i+1].from:TOTAL(),b=document.createElement('button');
    b.type='button';b.className='seg';b.setAttribute('role','tab');b.setAttribute('aria-label','Chapter '+c.n+': '+c.t);b.style.setProperty('--c',c.c);
    b.innerHTML='<b></b><span class="bar"><i></i></span>';b.firstChild.textContent=c.n+'  '+c.s;
    b.addEventListener('click',e=>{e.stopPropagation();seek(i)});
    chapters.appendChild(b);segs.push({el:b,fill:b.querySelector('i'),from:c.from,end});
  });
}
function show(i){
  const c=CH[i];$('chNum').textContent=c.n;$('chTitle').textContent=c.t;$('chText').textContent=c.d;
  stage.style.setProperty('--accent',c.c);stage.style.setProperty('--ink',c.k);
  if(!reduced.matches){now.classList.remove('swap');void now.offsetWidth;now.classList.add('swap')}
}
function seek(i){film.currentTime=CH[i].from+.05;if(film.paused&&!finished)film.play().catch(()=>{})}
film.addEventListener('loadedmetadata',()=>{build();current=-1;tick()});
build();show(0);

/* ---- the film draws its old notebook icon in its title and ending scenes: lay the real logo over it then.
   Numbers are the icon's box in the film's original 1280 x 720 frame (the shown part starts at y 64 and is 560 high). ---- */
const FIX=[{a:.1,b:2.95,x:586,y:95,w:108,h:109},{a:21.7,b:1e9,x:587,y:105,w:104,h:101}];
const fixEl=$('fixLogo');let fixAt=-1;
function fixLogo(t){
  const i=FIX.findIndex(f=>t>=f.a&&t<f.b);if(i===fixAt)return;fixAt=i;
  if(i<0){fixEl.classList.remove('on');return}
  const f=FIX[i];
  fixEl.style.left=(f.x/12.8)+'%';fixEl.style.top=((f.y-64)/5.6)+'%';fixEl.style.width=(f.w/12.8)+'%';fixEl.style.height=(f.h/5.6)+'%';
  fixEl.classList.add('on');
}

/* ---- per-frame update: only transforms and one SVG stroke change each frame, so it can follow a 120 / 165 Hz display ---- */
const arc=$('prArc'),C=125.66,ringArc=$('ringArc'),actx=$('ambi').getContext('2d');
let lastAmbi=0;
function setChapter(idx){
  current=idx;show(idx);
  segs.forEach((s,i)=>{s.el.classList.toggle('on',i===idx);s.el.classList.toggle('done',i<idx);s.fill.style.transform='scaleX('+(i<idx?1:0)+')'});
}
function tick(now){
  const t=film.currentTime||0,total=TOTAL();
  fixLogo(t);
  let idx=0;for(let i=0;i<CH.length;i++)if(t>=CH[i].from)idx=i;
  if(idx!==current)setChapter(idx);
  const s=segs[idx];
  if(s){const p=Math.max(0,Math.min(1,(t-s.from)/(s.end-s.from)));s.fill.style.transform='scaleX('+p.toFixed(4)+')';arc.style.strokeDashoffset=(C*(1-p)).toFixed(2)}
  ringArc.style.strokeDashoffset=(1-Math.min(1,t/total)).toFixed(4);
  if(film.videoWidth&&!reduced.matches&&(now||performance.now())-lastAmbi>33){      // the glow only needs ~30 Hz
    lastAmbi=now||performance.now();
    try{actx.drawImage(film,0,film.videoHeight*AMB_Y,film.videoWidth,film.videoHeight*AMB_H,0,0,160,70)}catch(e){/* frame not ready */}
  }
}
(function loop(now){if(finished)return;tick(now);requestAnimationFrame(loop)})(performance.now());

/* ---- clock ---- */
const clock=$('clock');
const tock=()=>{const d=new Date();clock.textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
tock();setInterval(tock,10000);

/* ---- keyboard ---- */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'||(e.key==='Enter'&&e.target!==sound&&!e.target.classList.contains('seg'))){e.preventDefault();finish();return}
  if(e.key===' '&&e.target!==sound&&e.target!==enter){e.preventDefault();frame.click();return}
  if(e.key==='ArrowRight'){e.preventDefault();seek(Math.min(CH.length-1,current+1))}
  else if(e.key==='ArrowLeft'){e.preventDefault();seek(Math.max(0,current-1))}
  else if(e.key==='m'||e.key==='M')setSound(film.muted);
});

/* ---- drifting dust behind everything ---- */
(function dust(){
  if(reduced.matches)return;
  const cv=$('dust'),x=cv.getContext('2d'),W=1280,H=720;
  const P=Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,r:.5+Math.random()*1.3,v:4+Math.random()*10,p:Math.random()*6.28}));
  let last=performance.now();
  (function f(t){
    if(finished)return;const dt=Math.min(.05,(t-last)/1000);last=t;x.clearRect(0,0,W,H);
    for(const d of P){d.y-=d.v*dt;d.x+=Math.sin(t/2000+d.p)*5*dt;if(d.y<-4){d.y=H+4;d.x=Math.random()*W}
      x.fillStyle='rgba(180,195,255,'+(.08+.2*Math.abs(Math.sin(t/1500+d.p))).toFixed(3)+')';x.beginPath();x.arc(d.x,d.y,d.r,0,6.283);x.fill()}
    requestAnimationFrame(f);
  })(last);
})();

/* ---- start / fallbacks ---- */
if(reduced.matches){film.pause();$('message').textContent='Reduced motion is enabled. Press Enter to open your journal.';setTimeout(finish,1800)}else film.play().catch(finish);
setTimeout(finish,27000);
