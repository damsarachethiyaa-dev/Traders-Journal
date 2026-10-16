const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {showAppIntro}=require('../../app-intro.js');
class FakeWindow extends EventEmitter{
 constructor(options){super();this.options=options;this.webContents=new EventEmitter();this.webContents.setWindowOpenHandler=f=>this.openHandler=f;FakeWindow.last=this;this.destroyed=false;}
 setMenu(){} center(){} show(){this.shown=true;} focus(){} isDestroyed(){return this.destroyed;}
 destroy(){this.destroyed=true;this.emit('closed');}
 loadFile(file){this.file=file;return Promise.resolve();}
}
function setup(timeout=1000){const ipcMain=new EventEmitter();let count=0;const c=showAppIntro({BrowserWindow:FakeWindow,ipcMain,onFinish:()=>count++,timeout});assert.ok(c,'Render the intro media before testing.');return{c,ipcMain,w:FakeWindow.last,count:()=>count};}
test('intro IPC rejects other renderers, finishes once and cleans its listener',()=>{
 const {c,ipcMain,w,count}=setup();
 assert.equal(w.options.webPreferences.sandbox,true);assert.equal(w.options.webPreferences.contextIsolation,true);assert.equal(w.options.webPreferences.nodeIntegration,false);
 assert.deepEqual(w.openHandler(),{action:'deny'});
 ipcMain.emit('tj:intro:finish',{sender:{}});assert.equal(c.active,true);
 ipcMain.emit('tj:intro:finish',{sender:w.webContents});assert.equal(c.active,false);assert.equal(count(),1);assert.equal(w.destroyed,true);assert.equal(ipcMain.listenerCount('tj:intro:finish'),0);
 c.finish();assert.equal(count(),1);
});
test('closing the intro releases the app',()=>{const {c,w,count}=setup();w.destroy();assert.equal(c.active,false);assert.equal(count(),1);});
test('renderer failure releases the app',()=>{const {c,w,count}=setup();w.webContents.emit('render-process-gone');assert.equal(c.active,false);assert.equal(count(),1);});
test('failed page load releases the app',()=>{const {c,w,count}=setup();w.webContents.emit('did-fail-load',{},-6);assert.equal(c.active,false);assert.equal(count(),1);});
test('timeout releases the app if video playback stalls',async()=>{const {c,count}=setup(20);await new Promise(r=>setTimeout(r,45));assert.equal(c.active,false);assert.equal(count(),1);});
