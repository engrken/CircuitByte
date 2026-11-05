'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {BOARD_PINS,PART_TYPES,PART_TYPE_IDS,CIRCUIT_TEMPLATES,BUILDER_STORAGE_KEY,ROW_COUNT,addPart,addWire,analyzeCircuit,fromTemplate,newCircuit,normalizeCircuit,removePart,removeWire,serializeCircuit} from '../../../../lib/studio-circuit-builder.mjs';

import {DcInstruments} from './dc-instruments';

const COLS='abcdefghij';
const COLOR={power:'#e95753',ground:'#6caefa',signal:'#fac978'};
const point=(id,parts,mode)=>{
 if(id.startsWith('uno:')){
  const pin=id.slice(4);
  if(/^D\d+$/.test(pin))return {x:49+(Number(pin.slice(1))-2)*19.5,y:96};
  if(/^A\d+$/.test(pin))return {x:55+Number(pin.slice(1))*34,y:450};
  const power={'5V':{x:59,y:485},'3.3V':{x:132,y:485},'GND':{x:205,y:485}};
  return power[pin]||null;
 }
 if(id==='bb:+')return {x:354,y:123};
 if(id==='bb:-')return {x:748,y:451};
 if(id.startsWith('bb:')){
  const match=/^bb:([a-j])(\d{1,2})$/.exec(id);if(!match)return null;
  const n=Number(match[2]),letter=match[1];
  const x=354+(n-1)*35;
  if(mode==='schematic')return {x,y:'abcde'.includes(letter)?247:332};
  const index=COLS.indexOf(letter);
  return {x,y:index<5?164+22.5*index:295+22.5*(index-5)};
 }
 const split=id.indexOf(':');if(split<0)return null;
 const p=parts.find(x=>x.id===id.slice(0,split));if(!p)return null;
 const def=PART_TYPES[p.type];if(!def)return null;
 const index=parts.indexOf(p),pinIndex=def.pins.indexOf(id.slice(split+1));if(pinIndex<0)return null;
 const count=def.pins.length;
 return {x:857+(pinIndex+1)*276/(count+1),y:145+index*94};
};
const label=id=>id.replace(/^uno:/,'UNO ').replace(/^bb:/,'Breadboard ');
function download(name,text,mime){
 const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob);
 try{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}finally{setTimeout(()=>URL.revokeObjectURL(url),200);}
}
function curve(a,b){const mid=(a.x+b.x)/2;return `M ${a.x} ${a.y} L ${mid} ${a.y} L ${mid} ${b.y} L ${b.x} ${b.y}`;}
function Endpoint({id,position,selected,onSelect,color='#deeadb',caption='',small=false}){
 const isSelected=selected===id;
 return <g role="button" tabIndex={0} aria-label={'Select '+label(id)} aria-pressed={isSelected}
  onClick={()=>onSelect(id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(id);}}} style={{cursor:'pointer'}}>
  <title>{label(id)}</title>
  <circle cx={position.x} cy={position.y} r={isSelected?10:small?5:7} fill={isSelected?'#ffe08a':'#152f30'} stroke={isSelected?'#ffefac':color} strokeWidth={isSelected?3:2}/>
  {caption&&<text x={position.x} y={position.y-13} textAnchor="middle" fill="#e3f4ee" fontSize="10" fontWeight="700">{caption}</text>}
 </g>;
}
function Drawing({project,view,selection,onSelect,svgRef}){
 const canvasHeight=Math.max(585,181+project.parts.length*94);
 const breadboard=view==='breadboard'||view==='3d';
 const boardPins=BOARD_PINS.map(id=>({id:'uno:'+id,pos:point('uno:'+id,project.parts,view)}));
 const breadHoles=[];
 if(breadboard){for(let row=1;row<=ROW_COUNT;row++)for(const col of COLS){const id='bb:'+col+row;breadHoles.push({id,pos:point(id,project.parts,view)});}}
 else for(let row=1;row<=ROW_COUNT;row++)for(const col of ['a','f']){const id='bb:'+col+row;breadHoles.push({id,pos:point(id,project.parts,view)});}
 const partPins=project.parts.flatMap(p=>PART_TYPES[p.type].pins.map(pin=>({id:p.id+':'+pin,pin,pos:point(p.id+':'+pin,project.parts,view)})));
 const wireColors=wire=>{
  if(['uno:5V','bb:+'].includes(wire.a)||['uno:5V','bb:+'].includes(wire.b))return COLOR.power;
  if(['uno:GND','bb:-'].includes(wire.a)||['uno:GND','bb:-'].includes(wire.b))return COLOR.ground;
  return COLOR.signal;
 };
 return <svg ref={svgRef} viewBox={`0 0 1180 ${canvasHeight}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={view==='schematic'?'Synchronized 2D connection map':'Interactive Arduino Uno and breadboard wiring workbench'}>
  <rect width="1180" height={canvasHeight} fill={view==='schematic'?'#142d2b':'#142e2a'}/>
  <text x="26" y="36" fill="#c6e8d3" fontSize="16" fontWeight="800">CIRCUITBYTE · {view==='schematic'?'SCHEMATIC-STYLE NETLIST':'BREADBOARD WORKBENCH'}</text>
  <text x="26" y="55" fill="#94b4a5" fontSize="10">UNO R3 · educational net connectivity · not an electronics simulator</text>
  <rect x="20" y="75" width="255" height="436" rx="16" fill="#21637a" stroke="#6cb5b2" strokeWidth="5"/>
  <rect x="106" y="211" width="101" height="110" rx="8" fill="#162b32" stroke="#1f464d" strokeWidth="5"/>
  <text x="156" y="250" fill="#aec7c9" fontSize="12" fontWeight="800" textAnchor="middle">ATMEGA328P</text>
  <text x="156" y="270" fill="#91b9bb" fontSize="10" textAnchor="middle">UNO</text>
  <rect x="20" y="150" width="64" height="56" rx="5" fill="#bcc7c7" stroke="#7b9697" strokeWidth="8"/>
  <text x="50" y="181" fill="#24454a" fontSize="13" fontWeight="800" textAnchor="middle">USB</text>
  <circle cx="72" cy="374" r="27" fill="#101f24" stroke="#526365" strokeWidth="8"/><circle cx="72" cy="374" r="10" fill="#93a9a7"/>
  <text x="150" y="372" fill="#c9e0db" fontSize="13" fontWeight="800" textAnchor="middle">ARDUINO UNO</text>
  <text x="151" y="394" fill="#b4e0e1" fontSize="10" textAnchor="middle">5 V DIGITAL GPIO</text>
  <text x="148" y="82" fill="#e1f8e8" fontSize="9" textAnchor="middle">D2–D13</text>
  <text x="147" y="425" fill="#e1f8e8" fontSize="10" textAnchor="middle">ANALOG INPUTS</text>
  <text x="144" y="507" fill="#d0ebe3" fontSize="10" textAnchor="middle">POWER / GND</text>
  <rect x="317" y="78" width="461" height="430" rx="14" fill={breadboard?'#e0e4d6':'#1e3c38'} stroke={breadboard?'#8d9a8a':'#607f70'} strokeWidth="5"/>
  {breadboard?<>
    <rect x="335" y="151" width="424" height="255" rx="5" fill="#f4f5e8" stroke="#b0b9a7" strokeWidth="1"/>
    <rect x="338" y="272" width="420" height="16" fill="#a9b3a7"/>
    <line x1="354" y1="123" x2="748" y2="123" stroke="#e56758" strokeWidth="5"/>
    <line x1="354" y1="451" x2="748" y2="451" stroke="#7bb2d6" strokeWidth="5"/>
    <text x="354" y="106" fill="#bd625b" fontSize="13" fontWeight="800">+</text>
    <text x="747" y="478" fill="#5793b3" fontSize="13" fontWeight="800">−</text>
    {Array.from({length:ROW_COUNT},(_,i)=><text key={i} x={354+i*35} y="150" fontSize="10" fill="#77887b" textAnchor="middle">{i+1}</text>)}
  </>:<>
    <text x="548" y="111" textAnchor="middle" fill="#cde9d2" fontSize="15" fontWeight="800">BREADBOARD NET JUNCTIONS</text>
    <text x="548" y="199" textAnchor="middle" fill="#b0cebb" fontSize="11">A–E row groups (L1–L12)</text>
    <text x="548" y="369" textAnchor="middle" fill="#b0cebb" fontSize="11">F–J row groups (R1–R12)</text>
    <line x1="354" y1="123" x2="748" y2="123" stroke="#e56758" strokeWidth="5"/>
    <line x1="354" y1="451" x2="748" y2="451" stroke="#7bb2d6" strokeWidth="5"/>
    {Array.from({length:ROW_COUNT},(_,i)=><g key={i}><text x={354+i*35} y="223" fontSize="10" fill="#e0f5de" textAnchor="middle">L{i+1}</text><text x={354+i*35} y="309" fontSize="10" fill="#e0f5de" textAnchor="middle">R{i+1}</text></g>)}
   </>}
  {project.parts.map((p,i)=>{const def=PART_TYPES[p.type],y=80+i*94;return <g key={p.id}>
    <rect x="834" y={y} width="320" height="83" rx="10" fill="#254c43" stroke="#68947e" strokeWidth="2"/>
    <text x="852" y={y+20} fill="#e3f7e5" fontSize="13" fontWeight="800">{def.name}</text>
    <text x="1136" y={y+20} textAnchor="end" fill="#bbdac5" fontSize="11" fontWeight="800">{p.id}</text>
    <line x1="866" y1={y+42} x2="1124" y2={y+42} stroke="#4b8170" strokeWidth="2"/>
    {def.pins.map(pin=>{const pt=point(p.id+':'+pin,project.parts,view);return <text key={pin} x={pt.x} y={y+39} textAnchor="middle" fill="#ebf8de" fontSize="10">{pin}</text>;})}
   </g>;})}
  {project.wires.map(w=>{
   const a=point(w.a,project.parts,view),b=point(w.b,project.parts,view);if(!a||!b)return null;
   return <path key={w.id} d={curve(a,b)} fill="none" stroke={wireColors(w)} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" opacity=".9"><title>{w.a} → {w.b}</title></path>;
  })}
  {boardPins.map(({id,pos})=><Endpoint key={id} id={id} position={pos} selected={selection} onSelect={onSelect} caption={id.slice(4)} color="#d1edf1"/>)}
  {breadHoles.map(({id,pos})=><Endpoint key={id} id={id} position={pos} selected={selection} onSelect={onSelect} color={breadboard?'#4a6d67':'#b8d6c1'} small={breadboard}/>)}
  {['bb:+','bb:-'].map(id=><Endpoint key={id} id={id} position={point(id,project.parts,view)} selected={selection} onSelect={onSelect} color={id==='bb:+'?'#f79c88':'#9dcbf0'}/>)}
  {partPins.map(({id,pin,pos})=><Endpoint key={id} id={id} position={pos} selected={selection} onSelect={onSelect} color="#f9e5b2"/>)}
 </svg>;
}
export function CircuitBuilder(){
 const [project,setProject]=useState(()=>fromTemplate('blink'));
 const [view,setView]=useState('breadboard');
 const [tool,setTool]=useState('wire');
 const [probe,setProbe]=useState('uno:5V');
 const [from,setFrom]=useState('');const [to,setTo]=useState('');
 const [chosenType,setChosenType]=useState('resistor');
 const [template,setTemplate]=useState('blink');
 const [history,setHistory]=useState([]);
 const [notice,setNotice]=useState('Select a terminal, then another terminal to add a wire.');
 const [error,setError]=useState('');
 const [hydrated,setHydrated]=useState(false);
 const svgRef=useRef(null),inputRef=useRef(null);
 useEffect(()=>{try{const raw=localStorage.getItem(BUILDER_STORAGE_KEY);if(raw){const candidate=normalizeCircuit(JSON.parse(raw));setProject(candidate);setTemplate('custom');}}catch{}setHydrated(true);},[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(BUILDER_STORAGE_KEY,serializeCircuit(project));}catch{}},[project,hydrated]);
 const report=useMemo(()=>analyzeCircuit(project),[project]);
 const allPins=useMemo(()=>{
  const board=BOARD_PINS.map(pin=>({id:'uno:'+pin,label:'UNO '+pin}));
  const rails=[{id:'bb:+',label:'Breadboard + rail'},{id:'bb:-',label:'Breadboard − rail'}];
  for(let row=1;row<=ROW_COUNT;row++)for(const col of COLS)rails.push({id:'bb:'+col+row,label:'Breadboard '+col.toUpperCase()+row});
  const components=project.parts.flatMap(p=>PART_TYPES[p.type].pins.map(pin=>({id:p.id+':'+pin,label:p.id+' · '+pin})));
  return [...board,...rails,...components];
 },[project.parts]);
 const update=(next,message)=>{setHistory(prev=>[...prev.slice(-19),project]);setProject(next);setTemplate('custom');setFrom('');setTo('');setError('');setNotice(message);};
 const connect=(a,b)=>{try{update(addWire(project,a,b),'Wire added: '+a+' ↔ '+b+'. Views and validation updated.');}catch(e){setError(e.message);setNotice('Connection not applied.');}};
 const selectEndpoint=id=>{setError('');if(!from){setFrom(id);setTo('');setNotice('Selected '+id+'. Choose a second terminal to connect.');return;}if(id===from){setFrom('');setTo('');setNotice('Selection cleared.');return;}connect(from,id);};
 const selectTemplate=key=>{setTemplate(key);setHistory(prev=>[...prev.slice(-19),project]);setProject(key==='blank'?newCircuit():fromTemplate(key));setFrom('');setTo('');setError('');setNotice('Loaded '+(key==='blank'?'a blank circuit':CIRCUIT_TEMPLATES[key].name)+'.');};
 const addComponent=()=>{try{const next=addPart(project,chosenType);update(next,PART_TYPES[chosenType].name+' added. Select its terminals in the diagram.');}catch(e){setError(e.message);}};
 const undo=()=>{if(!history.length)return;setProject(history.at(-1));setHistory(prev=>prev.slice(0,-1));setFrom('');setTo('');setError('');setNotice('Undid the last change.');};
 const importJson=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{if(file.size>100_000)throw Error('Project JSON must be under 100 KB.');
   const value=normalizeCircuit(JSON.parse(await file.text()));
   const check=analyzeCircuit(value);
   if(check.errors.some(i=>['POWER_GROUND_SHORT','POWER_RAIL_SHORT','THREE_VOLT_SHORT'].includes(i.code)))throw Error('Imported project has a direct power short: '+check.errors[0].message);
   update(value,'Imported an Uno project. Inspect the diagrams and verification results.');
  }catch(err){setError('Import rejected: '+err.message);}
 };
 const exportSvg=()=>{if(!svgRef.current)return;const source=svgRef.current.cloneNode(true);source.setAttribute('xmlns','http://www.w3.org/2000/svg');download('CircuitByte_Circuit_'+view+'.svg',new XMLSerializer().serializeToString(source),'image/svg+xml;charset=utf-8');};
 return <div className="cb-builder">
   <section className="cb-builder-hero"><div><span className="cb-builder-kicker">CIRCUITBYTE / INTERACTIVE DC LAB</span><h1>Build a circuit. <em>Understand every connection.</em></h1><p>Create breadboard wiring with clickable terminals, inspect an alternate 2D connection map, and screen for basic electrical hazards before moving to real hardware.</p><div className="cb-builder-links"><a href="/learn/lab">← Guided Arduino lessons</a><a href="/studio">Continue to AI Project Studio ↗</a></div></div><div className="cb-builder-summary"><strong>{project.parts.length}</strong><small>Components</small><strong>{project.wires.length}</strong><small>Wires</small><strong>{report.errors.length}</strong><small>Detected critical issues</small></div></section>
   <div className="cb-builder-layout"><aside className="cb-builder-sidebar">
      <section><h2>1. Start with a circuit</h2><label htmlFor="cb-builder-template">Teaching template</label><select id="cb-builder-template" value={template} onChange={e=>{const k=e.target.value;if(k!=='custom')selectTemplate(k);}}><option value="custom" disabled>Custom circuit</option><option value="blank">Start blank</option>{Object.entries(CIRCUIT_TEMPLATES).map(([key,val])=><option key={key} value={key}>{val.name}</option>)}</select><p>Templates are examples, not automatic firmware validation.</p></section>
      <section><h2>2. Add components</h2><label htmlFor="cb-builder-type">Available components</label><select id="cb-builder-type" value={chosenType} onChange={e=>setChosenType(e.target.value)}>{PART_TYPE_IDS.map(type=><option key={type} value={type}>{PART_TYPES[type].name}</option>)}</select><button className="cb-builder-primary" onClick={addComponent}>+ Add component</button><div className="cb-builder-part-list">{project.parts.length===0?<p>No components placed.</p>:project.parts.map(p=><div key={p.id}><span><strong>{p.id}</strong><small>{PART_TYPES[p.type].name}</small></span><button type="button" aria-label={'Remove '+p.id} onClick={()=>update(removePart(project,p.id),'Removed '+p.id+' and all of its connected wires.')}>×</button></div>)}</div></section>
      <section><h2>3. Connect terminals</h2><p>Tap two points in the drawing, or select the endpoints below. The same wires appear in every view.</p><label htmlFor="cb-builder-from">From terminal</label><select id="cb-builder-from" value={from} onChange={e=>{setFrom(e.target.value);setError('');}}><option value="">Choose first terminal...</option>{allPins.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><label htmlFor="cb-builder-to">To terminal</label><select id="cb-builder-to" value={to} onChange={e=>setTo(e.target.value)}><option value="">Choose second terminal...</option>{allPins.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><button className="cb-builder-primary" type="button" disabled={!from||!to} onClick={()=>connect(from,to)}>Connect wire</button><button className="cb-builder-secondary" type="button" disabled={history.length===0} onClick={undo}>↶ Undo last change</button></section>
      <section><h2>4. Save or restore</h2><div className="cb-builder-actions"><button type="button" onClick={()=>download('CircuitByte_Circuit.json',serializeCircuit(project),'application/json;charset=utf-8')}>Export project JSON</button><button type="button" onClick={()=>inputRef.current?.click()}>Import project JSON</button><button type="button" onClick={exportSvg}>Export current SVG view</button></div><input ref={inputRef} type="file" accept=".json,application/json" hidden onChange={importJson}/><p>Local browser autosave. JSON holds connection data only; no code is executed.</p></section>
    </aside>
    <div className="cb-builder-workspace"><div className="cb-builder-workspace-heading"><div><span className="cb-builder-kicker">WIRING / ELECTRICAL NETLIST</span><h2>{project.name}</h2></div><span className="cb-builder-board">Arduino Uno R3 · 5 V logic</span></div>
      <div className="cb-builder-modes" role="group" aria-label="Circuit diagram view"><button type="button" aria-pressed={view==='breadboard'} onClick={()=>setView('breadboard')}>Breadboard</button><button type="button" aria-pressed={view==='3d'} onClick={()=>setView('3d')}>3D perspective</button><button type="button" aria-pressed={view==='schematic'} onClick={()=>setView('schematic')}>2D connection map</button></div>
      <div className="cb-builder-probe-tool" role="group" aria-label="Choose wiring or measurement tool"><button type="button" aria-pressed={tool==='wire'} onClick={()=>setTool('wire')}>Connect wires</button><button type="button" aria-pressed={tool==='probe'} onClick={()=>setTool('probe')}>Probe a terminal</button></div>
      <div className={'cb-builder-canvas cb-builder-'+view}><Drawing project={project} view={view} selection={tool==='probe'?probe:from} onSelect={tool==='probe'?setProbe:selectEndpoint} svgRef={svgRef}/></div>
      <p className="cb-builder-canvas-caption">{view==='schematic'?'2D map collapses each internally connected breadboard five-hole group to one junction. It is a schematic-style netlist, not an IEC-standard schematic.':view==='3d'?'CSS perspective uses the exact same netlist as the 2D views. Choose individual holes to connect wires.':'A–E holes in the same numbered row are internally connected; F–J form a separate row across the center gap. Power rails are independent until wired.'} Swipe horizontally on smaller screens to inspect the full board.</p>
      {error&&<div className="cb-builder-error" role="alert">{error}</div>}
      <div className="cb-builder-notice" role="status">{notice}</div>
      <DcInstruments project={project} probe={probe} onProbe={setProbe}/>
      <section className="cb-builder-checks"><div className="cb-builder-check-header"><h3>Electrical rule screening</h3><span className={report.errors.length?'has-errors':'is-clear'}>{report.errors.length?report.errors.length+' critical issue(s)':'No critical issues detected'}</span></div><p>Rules examine supply/ground shorts, breadboard strips, connected component supplies, LED resistor placement and common wiring hazards.</p>
        {report.issues.length===0?<div className="cb-builder-issue ok">No modeled electrical issues detected. A physical and datasheet review is still required.</div>:<div className="cb-builder-issues">{report.issues.map((issue,i)=><div className={'cb-builder-issue '+issue.level} key={issue.code+'-'+i}><strong>{issue.level.toUpperCase()} · {issue.code.replaceAll('_',' ')}</strong><p>{issue.message}</p></div>)}</div>}
        <small>{report.note}</small>
      </section>
      <section className="cb-builder-wires"><div><h3>Wire list</h3><p>Each item appears in the 3D perspective, breadboard view and 2D connection map.</p></div>{project.wires.length===0?<p>No wires yet.</p>:<div className="cb-builder-wire-list">{project.wires.map(w=><div key={w.id}><code>{w.id}</code><span>{label(w.a)} ↔ {label(w.b)}</span><button type="button" aria-label={'Remove wire '+w.id} onClick={()=>update(removeWire(project,w.id),'Wire '+w.id+' removed.')}>Remove</button></div>)}</div>}</section>
      <p className="cb-builder-disclaimer">Connectivity checks are static. The separate DC instrument models only known passive and LED circuits; it is not SPICE or a full hardware simulator. This builder does not compile firmware. Verify actual pinouts, component ratings and power budgets before real wiring.</p>
    </div>
   </div>
 </div>;
}
