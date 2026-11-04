import test from 'node:test';
import assert from 'node:assert/strict';
import {LAB_LESSONS,LAB_GROUPS,getLabLesson,LAB_PROGRESS_KEY} from '../app/learn/lab/lesson-data.mjs';

test('16 unique guided lessons and stable IDs',()=>{
 assert.equal(LAB_LESSONS.length,16);
 assert.equal(new Set(LAB_LESSONS.map(l=>l.id)).size,16);
 assert.equal(getLabLesson('blink')?.title,'Blink an LED');
 assert.equal(getLabLesson('__missing__'),null);
 assert.equal(LAB_PROGRESS_KEY,'circuitbyte.lab.progress.v1');
});
test('each lesson has board focus, parts, actionable steps and valid assessment',()=>{
 const pins=new Set([...Array.from({length:14},(_,i)=>'D'+i),...Array.from({length:6},(_,i)=>'A'+i),'GND','5V','3.3V','VIN']);
 for(const l of LAB_LESSONS){
  assert.ok(LAB_GROUPS.includes(l.category),l.id);
  assert.ok(l.title&&l.summary&&l.goal&&l.api&&l.safety,l.id);
  assert.ok(l.minutes>0&&l.minutes<=15,l.id);
  assert.ok(l.pins.length>0&&l.pins.every(p=>pins.has(p)),l.id);
  assert.ok(l.parts.length>0&&l.steps.length>=3,l.id);
  assert.ok(l.quiz.question&&l.quiz.explanation&&l.quiz.choices.length===3,l.id);
  assert.ok(Number.isInteger(l.quiz.correct)&&l.quiz.correct>=0&&l.quiz.correct<3,l.id);
 }
});
test('starts with safety and blink and finishes with a combined project',()=>{
 assert.equal(LAB_LESSONS[0].id,'meet');
 assert.equal(LAB_LESSONS[1].id,'blink');
 assert.ok(LAB_LESSONS[1].parts.some(p=>p.includes('resistor')));
 assert.ok(LAB_LESSONS[1].pins.includes('GND'));
 assert.equal(LAB_LESSONS.at(-1).id,'parking');
});
