'use client';

import {useEffect,useState} from 'react';

const STORAGE_KEY='circuitbyte.learning-progress.v1';
const emptyProgress={completed:[],lastLesson:''};

function readProgress(){
  try{
    const value=JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'null');
    if(!value||typeof value!=='object')return emptyProgress;
    return {
      completed:Array.isArray(value.completed)?value.completed.filter(x=>typeof x==='string'):[],
      lastLesson:typeof value.lastLesson==='string'?value.lastLesson:''
    };
  }catch{return emptyProgress;}
}

function saveProgress(update){
  try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(update));}catch{/* Progress remains usable for this visit if storage is unavailable. */}
}

export function LearningProgress({lessons}){
  const [progress,setProgress]=useState(emptyProgress);
  const [ready,setReady]=useState(false);
  useEffect(()=>{setProgress(readProgress());setReady(true);},[]);
  if(!lessons.length)return null;
  const validCompleted=progress.completed.filter(slug=>lessons.some(lesson=>lesson.slug===slug));
  const nextLesson=lessons.find(lesson=>!validCompleted.includes(lesson.slug));
  const resume=lessons.find(lesson=>lesson.slug===progress.lastLesson)||nextLesson||lessons[0];
  const percent=Math.round(validCompleted.length/lessons.length*100);
  return <section className="edu-progress-panel" aria-labelledby="edu-progress-title">
    <div className="edu-progress-copy">
      <span className="edu-kicker">YOUR LEARNING PROGRESS</span>
      <h2 id="edu-progress-title">{ready?(validCompleted.length===lessons.length?'Learning path completed':'Pick up where you left off'):'Your learning path'}</h2>
      <p>{ready?validCompleted.length+' of '+lessons.length+' lessons completed · progress is saved on this device':'Your lesson progress is saved on this device as you learn.'}</p>
      <div className="edu-progress-bar" role="progressbar" aria-label="Learning path completion" aria-valuemin="0" aria-valuemax={lessons.length} aria-valuenow={validCompleted.length}>
        <span style={{width:percent+'%'}}/>
      </div>
    </div>
    <a className="edu-progress-resume" href={'/learn/fundamentals/'+resume.slug}>
      <small>{validCompleted.length===lessons.length?'REVISIT A LESSON':'CONTINUE LEARNING'}</small>
      <strong>{resume.title}</strong>
      <span>{validCompleted.includes(resume.slug)?'Review lesson →':'Open lesson →'}</span>
    </a>
  </section>;
}

export function LessonProgress({lesson,nextLesson}){
  const [completed,setCompleted]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const current=readProgress();
    setCompleted(current.completed.includes(lesson.slug));
    const updated={...current,lastLesson:lesson.slug};
    saveProgress(updated);
    setReady(true);
  },[lesson.slug]);
  function toggleCompleted(){
    const current=readProgress();
    const completedSet=new Set(current.completed);
    if(completedSet.has(lesson.slug))completedSet.delete(lesson.slug);
    else completedSet.add(lesson.slug);
    const updated={completed:[...completedSet],lastLesson:lesson.slug};
    saveProgress(updated);
    setCompleted(completedSet.has(lesson.slug));
  }
  return <section className="edu-lesson-progress" aria-label="Lesson completion">
    <div><span className="edu-kicker">YOUR PROGRESS</span><strong>{completed?'Lesson completed':'Finish this lesson'}</strong><p>{completed?'Nice work. You can revisit this lesson or continue to the next one.':'Mark this lesson complete when you can explain the key idea and expected result.'}</p></div>
    <div className="edu-lesson-progress-actions">
      <button type="button" onClick={toggleCompleted} disabled={!ready} aria-pressed={completed}>{completed?'Mark as not complete':'Mark lesson complete'}</button>
      {nextLesson&&<a href={'/learn/fundamentals/'+nextLesson.slug}>Next lesson →</a>}
    </div>
  </section>;
}
