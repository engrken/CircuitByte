'use client';
import {STUDIO_STEPS,suggestStudioSetup,reuseSuccessfulCompilation} from '../../lib/studio-workflow.mjs';
import {prepareConnectionPlan} from '../../lib/studio-connection-plan.mjs';
import {StudioHardwareWiring} from './hardware-wiring';
import {useState,useMemo,useEffect,useRef} from 'react';
import {prepareStudioProject} from '../../lib/studio.mjs';
import {estimateStudioBom,validateStudioSpecification} from '../../lib/studio-documentation.mjs';
import {reviewElectricalDesign} from '../../lib/studio-electrical-verification.mjs';
import {STUDIO_BUILDS} from '../../lib/studio.mjs';
import {StudioLibraryTools} from './library-tools';
import {StudioUsbTools} from './usb-tools';
import {StudioCopilot} from './copilot';
import {StudioAiDiagram,useAutomaticDiagram} from './ai-diagram';
import {UPLOAD_PROFILES,decodeEspImage} from '../../lib/studio-upload-profiles.mjs';
import {StudioConnectionDiagram} from './connection-diagram';
import {StudioPartsShop} from './parts-shop';
import {StudioCircuitPreview} from './circuit-preview';
import {BLINK_DEMO_CODE} from '../../lib/studio-preview.mjs';
import {BOARD_OPTIONS,studioBoardName,boardSerialStarter} from '../../lib/studio-boards.mjs';
import {MODULE_STARTERS,moduleSerialStarter} from '../../lib/studio-module-starters.mjs';
import {StudioUpdates} from './studio-updates';
import {StudioKnowledgeCenter} from './knowledge-center';
import {StudioProjectCoach} from './project-coach';
import {StudioAcceptancePanel} from './acceptance-panel';
import {createAcceptanceRecord,acceptanceScope,acceptanceSummary} from '../../lib/studio-acceptance.mjs';
import {assessStudioProject} from '../../lib/studio-project-coach.mjs';
import {COMMON_MODULES} from '../../lib/studio-modules.mjs';
import {studioRequest,studioProgressRequest} from '../../lib/studio-request.mjs';
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
export function StudioWorkspace({parts,specs={},releaseRevision=''}) {
  const [step,setStep]=useState(0),[approvals,setApprovals]=useState({}),[ownMaterials,setOwnMaterials]=useState(''),[compiledKey,setCompiledKey]=useState(''),[ideVerified,setIdeVerified]=useState(''),[projectSetupKey,setProjectSetupKey]=useState('');
  const [selected,setSelected]=useState(INITIAL_PARTS);
  const [extraModules,setExtraModules]=useState([]);
  const [board,setBoard]=useState('arduino:avr:uno');
  const [query,setQuery]=useState('');
  const [prompt,setPrompt]=useState(DEFAULT_PROMPT);
  const [project,setProject]=useState(null);
  const [code,setCode]=useState('');
  const [loading,setLoading]=useState(false);
  const [aiProgress,setAiProgress]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [compile,setCompile]=useState(null);
  const [mode,setMode]=useState('guide');
  const [aiProvider,setAiProvider]=useState('gateway');
  const [tab,setTab]=useState('code');
  const [notice,setNotice]=useState('');
  const [codeDirty,setCodeDirty]=useState(false);
  const [customLibrary,setCustomLibrary]=useState(null);
  const [manualLibraries,setManualLibraries]=useState([]);
  const [savingCloud,setSavingCloud]=useState(false);
  const [cloudProjectId,setCloudProjectId]=useState(''),[cloudRevision,setCloudRevision]=useState(0);
  const [services,setServices]=useState(null),[serviceError,setServiceError]=useState(false);
  const [recovery,setRecovery]=useState(null),[draftStatus,setDraftStatus]=useState('');
  const importRef=useRef(null);
  const [usbBusy,setUsbBusy]=useState(false);
  const [acceptance,setAcceptance]=useState(createAcceptanceRecord);
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
      try{localStorage.setItem(RECOVERY_KEY,serializeStudioDraft({project,code,prompt,selected,board,mode,codeDirty,moduleIds:extraModules,ownMaterials,acceptance}));setDraftStatus('Autosaved on this browser · '+new Date().toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit'}));}
      catch{setDraftStatus('Autosave unavailable. Download your sketch or export project JSON to keep your changes.');}
    },700);
    return()=>clearTimeout(timer);
  },[project,code,prompt,selected,board,mode,codeDirty,extraModules,ownMaterials,acceptance]);
  function checkpoint(){
    if(!project||!code.trim())return;
    try{const raw=serializeStudioDraft({project,code,prompt,selected,board,mode,codeDirty,moduleIds:extraModules,ownMaterials,acceptance});localStorage.setItem(RECOVERY_KEY,raw);setRecovery(parseStudioDraft(raw,catalogIds));}
    catch{setDraftStatus('Draft recovery could not be updated. Export project JSON to keep your changes.');}
  }
  function restoreDraft(saved){
    setCloudProjectId('');setCloudRevision(0);
    setAcceptance(saved.acceptance||createAcceptanceRecord());
    setProject(saved.project);setCode(saved.code);setPrompt(saved.prompt);setSelected(saved.selected);setOwnMaterials(saved.ownMaterials||'');setApprovals({});setStep(0);setExtraModules(saved.moduleIds||[]);
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
    try{downloadText((project.slug||'CircuitByteProject')+'.json',serializeStudioDraft({project,code,prompt,selected,board,mode,codeDirty,moduleIds:extraModules,ownMaterials,acceptance}),'application/json');}
    catch(e){setError(e.message);}
  }
  function serviceReason(operation){
    if(serviceError)return 'Service status unavailable. Refresh status to try again.';
    if(!services)return 'Checking service availability…';
    if(services.uat&&!services.uat.active)return services.uat.message;
    if(!(operation==='ai'?services.aiEnabled:services.compilerEnabled))return operation==='ai'?'AI generation is currently unavailable.':'Cloud compilation is currently unavailable.';
    if(operation==='ai'&&aiProvider==='copilot'&&!services.copilot?.connected)return 'Connect GitHub Copilot below before generating.';
    if(!services.authenticated)return 'Sign in with a verified account to continue.';
    if(!services.usage)return 'Usage information is unavailable. Please refresh status.';
    if(services.usage[operation].remaining===0)return 'Your monthly allowance has been reached.';
    return '';
  }
  const aiReason=serviceReason('ai'),compileReason=services&&!services.compileBoards?.includes(board)?'Cloud compilation is unavailable for this board.':serviceReason('compile');
  async function chooseTemplate(build){
    checkpoint();setCloudProjectId('');setCloudRevision(0);
    setError('');setNotice('');setCompile(null);setProject(null);setCode('');setLoading(true);
    try{
      const r=await fetch('/education/code/'+build.slug+'.ino',{cache:'no-store'});if(!r.ok)throw Error('The project sketch could not be loaded. Please retry.');
      const sketch=await r.text();
      setBoard('arduino:avr:uno');setMode('guide');setSelected(build.parts);setPrompt(build.summary);
      setAcceptance(createAcceptanceRecord());setCode(sketch);setCodeDirty(false);setManualLibraries([]);setCustomLibrary(null);setTab('code');setExtraModules([]);
      setProject({...build,board:'arduino:avr:uno',prompt:build.summary,method:'guided-template',guideUrl:'/diy/'+build.slug,missing:[],warnings:build.notes});
      setNotice('Starter loaded with its required catalog parts. Check quantities and additional supplies in Parts / BOM.');
    }catch(e){setError(e.message);}finally{setLoading(false);}
  }
  function startBoardProject(){
    checkpoint();setCloudProjectId('');setCloudRevision(0);
    const starter=boardSerialStarter(board);setAcceptance(createAcceptanceRecord());setProject(starter);setCode(starter.code);setPrompt(starter.prompt);
    setSelected(starter.parts);setExtraModules([]);setCodeDirty(false);setCompile(null);setError('');setNotice('Serial starter loaded. Download the sketch and select the matching board in Arduino IDE.');
    setManualLibraries([]);setCustomLibrary(null);setTab('code');
  }
  function startModuleProject(starterId){
    checkpoint();
    try{
      const starter=moduleSerialStarter(board,starterId,selected);
      setCloudProjectId('');setCloudRevision(0);
      setAcceptance(createAcceptanceRecord());setProject(starter);setCode(starter.code);setPrompt(starter.prompt);setSelected(starter.parts);
      const moduleId={'gps-neo6m':'neo6m','gsm-sim900a':'sim900a','bluetooth-hc05':'hc05'}[starterId];setExtraModules(moduleId?[moduleId]:[]);
      setCodeDirty(false);setCompile(null);setError('');
      setNotice('Module serial starter loaded. Power wiring is deliberately omitted until you verify your exact breakout, logic levels and board pins.');
      setManualLibraries([]);setCustomLibrary(null);setTab('code');
    }catch(error){setError(error.message||'Module starter could not be loaded.');}
  }
  function startModuleExample(module){
    checkpoint();
    setExtraModules(current=>current.includes(module.id)?current:current.length<8?[...current,module.id]:[...current.slice(1),module.id]);
    setPrompt('Using a '+module.name+' with my selected '+studioBoardName(board)+' board, create a low-voltage beginner learning project to '+module.firstExperiment.replace(/[.!]$/,'')+'. Include the required library, beginner code, verification procedure and wiring precautions.');
    setMode('ai');setCompile(null);setError('');
    setNotice('A beginner example prompt has been prepared. Review your materials and selected board, then choose Generate AI Project.');
    document.getElementById('studio-idea')?.focus();
  }
  const index=useMemo(()=>Object.fromEntries(parts.map(p=>[p.id,p])),[parts]);
  const filtered=useMemo(()=>parts.filter(p=>(p.name+' '+p.description+' '+p.id).toLowerCase().includes(query.toLowerCase())),[parts,query]);
  const selectedModuleGuides=useMemo(()=>COMMON_MODULES.filter(module=>module.catalogIds.some(id=>selected.includes(id))),[selected]);
  function toggle(id){setSelected(current=>current.includes(id)?current.filter(x=>x!==id):current.length<16?[...current,id]:current);}
  async function generate(){
    if(!passed[0]||!passed[1]||approvals.board!==setupKey){setError('Complete Idea, Materials and Board confirmations first.');return;}
    checkpoint();
    setError('');setNotice('');setAiProgress('');setLoading(true);
    try {
      if(mode==='guide'){
        if(ownMaterials.trim())throw Error('Select AI draft to include your own unlisted materials.');
        if(board!=='arduino:avr:uno')throw Error('Guided curriculum templates are currently Arduino UNO-only. Switch to AI generation for the selected board.');
        const result=prepareStudioProject({prompt,parts:selected});
        const response=await fetch(result.codeUrl,{cache:'no-store'});
        if(!response.ok)throw Error('Project sketch could not be loaded.');
        const sketch=await response.text();
        setCompile(null);setAcceptance(createAcceptanceRecord());setCode(sketch);setProject({...result,board});setCodeDirty(false);setTab('code');
        setStep(3);setTab('schematic');setNotice('Matched a published example. Editable code and missing-material warnings are shown below.');
      } else {
        const result=await studioProgressRequest('/api/studio/ai/progress',{prompt,parts:selected,board,moduleIds:extraModules,ownMaterials,provider:aiProvider},{timeoutMs:aiProvider==='copilot'?105000:45000,onProgress:setAiProgress});
        setCompile(null);setAcceptance(createAcceptanceRecord());
        setProject({...result,board,prompt,method:'ai-draft',missing:result.missing||[],warnings:result.warnings||[],wires:result.wires||[],netlist:result.netlist||[],parts:result.parts||selected});
        setCode(result.code);setCodeDirty(false);setTab('code');setStep(3);setTab('schematic');setNotice('AI draft generated. It has NOT been compiled or hardware-tested.');
      }
    }catch(e){setError(e.message||'Unable to prepare your project.');}
    finally{setLoading(false);setAiProgress('');refreshServices();}
  }
  async function runCompile(){
    if(!passed.slice(0,5).every(Boolean))return;
    if(reuseSuccessfulCompilation(compile,compiledKey,buildKey)){
      setError('');
      setNotice('This exact board, sketch and library configuration has already compiled. Reuse the existing firmware or edit the sketch before recompiling; no new Sandbox run or build credit was used.');
      setStep(6);
      return;
    }
    setError('');setCompile(null);setBusy(true);
    try{
      const result=await studioRequest('/api/studio/compile',{code,board,parts:selected,customLibrary:customLibrary?.base64,manualLibraries},{timeoutMs:280000});
      setCompile(result);setCompiledKey(buildKey);
    }catch(e){setError(e.message||'Compilation unavailable.');}
    finally{setBusy(false);refreshServices();}
  }
  async function repairSketch(){
    if(!compile||compile.ok||!code.trim()||aiReason)return;
    checkpoint();setError('');setAiProgress('');setLoading(true);
    try{
      const result=await studioProgressRequest('/api/studio/ai/progress',{prompt,parts:selected,board,moduleIds:extraModules,ownMaterials,repairCode:code,compilerFeedback:String(compile.output||compile.error||'').slice(-1400),provider:aiProvider},{timeoutMs:aiProvider==='copilot'?105000:45000,onProgress:setAiProgress});
      setProject({...result,board,prompt,method:'ai-draft',missing:result.missing||[],warnings:result.warnings||[],wires:result.wires||[],netlist:result.netlist||[],parts:result.parts||selected});
      setCode(result.code);setCodeDirty(true);setCompile(null);setTab('code');
      setNotice('AI suggested a repair. Your previous sketch is in browser recovery. Review wiring, then recompile.');
    }catch(e){setError(e.message||'AI repair failed; your original sketch is unchanged.');}
    finally{setLoading(false);setAiProgress('');refreshServices();}
  }
  function saveDraft(){
    if(!project)return;
    try{localStorage.setItem(DRAFT_KEY,serializeStudioDraft({project,code,prompt,selected,board,mode,codeDirty,moduleIds:extraModules,ownMaterials,acceptance}));setNotice('Saved to this browser only. Not synced to a user account.');}
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
      const isUpdate=Boolean(cloudProjectId);
      const body={
        title:project.title,templateSlug:project.slug==='studio-generated'?'':project.slug||'',
        code,board,parts:selected,moduleIds:extraModules,prompt,ownMaterials,acceptance,
        ...(isUpdate?{id:cloudProjectId,revision:cloudRevision}:{})
      };
      const r=await fetch('/api/studio/projects',{
        method:isUpdate?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
      });
      const j=await r.json();if(!r.ok)throw Error(j.error||'Unable to save this private project.');
      setCloudProjectId(j.id);setCloudRevision(j.revision);
      setNotice(isUpdate?'Existing private project updated without using another project slot.':'New private project saved. Later updates will reuse this slot.');
    }catch(e){
      setError((e.message||'Cloud save failed.')+' Your local browser draft remains available; export JSON before reloading if another device changed this project.');
    }finally{setSavingCloud(false);}
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
      setAcceptance(saved.acceptance_record?.criteria?.length?saved.acceptance_record:createAcceptanceRecord());
      setCloudProjectId(saved.id);setCloudRevision(Number(saved.revision)||1);
      setBoard(savedBoard);if(savedBoard!=='arduino:avr:uno')setMode('ai');
      setPrompt(saved.prompt||'');setOwnMaterials(saved.own_materials||'');
      const guide=savedBoard==='arduino:avr:uno'?STUDIO_BUILDS.find(x=>x.slug===saved.template_slug):null;
      setProject(guide?{...guide,method:'guided-template',slug:guide.slug,guideUrl:'/diy/'+guide.slug,missing:[],warnings:guide.notes||[]}: {slug:'studio-generated',board:savedBoard,title:saved.title,summary:'Restored from your private dashboard.',method:'ai-draft',wires:[],warnings:['Saved sketch: no verified circuit schematic is associated with this project.']});
      setSelected(Array.isArray(saved.selected_parts)?saved.selected_parts:[]);
      setExtraModules(Array.isArray(saved.selected_modules)?saved.selected_modules:[]);
      setCode(saved.code);setCodeDirty(true);setTab('code');setNotice('Private project loaded with its user-reported acceptance evidence. Verify the saved sketch, requirements and wiring before compiling.');
    }).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[]);
  function startBlinkDemo(){
    setCloudProjectId('');setCloudRevision(0);
    setAcceptance(createAcceptanceRecord());setBoard('arduino:avr:uno');setMode('guide');setSelected(['cb-059','cb-009','cb-002']);setExtraModules([]);setCodeDirty(false);
    setPrompt('Blink the Arduino UNO onboard LED on D13 every 600 milliseconds.');
    setCode(BLINK_DEMO_CODE);
    setProject({slug:'blink-led-demo',title:'Blinking LED on D13',summary:'Demonstration of HIGH/LOW signals on Arduino UNO pin 13.',method:'demo',parts:['cb-059','cb-009','cb-002'],netlist:[{pin:'D13',to:'LED anode through series current-limiting resistor',net:'LED signal',kind:'digital-output',signalVoltage:5},{pin:'GND',to:'LED cathode',net:'Common ground',kind:'ground'}],wires:[['UNO D13','Built-in LED or external LED with series resistor'],['UNO GND','LED cathode']],missing:[],warnings:['The preview animates digital output instructions; it does not emulate actual AVR firmware.']});
    setTab('preview');setCompile(null);setError('');setNotice('Illustrative Blink LED demonstration loaded. Change the delay values and preview the output.');
  }
  const missing=project?.missing||[];
  const spec=project?.method==='guided-template' ? specs[project.slug] : null;
  const docProblems=spec ? validateStudioSpecification(spec,project.slug) : [];
  const bom=useMemo(()=>estimateStudioBom(spec,parts),[spec,parts]);
  const rawConnections=spec?.connections||(project?.netlist?.length?project.netlist:project?.wires?.map(([pin,to])=>({pin,to,net:'Unreviewed',kind:'unverified'}))||[]);
  const connectionPlan=useMemo(()=>prepareConnectionPlan(rawConnections,code,board),[rawConnections,code,board]);
  const connections=connectionPlan.connections;
  const electricalReview=useMemo(()=>{
    const review=reviewElectricalDesign({board:project?.board||board,connections:[...connections,...connectionPlan.rejected],components:[]});
    if(connectionPlan.rejected.length){review.status='failed';review.findings.push(...connectionPlan.issues.map(issue=>({severity:'error',code:issue.code,message:issue.message})));}
    if(!codeDirty)return review;
    return {...review,status:review.status==='failed'?'failed':'incomplete',findings:[...review.findings,{severity:'unknown',code:'SKETCH_EDITED',message:'The sketch changed after this wiring reference was prepared. Recheck every connection and GPIO assignment.'}]};
  },[board,project?.board,project?.netlist,spec,codeDirty,connections,connectionPlan.rejected.length]);
  const {value:diagramImage,busy:diagramBusy}=useAutomaticDiagram({board,title:project?.title||'',connections,enabled:services?.diagramEnabled&&!codeDirty&&!connectionPlan.rejected.length&&connections.length>0&&electricalReview.status!=='failed',authenticated:services?.authenticated});
  const diagramReady=Boolean(spec&&docProblems.length===0);
  const coachReport=useMemo(()=>assessStudioProject({board,parts:selected,moduleIds:extraModules,prompt,project,code,compile,electricalReview,codeDirty,docProblems}),[board,selected,extraModules,prompt,project,code,compile,electricalReview,codeDirty,docProblems]);
  const sheetWarning=project?.method==='ai-draft'?'AI-generated draft: no reviewed schematic is available.':!spec?'This starter has no reviewed external wiring diagram.':codeDirty?'Sketch edited: reviewed drawings reflect the ORIGINAL template, not your latest code.':'Reviewed template diagrams are illustrative reference material, not breadboard pin-placement guarantees.';
  const suggestions=useMemo(()=>suggestStudioSetup(prompt),[prompt]);
  const ideaKey=prompt.trim();
  const materialsKey=JSON.stringify([ideaKey,selected.filter(id=>!BOARD_OPTIONS.some(b=>b.catalogId===id)).sort(),extraModules,ownMaterials]);
  const setupKey=JSON.stringify([materialsKey,board]);
  const wiringKey=JSON.stringify([setupKey,project?.title,connections]);
  useEffect(()=>{setProjectSetupKey(project?setupKey:'');},[project]);
  const buildKey=JSON.stringify([setupKey,code,manualLibraries,customLibrary?.base64||'']);
  const acceptanceKey=acceptanceScope({board,code,prompt,selected,moduleIds:extraModules,boardModel:acceptance.boardModel,supplyNotes:acceptance.supplyNotes});
  const acceptanceReport=acceptanceSummary(acceptance,acceptanceKey);
  const nonBoardParts=selected.filter(id=>!BOARD_OPTIONS.some(b=>b.catalogId===id));
  const passed=[ideaKey.length>=12&&approvals.idea===ideaKey,
    Boolean((nonBoardParts.length||extraModules.length||ownMaterials.trim().length>=10)&&approvals.materials===materialsKey),
    Boolean(approvals.board===setupKey&&projectSetupKey===setupKey&&project&&(!project.board||project.board===board)),
    Boolean(project&&!missing.length&&!connectionPlan.rejected.length&&electricalReview.status!=='failed'&&approvals.wiring===wiringKey),
    Boolean(code.trim()&&/\bvoid\s+setup\s*\(/.test(code)&&/\bvoid\s+loop\s*\(/.test(code)&&approvals.code===buildKey),
    Boolean((compile?.ok&&compiledKey===buildKey)||ideVerified===buildKey),false];
  const firstUnmet=passed.findIndex(value=>!value);
  const visibleStep=Math.min(step,firstUnmet);
  useEffect(()=>{if(visibleStep===3)setTab('schematic');if(visibleStep===4)setTab('code');},[visibleStep]);
  const requirements=[
   'Describe the input, expected output and success condition (at least 12 characters), then confirm the idea.',
   'Select your actual components or list your own exact models, then confirm the materials.',
   'Confirm the board and generate a project for the selected setup.',
   'Resolve electrical errors, missing materials and invalid connections. Check every pin, supply and unresolved finding against your actual hardware, then confirm.',
   'Review setup(), loop(), libraries and pin assignments, then confirm this version of the code.',
   'Compile this exact version successfully here, or verify it in Arduino IDE and confirm the result.',
   'Select the correct physical board and port. Upload only after the hardware checks; observe real behavior afterward.'
  ];
  function goStep(next){if(next<0||next>firstUnmet||working)return;setStep(next);if(next===3)setTab('schematic');if(next===4)setTab('code');}
  function confirmStep(key,value,checked){setApprovals(old=>({...old,[key]:checked?value:''}));}
  return <section className="studio-workspace" id="workspace">
    <header className="studio-workbench-header"><div><h2>Your workspace</h2><p>Desktop or laptop recommended for editing and USB flashing. Planning and diagrams work on mobile and tablet.</p></div><a href="#studio-workbench">Go to workbench ↓</a></header>
    <nav className="studio-wizard-tabs nav nav-pills" role="tablist" aria-label="Project build steps">{STUDIO_STEPS.map((label,i)=><button type="button" role="tab" className="nav-link" key={label} id={'studio-step-'+i} aria-selected={visibleStep===i} aria-controls="studio-step-content" disabled={i>firstUnmet||working} onClick={()=>goStep(i)}>{passed[i]?'✓':i+1} · {label}{i>firstUnmet?' · Locked':''}</button>)}</nav>
    <div className="studio-wizard-status" role="status"><strong>Step {visibleStep+1}: {STUDIO_STEPS[visibleStep]}</strong><p>{requirements[visibleStep]}</p><small>Changing earlier inputs requires their checks again. Completion records your review; it does not certify physical hardware.</small></div>
    <details className="studio-workspace-tools"><summary>Examples, saved drafts &amp; account settings</summary><div className="studio-quick-access">
      <details className="studio-disclosure" id="studio-examples"><summary>Examples &amp; modules <span>Start with a ready-made project</span></summary><div className="studio-disclosure-body">
    <section className="studio-starters" aria-label="Project starters">
      <div><span className="edu-kicker">START WITH A COMPLETE EXAMPLE</span><h3>Choose a project. We’ll load its parts and sketch.</h3></div>
      <div className="studio-starter-grid">{STUDIO_BUILDS.map(build=><button type="button" key={build.slug} disabled={working} onClick={()=>chooseTemplate(build)}><strong>{build.title}</strong><span>{build.parts.length} catalog items · Uno · Code + diagrams</span></button>)}</div>
    </section>
    <section className="studio-starters" aria-label="GSM, GPS and Bluetooth module starters">
      <div><span className="edu-kicker">SERIAL MODULE STARTERS</span><h3>GPS, GSM and Bluetooth modules for your selected board</h3><p>Starter sketches for the listed modules; power wiring, UART signal levels, cellular service and a GPS fix require separate verification.</p></div>
      <div className="studio-starter-grid">{MODULE_STARTERS.map(starter=><button type="button" key={starter.id} disabled={working} onClick={()=>startModuleProject(starter.id)}><strong>{starter.name}</strong><span>{starter.summary}</span></button>)}</div>
    </section>
    <details className="studio-knowledge-shell"><summary>Explore common modules and adaptive knowledge ({extraModules.length} reference modules selected)</summary>
      <StudioKnowledgeCenter selectedModules={extraModules} onStartExample={startModuleExample} onToggleModule={id=>{
        setExtraModules(current=>current.includes(id)?current.filter(x=>x!==id):current.length<8?[...current,id]:current);
        setCompile(null);setCodeDirty(true);setMode('ai');
        setNotice('Module selection updated. Regenerate the AI draft and verify the exact breakout specifications before compiling.');
      }}/>
    </details>
      </div></details>
      <details className="studio-disclosure"><summary>Files &amp; saved drafts <span>Import or recover a project</span></summary><div className="studio-disclosure-body">
    <div className="studio-draft-toolbar" aria-label="Project file tools">
      <button type="button" disabled={working} onClick={()=>importRef.current?.click()}>Import project JSON</button>
      <input ref={importRef} type="file" accept=".json,application/json" onChange={importDraft} hidden aria-label="Import CircuitByte project file"/>
      <button type="button" disabled={working} onClick={openDraft}>Load saved browser draft</button>
      {recovery&&<button type="button" disabled={working} onClick={()=>restoreDraft(recovery)}>Recover last project: {recovery.project.title}</button>}
      <span role="status">{draftStatus||'Draft recovery stores this project on your current browser.'}</span>
    </div>
      </div></details>
      <details className="studio-disclosure"><summary>Account &amp; AI settings <span>{services?.authenticated?'Signed in':'Sign in and service availability'}</span></summary><div className="studio-disclosure-body">
    {services?.uat&&<aside className="studio-uat-banner" aria-label="Student Hobby UAT"><strong>{services.uat.active?'Student / Hobby UAT — Free through November 30, 2026':'Student / Hobby UAT closed'}</strong><p>{services.uat.message}</p><a href="/studio/pricing">View UAT access →</a></aside>}
    <section className="studio-service-strip" aria-label="Studio service availability">
      <div><strong>{services?.authenticated?'Verified account':'Visitor workspace'}</strong><span>Guided projects, starters and browser drafts are free to use.</span><a href="/dashboard">{services?.authenticated?'My dashboard →':'Sign in / create account →'}</a></div>
      <div><strong>AI generation</strong><span>{!services?'Checking availability…':!services.aiEnabled?'Currently unavailable':services.usage?services.usage.ai.remaining+' of '+services.usage.ai.limit+' AI credits remaining (drafts + diagrams)':'Available with verified sign-in'}</span></div>
      <div><strong>Cloud compilation</strong><small>Only successful builds consume credits. Code, library, toolchain and service failures do not.</small><span>{!services?'Checking availability…':!services.compilerEnabled?'Currently unavailable':services.usage?services.usage.compile.remaining+' of '+services.usage.compile.limit+' successful builds remaining':'Available with verified sign-in'}</span></div>
      <button type="button" disabled={working} onClick={refreshServices}>Refresh status</button>
      {serviceError&&<p role="status">Service status could not be loaded. Browser projects remain available.</p>}
      {services?.usage&&<small>Usage period: {services.usage.period} ({services.usage.timeZone||'Asia/Manila'})</small>}
    </section>
      <StudioCopilot services={services} provider={aiProvider} onProvider={setAiProvider} refresh={refreshServices} disabled={working}/>
      </div></details>
    </div>
    </details>
    {error&&<p role="alert" className="studio-error">{error}</p>}{notice&&<p role="status" className="studio-notice">{notice}</p>}{loading&&aiProgress&&<p role="status" aria-live="polite" className="studio-notice">AI project progress: {aiProgress}</p>}
    {serviceError&&<p role="status" className="studio-error">Service status unavailable. Open Account &amp; AI settings to refresh.</p>}
    <div id="studio-step-content" role="tabpanel" aria-labelledby={'studio-step-'+visibleStep} className="studio-grid studio-wizard-grid">
      <div className="studio-controls" hidden={visibleStep>2}>
        <section className="studio-panel" hidden={visibleStep!==2}>
          <div className="studio-panel-heading"><span className="studio-step">03</span><h3>Choose your board</h3></div><label className="studio-label" htmlFor="studio-board-choice">Development board</label>
          <select id="studio-board-choice" className="form-select" disabled={working} value={board} onChange={e=>{const next=e.target.value;checkpoint();setBoard(next);setCompile(null);setProject(null);setCode('');setError('');setNotice('');setManualLibraries([]);setCustomLibrary(null);const item=BOARD_OPTIONS.find(x=>x.id===next);setSelected(current=>[...(item?.catalogId?[item.catalogId]:[]),...current.filter(id=>!BOARD_OPTIONS.some(b=>b.catalogId===id))].slice(0,16));setMode(next==='arduino:avr:uno'?'guide':'ai');}}>
            {BOARD_OPTIONS.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
          <button type="button" className="studio-secondary btn btn-outline-secondary" disabled={working} onClick={startBoardProject}>Load {studioBoardName(board)} serial starter</button>
<details className="studio-capability-matrix"><summary>Board support: code, diagrams and flashing</summary>          <p className="studio-help">ESP8266, ESP32 and M5Stack AI drafts use 3.3V GPIO. M5Stack Core is a reference target, not a stocked CircuitByte product. Guided examples use the Arduino Uno. Cloud compilation offers all {BOARD_OPTIONS.length} listed board targets when enabled; actual toolchain support must be verified per target. Browser flashing: Uno, classic Nano (both bootloaders), ESP8266, ESP32/S3/C3 and M5Stack Core. Mega and Leonardo currently use Arduino IDE for flashing. Hardware UAT is pending; compilation, visualization and USB flashing are separate capabilities.</p><div className="studio-table"><table><thead><tr><th>Board</th><th>Code / compile target</th><th>Diagrams</th><th>Upload method</th></tr></thead><tbody>{BOARD_OPTIONS.map(item=><tr key={item.id}><td>{item.name}</td><td>Available</td><td>Wiring + AI illustration</td><td>{UPLOAD_PROFILES[item.id]?'Browser USB · hardware UAT pending':'Arduino IDE · browser protocol pending'}</td></tr>)}</tbody></table></div><p>Live animation supports simple GPIO sequences, not arbitrary firmware or full sensor simulation. Serial monitoring requires a compatible browser and permitted port.</p></details><p className="studio-note">Suggested: {studioBoardName(suggestions.board)}. {suggestions.reason}</p><label><input type="checkbox" checked={approvals.board===setupKey} onChange={e=>{confirmStep('board',setupKey,e.target.checked);const id=BOARD_OPTIONS.find(b=>b.id===board)?.catalogId;if(e.target.checked&&id&&!selected.includes(id))setSelected(current=>[id,...current.filter(p=>!BOARD_OPTIONS.some(b=>b.catalogId===p))].slice(0,16));}}/> I confirmed the exact board model and compatibility with my materials.</label>          <fieldset className="studio-modes" disabled={working}><legend>Generation mode</legend>
            <label><input type="radio" name="studio-mode" disabled={board!=='arduino:avr:uno'||Boolean(ownMaterials.trim())} checked={mode==='guide'} onChange={()=>setMode('guide')}/> Guided example <small>Free · reliable templates</small></label>
            <label><input type="radio" name="studio-mode" checked={mode==='ai'} onChange={()=>setMode('ai')}/> AI draft <small>Verified Student account · 30 drafts/month</small></label>
          </fieldset>
          <button type="button" className="studio-primary btn btn-primary" disabled={working||!passed[0]||!passed[1]||approvals.board!==setupKey||(mode==='ai'&&Boolean(aiReason))} onClick={generate}>{loading?'Preparing project…':mode==='ai'?'Generate AI draft →':'Find a matching project →'}</button>
          {mode==='ai'&&aiReason&&<p className="studio-help">{aiReason} <a href="/dashboard">Open dashboard →</a></p>}

        </section>
        <section className="studio-panel" hidden={visibleStep!==1}>
          <div className="studio-panel-heading"><span className="studio-step">02</span><h3>Your materials</h3><small>{selected.length} selected</small></div>
          <p>If suggestions do not match what you own, remove them and select your actual materials. For unlisted parts, enter the exact model, quantity, voltage and interface below.</p>
          <div className="studio-material-suggestions"><strong>Ideas based on your description</strong>{suggestions.parts.filter(id=>index[id]).map(id=><button type="button" key={id} disabled={working||selected.includes(id)||selected.length>=16} onClick={()=>toggle(id)}>+ {index[id].name}</button>)}</div>
          <label className="studio-label" htmlFor="studio-own-materials">Other materials you will actually use</label><textarea id="studio-own-materials" className="form-control" maxLength={600} rows={3} value={ownMaterials} onChange={e=>{setOwnMaterials(e.target.value);setMode('ai');}} placeholder="Example: 1 × sensor model, supply voltage, interface, library if known"/><small>Unlisted parts are supplied to AI drafting as unverified user specifications; guided examples cannot adapt to them.</small>
          <label><input type="checkbox" disabled={!nonBoardParts.length&&!extraModules.length&&ownMaterials.trim().length<10} checked={approvals.materials===materialsKey} onChange={e=>confirmStep('materials',materialsKey,e.target.checked)}/> This list matches the materials I will use.</label>
          <div className="studio-selected">{selected.map(id=><button type="button" key={id} disabled={working} onClick={()=>toggle(id)} title="Remove component">{index[id]?.name||id} ×</button>)}</div>
          <details className="studio-catalog-picker"><summary>Add or browse parts <span>{selected.length}/16 selected</span></summary>
          <label className="studio-label" htmlFor="studio-parts-search">Find a product in the CircuitByte catalog</label>
          <input id="studio-parts-search" className="form-control" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search UNO, sensor, LED, LCD..." autoComplete="off"/>
          <p className="studio-help" aria-live="polite">Showing {filtered.length} matching parts · {selected.length}/16 selected</p>
          <div className="studio-part-list" role="group" aria-label="Catalog components">
            {filtered.map(item=><label key={item.id} className="studio-part">
              <input type="checkbox" checked={selected.includes(item.id)} disabled={working||(!selected.includes(item.id)&&selected.length>=16)} onChange={()=>toggle(item.id)}/>
              <span><strong>{item.name}</strong><small>{item.id} · {item.category}</small></span>
            </label>)}
            {!filtered.length&&<p>No matching catalog items found.</p>}
          </div>
          <p className="studio-help">Catalog items are suggestions, not proof that a particular module variant or quantity is in stock.</p>
          </details>
          {selectedModuleGuides.length>0&&<div className="studio-catalog-guides" aria-label="How to use selected catalog modules">
            <h4>Learn about your selected modules</h4>
            {selectedModuleGuides.map(module=><details key={module.id}>
              <summary>{module.name} — What's this? / How to use</summary>
              <p><strong>What is this?</strong> {module.whatIs}</p>
              <ol>{module.howTo.map((step,i)=><li key={i}>{step}</li>)}</ol>
              <p><strong>Libraries:</strong> {module.suggestedLibraries}</p>
              <p><strong>First test:</strong> {module.firstExperiment}</p>
              <button type="button" className="studio-example-guide-button" onClick={()=>startModuleExample(module)}>Try this beginner example</button>
              <p className="studio-knowledge-caution">{module.caution}</p>
              <a href={module.sourceUrl} target="_blank" rel="noopener noreferrer">Read technical reference</a>
            </details>)}
          </div>}
        </section>
        <section className="studio-panel" hidden={visibleStep!==0}>
          <div className="studio-panel-heading"><span className="studio-step">01</span><h3>Describe your idea</h3></div>
          <label className="studio-label" htmlFor="studio-idea">Project description</label>
          <textarea id="studio-idea" className="form-control" value={prompt} maxLength={800} rows={5} onChange={e=>setPrompt(e.target.value)} placeholder="Using my UNO and sensor, detect... then activate..." />
          <label><input type="checkbox" disabled={ideaKey.length<12} checked={approvals.idea===ideaKey} onChange={e=>confirmStep('idea',ideaKey,e.target.checked)}/> My idea states the input, expected output and success condition.</label>
          <div className="studio-examples"><button type="button" disabled={working} onClick={startBlinkDemo}>Try live Blink LED preview</button>
            {[
              ['Distance alarm','Make an ultrasonic distance alarm that beeps near obstacles.'],
              ['LED scanner','Make three LEDs light up in a running sequence.'],
              ['LCD monitor','Show room temperature and humidity with a DHT22 on an LCD.'],
              ['Light logger','Log light sensor readings onto a microSD card as CSV.']
            ].map(([label,idea])=><button type="button" key={label} disabled={working} onClick={()=>setPrompt(idea)}>{label}</button>)}
          </div>
          {error&&<p role="alert" className="studio-error">{error}</p>}
          {notice&&<p role="status" className="studio-notice">{notice}</p>}
        </section>
      </div>
      <div className="studio-results" hidden={visibleStep<3} id="studio-workbench" tabIndex={-1}>

        {!project ? <div className="studio-empty"><span>⌘</span><h3>Build something useful.</h3><p>Complete the three setup steps, or open Examples &amp; modules to load a starter. Your sketch, preview and wiring will appear here.</p><button type="button" disabled={loading||busy} onClick={openDraft}>Load a saved draft</button></div> :
        <section className="studio-panel studio-output">
          <div className="studio-output-heading"><div><span className="edu-kicker">{project.method==='ai-draft'?'AI-GENERATED DRAFT':project.method==='board-starter'?'SERIAL STARTER':'CURATED STARTER PROJECT'}</span><h3>{project.title}</h3><p>{project.summary}</p></div><span className="studio-board">{BOARD_OPTIONS.find(x=>x.id===(project.board||board))?.name||"UNO R3"}</span></div>
          {project.note&&<p className="studio-note">{project.note}</p>}
          <details className="studio-warning studio-review" open={electricalReview.status==='failed'?true:undefined}><summary><strong>Electrical review: {electricalReview.status==='failed'?'Failed':electricalReview.status==='incomplete'?'Incomplete':'Static checks passed'}</strong><span>{codeDirty?' · Sketch changed — recheck wiring':' · View findings before wiring'}</span></summary><p>{electricalReview.notice} {codeDirty?'The sketch was edited after its reference diagram was prepared.':''}</p><ul>{electricalReview.findings.map((finding,i)=><li key={i}><strong>{finding.severity==='unknown'?'NEEDS VERIFICATION':finding.severity.toUpperCase()}:</strong> {finding.message}</li>)}</ul>{docProblems.length>0&&<p>Template specification issues: {docProblems.join('; ')}</p>}</details>
          {missing.length>0&&<div className="studio-warning"><strong>Missing from your selection</strong><p>This example requires additional catalog components:</p><ul>{missing.map(id=><li key={id}>{index[id]?.name||id} ({id})</li>)}</ul></div>}
          <div className="studio-tabs" role="tablist" aria-label="Studio results">{(visibleStep===3?['schematic','wiring','bom','safety']:visibleStep===4?['code','preview','safety']:[]).map(item=><button type="button" key={item} role="tab" id={'studio-tab-'+item} aria-controls="studio-result-panel" tabIndex={tab===item?0:-1} aria-selected={tab===item} onKeyDown={e=>{const tabs=visibleStep===3?['schematic','wiring','bom','safety']:['code','preview','safety'];const i=tabs.indexOf(item);const next=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;if(next!==null){e.preventDefault();setTab(tabs[next]);e.currentTarget.parentElement.querySelectorAll('[role=tab]')[next].focus();}}} onClick={()=>setTab(item)} className={tab===item?'active':''}>{item==='code'?'Sketch':item==='preview'?'Live preview':item==='wiring'?'Connections':item==='schematic'?'Diagrams':item==='bom'?'Parts / BOM':'Safety notes'}</button>)}</div>
          <div hidden={visibleStep>4} id="studio-result-panel" role="tabpanel" aria-labelledby={'studio-tab-'+tab} tabIndex={0}>
          {tab==='preview'&&<StudioCircuitPreview code={code} board={board} connections={connections} stale={codeDirty}/>}
          {tab==='code'&&<div><label className="studio-label" htmlFor="studio-code">Arduino sketch (.ino) — editable</label><textarea id="studio-code" className="studio-code" readOnly={working} spellCheck="false" value={code} onChange={e=>{setCode(e.target.value);setCodeDirty(true);setCompile(null);}} rows={24}/></div>}
          {tab==='wiring'&&<div><p>Low-voltage connection reference. Verify the actual module pin labels, operating voltage and logic compatibility before assembly.</p><div className="studio-table"><table><thead><tr><th>Board pin / source</th><th>Connect to</th><th>Signal / net</th></tr></thead><tbody>{connections.map(({pin,to,net},i)=><tr key={i}><td>{pin}</td><td>{to}</td><td>{net}</td></tr>)}</tbody></table></div>{codeDirty&&<p className="studio-warning">This wiring reference may be outdated because the sketch was edited. Verify each GPIO, signal and connection again.</p>}{!diagramReady&&<p className="studio-warning">No reviewed circuit netlist is associated with this sketch. Any listed connections need independent review.</p>}</div>}
          {tab==='schematic'&&<div className="studio-diagrams">{electricalReview.status==='failed'&&<div className="studio-error" role="alert"><strong>Wiring needs correction before approval</strong><ul>{electricalReview.findings.filter(f=>f.severity==='error').map(f=><li key={f.code+f.message}>{f.message}</li>)}</ul></div>}<StudioHardwareWiring board={board} connections={connections} stale={codeDirty}/><details><summary>Optional AI illustration</summary><StudioAiDiagram blocked={electricalReview.status==='failed'} board={board} title={project.title} connections={connections} stale={codeDirty} enabled={services?.diagramEnabled} authenticated={services?.authenticated} value={diagramImage} busy={diagramBusy}/></details><details><summary>Terminal reference &amp; pin table</summary><StudioConnectionDiagram board={board} connections={connections} stale={codeDirty}/></details>{diagramReady?<><p className="studio-note">{sheetWarning}</p><figure><img src={spec.assets.schematic} alt={'Functional circuit schematic for '+project.title} loading="lazy"/><figcaption>Functional/module schematic — named electrical nets, not physical placement.</figcaption><a href={spec.assets.schematic} download={project.slug+'-schematic.svg'}>Download schematic SVG</a></figure><figure><img src={spec.assets.wiring} alt={'Labelled pin-to-pin wiring map for '+project.title} loading="lazy"/><figcaption>Connection / wiring reference — verify breakout board pins in person.</figcaption><a href={spec.assets.wiring} download={project.slug+'-wiring.svg'}>Download wiring SVG</a></figure></>:<p className="studio-warning">No reviewed schematic or breadboard layout is associated with this sketch. The project must be checked for voltage, IO direction, shared grounds, level shifting and component ratings before any diagram is approved.</p>}</div>}
          {tab==='bom'&&<div><StudioPartsShop spec={spec} selected={selected} board={board}/><p>Estimated materials for the <strong>published guided template</strong>. Prices are indicative only and are NOT a checkout quotation.</p>{spec?<><div className="studio-table"><table><thead><tr><th>Part</th><th>Qty</th><th>Unit (snapshot)</th><th>Est. subtotal</th></tr></thead><tbody>{bom.lines.map((line,i)=><tr key={i}><td><strong>{line.name}</strong><small className="studio-bom-detail">{line.id} · {line.detail}{line.optional?' · optional':''}</small></td><td>{line.qty}</td><td>{peso(line.unitPrice)}</td><td>{peso(line.subtotal)}</td></tr>)}</tbody></table></div><p className="studio-bom-total"><strong>Listed required parts: {peso(bom.requiredTotal)}</strong><small>Optional variants: {peso(bom.optionalTotal)} extra</small></p>{bom.excluded.length>0&&<div className="studio-warning"><strong>Additional items excluded from the total</strong><ul>{bom.excluded.map((e,i)=><li key={i}><b>{e.qty} × {e.name}:</b> {e.reason}</li>)}</ul></div>}<p className="studio-help">{bom.pricingNotice}</p></>:<div className="studio-warning">This sketch has no reviewed materials list or cost estimate.</div>}</div>}
          {tab==='safety'&&<div className="studio-warning"><ul>{[...(project.warnings||[]),...(spec?.cautions||[])].map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
          </div>
          {visibleStep===3&&<label className="studio-gate-check"><input type="checkbox" disabled={electricalReview.status==='failed'||missing.length>0||connectionPlan.rejected.length>0} checked={approvals.wiring===wiringKey} onChange={e=>confirmStep('wiring',wiringKey,e.target.checked)}/> I checked the actual pin labels, supply/logic voltages, ground and all unresolved findings against my hardware documentation.</label>}
          {visibleStep===4&&<label className="studio-gate-check"><input type="checkbox" checked={approvals.code===buildKey} onChange={e=>confirmStep('code',buildKey,e.target.checked)}/> I reviewed this code, its libraries and pin assignments; edited pins still match my wiring.</label>}
          <details hidden={visibleStep<4} className="studio-export-tools"><summary>Save, download &amp; export</summary><div className="studio-buttons">
            <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setNotice('Sketch copied. Paste it into Arduino IDE.');}catch{setError('Clipboard access is unavailable. Select the sketch text or download the .ino file.');}}}>Copy sketch</button>
            <button type="button" onClick={exportDraft}>Export project JSON</button>
            <button type="button" onClick={()=>downloadText((project.slug||'CircuitByteProject')+'.ino',code,'text/plain')}>Download .ino</button>
            <button type="button" onClick={()=>window.print()}>Print / Save PDF sheet</button>
            <button type="button" disabled={working||!services?.authenticated||!services?.uat?.active} onClick={saveCloudProject}>{savingCloud?'Saving…':cloudProjectId?'Update saved project':'Save to dashboard'}</button>
            <button type="button" onClick={saveDraft}>Save browser draft</button>
            <button type="button" disabled={working} onClick={openDraft}>Load draft</button>
            {project.guideUrl&&<a href={project.guideUrl}>Full DIY guide ↗</a>}
          </div></details>
          <div hidden={visibleStep!==5} className="studio-compile">
            <div><h4>Compile your sketch</h4><p>Check the sketch for your selected board. Compilation does not verify physical wiring.</p></div>
            <button type="button" disabled={working||!passed.slice(0,5).every(Boolean)||Boolean(compileReason)} onClick={runCompile}>{busy?'Compiling…':'Compile for '+studioBoardName(board)}</button>
          </div>
          {visibleStep===5&&compileReason&&<p className="studio-help">{compileReason}</p>}
          {visibleStep===5&&compile&&<div role="status" className={compile.ok?'studio-compile-result success':'studio-compile-result'}><strong>{compile.ok?'Compilation passed':'Compilation failed'}</strong><p>Build target: {compile.fqbn||compile.board}</p><pre>{compile.output}</pre>{compile.ok&&compile.firmwareHex&&<button type="button" onClick={()=>downloadText('CircuitByteSketch.ino.hex',compile.firmwareHex,'text/plain')}>Download compiled .hex</button>}{compile.ok&&compile.firmwareImages?.map((file,i)=><button type="button" key={i} onClick={async()=>{try{downloadText(file.name,await decodeEspImage(file),'application/octet-stream');}catch(e){setError(e.message);}}}>Download flash package · {file.name}</button>)}{compile.ok&&compile.firmwareBin&&<><button type="button" onClick={()=>{const bytes=Uint8Array.from(atob(compile.firmwareBin),char=>char.charCodeAt(0));downloadText('CircuitByteSketch.application.bin',bytes,'application/octet-stream');}}>Download application .bin</button><p>ESP application image only. Use the matching board's bootloader, partition layout and vendor upload tools; this is not a complete merged flash image.</p></>}{compile.ok&&!compile.artifactAvailable&&<p>Build completed, but no firmware artifact is available for download.</p>}</div>}
          {visibleStep===5&&<section className="studio-ide-verify"><h4>Or compile in Arduino IDE</h4><button type="button" onClick={()=>downloadText((project.slug||'CircuitByteProject')+'.ino',code)}>Download this sketch</button><p>Install the board package and required libraries, select {studioBoardName(board)}, then click Verify. Fix every error before confirming.</p><label><input type="checkbox" checked={ideVerified===buildKey} onChange={e=>setIdeVerified(e.target.checked?buildKey:'')}/> Arduino IDE successfully verified this exact sketch for my selected board (self-reported).</label></section>}
          <p className="studio-help">Use the USB hardware tools below for your selected board’s upload method or serial monitoring. Cloud compilation requires verified sign-in and a remaining monthly allowance. Printable sheets use the browser's Save as PDF option.</p>
        </section>}
        {project&&<details className="studio-disclosure studio-coach-disclosure" open={compile&&!compile.ok?true:undefined}><summary>Project coach &amp; checks <span>{coachReport.phase}</span></summary><StudioProjectCoach report={coachReport} onRepair={repairSketch} repairing={loading} repairDisabled={aiReason}/></details>}
        {project&&<details className="studio-disclosure studio-acceptance-disclosure" open={visibleStep===6?true:undefined}><summary>Hardware acceptance &amp; measured evidence <span>{acceptanceReport.label}</span></summary><StudioAcceptancePanel value={acceptance} scope={acceptanceKey} onChange={setAcceptance}/></details>}
      </div>
    </div>
    {visibleStep===6&&passed.slice(0,6).every(Boolean)&&services?.usbUploadEnabled&&<details className="studio-disclosure studio-hardware-tools" open={usbBusy?true:undefined}><summary>USB upload &amp; serial monitor <span>Connect your physical board</span></summary><StudioUsbTools board={board} compiledHex={compile?.ok&&compile.board===board?compile.firmwareHex:null} firmwareImages={compile?.ok&&compile.board===board?compile.firmwareImages:null} uploadEnabled={services.usbUploadEnabled} disabled={busy||loading||savingCloud} onBusyChange={setUsbBusy}/></details>}
    <details hidden={visibleStep!==4&&visibleStep!==5} className="studio-advanced"><summary>Libraries &amp; build settings · search Arduino Library Manager</summary>
      <StudioLibraryTools board={board} readOnly={working} parts={selected} catalog={parts} manualLibraries={manualLibraries} setManualLibraries={setManualLibraries} code={code} setCode={value=>{setCode(value);setCodeDirty(true);setCompile(null);}} customLibrary={customLibrary} setCustomLibrary={setCustomLibrary}/>
    </details>
    {visibleStep===6&&<p className="studio-note">Arduino IDE upload: connect a USB data cable, select the correct board and port, and click Upload. Check the serial monitor and actual input/output behavior. Browser flashing is available below only for supported targets.</p>}
    <div className="studio-wizard-navigation"><button type="button" disabled={visibleStep===0||working} onClick={()=>goStep(visibleStep-1)}>← Back</button>{visibleStep<6&&<button type="button" disabled={!passed[visibleStep]||working} onClick={()=>goStep(visibleStep+1)}>Continue to {STUDIO_STEPS[visibleStep+1]} →</button>}</div>
    <details className="studio-disclosure studio-release-notes"><summary>What’s new <span>Studio updates and release history</span></summary><StudioUpdates revision={releaseRevision}/></details>
    {project&&<section id="studio-print-sheet" className="studio-print-sheet" aria-label="Printable Arduino project sheet">
      <header><strong>CIRCUITBYTE / ARDUINO PROJECT SHEET</strong><p>Educational low-voltage prototype · {studioBoardName(project.board||board)} · {new Date().toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}</p><h1>{project.title}</h1><p>{project.summary}</p></header>
      <h2>1. Requirements</h2><p>{project.prompt||prompt}</p>
      <h2>Physical acceptance evidence — user reported</h2>
      <p>Board/module revisions: {acceptance.boardModel||'Not recorded'} · Power notes: {acceptance.supplyNotes||'Not recorded'}</p>
      <p>{acceptanceReport.stale?'Evidence is stale for this design and is not counted.':acceptanceReport.label} · Neither Studio AI nor compilation independently certifies the hardware.</p>
      <table><thead><tr><th>Criterion</th><th>Expected</th><th>Observed</th><th>Outcome</th></tr></thead><tbody>{acceptance.criteria.map(item=><tr key={item.id}><td>{item.title}</td><td>{item.expected}</td><td>{item.observed||'Not measured'}</td><td>{acceptanceReport.stale?'Stale':item.status}</td></tr>)}</tbody></table>
      {spec?<><h2>2. Bill of materials</h2><table><thead><tr><th>Part</th><th>Qty</th><th>Unit estimate</th><th>Subtotal</th></tr></thead><tbody>{bom.lines.map((line,i)=><tr key={i}><td>{line.name} ({line.id}){line.optional?' — optional':''} — {line.detail}</td><td>{line.qty}</td><td>{peso(line.unitPrice)}</td><td>{peso(line.subtotal)}</td></tr>)}</tbody></table><p><strong>Required listed parts: {peso(bom.requiredTotal)}</strong> · Optional estimate: {peso(bom.optionalTotal)}</p>{bom.excluded.length>0&&<p><strong>Unlisted/excluded:</strong> {bom.excluded.map(item=>item.qty+' × '+item.name).join('; ')}. These are not in the estimate.</p>}<p>{bom.pricingNotice}</p></>:<p><strong>This sketch has no reviewed project BOM or price quotation.</strong></p>}
      <h2>3. Pin connections</h2><table><thead><tr><th>Board pin</th><th>Destination</th><th>Net / signal</th></tr></thead><tbody>{connections.map((row,i)=><tr key={i}><td>{row.pin}</td><td>{row.to}</td><td>{row.net}</td></tr>)}</tbody></table>
      {diagramReady&&<><h2>4. Published connection illustrations</h2><p>{sheetWarning}</p><figure><img src={spec.assets.schematic} alt="Functional circuit schematic"/><figcaption>Published functional schematic</figcaption></figure><figure><img src={spec.assets.wiring} alt="Labelled wiring map"/><figcaption>Published pin/wiring reference</figcaption></figure></>}
      <h2>{diagramReady?'5':'4'}. Safety review</h2><ul>{[sheetWarning,...(project.warnings||[]),...(spec?.cautions||[])].map((note,i)=><li key={i}>{note}</li>)}</ul>
      <h2>{diagramReady?'6':'5'}. Editable Arduino sketch</h2><pre>{code}</pre>
      <footer>CircuitByte AI Project Studio · Training/reference use only · Compiler success does not validate electrical safety.</footer>
    </section>}
  </section>;
}
