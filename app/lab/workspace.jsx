'use client';
import {useState} from 'react';
import Link from 'next/link';
import {StudioCircuitPreview} from '../studio/circuit-preview';
import {BLINK_DEMO_CODE} from '../../lib/studio-preview.mjs';
const stages=['Build','Wire','Code','Simulate','Design','Test Bench'];
const parts=[{id:'uno',name:'Arduino Uno R3',note:'Digital output D13'},{id:'led',name:'LED',note:'External indicator (optional)'},{id:'resistor',name:'220 Ω resistor',note:'Required for external LED'}];
export function LabWorkspace(){
 const [stage,setStage]=useState('Build');
 const [selected,setSelected]=useState(['uno','led','resistor']);
 const [code,setCode]=useState(BLINK_DEMO_CODE);
 const [saved,setSaved]=useState('');
 const toggle=id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
 const load=()=>{try{const data=JSON.parse(localStorage.getItem('circuitbyte-lab-v1')||'null');if(!data)throw Error('No saved draft found.');setSelected(data.selected.filter(x=>parts.some(p=>p.id===x)));setCode(String(data.code||''));setSaved('Draft restored from this browser.');}catch(e){setSaved(e.message);}};
 const save=()=>{try{localStorage.setItem('circuitbyte-lab-v1',JSON.stringify({selected,code,savedAt:new Date().toISOString()}));setSaved('Draft saved in this browser.');}catch{setSaved('Browser storage is unavailable.');}};
 return <section className="cb-lab-shell"><nav className="cb-lab-steps" aria-label="Lab stages">{stages.map((name,i)=><button key={name} className={stage===name?'active':''} onClick={()=>setStage(name)}><b>{i+1}</b>{name}</button>)}</nav><div className="cb-lab-content"><div className="cb-lab-toolbar"><strong>{stage}</strong><div><button onClick={load}>Load draft</button><button onClick={save}>Save draft</button></div></div>{saved&&<p role="status">{saved}</p>}
 {stage==='Build'&&<><p>Select parts for the introductory LED experiment. Component selection does not validate physical compatibility.</p><div className="cb-lab-parts">{parts.map(p=><label key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)}/><span><strong>{p.name}</strong><small>{p.note}</small></span></label>)}</div><p>For the full catalog-linked component picker, use <Link href="/studio">Project Studio</Link>.</p></>}
 {stage==='Wire'&&<><p>Reference wiring for an external LED. Disconnect power before wiring real hardware.</p><div className="cb-lab-diagram"><div className="cb-lab-board">Arduino Uno <small>D13</small><small>GND</small></div><div className="cb-lab-wires"><span> D13 ── 220 Ω ── LED anode (+)</span><span> GND ───────── LED cathode (−)</span></div></div><p>Use the onboard D13 LED without an external LED or resistor. Never connect an external LED directly across power without a current-limiting resistor.</p></>}
 {stage==='Code'&&<><label htmlFor="lab-code">Arduino sketch</label><textarea id="lab-code" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} rows={17}/><p>Editable sketch only. Use <Link href="/studio">Project Studio</Link> for controlled beta compilation; this editor does not compile automatically.</p></>}
 {stage==='Simulate'&&<StudioCircuitPreview code={code}/>}
 {stage==='Design'&&<><h3>Design handoff</h3><p>Review the wiring plan before constructing a real breadboard circuit. PCB and 3D modeling are not available in this release.</p><button onClick={()=>setStage('Wire')}>Review wiring plan</button></>}
 {stage==='Test Bench'&&<><h3>Verification checklist</h3><ul><li>Confirm board and component voltage ratings.</li><li>Verify LED polarity and series resistor.</li><li>Inspect all ground connections.</li><li>Compile the sketch using the supported Studio workflow.</li><li>Test on physical hardware with appropriate protection.</li></ul><p>Passing this checklist does not certify electrical safety or hardware operation.</p></>}
 <div className="cb-lab-footer"><button onClick={()=>setStage(stages[Math.max(0,stages.indexOf(stage)-1)])} disabled={stage==='Build'}>Previous</button><button onClick={()=>setStage(stages[Math.min(stages.length-1,stages.indexOf(stage)+1)])} disabled={stage==='Test Bench'}>Next step →</button></div></div></section>;
}