'use strict';

P.crown='<path d="m2 5 5 4 5-6 5 6 5-4-3 13H5L2 5Z"/><path d="M5 21h14"/>';
P.globe='<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z"/>';
P.mail='<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>';
P.alert='<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4M12 17h.01"/>';
P.pencil='<path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/><path d="m14 5 5 5"/>';
P.key='<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>';
P.eye='<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
P.camera='<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3.5"/>';
P.userplus='<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>';
P.logout='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>';
$$('i[data-ic="crown"]').forEach(el=>{el.innerHTML=ic('crown',+el.dataset.s||16)});

const BRAND_SVGS={
 google:`<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/><path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"/></svg>`,
 github:`<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.92.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.38-3.88-1.38-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>`,
 windows:`<svg width="16" height="16" viewBox="0 0 24 24" fill="#38bdf8" aria-hidden="true"><path d="M2 3.5 11 2v9.2H2V3.5zm10.2-1.6L22 0.5v10.7h-9.8V1.9zM2 12.6h9v9.2L2 20.3v-7.7zm10.2 0H22v10.9l-9.8-1.4v-9.5z"/></svg>`
};

const SETTINGS_SECTIONS=[
 ['profile','Profile','Your name, photo & details','user'],
 ['connect','Connected accounts','Google, GitHub & this PC','link'],
 ['login','Sign-in & people','Password, sessions & access','key'],
 ['account','Account','Balance, goals & appearance','wallet'],
 ['trading','Trading','Logging defaults & risk plan','scale'],
 ['alerts','Alerts','Notifications & reminders','bell'],
 ['subscription','Membership','Your KING edition','crown'],
 ['security','Privacy & data','Local storage & backups','shield'],
 ['danger','Danger Zone','Reset local journal data','alert']
];
const PROFILE_DEFAULTS={firstName:'',lastName:'',username:'',email:'',phone:'',country:'',location:'',bio:'',photo:'',role:'KING Member',linked:{}};
const PREFERENCE_DEFAULTS={theme:'dark',range:'30',collapsed:false,density:'comfortable',reducedMotion:false,maskBalances:false,accountName:'Main Account',monthlyGoal:0};
const TRADING_DEFAULTS={riskPercent:1,dailyLoss:0,maxTrades:0,quantity:1,fees:0,strategy:'',market:'Forex'};
const ALERT_DEFAULTS={desktop:false,dailyReminder:false,tradeMessages:true,reminderTime:'20:00',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Colombo',lastReminderDay:''};
S.profile={...PROFILE_DEFAULTS,...S.profile};
S.preferences={...PREFERENCE_DEFAULTS,...S.preferences};
S.trading={...TRADING_DEFAULTS,...S.trading};
S.alerts={...ALERT_DEFAULTS,...S.alerts};
let settingsTab='profile',profileEditing=false,settingsDirty=false,settingsRendered='';

/* ================= PROFILE STATE (the signed-in person; the server is the source of truth) ================= */
const ME=()=>window.TJ_AUTH&&window.TJ_AUTH.user||{};
const PF={editing:null,error:'',busy:false,lookup:null,people:null,google:null,flow:null,msg:{}};
const IDENTITY_KEYS=['firstName','lastName','username','email','phone','country','location','bio','photo','role'];

function profileFullName(){return [S.profile.firstName,S.profile.lastName].filter(Boolean).join(' ')||S.profile.username||'Your profile'}
function avatarMarkup(){
 const initials=[S.profile.firstName,S.profile.lastName].map(x=>String(x||'').slice(0,1)).join('').toUpperCase()||String(S.profile.username||'TJ').slice(0,2).toUpperCase();
 const photo=/^data:image\/(png|jpeg|webp);base64,/.test(S.profile.photo||'')?`<img src="${esc(S.profile.photo)}" alt="${esc(profileFullName())}'s profile photo">`:`<span aria-hidden="true">${esc(initials)}</span>`;
 return photo+`<span class="king-crown" title="KING member" aria-label="KING member">${ic('crown',15)}</span>`;
}
function userAvatarMarkup(u,sizeClass=''){
 const initials=[u.firstName,u.lastName].map(x=>String(x||'').slice(0,1)).join('').toUpperCase()||String(u.username||'TJ').slice(0,2).toUpperCase();
 const photo=/^data:image\/(png|jpeg|webp);base64,/.test(u.photo||'')?`<img src="${esc(u.photo)}" alt="">`:`<span aria-hidden="true">${esc(initials)}</span>`;
 return `<span class="king-avatar ${sizeClass}">${photo}${u.admin?`<span class="king-crown" title="Owner">${ic('crown',14)}</span>`:''}</span>`;
}
function updateProfileUI(){
 const avatar=avatarMarkup();
 $$('[data-avatar]').forEach(el=>{if(el.innerHTML!==avatar)el.innerHTML=avatar});
 $$('[data-profile-name]').forEach(el=>el.textContent=profileFullName());
 $$('[data-profile-first]').forEach(el=>el.textContent=S.profile.firstName||S.profile.username||'Your profile');
 const gName=$('#greetName');if(gName)gName.textContent=S.profile.firstName||'Trader';
 const sideEm=$('#profile .em');
 if(sideEm)sideEm.innerHTML=`<span class="king-text">${esc(S.profile.role||'KING')}</span>`;
 document.body.classList.toggle('compact',S.preferences.density==='compact');
 document.body.classList.toggle('mask-balances',!!S.preferences.maskBalances);
 document.documentElement.classList.toggle('reduce-motion',!!S.preferences.reducedMotion);
}

/* Per-person journal data is saved to the local server under the signed-in account. */
let stateTimer=null;
function pushUserState(){
 const st={...S};delete st.profile;
 const body=JSON.stringify({state:st});
 return fetch('/api/auth/save-state',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:body.length<60000}).catch(()=>{});
}
window.syncUserStateToServer=function(){
 if(!window.TJ_USER_ID)return;
 clearTimeout(stateTimer);stateTimer=setTimeout(()=>{stateTimer=null;pushUserState()},400);
};
window.flushUserState=async function(){
 if(!window.TJ_USER_ID)return;
 clearTimeout(stateTimer);stateTimer=null;await pushUserState();
};
window.addEventListener('pagehide',()=>{if(stateTimer){clearTimeout(stateTimer);stateTimer=null;pushUserState()}});

async function authPost(path,body){
 const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});
 let j={};try{j=await r.json()}catch(e){}
 return {ok:r.ok,status:r.status,j};
}
function adoptUser(u){
 if(!u)return;
 window.TJ_AUTH.user=u;if(window.tjAuth)window.tjAuth.user=u;
 for(const k of IDENTITY_KEYS)S.profile[k]=u[k]||'';
 S.profile.linked=u.linked||{};
 save();updateProfileUI();
}
function openSettings(tab='profile'){
 settingsTab=SETTINGS_SECTIONS.some(s=>s[0]===tab)?tab:'profile';
 profileEditing=false;settingsDirty=false;PF.editing=null;PF.error='';closePops();go('settings');if(settingsTab==='login'||settingsTab==='connect')loadPeople();
}
function setPanelHeading(title,description){return `<div class="settings-panel-title"><div><h3>${title}</h3><p>${description}</p></div></div>`}
function settingsField(name,label,value,type='text',extra='',hint=''){
 return `<label class="set-field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}>${hint?`<small>${hint}</small>`:''}</label>`;
}
function settingsSelect(name,label,value,options,hint=''){
 return `<label class="set-field">${label}<select name="${name}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select>${hint?`<small>${hint}</small>`:''}</label>`;
}
function settingsToggle(group,key,label,description){return `<div class="set-row"><div><b>${label}</b><small>${description}</small></div><input class="set-switch" type="checkbox" data-setting-group="${group}" data-setting-key="${key}" aria-label="${label}" ${S[group][key]?'checked':''}></div>`}
function settingsFormActions(cancel=false,label='Save changes'){return `<div class="settings-form-actions">${cancel?'<button type="button" class="set-btn" data-settings-action="cancel-profile">Cancel</button>':''}<button class="set-btn primary" type="submit">${ic('check',13)}${esc(label)}</button></div>`}
function detailsRow(icon,label,value){return `<div class="detail-row"><span class="di">${ic(icon,13)}</span><span>${label}</span><b>${esc(value||'Not added')}</b></div>`}
function settingsMetric(label,value,note=''){return `<div class="set-metric"><small>${label}</small><b>${value}</b>${note?`<em>${note}</em>`:''}</div>`}
/* ================= SIDEBAR PROFILE: clicking it opens the Profile tab ================= */
window.openProfileMenu=function(){closePops();openSettings('profile')};
/* ================= PROFILE: every detail is edited right where it is shown ================= */
const PF_ROWS=[
 ['username','Username','user',{prefix:'@',max:30,ph:'your.username'}],
 ['email','Email','mail',{type:'email',max:150,ph:'name@example.com'}],
 ['phone','Phone','bell',{type:'tel',max:40,ph:'+94 …'}],
 ['country','Country','globe',{max:60,ph:'Country'}],
 ['location','City','globe',{max:80,ph:'City or region'}],
 ['role','Badge title','crown',{max:40,ph:'KING Member'}],
 ['bio','About you','pencil',{area:true,max:1000,ph:'Your trading journey, favourite markets, what you are working towards…'}]
];
function pfEditForm(field,html){
 return `<form class="pf-edit-form" data-pf-form="${field}">${html}<div class="pf-actions"><button class="set-btn primary" type="submit" ${PF.busy?'disabled':''}>${ic('check',12)}Save</button><button class="set-btn" type="button" data-settings-action="pf-cancel">Cancel</button></div>${PF.error?`<div class="pf-err" role="alert">${esc(PF.error)}</div>`:''}</form>`;
}
function pfNameBlock(){
 if(PF.editing==='name')return pfEditForm('name',`<div class="pf-name-in"><input name="firstName" value="${esc(S.profile.firstName)}" maxlength="50" placeholder="First name" aria-label="First name" required><input name="lastName" value="${esc(S.profile.lastName)}" maxlength="50" placeholder="Last name" aria-label="Last name"></div>`);
 return `<h3 class="pf-name"><span data-profile-name></span><button class="pf-pencil" data-settings-action="pf-edit" data-field="name" title="Change my name" aria-label="Change my name">${ic('pencil',14)}</button></h3>`;
}
function pfRow(key,label,icon,o){
 const v=S.profile[key]||'';
 if(PF.editing===key){
  const input=o.area?`<textarea name="${key}" maxlength="${o.max}" placeholder="${esc(o.ph||'')}" rows="4">${esc(v)}</textarea>`:`<input name="${key}" type="${o.type||'text'}" value="${esc(v)}" maxlength="${o.max}" placeholder="${esc(o.ph||'')}" ${key==='username'?'required':''}>`;
  return `<div class="pf-row editing"><span class="pf-l">${ic(icon,13)}${label}</span>${pfEditForm(key,input)}</div>`;
 }
 const shown=v?(o.prefix||'')+esc(v):'<i class="pf-empty">Not added</i>';
 return `<div class="pf-row"><span class="pf-l">${ic(icon,13)}${label}</span><button class="pf-v${o.area?' area':''}" data-settings-action="pf-edit" data-field="${key}" title="Click to edit">${shown}<span class="pf-pencil">${ic('pencil',12)}</span></button></div>`;
}
function profilePanel(){
 const p=S.profile,u=ME(),g=p.linked&&p.linked.google;
 const since=u.createdAt?new Date(u.createdAt).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}):'—';
 const last=u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'—';
 return setPanelHeading('Profile','Click any detail to change it. Press Enter to save, Esc to cancel.')+
 `<div class="set-card pf-hero">
   <div class="pf-avatar"><span class="king-avatar large" data-avatar></span>
    <button class="pf-cam" data-settings-action="photo" title="Change photo" aria-label="Change photo">${ic('camera',14)}</button></div>
   <div class="pf-id">
    ${pfNameBlock()}
    <div class="pf-badges"><span class="king-text">${esc(p.role||'KING')}</span>${u.admin?'<span class="auth-mini-badge">Owner</span>':''}${g?`<span class="auth-mini-badge google">${BRAND_SVGS.google}Google verified</span>`:''}</div>
    <div class="pf-photo-actions"><button class="set-btn" data-settings-action="photo">${ic('camera',12)}Change photo</button>${p.photo?`<button class="set-btn" data-settings-action="remove-photo">Remove photo</button>`:''}</div>
   </div>
  </div>
  <div class="set-card pf-details">${PF_ROWS.map(r=>pfRow(...r)).join('')}</div>
  <div class="set-card"><div class="detail-row"><span class="di">${ic('calendar',13)}</span><span>Member since</span><b>${esc(since)}</b></div><div class="detail-row"><span class="di">${ic('clock',13)}</span><span>Last sign-in</span><b>${esc(last)}</b></div><div class="detail-row"><span class="di">${ic('shield',13)}</span><span>Account type</span><b>${u.admin?'Owner of this PC':'Member'}</b></div></div>`;
}

/* ================= CONNECTED ACCOUNTS ================= */
function lookupPreview(){
 const l=PF.lookup;if(!l)return '';
 const pr=l.profile,full=[pr.firstName,pr.lastName].filter(Boolean).join(' ');
 return `<div class="lk-preview">${userAvatarMarkup({firstName:pr.firstName,lastName:pr.lastName,photo:pr.photo,username:pr.username},'small')}<div><b>${esc(full||pr.username)}</b><small>${esc([pr.username&&'@'+pr.username,pr.email,pr.location].filter(Boolean).join(' · '))}</small></div><div class="lk-actions"><button class="set-btn primary" data-settings-action="lookup-apply">Use this info</button><button class="set-btn" data-settings-action="lookup-discard">Discard</button></div></div><small class="lk-note">Applying replaces your name${pr.photo?', photo':''}${pr.bio?' and bio':''} with the details above. This is public information, not a verified login.</small>`;
}
function connectPanel(){
 const p=S.profile,u=ME(),L=p.linked||{},g=L.google,gh=L.github,win=L.windows;
 const cfg=PF.google,configured=cfg?cfg.configured:!!(window.TJ_AUTH&&window.TJ_AUTH.googleConfigured);
 let googleBody;
 if(g){
  googleBody=`<p class="cc-p">Signed in with <b>${esc(g.email)}</b>. You can use <b>Continue with Google</b> on the sign-in screen.</p><div class="cc-actions"><button class="set-btn" data-settings-action="google-link" data-import="1">${ic('refresh',12)}Re-import name &amp; photo</button><button class="set-btn danger" data-settings-action="unlink" data-provider="google">Disconnect</button></div>`;
 }else if(configured){
  googleBody=`<p class="cc-p">Sign in with Google once. Traders Journal then reads your <b>name, email and photo</b> from your Google account and uses them for your profile.</p><div class="cc-actions"><button class="set-btn primary" data-settings-action="google-link" data-import="1">${BRAND_SVGS.google}Connect Google account</button></div>`;
 }else if(u.admin){
  googleBody=`<p class="cc-p">Google needs a free “OAuth client” from your own Google account before it can confirm who is signing in. This is a one-time setup (about 3 minutes):</p>
   <ol class="cc-steps"><li>Open <b>Google Cloud Console → APIs &amp; Services → Credentials</b> and create an <b>OAuth client ID</b> of type <b>Desktop app</b> (or Web, with the redirect URI below).</li><li>If asked, set up the consent screen as <b>External</b> and add your own Google address as a test user.</li><li>Paste the Client ID and secret here.</li></ol>
   <form class="cc-form" data-settings-form="google-config"><label class="set-field">Client ID<input name="clientId" value="${esc(cfg?cfg.clientId:'')}" placeholder="1234567890-abc….apps.googleusercontent.com" required autocomplete="off" spellcheck="false"></label><label class="set-field">Client secret<input name="clientSecret" type="password" placeholder="GOCSPX-…" required autocomplete="off"></label><small class="lk-note">Redirect URI (if your client type asks for one): <code>${esc(cfg?cfg.redirectUri:location.origin+'/api/auth/google/callback')}</code></small>${PF.msg.google?`<div class="pf-err">${esc(PF.msg.google)}</div>`:''}<div class="cc-actions"><button class="set-btn primary" type="submit">${ic('check',12)}Save &amp; enable Google</button></div></form>`;
 }else{
  googleBody=`<p class="cc-p">Google sign-in has not been set up on this PC yet. Ask the owner to enable it in <b>Settings → Connected accounts</b>.</p>`;
 }
 const googleAdmin=(u.admin&&configured)?`<details class="cc-adv"><summary>Google settings (owner)</summary><div class="cc-actions"><button class="set-btn" data-settings-action="google-config-clear">Remove Google client…</button></div></details>`:'';
 const lk=PF.lookup;
 return setPanelHeading('Connected accounts','Link another account to pull in your details, or sign in faster.')+
 `<div class="cc-grid">
   <div class="set-card cc ${g?'on':''}"><div class="cc-top"><span class="cc-ic">${BRAND_SVGS.google}</span><div><b>Google</b><small>${g?'Verified by Google':'Verified sign-in'}</small></div><span class="cc-state">${g?'Connected':'Not connected'}</span></div>${googleBody}${googleAdmin}${PF.msg.googleFlow?`<div class="pf-err">${esc(PF.msg.googleFlow)}</div>`:''}</div>
   <div class="set-card cc ${gh?'on':''}"><div class="cc-top"><span class="cc-ic">${BRAND_SVGS.github}</span><div><b>GitHub</b><small>Public profile import</small></div><span class="cc-state">${gh?'Imported':'Not connected'}</span></div>
     <p class="cc-p">${gh?`Imported from <b>@${esc(gh.handle)}</b>.`:'Enter a GitHub username to import the public name, photo, location and bio.'}</p>
     <form class="cc-inline" data-settings-form="lookup-github"><input name="query" value="${esc(gh?gh.handle:'')}" placeholder="GitHub username" aria-label="GitHub username" autocomplete="off" spellcheck="false"><button class="set-btn" type="submit">Look up</button>${gh?`<button class="set-btn danger" type="button" data-settings-action="unlink" data-provider="github">Remove</button>`:''}</form>
     ${lk&&lk.provider==='github'?lookupPreview():''}${PF.msg.github?`<div class="pf-err">${esc(PF.msg.github)}</div>`:''}</div>
   <div class="set-card cc ${win?'on':''}"><div class="cc-top"><span class="cc-ic">${BRAND_SVGS.windows}</span><div><b>This Windows PC</b><small>Local user &amp; Git name</small></div><span class="cc-state">${win?'Imported':'Not connected'}</span></div>
     <p class="cc-p">Read your name and email from this computer's Windows account and Git settings.</p>
     <div class="cc-actions"><button class="set-btn" data-settings-action="lookup-windows">Read from this PC</button>${win?`<button class="set-btn danger" data-settings-action="unlink" data-provider="windows">Remove</button>`:''}</div>
     ${lk&&lk.provider==='windows'?lookupPreview():''}${PF.msg.windows?`<div class="pf-err">${esc(PF.msg.windows)}</div>`:''}</div>
  </div>
  <div class="set-info">${ic('shield',16)}<div>Only Google sign-in proves who you are. GitHub and Windows import copy public details to save typing; they can't be used to sign in.</div></div>`;
}

/* ================= SIGN-IN & PEOPLE ================= */
function loginPanel(){
 const u=ME();
 let html=setPanelHeading('Sign-in & people','Your password, this session, and who else can use this PC.')+
 `<div class="settings-columns" style="margin-bottom:18px">
   <form class="set-card settings-form" data-settings-form="password" style="margin-bottom:0;align-content:start" autocomplete="off">
    <div class="full"><h4 style="margin-bottom:6px">${ic('key',15)}Change password</h4><p>Use at least 8 characters. Other devices signed in as you are signed out.</p></div>
    <div class="full">${settingsField('currentPassword','Current password','','password','required autocomplete="current-password"')}</div>
    ${settingsField('newPassword','New password','','password','required minlength="8" autocomplete="new-password"')}
    ${settingsField('newPassword2','Repeat new password','','password','required minlength="8" autocomplete="new-password"')}
    ${PF.msg.password?`<div class="full pf-err ${PF.msg.passwordOk?'ok':''}" role="alert">${esc(PF.msg.password)}</div>`:''}
    ${settingsFormActions(false,'Update password')}
   </form>
   <div class="set-card" style="margin-bottom:0;align-content:start">
    <h4 style="margin-bottom:6px">${ic('lock',15)}This session</h4>
    <p>Signed in as <b>${esc(profileFullName())}</b> (@${esc(S.profile.username)}).</p>
    <div class="set-inline" style="margin-top:16px"><button class="set-btn primary" data-settings-action="logout">${ic('logout',13)}Sign out</button></div>
   </div>
  </div>`;
 html+=autoLoginCard();
 if(u.admin)html+=peopleCard();
 html+=`<div class="set-card danger-card"><h4>${ic('alert',18)}Delete my account</h4><p>${u.admin?'Removes your account and everything saved under it. The owner account can only be deleted when no one else is left.':'Removes your account, profile, journal and connections from this PC.'} This can't be undone.</p><div class="danger-action"><div><b>Password required</b><small>You'll confirm with your password.</small></div><button class="set-btn danger" data-settings-action="delete-me">${ic('trash',13)}Delete my account</button></div></div>`;
 return html;
}
function autoLoginCard(){
 const a=(window.TJ_AUTH&&window.TJ_AUTH.autoLogin)||{};
 const desktop=!!(window.tjDesktop&&a.available);
 const win=esc(a.windowsUser||'this Windows account');
 const body=desktop
  ?`<p class="cc-p">When you open Traders Journal on <b>${win}</b>, the app recognises this Windows account and signs you in. No username or password to type. ${a.enabled?'<b>This is on for you.</b> ':''}Anyone who can sign in to Windows as <b>${win}</b> can then open your journal, so only turn it on for your own Windows account.</p><div class="cc-actions"><button class="set-btn ${a.enabled?'':'primary'}" data-settings-action="auto-toggle" data-on="${a.enabled?0:1}">${ic('zap',12)}${a.enabled?'Turn off automatic sign-in':'Turn on automatic sign-in'}</button></div>`
  :`<p class="cc-p">Automatic sign-in works in the Traders Journal desktop app. Open the desktop app to turn it on. You can also choose <b>Keep me signed in</b> on the sign-in screen.</p>`;
 return `<div class="set-card"><h4>${ic('zap',15)}Automatic sign-in</h4>${body}<div class="set-row" style="margin-top:8px"><div><b>Other places you are signed in</b><small>${a.otherSignIns?a.otherSignIns+' other sign-in'+(a.otherSignIns>1?'s':'')+' (browsers or earlier app sessions) can open your journal without a password.':'None. Only this window is signed in.'}</small></div>${a.otherSignIns?`<button class="set-btn" data-settings-action="sign-out-others">Sign out the others</button>`:''}</div></div>`;
}
function peopleCard(){
 const list=PF.people;
 const rows=!list?'<p class="cc-p">Loading…</p>':list.people.map(x=>{
  const full=[x.firstName,x.lastName].filter(Boolean).join(' ')||x.username,me=x.id===ME().id;
  return `<div class="person-row">${userAvatarMarkup(x,'small')}<div class="p-meta"><b>${esc(full)}${me?' <em>(you)</em>':''}</b><small>@${esc(x.username)}${x.email?' · '+esc(x.email):''} · ${x.lastLoginAt?'last in '+esc(new Date(x.lastLoginAt).toLocaleDateString()):'never signed in'}</small></div><span class="auth-mini-badge">${x.admin?'Owner':'Member'}</span>${me?'':`<button class="set-btn" data-settings-action="reset-pw" data-id="${esc(x.id)}">Reset password</button><button class="set-btn danger" data-settings-action="remove-person" data-id="${esc(x.id)}">Remove</button>`}</div>`;
 }).join('');
 return `<div class="set-card"><div class="set-card-header" style="margin-bottom:12px"><h4 style="margin:0">${ic('users',15)}People on this PC${list?` (${list.people.length})`:''}</h4><button class="set-btn primary" data-settings-action="add-person">${ic('plus',12)}Add person</button></div>
  <p>Everyone has their own login, profile, settings, journal and MetaTrader connections. Only the owner sees this section.</p>
  <div class="people-list">${rows}</div>
  <div class="set-row" style="margin-top:6px"><div><b>Let people create their own account</b><small>Shows “Create an account” on the sign-in screen. Turn off to add people only from here.</small></div><input class="set-switch" type="checkbox" data-settings-action="toggle-signups" aria-label="Allow sign-ups" ${list&&list.allowSignups?'checked':''}></div></div>`;
}
async function loadPeople(){
 if(!ME().admin)return;
 try{const r=await fetch('/api/auth/people');const j=await r.json();if(r.ok){PF.people=j;PF.google=j.google;if(settingsTab==='login'||settingsTab==='connect'){settingsDirty=false;renderSettings()}}}catch(e){}
}

/* Small modal with its own fields (used for owner actions that need the owner's password). */
function askModal({title,body,fields,cta,danger,onSubmit}){
 $('#settingsConfirm')?.remove();
 const ov=document.createElement('div');ov.id='settingsConfirm';ov.className='overlay open';
 ov.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="askTitle" style="max-width:440px"><header><h3 id="askTitle">${esc(title)}</h3><button class="icon-btn" data-cancel-confirm aria-label="Close">${ic('x',16)}</button></header><form class="set-confirm-body"><p>${body||''}</p>${fields.map(f=>`<label class="set-field">${esc(f.label)}<input name="${f.name}" type="${f.type||'text'}" ${f.req===false?'':'required'} ${f.min?`minlength="${f.min}"`:''} autocomplete="${f.ac||'off'}" spellcheck="false" ${f.ph?`placeholder="${esc(f.ph)}"`:''}></label>`).join('')}<div class="pf-err" id="askErr" style="display:none" role="alert"></div><div class="set-inline" style="justify-content:flex-end"><button class="set-btn" type="button" data-cancel-confirm>Cancel</button><button class="set-btn ${danger?'danger':'primary'}" type="submit">${esc(cta)}</button></div></form></div>`;
 document.body.appendChild(ov);const close=()=>ov.remove();
 $$('[data-cancel-confirm]',ov).forEach(b=>b.onclick=close);ov.onmousedown=e=>{if(e.target===ov)close()};
 const form=$('form',ov);
 form.onsubmit=async e=>{
  e.preventDefault();const err=$('#askErr',ov),btn=$('button[type=submit]',ov);err.style.display='none';btn.disabled=true;
  try{const msg=await onSubmit(Object.fromEntries(new FormData(form)));if(msg)throw new Error(msg);close()}
  catch(x){err.textContent=x.message||'Something went wrong.';err.style.display='block';btn.disabled=false}
 };
 setTimeout(()=>form.querySelector('input')?.focus(),30);
}
function accountPanel(){
 const p=S.preferences;const monthStart=new Date(new Date().getFullYear(),new Date().getMonth(),1);
 const monthNet=sourceTrades().filter(t=>!t.open).filter(t=>new Date(t.date)>=monthStart).reduce((n,t)=>n+t.pnl,0);
 const goal=+p.monthlyGoal||0,progress=goal>0?Math.min(100,Math.max(0,monthNet/goal*100)):0;
 return setPanelHeading('Account & appearance','Shape your account view, personal goals, and everyday experience.')+
 `<div class="set-metrics">${settingsMetric('Starting balance',money(startEq()),'Your baseline')}${settingsMetric('This month',money(monthNet,{sign:true}),'Completed trades')}${settingsMetric('Monthly goal',goal?money(goal):'Not set',goal?progress.toFixed(0)+'% reached':'Set your own target')}</div>`+
 `<form class="set-card settings-form" data-settings-form="account">${settingsField('accountName','Default manual account',p.accountName,'text','required maxlength="60"')}${settingsField('startEquity','Starting account balance',S.startEquity,'number','required min="0" step="0.01"')}${settingsSelect('currency','Reporting currency',S.currency,[['$','USD · US Dollar'],['€','EUR · Euro'],['£','GBP · British Pound'],['Rs ','LKR · Sri Lankan Rupee'],['¥','JPY · Japanese Yen']], 'Changes labels only. MT5 values remain in their broker currency; currencies are not converted.')}${settingsField('monthlyGoal','Monthly profit goal',p.monthlyGoal,'number','min="0" step="0.01"')}${settingsSelect('theme','Theme',p.theme,[['dark','Midnight · Dark'],['light','Daylight · Light']])}${settingsSelect('range','Opening dashboard range',p.range,RANGES)}${settingsSelect('density','Display density',p.density,[['comfortable','Comfortable'],['compact','Compact']])}${settingsSelect('collapsed','Opening sidebar',String(p.collapsed),[['true','Collapsed · more room for charts'],['false','Expanded · show navigation']])}${settingsFormActions()}</form>`+
 `<div class="set-card"><h4>${ic('settings',15)}Comfort & display</h4>${settingsToggle('preferences','reducedMotion','Reduce motion','Use calm transitions and keep dashboard animations still.')}<div class="set-row"><div><b>Interface zoom</b><small>Your zoom is remembered when the desktop app reopens.</small></div><div class="set-inline"><button class="set-btn" data-settings-action="zoom-out" aria-label="Zoom out">−</button><span class="mono" id="settingsZoom">${Math.round((window.tjDesktop?.getZoom?.()||1)*100)}%</span><button class="set-btn" data-settings-action="zoom-in" aria-label="Zoom in">+</button><button class="set-btn" data-settings-action="zoom-reset">Reset</button></div></div></div>`+
 (goal?`<div class="set-card"><div class="set-card-header"><h4 style="margin:0">Your monthly goal</h4><span class="king-text">${progress.toFixed(0)}%</span></div><div class="goal-track"><i style="width:${progress}%"></i></div><p style="margin-top:10px">${money(monthNet,{sign:true})} of ${money(goal)} · A personal journal target.</p></div>`:'');
}

function tradingPanel(){
 const t=S.trading,balance=startEq()+sourceTrades().filter(x=>!x.open).reduce((n,x)=>n+x.pnl,0);
 return setPanelHeading('Trading preferences','Build a consistent logging routine and keep your own risk plan in view.')+
 `<div class="set-metrics">${settingsMetric('Planned risk',t.riskPercent+'%','Per trade')}${settingsMetric('Risk amount',money(Math.max(0,balance)*t.riskPercent/100),'Based on journal equity')}${settingsMetric('Daily trade limit',+t.maxTrades||'No limit','Personal reminder')}</div>`+
 `<form class="set-card settings-form" data-settings-form="trading">${settingsSelect('market','Primary market',t.market,[['Forex','Forex'],['Indices','Indices'],['Commodities','Commodities'],['Stocks','Stocks'],['Crypto','Crypto'],['Mixed','Mixed markets']])}${settingsField('strategy','Default strategy tag',t.strategy,'text','maxlength="80"','Pre-filled when you log a new manual trade.')}${settingsField('quantity','Default quantity',t.quantity,'number','required min="0.00000001" step="any"')}${settingsField('fees','Default fees / commission',t.fees,'number','required min="0" step="0.01"')}${settingsField('riskPercent','Planned risk per trade (%)',t.riskPercent,'number','required min="0.01" max="100" step="0.01"')}${settingsField('dailyLoss','Daily loss reminder threshold',t.dailyLoss,'number','min="0" step="0.01"','0 disables this personal reminder.')}${settingsField('maxTrades','Daily trade count reminder',t.maxTrades,'number','min="0" max="10000" step="1"','0 disables the trade count reminder.')}${settingsFormActions()}</form><div class="set-info">${ic('shield',16)}<div>These preferences apply to your journal only. They never place trades, change MT5 orders, or enforce broker limits. Manual P&L uses price difference × quantity minus fees.</div></div>`;
}

function alertsPanel(){
 const zones=[...new Set([S.alerts.timezone,'Asia/Colombo','UTC','Europe/London','America/New_York','Asia/Dubai','Asia/Singapore','Australia/Sydney'])];
 return setPanelHeading('Alerts & reminders','A little structure for your trading day, delivered locally.')+
 `<div class="set-card"><h4>${ic('bell',15)}Notifications</h4>${settingsToggle('alerts','desktop','Desktop notifications','Show local journal reminders through this desktop app.')}${settingsToggle('alerts','dailyReminder','Daily journal reminder','A daily nudge to review your trades and write a few notes.')}${settingsToggle('alerts','tradeMessages','Trade logged messages','Show a message when manual or synced trades are added.')}<div class="set-row"><div><b>Your reminder schedule</b><small>Uses the selected timezone. The app must stay running, including in the tray.</small></div><div class="set-inline"><input id="reminderTime" aria-label="Reminder time" type="time" value="${esc(S.alerts.reminderTime)}"><select id="reminderTimezone" aria-label="Reminder timezone">${zones.map(z=>`<option ${z===S.alerts.timezone?'selected':''}>${esc(z)}</option>`).join('')}</select></div></div><button class="set-btn" data-settings-action="test-notice">${ic('bell',13)}Send test notification</button></div><div class="set-info gold">${ic('lock',15)}<div>No email campaigns, push server, or cloud account. Reminders run on this PC. Dashboard dates continue to use your PC's timezone.</div></div>`;
}

function membershipPanel(){
 return setPanelHeading('KING membership','Your personal premium workspace. Everything here is yours to use.')+
 `<div class="set-card king-membership"><span class="king-watermark">${ic('crown',180)}</span><div class="royal-mark">${ic('crown',31)}</div><span class="king-text">THE LOCAL COLLECTION</span><h3>KING EDITION</h3><p>Your journal. Your edge. Your rules.<br>A complete local workspace with no subscriptions or usage limits.</p><div class="membership-price">Included <small>· Local edition · No recurring payment</small></div><div class="king-features">${['Unlimited manual trades & journal notes','Full dashboard performance insights','Read-only local MT5 connection','CSV & MT5 report imports','Journal backups & CSV exports','Personal profile & crown identity'].map(t=>`<div>${ic('check',14)}${t}</div>`).join('')}</div></div><div class="set-card"><h4>${ic('crown',16)}A crown wherever you appear</h4><div class="set-inline" style="gap:18px;margin:20px 0"><span class="king-avatar large" data-avatar></span><span class="king-avatar" data-avatar></span><span class="king-avatar small" data-avatar></span><p>Your profile badge follows you through the sidebar,<br>top bar, profile menu and Settings.</p></div></div>`;
}

function privacyPanel(){
 const size=(new Blob([JSON.stringify(S)]).size/1024).toFixed(1);
 return setPanelHeading('Privacy & data','Know what is stored, keep your own backups, and stay in control.')+
 `<div class="set-metrics">${settingsMetric('Manual trades',S.live.length)}${settingsMetric('Journal days',Object.keys(S.journal).length)}${settingsMetric('Local journal size',size+' KB')}</div><div class="set-card"><h4>${ic('shield',15)}Private by design</h4>${detailsRow('lock','Data destination','This PC only')}${detailsRow('link','MT5 receiver',location.origin)}${detailsRow('crown','Membership','KING · Local edition')}${settingsToggle('preferences','maskBalances','Hide dashboard balances','Blur headline balances and trade P&L while sharing your screen.')}<div class="set-info">${ic('shield',16)}<div>All user accounts and password hashes (`+'<code>scrypt</code>'+`) are stored locally on this PC inside your data directory.</div></div></div><div class="set-card"><h4>${ic('download',15)}Backups & portability</h4><p>Download a JSON backup of your manual trades, notes, profile and preferences, plus a reference snapshot of synced trades. Restoring a backup replaces the local journal and preferences; MT5 connections and their live history are kept separately.</p><div class="set-inline" style="margin-top:18px"><button class="set-btn primary" data-settings-action="backup">${ic('download',13)}Download backup</button><button class="set-btn" data-settings-action="restore">${ic('refresh',13)}Restore journal</button><button class="set-btn" data-settings-action="csv">${ic('table',13)}Export trades CSV</button></div>${S.lastBackup?`<p style="margin-top:13px">Last backup download requested: ${esc(new Date(S.lastBackup).toLocaleString())}</p>`:''}</div><div class="set-card"><h4>${ic('folder',15)}Local storage</h4><p>Synced trades are stored in the desktop app's data folder. Manual trades, notes, profile and preferences are stored in this app's local storage and synced to db.json.</p><button class="set-btn" style="margin-top:16px" data-settings-action="open-data">${ic('folder',13)}Open synced data folder</button></div>`;
}

function dangerPanel(){
 return setPanelHeading('Danger Zone','A fresh start should always be your decision.')+
 `<div class="set-card danger-card"><h4>${ic('alert',18)}Clear local journal</h4><p>Remove ${S.live.length} manual/imported trades and ${Object.keys(S.journal).length} journal days from this app. Synced MT5 trades, connections and your profile remain. This takes effect immediately; download a backup first if you want to keep a copy.</p><div class="danger-action"><div><b>Typed confirmation required</b><small>You will need to type CLEAR before anything is removed.</small></div><button class="set-btn danger" data-settings-action="clear-journal">${ic('trash',13)}Clear local journal</button></div></div><div class="set-card"><h4>${ic('settings',16)}Reset workspace preferences</h4><p>Restore the dark dashboard, collapsed sidebar, default trading preferences and reminder settings. Trades, notes, balance, currency and profile are kept.</p><button class="set-btn" style="margin-top:17px" data-settings-action="reset-preferences">Reset preferences</button></div><div class="set-info">${ic('shield',16)}<div>There is no remote account to delete. To remove a terminal connection and its synced trades, use the Disconnect action on the Connections page.</div></div>`;
}

/* ---- animation helpers (every motion is skipped when "Reduce motion" is on) ---- */
const calm=()=>document.documentElement.classList.contains('reduce-motion')||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
let pendingFlash=null,pendingFlashAt=0;
function flashSaved(selector){pendingFlash=selector;pendingFlashAt=Date.now()}
function flashNow(el){if(!el||calm())return;el.classList.remove('st-saved');void el.offsetWidth;el.classList.add('st-saved');setTimeout(()=>el.classList.remove('st-saved'),1500)}
function settingsCount(el){
 const m=el.textContent.match(/-?\d[\d,]*\.?\d*/);if(!m||calm())return;
 const txt=m[0],to=parseFloat(txt.replace(/,/g,''));if(!isFinite(to)||to===0)return;
 const dec=(txt.split('.')[1]||'').length,group=txt.includes(','),pre=el.textContent.slice(0,m.index),post=el.textContent.slice(m.index+txt.length),final=el.textContent;
 const fmt=v=>pre+v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec,useGrouping:group})+post;
 const t0=performance.now(),dur=900;
 const step=t=>{const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,4);el.textContent=p<1?fmt(to*e):final;if(p<1)requestAnimationFrame(step)};
 el.textContent=fmt(0);requestAnimationFrame(step);
}
function animatePanel(root,dir){
 if(calm())return;
 root.style.setProperty('--sdir',dir<0?'-1':'1');root._enteredAt=Date.now();root._dir=dir;
 const top=[...root.children];top.forEach((el,i)=>{el.classList.add('st-item');el.style.setProperty('--si',Math.min(i,9))});
 const kids=root.querySelectorAll('.set-metric,.pf-row,.set-row,.person-row,.cc-grid>.cc,.king-features>div,.detail-row,.settings-form>.set-field');
 const seen=new Map();
 kids.forEach(el=>{const p=el.parentElement,n=seen.get(p)||0;seen.set(p,n+1);el.classList.add('st-kid');el.style.setProperty('--sk',Math.min(n,12))});
 root.querySelectorAll('.set-metric b').forEach(settingsCount);
 root.querySelectorAll('.goal-track i').forEach(b=>{const w=b.style.width;b.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{b.style.width=w}))});
 root.classList.remove('st-enter');void root.offsetWidth;root.classList.add('st-enter');
}
function renderSettingsNav(){
 const nav=$('#settingsNav');
 if(nav.children.length===SETTINGS_SECTIONS.length){
  [...nav.children].forEach((b,i)=>{const on=SETTINGS_SECTIONS[i][0]===settingsTab;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false')});
  return;
 }
 nav.innerHTML=SETTINGS_SECTIONS.map(([key,title,sub,icon],i)=>`<button data-settings-tab="${key}" style="--k:${i}" class="${key===settingsTab?'active ':''}${key==='danger'?'danger ':''}${key==='subscription'?'nav-membership':''}" aria-current="${key===settingsTab?'page':'false'}"><span class="sn-icon">${ic(icon,17)}</span><span><b>${title}</b><small>${sub}</small></span><span class="sn-arrow">${ic('right',12)}</span></button>`).join('');
}
function renderSettings(){
 if(settingsDirty&&settingsRendered===settingsTab)return;
 const changed=settingsRendered!==settingsTab,order=SETTINGS_SECTIONS.map(x=>x[0]),dir=settingsRendered?order.indexOf(settingsTab)-order.indexOf(settingsRendered):0;
 renderSettingsNav();
 const panels={profile:profilePanel,connect:connectPanel,login:loginPanel,account:accountPanel,trading:tradingPanel,alerts:alertsPanel,subscription:membershipPanel,security:privacyPanel,danger:dangerPanel};
 const content=$('#settingsContent');
 content.dataset.tab=settingsTab;
 content.innerHTML=panels[settingsTab]();settingsRendered=settingsTab;updateProfileUI();
 if(changed)animatePanel(content,dir);
 else if(content._enteredAt&&Date.now()-content._enteredAt<1200)animatePanel(content,content._dir||0);   // panel re-rendered while still entering (e.g. people list loaded): keep it smooth
 if(pendingFlash){if(Date.now()-pendingFlashAt<700)flashNow($(pendingFlash,content));else pendingFlash=null}
}

function applyTradeDefaults(form){
 form.qty.value=S.trading.quantity;form.fees.value=S.trading.fees;form.strategy.value=S.trading.strategy;
 const name=S.preferences.accountName;
 if(![...form.account.options].some(o=>o.value===name))form.account.add(new Option(name,name));
 form.account.value=name;
}
function tradeMessage(message){
 if(!S.alerts.tradeMessages)return;
 const today=dkey(new Date()),trades=sourceTrades().filter(t=>!t.open).filter(t=>t.date.startsWith(today));
 const pnl=trades.reduce((n,t)=>n+t.pnl,0);
 if(S.trading.dailyLoss>0&&pnl<=-S.trading.dailyLoss)message+=' · Your daily loss reminder threshold has been reached.';
 else if(S.trading.maxTrades>0&&trades.length>=S.trading.maxTrades)message+=' · Your daily trade count reminder has been reached.';
 toast(message);
}
async function showLocalNotice(title,body){
 toast(body);
 if(!S.alerts.desktop)return false;
 try{
  if(window.tjDesktop?.notify)return await tjDesktop.notify(title,body);
  if('Notification' in window&&Notification.permission==='granted'){new Notification(title,{body});return true}
 }catch(e){toast('Desktop notification unavailable. Your in-app reminders still work.')}
 return false;
}
function checkJournalReminder(now=new Date()){
 if(!S.alerts.dailyReminder)return false;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:S.alerts.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const part=n=>parts.find(p=>p.type===n)?.value||'';
 const day=`${part('year')}-${part('month')}-${part('day')}`,time=`${part('hour')}:${part('minute')}`;
 if(time<S.alerts.reminderTime||S.alerts.lastReminderDay===day)return false;
 S.alerts.lastReminderDay=day;save();showLocalNotice('Your daily journal','Take a moment to review your trades and write today’s notes.');return true;
}

function createJournalBackup(){
 const keys=['live','journal','profile','preferences','trading','alerts','startEquity','currency'];
 const state=Object.fromEntries(keys.map(k=>[k,S[k]]));
 return JSON.parse(JSON.stringify({format:'traders-journal-local',version:1,exportedAt:new Date().toISOString(),state,metatraderSnapshot:SYNCED}));
}
function validateJournalBackup(backup){
 if(backup?.format!=='traders-journal-local'||backup.version!==1||!backup.state)throw new Error('Choose a Traders Journal JSON backup.');
 const b=backup.state;
 if(!Array.isArray(b.live)||b.live.length>100000||!b.journal||typeof b.journal!=='object'||Array.isArray(b.journal))throw new Error('Backup journal data is invalid.');
 const live=b.live.map((t,i)=>{
  if(!t||typeof t.symbol!=='string'||!t.symbol.trim()||typeof t.date!=='string'||!Number.isFinite(+new Date(t.date))||!['Long','Short'].includes(t.side)||!['qty','entry','exit','pnl'].every(k=>typeof t[k]==='number'&&Number.isFinite(t[k])))throw new Error(`Trade ${i+1} in this backup is invalid.`);
  return {id:'restored-'+i+'-'+Date.now(),symbol:t.symbol.slice(0,100),date:t.date,side:t.side,qty:t.qty,entry:t.entry,exit:t.exit,pnl:t.pnl,fees:Number.isFinite(t.fees)?t.fees:0,strategy:String(t.strategy||'').slice(0,100),account:String(t.account||'Main Account').slice(0,80),notes:String(t.notes||'').slice(0,20000)};
 });
 const journal=Object.fromEntries(Object.entries(b.journal).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&typeof v==='string').map(([k,v])=>[k,v.slice(0,50000)]));
 const profile={...PROFILE_DEFAULTS};for(const k of Object.keys(profile))if(typeof b.profile?.[k]==='string')profile[k]=b.profile[k].slice(0,k==='photo'?300000:1000);
 if(!/^data:image\/(png|jpeg|webp);base64,/.test(profile.photo))profile.photo='';
 const preferences={...PREFERENCE_DEFAULTS};
 for(const k of ['collapsed','reducedMotion','maskBalances'])if(typeof b.preferences?.[k]==='boolean')preferences[k]=b.preferences[k];
 if(['dark','light'].includes(b.preferences?.theme))preferences.theme=b.preferences.theme;
 if(RANGES.some(([v])=>v===b.preferences?.range))preferences.range=b.preferences.range;
 if(['comfortable','compact'].includes(b.preferences?.density))preferences.density=b.preferences.density;
 if(typeof b.preferences?.accountName==='string')preferences.accountName=b.preferences.accountName.slice(0,60)||'Main Account';
 if(Number.isFinite(b.preferences?.monthlyGoal)&&b.preferences.monthlyGoal>=0)preferences.monthlyGoal=b.preferences.monthlyGoal;
 const trading={...TRADING_DEFAULTS};
 for(const k of ['dailyLoss','maxTrades','fees'])if(Number.isFinite(b.trading?.[k])&&b.trading[k]>=0)trading[k]=b.trading[k];
 for(const k of ['quantity','riskPercent'])if(Number.isFinite(b.trading?.[k])&&b.trading[k]>0)trading[k]=b.trading[k];
 for(const k of ['strategy','market'])if(typeof b.trading?.[k]==='string')trading[k]=b.trading[k].slice(0,80);
 const alerts={...ALERT_DEFAULTS};for(const k of ['desktop','dailyReminder','tradeMessages'])if(typeof b.alerts?.[k]==='boolean')alerts[k]=b.alerts[k];
 if(/^([01]\d|2[0-3]):[0-5]\d$/.test(b.alerts?.reminderTime))alerts.reminderTime=b.alerts.reminderTime;
 try{new Intl.DateTimeFormat('en',{timeZone:b.alerts?.timezone});if(typeof b.alerts?.timezone==='string')alerts.timezone=b.alerts.timezone}catch(e){}
 return {live,journal,profile,preferences,trading,alerts,startEquity:Number.isFinite(b.startEquity)&&b.startEquity>=0?b.startEquity:10000,currency:['$','€','£','Rs ','¥'].includes(b.currency)?b.currency:'$'};
}
function downloadJournalBackup(){
 const backup=createJournalBackup(),url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download='Traders-Journal-Backup-'+dkey(new Date())+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);S.lastBackup=new Date().toISOString();save();renderSettings();toast('Backup download requested');
}
function confirmJournalAction(title,word,description,action){
 $('#settingsConfirm')?.remove();
 const ov=document.createElement('div');ov.id='settingsConfirm';ov.className='overlay open';ov.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="settingsConfirmTitle" style="max-width:470px"><header><h3 id="settingsConfirmTitle">${esc(title)}</h3><button class="icon-btn" data-cancel-confirm aria-label="Close">${ic('x',16)}</button></header><form class="set-confirm-body"><p>${esc(description)}</p><label class="set-field">Type ${word} to continue<input id="settingsConfirmText" autocomplete="off" spellcheck="false" required></label><div class="set-inline" style="justify-content:flex-end"><button class="set-btn" type="button" data-cancel-confirm>Cancel</button><button class="set-btn danger" id="settingsConfirmSubmit" type="submit" disabled>Confirm ${word.toLowerCase()}</button></div></form></div>`;
 document.body.appendChild(ov);const close=()=>ov.remove();$$('[data-cancel-confirm]',ov).forEach(b=>b.onclick=close);
 $('#settingsConfirmText').oninput=e=>$('#settingsConfirmSubmit').disabled=e.target.value!==word;
 $('form',ov).onsubmit=e=>{e.preventDefault();if($('#settingsConfirmText').value!==word)return;action();close()};
 ov.onmousedown=e=>{if(e.target===ov)close()};$('#settingsConfirmText').focus();
}
/* ================= PROFILE ACTIONS ================= */
async function saveProfile(fields){
 let r;
 try{r=await authPost('/api/auth/update-profile',fields)}catch(e){return 'Could not reach the local server.'}
 if(!r.ok)return r.j.error||'Could not save your changes.';
 adoptUser(r.j.user);
 return '';
}
function formError(form,msg){
 let e=form.querySelector('.pf-err');
 if(!e){e=document.createElement('div');e.className='pf-err';e.setAttribute('role','alert');form.appendChild(e)}
 e.classList.remove('ok');e.textContent=msg;
}
function chooseProfilePhoto(){
 const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';
 input.onchange=()=>{
  const file=input.files[0];if(!file)return;
  if(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))return toast('Choose a PNG, JPG or WebP under 8 MB.');
  const reader=new FileReader();
  reader.onload=()=>{
   const img=new Image();
   img.onerror=()=>toast('That image could not be opened.');
   img.onload=async()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
    const ctx=canvas.getContext('2d'),side=Math.min(img.width,img.height);
    ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,192,192);
    const err=await saveProfile({photo:canvas.toDataURL('image/webp',.88)});
    settingsDirty=false;renderSettings();toast(err||'Profile photo updated');
   };
   img.src=reader.result;
  };
  reader.readAsDataURL(file);
 };
 input.click();
}

/* ---- Google: real sign-in through the browser; the server confirms the result ---- */
function startGoogleLink(importProfile){
 PF.msg.googleFlow='';
 authPost('/api/auth/google/start',{intent:'link',importProfile}).then(r=>{
  if(!r.ok){PF.msg.googleFlow=r.j.error||'Could not start Google sign-in.';settingsDirty=false;return renderSettings()}
  window.open(r.j.url,'_blank','noopener');
  toast('Finish connecting in the Google window that just opened…');
  clearInterval(PF.flow);const state=r.j.state,t0=Date.now();
  PF.flow=setInterval(async()=>{
   if(Date.now()-t0>10*60*1000){clearInterval(PF.flow);PF.msg.googleFlow='Google sign-in timed out. Try again.';settingsDirty=false;return renderSettings()}
   try{
    const p=await fetch('/api/auth/google/poll?state='+encodeURIComponent(state),{cache:'no-store'});const j=await p.json();
    if(j.status==='pending')return;
    clearInterval(PF.flow);
    if(j.status==='done'){adoptUser(j.user);PF.msg.googleFlow='';toast('Google connected: '+(j.user.linked.google?j.user.linked.google.email:''))}
    else PF.msg.googleFlow=j.error||'Google sign-in failed.';
    settingsDirty=false;renderSettings();
   }catch(e){/* retry next tick */}
  },1500);
 });
}

async function runLookup(provider,query){
 PF.msg[provider]='';PF.lookup=null;
 const r=await authPost('/api/auth/lookup-account',{provider,query});
 if(!r.ok)PF.msg[provider]=r.j.error||'Could not fetch account details.';
 else PF.lookup={provider,profile:r.j.profile};
 settingsDirty=false;renderSettings();
}
async function applyLookup(){
 if(!PF.lookup)return;
 const {provider,profile:pr}=PF.lookup,fields={};
 for(const k of ['firstName','lastName','photo','location','country','bio'])if(pr[k])fields[k]=pr[k];
 if(pr.email&&!S.profile.email)fields.email=pr.email;
 fields.linkImported={provider,email:pr.email||'',name:[pr.firstName,pr.lastName].filter(Boolean).join(' '),handle:pr.username||''};
 const err=await saveProfile(fields);
 PF.lookup=null;settingsDirty=false;renderSettings();toast(err||'Profile updated from '+(provider==='github'?'GitHub':'this PC'));
}

/* ================= EVENT LISTENERS ================= */
document.addEventListener('click',async e=>{
 const open=e.target.closest('[data-open-settings]');if(open){e.stopPropagation();openSettings(open.dataset.openSettings);return}
 const tab=e.target.closest('[data-settings-tab]');
 if(tab){settingsTab=tab.dataset.settingsTab;settingsDirty=false;profileEditing=false;PF.editing=null;PF.error='';renderSettings();if(settingsTab==='login'||settingsTab==='connect')loadPeople();return}
 const b=e.target.closest('[data-settings-action]');if(!b)return;const action=b.dataset.settingsAction;
 if(action==='pf-edit'){PF.editing=b.dataset.field;PF.error='';settingsDirty=false;renderSettings();setTimeout(()=>{const i=$('.pf-edit-form input,.pf-edit-form textarea');if(i){i.focus();if(i.select&&i.tagName==='INPUT')i.select()}},20)}
 if(action==='pf-cancel'){PF.editing=null;PF.error='';settingsDirty=false;renderSettings()}
 if(action==='photo')chooseProfilePhoto();
 if(action==='remove-photo'){const err=await saveProfile({photo:''});settingsDirty=false;renderSettings();toast(err||'Photo removed')}
 if(action==='logout')window.tjAuth&&window.tjAuth.logout();
 if(action==='auto-toggle'){
  const on=b.dataset.on==='1';
  askModal({title:on?'Turn on automatic sign-in':'Turn off automatic sign-in',body:on?'Confirm with your password. From now on the desktop app signs you in on this Windows account without asking.':'The app will ask for your password again the next time it opens.',cta:on?'Turn on':'Turn off',fields:[{name:'password',label:'Your password',type:'password',ac:'current-password'}],
   onSubmit:async d=>{const r=await authPost('/api/auth/auto-login-setting',{enabled:on,password:d.password});if(!r.ok)return r.j.error||'Could not change this.';window.TJ_AUTH.autoLogin=r.j.autoLogin;settingsDirty=false;renderSettings();toast(on?'Automatic sign-in is on':'Automatic sign-in is off')}});
 }
 if(action==='sign-out-others'){const r=await authPost('/api/auth/sign-out-others',{});if(r.ok){window.TJ_AUTH.autoLogin=r.j.autoLogin;settingsDirty=false;renderSettings();toast('Signed out everywhere else')}}
 if(action==='google-link')startGoogleLink(b.dataset.import!=='0');
 if(action==='unlink'){
  const r=await authPost('/api/auth/unlink',{provider:b.dataset.provider});
  if(r.ok){adoptUser(r.j.user);PF.lookup=null;settingsDirty=false;renderSettings();toast('Disconnected')}
 }
 if(action==='lookup-windows')runLookup('windows','');
 if(action==='lookup-apply')applyLookup();
 if(action==='lookup-discard'){PF.lookup=null;settingsDirty=false;renderSettings()}
 if(action==='google-config-clear')askModal({title:'Remove Google client',body:'Google sign-in stops working for everyone on this PC until you add a client again. People who linked Google keep their password login.',fields:[],cta:'Remove',danger:true,onSubmit:async()=>{
  const r=await authPost('/api/auth/settings',{google:null});if(!r.ok)return r.j.error||'Could not remove it.';
  PF.google=r.j.google;window.TJ_AUTH.googleConfigured=false;settingsDirty=false;renderSettings();toast('Google client removed');
 }});
 if(action==='toggle-signups'){
  const on=b.checked;const r=await authPost('/api/auth/settings',{allowSignups:on});
  if(r.ok){PF.people.allowSignups=r.j.allowSignups;window.TJ_AUTH.allowSignups=r.j.allowSignups;toast(on?'People can create their own account':'New accounts must be added by you')}else{b.checked=!on;toast(r.j.error||'Could not change this.')}
 }
 if(action==='add-person')askModal({title:'Add a person',body:'They sign in with the username and temporary password you set here, and can change it themselves.',cta:'Add person',fields:[
  {name:'firstName',label:'First name'},{name:'lastName',label:'Last name',req:false},{name:'username',label:'Username',ph:'letters, numbers . _ -'},
  {name:'newPassword',label:'Temporary password (8+ characters)',type:'password',min:8,ac:'new-password'},{name:'ownerPassword',label:'Your password (to confirm)',type:'password',ac:'current-password'}],
  onSubmit:async d=>{const r=await authPost('/api/auth/add-person',d);if(!r.ok)return r.j.error||'Could not add this person.';PF.people.people=r.j.people;settingsDirty=false;renderSettings();toast('Added '+d.firstName)}});
 if(action==='reset-pw'){
  const who=PF.people.people.find(x=>x.id===b.dataset.id);
  askModal({title:'Reset password',body:`Set a new temporary password for <b>${esc(who?who.firstName||who.username:'this person')}</b>. They are signed out everywhere.`,cta:'Reset password',fields:[
   {name:'newPassword',label:'New password (8+ characters)',type:'password',min:8,ac:'new-password'},{name:'ownerPassword',label:'Your password (to confirm)',type:'password',ac:'current-password'}],
   onSubmit:async d=>{const r=await authPost('/api/auth/reset-password',{userId:b.dataset.id,...d});if(!r.ok)return r.j.error||'Could not reset the password.';toast('Password reset')}});
 }
 if(action==='remove-person'){
  const who=PF.people.people.find(x=>x.id===b.dataset.id);
  askModal({title:'Remove person',danger:true,body:`This permanently removes <b>${esc(who?[who.firstName,who.lastName].filter(Boolean).join(' ')||who.username:'this person')}</b> with their journal, settings and MetaTrader connections.`,cta:'Remove person',fields:[{name:'password',label:'Your password (to confirm)',type:'password',ac:'current-password'}],
   onSubmit:async d=>{const r=await authPost('/api/auth/delete-user',{userId:b.dataset.id,password:d.password});if(!r.ok)return r.j.error||'Could not remove this person.';PF.people.people=r.j.people;settingsDirty=false;renderSettings();toast('Person removed')}});
 }
 if(action==='delete-me')askModal({title:'Delete my account',danger:true,body:'Your profile, journal, settings and connections are removed from this PC. This can\'t be undone.',cta:'Delete my account',fields:[{name:'password',label:'Your password',type:'password',ac:'current-password'}],
  onSubmit:async d=>{const r=await authPost('/api/auth/delete-user',{password:d.password});if(!r.ok)return r.j.error||'Could not delete the account.';try{localStorage.removeItem('tj_state')}catch(x){}location.reload()}});
 if(action.startsWith('zoom-')){if(!window.tjDesktop?.setZoom)return toast('Zoom controls are available in the desktop app.');const z=tjDesktop.getZoom();tjDesktop.setZoom(action==='zoom-reset'?(tjDesktop.defaultZoom||1.2):z+(action==='zoom-in'?.1:-.1));$('#settingsZoom').textContent=Math.round(tjDesktop.getZoom()*100)+'%'}
 if(action==='test-notice'){b.classList.add('st-ring');setTimeout(()=>b.classList.remove('st-ring'),900);const delivered=await showLocalNotice('Traders Journal · KING','Your local journal notifications are ready.');if(!delivered)toast(S.alerts.desktop?'Test shown in app. Desktop delivery depends on Windows notification settings.':'Test shown in app. Turn on desktop notifications for a system notification.')}
 if(action==='backup')downloadJournalBackup();
 if(action==='restore')chooseJournalBackup();
 if(action==='csv')exportCsv();
 if(action==='open-data'){if(!window.tjDesktop?.openDataFolder)return toast('Open data folder is available in the desktop app.');if(!(await tjDesktop.openDataFolder()))toast('Could not open the data folder.')}
 if(action==='clear-journal')confirmJournalAction('Clear local journal','CLEAR','This immediately removes your manual/imported trades and journal notes. Download a backup first. Synced MT5 data and your profile are kept.',()=>{const live=S.live,journal=S.journal;S.live=[];S.journal={};if(!save()){S.live=live;S.journal=journal;return}settingsDirty=false;renderAll();toast('Manual trades and journal notes cleared')});
 if(action==='reset-preferences')confirmJournalAction('Reset workspace preferences','RESET','Restore default display, trading and alert preferences. Your trades, notes, balance and profile are kept.',()=>{const previous={...S};S.preferences={...PREFERENCE_DEFAULTS};S.trading={...TRADING_DEFAULTS};S.alerts={...ALERT_DEFAULTS};S.theme='dark';if(!save()){S=previous;return}settingsDirty=false;renderAll();toast('Workspace preferences reset')});
});

document.addEventListener('input',e=>{
 if(e.target.closest('[data-settings-form],[data-pf-form]'))settingsDirty=true;
});
document.addEventListener('change',e=>{
 const el=e.target;if(el.matches('[data-setting-group]')){const group=el.dataset.settingGroup,key=el.dataset.settingKey,previous=S[group][key];S[group][key]=el.checked;if(!save()){S[group][key]=previous;el.checked=previous}else{const row=el.closest('.set-row');if(row&&!calm()){row.classList.remove('st-row-flash');void row.offsetWidth;row.classList.add('st-row-flash')}}updateProfileUI()}
 if(el.id==='reminderTime'&&el.value){S.alerts.reminderTime=el.value;save()}
 if(el.id==='reminderTimezone'){S.alerts.timezone=el.value;save()}
});

document.addEventListener('submit',async e=>{
 const form=e.target;
 if(form.matches('[data-pf-form]')){
  e.preventDefault();
  const field=form.dataset.pfForm,data=Object.fromEntries(new FormData(form));
  const fields=field==='name'?{firstName:data.firstName,lastName:data.lastName}:{[field]:data[field]};
  if(field==='name'&&!String(data.firstName||'').trim())return formError(form,'Please enter your first name.');
  PF.busy=true;const err=await saveProfile(fields);PF.busy=false;
  if(err){PF.error=err;return formError(form,err)}
  PF.editing=null;PF.error='';settingsDirty=false;flashSaved(field==='name'?'.pf-hero':'.pf-details');renderAll();renderSettings();
  toast(field==='name'?'Name updated to '+profileFullName():'Saved');
  return;
 }
 if(!form.matches('[data-settings-form]'))return;
 e.preventDefault();
 const data=Object.fromEntries(new FormData(form)),previous=JSON.parse(JSON.stringify(S));
 const section=form.dataset.settingsForm;

 if(section==='password'){
  PF.msg.password='';PF.msg.passwordOk=false;
  if(data.newPassword!==data.newPassword2){PF.msg.password='The two new passwords do not match.';settingsDirty=false;return renderSettings()}
  const r=await authPost('/api/auth/change-password',{currentPassword:data.currentPassword,newPassword:data.newPassword});
  PF.msg.password=r.ok?'Password updated. Other sessions were signed out.':(r.j.error||'Could not update the password.');PF.msg.passwordOk=r.ok;
  settingsDirty=false;if(r.ok)flashSaved('[data-settings-form="password"]');renderSettings();if(r.ok)toast('Password updated');
  return;
 }
 if(section==='google-config'){
  PF.msg.google='';
  const r=await authPost('/api/auth/settings',{google:{clientId:data.clientId,clientSecret:data.clientSecret}});
  if(!r.ok)PF.msg.google=r.j.error||'Could not save.';
  else{PF.google=r.j.google;window.TJ_AUTH.googleConfigured=true;toast('Google enabled. Now connect your account.')}
  settingsDirty=false;renderSettings();return;
 }
 if(section==='lookup-github'){const q=String(data.query||'').trim();if(!q){PF.msg.github='Enter a GitHub username.';settingsDirty=false;return renderSettings()}return runLookup('github',q)}
 if(section==='account'){S.startEquity=+data.startEquity;S.currency=data.currency;Object.assign(S.preferences,{accountName:data.accountName.trim(),monthlyGoal:+data.monthlyGoal||0,theme:data.theme,range:data.range,density:data.density,collapsed:data.collapsed==='true'});S.theme=data.theme;S.range=data.range}
 if(section==='trading'){Object.assign(S.trading,{market:data.market,strategy:data.strategy.trim(),quantity:+data.quantity,fees:+data.fees,riskPercent:+data.riskPercent,dailyLoss:+data.dailyLoss||0,maxTrades:+data.maxTrades||0})}
 if(!save()){S=previous;return}
 settingsDirty=false;profileEditing=false;flashSaved('[data-settings-form="'+section+'"]');renderAll();toast('Preferences saved');
});

document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 if($('#settingsConfirm')){$('#settingsConfirm').remove();return}
 if(PF.editing){PF.editing=null;PF.error='';settingsDirty=false;renderSettings()}
});
function chooseJournalBackup(){
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{const file=input.files[0];if(!file)return;
 try{if(file.size>15*1024*1024)throw new Error('Choose a backup under 15 MB.');const restored=validateJournalBackup(JSON.parse(await file.text()));confirmJournalAction('Restore local journal','RESTORE',`Replace the local journal with ${restored.live.length} manual trades and ${Object.keys(restored.journal).length} journal days? MT5 connections are kept.`,()=>{const previous={...S};Object.assign(S,restored);S.theme=S.preferences.theme;if(!save()){S=previous;return}settingsDirty=false;profileEditing=false;renderAll();toast('Local journal restored')})}catch(e){toast(e.message)}};input.click();
}
$$('[data-page="settings"]').forEach(b=>b.onclick=()=>openSettings());

updateProfileUI();renderAll();setInterval(()=>checkJournalReminder(),30000);

/* ================= NOTIFICATION CENTRE (the bell) =================
   A saved feed per person (S.notifs). Events come from: changes in your MetaTrader connections (new / removed account,
   terminal online or offline, trades synced, positions opened or closed), the app's own messages (profile, password,
   people, backups, imports …), goals / streaks / reminders, and a welcome note. */
const NF_CATS=[['all','All'],['account','Accounts'],['trade','Trading'],['security','Security'],['system','System']];
const NF_ICON={account:'link',trade:'chartline',security:'shield',system:'settings'};
let nfFilter='all',nfPrev=null,nfFirstPoll=true,nfPend={},nfRecent={},nfPanel=null,nfClock=0;
const nfList=()=>{if(!Array.isArray(S.notifs))S.notifs=[];return S.notifs};
const nfUnread=()=>nfList().filter(n=>!n.read).length;
function nfAgo(ts){
 const s=Math.max(0,(Date.now()-ts)/1000);
 if(s<45)return 'just now';if(s<3600)return Math.round(s/60)+'m ago';if(s<86400)return Math.round(s/3600)+'h ago';
 if(s<172800)return 'Yesterday';return new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric'});
}
let nfBadgeN=-1;
function nfBadge(){
 const b=document.getElementById('pBell');if(!b)return;
 let k=b.querySelector('.nf-badge');if(!k){k=document.createElement('span');k.className='nf-badge';b.appendChild(k)}
 const n=nfUnread();k.textContent=n>9?'9+':String(n);k.classList.toggle('on',n>0);
 if(nfBadgeN>=0&&n!==nfBadgeN&&n>0&&!calm()){k.classList.remove('bump');void k.offsetWidth;k.classList.add('bump')}
 nfBadgeN=n;
}
/* nf({type:'account'|'trade'|'security'|'system', title, text, tone:'green'|'blue'|'amber'|'red'|'gold', icon, go, key, desktop}) */
function nf(o){
 if(!o||!o.title)return;
 const key=o.key||(o.type+'|'+o.title+'|'+(o.text||'')),last=nfRecent[key];
 if(last&&Date.now()-last<60000)return;nfRecent[key]=Date.now();
 const list=nfList();
 list.unshift({id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:Date.now(),type:o.type||'system',title:String(o.title).slice(0,90),text:String(o.text||'').slice(0,220),
  tone:o.tone||'blue',icon:o.icon||NF_ICON[o.type]||'bell',go:o.go||'',read:false});
 if(list.length>80)list.length=80;
 save();nfBadge();nfRefresh();
 const b=document.getElementById('pBell');if(b&&!document.documentElement.classList.contains('reduce-motion')){b.classList.remove('nf-ring');void b.offsetWidth;b.classList.add('nf-ring');setTimeout(()=>b.classList.remove('nf-ring'),1100)}
 if(o.desktop&&S.alerts&&S.alerts.desktop&&window.tjDesktop&&tjDesktop.notify){try{tjDesktop.notify(o.title,o.text||'')}catch(e){/* ignore */}}
}

/* ---- MetaTrader connections: compare each poll with the previous one (and with what was saved last session) ---- */
function nfConnections(conns){
 const snap={};
 conns.forEach(c=>{const a=c.account||{};snap[c.id]={name:a.name||c.name||'MT5 account',login:a.login||'',server:a.server||'',status:c.status,open:c.openCount||0,count:c.tradeCount||0}});
 const base=nfPrev||S.nfConns;
 if(!base){S.nfConns=snap;nfPrev=snap;save();return}
 const first=nfFirstPoll;nfFirstPoll=false;
 const label=c=>c.name+(c.login?' · '+c.login:'');
 const next={};
 for(const id of Object.keys(snap)){
  const c=snap[id],b=base[id];next[id]=Object.assign({},c);
  if(!b){
   nf({type:'account',tone:'green',icon:'plus',go:'connect',desktop:true,key:'add|'+id,
    title:c.login?'MT5 account detected':'MT5 connection added',
    text:label(c)+(c.server?' ('+c.server+')':'')+(c.status==='online'?' is connected and syncing.':c.status==='pending'?' was created. Waiting for MetaTrader to pair.':' was added to your journal.')});
   continue;
  }
  if(c.login&&b.login&&c.login!==b.login)nf({type:'account',tone:'blue',icon:'refresh',go:'connect',key:'login|'+id+c.login,title:'Account login changed',text:b.name+' now reports login '+c.login+' (was '+b.login+').'});
  if(c.count>b.count)nf({type:'account',tone:'green',icon:'download',go:'logging',key:'sync|'+id+'|'+c.count,title:'Trades synced',text:(c.count-b.count)+' new trade'+(c.count-b.count>1?'s':'')+' from '+label(c)+'.'});
  else if(c.count<b.count)nf({type:'account',tone:'blue',icon:'refresh',go:'logging',key:'hist|'+id+'|'+c.count,title:'Trade history updated',text:label(c)+' now has '+c.count+' closed trade'+(c.count===1?'':'s')+'.'});
  if(!first){
   if(c.open>b.open)nf({type:'trade',tone:'amber',icon:'zap',go:'logging',key:'open|'+id+'|'+c.open,title:'Position opened',text:label(c)+' has '+c.open+' open position'+(c.open>1?'s':'')+'.'});
   else if(c.open<b.open)nf({type:'trade',tone:'gold',icon:'check',go:'logging',key:'close|'+id+'|'+c.open,title:'Position closed',text:label(c)+(c.open?' now has '+c.open+' open.':' has no open positions.')});
  }
  // online / offline: only after two polls in a row, so a missed heartbeat does not raise an alert
  const live=c.status==='online'||c.status==='offline';
  if(live&&c.status!==b.status&&(b.status==='online'||b.status==='offline'||b.status==='pending')){
   const p=nfPend[id];nfPend[id]=p&&p.to===c.status?{to:c.status,n:p.n+1}:{to:c.status,n:1};
   if(nfPend[id].n>=2){
    delete nfPend[id];
    if(!first)nf(c.status==='online'?{type:'account',tone:'green',icon:'link',go:'connect',key:'on|'+id,title:b.status==='pending'?'Terminal paired':'MetaTrader back online',text:label(c)+' is syncing again.'}
     :{type:'account',tone:'amber',icon:'alert',go:'connect',desktop:true,key:'off|'+id,title:'MetaTrader went offline',text:label(c)+' stopped responding. Open the terminal or check Connections.'});
   }else next[id].status=b.status;     // keep the old state until the change is confirmed
  }else delete nfPend[id];
 }
 for(const id of Object.keys(base)){
  if(snap[id])continue;const b=base[id];
  nf({type:'account',tone:'red',icon:'trash',go:'connect',desktop:true,key:'del|'+id,title:'MT5 account removed',text:label(b)+' was disconnected'+(b.count?' and its '+b.count+' synced trade'+(b.count>1?'s were':' was')+' removed from your journal.':'.')});
 }
 const changed=JSON.stringify(next)!==JSON.stringify(S.nfConns);
 nfPrev=next;if(changed){S.nfConns=next;save()}
}

/* ---- the app's own messages become notifications (matched by what the toast says) ---- */
const NF_TOAST=[
 [/^Profile photo updated/,{type:'security',tone:'blue',icon:'camera',go:'settings:profile',title:'Profile photo updated'}],
 [/^Photo removed/,{type:'security',tone:'blue',icon:'camera',go:'settings:profile',title:'Profile photo removed'}],
 [/^Name updated to (.+)/,m=>({type:'security',tone:'blue',icon:'pencil',go:'settings:profile',title:'Name updated',text:'Your name is now '+m[1]+'.'})],
 [/^Password updated/,{type:'security',tone:'amber',icon:'key',go:'settings:login',title:'Password changed',text:'Other devices were signed out.'}],
 [/^Password reset/,{type:'security',tone:'amber',icon:'key',go:'settings:login',title:'Password reset',text:'A person’s password was reset. They were signed out everywhere.'}],
 [/^Added (.+)/,m=>({type:'security',tone:'green',icon:'userplus',go:'settings:login',title:'Person added',text:m[1]+' can now sign in on this PC.'})],
 [/^Person removed/,{type:'security',tone:'red',icon:'trash',go:'settings:login',title:'Person removed',text:'Their account, journal and connections were deleted.'}],
 [/^Signed out everywhere else/,{type:'security',tone:'amber',icon:'logout',go:'settings:login',title:'Other sign-ins ended',text:'Only this window is signed in now.'}],
 [/^Automatic sign-in is (on|off)/,m=>({type:'security',tone:m[1]==='on'?'amber':'blue',icon:'zap',go:'settings:login',title:'Automatic sign-in turned '+m[1],text:m[1]==='on'?'This Windows account opens your journal without a password.':'The app will ask for your password again.'})],
 [/^Google connected: (.+)/,m=>({type:'security',tone:'green',icon:'shield',go:'settings:connect',title:'Google connected',text:m[1]+' can now sign in to your account.'})],
 [/^Google enabled/,{type:'security',tone:'green',icon:'shield',go:'settings:connect',title:'Google sign-in enabled',text:'Connect your Google account to use it.'}],
 [/^Google client removed/,{type:'security',tone:'amber',icon:'shield',go:'settings:connect',title:'Google sign-in removed'}],
 [/^Disconnected$/,{type:'security',tone:'amber',icon:'link',go:'settings:connect',title:'Connected account removed'}],
 [/^Profile updated from (.+)/,m=>({type:'security',tone:'blue',icon:'user',go:'settings:profile',title:'Profile updated',text:'Details were imported from '+m[1]+'.'})],
 [/^People can create their own account/,{type:'security',tone:'blue',icon:'users',go:'settings:login',title:'Sign-ups turned on'}],
 [/^New accounts must be added by you/,{type:'security',tone:'blue',icon:'users',go:'settings:login',title:'Sign-ups turned off'}],
 [/^Backup download requested/,{type:'system',tone:'green',icon:'download',go:'settings:security',title:'Backup downloaded',text:'Keep the file somewhere safe.'}],
 [/^Local journal restored/,{type:'system',tone:'amber',icon:'refresh',go:'settings:security',title:'Journal restored from a backup'}],
 [/^Manual trades and journal notes cleared/,{type:'system',tone:'red',icon:'trash',go:'settings:danger',title:'Local journal cleared',text:'Manual trades and journal notes were removed.'}],
 [/^Workspace preferences reset/,{type:'system',tone:'amber',icon:'settings',go:'settings:danger',title:'Preferences reset'}],
 [/^Imported (\d+) trades/,m=>({type:'trade',tone:'green',icon:'download',go:'logging',title:'Trades imported',text:m[1]+' trades were added from your report.'})],
 [/^Trade deleted/,{type:'trade',tone:'amber',icon:'trash',go:'logging',title:'Trade deleted'}],
 [/^Trade (saved|updated)(.*)/,m=>m[2].includes('has been reached')?null:({type:'trade',tone:'green',icon:'check',go:'logging',title:'Trade '+m[1]})],
 [/(daily loss reminder threshold|daily trade count reminder) has been reached/,m=>({type:'trade',tone:'red',icon:'alert',go:'settings:trading',desktop:true,title:m[1]==='daily loss reminder threshold'?'Daily loss limit reached':'Daily trade limit reached',text:m[1]==='daily loss reminder threshold'?'You hit the loss threshold you set. Consider stepping away.':'You reached the trade count you set for today.'})],
 [/^Take a moment to review your trades/,{type:'system',tone:'gold',icon:'calendar',go:'journal',title:'Daily journal reminder',text:'Review today’s trades and write a few notes.'}],
 [/^Account selection updated/,{type:'account',tone:'green',icon:'link',go:'connect',title:'Account selection updated',text:'Your tracked MT5 accounts were changed.'}]
];
function nfToast(msg){
 msg=String(msg||'');
 for(const [re,fn] of NF_TOAST){
  const m=msg.match(re);if(!m)continue;
  const o=typeof fn==='function'?fn(m):fn;
  if(o){nf(o);return}          // a rule can return null to let a later rule handle the same message
 }
}

/* ---- goals, streaks and a welcome note ---- */
function nfPeriodic(){
 if(typeof heroStats!=='function')return;
 let st;try{st=heroStats()}catch(e){return}
 const F=S.nfFlags=S.nfFlags||{},goal=+((S.preferences||{}).monthlyGoal)||0,mk=dkey(new Date()).slice(0,7);
 if(goal>0&&st.monthNet>=goal&&F.goalMonth!==mk){F.goalMonth=mk;save();nf({type:'trade',tone:'gold',icon:'crown',go:'settings:account',desktop:true,key:'goal|'+mk,title:'Monthly goal reached',text:'You hit your '+money(goal)+' goal for this month.'})}
 const marks=[3,5,7,10,14,20,30];
 if(st.streak<(F.streak||0))F.streak=st.streak;
 const hit=marks.filter(m=>st.streak>=m&&(F.streak||0)<m).pop();
 if(hit){F.streak=st.streak;save();nf({type:'trade',tone:'gold',icon:'flame',go:'dashboard',key:'streak|'+hit,title:hit+'-day winning streak',text:'You have closed '+hit+' profitable trading days in a row.'})}
}
function nfWelcome(){
 if(S.nfInit)return;S.nfInit=true;
 const name=(S.profile&&S.profile.firstName)||'trader';
 nf({type:'system',tone:'gold',icon:'crown',go:'connect',key:'welcome1',title:'Welcome, '+name,text:'Your journal lives only on this PC. Connect MetaTrader 5 to start syncing trades.'});
 nf({type:'system',tone:'blue',icon:'bell',key:'welcome2',title:'Notifications are on',text:'Account changes, synced trades, goals and security events show up here.'});
}

/* ---- the panel ---- */
function nfStatusHtml(){
 const synced=(typeof SYNCED!=='undefined'?SYNCED.filter(t=>!t.open).length:0),on=SRV.connections.filter(c=>c.status==='online').length;
 return `<div class="nf-st"><span><b>${on}</b> terminal${on===1?'':'s'} online</span><span><b>${synced}</b> trades synced</span><span><b>${Object.keys(S.journal||{}).length}</b> journal days</span><span>${S.alerts&&S.alerts.dailyReminder?'Reminder '+esc(S.alerts.reminderTime):'Reminder off'}</span></div>`;
}
const NF_DWELL=600; // how long the pointer rests on a new notification before it counts as read (ms)
let nfHoverTimer=0;
const nfCount=k=>nfList().filter(n=>!n.read&&(k==='all'||n.type===k)).length;
function nfDayLabel(ts){
 const d=new Date(ts),t=new Date(),diff=Math.round((new Date(t.getFullYear(),t.getMonth(),t.getDate())-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/864e5);
 return diff<=0?'Today':diff===1?'Yesterday':d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
}
function nfItemHtml(n,i){
 return `<div class="nf-item tone-${n.tone}${n.read?'':' unread'}" data-nf-id="${n.id}" tabindex="0" role="button" style="--i:${Math.min(i,8)}"><span class="nf-ic">${ic(n.icon,16)}</span><div class="nf-b"><b>${esc(n.title)}</b>${n.text?`<small>${esc(n.text)}</small>`:''}</div><div class="nf-side"><span class="nf-time" title="${esc(new Date(n.t).toLocaleString())}">${nfAgo(n.t)}</span></div><div class="nf-tools">${n.go?`<button type="button" class="nf-open" aria-label="Open" title="Open">${ic('right',12)}</button>`:''}<button type="button" class="nf-x" data-nf-del="${n.id}" aria-label="Dismiss" title="Dismiss">${ic('x',12)}</button></div><i class="nf-prog"></i></div>`;
}
function nfItemsHtml(){
 const list=nfList().filter(n=>nfFilter==='all'||n.type===nfFilter);
 if(!list.length)return `<div class="nf-empty"><span class="nf-check">${ic('check',22)}</span><b>${nfFilter==='all'?'You’re all caught up':'Nothing here yet'}</b><small>New account, trade and security events will appear here.</small></div>`;
 let html='',day='';
 list.forEach((n,i)=>{const d=nfDayLabel(n.t);if(d!==day){day=d;html+=`<div class="nf-day">${esc(d)}</div>`}html+=nfItemHtml(n,i)});
 return html;
}
function nfSubHtml(n){return n?`<b>${n}</b> unread`:'You’re all caught up'}
const nfHintHtml=n=>n?`<div class="nf-hint">${ic('radio',11)}Rest the pointer on a new notification to mark it read</div>`:'';
function nfHtml(){
 const n=nfUnread();
 return `<div class="nf-head"><span class="nf-hic">${ic('bell',18)}</span><div class="nf-ht"><h4>Notifications</h4><span class="nf-sub${n?'':' ok'}">${nfSubHtml(n)}</span></div><div class="nf-acts"><button type="button" data-nf="read" class="${n?'':'dim'}">${ic('check',12)}Mark all read</button><button type="button" data-nf="clear">${ic('trash',12)}Clear all</button></div></div>
  <div class="nf-tabs">${NF_CATS.map(([k,l])=>{const c=nfCount(k);return `<button type="button" data-nf-tab="${k}" class="${k===nfFilter?'on':''}">${l}${c?`<em class="nf-n">${c}</em>`:''}</button>`}).join('')}</div>
  <div class="nf-hintwrap">${nfHintHtml(n)}</div><div class="nf-list">${nfItemsHtml()}</div>${nfStatusHtml()}`;
}
// counts (header, tabs, bell) follow reads and deletions instantly, without redrawing the list under the pointer
function nfSyncCounts(){
 if(!nfPanel)return;
 const n=nfUnread(),sub=nfPanel.querySelector('.nf-sub');
 if(sub){sub.innerHTML=nfSubHtml(n);sub.classList.toggle('ok',!n)}
 nfPanel.querySelectorAll('[data-nf-tab]').forEach(b=>{const c=nfCount(b.dataset.nfTab);let e=b.querySelector('.nf-n');
  if(c){if(!e){e=document.createElement('em');e.className='nf-n';b.appendChild(e)}if(e.textContent!==String(c)){e.textContent=c;if(!calm()){e.style.animation='none';void e.offsetWidth;e.style.animation=''}}}else if(e)e.remove()});
 const all=nfPanel.querySelector('[data-nf="read"]');if(all)all.classList.toggle('dim',!n);
 const hw=nfPanel.querySelector('.nf-hintwrap');if(hw&&!!hw.firstElementChild!==!!n)hw.innerHTML=nfHintHtml(n);
}
function nfMarkRead(id){
 const n=nfList().find(x=>x.id===id);if(!n||n.read)return false;
 n.read=true;save();nfBadge();
 if(nfPanel){const row=nfPanel.querySelector(`[data-nf-id="${id}"]`);
  if(row){row.classList.remove('unread');if(!calm()){row.classList.add('just-read');setTimeout(()=>row.classList.remove('just-read'),700)}}
  nfSyncCounts()}
 return true;
}
function nfRefresh(){
 clearTimeout(nfHoverTimer);
 if(!nfPanel||!document.body.contains(nfPanel)){nfPanel=null;return}
 const list=nfPanel.querySelector('.nf-list'),top=list?list.scrollTop:0;
 nfPanel.innerHTML=nfHtml();const l2=nfPanel.querySelector('.nf-list');if(l2)l2.scrollTop=top;
}
function nfOpen(anchor){
 nfFilter='all';
 const p=pop(anchor,nfHtml(),'nf-pop');nfPanel=p;
 p.style.setProperty('--dwell',NF_DWELL+'ms');
 // resting the pointer on a new notification marks it read; moving away first cancels it
 p.addEventListener('mouseover',e=>{const row=e.target.closest('.nf-item.unread');if(!row||row.contains(e.relatedTarget))return;clearTimeout(nfHoverTimer);nfHoverTimer=setTimeout(()=>nfMarkRead(row.dataset.nfId),NF_DWELL)});
 p.addEventListener('mouseout',e=>{const row=e.target.closest('.nf-item');if(!row||row.contains(e.relatedTarget))return;clearTimeout(nfHoverTimer)});
 p.addEventListener('keydown',e=>{const row=e.target.closest&&e.target.closest('.nf-item');if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();row.click()}});
 p.addEventListener('click',e=>{
  const t=e.target;
  const tab=t.closest('[data-nf-tab]');if(tab){nfFilter=tab.dataset.nfTab;nfRefresh();return}
  const act=t.closest('[data-nf]');
  if(act){
   if(act.dataset.nf==='read'){nfList().forEach(n=>n.read=true);save();nfBadge();
    nfPanel.querySelectorAll('.nf-item.unread').forEach((row,i)=>setTimeout(()=>{row.classList.remove('unread');if(!calm())row.classList.add('just-read')},calm()?0:Math.min(i,12)*45));nfSyncCounts()}
   if(act.dataset.nf==='clear'){S.notifs=[];save();nfBadge();nfRefresh()}
   return;
  }
  const del=t.closest('[data-nf-del]');
  if(del){const row=del.closest('.nf-item');S.notifs=nfList().filter(n=>n.id!==del.dataset.nfDel);save();nfBadge();
   if(row&&!document.documentElement.classList.contains('reduce-motion')){row.classList.add('out');nfSyncCounts();setTimeout(nfRefresh,260)}else nfRefresh();return}
  const item=t.closest('.nf-item');
  if(item){
   const n=nfList().find(x=>x.id===item.dataset.nfId);if(!n)return;
   nfMarkRead(n.id);
   if(n.go){closePops();if(n.go.startsWith('settings:'))openSettings(n.go.slice(9));else go(n.go)}
  }
 });
 clearInterval(nfClock);nfClock=setInterval(()=>{if(nfPanel&&document.body.contains(nfPanel)){if(!nfPanel.querySelector('.nf-item:hover'))nfRefresh()}else clearInterval(nfClock)},30000);
}
(function nfInit(){
 nfBadge();
 try{if(window.__tjJustSignedIn){const u=(window.TJ_AUTH&&TJ_AUTH.user)||{};nf({type:'security',tone:'green',icon:'shield',key:'signin|'+new Date().toISOString().slice(0,16),title:'Signed in',text:'Welcome back, '+(u.firstName||u.username||'trader')+'. Signed in on this PC at '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'.'})}}catch(e){/* ignore */}
 setTimeout(nfWelcome,2500);
 setInterval(nfPeriodic,20000);setTimeout(nfPeriodic,4000);
})();


/* ================= APP MOTION: page entrance (called from go()) ================= */
function pgEnter(p){
 const el=document.getElementById('page-'+p);if(!el||calm())return;
 el.classList.remove('entering');void el.offsetWidth;el.classList.add('entering');
 clearTimeout(el._et);el._et=setTimeout(()=>el.classList.remove('entering'),2200);
 if(p==='logging'){
  document.querySelectorAll('#logBody tr').forEach((r,i)=>r.style.setProperty('--r',Math.min(i,16)));
  setTimeout(()=>document.querySelectorAll('#logBody tr:nth-child(-n+12) td:nth-child(8)').forEach(settingsCount),260);
 }
 if(p==='connect')document.querySelectorAll('#cnList>*').forEach((c,i)=>c.style.setProperty('--r',Math.min(i,6)));
 if(p==='settings'){const c=document.getElementById('settingsContent');if(c&&c.children.length)animatePanel(c,0)}   // the open tab slides in each time the page opens
}
