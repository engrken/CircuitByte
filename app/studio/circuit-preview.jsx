'use client';
import {useEffect,useMemo,useState} from 'react';
import {StudioProjectScene} from './project-scene';
import {StudioHardwareWiring} from './hardware-wiring';
import {StudioConnectionDiagram} from './connection-diagram';
import {studioBoardName} from '../../lib/studio-boards.mjs';
import {previewArduinoSketch} from '../../lib/studio-preview.mjs';
export function StudioCircuitPreview({code='',board='arduino:avr:uno',connections=[],stale=false}){
 const simulation=useMemo(()=>previewArduinoSketch(code,board),[code,board]);
 const [playing,setPlaying]=useState(true);
 const [elapsed,setElapsed]=useState(0);
 const [speed,setSpeed]=useState(1);
 useEffect(()=>{
  setElapsed(0);
 },[code,board]);
 useEffect(()=>{
  if(!playing||!simulation.supported)return;
  const clock=setInterval(()=>setElapsed(x=>x+50*speed),50);
  return()=>clearInterval(clock);
 },[playing,speed,simulation.supported,code]);
 const position=simulation.supported?(elapsed%simulation.duration):0;
 let frame={output:{},duration:0},remaining=position;
 if(simulation.supported){
  for(const item of simulation.frames){frame=item;if(remaining<item.duration)break;remaining-=item.duration;}
 }
 return <section className="studio-preview" aria-label="Arduino output animation preview">
  <header><div><span className="edu-kicker">VISUAL OUTPUT / PREVIEW</span><h3>What happens when this sketch runs?</h3></div><span className="studio-preview-label">ILLUSTRATIVE · SIGNAL MODEL · NOT FIRMWARE EMULATION</span></header>
  <StudioProjectScene key={board+code} board={board} connections={connections} output={simulation.supported?frame.output:{}} supported={simulation.supported} stale={stale}/>
  <details><summary>Illustrated project wiring</summary><StudioHardwareWiring board={board} connections={connections} stale={stale}/></details>
  <details><summary>Detailed signal connections</summary><StudioConnectionDiagram board={board} connections={connections} output={simulation.supported?frame.output:{}} stale={stale}/></details>
  {!simulation.supported?<div className="studio-preview-unsupported"><strong>This sketch needs hardware testing.</strong><p>{simulation.reason}</p><p>UART modules, network services and sensor protocols are not emulated here. Download the .ino sketch or use cloud compilation, then test the connected board with the USB serial monitor. Any available concept demo uses sample values and does not execute your sketch.</p></div>:
  <>
   <p>{simulation.disclaimer}</p>
   <div className="studio-preview-board">
    <div className="studio-preview-chip"><strong>{studioBoardName(board)}</strong><small>GPIO signal model</small><span>Logical GPIO outputs</span></div>
    <div className="studio-preview-leds">
     {simulation.pins.map(pin=><div className="studio-preview-led" key={pin}><span className={'studio-preview-bulb '+(frame.output[pin]?'lit':'')} role="img" aria-label={'Pin '+pin+': '+(frame.output[pin]?'HIGH':'LOW')}></span><strong>Pin {pin}</strong><small>{frame.output[pin]?'HIGH · ON':'LOW · OFF'}</small><div className="studio-preview-wire" aria-hidden="true"></div></div>)}
    </div>
   </div>
   <div className="studio-preview-controls">
    <button type="button" onClick={()=>setPlaying(x=>!x)}>{playing?'Pause':'Play'}</button>
    <button type="button" onClick={()=>{setElapsed(0);setPlaying(false);}}>Reset</button>
    <label>Speed<select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
    <span>Cycle: {simulation.duration.toLocaleString()} ms</span>
   </div>
   <div className="studio-preview-timeline" role="list" aria-label="Preview sequence">{simulation.frames.map((part,i)=><div role="listitem" key={i} className={part===frame?'current':''} style={{flex:Math.max(1,part.duration)}} title={'Step '+(i+1)+': '+part.duration+' ms'}>{part.duration} ms</div>)}</div>
   <p className="studio-help">Only straightforward digitalWrite(HIGH/LOW) + delay() sequences are supported. Animations do not measure exact execution time, processor state, sensors or breadboard electrical behavior.</p>
  </>}
 </section>;
}
