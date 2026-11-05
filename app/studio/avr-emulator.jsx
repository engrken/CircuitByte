'use client';
import {useEffect,useRef,useState} from 'react';
import {LOGIC_PINS,logicTraceCsv,logicWavePath,MAX_EDGES_PER_PIN} from '../../lib/studio-logic-trace.mjs';

const INITIAL_CHANNELS=['D13','D9','D10','D2'];
function downloadCsv(text){
 const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
 try{const a=document.createElement('a');a.href=url;a.download='CircuitByte_Uno_Logic_Trace.csv';document.body.appendChild(a);a.click();a.remove();}
 finally{setTimeout(()=>URL.revokeObjectURL(url),500);}
}

export function StudioAvrEmulator({firmwareHex='',board='arduino:avr:uno'}){
 const worker=useRef(null);
 const [localHex,setLocalHex]=useState('');
 const [status,setStatus]=useState('idle');
 const [message,setMessage]=useState('');
 const [snapshot,setSnapshot]=useState(null);
 const [pressed,setPressed]=useState(false);
 const [channels,setChannels]=useState(INITIAL_CHANNELS);
 const hex=localHex||firmwareHex;
 const stop=()=>{worker.current?.terminate();worker.current=null;setStatus('stopped');setPressed(false);};
 useEffect(()=>()=>worker.current?.terminate(),[]);
 useEffect(()=>{worker.current?.terminate();worker.current=null;setSnapshot(null);setStatus('idle');setPressed(false);setLocalHex('');},[firmwareHex,board]);
 const run=()=>{
  if(board!=='arduino:avr:uno'){setMessage('Only ATmega328P Arduino Uno firmware is supported.');return;}
  if(!hex.trim()){setMessage('Compile an Arduino Uno sketch or import a valid local Intel HEX file.');return;}
  worker.current?.terminate();setSnapshot(null);setPressed(false);setMessage('Starting isolated AVR worker…');
  try{
   const target=new Worker(new URL('./avr-emulator-worker.mjs',import.meta.url),{type:'module'});
   worker.current=target;setStatus('starting');
   target.onmessage=e=>{
    if(worker.current!==target)return;
    const data=e.data||{};
    if(data.kind==='started'){setStatus('running');setMessage('Running the compiled Uno instructions in the browser.');}
    if(data.kind==='snapshot')setSnapshot(data);
    if(data.kind==='paused'){setStatus('paused');setMessage('Paused at the current simulated CPU time.');}
    if(data.kind==='resumed'){setStatus('running');setMessage('Resumed simulation.');}
    if(data.kind==='ended'||data.kind==='error'){
     setStatus(data.kind==='error'?'error':'stopped');setMessage(data.reason||'Emulation ended.');target.terminate();
     if(worker.current===target)worker.current=null;
    }
   };
   target.onerror=()=>{setStatus('error');setMessage('The AVR worker could not load. Check browser support.');target.terminate();if(worker.current===target)worker.current=null;};
   target.postMessage({kind:'start',hex});
  }catch(error){setStatus('error');setMessage('AVR worker unavailable: '+String(error?.message||error).slice(0,160));}
 };
 const importHex=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(!file.name.toLowerCase().endsWith('.hex')||file.size>200000){setMessage('Choose a .hex Intel HEX file under 200 KB.');return;}
  stop();setLocalHex(await file.text());setSnapshot(null);setMessage('Local HEX selected. This overrides the Studio build until the sketch changes or reloads.');
 };
 if(board!=='arduino:avr:uno')return null;
 const dropCount=channels.reduce((sum,pin)=>sum+(snapshot?.dropped?.[pin]||0),0);
 return <section className="studio-avr-lab" aria-label="Arduino Uno firmware emulator and logic analyzer">
  <header><div><span className="edu-kicker">BROWSER AVR EMULATION · ZERO EXTRA CLOUD BUILD CREDITS</span><h4>Arduino Uno firmware and 4-channel logic analyzer</h4></div><span className="studio-avr-status" role="status">{status.toUpperCase()}</span></header>
  <p>Run the compiled ATmega328P firmware in an isolated browser worker. Capture digital GPIO edges on D2–D13 and serial TX. The analyzer is <strong>digital-only</strong>; it does not calculate analog voltages, current, or external sensor behavior.</p>
  <div className="studio-avr-actions">
   <button type="button" onClick={run} disabled={!hex||status==='running'||status==='starting'||status==='paused'}>▶ Run firmware</button>
   <button type="button" onClick={()=>worker.current?.postMessage({kind:status==='running'?'pause':'resume'})} disabled={status!=='running'&&status!=='paused'}>{status==='paused'?'▶ Resume':'Ⅱ Pause'}</button>
   <button type="button" onClick={stop} disabled={!worker.current}>■ Stop</button>
   <label>Import locally compiled Uno .hex<input type="file" accept=".hex,text/plain" onChange={importHex}/></label>
  </div>
  <p role="status" className="studio-avr-message">{message||'Compile in Studio or select an Arduino Uno Intel HEX file from your workstation. You can import HEX without a cloud build.'}</p>
  <div className="studio-avr-pins"><div className={'studio-avr-led '+(snapshot?.pins?.D13==='high'?'lit':'')}><span>UNO D13 LED</span><strong>{snapshot?.pins?.D13||'No signal'}</strong></div><div className="studio-avr-pin-grid">{LOGIC_PINS.map(pin=><div key={pin}><small>{pin}</small><b className={snapshot?.pins?.[pin]==='high'?'is-high':''}>{snapshot?.pins?.[pin]||'—'}</b></div>)}</div></div>
  <div className="studio-avr-analyzer">
   <header><div><strong>Digital logic analyzer</strong><small>Simulated CPU time: {snapshot?.simulatedMs??0} ms · Latest {MAX_EDGES_PER_PIN} edges per pin</small></div><button type="button" disabled={!snapshot?.traces} onClick={()=>downloadCsv(logicTraceCsv(snapshot.traces,channels))}>Export selected traces as CSV</button></header>
   {channels.map((channel,index)=><div className="studio-avr-channel" key={index}>
     <label>CH{index+1}<select value={channel} aria-label={'Logic analyzer channel '+(index+1)} onChange={e=>setChannels(prev=>prev.map((v,i)=>i===index?e.target.value:v))}>{LOGIC_PINS.map(pin=><option key={pin} value={pin} disabled={channels.includes(pin)&&pin!==channel}>{pin}</option>)}</select></label>
     <svg viewBox="0 0 600 80" role="img" aria-label={`${channel} digital trace, HIGH top and LOW bottom`}>
       <line x1="8" x2="592" y1="59" y2="59" stroke="#49675b" strokeDasharray="3 5"/>
       <line x1="8" x2="592" y1="19" y2="19" stroke="#49675b" strokeDasharray="3 5"/>
       <line x1="8" x2="592" y1="39" y2="39" stroke="#35463f" strokeDasharray="2 7"/>
       {snapshot?.traces?.[channel]?.length>0&&<path d={logicWavePath(snapshot.traces[channel],snapshot.simulatedMs)} fill="none" stroke="#a8f2a1" strokeWidth="2.5" strokeLinejoin="round"/>}
     </svg><span className="studio-avr-last">{snapshot?.pins?.[channel]||'—'}</span>
   </div>)}
   {dropCount>0&&<p className="studio-avr-loss">Trace history is capped; {dropCount} earlier edges on the selected channels were discarded. CSV includes retained edges only.</p>}
   <p className="studio-avr-explain">HIGH is the upper line, LOW is the lower line; inputs and pull-ups use the center line. Shows the latest 5 simulated seconds when available. Very fast transitions are captured as edges, but display and trace memory are bounded.</p>
  </div>
  <label className="studio-avr-button"><input type="checkbox" checked={pressed} disabled={status!=='running'&&status!=='paused'} onChange={e=>{setPressed(e.target.checked);worker.current?.postMessage({kind:'button',pressed:e.target.checked});}}/> Simulate D2 input: press to connect to GND, release to HIGH</label>
  <details><summary>Simulated serial output (TX only)</summary><pre className="studio-avr-serial">{snapshot?.serial||'No text output received.'}</pre></details>
  <p className="studio-help">Emulation does not validate breadboard wiring, voltage/current or real sensors. Execution is limited to 10 simulated seconds; timing is simulated CPU time rather than wall-clock performance. Only Arduino Uno ATmega328P firmware HEX is accepted. All traces remain in your browser.</p>
 </section>;
}
