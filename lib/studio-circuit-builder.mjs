// CircuitByte Phase 2: conservative, deterministic educational breadboard netlist.
// This is not an electrical or firmware simulator. No arbitrary user code is executed.
export const CIRCUIT_SCHEMA = 1;
export const MAX_PARTS = 8;
export const MAX_WIRES = 100;
export const ROW_COUNT = 12;
export const BUILDER_STORAGE_KEY = 'circuitbyte.builder.phase2.v1';
export const BOARD_PINS = [
 ...Array.from({length: 12}, (_, i) => `D${i + 2}`),
 ...Array.from({length: 6}, (_, i) => `A${i}`),
 '5V','3.3V','GND'
];
export const PART_TYPES = Object.freeze({
 resistor: {name:'330 Ω resistor',short:'R',pins:['A','B'],hint:'A 330 Ω resistor limits LED current when placed in series.'},
 led: {name:'Red LED',short:'LED',pins:['A','K'],hint:'Anode (A) to positive through a resistor; cathode (K) to ground.'},
 button: {name:'Push button',short:'SW',pins:['A','B'],hint:'A normally-open two-terminal switch. It connects its pins only when pressed.'},
 potentiometer: {name:'10 kΩ potentiometer',short:'POT',pins:['VCC','WIPER','GND'],hint:'Connect the outer terminals to supply and ground; wiper to an analog input.'},
 ldr: {name:'Photoresistor (LDR)',short:'LDR',pins:['A','B'],hint:'Use with a fixed resistor as a voltage divider, not as a direct voltage output.'},
 buzzer: {name:'Passive piezo buzzer',short:'BZ',pins:['SIG','GND'],hint:'Passive buzzer; verify the exact module current and voltage before connecting.'},
 rgb: {name:'Common-cathode RGB LED',short:'RGB',pins:['R','G','B','K'],hint:'Each color requires its own current-limiting resistor. K is the shared cathode.'},
 ultrasonic: {name:'HC-SR04 ultrasonic',short:'HC-SR04',pins:['VCC','TRIG','ECHO','GND'],hint:'5 V sensor. ECHO may need level shifting for 3.3 V boards.'},
 tmp36: {name:'TMP36 analog temperature',short:'TMP36',pins:['VS','OUT','GND'],hint:'Confirm the pinout of the specific TMP36 package before powering.'},
 servo: {name:'Hobby servo (signal wiring)',short:'SERVO',pins:['SIG','VCC','GND'],hint:'Separate rated supply recommended. Never assume the Uno 5 V rail can supply stall current.'},
});
export const PART_TYPE_IDS = Object.keys(PART_TYPES);
const rowLetter = /^[a-j]$/;
export function canonicalBreadboardNode(id){
 const m=/^bb:([a-j])(\d{1,2})$/.exec(id);
 if(m){const n=Number(m[2]);if(n<1||n>ROW_COUNT)return null;return `bb:${'abcde'.includes(m[1])?'L':'R'}${n}`;}
 return id==='bb:+'||id==='bb:-'?id:null;
}
export function allEndpoints(parts=[]){
 const ids = BOARD_PINS.map(pin => `uno:${pin}`);
 ids.push('bb:+','bb:-');
 for(let row=1;row<=ROW_COUNT;row++)for(const letter of 'abcdefghij')ids.push(`bb:${letter}${row}`);
 for(const part of parts)if(PART_TYPES[part.type])for(const pin of PART_TYPES[part.type].pins)ids.push(`${part.id}:${pin}`);
 return ids;
}
export function newCircuit(){return {schema:CIRCUIT_SCHEMA,board:'arduino:avr:uno',name:'Untitled learning circuit',parts:[],wires:[]};}
function wire(a,b,id){return {id,a,b};}
export const CIRCUIT_TEMPLATES={
 blink:{name:'Safe LED blink with breadboard resistor',parts:[{id:'r1',type:'resistor'},{id:'led1',type:'led'}],wires:[
  wire('uno:D13','bb:a4','w1'),wire('bb:b4','r1:A','w2'),wire('r1:B','bb:b5','w3'),
  wire('bb:c5','led1:A','w4'),wire('led1:K','bb:c6','w5'),wire('bb:d6','uno:GND','w6')]},
 button:{name:'Push button with INPUT_PULLUP',parts:[{id:'sw1',type:'button'}],wires:[
  wire('uno:D2','bb:a4','w1'),wire('bb:c4','sw1:A','w2'),wire('sw1:B','bb:b5','w3'),wire('bb:c5','uno:GND','w4')]},
 potentiometer:{name:'Potentiometer analog input',parts:[{id:'pot1',type:'potentiometer'}],wires:[
  wire('uno:5V','bb:+','w1'),wire('uno:GND','bb:-','w2'),wire('bb:+','pot1:VCC','w3'),
  wire('bb:-','pot1:GND','w4'),wire('pot1:WIPER','uno:A0','w5')]},
 ultrasonic:{name:'HC-SR04 digital distance sensor',parts:[{id:'hc1',type:'ultrasonic'}],wires:[
  wire('uno:5V','hc1:VCC','w1'),wire('uno:GND','hc1:GND','w2'),
  wire('uno:D9','hc1:TRIG','w3'),wire('hc1:ECHO','uno:D10','w4')]}
 ,divider:{name:'5 V resistor divider — two 330 Ω resistors',parts:[{id:'r1',type:'resistor'},{id:'r2',type:'resistor'}],wires:[
  wire('uno:5V','bb:+','w1'),wire('bb:+','r1:A','w2'),wire('r1:B','bb:a5','w3'),
  wire('bb:b5','r2:A','w4'),wire('r2:B','bb:-','w5'),wire('bb:-','uno:GND','w6')]},
 'ldr-divider':{name:'LDR and 330 Ω resistor light-sensitive divider',parts:[{id:'r1',type:'resistor'},{id:'ldr1',type:'ldr'}],wires:[
  wire('uno:5V','r1:A','w1'),wire('r1:B','bb:a5','w2'),wire('bb:c5','ldr1:A','w3'),
  wire('ldr1:B','uno:GND','w4')]}
};
export function fromTemplate(key='blink'){
 const t=CIRCUIT_TEMPLATES[key];if(!t)throw Error('Unknown teaching template.');
 return {schema:CIRCUIT_SCHEMA,board:'arduino:avr:uno',name:t.name,parts:t.parts.map(p=>({...p})),wires:t.wires.map(w=>({...w}))};
}
function validId(id){return typeof id==='string'&&/^[a-z][a-z0-9]{0,15}$/.test(id);}
export function normalizeCircuit(input){
 if(!input||typeof input!=='object'||input.schema!==CIRCUIT_SCHEMA||input.board!=='arduino:avr:uno'||!Array.isArray(input.parts)||!Array.isArray(input.wires))throw Error('Only CircuitByte Uno builder schema v1 JSON is supported.');
 if(input.parts.length>MAX_PARTS||input.wires.length>MAX_WIRES)throw Error('Circuit exceeds component or wiring limits.');
 const seen=new Set(),parts=[];
 for(const p of input.parts){
  if(!p||!validId(p.id)||!Object.hasOwn(PART_TYPES,p.type)||seen.has(p.id)||p.id==='uno'||p.id==='bb')throw Error('Invalid or duplicate component ID/type.');
  seen.add(p.id);parts.push({id:p.id,type:p.type});
 }
 const allowed=new Set(allEndpoints(parts));const wires=[],wireIds=new Set(),pairs=new Set();
 for(const w of input.wires){
  if(!w||!validId(w.id)||wireIds.has(w.id)||!allowed.has(w.a)||!allowed.has(w.b)||w.a===w.b)throw Error('Invalid, duplicate, or unknown wiring endpoint.');
  const pair=[w.a,w.b].sort().join('|');if(pairs.has(pair))throw Error('Duplicate wire found.');
  wireIds.add(w.id);pairs.add(pair);wires.push({id:w.id,a:w.a,b:w.b});
 }
 return {schema:CIRCUIT_SCHEMA,board:'arduino:avr:uno',name:String(input.name||'Learning circuit').slice(0,90),parts,wires};
}
export function addPart(input,type){
 const project=normalizeCircuit(input);
 if(!PART_TYPES[type])throw Error('Unsupported component type.');
 if(project.parts.length>=MAX_PARTS)throw Error(`Maximum of ${MAX_PARTS} components for this lesson workbench.`);
 let i=1;while(project.parts.some(p=>p.id===type.slice(0,3)+i))i++;
 return {...project,parts:[...project.parts,{id:type.slice(0,3)+i,type}]};
}
export function removePart(input,id){
 const project=normalizeCircuit(input);
 if(!project.parts.some(p=>p.id===id))return project;
 return {...project,parts:project.parts.filter(p=>p.id!==id),wires:project.wires.filter(w=>!w.a.startsWith(id+':')&&!w.b.startsWith(id+':'))};
}
export function removeWire(input,id){const project=normalizeCircuit(input);return {...project,wires:project.wires.filter(w=>w.id!==id)};}
function createUnionFind(project){
 const nodes=allEndpoints(project.parts),parents=new Map(nodes.map(n=>[n,n]));
 const root=node=>{let p=parents.get(node);if(p===undefined)return null;while(p!==parents.get(p))p=parents.get(p);return p;};
 const join=(a,b)=>{const x=root(a),y=root(b);if(x!==null&&y!==null&&x!==y)parents.set(x,y);};
 const groups=new Map();
 for(const node of nodes){const group=canonicalBreadboardNode(node);if(!group)continue;if(groups.has(group))join(groups.get(group),node);else groups.set(group,node);}
 for(const w of project.wires)join(w.a,w.b);
 return {root,connected:(a,b)=>root(a)!==null&&root(a)===root(b)};
}
function buildIssue(level,code,message){return {level,code,message};}
export function analyzeCircuit(input){
 const project=normalizeCircuit(input),uf=createUnionFind(project),issues=[];
 const add=(level,code,message)=>{if(!issues.some(i=>i.code===code&&i.message===message))issues.push(buildIssue(level,code,message));};
 const connected=uf.connected;
 if(connected('uno:5V','uno:GND'))add('error','POWER_GROUND_SHORT','The Uno 5 V supply is electrically connected to GND through the breadboard or wires.');
 if(connected('uno:3.3V','uno:5V'))add('error','POWER_RAIL_SHORT','The 3.3 V and 5 V rails are directly tied together.');
 if(connected('uno:3.3V','uno:GND'))add('error','THREE_VOLT_SHORT','The 3.3 V supply is connected directly to ground.');
 for(const part of project.parts){
  const terminals=PART_TYPES[part.type].pins;
  const endpoint=pin=>`${part.id}:${pin}`;
  const touches=pin=>project.wires.some(w=>w.a===endpoint(pin)||w.b===endpoint(pin));
  const power=terminals.includes('VCC')?'VCC':terminals.includes('VS')?'VS':null;
  if(power){
   if(connected(endpoint(power),'uno:GND'))add('error','PART_SUPPLY_TO_GND',part.id+' power terminal is tied to ground.');
   if(!touches(power))add('warning','PART_POWER_MISSING',part.id+' has no supply connection.');
  }
  if(terminals.includes('GND')){
   if(connected(endpoint('GND'),'uno:5V')||connected(endpoint('GND'),'uno:3.3V'))add('error','PART_GROUND_TO_POWER',part.id+' ground pin is tied to a supply rail.');
   if(!touches('GND'))add('warning','PART_GROUND_MISSING',part.id+' has no ground connection.');
  }
  if(part.type==='ultrasonic'&&connected(endpoint('VCC'),'uno:3.3V'))add('error','HC_SUPPLY_UNDERVOLTAGE','Standard HC-SR04 requires a verified 5 V supply.');
  if(part.type==='servo'&&connected(endpoint('VCC'),'uno:5V'))add('warning','SERVO_POWER','Servo stall current can overload Uno power. Prefer a suitable external regulated supply with common GND.');
  if(part.type==='potentiometer'&&connected(endpoint('VCC'),endpoint('GND')))add('error','POT_SHORT','Potentiometer outer power pins are directly shorted.');
  if(part.type==='potentiometer'||part.type==='tmp36'){
   const analog=part.type==='potentiometer'?'WIPER':'OUT';
   const digital=BOARD_PINS.filter(p=>/^D\d+$/.test(p)&&connected(endpoint(analog),'uno:'+p));
   if(digital.length)add('warning','ANALOG_SIGNAL_ON_DIGITAL',part.id+' analog output connects to '+digital.join(', ')+'. Use an ADC-capable A0–A5 input to read analog voltage.');
  }
  if(part.type==='ultrasonic'){
   for(const pin of ['TRIG','ECHO'])if(connected(endpoint(pin),'uno:5V')||connected(endpoint(pin),'uno:GND'))add('warning','SENSOR_SIGNAL_TO_RAIL',part.id+' '+pin+' signal is tied to a supply or ground rail. Verify the intended signal circuit.');
  }
  if(part.type==='rgb'){
   for(const pin of ['R','G','B'])if(connected(endpoint(pin),'uno:5V')&&connected(endpoint('K'),'uno:GND'))add('error','RGB_DIRECT_SUPPLY',part.id+' '+pin+' channel is powered without a recognized series resistor.');
  }
  if(part.type==='led'){
   const a=endpoint('A'),k=endpoint('K');
   if(connected(a,k))add('error','LED_TERMINAL_SHORT',part.id+' anode and cathode share a net.');
   if(connected(a,'uno:GND')&&connected(k,'uno:5V'))add('error','LED_REVERSED',part.id+' polarity is reversed across the supply.');
   if(touches('A')&&touches('K')){
    const resistors=project.parts.filter(p=>p.type==='resistor');
    const hasSeriesResistor=resistors.some(r=>{
     const rA=`${r.id}:A`,rB=`${r.id}:B`;
     const isPath=(ledPin,source)=> (connected(ledPin,rA)&&connected(source,rB))||(connected(ledPin,rB)&&connected(source,rA));
     return BOARD_PINS.some(pin=>!['GND','3.3V'].includes(pin)&&isPath(a,'uno:'+pin))||isPath(k,'uno:GND');
    });
    const sourceDirect=BOARD_PINS.some(pin=>!['GND','3.3V'].includes(pin)&&connected(a,'uno:'+pin));
    if(sourceDirect&&connected(k,'uno:GND')&&!hasSeriesResistor)add('error','LED_MISSING_RESISTOR',part.id+' is directly connected between GPIO/power and GND without a series resistor.');
    else if(!hasSeriesResistor)add('warning','LED_RESISTOR_UNVERIFIED',part.id+' has no recognized resistor in its current path. Verify its supply and current limit.');
   }
  }
  if(part.type==='rgb')add('warning','RGB_RESISTORS','Verify a separate current-limiting resistor on each active RGB channel.');
  if(part.type==='tmp36'&&connected(endpoint('VS'),'uno:3.3V'))add('info','TMP36_3V3','A genuine TMP36 supports 2.7–5.5 V; verify the breakout and sensor pinout.');
  if(part.type==='button'&&connected(endpoint('A'),endpoint('B')))add('warning','BUTTON_BYPASSED',part.id+' terminals are permanently shorted by wiring; pressing the button will not change this connection.');
  if(!terminals.some(t=>touches(t)))add('warning','PART_UNCONNECTED',part.id+' is not wired.');
 }
 for(const pin of BOARD_PINS.filter(p=>/^D\d+$/.test(p))){
  if(connected('uno:'+pin,'uno:5V')||connected('uno:'+pin,'uno:GND'))add('warning','GPIO_TO_POWER_RAIL',pin+' is wired directly to a power rail. If configured as an output, this could cause excessive current.');
  for(const other of BOARD_PINS.filter(q=>/^D\d+$/.test(q)&&Number(q.slice(1))>Number(pin.slice(1))))if(connected('uno:'+pin,'uno:'+other))add('warning','SHARED_GPIO_NET',pin+' and '+other+' share a net; verify neither is driving against the other.');
 }
 if(project.parts.length===0)add('info','NO_COMPONENTS','Add a component to begin building a project.');
 if(project.wires.length===0)add('info','NO_WIRES','Select two terminals to create a wire.');
 const groups=new Map();
 for(const w of project.wires){for(const ep of [w.a,w.b]){const root=uf.root(ep);if(!groups.has(root))groups.set(root,new Set());groups.get(root).add(ep);}}
 const nets=[...groups.values()].map(group=>[...group].sort()).sort((a,b)=>a[0].localeCompare(b[0]));
 return {issues,errors:issues.filter(i=>i.level==='error'),warnings:issues.filter(i=>i.level==='warning'),nets,ready:issues.every(i=>i.level!=='error'),note:'Static netlist checks only. Passing does not certify a physical circuit, power budget or firmware behavior.'};
}
export function addWire(input,a,b){
 const project=normalizeCircuit(input),allowed=new Set(allEndpoints(project.parts));
 if(!allowed.has(a)||!allowed.has(b))throw Error('Choose two existing terminals.');
 if(a===b)throw Error('Select two different terminals.');
 if(project.wires.length>=MAX_WIRES)throw Error('Maximum wire count reached.');
 if(project.wires.some(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a)))throw Error('That wire already exists.');
 const uf=createUnionFind(project);
 if(uf.connected(a,b))throw Error('Those terminals are already on the same electrical net. No wire is needed.');
 let i=1;while(project.wires.some(w=>w.id==='w'+i))i++;
 const next={...project,wires:[...project.wires,wire(a,b,'w'+i)]};
 const safety=analyzeCircuit(next);
 const blocks=new Set(['POWER_GROUND_SHORT','POWER_RAIL_SHORT','THREE_VOLT_SHORT','PART_SUPPLY_TO_GND','PART_GROUND_TO_POWER','POT_SHORT']);
 const critical=safety.errors.find(issue=>blocks.has(issue.code));
 if(critical)throw Error('Unsafe connection blocked: '+critical.message);
 return next;
}
export function serializeCircuit(input){return JSON.stringify(normalizeCircuit(input),null,2)+'\n';}
