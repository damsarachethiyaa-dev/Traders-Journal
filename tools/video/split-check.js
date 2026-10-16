const fs=require('fs');const n=JSON.parse(fs.readFileSync('narration.json','utf8'));
const sp=s=>s.split(/(?<=[.!?”])\s+/).filter(Boolean);
for(const s of n){const a=sp(s.speak),b=sp(s.cap);console.log(s.id,a.length,b.length,a.length===b.length?'':'  <-- MISMATCH');if(a.length!==b.length){console.log(a);console.log(b)}}
