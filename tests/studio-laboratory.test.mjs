import test from 'node:test';
import assert from 'node:assert/strict';
import {LAB_ACTIVITIES,evaluateLabCapture,labCompletion,labProjectFingerprint,labWiringMatches,sanitizeLabRecords} from '../lib/studio-laboratory.mjs';
import {addPart,addWire,analyzeCircuit,fromTemplate,newCircuit,removeWire} from '../lib/studio-circuit-builder.mjs';

function capture(labId,checkpointId,settings={},probe,reference='uno:GND'){
 const lab=LAB_ACTIVITIES.find(x=>x.id===labId),point=lab.checkpoints.find(x=>x.id===checkpointId);
 return evaluateLabCapture({labId,checkpointId,project:fromTemplate(lab.template),settings,probe:probe??point.probe,reference});
}
test('all four lessons use reviewed low-voltage templates with no modeled static errors',()=>{
 assert.equal(LAB_ACTIVITIES.length,4);
 for(const lab of LAB_ACTIVITIES){
  const circuit=fromTemplate(lab.template);
  assert.equal(analyzeCircuit(circuit).errors.length,0,lab.id);
  assert.equal(labWiringMatches(circuit,lab.id),true);
 }
});
test('fixed 330 Ω divider yields midpoint and series current',()=>{
 const mid=capture('divider','mid'),current=capture('divider','current');
 assert.equal(mid.passed,true,mid.reason);assert.equal(current.passed,true,current.reason);
 assert.ok(Math.abs(mid.measured-2.5)<0.01);
 assert.ok(Math.abs(current.measured-7.57575)<0.01);
});
test('potentiometer records distinct 20 and 80 percent readings with exact conditions',()=>{
 assert.equal(capture('potentiometer','low',{potPercent:20}).passed,true);
 assert.equal(capture('potentiometer','high',{potPercent:80}).passed,true);
 assert.equal(capture('potentiometer','low',{potPercent:80}).passed,false);
 assert.equal(capture('potentiometer','low',{potPercent:20},'uno:5V').passed,false);
});
test('D13 HIGH and LOW LED currents are checked separately',()=>{
 const hi=capture('led','on',{drivePin:'D13',driveHigh:true});
 const lo=capture('led','off',{drivePin:'D13',driveHigh:false});
 assert.equal(hi.passed,true,hi.reason);
 assert.equal(lo.passed,true,lo.reason);
 assert.equal(lo.measured,0);
 assert.equal(capture('led','on',{drivePin:'D13',driveHigh:false}).passed,false);
});
test('LDR divider tests simulate 1 kΩ and 100 kΩ conditions',()=>{
 const bright=capture('ldr','bright',{ldrOhms:1000});
 const dark=capture('ldr','dark',{ldrOhms:100000});
 assert.equal(bright.passed,true,bright.reason);assert.equal(dark.passed,true,dark.reason);
 assert.ok(dark.measured>bright.measured);
});
test('wrong wiring and unrelated components cannot pass a measurement',()=>{
 const p=fromTemplate('divider');
 const bad=removeWire(p,p.wires.at(-1).id);
 assert.equal(labWiringMatches(bad,'divider'),false);
 assert.equal(evaluateLabCapture({labId:'divider',checkpointId:'mid',project:bad,probe:'r1:B'}).passed,false);
 const extra=addPart(p,'ldr');
 assert.equal(labWiringMatches(extra,'divider'),false);
});
test('equivalent breadboard rows are accepted by terminal connectivity',()=>{
 const p=fromTemplate('divider');
 const moved={...p,wires:p.wires.map(w=>({...w,a:w.a.replace('bb:a5','bb:a8').replace('bb:b5','bb:b8'),b:w.b.replace('bb:a5','bb:a8').replace('bb:b5','bb:b8')}))};
 assert.equal(labWiringMatches(moved,'divider'),true);
});
test('completed modeled observations are invalidated by a subsequent circuit change',()=>{
 const lab='divider',project=fromTemplate('divider');
 const a=capture(lab,'mid'),b=capture(lab,'current');
 assert.equal(labCompletion(lab,project,{mid:a,current:b}).passed,true);
 const changed=removeWire(project,project.wires[0].id);
 assert.equal(labCompletion(lab,changed,{mid:a,current:b}).passed,false);
 assert.notEqual(labProjectFingerprint(changed),a.fingerprint);
});
test('unknown experiments and untrusted local records fail closed',()=>{
 assert.equal(evaluateLabCapture({labId:'unknown',checkpointId:'mid',project:newCircuit()}).passed,false);
 const good=capture('divider','mid');
 const restored=sanitizeLabRecords({divider:{captures:{mid:good,current:{...good,checkpointId:'current',measured:1000}},note:'x'.repeat(600)},evil:{}});
 assert.equal(restored.divider.captures.mid.passed,true);
 assert.equal(restored.divider.captures.current,undefined);
 assert.equal(restored.divider.note.length,350);
 assert.equal(restored.evil,undefined);
});
