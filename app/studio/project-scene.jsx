'use client';
import {useState} from 'react';
import {studioBoardName} from '../../lib/studio-boards.mjs';
import {normalizeElectricalPin} from '../../lib/studio-electrical-verification.mjs';
import {groupHardwareDevices,hardwareDeviceState} from '../../lib/studio-hardware-devices.mjs';
export function StudioProjectScene({board,connections=[],output={},supported=false,stale=false}){
 const [mode,setMode]=useState('sketch'),[input,setInput]=useState(40),[threshold,setThreshold]=useState(50),[angle,setAngle]=useState(90),[display,setDisplay]=useState('Project ready'),[direction,setDirection]=useState('above');
 const devices=groupHardwareDevices(connections);
 const hasConceptDemo=devices.some(d=>!['serial','module'].includes(d.type));
 const demo=mode==='scenario'&&hasConceptDemo,trigger=direction==='above'?input>=threshold:input<=threshold;
 function state(device){
  return hardwareDeviceState(device,{stale,demo,trigger,supported,output,pinNumber:pin=>normalizeElectricalPin(pin,board).replace(/^(?:GPIO|D)/,'')});
 }
 return <section className="studio-project-scene" aria-label="Interactive project appearance"><header><div><span className="edu-kicker">PROJECT PREVIEW</span><h3>Hardware and supported signals</h3></div>{hasConceptDemo&&<label>Preview mode<select value={mode} onChange={e=>setMode(e.target.value)}><option value="sketch">Sketch signal playback</option><option value="scenario">Interactive concept demo</option></select></label>}</header>
 <p>{demo?'Concept demo: you set a sample sensor level and response threshold below. This demonstrates an idea; these rules are not read from or written to your sketch.':'Sketch playback shows only supported digital output sequences. Peripheral readouts remain unmodeled unless you switch to the concept demo.'}</p>
 {stale&&<p className="studio-warning">Sketch changed: this scene uses an outdated connection plan. Device states are paused until the plan is regenerated.</p>}
 {demo&&<div className="studio-scene-controls"><label>Sample sensor level: {input}%<input type="range" min="0" max="100" value={input} onChange={e=>setInput(Number(e.target.value))}/></label><label>Response threshold: {threshold}%<input type="range" min="0" max="100" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label><label>Activate output<select value={direction} onChange={e=>setDirection(e.target.value)}><option value="above">At or above threshold</option><option value="below">At or below threshold</option></select></label>{devices.some(d=>d.type==='servo')&&<label>Demo servo angle: {angle}°<input type="range" min="0" max="180" value={angle} onChange={e=>setAngle(Number(e.target.value))}/></label>}{devices.some(d=>d.type==='display')&&<label>Sample display text<input value={display} maxLength={32} onChange={e=>setDisplay(e.target.value)}/></label>}</div>}
 <div className="studio-scene-board"><strong>{studioBoardName(board)}</strong><span>{stale?'Plan outdated':demo?'Concept demonstration':supported?'Playing modeled GPIO signals':'Sketch behavior not modeled'}</span></div>
 {!devices.length?<p>No external hardware is listed in the connection plan yet.</p>:<div className="studio-scene-devices">{devices.map((device,i)=>{const value=state(device),on=value===true,status=value===null?'Not modeled':value?'HIGH':'LOW';return <article key={i} className={'studio-scene-device '+(on?'is-active':'')}><h4>{device.name}</h4><div className={'studio-device-visual device-'+device.type}>
 {device.type==='led'?<span className={'studio-scene-light '+(on?'on':'')} aria-label={status}/>:
 device.type==='display'?<div className="studio-scene-lcd"><span>{demo&&!stale?display:'Display not modeled'}</span><small>{demo&&!stale?'Sample input '+input+'%':'No firmware display data'}</small></div>:
 device.type==='servo'?<div className="studio-scene-servo"><span style={{transform:'rotate('+(demo&&!stale?angle-90:0)+'deg)'}}/><small>{demo&&!stale?angle+'° (demo)':'Angle not modeled'}</small></div>:
 device.type==='motor'?<span className={'studio-scene-rotor '+(on?'spinning':'')}>✣</span>:
 device.type==='relay'?<span className="studio-scene-relay">{value===null?'?':on?'HIGH':'LOW'}</span>:
 device.type==='buzzer'?<span className="studio-scene-buzzer">{on?')))':'◉'}</span>:
 device.type==='sensor'?<div className="studio-scene-sensor"><meter min="0" max="100" value={demo&&!stale?input:0}/><span>{demo&&!stale?input+'% sample input':'No sensor model'}</span></div>:<span className="studio-scene-generic">{device.type==='serial'?'UART MODULE':'MODULE'}</span>}
 </div><p>{device.type==='serial'?'UART communication is not simulated. Compile and use the USB serial monitor with your connected hardware.':device.type==='module'?'Device behavior is not modeled.':device.type==='display'||device.type==='sensor'||device.type==='servo'?(demo&&!stale?'User-controlled demonstration':'Peripheral behavior not modeled'):status+(demo&&value!==null?' · demo output':' · GPIO signal')}</p><ul className="studio-scene-terminals">{device.rows.map((row,j)=><li key={j}><strong>{row.pin}</strong><span> → {row.to}</span><small>{row.kind==='power'?'Supply connection':row.kind==='ground'?'Ground reference':'Signal connection'}</small></li>)}</ul></article>;})}</div>}
 <p className="studio-help">Illustrative assembled view, not a physical enclosure design or full circuit emulator. HIGH does not necessarily mean a relay or module is active; polarity, calibration, motor drivers and real device behavior depend on the hardware and firmware.</p></section>;
}
