'use client';
import {useRef,useState} from 'react';
export function StudioAiDiagram({board,title,connections,stale,enabled,authenticated,value,onChange,busy,onBusyChange}){
 const [error,setError]=useState('');const pending=useRef(false);
 const source=JSON.stringify({board,title,connections});
 const current=value?.source===source?value:null;
 async function generate(){
  if(pending.current||busy||stale||!connections.length)return;
  pending.current=true;onBusyChange(true);setError('');
  try{const r=await fetch('/api/studio/diagram',{method:'POST',headers:{'Content-Type':'application/json'},body:source,signal:AbortSignal.timeout(170000)});const data=await r.json();if(!r.ok)throw Error(data.error||'Diagram generation failed.');onChange({source,image:data.image,notice:data.notice});}
  catch(e){setError(e.name==='TimeoutError'?'Generation timed out. A request may still have used your AI allowance; no automatic retry was made.':e.message);}
  finally{pending.current=false;onBusyChange(false);}
 }
 return <section className="studio-ai-diagram" aria-label="AI illustrated wiring guide"><div className="studio-ai-diagram-heading"><div><span className="edu-kicker">ILLUSTRATED BUILD GUIDE</span><h3>See the hardware, not just the wires.</h3></div><span className="studio-board">AI IMAGE</span></div><p>Create a board-and-module illustration with colored connections, a pin table, a wire legend and voltage notes. Your exact connection table stays below for comparison.</p><button type="button" className="studio-primary" disabled={!authenticated||!enabled||busy||stale||!connections.length} onClick={generate}>{busy?'Drawing your wiring guide…':current?'Regenerate AI illustration':'Generate AI wiring illustration'}</button><p className="studio-help">Each request uses 1 of your shared 30 monthly AI credits, including failed provider attempts. Nothing is generated automatically. Download the image to keep it.</p>{!authenticated&&<p><a href="/dashboard">Sign in with a verified Student account</a> to generate an illustration.</p>}{authenticated&&!enabled&&<p>AI image generation is currently unavailable.</p>}{!connections.length&&<p>Generate a project with connections first.</p>}{stale&&<p className="studio-warning">The sketch has changed. Regenerate its wiring plan before creating a new image.</p>}{error&&<p className="studio-error" role="alert">{error}</p>}{current&&<figure><a href={current.image} target="_blank" rel="noreferrer" aria-label="Open full size wiring illustration"><img src={current.image} alt={'AI wiring illustration for '+title}/></a><figcaption>{current.notice}{stale?' This image reflects the previous wiring plan.':''}</figcaption><a href={current.image} download="CircuitByte-wiring-guide.jpg">Download wiring guide JPG</a></figure>}</section>;
}
