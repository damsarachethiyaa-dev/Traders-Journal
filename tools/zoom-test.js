// Dev check: drives the running app over the debug port and fires Ctrl+wheel events.
// Run: node --experimental-websocket tools/zoom-test.js   (app started with --remote-debugging-port=9333)
(async () => {
  const targets = await (await fetch('http://127.0.0.1:9333/json')).json();
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = {};
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (pending[d.id]) { pending[d.id](d); delete pending[d.id]; } });
  const ev = expr => new Promise(r => { const i = ++id; pending[i] = d => r(d.result && d.result.result ? d.result.result.value : d); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } })); });
  const wheel = dy => ev(`window.dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY:${dy},cancelable:true}));new Promise(r=>setTimeout(()=>r(window.devicePixelRatio),150))`);
  console.log('start dpr', await ev('window.devicePixelRatio'));
  console.log('ctrl+wheel up  ->', await wheel(-100));
  console.log('ctrl+wheel up  ->', await wheel(-100));
  console.log('ctrl+wheel down->', await wheel(100));
  console.log('plain wheel (no ctrl) ->', await ev(`window.dispatchEvent(new WheelEvent('wheel',{deltaY:-100}));window.devicePixelRatio`));
  console.log('reset via Ctrl+0 ->', await ev(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'0',ctrlKey:true,cancelable:true}));new Promise(r=>setTimeout(()=>r(window.devicePixelRatio),150))`));
  ws.close();
})();
