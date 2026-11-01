'use client';
import {useState,useMemo,useEffect,useRef} from 'react';
import {prepareStudioProject} from '../../lib/studio.mjs';
import {estimateStudioBom,validateStudioSpecification} from '../../lib/studio-documentation.mjs';
import {reviewElectricalDesign} from '../../lib/studio-electrical-verification.mjs';
import {STUDIO_BUILDS} from '../../lib/studio.mjs';
import {StudioLibraryTools} from './library-tools';
import {StudioUsbTools} from './usb-tools';
import {StudioCircuitPreview} from './circuit-preview';
import {BLINK_DEMO_CODE} from '../../lib/studio-preview.mjs';
import {BOARD_OPTIONS,studioBoardName,boardSerialStarter} from '../../lib/studio-boards.mjs';
import {studioRequest} from '../../lib/studio-request.mjs';
import {DRAFT_KEY,RECOVERY_KEY,parseStudioDraft,serializeStudioDraft} from '../../lib/studio-drafts.mjs';

const DEFAULT_PROMPT = 'Make an ultrasonic distance alarm that beeps when an object comes within 20 cm.';
const INITIAL_PARTS = ['cb-059','cb-074','cb-029','cb-009','cb-002','cb-076'];
const peso = value => value===null ? 'Not priced' : '₱'+Number(value).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});

function downloadText(name,text,type='text/plain') {
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function StudioWorkspace({parts,specs={}}) {
  const [selected,setSelected]=useState(INITIAL_PARTS);
  const [board,setBoard]=useState('arduino:avr:uno');
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
  const [codeDirty,setCodeDirty]=useState(false);
  const [customLibrary,setCustomLibrary]=useState(null);
  const [manualLibraries,setManualLibraries]=useState([]);
  const [savingCloud,setSavingCloud]=useState(false);
  const [services,setServices]=useState(null),[serviceError,setServiceError]=useState(false);
  const [recovery,setRecovery]=useState(null),[draftStatus,setDraftStatus]=useState('');
  const importRef=useRef(null);
  const [usbBusy,setUsbBusy]=useState(false);
  const working=loading||busy||savingCloud||usbBusy;
  const catalogIds=useMemo(()=>parts.map(item=>item.id),[parts]);
  async function refreshServices(){
    setServiceError(false);
    try{const r=await fetch('/api/studio/capabilities',{cache:'no-store'});if(!r.ok)throw Error();setServices(await r.json());}
    catch{setServiceError(true);}
  }
  useEffect(()=>{refreshServices();},[]);
  useEffect(()=>{if(!services?.uat?.active)return;const remaining=Date.parse(services.uat.endsAt)-Date.now()+1000;const timer=setTimeout(refreshServices,Math.max(1000,Math.min(remaining,86400000)));return()=>clearTimeout(timer);},[services]);
  useEffect(()=>{
    try{const raw=localStorage.getItem(RECOVERY_KEY);if(raw)setRecovery(parseStudioDraft(raw,catalogIds));}
    catch{setDraftStatus('An older recovery draft could not be read. Your downloaded JSON files can still be imported.');}
  },[catalogIds]);
  useEffect(()=>{
    if(!project||!code.trim())return;
    const timer=setTimeout(()=>{
      try{localStorage.setItem(RECOVERY_KEY,serializeStudioDraft({project,code,prompt,selected,board,mode,codeDirty}));setDraftStatus('Autosaved on this browser · '+new Date().toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit'}));}
      catch{setDraftStatus('Autosave unavailable. Download your sketch or export project JSON to keep your changes.');}
    },700);
    return()=>clearTimeout(timer);
  },[project,code,prompt,selected,board,mode,codeDirty]);
  function checkpoint(){
    if(!project||!code.trim())return;
    try{const raw=serializeStudioDraft({project,code,prompt,selected,board,mode,codeDirty});localStorage.setItem(RECOVERY_KEY,raw);setRecovery(parseStudioDraft(raw,catalogIds));}
    catch{setDraftStatus('Draft recovery could not be updated. Export project JSON to keep your changes.');}
  }
  function restoreDraft(saved){
    setProject(saved.project);setCode(saved.code);setPrompt(saved.prompt);setSelected(saved.selected);
    setBoard(saved.board);setMode(saved.mode);setCodeDirty(true);setCompile(null);setError('');
    setManualLibraries([]);setCustomLibrary(null);setRecovery(null);setTab('code');
    setNotice('Project restored. Reattach any custom ZIP library before compilation.');
  }
  async function importDraft(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{if(file.size>100000)throw Error('Choose a CircuitByte project JSON under 100 KB.');restoreDraft(parseStudioDraft(await file.text(),catalogIds));}
    catch(e){setError(e.message||'Could not import project.');}
  }
  function exportDraft(){
    try{downloadText((project.slug||'CircuitByteProject')+'.json',serializeStudioDraft({project,code,prompt,selected,board,mode,codeDirty}),'application/json');}
    catch(e){setError(e.message);}
  }
  function serviceReason(operation){
    if(serviceError)return 'Service status unavailable. Refresh status to try again.';
    if(!services)return 'Checking service availability…';
    if(services.uat&&!services.uat.active)return services.uat.message;
    if(!(operation==='ai'?services.aiEnabled:services.compilerEnabled))return operation==='ai'?'AI generation is currently unavailable.':'Cloud compilation is currently unavailable.';
    if(!services.authenticated)return 'Sign in with a verified account to continue.';
    if(!services.usage)return 'Usage information is unavailable. Please refresh status.';
    if(services.usage[operation].remaining===0)return 'Your monthly allowance has been reached.';
    return '';
  }
  const aiReason=serviceReason('ai'),compileReason=services&&!services.compileBoards?.includes(board)?'Cloud compilation is unavailable for this board.':serviceReason('compile');
  async function chooseTemplate(build){
    checkpoint();
    setError('');setNotice('');setCompile(null);setProject(null);setCode('');setLoading(true);
    try{
      const r=await fetch('/education/code/'+build.slug+'.ino',{cache:'no-store'});if(!r.ok)throw Error('The project sketch could not be loaded. Please retry.');
      const sketch=await r.text();
      setBoard('arduino:avr:uno');setMode('guide');setSelected(build.parts);setPrompt(build.summary);
      setCode(sketch);setCodeDirty(false);setManualLibraries([]);setCustomLibrary(null);setTab('code');
      setProject({...build,board:'arduino:avr:uno',prompt:build.summary,method:'guided-template',guideUrl:'/diy/'+build.slug,missing:[],warnings:build.notes});
      setNotice('Starter loaded with its required catalog parts. Check quantities and additional supplies in Parts / BOM.');
    }catch(e){setError(e.message);}finally{setLoading(false);}
  }
  function startBoardProject(){
    const starter=boardSerialStarter(board);setProject(starter);setCode(starter.code);setPrompt(starter.prompt);
    setSelected(starter.parts);setCodeDirty(false);setCompile(null);setError('');setNotice('Serial starter loaded. Download the sketch and select the matching board in Arduino IDE.');
    setManualLibraries([]);setCustomLibrary(null);setTab('code');
  }
  const index=useMemo(()=>Object.fromEntries(parts.map(p=>[p.id,p])),[parts]);
  const filtered=useMemo(()=>parts.filter(p=>(p.name+' '+p.description+' '+p.id).toLowerCase().includes(query.toLowerCase())),[parts,query]);
  function toggle(id){setSelected(current=>current.includes(id)?current.filter(x=>x!==id):current.length<16?[...current,id]:current);}
  async function generate(){
    checkpoint();
    setError('');setNotice('');setCompile(null);setProject(null);setCode('');setLoading(true);
    try {
      if(mode==='guide'){
        if(board!=='arduino:avr:uno')throw Error('Guided curriculum templates are currently Arduino UNO-only. Switch to AI generation for the selected board.');
        const result=prepareStudioProject({prompt,parts:selected});
        const response=await fetch(result.codeUrl,{cache:'no-store'});
        if(!response.ok)throw Error('Project sketch could not be loaded.');
        const sketch=await response.text();
        setCode(sketch);setProject({...result,board});setCodeDirty(false);setTab('code');
        setNotice('Matched a published example. Editable code and missing-material warnings are shown below.');
      } else {
        const result=await studioRequest('/api/studio/ai',{prompt,parts:selected,board});
        setProject({...result,board,prompt,method:'ai-draft',missing:result.missing||[],warnings:result.warnings||[],wires:result.wires||[],netlist:result.netlist||[],parts:result.parts||selected});
        setCode(result.code);setCodeDirty(false);setTab('code');setNotice('AI draft generated. It has NOT been compiled or hardware-tested.');
      }
    }catch(e){setError(e.message||'Unable to prepare your project.');}
    finally{setLoading(false);refreshServices();}
  }
  async function runCompile(){
    if(!code.trim())return;setError('');setCompile(null);setBusy(true);
    try{
      const result=await studioRequest('/api/studio/compile',{code,board,parts:selected,customLibrary:customLibrary?.base64,manualLibraries},{timeoutMs:280000});
      setCompile(result);
    }catch(e){setError(e.message||'Compilation unavailable.');}
    finally{setBusy(false);refreshServices();}
  }
  function saveDraft(){
    if(!project)return;
    try{localStorage.setItem(DRAFT_KEY,serializeStudioDraft({project,code,prompt,selected,board,mode,codeDirty}));setNotice('Saved to this browser only. Not synced to a user account.');}
    catch{setError('Browser storage is unavailable. Download the sketch instead.');}
  }
  function openDraft(){
    try{
      const raw=localStorage.getItem(DRAFT_KEY);if(!raw)throw Error('No local draft on this browser.');
      restoreDraft(parseStudioDraft(raw,catalogIds));
    }catch(e){setError(e.message);}
  }
  async function saveCloudProject(){
    if(!project||!code.trim())return;
    setError('');setSavingCloud(true);
    try{
      const r=await fetch('/api/studio/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:project.title,templateSlug:project.slug==='studio-generated'?'':project.slug||'',code,board,parts:selected})});
      const j=await r.json();if(!r.ok)throw Error(j.error||'Unable to save.');
      setNotice('Project saved to your private dashboard.');
    }catch(e){setError(e.message+' Visit My Dashboard to sign in or register when available.');}finally{setSavingCloud(false);}
  }
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const id=params.get('project');
    if(!id&&params.has('parts')){
      const ids=[...new Set(String(params.get('parts')||'').split(',').filter(part=>parts.some(product=>product.id===part)))].slice(0,16);
      if(ids.length){setSelected(ids);const chosen=BOARD_OPTIONS.find(b=>b.catalogId&&ids.includes(b.catalogId));if(chosen){setBoard(chosen.id);if(chosen.id!=='arduino:avr:uno')setMode('ai');}setNotice('Your ordered components were loaded into the Studio picker. Select the correct controller and verify missing components.');}
    }
    if(!id||!/^[a-f0-9-]{36}$/i.test(id))return;
    let active=true;
    fetch('/api/studio/projects',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Sign in to access your saved projects.');return r.json();}).then(j=>{
      if(!active)return;
      const saved=(j.projects||[]).find(p=>p.id===id);if(!saved)throw Error('Project not found in your account.');
      const savedBoard=BOARD_OPTIONS.some(x=>x.id===saved.board)?saved.board:'arduino:avr:uno';
      setBoard(savedBoard);if(savedBoard!=='arduino:avr:uno')setMode('ai');
      const guide=savedBoard==='arduino:avr:uno'?STUDIO_BUILDS.find(x=>x.slug===saved.template_slug):null;
      setProject(guide?{...guide,method:'guided-template',slug:guide.slug,guideUrl:'/diy/'+guide.slug,missing:[],warnings:guide.notes||[]}: {slug:'studio-generated',board:savedBoard,title:saved.title,summary:'Restored from your private dashboard.',method:'ai-draft',wires:[],warnings:['Saved sketch: no verified circuit schematic is associated with this project.']});
      setSelected(Array.isArray(saved.selected_parts)?saved.selected_parts:[]);
      setCode(saved.code);setCodeDirty(true);setTab('code');setNotice('Private project loaded. Verify the sketch, library requirements and pinout before compiling.');
    }).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[]);
  function startBlinkDemo(){
    setBoard('arduino:avr:uno');setMode('guide');setSelected(['cb-059','cb-009','cb-002']);setCodeDirty(false);
    setPrompt('Blink the Arduino UNO onboard LED on D13 every 600 milliseconds.');
    setCode(BLINK_DEMO_CODE);
    setProject({slug:'blink-led-demo',title:'Blinking LED on D13',summary:'Demonstration of HIGH/LOW signals on Arduino UNO pin 13.',method:'demo',parts:['cb-059','cb-009','cb-002'],wires:[['UNO D13','Built-in LED or external LED with series resistor'],['UNO GND','LED cathode']],missing:[],warnings:['The preview animates digital output instructions; it does not emulate actual AVR firmware.']});
    setTab('preview');setCompile(null);setError('');setNotice('Illustrative Blink LED demonstration loaded. Change the delay values and preview the output.');
  }
  const missing=project?.missing||[];
  const spec=project?.method==='guided-template' ? specs[project.slug] : null;
  const docProblems=spec ? validateStudioSpecification(spec,project.slug) : [];
  const bom=useMemo(()=>estimateStudioBom(spec,parts),[spec,parts]);
  const connections=spec?.connections||project?.netlist?.length? (spec?.connections||project?.netlist) : project?.wires?.map(([pin,to])=>({pin,to,net:'Unreviewed',kind:'unverified'}))||[];
  const electricalReview=useMemo(()=>reviewElectricalDesign({board:project?.board||board,connections:spec?.connections||project?.netlist||[],components:[]}),[board,project?.board,project?.netlist,spec]);
  const diagramReady=Boolean(spec&&docProblems.length===0);
  const sheetWarning=project?.method==='ai-draft'?'AI-generated draft: no reviewed schematic is available.':!spec?'This starter has no reviewed external wiring diagram.':codeDirty?'Sketch edited: reviewed drawings reflect the ORIGINAL template, not your latest code.':'Reviewed template diagrams are illustrative reference material, not breadboard pin-placement guarantees.';
  return <section className="studio-workspace" id="workspace">
    <header className="studio-heading"><span className="edu-kicker">WORKSPACE / MULTI-BOARD AI STUDIO</span><h2>Build a project</h2><p>Five published curriculum examples provide a guided starting point. Sign in with a verified Student account to generate custom AI drafts or compile a sketch for your selected board.</p></header>
    {services?.uat&&<aside className="studio-uat-banner" aria-label="Student Hobby UAT"><strong>{services.uat.active?'Student / Hobby UAT — Free through November 30, 2026':'Student / Hobby UAT closed'}</strong><p>{services.uat.message}</p><a href="/studio/pricing">View UAT access →</a></aside>}
    <section className="studio-service-strip" aria-label="Studio service availability">
      <div><strong>{services?.authenticated?'Verified account':'Visitor workspace'}</strong><span>Guided projects, starters and browser drafts are free to use.</span><a href="/dashboard">{services?.authenticated?'My dashboard →':'Sign in / create account →'}</a></div>
      <div><strong>AI generation</strong><span>{!services?'Checking availability…':!services.aiEnabled?'Currently unavailable':services.usage?services.usage.ai.remaining+' of '+services.usage.ai.limit+' drafts remaining':'Available with verified sign-in'}</span></div>
      <div><strong>Cloud compilation</strong><span>{!services?'Checking availability…':!services.compilerEnabled?'Currently unavailable':services.usage?services.usage.compile.remaining+' of '+services.usage.compile.limit+' runs remaining':'Available with verified sign-in'}</span></div>
      <button type="button" disabled={working} onClick={refreshServices}>Refresh status</button>
      {serviceError&&<p role="status">Service status could not be loaded. Browser projects remain available.</p>}
      {services?.usage&&<small>Usage period: {services.usage.period} ({services.usage.timeZone||'Asia/Manila'})</small>}
    </section>
    <section className="studio-starters" aria-label="Project starters">
      <div><span className="edu-kicker">START WITH A COMPLETE EXAMPLE</span><h3>Choose a project. We’ll load its parts and sketch.</h3></div>
      <div className="studio-starter-grid">{STUDIO_BUILDS.map(build=><button type="button" key={build.slug} disabled={working} onClick={()=>chooseTemplate(build)}><strong>{build.title}</strong><span>{build.parts.length} catalog items · Uno · Code + diagrams</span></button>)}</div>
    </section>
    <div className="studio-draft-toolbar" aria-label="Project file tools">
      <button type="button" disabled={working} onClick={()=>importRef.current?.click()}>Import project JSON</button>
      <input ref={importRef} type="file" accept=".json,application/json" onChange={importDraft} hidden aria-label="Import CircuitByte project file"/>
      <button type="button" disabled={working} onClick={openDraft}>Load saved browser draft</button>
      {recovery&&<button type="button" disabled={working} onClick={()=>restoreDraft(recovery)}>Recover last project: {recovery.project.title}</button>}
      <span role="status">{draftStatus||'Draft recovery stores this project on your current browser.'}</span>
    </div>
    <div className="studio-grid">
      <div className="studio-controls">
        <section className="studio-panel">
          <label className="studio-label" htmlFor="studio-board-choice">Target development board</label>
          <select id="studio-board-choice" disabled={working} value={board} onChange={e=>{const next=e.target.value;checkpoint();setBoard(next);setCompile(null);setProject(null);setCode('');setError('');setNotice('');setManualLibraries([]);setCustomLibrary(null);const item=BOARD_OPTIONS.find(x=>x.id===next);setSelected(current=>[...(item?.catalogId?[item.catalogId]:[]),...current.filter(id=>!BOARD_OPTIONS.some(b=>b.catalogId===id))].slice(0,16));setMode(next==='arduino:avr:uno'?'guide':'ai');}}>
            {BOARD_OPTIONS.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
          <button type="button" className="studio-secondary" disabled={working} onClick={startBoardProject}>Load {studioBoardName(board)} serial starter</button>
          <p className="studio-help">ESP8266, ESP32 and M5Stack AI drafts use 3.3V GPIO. M5Stack Core is a reference target, not a stocked CircuitByte product. Guided examples use the Arduino Uno. Cloud compilation supports all four board targets when the service is enabled. Browser flashing supports Uno R3 ATmega328P Optiboot; other boards use their matching upload tools.</p>
        </section>
        <section className="studio-panel">
          <div className="studio-panel-heading"><span className="studio-step">01</span><h3>Your materials</h3><small>{selected.length} selected</small></div>
          <div className="studio-selected">{selected.map(id=><button type="button" key={id} disabled={working} onClick={()=>toggle(id)} title="Remove component">{index[id]?.name||id} ×</button>)}</div>
          <label className="studio-label" htmlFor="studio-parts-search">Find a product in the CircuitByte catalog</label>
          <input id="studio-parts-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search UNO, sensor, LED, LCD..." autoComplete="off"/>
          <p className="studio-help" aria-live="polite">Showing {filtered.length} matching parts · {selected.length}/16 selected</p>
          <div className="studio-part-list" role="group" aria-label="Catalog components">
            {filtered.map(item=><label key={item.id} className="studio-part">
              <input type="checkbox" checked={selected.includes(item.id)} disabled={working||(!selected.includes(item.id)&&selected.length>=16)} onChange={()=>toggle(item.id)}/>
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
          <div className="studio-examples"><button type="button" disabled={working} onClick={startBlinkDemo}>Try live Blink LED preview</button>
            {[
              ['Distance alarm','Make an ultrasonic distance alarm that beeps near obstacles.'],
              ['LED scanner','Make three LEDs light up in a running sequence.'],
              ['LCD monitor','Show room temperature and humidity with a DHT22 on an LCD.'],
              ['Light logger','Log light sensor readings onto a microSD card as CSV.']
            ].map(([label,idea])=><button type="button" key={label} disabled={working} onClick={()=>setPrompt(idea)}>{label}</button>)}
          </div>
          <fieldset className="studio-modes" disabled={working}><legend>Generation mode</legend>
            <label><input type="radio" name="studio-mode" disabled={board!=='arduino:avr:uno'} checked={mode==='guide'} onChange={()=>setMode('guide')}/> Guided example <small>Free · reliable templates</small></label>
            <label><input type="radio" name="studio-mode" checked={mode==='ai'} onChange={()=>setMode('ai')}/> AI draft <small>Verified Student account · 30 drafts/month</small></label>
          </fieldset>
          <button type="button" className="studio-primary" disabled={working||prompt.trim().length<12||(mode==='ai'&&Boolean(aiReason))} onClick={generate}>{loading?'Preparing project…':mode==='ai'?'Generate AI draft →':'Find a matching project →'}</button>
          {mode==='ai'&&aiReason&&<p className="studio-help">{aiReason} <a href="/dashboard">Open dashboard →</a></p>}
          {error&&<p role="alert" className="studio-error">{error}</p>}
          {notice&&<p role="status" className="studio-notice">{notice}</p>}
        </section>
      </div>
      <div className="studio-results">
        {!project ? <div className="studio-empty"><span>⌘</span><h3>Your workbench is ready</h3><p>Select components and describe a low-voltage project to view its code, material checklist and wiring table.</p><button type="button" disabled={loading||busy} onClick={openDraft}>Load a saved draft</button></div> :
        <section className="studio-panel studio-output">
          <div className="studio-output-heading"><div><span className="edu-kicker">{project.method==='ai-draft'?'AI-GENERATED DRAFT':project.method==='board-starter'?'SERIAL STARTER':'CURATED STARTER PROJECT'}</span><h3>{project.title}</h3><p>{project.summary}</p></div><span className="studio-board">{BOARD_OPTIONS.find(x=>x.id===(project.board||board))?.name||"UNO R3"}</span></div>
          {project.note&&<p className="studio-note">{project.note}</p>}
          <div className="studio-warning" role="status"><strong>Electrical review: {electricalReview.status==='failed'?'Failed':electricalReview.status==='incomplete'?'Incomplete':'Static checks passed'}</strong><p>{electricalReview.notice} {codeDirty?'The sketch was edited after its reference diagram was prepared.':''}</p><ul>{electricalReview.findings.map((finding,i)=><li key={i}><strong>{finding.severity.toUpperCase()}:</strong> {finding.message}</li>)}</ul>{docProblems.length>0&&<p>Template specification issues: {docProblems.join('; ')}</p>}</div>
          {missing.length>0&&<div className="studio-warning"><strong>Missing from your selection</strong><p>This example requires additional catalog components:</p><ul>{missing.map(id=><li key={id}>{index[id]?.name||id} ({id})</li>)}</ul></div>}
          <div className="studio-tabs" role="tablist" aria-label="Studio results">{['code','preview','wiring','schematic','bom','safety'].map(item=><button type="button" key={item} role="tab" id={'studio-tab-'+item} aria-controls="studio-result-panel" tabIndex={tab===item?0:-1} aria-selected={tab===item} onKeyDown={e=>{const tabs=['code','preview','wiring','schematic','bom','safety'];const i=tabs.indexOf(item);const next=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;if(next!==null){e.preventDefault();setTab(tabs[next]);e.currentTarget.parentElement.querySelectorAll('[role=tab]')[next].focus();}}} onClick={()=>setTab(item)} className={tab===item?'active':''}>{item==='code'?'Sketch':item==='preview'?'Live preview':item==='wiring'?'Connections':item==='schematic'?'Diagrams':item==='bom'?'Parts / BOM':'Safety notes'}</button>)}</div>
          <div id="studio-result-panel" role="tabpanel" aria-labelledby={'studio-tab-'+tab} tabIndex={0}>
          {tab==='preview'&&(board==='arduino:avr:uno'?<StudioCircuitPreview code={code}/>:<p className="studio-note">The LED signal preview represents Uno GPIO only. Download this {studioBoardName(board)} sketch for testing on the matching hardware.</p>)}
          {tab==='code'&&<div><label className="studio-label" htmlFor="studio-code">Arduino sketch (.ino) — editable</label><textarea id="studio-code" className="studio-code" readOnly={working} spellCheck="false" value={code} onChange={e=>{setCode(e.target.value);setCodeDirty(true);setCompile(null);}} rows={24}/></div>}
          {tab==='wiring'&&<div><p>Low-voltage connection reference. Verify the actual module pin labels, operating voltage and logic compatibility before assembly.</p><div className="studio-table"><table><thead><tr><th>Board pin / source</th><th>Connect to</th><th>Signal / net</th></tr></thead><tbody>{connections.map(({pin,to,net},i)=><tr key={i}><td>{pin}</td><td>{to}</td><td>{net}</td></tr>)}</tbody></table></div>{!diagramReady&&<p className="studio-warning">No reviewed circuit netlist is associated with this sketch. Any listed connections need independent review.</p>}</div>}
          {tab==='schematic'&&<div className="studio-diagrams">{diagramReady?<><p className="studio-note">{sheetWarning}</p><figure><img src={spec.assets.schematic} alt={'Functional circuit schematic for '+project.title} loading="lazy"/><figcaption>Functional/module schematic — named electrical nets, not physical placement.</figcaption><a href={spec.assets.schematic} download={project.slug+'-schematic.svg'}>Download schematic SVG</a></figure><figure><img src={spec.assets.wiring} alt={'Labelled pin-to-pin wiring map for '+project.title} loading="lazy"/><figcaption>Connection / wiring reference — verify breakout board pins in person.</figcaption><a href={spec.assets.wiring} download={project.slug+'-wiring.svg'}>Download wiring SVG</a></figure></>:<p className="studio-warning">No reviewed schematic or breadboard layout is associated with this sketch. The project must be checked for voltage, IO direction, shared grounds, level shifting and component ratings before any diagram is approved.</p>}</div>}
          {tab==='bom'&&<div><p>Estimated materials for the <strong>published guided template</strong>. Prices are indicative only and are NOT a checkout quotation.</p>{spec?<><div className="studio-table"><table><thead><tr><th>Part</th><th>Qty</th><th>Unit (snapshot)</th><th>Est. subtotal</th></tr></thead><tbody>{bom.lines.map((line,i)=><tr key={i}><td><strong>{line.name}</strong><small className="studio-bom-detail">{line.id} · {line.detail}{line.optional?' · optional':''}</small></td><td>{line.qty}</td><td>{peso(line.unitPrice)}</td><td>{peso(line.subtotal)}</td></tr>)}</tbody></table></div><p className="studio-bom-total"><strong>Listed required parts: {peso(bom.requiredTotal)}</strong><small>Optional variants: {peso(bom.optionalTotal)} extra</small></p>{bom.excluded.length>0&&<div className="studio-warning"><strong>Additional items excluded from the total</strong><ul>{bom.excluded.map((e,i)=><li key={i}><b>{e.qty} × {e.name}:</b> {e.reason}</li>)}</ul></div>}<p className="studio-help">{bom.pricingNotice}</p></>:<div className="studio-warning">This sketch has no reviewed materials list or cost estimate.</div>}</div>}
          {tab==='safety'&&<div className="studio-warning"><ul>{[...(project.warnings||[]),...(spec?.cautions||[])].map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
          </div>
          <div className="studio-buttons">
            <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setNotice('Sketch copied. Paste it into Arduino IDE.');}catch{setError('Clipboard access is unavailable. Select the sketch text or download the .ino file.');}}}>Copy sketch</button>
            <button type="button" onClick={exportDraft}>Export project JSON</button>
            <button type="button" onClick={()=>downloadText((project.slug||'CircuitByteProject')+'.ino',code,'text/plain')}>Download .ino</button>
            <button type="button" onClick={()=>window.print()}>Print / Save PDF sheet</button>
            <button type="button" disabled={working||!services?.authenticated||!services?.uat?.active} onClick={saveCloudProject}>{savingCloud?'Saving…':'Save to dashboard'}</button>
            <button type="button" onClick={saveDraft}>Save browser draft</button>
            <button type="button" onClick={openDraft}>Load draft</button>
            {project.guideUrl&&<a href={project.guideUrl}>Full DIY guide ↗</a>}
          </div>
          <div className="studio-compile">
            <div><h4>Real Arduino CLI compilation</h4><p>Builds run in an isolated cloud sandbox when enabled. Select the board that matches your hardware; compiler output identifies the target used. Physical wiring is not verified by the compiler.</p></div>
            <button type="button" disabled={working||!code.trim()||Boolean(compileReason)} onClick={runCompile}>{busy?'Compiling…':'Compile for '+studioBoardName(board)}</button>
          </div>
          {compileReason&&<p className="studio-help">{compileReason}</p>}
          {compile&&<div role="status" className={compile.ok?'studio-compile-result success':'studio-compile-result'}><strong>{compile.ok?'Compilation passed':'Compilation failed'}</strong><p>Build target: {compile.fqbn||compile.board}</p><pre>{compile.output}</pre>{compile.ok&&compile.firmwareHex&&<button type="button" onClick={()=>downloadText('CircuitByteSketch.ino.hex',compile.firmwareHex,'text/plain')}>Download compiled UNO .hex</button>}{compile.ok&&compile.firmwareBin&&<><button type="button" onClick={()=>{const bytes=Uint8Array.from(atob(compile.firmwareBin),char=>char.charCodeAt(0));downloadText('CircuitByteSketch.application.bin',bytes,'application/octet-stream');}}>Download application .bin</button><p>ESP application image only. Use the matching board's bootloader, partition layout and vendor upload tools; this is not a complete merged flash image.</p></>}{compile.ok&&!compile.artifactAvailable&&<p>Build completed, but no firmware artifact is available for download.</p>}</div>}
          <p className="studio-help">Use the USB hardware tools below for Uno uploads or serial monitoring. Cloud compilation requires verified sign-in and a remaining monthly allowance. Printable sheets use the browser's Save as PDF option.</p>
        </section>}
      </div>
    </div>
    {services?.usbUploadEnabled&&<StudioUsbTools board={board} compiledHex={compile?.ok&&compile.board===board?compile.firmwareHex:null} uploadEnabled={services.usbUploadEnabled} disabled={busy||loading||savingCloud} onBusyChange={setUsbBusy}/>}
    <details className="studio-advanced"><summary>Libraries and advanced build settings</summary>
      <StudioLibraryTools board={board} readOnly={working} parts={selected} catalog={parts} manualLibraries={manualLibraries} setManualLibraries={setManualLibraries} code={code} setCode={value=>{setCode(value);setCodeDirty(true);setCompile(null);}} customLibrary={customLibrary} setCustomLibrary={setCustomLibrary}/>
    </details>
    {project&&<section id="studio-print-sheet" className="studio-print-sheet" aria-label="Printable Arduino project sheet">
      <header><strong>CIRCUITBYTE / ARDUINO PROJECT SHEET</strong><p>Educational low-voltage prototype · {studioBoardName(project.board||board)} · {new Date().toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}</p><h1>{project.title}</h1><p>{project.summary}</p></header>
      <h2>1. Requirements</h2><p>{project.prompt||prompt}</p>
      {spec?<><h2>2. Bill of materials</h2><table><thead><tr><th>Part</th><th>Qty</th><th>Unit estimate</th><th>Subtotal</th></tr></thead><tbody>{bom.lines.map((line,i)=><tr key={i}><td>{line.name} ({line.id}){line.optional?' — optional':''} — {line.detail}</td><td>{line.qty}</td><td>{peso(line.unitPrice)}</td><td>{peso(line.subtotal)}</td></tr>)}</tbody></table><p><strong>Required listed parts: {peso(bom.requiredTotal)}</strong> · Optional estimate: {peso(bom.optionalTotal)}</p>{bom.excluded.length>0&&<p><strong>Unlisted/excluded:</strong> {bom.excluded.map(item=>item.qty+' × '+item.name).join('; ')}. These are not in the estimate.</p>}<p>{bom.pricingNotice}</p></>:<p><strong>This sketch has no reviewed project BOM or price quotation.</strong></p>}
      <h2>3. Pin connections</h2><table><thead><tr><th>Board pin</th><th>Destination</th><th>Net / signal</th></tr></thead><tbody>{connections.map((row,i)=><tr key={i}><td>{row.pin}</td><td>{row.to}</td><td>{row.net}</td></tr>)}</tbody></table>
      {diagramReady&&<><h2>4. Published connection illustrations</h2><p>{sheetWarning}</p><figure><img src={spec.assets.schematic} alt="Functional circuit schematic"/><figcaption>Published functional schematic</figcaption></figure><figure><img src={spec.assets.wiring} alt="Labelled wiring map"/><figcaption>Published pin/wiring reference</figcaption></figure></>}
      <h2>{diagramReady?'5':'4'}. Safety review</h2><ul>{[sheetWarning,...(project.warnings||[]),...(spec?.cautions||[])].map((note,i)=><li key={i}>{note}</li>)}</ul>
      <h2>{diagramReady?'6':'5'}. Editable Arduino sketch</h2><pre>{code}</pre>
      <footer>CircuitByte AI Project Studio · Training/reference use only · Compiler success does not validate electrical safety.</footer>
    </section>}
  </section>;
}
