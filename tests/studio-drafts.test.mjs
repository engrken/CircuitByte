import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStudioDraft,serializeStudioDraft} from '../lib/studio-drafts.mjs';
import {boardSerialStarter,BOARD_OPTIONS} from '../lib/studio-boards.mjs';
const draft=()=>({board:'arduino:avr:uno',code:'void setup(){} void loop(){}',prompt:'Create a serial heartbeat.',selected:['cb-059'],mode:'guide',
 project:{slug:'ultrasonic-distance-alarm',title:'My project',method:'guided-template'}});
test('Legacy browser drafts migrate and regenerate trusted guide metadata',()=>{
 const original=draft();original.project.guideUrl='https://untrusted.example';
 const restored=parseStudioDraft(JSON.stringify(original),['cb-059']);
 assert.equal(restored.project.guideUrl,'/diy/ultrasonic-distance-alarm');
 assert.ok(restored.project.missing.includes('cb-074'));
 assert.equal(restored.code,original.code);
});
test('Project exports round-trip for every board without relabeling ESP sketches as Uno guides',()=>{
 for(const {id} of BOARD_OPTIONS){
  const starter=boardSerialStarter(id);
  const value={board:id,code:starter.code,project:starter,prompt:starter.prompt,selected:starter.parts,mode:'ai'};
  const restored=parseStudioDraft(serializeStudioDraft(value));
  assert.equal(restored.board,id);assert.equal(restored.code,starter.code);assert.equal(restored.version,2);
  assert.equal(restored.project.method,'board-starter');
 }
 const value=draft();value.board='esp32:esp32:esp32';
 assert.equal(parseStudioDraft(value).project.method,'ai-draft');
});
test('Malformed and oversized imports fail before changing workspace state',()=>{
 for(const value of ['{',JSON.stringify({...draft(),code:'x'.repeat(15001)}),
  JSON.stringify({...draft(),board:'invented-board'}),
  JSON.stringify({...draft(),selected:['cb-999']}),
  JSON.stringify({...draft(),project:{...draft().project,slug:'../../admin'}})]){
  assert.throws(()=>parseStudioDraft(value,['cb-059']),/invalid|catalog/i);
 }
});
test('Serial starters contain no external includes or GPIO assumptions',()=>{
 for(const {id} of BOARD_OPTIONS){
  const starter=boardSerialStarter(id);
  assert.match(starter.code,/Serial.begin\(115200\)/);
  assert.match(starter.code,/void setup\(\)/);assert.match(starter.code,/void loop\(\)/);
  assert.doesNotMatch(starter.code,/#include|digitalWrite|pinMode/);
 }
});

test('Structured AI wiring survives JSON export and browser recovery on ESP boards',()=>{
 const netlist=[
  {pin:'GPIO21',to:'sensor SDA',net:'I2C_SDA',kind:'i2c',signalVoltage:3.3},
  {pin:'GND',to:'sensor ground',net:'GND',kind:'ground'}
 ];
 const value={board:'esp32:esp32:esp32',code:'void setup(){} void loop(){}',prompt:'Read a sensor over I2C.',selected:['cb-063'],mode:'ai',
  project:{slug:'studio-generated',title:'I2C sensor',method:'ai-draft',wires:[['GPIO21','sensor SDA']],netlist}};
 const restored=parseStudioDraft(serializeStudioDraft(value),['cb-063']);
 assert.deepEqual(restored.project.netlist,netlist);
 assert.deepEqual(restored.project.wires,[['GPIO21','sensor SDA']]);
 assert.equal(restored.board,'esp32:esp32:esp32');
});
test('Imported AI wiring is bounded and never treated as verified metadata',()=>{
 const value={...draft(),project:{slug:'studio-generated',title:'Untrusted wiring',method:'ai-draft',
  netlist:[{pin:'D2',to:'LED',net:'OUTPUT',kind:'verified'}]}};
 assert.throws(()=>parseStudioDraft(value),/invalid/i);
 value.project.netlist=[{pin:'D2',to:'LED',net:'OUTPUT',kind:'digital-output',signalVoltage:240}];
 assert.throws(()=>parseStudioDraft(value),/invalid/i);
});
