'use client';
import {useState, useMemo} from 'react';
import {prepareStudioProject} from '../../lib/studio.mjs';

const DEFAULT_PROMPT = 'Make an ultrasonic distance alarm that beeps when an object comes within 20 cm.';
const INITIAL_PARTS = ['cb-059','cb-074','cb-029','cb-009','cb-002','cb-076'];

function downloadText(name,text,type='text/plain') {
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function StudioWorkspace({parts}) {
  const [selected,setSelected]=useState(INITIAL_PARTS);
  const [query,setQuery]=useState('');
  const [prompt,setPrompt]=useState(DEFAULT_PROMPT);
  const [project,setProject]=useState(null);
  const [code,setCode]=useState('');
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [compile,setCompile]=useState(null);
  const [mode,setMode]=useState('guide');
  const [tab,setTab]=useState('code');
  const [notice,setNotice]=useState('');
  const index=useMemo(()=>Object.fromEntries(parts.map(p=>[p.id,p])),[parts]);
  const filtered=useMemo(()=>parts.filter(p=>(p.name+' '+p.description+' '+p.id).toLowerCase().includes(query.toLowerCase())).slice(0,40),[parts,query]);
  function toggle(id){setSelected(current=>current.includes(id)?current.filter(x=>x!==id):current.length<16?[...current,id]:current);}
  async function generate(){
    setError('');setNotice('');setCompile(null);setLoading(true);
    try {
      if(mode==='guide'){
        const result=prepareStudioProject({prompt,parts:selected});
        const response=await fetch(result.codeUrl,{cache:'no-store'});
        if(!response.ok)throw Error('Project sketch could not be loaded.');
        const sketch=await response.text();
        setCode(sketch);setProject(result);setTab('code');
        setNotice('Matched a published example. Editable code and missing-material warnings are shown below.');
      } else {
        const response=await fetch('/api/studio/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,parts:selected})});
        const result=await response.json();
        if(!response.ok)throw Error(result.error||'AI generation unavailable.');
        setProject({...result,method:'ai-draft',missing:result.missing||[],warnings:result.warnings||[],wires:result.wires||[],parts:result.parts||selected});
        setCode(result.code);setTab('code');setNotice('AI draft generated. It has NOT been compiled or hardware-tested.');
      }
    }catch(e){setError(e.message||'Unable to prepare your project.');}
    finally{setLoading(false);}
  }
  async function runCompile(){
    if(!code.trim())return;setError('');setCompile(null);setBusy(true);
    try{
      const response=await fetch('/api/studio/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,board:'arduino:avr:uno'})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Compiler unavailable.');
      setCompile(result);
    }catch(e){setError(e.message||'Compilation unavailable.');}
    finally{setBusy(false);}
  }
  function saveDraft(){
    if(!project)return;
    try{localStorage.setItem('circuitbyte-studio-draft-v1',JSON.stringify({project,code,prompt,selected,mode,savedAt:new Date().toISOString()}));setNotice('Saved to this browser only. Not synced to a user account.');}
    catch{setError('Browser storage is unavailable. Download the sketch instead.');}
  }
  function openDraft(){
    try{
      const raw=localStorage.getItem('circuitbyte-studio-draft-v1');if(!raw)throw Error('No local draft on this browser.');
      const saved=JSON.parse(raw);setProject(saved.project);setCode(saved.code);setPrompt(saved.prompt);setSelected(saved.selected);setMode(saved.mode);setNotice('Loaded a local browser draft.');setCompile(null);setError('');
    }catch(e){setError(e.message);}
  }
  const missing=project?.missing||[];
  return <section className="studio-workspace" id="workspace">
    <header className="studio-heading"><span className="edu-kicker">WORKSPACE / ARDUINO UNO R3</span><h2>Build a project</h2><p>Five verified curriculum examples provide a safe starting point. An arbitrary-language AI draft and cloud compilation are separate restricted beta features.</p></header>
    <div className="studio-grid">
      <div className="studio-controls">
        <section className="studio-panel">
          <div className="studio-panel-heading"><span className="studio-step">01</span><h3>Your materials</h3><small>{selected.length} selected</small></div>
          <div className="studio-selected">{selected.map(id=><button type="button" key={id} onClick={()=>toggle(id)} title="Remove component">{index[id]?.name||id} ×</button>)}</div>
          <label className="studio-label" htmlFor="studio-parts-search">Find a product in the CircuitByte catalog</label>
          <input id="studio-parts-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search UNO, sensor, LED, LCD..." autoComplete="off"/>
          <div className="studio-part-list" role="group" aria-label="Catalog components">
            {filtered.map(item=><label key={item.id} className="studio-part">
              <input type="checkbox" checked={selected.includes(item.id)} disabled={!selected.includes(item.id)&&selected.length>=16} onChange={()=>toggle(item.id)}/>
              <span><strong>{item.name}</strong><small>{item.id} · {item.category}</small></span>
            </label>)}
            {!filtered.length&&<p>No matching catalog items found.</p>}
          </div>
          <p className="studio-help">Catalog items are suggestions, not proof that a particular module variant or quantity is in stock.</p>
        </section>
        <section className="studio-panel">
          <div className="studio-panel-heading"><span className="studio-step">02</span><h3>Tell us what to build</h3></div>
          <label className="studio-label" htmlFor="studio-idea">Project description</label>
          <textarea id="studio-idea" value={prompt} maxLength={800} rows={5} onChange={e=>setPrompt(e.target.value)} placeholder="Using my UNO and sensor, detect... then activate..." />
          <div className="studio-examples">
            {[
              ['Distance alarm','Make an ultrasonic distance alarm that beeps near obstacles.'],
              ['LED scanner','Make three LEDs light up in a running sequence.'],
              ['LCD monitor','Show room temperature and humidity with a DHT22 on an LCD.'],
              ['Light logger','Log light sensor readings onto a microSD card as CSV.']
            ].map(([label,idea])=><button type="button" key={label} onClick={()=>setPrompt(idea)}>{label}</button>)}
          </div>
          <fieldset className="studio-modes"><legend>Generation mode</legend>
            <label><input type="radio" name="studio-mode" checked={mode==='guide'} onChange={()=>setMode('guide')}/> Guided example <small>Free · reliable templates</small></label>
            <label><input type="radio" name="studio-mode" checked={mode==='ai'} onChange={()=>setMode('ai')}/> AI draft <small>Admin beta · requires AI Gateway setup</small></label>
          </fieldset>
          <button type="button" className="studio-primary" disabled={loading||prompt.trim().length<12} onClick={generate}>{loading?'Preparing project…':mode==='ai'?'Generate AI draft →':'Find a matching project →'}</button>
          {error&&<p role="alert" className="studio-error">{error}</p>}
          {notice&&<p role="status" className="studio-notice">{notice}</p>}
        </section>
      </div>
      <div className="studio-results">
        {!project ? <div className="studio-empty"><span>⌘</span><h3>Your workbench is ready</h3><p>Select components and describe a low-voltage project to view its code, material checklist and wiring table.</p><button type="button" onClick={openDraft}>Load a saved draft</button></div> :
        <section className="studio-panel studio-output">
          <div className="studio-output-heading"><div><span className="edu-kicker">{project.method==='ai-draft'?'AI-GENERATED DRAFT':'CURATED STARTER PROJECT'}</span><h3>{project.title}</h3><p>{project.summary}</p></div><span className="studio-board">UNO / 5 V</span></div>
          {project.note&&<p className="studio-note">{project.note}</p>}
          {missing.length>0&&<div className="studio-warning"><strong>Missing from your selection</strong><p>This example requires additional catalog components:</p><ul>{missing.map(id=><li key={id}>{index[id]?.name||id} ({id})</li>)}</ul></div>}
          <div className="studio-tabs" role="tablist" aria-label="Studio results">{['code','wiring','safety'].map(item=><button type="button" key={item} role="tab" aria-selected={tab===item} onClick={()=>setTab(item)} className={tab===item?'active':''}>{item==='code'?'Sketch':item==='wiring'?'Connections':'Safety notes'}</button>)}</div>
          {tab==='code'&&<div><label className="studio-label" htmlFor="studio-code">Arduino sketch (.ino) — editable</label><textarea id="studio-code" className="studio-code" spellCheck="false" value={code} onChange={e=>{setCode(e.target.value);setCompile(null);}} rows={24}/></div>}
          {tab==='wiring'&&<div><p>Low-voltage pin assignment guide. Confirm power ratings and the exact module pin labels before assembly.</p><div className="studio-table"><table><thead><tr><th>Board / source</th><th>Connect to</th></tr></thead><tbody>{(project.wires||[]).map(([from,to],i)=><tr key={i}><td>{from}</td><td>{to}</td></tr>)}</tbody></table></div></div>}
          {tab==='safety'&&<div className="studio-warning"><ul>{(project.warnings||[]).map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
          <div className="studio-buttons">
            <button type="button" onClick={()=>downloadText((project.slug||'CircuitByteProject')+'.ino',code,'text/plain')}>Download .ino</button>
            <button type="button" onClick={saveDraft}>Save draft</button>
            <button type="button" onClick={openDraft}>Load draft</button>
            {project.guideUrl&&<a href={project.guideUrl}>Full DIY guide ↗</a>}
          </div>
          <div className="studio-compile">
            <div><h4>Real Arduino CLI compilation</h4><p>Builds run in an isolated cloud sandbox, restricted to authorized beta testers. Physical wiring is not verified by the compiler.</p></div>
            <button type="button" disabled={busy||!code.trim()} onClick={runCompile}>{busy?'Compiling…':'Compile for UNO'}</button>
          </div>
          {compile&&<div role="status" className={compile.ok?'studio-compile-result success':'studio-compile-result'}><strong>{compile.ok?'Compilation passed':'Compilation failed'}</strong><pre>{compile.output}</pre></div>}
          <p className="studio-help">This is a prototype workspace. Only local browser drafts are saved; no customer accounts, uploads, simulator or physical Arduino flashing are enabled.</p>
        </section>}
      </div>
    </div>
  </section>;
}
