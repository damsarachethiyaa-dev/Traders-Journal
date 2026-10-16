'use strict';

P.crown='<path d="m2 5 5 4 5-6 5 6 5-4-3 13H5L2 5Z"/><path d="M5 21h14"/>';
P.globe='<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z"/>';
P.mail='<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>';
P.alert='<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4M12 17h.01"/>';
P.pencil='<path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/><path d="m14 5 5 5"/>';
$$('i[data-ic="crown"]').forEach(el=>{el.innerHTML=ic('crown',+el.dataset.s||16)});

const SETTINGS_SECTIONS=[
 ['profile','Profile','Personal details & identity','user'],
 ['account','Account','Balance, goals & appearance','wallet'],
 ['trading','Trading','Logging defaults & risk plan','scale'],
 ['alerts','Alerts','Notifications & reminders','bell'],
 ['subscription','Membership','Your KING edition','crown'],
 ['security','Privacy & data','Local storage & backups','shield'],
 ['danger','Danger Zone','Reset local journal data','alert']
];
const PROFILE_DEFAULTS={firstName:'Chethiya',lastName:'Rathnasekara',username:'damsara.chethiyaaop8l',email:'damsara.chethiyaa@gmail.com',phone:'',country:'Sri Lanka',location:'',bio:'',photo:'',joined:new Date().toISOString()};
const PREFERENCE_DEFAULTS={theme:'dark',range:'30',collapsed:true,density:'comfortable',reducedMotion:false,maskBalances:false,accountName:'Main Account',monthlyGoal:0};
const TRADING_DEFAULTS={riskPercent:1,dailyLoss:0,maxTrades:0,quantity:1,fees:0,strategy:'',market:'Forex'};
const ALERT_DEFAULTS={desktop:false,dailyReminder:false,tradeMessages:true,reminderTime:'20:00',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Colombo',lastReminderDay:''};
S.profile={...PROFILE_DEFAULTS,...S.profile};
S.preferences={...PREFERENCE_DEFAULTS,...S.preferences};
S.trading={...TRADING_DEFAULTS,...S.trading};
S.alerts={...ALERT_DEFAULTS,...S.alerts};
let settingsTab='profile',profileEditing=false,settingsDirty=false,settingsRendered='';

function profileFullName(){return [S.profile.firstName,S.profile.lastName].filter(Boolean).join(' ')||'Your profile'}
function avatarMarkup(){
 const initials=[S.profile.firstName,S.profile.lastName].map(x=>String(x||'').slice(0,1)).join('').toUpperCase()||'TJ';
 const photo=/^data:image\/(png|jpeg|webp);base64,/.test(S.profile.photo||'')?`<img src="${esc(S.profile.photo)}" alt="${esc(profileFullName())}'s profile photo">`:`<span aria-hidden="true">${esc(initials)}</span>`;
 return photo+`<span class="king-crown" title="KING member" aria-label="KING member">${ic('crown',15)}</span>`;
}
function updateProfileUI(){
 const avatar=avatarMarkup();
 $$('[data-avatar]').forEach(el=>{if(el.innerHTML!==avatar)el.innerHTML=avatar});
 $$('[data-profile-name]').forEach(el=>el.textContent=profileFullName());
 $('#greetName').textContent=S.profile.firstName||'Trader';
 document.body.classList.toggle('compact',S.preferences.density==='compact');
 document.body.classList.toggle('mask-balances',!!S.preferences.maskBalances);
 document.documentElement.classList.toggle('reduce-motion',!!S.preferences.reducedMotion);
}
function openSettings(tab='profile'){
 settingsTab=SETTINGS_SECTIONS.some(s=>s[0]===tab)?tab:'profile';
 profileEditing=false;settingsDirty=false;closePops();go('settings');
}
function setPanelHeading(title,description){return `<div class="settings-panel-title"><div><h3>${title}</h3><p>${description}</p></div></div>`}
function settingsField(name,label,value,type='text',extra='',hint=''){
 return `<label class="set-field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}>${hint?`<small>${hint}</small>`:''}</label>`;
}
function settingsSelect(name,label,value,options,hint=''){
 return `<label class="set-field">${label}<select name="${name}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select>${hint?`<small>${hint}</small>`:''}</label>`;
}
function settingsToggle(group,key,label,description){return `<div class="set-row"><div><b>${label}</b><small>${description}</small></div><input class="set-switch" type="checkbox" data-setting-group="${group}" data-setting-key="${key}" aria-label="${label}" ${S[group][key]?'checked':''}></div>`}
function settingsFormActions(cancel=false){return `<div class="settings-form-actions">${cancel?'<button type="button" class="set-btn" data-settings-action="cancel-profile">Cancel</button>':''}<button class="set-btn primary" type="submit">${ic('check',13)}Save changes</button></div>`}
function detailsRow(icon,label,value){return `<div class="detail-row"><span class="di">${ic(icon,13)}</span><span>${label}</span><b>${esc(value||'Not added')}</b></div>`}
function settingsMetric(label,value,note=''){return `<div class="set-metric"><small>${label}</small><b>${value}</b>${note?`<em>${note}</em>`:''}</div>`}

function profilePanel(){
 const p=S.profile;
 const joined=new Date(p.joined);const joinedLabel=Number.isNaN(+joined)?'Your personal workspace':`Member since ${joined.toLocaleDateString(undefined,{month:'long',year:'numeric'})}`;
 let html=setPanelHeading('Profile','Your identity, your journey. Make this workspace feel like you.');
 html+=`<div class="set-card profile-hero"><span class="king-avatar large" data-avatar></span><div><span class="king-text">KING MEMBER</span><h3>${esc(profileFullName())}</h3><div class="handle">@${esc(p.username||'trader')}</div><div class="member-since">${esc(joinedLabel)}</div></div><div class="profile-actions"><button class="set-btn blue" data-settings-action="edit-profile">${ic('pencil',13)}Edit profile</button></div></div>`;
 if(profileEditing){
  html+=`<form class="set-card settings-form" data-settings-form="profile">${settingsField('firstName','First name',p.firstName,'text','required maxlength="50"')}${settingsField('lastName','Last name',p.lastName,'text','maxlength="50"')}${settingsField('username','Username',p.username,'text','required maxlength="50"')}${settingsField('email','Email address',p.email,'email','maxlength="150"')}${settingsField('phone','Phone number',p.phone,'tel','maxlength="40"')}${settingsField('country','Country',p.country,'text','maxlength="60"')}${settingsField('location','City / location',p.location,'text','maxlength="80"')}<div class="set-field"><span>Profile photo</span><div class="set-inline"><button class="set-btn" type="button" data-settings-action="photo">${ic('user',13)}Upload photo</button><button class="set-btn" type="button" data-settings-action="remove-photo">Use initials</button></div><small>PNG, JPG or WebP. Stored locally on this PC.</small></div><label class="set-field full">About you<textarea name="bio" maxlength="1000" placeholder="Your trading journey, favorite markets, and what you are working towards…">${esc(p.bio)}</textarea></label>${settingsFormActions(true)}</form>`;
 }else{
  html+=`<div class="settings-columns"><div><span class="set-label">Personal details</span><div class="set-card details-card">${detailsRow('user','First name',p.firstName)}${detailsRow('user','Last name',p.lastName)}${detailsRow('globe','Country',p.country)}${detailsRow('globe','Location',p.location)}</div></div><div><span class="set-label">Contact & reach</span><div class="set-card details-card">${detailsRow('globe','Username',p.username?'@'+p.username:'')}${detailsRow('mail','Email address',p.email)}${detailsRow('user','Phone number',p.phone)}</div></div></div><span class="set-label">Your story</span><div class="set-card"><h4>${ic('book',15)}About you</h4><div class="set-about">${esc(p.bio||'Every great trader has a story. Add yours with Edit profile.')}</div></div>`;
 }
 return html;
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
 `<div class="set-metrics">${settingsMetric('Manual trades',S.live.length)}${settingsMetric('Journal days',Object.keys(S.journal).length)}${settingsMetric('Local journal size',size+' KB')}</div><div class="set-card"><h4>${ic('shield',15)}Private by design</h4>${detailsRow('lock','Data destination','This PC only')}${detailsRow('link','MT5 receiver',location.origin)}${detailsRow('crown','Membership','KING · Local edition')}${settingsToggle('preferences','maskBalances','Hide dashboard balances','Blur headline balances and trade P&L while sharing your screen.')}<div class="set-info">${ic('shield',16)}<div>This local app has no cloud login or password to change. Your Windows account controls access to files on this PC. Screen privacy is a visual mask, not encryption.</div></div></div><div class="set-card"><h4>${ic('download',15)}Backups & portability</h4><p>Download a JSON backup of your manual trades, notes, profile and preferences, plus a reference snapshot of synced trades. Restoring a backup replaces the local journal and preferences; MT5 connections and their live history are kept separately.</p><div class="set-inline" style="margin-top:18px"><button class="set-btn primary" data-settings-action="backup">${ic('download',13)}Download backup</button><button class="set-btn" data-settings-action="restore">${ic('refresh',13)}Restore journal</button><button class="set-btn" data-settings-action="csv">${ic('table',13)}Export trades CSV</button></div>${S.lastBackup?`<p style="margin-top:13px">Last backup download requested: ${esc(new Date(S.lastBackup).toLocaleString())}</p>`:''}</div><div class="set-card"><h4>${ic('folder',15)}Local storage</h4><p>Synced trades are stored in the desktop app's data folder. Manual trades, notes, profile and preferences are stored in this app's local browser storage. Back up before moving to another PC or reinstalling Windows.</p><button class="set-btn" style="margin-top:16px" data-settings-action="open-data">${ic('folder',13)}Open synced data folder</button></div>`;
}

function dangerPanel(){
 return setPanelHeading('Danger Zone','A fresh start should always be your decision.')+
 `<div class="set-card danger-card"><h4>${ic('alert',18)}Clear local journal</h4><p>Remove ${S.live.length} manual/imported trades and ${Object.keys(S.journal).length} journal days from this app. Synced MT5 trades, connections and your profile remain. This takes effect immediately; download a backup first if you want to keep a copy.</p><div class="danger-action"><div><b>Typed confirmation required</b><small>You will need to type CLEAR before anything is removed.</small></div><button class="set-btn danger" data-settings-action="clear-journal">${ic('trash',13)}Clear local journal</button></div></div><div class="set-card"><h4>${ic('settings',16)}Reset workspace preferences</h4><p>Restore the dark dashboard, collapsed sidebar, default trading preferences and reminder settings. Trades, notes, balance, currency and profile are kept.</p><button class="set-btn" style="margin-top:17px" data-settings-action="reset-preferences">Reset preferences</button></div><div class="set-info">${ic('shield',16)}<div>There is no remote account to delete. To remove a terminal connection and its synced trades, use the Disconnect action on the Connections page.</div></div>`;
}

function renderSettings(){
 if(settingsDirty&&settingsRendered===settingsTab)return;
 $('#settingsNav').innerHTML=SETTINGS_SECTIONS.map(([key,title,sub,icon])=>`<button data-settings-tab="${key}" class="${key===settingsTab?'active ':''}${key==='danger'?'danger ':''}${key==='subscription'?'nav-membership':''}" aria-current="${key===settingsTab?'page':'false'}"><span class="sn-icon">${ic(icon,17)}</span><span><b>${title}</b><small>${sub}</small></span><span class="sn-arrow">${ic('right',12)}</span></button>`).join('');
 const panels={profile:profilePanel,account:accountPanel,trading:tradingPanel,alerts:alertsPanel,subscription:membershipPanel,security:privacyPanel,danger:dangerPanel};
 $('#settingsContent').innerHTML=panels[settingsTab]();settingsRendered=settingsTab;updateProfileUI();
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
function chooseProfilePhoto(){
 const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';
 input.onchange=()=>{const file=input.files[0];if(!file)return;if(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))return toast('Choose a PNG, JPG or WebP under 8 MB.');
 const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onerror=()=>toast('That image could not be opened.');img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=192;const ctx=canvas.getContext('2d'),side=Math.min(img.width,img.height);ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,192,192);const previous=S.profile.photo;S.profile.photo=canvas.toDataURL('image/webp',.88);if(!save())S.profile.photo=previous;updateProfileUI();toast('Profile photo updated')};img.src=reader.result};reader.readAsDataURL(file)};input.click();
}
function chooseJournalBackup(){
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{const file=input.files[0];if(!file)return;
 try{if(file.size>15*1024*1024)throw new Error('Choose a backup under 15 MB.');const restored=validateJournalBackup(JSON.parse(await file.text()));confirmJournalAction('Restore local journal','RESTORE',`Replace the local journal with ${restored.live.length} manual trades and ${Object.keys(restored.journal).length} journal days? MT5 connections are kept.`,()=>{const previous={...S};Object.assign(S,restored);S.theme=S.preferences.theme;if(!save()){S=previous;return}settingsDirty=false;profileEditing=false;renderAll();toast('Local journal restored')})}catch(e){toast(e.message)}};input.click();
}

document.addEventListener('click',async e=>{
 const open=e.target.closest('[data-open-settings]');if(open){e.stopPropagation();openSettings(open.dataset.openSettings);return}
 const tab=e.target.closest('[data-settings-tab]');if(tab){settingsTab=tab.dataset.settingsTab;settingsDirty=false;profileEditing=false;renderSettings();return}
 const b=e.target.closest('[data-settings-action]');if(!b)return;const action=b.dataset.settingsAction;
 if(action==='edit-profile'){profileEditing=true;settingsDirty=false;renderSettings()}
 if(action==='cancel-profile'){profileEditing=false;settingsDirty=false;renderSettings()}
 if(action==='photo')chooseProfilePhoto();
 if(action==='remove-photo'){const previous=S.profile.photo;S.profile.photo='';if(!save())S.profile.photo=previous;updateProfileUI()}
 if(action.startsWith('zoom-')){if(!window.tjDesktop?.setZoom)return toast('Zoom controls are available in the desktop app.');const z=tjDesktop.getZoom();tjDesktop.setZoom(action==='zoom-reset'?1:z+(action==='zoom-in'?.1:-.1));$('#settingsZoom').textContent=Math.round(tjDesktop.getZoom()*100)+'%'}
 if(action==='test-notice'){const delivered=await showLocalNotice('Traders Journal · KING','Your local journal notifications are ready.');if(!delivered)toast(S.alerts.desktop?'Test shown in app. Desktop delivery depends on Windows notification settings.':'Test shown in app. Turn on desktop notifications for a system notification.')}
 if(action==='backup')downloadJournalBackup();
 if(action==='restore')chooseJournalBackup();
 if(action==='csv')exportCsv();
 if(action==='open-data'){if(!window.tjDesktop?.openDataFolder)return toast('Open data folder is available in the desktop app.');if(!(await tjDesktop.openDataFolder()))toast('Could not open the data folder.')}
 if(action==='clear-journal')confirmJournalAction('Clear local journal','CLEAR','This immediately removes your manual/imported trades and journal notes. Download a backup first. Synced MT5 data and your profile are kept.',()=>{const live=S.live,journal=S.journal;S.live=[];S.journal={};if(!save()){S.live=live;S.journal=journal;return}settingsDirty=false;renderAll();toast('Manual trades and journal notes cleared')});
 if(action==='reset-preferences')confirmJournalAction('Reset workspace preferences','RESET','Restore default display, trading and alert preferences. Your trades, notes, balance and profile are kept.',()=>{const previous={...S};S.preferences={...PREFERENCE_DEFAULTS};S.trading={...TRADING_DEFAULTS};S.alerts={...ALERT_DEFAULTS};S.theme='dark';if(!save()){S=previous;return}settingsDirty=false;renderAll();toast('Workspace preferences reset')});
});
document.addEventListener('input',e=>{if(e.target.closest('[data-settings-form]'))settingsDirty=true});
document.addEventListener('change',e=>{
 const el=e.target;if(el.matches('[data-setting-group]')){const group=el.dataset.settingGroup,key=el.dataset.settingKey,previous=S[group][key];S[group][key]=el.checked;if(!save()){S[group][key]=previous;el.checked=previous}updateProfileUI()}
 if(el.id==='reminderTime'&&el.value){S.alerts.reminderTime=el.value;save()}
 if(el.id==='reminderTimezone'){S.alerts.timezone=el.value;save()}
});
document.addEventListener('submit',e=>{
 const form=e.target;if(!form.matches('[data-settings-form]'))return;e.preventDefault();const data=Object.fromEntries(new FormData(form)),previous=JSON.parse(JSON.stringify(S));
 const section=form.dataset.settingsForm;
 if(section==='profile'){for(const k of ['firstName','lastName','username','email','phone','country','location','bio'])S.profile[k]=String(data[k]||'').trim()}
 if(section==='account'){S.startEquity=+data.startEquity;S.currency=data.currency;Object.assign(S.preferences,{accountName:data.accountName.trim(),monthlyGoal:+data.monthlyGoal||0,theme:data.theme,range:data.range,density:data.density,collapsed:data.collapsed==='true'});S.theme=data.theme;S.range=data.range}
 if(section==='trading'){Object.assign(S.trading,{market:data.market,strategy:data.strategy.trim(),quantity:+data.quantity,fees:+data.fees,riskPercent:+data.riskPercent,dailyLoss:+data.dailyLoss||0,maxTrades:+data.maxTrades||0})}
 if(!save()){S=previous;return}settingsDirty=false;profileEditing=false;renderAll();toast(section==='profile'?'Profile updated':'Preferences saved');
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#settingsConfirm')?.remove()});
$$('[data-page="settings"]').forEach(b=>b.onclick=()=>openSettings());
updateProfileUI();renderAll();setInterval(()=>checkJournalReminder(),30000);

