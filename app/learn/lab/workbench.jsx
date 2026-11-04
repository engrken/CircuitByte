'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {LAB_GROUPS,LAB_LESSONS,LAB_PROGRESS_KEY} from './lesson-data.mjs';
const DIGITAL=Array.from({length:14},(_,i)=>'D'+i);
const ANALOG=Array.from({length:6},(_,i)=>'A'+i);
const POWER=['3.3V','5V','GND','VIN'];
const DETAILS={
 usb:['USB Type-B','Connects to a workstation for programming and data. USB may power simple low-current activities.'],
 chip:['ATmega328P','The microcontroller that runs Arduino Uno programs and handles its pins.'],
 reset:['Reset button','Restarts setup() without erasing the uploaded program.'],
 breadboard:['Breadboard','A solderless prototype board. Confirm the center gap and contact groupings on your physical board.'],
 led:['LED','A polarized light-emitting diode. Connect the anode through a resistor and the cathode to GND.'],
 resistor:['330 Ω resistor','A current-limiting component connected in series with the LED.'],
 GND:['Ground','The common electrical return and voltage reference for the circuit.'],
 '5V':['5 V power','A regulated supply output, subject to the board current limit.'],
 '3.3V':['3.3 V power','A limited-current supply; check your exact Uno hardware.'],
 VIN:['VIN power input','External supply input to the regulator, not a regulated 5 V sensor pin.']
};
const pinDetail=pin=>DETAILS[pin]||(/^A[0-5]$/.test(pin)?[pin,'10-bit analog input for voltages within the board ADC supply range. Can also be used for digital GPIO.']:[pin,'Digital GPIO'+([3,5,6,9,10,11].includes(Number(pin.slice(1)))?' with PWM output capability.':'.')+(pin==='D13'?' Often connected to the built-in LED.':'')]);
const initialView={tilt:48,rotation:-12,scale:1};
const BLINK_CODE=['const byte LED_PIN = 13;','void setup() {','  pinMode(LED_PIN, OUTPUT);','}','void loop() {','  digitalWrite(LED_PIN, HIGH);','  delay(500);','  digitalWrite(LED_PIN, LOW);','  delay(500);','}'].join('\n');
function Part({id,selected,onSelect,className='',children}){
 return <button type="button" className={'cb-lab-part '+className+(selected===id?' chosen':'')} aria-pressed={selected===id} aria-label={'Inspect '+pinDetail(id)[0]} onClick={()=>onSelect(id)}>{children}</button>;
}
function PinSet({pins,focus,selected,onSelect,className}){
 return <div className={className}>{pins.map(pin=><button key={pin} type="button" title={'Inspect '+pin} aria-label={'Inspect '+pin} aria-pressed={selected===pin} onClick={()=>onSelect(pin)} className={'cb-lab-pin'+(selected===pin?' chosen':'')+(focus.includes(pin)?' focus-pin':'')}><i/>{pin.startsWith('D')?pin.slice(1):pin}</button>)}</div>;
}
function Board({focus,selected,onSelect}){
 return <div className="cb-lab-board"><div className="cb-lab-pcb">
  <span className="cb-lab-logo">CIRCUITBYTE <small>UNO R3 · TEACHING MODEL</small></span>
  <span className="cb-lab-silk top">DIGITAL GPIO</span><span className="cb-lab-silk analog">ANALOG IN</span><span className="cb-lab-silk power">POWER</span>
  <Part id="usb" className="cb-lab-usb" selected={selected} onSelect={onSelect}>USB</Part>
  <Part id="chip" className="cb-lab-chip" selected={selected} onSelect={onSelect}>ATMEGA328P<small>MCU</small></Part>
  <Part id="reset" className="cb-lab-reset" selected={selected} onSelect={onSelect}>RST</Part>
  <span className="cb-lab-jack">DC</span><span className="cb-lab-xtal">16 MHz</span>
  <PinSet pins={DIGITAL} focus={focus} selected={selected} onSelect={onSelect} className="cb-lab-digital"/>
  <PinSet pins={ANALOG} focus={focus} selected={selected} onSelect={onSelect} className="cb-lab-analog"/>
  <PinSet pins={POWER} focus={focus} selected={selected} onSelect={onSelect} className="cb-lab-power"/>
 </div></div>;
}
function Breadboard({blink,lit,selected,onSelect}){
 return <div className="cb-lab-breadboard"><div className="cb-lab-breadboard-inner">
  <Part id="breadboard" selected={selected} onSelect={onSelect} className="cb-lab-breadboard-label">BREADBOARD · 170 TIE POINTS</Part>
  <div className="cb-lab-holes" aria-hidden="true">{Array.from({length:100},(_,i)=><i key={i}/>)}</div>
  {blink&&<><Part id="resistor" selected={selected} onSelect={onSelect} className="cb-lab-resistor"><span/></Part>
  <Part id="led" selected={selected} onSelect={onSelect} className={'cb-lab-led'+(lit?' lit':'')}><span/></Part></>}
 </div></div>;
}
function WorkbenchScene({lesson,ledOn}){
 const [selected,setSelected]=useState('D13');
 const [view,setView]=useState(initialView);
 const pointer=useRef(null);
 useEffect(()=>{setSelected(lesson.pins[0]||'chip');},[lesson.id]);
 const adjustZoom=amount=>setView(v=>({...v,scale:Math.min(1.6,Math.max(.6,v.scale+amount))}));
 const onMove=event=>{if(!pointer.current)return;const dx=event.clientX-pointer.current.x;const dy=event.clientY-pointer.current.y;pointer.current={x:event.clientX,y:event.clientY};setView(v=>({...v,rotation:v.rotation+dx*.32,tilt:Math.min(75,Math.max(18,v.tilt+dy*.25))}));};
 const detail=pinDetail(selected);
 return <section className="cb-lab-scene" aria-label="Interactive three-dimensional teaching model of an Arduino Uno and breadboard">
  <div className="cb-lab-scene-tools"><strong>Explore the circuit</strong><span>Drag to rotate · choose a pin · zoom to inspect</span><button type="button" onClick={()=>adjustZoom(.12)} aria-label="Zoom in">+</button><button type="button" onClick={()=>adjustZoom(-.12)} aria-label="Zoom out">−</button><button type="button" onClick={()=>setView(initialView)}>Reset view</button></div>
  <div className="cb-lab-stage" role="group" tabIndex={0} aria-label="Arduino model. Drag to rotate or use arrow keys to turn. Press plus or minus to zoom."
    onPointerDown={e=>{if(e.target.closest('button'))return;pointer.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={onMove} onPointerUp={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}}
    onKeyDown={e=>{if(['ArrowLeft','ArrowRight','+','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')setView(initialView);else if(e.key==='+')adjustZoom(.12);else if(e.key==='-')adjustZoom(-.12);else setView(v=>({...v,rotation:v.rotation+(e.key==='ArrowRight'?8:-8)}));}}}>
    <div className="cb-lab-floor" aria-hidden="true"/>
    <div className="cb-lab-object" style={{transform:'translate(-50%,-50%) rotateX('+view.tilt+'deg) rotateZ('+view.rotation+'deg) scale('+view.scale+')'}}>
      <Board focus={lesson.pins} selected={selected} onSelect={setSelected}/>
      <Breadboard blink={lesson.id==='blink'} lit={ledOn} selected={selected} onSelect={setSelected}/>
      {lesson.id==='blink'&&<svg className="cb-lab-wires" viewBox="0 0 820 405" aria-hidden="true"><path d="M410 78 C480 -8 535 50 648 169" stroke="#efab62"/><path d="M408 297 C480 378 530 350 674 235" stroke="#5ebfd6"/></svg>}
    </div>
    <div className="cb-lab-stage-note">Independent 3D teaching model · No firmware or current simulation</div>
  </div>
  <div className="cb-lab-inspector"><div><small>SELECTED PIN / PART</small><strong>{detail[0]}</strong><p>{detail[1]}</p></div><div className="cb-lab-lesson-pins"><small>LESSON PINS</small><div>{lesson.pins.map(pin=><button key={pin} type="button" className={selected===pin?'active':''} onClick={()=>setSelected(pin)}>{pin}</button>)}</div></div></div>
 </section>;
}
function downloadBlink(){
 const blob=new Blob([BLINK_CODE],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 try{const a=document.createElement('a');a.href=url;a.download='CircuitByte_LED_Blink.ino';document.body.appendChild(a);a.click();a.remove();}
 finally{URL.revokeObjectURL(url);}
}
export function InteractiveLab(){
 const [lessonIndex,setLessonIndex]=useState(0);
 const [filter,setFilter]=useState('All');
 const [search,setSearch]=useState('');
 const [section,setSection]=useState('guide');
 const [answer,setAnswer]=useState(null);
 const [completed,setCompleted]=useState([]);
 const [hydrated,setHydrated]=useState(false);
 const [running,setRunning]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [delayMs,setDelayMs]=useState(500);
 const current=LAB_LESSONS[lessonIndex];
 useEffect(()=>{try{const value=JSON.parse(localStorage.getItem(LAB_PROGRESS_KEY)||'[]');if(Array.isArray(value))setCompleted(value.filter(id=>LAB_LESSONS.some(l=>l.id===id)));}catch{}setHydrated(true);},[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(LAB_PROGRESS_KEY,JSON.stringify(completed));}catch{}},[completed,hydrated]);
 useEffect(()=>{setSection('guide');setAnswer(null);setRunning(false);setElapsed(0);},[lessonIndex]);
 useEffect(()=>{if(!running||current.id!=='blink')return;const clock=setInterval(()=>setElapsed(t=>t+50),50);return()=>clearInterval(clock);},[running,current.id]);
 const ledOn=running&&current.id==='blink'&&elapsed%(delayMs*2)<delayMs;
 const visible=useMemo(()=>LAB_LESSONS.filter(l=>(filter==='All'||l.category===filter)&&[l.title,l.id,l.summary].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[filter,search]);
 const isCorrect=answer===current.quiz.correct;
 const done=completed.includes(current.id);
 return <div className="cb-lab">
  <div className="cb-lab-hero"><div><span className="cb-lab-eyebrow">CIRCUITBYTE / INTERACTIVE LAB</span><h1>Learn by <em>exploring.</em></h1><p>Inspect a three-dimensional Arduino Uno teaching model, follow guided activities, and check your understanding before moving forward.</p><div className="cb-lab-hero-links"><a href="/learn/lab/builder">Open Circuit Builder ↗</a><a href="/studio">Build in AI Project Studio ↗</a><a href="/learn">Learning library ↗</a></div></div><div className="cb-lab-progress"><small>YOUR LESSON PROGRESS</small><strong>{completed.length}<span> / {LAB_LESSONS.length}</span></strong><div role="progressbar" aria-label="Completed lessons" aria-valuemin={0} aria-valuemax={16} aria-valuenow={completed.length}><i style={{width:(completed.length/16*100)+'%'}}/></div><p>Progress saves locally on this browser after successful quizzes.</p></div></div>
  <div className="cb-lab-layout">
   <aside className="cb-lab-sidebar" aria-label="Interactive Lab lessons"><h2>Learning path</h2><label htmlFor="cb-lab-search">Find a lesson</label><input id="cb-lab-search" type="search" placeholder="Search sensors, PWM..." value={search} onChange={e=>setSearch(e.target.value)}/><div className="cb-lab-filters" role="group" aria-label="Filter lessons by topic">{['All',...LAB_GROUPS].map(g=><button key={g} type="button" aria-pressed={filter===g} onClick={()=>setFilter(g)}>{g}</button>)}</div><div className="cb-lab-lessons">{visible.length===0?<p>No matching lessons.</p>:visible.map(l=>{const i=LAB_LESSONS.indexOf(l);return <button key={l.id} type="button" className={'cb-lab-lesson'+(i===lessonIndex?' active':'')} aria-current={i===lessonIndex?'step':undefined} onClick={()=>setLessonIndex(i)}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{l.title}</strong><small>{l.category} · {l.minutes} min</small></div><b>{completed.includes(l.id)?'✓':'›'}</b></button>;})}</div></aside>
   <div className="cb-lab-main"><header className="cb-lab-current"><div><span className="cb-lab-eyebrow">LESSON {String(lessonIndex+1).padStart(2,'0')} / 16 · {current.category.toUpperCase()}</span><h2>{current.title}</h2><p>{current.summary}</p></div><span className={done?'cb-lab-done':'cb-lab-pending'}>{done?'✓ Completed':'In progress'}</span></header>
    <WorkbenchScene lesson={current} ledOn={ledOn}/>
    {current.id==='blink'&&<div className="cb-lab-demo"><div><strong>LED timing illustration</strong><p>This demonstration models a simple ON/OFF timing pattern. It does not execute or emulate firmware.</p></div><label>Delay<select value={delayMs} onChange={e=>{setDelayMs(Number(e.target.value));setElapsed(0);}}><option value={250}>250 ms</option><option value={500}>500 ms</option><option value={1000}>1000 ms</option></select></label><button type="button" onClick={()=>{setRunning(old=>!old);setElapsed(0);}}>{running?'Pause':'Run demo'}</button><output>{running?(ledOn?'D13 HIGH · LED ON':'D13 LOW · LED OFF'):'Stopped'} · Cycle {delayMs*2} ms</output></div>}
    <section className="cb-lab-guide"><div className="cb-lab-tabs" role="tablist" aria-label="Lesson details">{[['guide','Guide'],['code','Code concepts'],['quiz','Knowledge check']].map(([id,label])=><button key={id} id={'cb-lab-tab-'+id} role="tab" type="button" aria-selected={section===id} aria-controls={'cb-lab-panel-'+id} onClick={()=>setSection(id)}>{label}</button>)}</div>
      <div id={'cb-lab-panel-'+section} role="tabpanel" aria-labelledby={'cb-lab-tab-'+section}>
       {section==='guide'&&<div className="cb-lab-panel"><div className="cb-lab-objective"><small>OBJECTIVE</small><p>{current.goal}</p></div><h3>Step-by-step activity</h3><ol>{current.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><h3>Materials</h3><div className="cb-lab-materials">{current.parts.map(p=><span key={p}>{p}</span>)}</div><div className="cb-lab-warning"><strong>Safety note</strong><p>{current.safety}</p></div><button className="cb-lab-action" type="button" onClick={()=>setSection('quiz')}>Check your understanding →</button></div>}
       {section==='code'&&<div className="cb-lab-panel"><h3>{current.id==='blink'?'Complete Arduino blink example':'Related Arduino concepts'}</h3><p>{current.id==='blink'?'The example sketch is separate from the timing illustration, which does not run Arduino code.':'These are concept snippets only, not complete or compiled Arduino sketches. Use Studio to design and verify a complete sketch.'}</p><pre><code>{current.id==='blink'?BLINK_CODE:current.api}</code></pre><div className="cb-lab-code-links"><a href="/studio">Continue in Studio ↗</a>{current.id==='blink'&&<button type="button" onClick={downloadBlink}>Download .ino example</button>}</div></div>}
       {section==='quiz'&&<div className="cb-lab-panel"><h3>Knowledge check</h3><p>{current.quiz.question}</p><div className="cb-lab-answers">{current.quiz.choices.map((choice,i)=><button key={i} type="button" aria-pressed={answer===i} onClick={()=>setAnswer(i)}><span>{String.fromCharCode(65+i)}</span>{choice}</button>)}</div>{answer!==null&&<p role="status" className={'cb-lab-feedback'+(isCorrect?' correct':' incorrect')}><strong>{isCorrect?'Correct.':'Try again.'}</strong> {current.quiz.explanation}</p>}<button className="cb-lab-action" type="button" disabled={!isCorrect||done} onClick={()=>setCompleted(prev=>prev.includes(current.id)?prev:[...prev,current.id])}>{done?'Lesson completed ✓':'Mark lesson complete'}</button></div>}
      </div>
    </section>
    <div className="cb-lab-navigate"><button type="button" disabled={lessonIndex===0} onClick={()=>setLessonIndex(i=>i-1)}>← Previous lesson</button><button type="button" disabled={lessonIndex===LAB_LESSONS.length-1} onClick={()=>setLessonIndex(i=>i+1)}>Next lesson →</button></div>
    <p className="cb-lab-disclaimer">Phase 1 is an independent CSS 3D educational workbench, not a firmware or electrical simulator. Other circuits are explained but not emulated. Use the verified pinouts and datasheets for your exact physical boards. Saved progress belongs to this browser only.</p>
   </div>
  </div>
 </div>;
}
