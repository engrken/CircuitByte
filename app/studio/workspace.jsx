'use client';
import {useState, useMemo} from 'react';
import {prepareStudioProject} from '../../lib/studio.mjs';
import {estimateStudioBom,validateStudioSpecification} from '../../lib/studio-documentation.mjs';
import {StudioUsbTools} from './usb-tools';
import {STUDIO_BUILDS} from '../../lib/studio.mjs';
import {StudioLibraryTools} from './library-tools';
import {insertSuggestedIncludes} from '../../lib/studio-libraries.mjs';
import {StudioCircuitPreview} from './circuit-preview';
import {BLINK_DEMO_CODE} from '../../lib/studio-preview.mjs';
import {useEffect} from 'react';

const DEFAULT_PROMPT = 'Make an ultrasonic distance alarm that beeps when an object comes within 20 cm.';
const INITIAL_PARTS = ['cb-059','cb-074','cb-029','cb-009','cb-002','cb-076'];
const BOARD_OPTIONS=[
  {id:'arduino:avr:uno',name:'Arduino UNO R3',catalogId:'cb-059'},
  {id:'esp8266:esp8266:nodemcuv2',name:'ESP8266 NodeMCU',catalogId:'cb-062'},
  {id:'esp32:esp32:esp32',name:'ESP32 Dev Module',catalogId:'cb-063'},
  {id:'esp32:esp32:m5stack-core-esp32',name:'M5Stack Core (ESP32)',catalogId:null}
];
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
  const index=useMemo(()=>Object.fromEntries(parts.map(p=>[p.id,p])),[parts]);
  const filtered=useMemo(()=>parts.filter(p=>(p.name+' '+p.description+' '+p.id).toLowerCase().includes(query.toLowerCase())).slice(0,40),[parts,query]);
  function toggle(id){setSelected(current=>current.includes(id)?current.filter(x=>x!==id):current.length<16?[...current,id]:current);}
  async function generate(){
    setError('');setNotice('');setCompile(null);setLoading(true);
    try {
      if(mode==='guide'){
        if(board!=='arduino:avr:uno')throw Error('Guided curriculum templates are currently Arduino UNO-only. Switch to AI generation for the selected board.');
        const result=prepareStudioProject({prompt,parts:selected});
        const response=await fetch(result.codeUrl,{cache:'no-store'});
        if(!response.ok)throw Error('Project sketch could not be loaded.');
        const sketch=await response.text();
        setCode(insertSuggestedIncludes(sketch,selected,manualLibraries));setProject(result);setCodeDirty(false);setTab('code');
        setNotice('Matched a published example. Editable code and missing-material warnings are shown below.');
      } else {
        const response=await fetch('/api/studio/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,parts:selected,board})});
        const result=await response.json();
        if(!response.ok)throw Error(result.error||'AI generation unavailable.');
        setProject({...result,board,method:'ai-draft',missing:result.missing||[],warnings:result.warnings||[],wires:result.wires||[],parts:result.parts||selected});
        setCode(insertSuggestedIncludes(result.code,selected,manualLibraries));setCodeDirty(false);setTab('code');setNotice('AI draft generated. It has NOT been compiled or hardware-tested.');
      }
    }catch(e){setError(e.message||'Unable to prepare your project.');}
    finally{setLoading(false);}
  }
  async function runCompile(){
    if(!code.trim())return;setError('');setCompile(null);setBusy(true);
    try{
      const response=await fetch('/api/studio/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,board,parts:selected,customLibrary:customLibrary?.base64,manualLibraries})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Compiler unavailable.');
      setCompile(result);
    }catch(e){setError(e.message||'Compilation unavailable.');}
    finally{setBusy(false);}
  }
  function saveDraft(){
    if(!project)return;
    try{localStorage.setItem('circuitbyte-studio-draft-v1',JSON.stringify({project,code,prompt,selected,board,mode,codeDirty,savedAt:new Date().toISOString()}));setNotice('Saved to this browser only. Not synced to a user account.');}
    catch{setError('Browser storage is unavailable. Download the sketch instead.');}
  }
  function openDraft(){
    try{
      const raw=localStorage.getItem('circuitbyte-studio-draft-v1');if(!raw)throw Error('No local draft on this browser.');
      const saved=JSON.parse(raw);setProject(saved.project);setCode(saved.code);setPrompt(saved.prompt);setSelected(saved.selected);setBoard(saved.board||'arduino:avr:uno');setMode(saved.mode);setCodeDirty(Boolean(saved.codeDirty));setNotice('Loaded a local browser draft.');setCompile(null);setError('');
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
    setBoard('arduino:avr:uno');setSelected(['cb-059','cb-009','cb-002']);
    setPrompt('Blink the Arduino UNO onboard LED on D13 every 600 milliseconds.');
    setCode(BLINK_DEMO_CODE);
    setProject({slug:'blink-led-demo',title:'Blinking LED on D13',summary:'Demonstration of HIGH/LOW signals on Arduino UNO pin 13.',method:'demo',parts:['cb-059','cb-009','cb-002'],wires:[['UNO D13','Built-in LED or external LED with series resistor'],['UNO GND','LED cathode']],missing:[],warnings:['The preview animates digital output instructions; it does not emulate actual AVR firmware.']});
    setTab('preview');setCompile(null);setError('');setNotice('Illustrative Blink LED demonstration loaded. Change the delay values and preview the output.');
  }
  const missing=project?.missing||[];
  const spec=project?.method==='guided-template' ? specs[project.slug] : null;
  const docProblems=spec ? validateStudioSpecification(spec,project.slug) : [];
  const bom=useMemo(()=>estimateStudioBom(spec,parts),[spec,parts]);
  const connections=spec?.connections||project?.wires?.map(([pin,to])=>({pin,to,net:'Unreviewed',kind:'unverified'}))||[];
  const diagramReady=Boolean(spec&&docProblems.length===0);
  const sheetWarning=project?.method==='ai-draft'?'AI-generated draft: no reviewed schematic is available.':codeDirty?'Sketch edited: reviewed drawings reflect the ORIGINAL template, not your latest code.':'Reviewed template diagrams are illustrative reference material, not breadboard pin-placement guarantees.';
  return <section className="studio-workspace" id="workspace">
    <header className="studio-heading"><span className="edu-kicker">WORKSPACE / MULTI-BOARD AI STUDIO</span><h2>Build a project</h2><p>Five published curriculum examples provide a guided starting point. An arbitrary-language AI draft and cloud compilation are separate restricted beta features.</p></header>
    <StudioLibraryTools parts={selected} catalog={parts} manualLibraries={manualLibraries} setManualLibraries={setManualLibraries} code={code} setCode={value=>{setCode(value);setCodeDirty(true);setCompile(null);}} customLibrary={customLibrary} setCustomLibrary={setCustomLibrary}/>
    {board==='arduino:avr:uno'&&<StudioUsbTools compiledHex={compile?.ok?compile.firmwareHex:null}/>}
    <div className="studio-grid">
      <div className="studio-controls">
        <section className="studio-panel">
          <label className="studio-label" htmlFor="studio-board-choice">Target development board</label>
          <select id="studio-board-choice" value={board} onChange={e=>{const next=e.target.value;setBoard(next);setCompile(null);setProject(null);const item=BOARD_OPTIONS.find(x=>x.id===next);if(item?.catalogId)setSelected(current=>[item.catalogId,...current.filter(id=>!BOARD_OPTIONS.some(b=>b.catalogId===id))].slice(0,16));setMode('ai');}}>
            {BOARD_OPTIONS.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
          <p className="studio-help">ESP8266, ESP32 and M5Stack AI drafts use 3.3V GPIO. M5Stack Core is a reference target, not a stocked CircuitByte product. Guided examples and browser USB flashing remain UNO-only. Cloud compilation for other boards is experimental and requires the compiler feature to be enabled.</p>
        </section>
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
          <div className="studio-examples"><button type="button" onClick={startBlinkDemo}>Try live Blink LED preview</button>
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
          <div className="studio-output-heading"><div><span className="edu-kicker">{project.method==='ai-draft'?'AI-GENERATED DRAFT':'CURATED STARTER PROJECT'}</span><h3>{project.title}</h3><p>{project.summary}</p></div><span className="studio-board">{BOARD_OPTIONS.find(x=>x.id===(project.board||board))?.name||"UNO R3"}</span></div>
          {project.note&&<p className="studio-note">{project.note}</p>}
          {missing.length>0&&<div className="studio-warning"><strong>Missing from your selection</strong><p>This example requires additional catalog components:</p><ul>{missing.map(id=><li key={id}>{index[id]?.name||id} ({id})</li>)}</ul></div>}
          <div className="studio-tabs" role="tablist" aria-label="Studio results">{['code','preview','wiring','schematic','bom','safety'].map(item=><button type="button" key={item} role="tab" aria-selected={tab===item} onClick={()=>setTab(item)} className={tab===item?'active':''}>{item==='code'?'Sketch':item==='preview'?'Live preview':item==='wiring'?'Connections':item==='schematic'?'Diagrams':item==='bom'?'Parts / BOM':'Safety notes'}</button>)}</div>
          {tab==='preview'&&<StudioCircuitPreview code={code}/>}
          {tab==='code'&&<div><label className="studio-label" htmlFor="studio-code">Arduino sketch (.ino) — editable</label><textarea id="studio-code" className="studio-code" spellCheck="false" value={code} onChange={e=>{setCode(e.target.value);setCodeDirty(true);setCompile(null);}} rows={24}/></div>}
          {tab==='wiring'&&<div><p>Low-voltage connection reference. Verify the actual module pin labels, operating voltage and logic compatibility before assembly.</p><div className="studio-table"><table><thead><tr><th>Board pin / source</th><th>Connect to</th><th>Signal / net</th></tr></thead><tbody>{connections.map(({pin,to,net},i)=><tr key={i}><td>{pin}</td><td>{to}</td><td>{net}</td></tr>)}</tbody></table></div>{!diagramReady&&<p className="studio-warning">No validated circuit netlist is available for this AI draft. Treat these connections as unreviewed suggestions.</p>}</div>}
          {tab==='schematic'&&<div className="studio-diagrams">{diagramReady?<><p className="studio-note">{sheetWarning}</p><figure><img src={spec.assets.schematic} alt={'Functional circuit schematic for '+project.title} loading="lazy"/><figcaption>Functional/module schematic — named electrical nets, not physical placement.</figcaption><a href={spec.assets.schematic} download={project.slug+'-schematic.svg'}>Download schematic SVG</a></figure><figure><img src={spec.assets.wiring} alt={'Labelled pin-to-pin wiring map for '+project.title} loading="lazy"/><figcaption>Connection / wiring reference — verify breakout board pins in person.</figcaption><a href={spec.assets.wiring} download={project.slug+'-wiring.svg'}>Download wiring SVG</a></figure></>:<p className="studio-warning">No reviewed schematic or breadboard layout exists for this AI draft. The project must be checked for voltage, IO direction, shared grounds, level shifting and component ratings before any diagram is approved.</p>}</div>}
          {tab==='bom'&&<div><p>Estimated materials for the <strong>published guided template</strong>. Prices are indicative only and are NOT a checkout quotation.</p>{spec?<><div className="studio-table"><table><thead><tr><th>Part</th><th>Qty</th><th>Unit (snapshot)</th><th>Est. subtotal</th></tr></thead><tbody>{bom.lines.map((line,i)=><tr key={i}><td><strong>{line.name}</strong><small className="studio-bom-detail">{line.id} · {line.detail}{line.optional?' · optional':''}</small></td><td>{line.qty}</td><td>{peso(line.unitPrice)}</td><td>{peso(line.subtotal)}</td></tr>)}</tbody></table></div><p className="studio-bom-total"><strong>Listed required parts: {peso(bom.requiredTotal)}</strong><small>Optional variants: {peso(bom.optionalTotal)} extra</small></p>{bom.excluded.length>0&&<div className="studio-warning"><strong>Additional items excluded from the total</strong><ul>{bom.excluded.map((e,i)=><li key={i}><b>{e.qty} × {e.name}:</b> {e.reason}</li>)}</ul></div>}<p className="studio-help">{bom.pricingNotice}</p></>:<div className="studio-warning">AI draft: no reviewed materials list or trustworthy cost estimate exists yet.</div>}</div>}
          {tab==='safety'&&<div className="studio-warning"><ul>{[...(project.warnings||[]),...(spec?.cautions||[])].map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
          <div className="studio-buttons">
            <button type="button" onClick={()=>downloadText((project.slug||'CircuitByteProject')+'.ino',code,'text/plain')}>Download .ino</button>
            <button type="button" onClick={()=>window.print()}>Print / Save PDF sheet</button>
            <button type="button" disabled={savingCloud} onClick={saveCloudProject}>{savingCloud?'Saving…':'Save to dashboard'}</button>
            <button type="button" onClick={saveDraft}>Save browser draft</button>
            <button type="button" onClick={openDraft}>Load draft</button>
            {project.guideUrl&&<a href={project.guideUrl}>Full DIY guide ↗</a>}
          </div>
          <div className="studio-compile">
            <div><h4>Real Arduino CLI compilation</h4><p>Builds run in an isolated cloud sandbox when enabled. ESP8266, ESP32 and M5Stack cores are experimental and may exceed sandbox time limits. Physical wiring is not verified by the compiler.</p></div>
            <button type="button" disabled={busy||!code.trim()} onClick={runCompile}>{busy?'Compiling…':'Compile for UNO'}</button>
          </div>
          {compile&&<div role="status" className={compile.ok?'studio-compile-result success':'studio-compile-result'}><strong>{compile.ok?'Compilation passed':'Compilation failed'}</strong><pre>{compile.output}</pre>{compile.ok&&compile.firmwareHex&&<button type="button" onClick={()=>downloadText('CircuitByteSketch.ino.hex',compile.firmwareHex,'text/plain')}>Download compiled UNO .hex</button>}{compile.ok&&!compile.firmwareHex&&<p>Build completed, but no firmware artifact is available for USB upload.</p>}</div>}
          <p className="studio-help">USB serial and HEX upload are experimental: only UNO R3/ATmega328P Optiboot at 115200 baud is supported and no real-board upload has yet been verified. Cloud compilation requires an enabled server feature flag and verified Student login; printable sheets use the browser's Save as PDF option.</p>
        </section>}
      </div>
    </div>
    {project&&<section id="studio-print-sheet" className="studio-print-sheet" aria-label="Printable Arduino project sheet">
      <header><strong>CIRCUITBYTE / ARDUINO PROJECT SHEET</strong><p>Educational low-voltage prototype · Arduino UNO R3 · {new Date().toLocaleDateString('en-PH')}</p><h1>{project.title}</h1><p>{project.summary}</p></header>
      <h2>1. Requirements</h2><p>{prompt}</p>
      {spec?<><h2>2. Bill of materials</h2><table><thead><tr><th>Part</th><th>Qty</th><th>Unit estimate</th><th>Subtotal</th></tr></thead><tbody>{bom.lines.map((line,i)=><tr key={i}><td>{line.name} ({line.id}){line.optional?' — optional':''} — {line.detail}</td><td>{line.qty}</td><td>{peso(line.unitPrice)}</td><td>{peso(line.subtotal)}</td></tr>)}</tbody></table><p><strong>Required listed parts: {peso(bom.requiredTotal)}</strong> · Optional estimate: {peso(bom.optionalTotal)}</p>{bom.excluded.length>0&&<p><strong>Unlisted/excluded:</strong> {bom.excluded.map(item=>item.qty+' × '+item.name).join('; ')}. These are not in the estimate.</p>}<p>{bom.pricingNotice}</p></>:<p><strong>AI draft: no verified project BOM or price quotation.</strong></p>}
      <h2>3. Pin connections</h2><table><thead><tr><th>Board pin</th><th>Destination</th><th>Net / signal</th></tr></thead><tbody>{connections.map((row,i)=><tr key={i}><td>{row.pin}</td><td>{row.to}</td><td>{row.net}</td></tr>)}</tbody></table>
      {diagramReady&&<><h2>4. Published connection illustrations</h2><p>{sheetWarning}</p><figure><img src={spec.assets.schematic} alt="Functional circuit schematic"/><figcaption>Published functional schematic</figcaption></figure><figure><img src={spec.assets.wiring} alt="Labelled wiring map"/><figcaption>Published pin/wiring reference</figcaption></figure></>}
      <h2>{diagramReady?'5':'4'}. Safety review</h2><ul>{[sheetWarning,...(project.warnings||[]),...(spec?.cautions||[])].map((note,i)=><li key={i}>{note}</li>)}</ul>
      <h2>{diagramReady?'6':'5'}. Editable Arduino sketch</h2><pre>{code}</pre>
      <footer>CircuitByte AI Project Studio · Training/reference use only · Compiler success does not validate electrical safety.</footer>
    </section>}
  </section>;
}
