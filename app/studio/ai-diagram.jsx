'use client';
import {useEffect,useRef,useState} from 'react';
import {StudioHardwareWiring} from './hardware-wiring';

// Owned by the workspace, not by the Diagrams tab: tab switches never restart paid work.
export function useAutomaticDiagram({board,title,connections,enabled,authenticated}){
 const source=JSON.stringify({board,title,connections});
 const cache=useRef(new Map());
 const [,refresh]=useState(0);
 const eligible=Boolean(enabled&&authenticated&&connections.length);
 useEffect(()=>{
  if(!eligible||cache.current.has(source))return;
  // Coalesce project-state updates before reserving an attempt.
  const timer=setTimeout(()=>{
   if(cache.current.has(source))return;
   cache.current.set(source,{source,status:'pending'});refresh(n=>n+1);
   (async()=>{
    try{
     const response=await fetch('/api/studio/diagram',{method:'POST',headers:{'Content-Type':'application/json'},body:source,signal:AbortSignal.timeout(170000)});
     const data=await response.json();
     if(!response.ok){const error=Error(data.error||'Automatic diagram generation failed.');error.statusCode=response.status;throw error;}
     if(typeof data.image!=='string'||!data.image.startsWith('data:image/'))throw Error('The image service did not return a usable illustration.');
     cache.current.set(source,{source,status:'ready',image:data.image,notice:data.notice});
    }catch(error){
     cache.current.set(source,{source,status:'error',statusCode:error.statusCode,error:error.name==='TimeoutError'?'Automatic illustration timed out. No automatic retry will spend another credit.':error.message});
    }finally{refresh(n=>n+1);}
   })();
  },800);
  return()=>clearTimeout(timer);
 },[source,eligible]);
 const value=cache.current.get(source)||null;
 return {value,busy:eligible&&(!value||value.status==='pending')};
}

export function StudioAiDiagram({board,title,connections,stale,enabled,authenticated,value,busy,blocked=false}){
 const fallback=Boolean(value?.error&&!blocked&&connections.length&&![400,422].includes(value.statusCode));
 return <section className="studio-ai-diagram" aria-label="Illustrated wiring guide">
  <div className="studio-ai-diagram-heading"><div><span className="edu-kicker">ILLUSTRATED BUILD GUIDE</span><h3>See the hardware, not just the wires.</h3></div><span className="studio-board">{fallback?'AUTO · WIRING VIEW':'AUTO · AI IMAGE'}</span></div>
  <p>{fallback?'Your wiring illustration uses the project’s connection table, with every source and destination preserved.':'Your board-and-module illustration is generated automatically from the project’s connection plan, with colored wires, pin mapping and voltage notes.'}</p>
  {blocked&&<p className="studio-warning">Resolve the electrical review errors before an AI illustration can start.</p>}
  {busy&&<p className="studio-notice" role="status">Drawing your wiring guide in the background… You can continue working.</p>}
  <p className="studio-help">One shared AI credit per successfully generated AI illustration. Failed attempts and the automatic SVG wiring view use no AI credits. Switching tabs reuses the same result in this workspace. Download your guide to keep it after leaving or reloading the page.</p>
  {!authenticated&&<p><a href="/dashboard">Sign in with a verified Student account</a> to enable automatic AI illustrations.</p>}
  {authenticated&&!enabled&&<p>AI enhancement is currently unavailable. The free illustrated wiring guide remains available.</p>}
  {!connections.length&&<p>The illustration will start automatically once your project has a connection plan.</p>}
  {stale&&<p className="studio-warning">This guide depicts the existing connection plan. Your sketch has changed; compare its GPIO assignments with the connection table before wiring.</p>}
  {fallback?<>
   <p className="studio-notice" role="status">Using the free automatic wiring illustration. AI enhancement could not finish, and no AI credit was used.</p>
   <StudioHardwareWiring board={board} connections={connections} stale={stale}/>
   <details><summary>AI enhancement status</summary><p>{value.error}</p></details>
  </>:value?.error&&<p className="studio-error" role="alert">{value.error}</p>}
  {value?.image&&<figure><a href={value.image} target="_blank" rel="noreferrer" aria-label="Open full size wiring illustration"><img src={value.image} alt={'AI wiring illustration for '+title}/></a><figcaption>{value.notice}{stale?' This image reflects the existing wiring plan, not verification of your edited code.':''}</figcaption><a href={value.image} download="CircuitByte-wiring-guide.jpg">Download wiring guide JPG</a></figure>}
 </section>;
}
