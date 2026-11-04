import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseStudioCompiler} from '../lib/studio-compile-diagnostics.mjs';
import {assessStudioProject,diagnoseCompile} from '../lib/studio-project-coach.mjs';

test('Missing library includes produce a useful local fix without AI or retries',()=>{
 const result=diagnoseStudioCompiler({ok:false,stage:'compile',
  output:'Sketch.ino:12:5: fatal error: MissingDisplay.h: No such file or directory'});
 assert.equal(result.issues[0].code,'LIBRARY');
 assert.match(result.issues[0].fix,/Library Manager/i);
 assert.equal(result.needsAi,false);
});
test('Compiler line and undeclared symbol produce action, not an invented auto fix',()=>{
 const result=diagnoseStudioCompiler({ok:false,stage:'compile',
  output:'sketch.ino:27:8: error: sensorValue was not declared in this scope'});
 assert.ok(result.issues.some(x=>x.code==='UNDECLARED'));
 assert.equal(result.issues[0].line,27);
 assert.equal(result.needsAi,true);
 assert.ok(result.issues.every(x=>typeof x.fix==='string'&&x.fix.length>15));
});
test('Board toolchain outages never suggest edits to wiring or require an AI repair',()=>{
 for(const stage of ['toolchain','service']){
  const r=diagnoseStudioCompiler({ok:false,stage,error:'Download timed out'});
  assert.equal(r.issues[0].code,'TOOLCHAIN');
  assert.equal(r.needsAi,false);
  assert.match(r.issues[0].fix,/do not repeat paid attempts/i);
 }
});
test('Preflight blockers are categorized separately from real compiler results',()=>{
 const result=diagnoseStudioCompiler({ok:false,stage:'preflight',
  findings:[{code:'ESP32_SERVO_HEADER',message:'Use compatible servo library.',fix:'Select ESP32Servo.'}]});
 assert.equal(result.issues[0].code,'ESP32_SERVO_HEADER');
 assert.equal(result.needsAi,false);
 assert.equal(result.canRetry,false);
});
test('Coach includes static blockers and structured compile diagnostics without certifying hardware',()=>{
 const preflight={blockers:[{code:'AVR_EXTRA_SERIAL_UNAVAILABLE'}],warnings:[]};
 const project={board:'arduino:avr:uno',method:'ai-draft',missing:[]};
 const res=assessStudioProject({board:'arduino:avr:uno',parts:['cb-059','cb-009'],
  prompt:'Blink when input is high and show output.',project,code:'void setup(){} void loop(){}',
  preflight,compile:{ok:false,stage:'compile',output:'sketch.ino:3:3: error: expected ; before }'}});
 assert.equal(res.phase,'Troubleshoot compilation');
 assert.ok(res.actions.some(x=>/board\/library mismatch/i.test(x.message)));
 assert.ok(res.diagnostics.length>0);
 assert.equal(res.bench,false);
 assert.match(diagnoseCompile({ok:false,stage:'libraries'}),/Library Manager/);
});
