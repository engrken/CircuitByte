'use client';
export function StudioProjectCoach({report,onRepair=()=>{},repairDisabled='',repairing=false}){
 return <section className="studio-panel studio-project-coach" aria-label="Project Success Coach">
   <div className="studio-coach-heading"><div><span className="edu-kicker">DESIGN / DEBUG / TEST</span><h3>Project Success Coach</h3></div><strong role="status">{report.phase}</strong></div>
   <p className="studio-help">Guidance for your selected board, hardware, intended behavior, electrical review and compiler result.</p>
   {report.questions.length>0&&<div className="studio-coach-questions"><h4>Questions to answer in your project description</h4><ul>{report.questions.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
   <h4>Recommended next steps</h4><ol className="studio-coach-actions">{report.actions.slice(0,7).map((x,i)=><li className={'studio-coach-'+x.severity} key={i}>{x.message}</li>)}</ol>
   {report.diagnostics?.length>0&&<div className="studio-coach-diagnostics" role="status">
    <h4>Compiler diagnostics — suggested next checks</h4>
    <p className="studio-help">Deterministic guidance from the compiler log. No extra AI request, build or credit has been used.</p>
    <ol>{report.diagnostics.slice(0,4).map(item=><li key={item.code}>
      <strong>{item.title}{item.line?' (near source line '+item.line+')':''}</strong>
      <p>{item.explanation}</p><p><b>Next step:</b> {item.fix}</p>
    </li>)}</ol>
   </div>}
   {report.repair&&<div className="studio-coach-repair"><p>AI repair is optional and costs one Student AI draft. Your previous sketch is kept in browser recovery.</p><button type="button" disabled={Boolean(repairDisabled)||repairing} onClick={onRepair}>{repairing?'Requesting repair…':'Ask AI to fix this compile error'}</button>{repairDisabled&&<p className="studio-help">{repairDisabled}</p>}</div>}
   {report.bench&&<p className="studio-help">The sketch compiled, but the physical device has not been certified. Use the separate <strong>Hardware acceptance &amp; measured evidence</strong> section to record actual tests and results.</p>}
   <p className="studio-coach-disclaimer">Neither code generation nor compilation guarantees 100% hardware functionality. CircuitByte has not independently validated your circuit. Consult manufacturer specifications and test under safe low-voltage conditions.</p>
 </section>;
}
