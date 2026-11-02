import changes from '../../content/studio-changelog.json';

export function StudioUpdates(){
 return <section className="studio-updates" aria-label="CircuitByte What's New update notice board" id="studio-updates">
  <div className="studio-updates-heading"><div><span className="edu-kicker">RELEASE NOTES / WHAT'S NEW</span><h2>What's new in CircuitByte</h2><p>Changes available in this deployed Studio build. Older notices remain available for reference.</p></div><span className="studio-updates-count">{changes.length} release notices</span></div>
  <div className="studio-updates-list">
   {changes.slice(0,8).map((entry,i)=><details key={entry.id} open={i===0}>
    <summary><span className="studio-update-date">{entry.date} · {entry.type}</span><strong>{entry.title}</strong></summary>
    <ul>{entry.highlights.map((line,j)=><li key={j}>{line}</li>)}</ul>
   </details>)}
  </div>
 </section>;
}
