import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessStudioProject,diagnoseCompile,BENCH_CHECKS} from '../lib/studio-project-coach.mjs';
import {prepareStudioRepair} from '../lib/studio-repair.mjs';
const base={board:'arduino:avr:uno',parts:['cb-059','cb-074'],prompt:'Detect obstacles and sound an alarm when near.'};
test('Planning asks about missing board and project requirements',()=>{
 const x=assessStudioProject({board:'esp32:esp32:esp32',parts:[],prompt:'Make a project'});
 assert.equal(x.phase,'Plan the build');assert.ok(x.questions.length);assert.ok(x.actions.some(a=>a.severity==='blocker'));
});
test('Compilation pass requires physical checks and remains unverified',()=>{
 const x=assessStudioProject({...base,project:{method:'ai-draft'},code:'void setup(){} void loop(){}',electricalReview:{status:'checks-passed'},compile:{ok:true}});
 assert.equal(x.phase,'Bench test on hardware');assert.equal(x.bench,true);assert.equal(BENCH_CHECKS.length,4);
 assert.ok(x.actions.some(a=>/not proof/i.test(a.message)));
});
test('Compile failures expose next diagnostic and repair',()=>{
 const x=assessStudioProject({...base,project:{method:'ai-draft'},code:'void setup(){Serial.begin(9600);} void loop(){}',compile:{ok:false,stage:'compile',output:'error: expected ;'}});
 assert.equal(x.phase,'Troubleshoot compilation');assert.equal(x.repair,true);
 assert.match(diagnoseCompile({ok:false,stage:'libraries'}),/Library Manager/);
 assert.match(diagnoseCompile({ok:false,stage:'service'}),/sandbox/);
});
test('Guard does not forward potential credentials or invalid code',()=>{
 assert.ok(prepareStudioRepair('void setup(){}','error').error);
 assert.ok(prepareStudioRepair('void setup(){Serial.begin(9600);} void loop(){}','').error);
 assert.match(prepareStudioRepair('void setup(){const char* ssid="home";} void loop(){}','error').error,/secrets/);
 assert.equal(prepareStudioRepair('void setup(){Serial.begin(9600);} void loop(){}','error: expected ;').error,undefined);
});
