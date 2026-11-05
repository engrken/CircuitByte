'use client';
import {useMemo,useState} from 'react';
import {allEndpoints,PART_TYPES} from '../../../../lib/studio-circuit-builder.mjs';
import {measureDcVoltage,simulateDcCircuit} from '../../../../lib/studio-dc-simulator.mjs';

const formatV=value=>value===null?'Floating / unmodeled':`${value.toFixed(3)} V`;
const formatI=value=>value===null?'Not measurable':`${(value*1000).toFixed(2)} mA`;

export function DcInstruments({project,probe,onProbe}){
 const [reference,setReference]=useState('uno:GND');
 const [pin,setPin]=useState('');
 const [high,setHigh]=useState(true);
 const [closed,setClosed]=useState(false);
 const [potPercent,setPotPercent]=useState(50);
 const [ldrOhms,setLdrOhms]=useState(10000);
 const candidates=useMemo(()=>allEndpoints(project.parts),[project.parts]);
 const a=candidates.includes(probe)?probe:'uno:5V',b=candidates.includes(reference)?reference:'uno:GND';
 const sim=useMemo(()=>simulateDcCircuit(project,{drivePin:pin,driveHigh:high,buttonClosed:closed,potPercent,ldrOhms}),[project,pin,high,closed,potPercent,ldrOhms]);
 const voltage=measureDcVoltage(sim,a,b);
 const currents=project.parts.filter(x=>sim.currents[x.id]);
 const highCurrent=currents.filter(part=>Number.isFinite(sim.currents[part.id].amps)&&Math.abs(sim.currents[part.id].amps)>0.02);
 const hasButton=project.parts.some(x=>x.type==='button');
 const hasPot=project.parts.some(x=>x.type==='potentiometer');
 const hasLdr=project.parts.some(x=>x.type==='ldr');
 return <section className="cb-dc-lab" aria-label="Virtual DC instruments">
  <header><div><span className="cb-builder-kicker">BROWSER-SIDE · NO CLOUD CREDITS</span><h3>Virtual DC Test Bench</h3><p>Probe the actual breadboard nets. Only the listed components have electrical models.</p></div><strong className={sim.status==='modeled'?'cb-dc-status':'cb-dc-status is-blocked'}>{sim.status==='modeled'?'Modeled DC':'Unavailable'}</strong></header>
  <div className="cb-dc-controls">
   <label>Probe (+)<select value={a} onChange={e=>onProbe(e.target.value)}>{candidates.map(id=><option key={id} value={id}>{id}</option>)}</select></label>
   <label>Reference (−)<select value={b} onChange={e=>setReference(e.target.value)}>{candidates.map(id=><option key={id} value={id}>{id}</option>)}</select></label>
   <label>Manual GPIO source<select value={pin} onChange={e=>setPin(e.target.value)}><option value="">None (GPIO undriven)</option>{Array.from({length:12},(_,i)=><option key={i} value={'D'+(i+2)}>{'D'+(i+2)}</option>)}</select></label>
   {pin&&<label>Output assumption<select value={high?'high':'low'} onChange={e=>setHigh(e.target.value==='high')}><option value="high">HIGH · ideal 5 V</option><option value="low">LOW · ideal 0 V</option></select></label>}
   {hasButton&&<label className="cb-dc-inline"><input type="checkbox" checked={closed} onChange={e=>setClosed(e.target.checked)}/> Pushbutton pressed (closed)</label>}
   {hasPot&&<label>Potentiometer from GND · {potPercent}%<input type="range" min="0" max="100" value={potPercent} onChange={e=>setPotPercent(Number(e.target.value))}/></label>}
   {hasLdr&&<label>LDR resistance · {ldrOhms.toLocaleString()} Ω<input type="range" min="2" max="6" step="0.1" value={Math.log10(ldrOhms)} onChange={e=>setLdrOhms(Math.round(10**Number(e.target.value)))}/></label>}
  </div>
  <div className="cb-dc-meter" aria-live="polite"><div><small>DC VOLTMETER · {a} − {b}</small><strong>{sim.status==='modeled'?formatV(voltage):'—'}</strong><span>{sim.status==='modeled'?(voltage===null?'A probe is not tied to a modeled voltage source.':'Computed from the selected circuit and conditions.'):sim.reason}</span></div><svg width="220" height="66" viewBox="0 0 220 66" role="img" aria-label="Voltmeter numeric reading"><rect x="2" y="2" width="216" height="62" rx="8" fill="#071d1c" stroke="#6bbdac" strokeWidth="2"/><text x="110" y="42" fontSize="26" textAnchor="middle" fontFamily="monospace" fill="#aaf3a6">{sim.status==='modeled'&&voltage!==null?voltage.toFixed(3)+' V':'— V'}</text></svg></div>
  {currents.length>0&&<div className="cb-dc-current"><h4>Modeled component currents</h4><div className="cb-dc-current-grid">{currents.map(part=><div key={part.id}><strong>{part.id}</strong><small>{PART_TYPES[part.type].name}</small><span>{formatI(sim.currents[part.id].amps)}</span></div>)}</div></div>}
  {highCurrent.length>0&&<p className="cb-dc-warning">High modeled current (over 20 mA) in {highCurrent.map(p=>p.id).join(', ')}. Check supply and GPIO current limits; this idealized model does not enforce actual board ratings.</p>}
  {sim.unsupported.length>0&&<p className="cb-dc-warning">These parts are not simulated: {sim.unsupported.join(', ')}. Their internal circuit behavior and loading are omitted, so readings can be incomplete.</p>}
  <p className="cb-dc-disclaimer">{sim.scope} This instrument does not run Arduino firmware or measure actual hardware. The manual GPIO source is an idealized test input, not a validated power supply. Confirm output drive ratings, voltage limits and circuit performance on real hardware.</p>
 </section>;
}
