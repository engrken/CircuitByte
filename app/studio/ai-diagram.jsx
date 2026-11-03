'use client';
import {useEffect,useRef,useState} from 'react';

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
     if(!response.ok)throw Error(data.error||'Automatic diagram generation failed.');
     cache.current.set(source,{source,status:'ready',image:data.image,notice:data.notice});
    }catch(error){
     cache.current.set(source,{source,status:'error',error:error.name==='TimeoutError'?'Automatic illustration timed out. No automatic retry will spend another credit.':error.message});
    }finally{refresh(n=>n+1);}
   })();
  },800);
  return()=>clearTimeout(timer);
 },[source,eligible]);
 const value=cache.current.get(source)||null;
 return {value,busy:eligible&&(!value||value.status==='pending')};
}

export function StudioAiDiagram({title,connections,stale,enabled,authenticated,value,busy,blocked=false}){
 return <section className="studio-ai-diagram" aria-label="AI illustrated wiring guide"><div className="studio-ai-diagram-heading"><div><span className="edu-kicker">ILLUSTRATED BUILD GUIDE</span><h3>See the hardware, not just the wires.</h3></div><span className="studio-board">AUTO · AI IMAGE</span></div><p>Your board-and-module illustration is generated automatically from the project’s connection plan, with colored wires, pin mapping and voltage notes.</p>{blocked&&<p className="studio-warning">Resolve the electrical review errors before an AI illustration can start.</p>}{busy&&<p className="studio-notice" role="status">Drawing your wiring guide in the background… You can continue working.</p>}<p className="studio-help">One shared AI credit per successfully generated illustration. Failed attempts do not consume credits. Switching tabs reuses the same result in this workspace. Download the image to keep it after leaving or reloading the page.</p>{!authenticated&&<p><a href="/dashboard">Sign in with a verified Student account</a> to enable automatic illustrations.</p>}{authenticated&&!enabled&&<p>Automatic AI illustrations are currently unavailable. The exact wiring guide remains available.</p>}{!connections.length&&<p>The illustration will start automatically once your project has a connection plan.</p>}{stale&&<p className="studio-warning">This guide depicts the existing connection plan. Your sketch has changed; compare its GPIO assignments with the connection table before wiring.</p>}{value?.error&&<p className="studio-error" role="alert">{value.error} The exact wiring guide is still available below.</p>}{value?.image&&<figure><a href={value.image} target="_blank" rel="noreferrer" aria-label="Open full size wiring illustration"><img src={value.image} alt={'AI wiring illustration for '+title}/></a><figcaption>{value.notice}{stale?' This image reflects the existing wiring plan, not verification of your edited code.':''}</figcaption><a href={value.image} download="CircuitByte-wiring-guide.jpg">Download wiring guide JPG</a></figure>}</section>;
}
