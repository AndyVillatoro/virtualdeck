const ws = new WebSocket(process.argv[2]);
let id=0; const pend=new Map();
ws.onmessage=(m)=>{const o=JSON.parse(m.data);if(pend.has(o.id)){pend.get(o.id)(o);pend.delete(o.id)}};
const send=(m,p)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}))});
ws.onopen = async ()=>{ await new Promise(r=>setTimeout(r,2000));
  const r=await send('Runtime.evaluate',{expression:process.argv[3],returnByValue:true,awaitPromise:true});
  console.log(r.result?.result?.value ?? JSON.stringify(r.result)); process.exit(0); };
