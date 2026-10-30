import './foundations.css';
import lessons from '../../content/foundation-lessons.json';
import {LessonCode} from './lesson-code';

const tracks = [
  {name:'Electronics fundamentals',id:'electronics',number:'01',subtitle:'Understand the language of circuits',description:'Start with voltage, current, resistance, components, symbols and how a breadboard is connected.'},
  {name:'Basic circuits',id:'circuits',number:'02',subtitle:'Turn theory into a working circuit',description:'Wire LEDs, switches, a voltage divider and a transistor-controlled buzzer with clear low-voltage connection maps.'},
  {name:'Arduino coding',id:'arduino',number:'03',subtitle:'Write, upload and understand your own sketches',description:'Plan algorithms, then learn outputs, decisions, loops, functions, arrays, Serial debugging and non-blocking timing.'}
];

export {lessons};
export function LearningTracks(){
  return <section className="edu-foundations" id="learning-paths" aria-labelledby="learning-paths-title">
    <div className="edu-foundations-intro">
      <p className="edu-kicker">NEW / START FROM ZERO</p>
      <h2 id="learning-paths-title">Your electronics learning path</h2>
      <p>{lessons.length} bite-sized lessons. Learn the principles, follow a connection map, then write Arduino code and test a real circuit. No previous experience is required.</p>
    </div>
    <nav className="edu-track-jump" aria-label="Choose a learning topic">
      {tracks.map(track=><a href={'#'+track.id} key={track.id}>{track.name}<span aria-hidden="true"> ↓</span></a>)}
    </nav>
    {tracks.map(track=>{
      const entries=lessons.filter(l=>l.track===track.name);
      return <div className="edu-track" id={track.id} key={track.name}>
        <div className="edu-track-heading"><div><span className="edu-kicker">PATH {track.number} / {entries.length} LESSONS</span><h3>{track.name}</h3><p>{track.description}</p></div><span className="edu-track-pill">{track.subtitle}</span></div>
        <div className="edu-lesson-grid">{entries.map((lesson,i)=><article className="edu-lesson-card" key={lesson.slug}>
          <div className="edu-lesson-card-top"><span>LESSON {String(i+1).padStart(2,'0')}</span><span>{lesson.minutes} MIN</span></div>
          <h4><a href={'/learn/fundamentals/'+lesson.slug}>{lesson.title}</a></h4>
          <p>{lesson.intro}</p>
          <div className="edu-lesson-card-footer"><span>{lesson.code?'Includes Arduino code':'Hands-on fundamentals'}</span><a href={'/learn/fundamentals/'+lesson.slug} aria-label={'Open lesson: '+lesson.title}>Start lesson →</a></div>
        </article>)}</div>
      </div>;
    })}
    <p className="edu-foundations-end">Already know the basics? <a href="#component-library">Browse our component reference library ↓</a> or <a href="/diy">build a complete DIY project →</a></p>
  </section>;
}

export function LessonView({lesson}){
  const index=lessons.findIndex(l=>l.slug===lesson.slug);
  const previous=lessons[index-1], next=lessons[index+1];
  return <>
    <div className="edu-breadcrumb edu-foundations-crumb"><a href="/learn">Learn</a><span>/</span><a href="/learn#learning-paths">{lesson.track}</a><span>/</span><span>Lesson {index+1}</span></div>
    <header className="edu-foundation-hero">
      <div><p className="edu-kicker">CIRCUITBYTE LEARNING LAB / LESSON {String(index+1).padStart(2,'0')} OF {lessons.length}</p>
        <h1>{lesson.title}</h1><p className="edu-lead">{lesson.intro}</p>
        <div className="edu-foundation-meta"><span>{lesson.track}</span><span>{lesson.minutes} minute read + activity</span><span>{lesson.code?'Arduino sketch included':'No coding required'}</span></div>
        <a className="edu-button" href="#lesson-main">Begin lesson ↓</a>
      </div>
      <aside className="edu-foundation-objectives"><h2>By the end, you can…</h2><ul>{lesson.learn.map(x=><li key={x}>{x}</li>)}</ul></aside>
    </header>
    <div className="edu-foundation-layout">
      <aside className="edu-foundation-toc"><strong>ON THIS PAGE</strong><nav aria-label="Lesson sections">
        {[['lesson-main','Key concepts'],['connection-map','Circuit / logic map'],['activity','Try it yourself'],...(lesson.code?[['sketch','Arduino code']]:[]),['check','Check your understanding'],['sources','Reference reading']].map(([id,name])=><a key={id} href={'#'+id}>{name}</a>)}
      </nav><a href="/learn#learning-paths">← All lessons</a></aside>
      <article className="edu-foundation-article">
        <section id="lesson-main"><p className="edu-kicker">01 / UNDERSTAND</p><h2>Key concepts</h2><div className="edu-concept-list">{lesson.concepts.map(([term,explanation])=><div key={term}><h3>{term}</h3><p>{explanation}</p></div>)}</div></section>
        <section id="connection-map"><p className="edu-kicker">02 / CONNECT</p><h2>{lesson.parts.length?'Circuit & connection map':'Algorithm & flowchart map'}</h2><p className="edu-muted">{lesson.parts.length?'Illustrative low-voltage connection map (not a manufacturer schematic). Confirm pin labels and components before powering.':'This is a software-planning activity; no electronic circuit needs to be connected.'}</p>
          <div className="edu-ascii-wrap"><pre tabIndex="0" aria-label="Text-based circuit connection diagram">{lesson.diagram}</pre></div>
          {!!lesson.wiring.length&&<div className="edu-table-wrap"><table><caption>Connections to check, one by one</caption><thead><tr><th>From</th><th>To</th></tr></thead><tbody>{lesson.wiring.map(([from,to],i)=><tr key={i}><th scope="row">{from}</th><td>{to}</td></tr>)}</tbody></table></div>}
          {!!lesson.parts.length&&<><h3>Parts used</h3><div className="edu-parts-grid">{lesson.parts.map(([id,description])=><a href={'/learn/'+id} key={id}><span>{description}</span><small>See {id} in CircuitByte →</small></a>)}</div></>}
          <div className="edu-foundation-safety"><strong>Safety & variant check</strong><p>{lesson.safety}</p></div>
        </section>
        <section id="activity"><p className="edu-kicker">03 / TRY IT</p><h2>Follow the activity</h2><ol className="edu-steps">{lesson.steps.map(s=><li key={s}>{s}</li>)}</ol><div className="edu-outcome"><strong>Expected result</strong><p>{lesson.outcome}</p></div></section>
        {lesson.code&&<section id="sketch"><p className="edu-kicker">04 / PROGRAM</p><h2>Complete Arduino sketch</h2><p className="edu-muted">For an Arduino Uno R3-compatible board. Select the right board and serial port in Arduino IDE, then Verify before Upload. Never connect live wires while uploading or troubleshooting.</p><LessonCode code={lesson.code} filename={lesson.slug+'.ino'}/>
          <h3>Understand the code</h3><ul>{(lesson.codeNotes||[]).map(x=><li key={x}>{x}</li>)}</ul></section>}
        <section id="check"><p className="edu-kicker">05 / CHECK YOUR LEARNING</p><h2>Can you explain it?</h2><div className="edu-knowledge-check"><strong>{lesson.question}</strong><details><summary>Reveal suggested answer</summary><p>{lesson.answer}</p></details></div><div className="edu-lesson-challenge"><strong>Try this next</strong><p>{lesson.challenge}</p></div></section>
        <section id="sources"><h2>Reference reading</h2><ul>{lesson.references.map(([title,url])=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{title} ↗</a></li>)}</ul><p className="edu-muted">Values and pin assignments refer to the named example parts; clone variants, component polarity and actual ratings require verification.</p></section>
        <div className="edu-foundation-nav">
          {previous?<a href={'/learn/fundamentals/'+previous.slug}><small>← PREVIOUS LESSON</small><strong>{previous.title}</strong></a>:<a href="/learn#learning-paths"><small>← LEARNING LAB</small><strong>All learning paths</strong></a>}
          {next?<a href={'/learn/fundamentals/'+next.slug}><small>NEXT LESSON →</small><strong>{next.title}</strong></a>:<a href="/diy"><small>READY TO BUILD? →</small><strong>Browse DIY projects</strong></a>}
        </div>
      </article>
    </div>
  </>;
}
