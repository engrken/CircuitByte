'use client';
import {useCallback,useEffect,useState} from 'react';
import './management.css';

export const manilaDate=value=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});

export function useManagement(endpoint){
 const [offset,setOffset]=useState(0),[data,setData]=useState(null),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async signal=>{
  try{
   const response=await fetch(`${endpoint}?offset=${offset}`,{cache:'no-store',signal});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Unable to load records.');
   setData(result);
  }catch(error){if(!signal?.aborted)setError(error.message);}
 },[endpoint,offset]);
 useEffect(()=>{
  const controller=new AbortController();
  load(controller.signal);
  return ()=>controller.abort();
 },[load]);

 async function save(body,formatNotice){
  setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Unable to save.');
   setNotice(formatNotice(result));
   await load();
   return true;
  }catch(error){setError(error.message);return false;}
  finally{setBusy(false);}
 }
 return {data,busy,error,notice,offset,setOffset,save};
}

export function Management({title,description,state,children}){
 return <main className="management">
  <header className="management-header">
   <div><h1>{title}</h1><p>{description}</p></div>
   <nav aria-label="Admin navigation"><a href="/admin">Admin dashboard</a></nav>
  </header>
  {state.error&&<p className="management-message error" role="alert">{state.error}</p>}
  {state.notice&&<p className="management-message" role="status">{state.notice}</p>}
  {state.data?children:!state.error&&<p role="status">Loading…</p>}
 </main>;
}

export function ManagementPages({state}){
 if(state.offset===0&&!state.data.hasMore)return null;
 return <nav className="management-actions" aria-label="Results pages">
  <button type="button" disabled={state.busy||state.offset===0} onClick={()=>state.setOffset(state.offset-40)}>Previous</button>
  <span>Page {state.offset/40+1}</span>
  <button type="button" disabled={state.busy||!state.data.hasMore} onClick={()=>state.setOffset(state.offset+40)}>Next</button>
 </nav>;
}
