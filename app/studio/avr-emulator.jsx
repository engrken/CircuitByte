'use client';
import {useEffect,useMemo,useRef,useState} from 'react';

function waveform(transitions=[]){
 if(!transitions.length)return '';
 const first=transitions[0].ms,last=transitions.at(-1).ms,span=Math.max(10,last-first);
 const x=t=>Math.max(8,Math.min(592,8+(t-first)/span*584));
 const y=s=>s==='high'?22:58;
 let d=`M 8 ${y(transitions[0].level)}`;
 for(let i=1;i<transitions.length;i++){const p=transitions[i];d+=` H ${x(p.ms)} V ${y(p.level)}`;}
 return d+' H 592';
}

export function StudioAvrEmulator({firmwareHex='',board='arduino:avr:uno'}){
 const worker=useRef(null);
 const [localHex,setLocalHex]=useState('');
 const [status,setStatus]=useState('idle');
 const [message,setMessage]=useState('');
 const [snapshot,setSnapshot]=useState(null);
 const [pressed,setPressed]=useState(false);
 const hex=firmwareHex||localHex;
 const wave=useMemo(()=>waveform(snapshot?.transitions),[snapshot]);
 const stop=()=>{worker.current?.terminate();worker.current=null;setStatus('stopped');setPressed(false);};
 useEffect(()=>()=>worker.current?.terminate(),[]);
 useEffect(()=>{worker.current?.terminate();worker.current=null;setSnapshot(null);setStatus('idle');setPressed(false);setLocalHex('');},[firmwareHex,board]);
 const run=()=>{
  if(board!=='arduino:avr:uno'){setMessage('Only ATmega328P Arduino Uno firmware is supported.');return;}
  if(!hex.trim()){setMessage('Compile an Arduino Uno sketch, or import an Intel HEX file first.');return;}
  worker.current?.terminate();setSnapshot(null);setPressed(false);setMessage('Starting isolated AVR worker…');
  try{
   const target=new Worker(new URL('./avr-emulator-worker.mjs',import.meta.url),{type:'module'});
   worker.current=target;setStatus('starting');
   target.onmessage=e=>{
    const data=e.data||{};
    if(data.kind==='started'){setStatus('running');setMessage('Executing compiled AVR instructions (no physical sensors attached).');}
    if(data.kind==='snapshot')setSnapshot(data);
    if(data.kind==='ended'||data.kind==='error'){setStatus(data.kind==='error'?'error':'stopped');setMessage(data.reason||'Emulation stopped.');target.terminate();if(worker.current===target)worker.current=null;}
   };
   target.onerror=()=>{setStatus('error');setMessage('The AVR worker could not load. Verify browser support and dependency delivery.');target.terminate();if(worker.current===target)worker.current=null;};
   target.postMessage({kind:'start',hex});
  }catch(error){setStatus('error');setMessage('AVR worker unavailable: '+String(error?.message||error).slice(0,160));}
 };
 const importHex=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(file.size>200000){setMessage('Choose a .hex file under 200 KB.');return;}
  stop();setLocalHex(await file.text());setMessage('HEX imported locally. Run to simulate the ATmega328P firmware.');
 };
 if(board!=='arduino:avr:uno')return null;
 return <section className="studio-avr-lab" aria-label="Arduino Uno firmware emulator">
  <header><div><span className="edu-kicker">BROWSER AVR EMULATION · NO EXTRA CLOUD BUILD</span><h4>Run compiled Arduino Uno firmware</h4></div><span className="studio-avr-status">{status.toUpperCase()}</span></header>
  <p>Runs actual compiled ATmega328P instructions in an isolated browser worker. GPIO D2–D13, timers and basic Serial TX are modeled; I²C, sensors, real electrical loading and external modules are <strong>not simulated</strong>.</p>
  <div className="studio-avr-actions"><button type="button" onClick={run} disabled={!hex||status==='running'||status==='starting'}>▶ Run firmware</button><button type="button" onClick={stop} disabled={!worker.current}>■ Stop</button><label>Import locally compiled UNO .hex<input type="file" accept=".hex,text/plain" onChange={importHex}/></label></div>
  <p role="status" className="studio-avr-message">{message||'Compile successfully in Studio to use its HEX automatically, or import a locally compiled Uno HEX.'}</p>
  <div className="studio-avr-pins"><div className={'studio-avr-led '+(snapshot?.pins?.D13==='high'?'lit':'')}><span>UNO D13 LED</span><strong>{snapshot?.pins?.D13||'No signal'}</strong></div><div className="studio-avr-pin-grid">{Array.from({length:12},(_,i)=>'D'+(i+2)).map(p=><div key={p}><small>{p}</small><b className={snapshot?.pins?.[p]==='high'?'is-high':''}>{snapshot?.pins?.[p]||'—'}</b></div>)}</div></div>
  <div className="studio-avr-scope"><div><strong>D13 logic transitions</strong><small>Simulated time: {snapshot?.simulatedMs??0} ms</small></div><svg viewBox="0 0 600 80" role="img" aria-label="D13 digital waveform"><line x1="8" x2="592" y1="58" y2="58" stroke="#49675b" strokeDasharray="3 5"/><line x1="8" x2="592" y1="22" y2="22" stroke="#49675b" strokeDasharray="3 5"/>{wave&&<path d={wave} fill="none" stroke="#a8f2a1" strokeWidth="3" strokeLinejoin="round"/>}</svg></div>
  <label className="studio-avr-button"><input type="checkbox" checked={pressed} disabled={status!=='running'} onChange={e=>{setPressed(e.target.checked);worker.current?.postMessage({kind:'button',pressed:e.target.checked});}}/> Simulate D2 pushbutton to GND (release = HIGH, press = LOW)</label>
  <details><summary>Simulated serial output (TX only)</summary><pre className="studio-avr-serial">{snapshot?.serial||'No text output received.'}</pre></details>
  <p className="studio-help">Firmware execution does not establish that your breadboard, voltage/current levels or sensors work. Timing is simulated CPU time, not guaranteed wall-clock performance; this emulator stops after 10 simulated seconds to limit browser load. Only Uno ATmega328P images are accepted.</p>
 </section>;
}
