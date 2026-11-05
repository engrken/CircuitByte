// Browser-safe, bounded educational DC solver for CircuitByte's existing Uno netlist.
// No user code evaluation, remote APIs, SPICE/transients, or claims of physical validation.
import {allEndpoints,analyzeCircuit,canonicalBreadboardNode,normalizeCircuit} from './studio-circuit-builder.mjs';

const OHM={resistor:330,ldr:10000};
const SUPPLIES=[['uno:GND',0],['uno:5V',5],['uno:3.3V',3.3]];
const MODELED=new Set(['resistor','ldr','potentiometer','button','led']);
const MAX_NODES=50;

function netsFor(project){
 const parents=new Map(allEndpoints(project.parts).map(id=>[id,id]));
 const root=id=>{let p=parents.get(id);if(p===undefined)return null;while(p!==parents.get(p))p=parents.get(p);return p;};
 const unite=(a,b)=>{const x=root(a),y=root(b);if(x!==null&&y!==null&&x!==y)parents.set(x,y);};
 const rows=new Map();
 for(const id of parents.keys()){
  const row=canonicalBreadboardNode(id);
  if(!row)continue;
  if(rows.has(row))unite(id,rows.get(row));else rows.set(row,id);
 }
 for(const wire of project.wires)unite(wire.a,wire.b);
 const byRoot=new Map();
 for(const id of parents.keys()){
  const r=root(id);
  if(!byRoot.has(r))byRoot.set(r,[]);
  byRoot.get(r).push(id);
 }
 return {root,byRoot};
}

function solveMatrix(a,b){
 const n=b.length;
 for(let col=0;col<n;col++){
  let pivot=col;
  for(let row=col+1;row<n;row++)if(Math.abs(a[row][col])>Math.abs(a[pivot][col]))pivot=row;
  if(Math.abs(a[pivot][col])<1e-14)return null;
  [a[col],a[pivot]]=[a[pivot],a[col]];[b[col],b[pivot]]=[b[pivot],b[col]];
  const scale=a[col][col];
  for(let j=col;j<n;j++)a[col][j]/=scale;
  b[col]/=scale;
  for(let row=0;row<n;row++){
   if(row===col)continue;
   const factor=a[row][col];if(!factor)continue;
   for(let j=col;j<n;j++)a[row][j]-=factor*a[col][j];
   b[row]-=factor*b[col];
  }
 }
 return b;
}

/** Options: drivePin (D2-D13 or ''), driveHigh, buttonClosed, potPercent (0..100), ldrOhms (100..1000000). */
export function simulateDcCircuit(input,options={}){
 const project=normalizeCircuit(input);
 const review=analyzeCircuit(project);
 const unsupported=project.parts.filter(p=>!MODELED.has(p.type)).map(p=>p.id);
 const base={scope:'Steady-state educational DC only. LED: fixed 2 V threshold and 10 Ω on-resistance; no tolerances, supply limits, MCU firmware or sensor behavior.',unsupported};
 if(review.errors.length)return {...base,status:'blocked',reason:'Resolve the static electrical errors before measuring.',readings:{},currents:{},sources:{}};
 const {root}=netsFor(project);
 const voltage=new Map();
 const setSource=(endpoint,value)=>{
  const net=root(endpoint);
  if(voltage.has(net)&&Math.abs(voltage.get(net)-value)>1e-6)return false;
  voltage.set(net,value);return true;
 };
 for(const [pin,value] of SUPPLIES)if(!setSource(pin,value))return {...base,status:'blocked',reason:'Conflicting ideal supply rails.',readings:{},currents:{},sources:{}};
 const pin=/^D(?:[2-9]|1[0-3])$/.test(options.drivePin||'')?options.drivePin:'';
 if(pin&&!setSource('uno:'+pin,options.driveHigh?5:0))return {...base,status:'blocked',reason:'Selected GPIO drive conflicts with a connected power rail. Remove the conflict before measuring.',readings:{},currents:{},sources:{}};
 const potPercent=Math.max(0,Math.min(100,Number.isFinite(options.potPercent)?options.potPercent:50));
 const ldrOhms=Math.max(100,Math.min(1e6,Number.isFinite(options.ldrOhms)?options.ldrOhms:1e4));
 const elements=[];
 const add=(id,a,b,ohms,type='resistor')=>{if(root(a)!==root(b))elements.push({id,a:root(a),b:root(b),ohms,type});};
 for(const part of project.parts){
  const ep=x=>part.id+':'+x;
  if(part.type==='resistor'||part.type==='ldr')add(part.id,ep('A'),ep('B'),part.type==='ldr'?ldrOhms:OHM.resistor);
  if(part.type==='button'&&options.buttonClosed)add(part.id,ep('A'),ep('B'),0.1,'button');
  if(part.type==='potentiometer'){
   add(part.id+':upper',ep('VCC'),ep('WIPER'),Math.max(0.1,10000*(100-potPercent)/100),'potentiometer');
   add(part.id+':lower',ep('WIPER'),ep('GND'),Math.max(0.1,10000*potPercent/100),'potentiometer');
  }
  if(part.type==='led'&&root(ep('A'))!==root(ep('K')))elements.push({id:part.id,a:root(ep('A')),b:root(ep('K')),ohms:10,type:'led'});
 }
 const activeNets=new Set(voltage.keys());
 for(const elem of elements){activeNets.add(elem.a);activeNets.add(elem.b);}
 if(activeNets.size>MAX_NODES)return {...base,status:'unsupported',reason:'Circuit exceeds the 50-node DC solver limit.',readings:{},currents:{},sources:{}};
 const unknown=[...activeNets].filter(n=>!voltage.has(n));
 const positions=new Map(unknown.map((node,i)=>[node,i]));
 let diodeOn=new Set(),solution=null,converged=false;
 for(let iteration=0;iteration<20;iteration++){
  const n=unknown.length,a=Array.from({length:n},()=>new Float64Array(n)),b=new Float64Array(n);
  // Small numerical reference conductance; floating readings are suppressed separately.
  for(let i=0;i<n;i++)a[i][i]=1e-10;
  for(const e of elements){
   if(e.type==='led'&&!diodeOn.has(e.id))continue;
   const g=1/e.ohms,ia=positions.get(e.a),ib=positions.get(e.b);
   if(ia!==undefined){a[ia][ia]+=g;if(ib!==undefined)a[ia][ib]-=g;else b[ia]+=g*voltage.get(e.b);}
   if(ib!==undefined){a[ib][ib]+=g;if(ia!==undefined)a[ib][ia]-=g;else b[ib]+=g*voltage.get(e.a);}
   if(e.type==='led'){
    if(ia!==undefined)b[ia]+=g*2;
    if(ib!==undefined)b[ib]-=g*2;
   }
  }
  const found=solveMatrix(a,b);
  if(!found)return {...base,status:'unsupported',reason:'Unable to solve this network reliably.',readings:{},currents:{},sources:{}};
  solution=new Map(voltage);
  for(let i=0;i<unknown.length;i++)solution.set(unknown[i],found[i]);
  const next=new Set(elements.filter(e=>e.type==='led'&&solution.get(e.a)-solution.get(e.b)>1.999).map(e=>e.id));
  if(next.size===diodeOn.size&&[...next].every(id=>diodeOn.has(id))){converged=true;break;}
  diodeOn=next;
 }
 if(!converged)return {...base,status:'unsupported',reason:'LED operating point did not converge.',readings:{},currents:{},sources:{}};
 // A node needs a conductive route to an ideal source; standalone floating nets are not a measured 0 V.
 const adjacency=new Map([...activeNets].map(n=>[n,new Set()]));
 for(const e of elements){if(e.type==='led'&&!diodeOn.has(e.id))continue;adjacency.get(e.a).add(e.b);adjacency.get(e.b).add(e.a);}
 const anchored=new Set(voltage.keys()),queue=[...anchored];
 while(queue.length){for(const other of adjacency.get(queue.shift())||[])if(!anchored.has(other)){anchored.add(other);queue.push(other);}}
 const readings={};
 for(const endpoint of allEndpoints(project.parts)){
  const net=root(endpoint);
  readings[endpoint]=anchored.has(net)&&solution.has(net)?{status:'modeled',volts:Math.round(solution.get(net)*10000)/10000}:{status:'floating',volts:null};
 }
 const currents={};
 for(const e of elements){
  const a=solution.get(e.a),b=solution.get(e.b),isAnchored=anchored.has(e.a)&&anchored.has(e.b);
  const amps=!isAnchored?null:e.type==='led'?diodeOn.has(e.id)?Math.max(0,(a-b-2)/e.ohms):0:(a-b)/e.ohms;
  currents[e.id]={status:amps===null?'floating':'modeled',amps:amps===null?null:Math.round(amps*1e8)/1e8};
 }
 return {...base,status:'modeled',reason:unsupported.length?'Unmodeled components are treated as disconnected from the electrical solver.':'Modeled passive and LED network solved.',readings,currents,sources:Object.fromEntries([...voltage].map(([n,v])=>[n,v]))};
}

export function measureDcVoltage(sim,a,b='uno:GND'){
 const one=sim?.readings?.[a],two=sim?.readings?.[b];
 if(one?.status!=='modeled'||two?.status!=='modeled')return null;
 return Math.round((one.volts-two.volts)*10000)/10000;
}
