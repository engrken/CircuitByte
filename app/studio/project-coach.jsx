'use client';
import {BENCH_CHECKS} from '../../lib/studio-project-coach.mjs';
export function StudioProjectCoach({report,checks={},onCheck=()=>{},onRepair=()=>{},repairDisabled='',repairing=false}){
 const done=BENCH_CHECKS.filter(x=>checks[x.id]).length;
 return <section className="studio-panel studio-project-coach" aria-label="Project Success Coach">
   <div className="studio-coach-heading"><div><span className="edu-kicker">DESIGN / DEBUG / TEST</span><h3>Project Success Coach</h3></div><strong role="status">{report.phase}</strong></div>
   <p className="studio-help">Guidance for your selected board, hardware, intended behavior, electrical review and compiler result.</p>
   {report.questions.length>0&&<div className="studio-coach-questions"><h4>Questions to answer in your project description</h4><ul>{report.questions.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
   <h4>Recommended next steps</h4><ol className="studio-coach-actions">{report.actions.slice(0,7).map((x,i)=><li className={'studio-coach-'+x.severity} key={i}>{x.message}</li>)}</ol>
   {report.repair&&<div className="studio-coach-repair"><p>AI repair is optional and costs one Student AI draft. Your previous sketch is kept in browser recovery.</p><button type="button" disabled={Boolean(repairDisabled)||repairing} onClick={onRepair}>{repairing?'Requesting repair…':'Ask AI to fix this compile error'}</button>{repairDisabled&&<p className="studio-help">{repairDisabled}</p>}</div>}
   {report.bench&&<fieldset className="studio-bench-checks"><legend>Physical prototype checklist (self-reported)</legend>{BENCH_CHECKS.map(x=><label key={x.id}><input type="checkbox" checked={Boolean(checks[x.id])} onChange={e=>onCheck(x.id,e.target.checked)}/><span>{x.label}</span></label>)}<p role="status">{done} of {BENCH_CHECKS.length} user-reported steps completed. Record test observations and measured values.</p></fieldset>}
   <p className="studio-coach-disclaimer">Neither code generation nor compilation guarantees 100% hardware functionality. CircuitByte has not independently validated your circuit. Consult manufacturer specifications and test under safe low-voltage conditions.</p>
 </section>;
}
