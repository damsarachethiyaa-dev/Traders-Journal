const fs=require('fs');const n=JSON.parse(fs.readFileSync('narration.json','utf8'));
const g=id=>n.find(x=>x.id===id);
g('d1').speak=g('d1').speak.replace('Check the bottom right corner. You should','Check the bottom right corner: you should');
g('e7').cap=g('e7').cap.replace('“TradersJournal Sync: connected” and','TradersJournal Sync: connected, and');
g('ts').cap+=' The full troubleshooting list is in the guide.';
fs.writeFileSync('narration.json',JSON.stringify(n,null,1));
