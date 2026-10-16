const fs=require('fs');const n=JSON.parse(fs.readFileSync('narration.json','utf8'));
const sp=s=>s.split(/(?<=[.!?”])\s+/).filter(Boolean);
const out=n.map(s=>{const a=sp(s.speak),b=sp(s.cap);return{id:s.id,tag:s.tag,lines:a.map((x,i)=>({speak:x,cap:b[i]}))}});
fs.writeFileSync('lines.json',JSON.stringify(out,null,1));
console.log(out.reduce((a,s)=>a+s.lines.length,0),'lines');
