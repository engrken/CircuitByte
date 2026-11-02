'use client';
import {useState} from 'react';

export function StudioKnowledgeReview(){
 const [queue,setQueue]=useState(null),[active,setActive]=useState(null);
 const [title,setTitle]=useState(''),[summary,setSummary]=useState(''),[keywords,setKeywords]=useState(''),[source,setSource]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){
  setError('');setBusy(true);
  try{
   const response=await fetch('/api/admin/studio-knowledge',{cache:'no-store'});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Review queue unavailable.');
   setQueue(data.pending||[]);
  }catch(e){setError(e.message||'Unable to load knowledge queue.');}
  finally{setBusy(false);}
 }
 function select(item){
  setActive(item);setTitle(item.topic);setSummary('');setKeywords(item.topic);setSource(item.source_url||'');setError('');setNotice('');
 }
 async function review(decision){
  if(!active)return;
  if(!window.confirm(decision==='approve'?'Publish reviewer-authored guidance for every Studio user?':'Reject this unverified submission?'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/admin/studio-knowledge',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:active.id,decision,title,summary,keywords,sourceUrls:source?[source]:[]})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Review failed.');
   setActive(null);setNotice(decision==='approve'?'Reviewed guidance published to the shared knowledge library.':'Submission rejected; nothing was published.');
   await load();
  }catch(e){setError(e.message||'Review failed.');}
  finally{setBusy(false);}
 }
 return <section className="account-card account-admin-review" aria-label="Studio adaptive knowledge moderation">
  <h2>Studio knowledge verification (admin only)</h2>
  <p>Private member suggestions and unverified external links are <strong>not trusted</strong>. Consult an original manufacturer specification, write an independent summary, and include its official HTTPS source before approval.</p>
  <button type="button" onClick={load} disabled={busy}>{busy?'Checking…':'Load pending knowledge suggestions'}</button>
  {error&&<p role="alert" className="account-error">{error}</p>}
  {notice&&<p role="status" className="account-notice">{notice}</p>}
  {queue&&<p>{queue.length} pending suggestions are available for review.</p>}
  {queue&&<ul className="account-projects">{queue.map(item=><li key={item.id}>
   <div><strong>{item.topic}</strong><span>{new Date(item.created_at).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}</span><p>{item.details}</p>
    {item.source_url&&<a href={item.source_url} target="_blank" rel="noopener noreferrer">User-provided reference (unverified)</a>}</div>
   <button type="button" disabled={busy} onClick={()=>select(item)}>Review</button>
  </li>)}</ul>}
  {active&&<div className="studio-knowledge-review-form">
   <h3>Review: {active.topic}</h3>
   <p>Do not copy unsupported user assertions. Record only content independently checked against the source.</p>
   <label>Approved topic title<input maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} required/></label>
   <label>Independent technical summary<textarea rows={5} minLength={40} maxLength={1800} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Document interface, board compatibility, electrical limitations and unresolved details." required/></label>
   <label>Search keywords<input maxLength={500} value={keywords} onChange={e=>setKeywords(e.target.value)}/></label>
   <label>Verified manufacturer / official documentation HTTPS URL<input type="url" maxLength={400} value={source} onChange={e=>setSource(e.target.value)} required/></label>
   <div className="studio-review-actions"><button disabled={busy||title.trim().length<6||summary.trim().length<40||!source.trim()} type="button" onClick={()=>review('approve')}>Approve reviewed knowledge</button>
   <button disabled={busy} type="button" onClick={()=>review('reject')}>Reject submission</button>
   <button type="button" onClick={()=>setActive(null)}>Cancel</button></div>
  </div>}
 </section>;
}
