import test from 'node:test';
import assert from 'node:assert/strict';
import {captureLogicPins,logicTraceCsv,logicWavePath,LOGIC_PINS,newLogicTrace} from '../lib/studio-logic-trace.mjs';

test('captures multiple Uno GPIO pins and only records transitions',()=>{
 const t=newLogicTrace(3);
 captureLogicPins(t,{D13:'low',D9:'high'},0);
 captureLogicPins(t,{D13:'low',D9:'high'},1);
 captureLogicPins(t,{D13:'high',D9:'low'},2);
 assert.deepEqual(t.edges.D13,[{ms:0,level:'low'},{ms:2,level:'high'}]);
 assert.equal(t.edges.D9.length,2);
 assert.equal(LOGIC_PINS.length,12);
});
test('edge buffers remain bounded and report overflow counts',()=>{
 const t=newLogicTrace(3);
 for(let i=0;i<12;i++)captureLogicPins(t,{D13:i%2?'high':'low'},i);
 assert.equal(t.edges.D13.length,3);
 assert.equal(t.dropped.D13,9);
 assert.equal(t.edges.D13.at(-1).level,'high');
});
test('csv export is ordered, selected, and cannot contain unapproved pins or formulas',()=>{
 const t=newLogicTrace();
 captureLogicPins(t,{D13:'low',D2:'input'},0);
 captureLogicPins(t,{D13:'high',D2:'pullup'},5);
 const csv=logicTraceCsv(t.edges,['D13','D2','evil']);
 assert.equal(csv.split('\n').length,6);
 assert.match(csv,/0\.00,D13,low/);
 assert.ok(!csv.includes('evil'));
});
test('wave path includes digital steps and handles empty/invalid trace safely',()=>{
 const events=[{ms:0,level:'low'},{ms:100,level:'high'},{ms:200,level:'low'}];
 assert.match(logicWavePath(events,250,500),/^M /);
 assert.match(logicWavePath(events,250,500),/ V 19/);
 assert.equal(logicWavePath([],250,500),'');
 assert.throws(()=>newLogicTrace(2000),/bounded trace/);
});
