// Bounded, deterministic AVR GPIO edge capture. Browser/worker-safe, no remote calls.
export const LOGIC_PINS=Object.freeze(Array.from({length:12},(_,i)=>`D${i+2}`));
export const MAX_EDGES_PER_PIN=64;
const LEVELS=new Set(['high','low','pullup','input']);

export function newLogicTrace(limit=MAX_EDGES_PER_PIN){
 if(!Number.isInteger(limit)||limit<2||limit>256)throw Error('Invalid bounded trace capacity.');
 return {edges:Object.fromEntries(LOGIC_PINS.map(pin=>[pin,[]])),dropped:Object.fromEntries(LOGIC_PINS.map(pin=>[pin,0])),limit};
}

export function captureLogicPins(trace,pins,ms){
 if(!trace?.edges||!Number.isFinite(ms)||ms<0)return trace;
 const time=Math.round(ms*100)/100;
 for(const pin of LOGIC_PINS){
  const level=pins?.[pin];if(!LEVELS.has(level))continue;
  const edges=trace.edges[pin];if(!Array.isArray(edges))continue;
  const last=edges.at(-1);
  if(last?.level===level||last&&time<last.ms)continue;
  edges.push({ms:time,level});
  if(edges.length>trace.limit){edges.shift();trace.dropped[pin]++;}
 }
 return trace;
}

export function logicTraceCsv(edges,selected=LOGIC_PINS){
 const channels=[...new Set(selected)].filter(pin=>LOGIC_PINS.includes(pin));
 const events=channels.flatMap(pin=>(edges?.[pin]||[]).filter(e=>Number.isFinite(e.ms)&&LEVELS.has(e.level)).map(e=>({ms:e.ms,pin,level:e.level})))
   .sort((a,b)=>a.ms-b.ms||a.pin.localeCompare(b.pin));
 return 'simulated_ms,pin,level\n'+events.map(e=>`${e.ms.toFixed(2)},${e.pin},${e.level}`).join('\n')+(events.length?'\n':'');
}

export function logicWavePath(events=[],nowMs=0,windowMs=5000){
 if(!events.length||!Number.isFinite(nowMs)||!Number.isFinite(windowMs)||windowMs<=0)return '';
 const end=Math.max(1,nowMs),start=Math.max(0,end-windowMs),width=584;
 const x=ms=>Math.max(8,Math.min(592,8+(ms-start)/(end-start||1)*width));
 const y=level=>level==='high'?19:level==='low'?59:39;
 const earlier=[...events].reverse().find(e=>e.ms<=start);
 const first=earlier||events.find(e=>e.ms>=start&&e.ms<=end);
 if(!first)return '';
 let d=`M ${earlier?8:x(first.ms)} ${y(first.level)}`;
 for(const event of events){if(event.ms<=start||event.ms>end||event===first)continue;d+=` H ${x(event.ms)} V ${y(event.level)}`;}
 return d+' H 592';
}
