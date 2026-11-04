'use client';
import {acceptanceSummary,createAcceptanceRecord,rebaseAcceptance} from '../../lib/studio-acceptance.mjs';

export function StudioAcceptancePanel({value,scope,onChange=()=>{}}){
 const record=value||createAcceptanceRecord();
 const report=acceptanceSummary(record,scope);
 const ready=record.boardModel.trim().length>=3&&record.supplyNotes.trim().length>=3;
 function editField(name,input){onChange({...record,[name]:String(input).slice(0,name==='boardModel'?120:300)});}
 function editCriterion(id,patch){
  onChange({...record,criteria:record.criteria.map(c=>c.id===id?{...c,...patch}:c)});
 }
 function addCriterion(){
  if(record.criteria.length>=6)return;
  const next=Array.from({length:6},(_,i)=>'custom-'+(i+1)).find(id=>!record.criteria.some(c=>c.id===id));
  onChange({...record,criteria:[...record.criteria,{id:next,title:'New success criterion',expected:'Describe a measurable pass result.',observed:'',status:'not-tested'}]});
 }
 return <section className="studio-acceptance" aria-label="Prototype acceptance evidence">
  <div className="studio-acceptance-header"><div><h4>Hardware acceptance record</h4>
   <p>Version {record.version} · Revision {record.revision}. Saved only in this browser draft or exported project JSON. No fees or AI requests.</p>
   </div><strong role="status">{report.label}</strong></div>
  <p className="studio-help">Record exact hardware, the expected measurable result, what you actually observed, and your own pass/fail conclusion. A compiler or AI draft cannot certify physical hardware. Entries are self-reported, not independently reviewed.</p>
  <div className="studio-acceptance-details">
   <label>Board and module models / revisions
    <input type="text" maxLength={120} value={record.boardModel} placeholder="e.g., ESP32 DevKit v1, ACS712-30A module" onChange={e=>editField('boardModel',e.target.value)}/></label>
   <label>Measured power supply / limitations
    <input type="text" maxLength={300} value={record.supplyNotes} placeholder="e.g., 5.04 V USB input, 3.29 V GPIO logic" onChange={e=>editField('supplyNotes',e.target.value)}/></label>
  </div>
  {report.stale&&<div className="studio-warning" role="alert">Project inputs or the hardware record changed. Old observations are preserved for inspection but do not count as current evidence. Start a new revision before recording tests.</div>}
  {record.scope!==scope&&<button type="button" className="studio-acceptance-reset" onClick={()=>onChange(rebaseAcceptance(record,scope))}>
   {report.stale?'Start new verification revision':'Begin verification for this project'}
  </button>}
  {!ready&&<p className="studio-help">Enter the exact board/module models and measured power notes before marking a criterion passed.</p>}
  <div className="studio-acceptance-tests">{record.criteria.map((item,i)=>{
   const canMark=!report.stale&&record.scope===scope&&ready&&item.expected.trim().length>=12&&item.observed.trim().length>=8;
   return <fieldset key={item.id} className="studio-acceptance-test" disabled={report.stale}>
    <legend>{i+1}. {item.title}</legend>
    <label>Test criterion
     <input type="text" maxLength={100} value={item.title} onChange={e=>editCriterion(item.id,{title:e.target.value.slice(0,100),status:'not-tested'})}/></label>
    <label>Expected measurable result
     <textarea rows={2} maxLength={300} value={item.expected} onChange={e=>editCriterion(item.id,{expected:e.target.value.slice(0,300),status:'not-tested'})}/></label>
    <label>Actual observation or measurement
     <textarea rows={2} maxLength={600} value={item.observed} onChange={e=>editCriterion(item.id,{observed:e.target.value.slice(0,600),status:'not-tested'})} placeholder="Write actual measurements, behavior, readings, or observed failures"/></label>
    <label>Test outcome (user-reported)
     <select value={item.status} onChange={e=>editCriterion(item.id,{status:canMark?e.target.value:'not-tested'})}>
      <option value="not-tested">Not tested</option>
      <option value="failed" disabled={!canMark}>Failed on physical hardware</option>
      <option value="passed-by-user" disabled={!canMark}>Passed by me on physical hardware</option>
     </select></label>
    {item.id.startsWith('custom-')&&<button type="button" onClick={()=>onChange({...record,criteria:record.criteria.filter(x=>x.id!==item.id)})}>Remove custom test</button>}
   </fieldset>;
  })}</div>
  {record.criteria.length<6&&<button type="button" onClick={addCriterion}>Add measurable test (up to 6)</button>}
  <p role="status" className="studio-acceptance-summary">{report.complete?'All defined tests are marked passed by the user; independent hardware validation has not occurred.':report.stale?'Evidence is stale for the current design.':report.failed?report.failed+' criteria failed; troubleshoot and retest.':'No claim of complete physical operation until every criterion has observed evidence and a user-recorded pass.'}</p>
 </section>;
}
