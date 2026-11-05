'use client';
import {useEffect,useMemo,useState} from 'react';
import {LAB_ACTIVITIES,LAB_STORAGE_KEY,evaluateLabCapture,getLabActivity,labCompletion,labWiringMatches,sanitizeLabRecords} from '../../../../lib/studio-laboratory.mjs';

function downloadText(name,text){
 const blob=new Blob([text],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob);
 try{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}finally{setTimeout(()=>URL.revokeObjectURL(url),500);}
}
function reportMarkdown(lab,data,completion){
 const rows=lab.checkpoints.map(cp=>{
  const r=data.captures?.[cp.id],valid=r?.passed&&completion.fingerprint===r.fingerprint;
  return `| ${cp.label.replaceAll('|','/')} | ${cp.expected.toFixed(3)} ${cp.unit} ± ${cp.tolerance.toFixed(2)} | ${valid?r.measured.toFixed(3)+' '+cp.unit:'Not captured / stale'} | ${valid?'Modeled pass':'Not verified'} |`;
 });
 return [`# CircuitByte — Virtual Laboratory Report`,``,`**Experiment:** ${lab.title}`,`**Status:** ${completion.passed?'All modeled checkpoints recorded':'Incomplete / stale observations'}`,`**Evidence type:** Browser-generated, idealized DC simulation. Not physical hardware verification.`,``,`## Objective`,lab.objective,``,`## Procedure`,...lab.steps.map((s,i)=>`${i+1}. ${s}`),``,`## Captured modeled measurements`,`| Checkpoint | Expected modeled reading | Captured reading | Result |`,`| --- | --- | --- | --- |`,...rows,``,`## Student observations`,(data.note||'Not recorded').replaceAll(/\r?\n/g,' '),``,`## Limitations`,`This report documents modeled circuit checks only. Real components, measurement tolerances, board current limits, wiring quality and physical outputs require independent hardware testing.`,``,`---`,`Generated locally by CircuitByte Virtual Laboratory. No AI or cloud-compilation credit was used.`].join('\n');
}
export function LaboratoryPanel({project,settings,probe,reference,onProbe,onReference,onLoad}){
 const [selected,setSelected]=useState(LAB_ACTIVITIES[0].id);
 const [records,setRecords]=useState({});
 const [hydrated,setHydrated]=useState(false);
 const [feedback,setFeedback]=useState('Choose an experiment, load its wiring starter, and take real modeled readings using the test bench below.');
 useEffect(()=>{try{const raw=localStorage.getItem(LAB_STORAGE_KEY);if(raw&&raw.length<=50000)setRecords(sanitizeLabRecords(JSON.parse(raw)));}catch{}setHydrated(true);},[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(LAB_STORAGE_KEY,JSON.stringify(records));}catch{}},[records,hydrated]);
 const lab=getLabActivity(selected);
 const data=records[selected]||{captures:{},note:''};
 const completion=useMemo(()=>{
  const base=labCompletion(selected,project,data.captures);
  return {...base,fingerprint:JSON.stringify(project)};
 },[selected,project,data.captures]);
 const connected=useMemo(()=>labWiringMatches(project,selected),[project,selected]);
 function selectExperiment(id){setSelected(id);setFeedback('Load the starter circuit for this experiment and review the procedure. Earlier captured results remain in this browser.');}
 function capture(id){
  const result=evaluateLabCapture({labId:selected,checkpointId:id,project,settings,probe,reference});
  setFeedback(result.reason);
  if(result.passed){
   setRecords(prev=>({...prev,[selected]:{...prev[selected],note:prev[selected]?.note||'',captures:{...prev[selected]?.captures,[id]:result}}}));
  }
 }
 function reset(){setRecords(prev=>({...prev,[selected]:{captures:{},note:prev[selected]?.note||''}}));setFeedback('Observations cleared for this experiment. Other local experiments were preserved.');}
 const note=(data.note||'').slice(0,350);
 return <section className="cb-laboratory" id="virtual-lab" aria-label="Guided Virtual Electronics Laboratory">
  <div className="cb-laboratory-head"><div><span className="cb-builder-kicker">CIRCUITBYTE / GUIDED EXPERIMENTS</span><h2>Virtual Electronics Laboratory</h2><p>Make measurements, test circuit predictions and keep a simulated lab record. The laboratory shares this workbench’s actual wiring and DC solver; no separate fake animation or paid compilation is used.</p></div><div className="cb-laboratory-progress"><strong>{completion.completed}/{completion.total}</strong><small>Recorded checkpoints for this wiring</small></div></div>
  <div className="cb-laboratory-chooser"><label htmlFor="cb-lab-experiment">Choose experiment</label><select id="cb-lab-experiment" value={selected} onChange={e=>selectExperiment(e.target.value)}>{LAB_ACTIVITIES.map((x,i)=><option key={x.id} value={x.id}>{i+1}. {x.title} · {x.minutes} min</option>)}</select><button type="button" className="cb-lab-load" onClick={()=>{onLoad(lab.template);setFeedback('Starter loaded. Inspect the wiring, choose measurement conditions and capture each checkpoint.');}}>Load experiment starter</button></div>
  <div className="cb-laboratory-main">
   <section className="cb-laboratory-guide"><div className="cb-laboratory-meta"><span>{lab.level}</span><span>~{lab.minutes} minutes</span><span>UNO · modeled DC</span></div><h3>{lab.title}</h3><p>{lab.objective}</p><h4>Procedure</h4><ol>{lab.steps.map(step=><li key={step}>{step}</li>)}</ol><p className="cb-laboratory-connection">{connected?'Wiring matches the reviewed teaching model.':'Current wiring does not match this laboratory circuit. Load the starter or correct the connections.'}</p><p className="cb-laboratory-guide-note">You may move the starter circuit to electrically equivalent breadboard holes. Measurements must match the named component terminals and specified test conditions.</p></section>
   <section className="cb-laboratory-captures"><h3>Measurement checkpoints</h3>{lab.checkpoints.map((cp,i)=>{
    const r=data.captures?.[cp.id];const valid=r?.passed&&r.fingerprint===completion.fingerprint;
    return <div key={cp.id} className="cb-lab-checkpoint"><div className="cb-lab-checkpoint-head"><strong>{i+1}. {cp.label}</strong><span>{valid?'Recorded':r?'Stale record':'Not recorded'}</span></div><p>Expected modeled reading: <b>{cp.expected.toFixed(3)} {cp.unit}</b> (±{cp.tolerance} {cp.unit})</p><small>{cp.hint}</small><div className="cb-lab-checkpoint-actions">{cp.mode==='voltage'&&<button type="button" onClick={()=>{onProbe(cp.probe);onReference(cp.reference);setFeedback('Probe set to '+cp.probe+' relative to '+cp.reference+'. Adjust the instrument conditions if needed.');}}>Set voltmeter probes</button>}<button type="button" className="cb-lab-capture" disabled={!connected} onClick={()=>capture(cp.id)}>Capture modeled reading</button></div>{valid&&<output>Recorded: {r.measured.toFixed(3)} {r.unit} · simulation only</output>}</div>;
   })}<p className="cb-laboratory-feedback" role="status">{feedback}</p></section>
  </div>
  <div className="cb-laboratory-journal"><label htmlFor="cb-laboratory-note">Observations and explanation (stored on this browser)</label><textarea id="cb-laboratory-note" rows={3} maxLength={350} value={note} placeholder="What changed and why? Compare the model with Ohm's law or the voltage-divider rule." onChange={e=>setRecords(prev=>({...prev,[selected]:{...prev[selected],captures:prev[selected]?.captures||{},note:e.target.value}}))}/><div className="cb-laboratory-actions"><button type="button" onClick={()=>downloadText('CircuitByte_Lab_'+selected+'.md',reportMarkdown(lab,data,completion))}>Export lab report</button><button type="button" onClick={reset}>Clear this experiment’s readings</button></div></div>
  <p className="cb-laboratory-disclaimer">These checkpoints certify only that the current, explicitly modeled simulation meets its teaching targets. They do not verify firmware execution, physical component ratings, real measurement uncertainty or assembled hardware. Other learners using this browser can see its local observations.</p>
 </section>;
}
