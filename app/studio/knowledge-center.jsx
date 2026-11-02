'use client';
import {useState} from 'react';
import {COMMON_MODULES} from '../../lib/studio-modules.mjs';

export function StudioKnowledgeCenter({selectedModules=[],onToggleModule=()=>{},onStartExample=()=>{}}){
 const [query,setQuery]=useState('');
 const [result,setResult]=useState({modules:COMMON_MODULES.slice(0,12),reviewed:[],knowledgeAvailable:true});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [external,setExternal]=useState(null),[researching,setResearching]=useState(false);
 const [details,setDetails]=useState(''),[sourceUrl,setSourceUrl]=useState(''),[consent,setConsent]=useState(false),[submitting,setSubmitting]=useState(false);
 async function search(event){
  event?.preventDefault();setError('');setMessage('');setExternal(null);setBusy(true);
  try{
   const response=await fetch('/api/studio/knowledge?q='+encodeURIComponent(query.trim()),{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Search unavailable.');
   setResult(data);
   if(!data.knowledgeAvailable)setMessage('Approved notes are temporarily unavailable; catalogued module references are still shown.');
  }catch(e){setError(e.message||'Search is unavailable.');}
  finally{setBusy(false);}
 }
 async function research(){
  setError('');setExternal(null);setResearching(true);
  try{
   const response=await fetch('/api/studio/knowledge/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:query.trim()})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Research unavailable.');
   setExternal(data);setMessage('External reference candidates are not verified Studio knowledge. Research allowance remaining: '+data.researchRemaining);
  }catch(e){setError(e.message||'External reference lookup failed.');}
  finally{setResearching(false);}
 }
 async function submitSuggestion(event){
  event.preventDefault();if(!consent)return;
  setError('');setMessage('');setSubmitting(true);
  try{
   const response=await fetch('/api/studio/knowledge/submissions',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({topic:query.trim(),details,sourceUrl})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to submit.');
   setMessage(data.message);setDetails('');setSourceUrl('');setConsent(false);
  }catch(e){setError(e.message||'Submission unavailable.');}
  finally{setSubmitting(false);}
 }
 return <section className="studio-knowledge" aria-label="Common modules and adaptive knowledge" id="studio-knowledge">
  <div className="studio-knowledge-heading"><span className="edu-kicker">COMPONENT KNOWLEDGE CENTER</span><h3>Common modules and reviewed learning</h3><p>Browse common modules, add a reference module to your Studio draft, and find reviewed guidance. Unlisted hardware can be researched and submitted for verification.</p></div>
  <form className="studio-knowledge-search" onSubmit={search}>
   <label htmlFor="studio-module-lookup">Module name or IC</label>
   <div><input id="studio-module-lookup" value={query} onChange={e=>setQuery(e.target.value)} maxLength={90} placeholder="e.g. SIM800L, NEO-6M, INA226, RC522, LoRa" autoComplete="off"/>
    <button type="submit" disabled={busy}>{busy?'Searching…':'Search modules'}</button></div>
  </form>
  {error&&<p role="alert" className="studio-error">{error}</p>}
  {message&&<p role="status" className="studio-notice">{message}</p>}
  <div className="studio-knowledge-results">
   {result.modules.map(module=><article key={module.id} className="studio-knowledge-module">
    <div className="studio-knowledge-module-top"><strong>{module.name}</strong><small>{module.category} · {module.interface}</small></div>
    <p>{module.summary}</p>
    <details className="studio-module-guide" open={selectedModules.includes(module.id)}>
      <summary>What's this? · How to use {module.name}</summary>
      <div className="studio-module-guide-body">
        <h4>What's this module?</h4><p>{module.whatIs}</p>
        <h4>How to use it — beginner guide</h4>
        <ol>{module.howTo.map((step,i)=><li key={i}>{step}</li>)}</ol>
        <p><strong>Libraries or programming interface:</strong> {module.suggestedLibraries}</p>
        <p><strong>First hands-on test:</strong> {module.firstExperiment}</p>
        <button type="button" className="studio-example-guide-button" onClick={()=>onStartExample(module)}>Try this beginner example in Studio</button>
      </div>
    </details>
    <p className="studio-knowledge-caution">{module.caution}</p>
    <div className="studio-knowledge-module-actions"><button type="button" aria-pressed={selectedModules.includes(module.id)} onClick={()=>onToggleModule(module.id)}>{selectedModules.includes(module.id)?'Remove from draft':'Use in AI draft'}</button>
     <a href={module.sourceUrl} target="_blank" rel="noopener noreferrer">Reference source</a>
     <span>{module.catalogIds.length?'Catalog-linked: '+module.catalogIds.join(', '):'Reference only · not in store catalog'}</span></div>
   </article>)}
   {!result.modules.length&&<p>No matching built-in module entry. Check external references or submit the module for review.</p>}
  </div>
  {result.reviewed.length>0&&<div className="studio-reviewed-knowledge"><h4>Administrator-reviewed knowledge</h4>
   {result.reviewed.map(entry=><article key={entry.topicKey}><strong>{entry.title}</strong><p>{entry.summary}</p>
    <small>Reviewed guidance · revision {entry.version}</small>
    <div>{entry.sources.map((url,index)=><a key={index} href={url} target="_blank" rel="noopener noreferrer">Source {index+1}</a>)}</div>
   </article>)}
  </div>}
  <details className="studio-knowledge-research"><summary>Cannot find a module? Check external sources</summary>
   <p>For an unfamiliar chip or module, enter its hardware name above and request source discovery. Public repositories are suggestions only—not verified pinouts or certified circuit designs. Requires a verified member account.</p>
   <button type="button" disabled={researching||query.trim().length<3} onClick={research}>{researching?'Checking references…':'Check external references'}</button>
   {external&&<div className="studio-external-sources"><p>{external.notice||'Reference links; confirm the exact hardware revision.'}</p>
    <ul>{external.sources.map((source,i)=><li key={i}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> <small>{source.kind==='unverified-community-candidate'?'Unverified community source':'Official reference / library directory'}</small>{source.description&&<p>{source.description}</p>}</li>)}</ul>
   </div>}
  </details>
  <details className="studio-knowledge-research"><summary>Contribute a correction or a missing module</summary>
   <p>Member suggestions are private until an administrator checks trustworthy sources and writes approved guidance. Do not submit personal information, API keys, passwords, or private sketches.</p>
   <form className="studio-knowledge-contribute" onSubmit={submitSuggestion}>
    <label htmlFor="studio-knowledge-details">Module facts or missing support to review</label>
    <textarea id="studio-knowledge-details" value={details} onChange={e=>setDetails(e.target.value)} minLength={20} maxLength={1800} rows={4} required placeholder="What does this module do? Which model or datasheet should we check?"/>
    <label htmlFor="studio-knowledge-source">Manufacturer / reference URL (optional, HTTPS)</label>
    <input id="studio-knowledge-source" type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://manufacturer.example/specifications" maxLength={400}/>
    <label className="studio-knowledge-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/> I explicitly agree to submit this information for private administrator review.</label>
    <button type="submit" disabled={submitting||!consent||query.trim().length<3}>{submitting?'Submitting…':'Submit for verification'}</button>
   </form>
  </details>
  <p className="studio-knowledge-disclaimer">Adaptive knowledge is human-reviewed: external findings and member submissions never become trusted shared facts automatically. Always check original manufacturer specifications, supply ratings and board pinouts.</p>
 </section>;
}
