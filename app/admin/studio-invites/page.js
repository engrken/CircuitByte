'use client';
import {useEffect,useState} from 'react';
export default function StudioInvitations(){
 const [rows,setRows]=useState([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(''),[loaded,setLoaded]=useState(false);
 async function load(){
  setError('');
  try{
   const response=await fetch('/api/admin/studio-invites',{cache:'no-store'}),data=await response.json();
   if(!response.ok)throw Error(data.error||'Cannot load invitations');
   setRows(data.invites||[]);setReady(Boolean(data.ready));setLoaded(true);
  }catch(e){setError(e.message);}
 }
 useEffect(()=>{load();},[]);
 async function send(id){
  if(!ready||busy)return;
  setBusy(id);setError('');
  try{
   const response=await fetch('/api/admin/studio-invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:id})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Gmail failed');
   await load();
  }catch(e){setError(e.message);}finally{setBusy('');}
 }
 return <main style={{maxWidth:950,margin:'45px auto',padding:22,fontFamily:'system-ui'}}>
  <nav style={{display:'flex',gap:20,flexWrap:'wrap'}}><a href="/admin/orders">← Orders</a><a href="/admin">Admin panel</a><a href="/studio">Project Studio</a></nav>
  <h1>Studio purchase invitations</h1><p>Only customers who explicitly requested a Studio email at checkout appear here. Guest orders are never auto-registered.</p>
  <p style={{background:ready?'#e6f5e6':'#fff0d8',padding:14,borderRadius:8}}><strong>{ready?'Gmail sender ready':'Gmail sender not configured'}</strong> — invitations are {ready?'eligible for one-at-a-time delivery':'queued safely until Gmail OAuth and the delivery flag are enabled'}. This page will never send invitations in bulk.</p>
  <button onClick={load} type="button" disabled={!!busy}>Refresh queue</button>
  {error&&<p role="alert" style={{color:'#a32323'}}>{error}</p>}
  {!loaded?<p>Loading…</p>:rows.length===0?<p>No opted-in invitations are on record.</p>:<div style={{overflowX:'auto'}}>
  <table style={{borderCollapse:'collapse',width:'100%',marginTop:18}}>
   <thead><tr>{['Order','Email (admin only)','Requested','Delivery','Actions'].map(x=><th style={{padding:9,textAlign:'left',borderBottom:'1px solid #ccc'}} key={x}>{x}</th>)}</tr></thead>
   <tbody>{rows.map(item=><tr key={item.order_id}><td style={{padding:9}}>{item.reference}</td><td style={{padding:9}}>{item.email}</td><td style={{padding:9}}>{new Date(item.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</td><td style={{padding:9}}>{item.state}</td><td style={{padding:9}}><button type="button" disabled={!ready||!!busy||item.state==='sent'||item.attempts>=5} onClick={()=>send(item.order_id)}>{busy===item.order_id?'Sending…':'Send invite'}</button></td></tr>)}</tbody>
  </table></div>}
  <p style={{fontSize:12,color:'#666',lineHeight:1.6}}>Do not use this order-invitation queue as a general marketing mailing list. Recipients opted in to an account invitation only; future newsletters require separate consent and an unsubscribe mechanism.</p>
 </main>;
}
