import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_PINS,PART_TYPES,ROW_COUNT,MAX_PARTS,addPart,addWire,analyzeCircuit,canonicalBreadboardNode,fromTemplate,newCircuit,normalizeCircuit,removePart,removeWire,serializeCircuit} from '../lib/studio-circuit-builder.mjs';

test('curated board and breadboard have correct independent row halves',()=>{
 assert.ok(BOARD_PINS.includes('D13')&&BOARD_PINS.includes('A0')&&BOARD_PINS.includes('GND'));
 assert.equal(canonicalBreadboardNode('bb:a4'),'bb:L4');
 assert.equal(canonicalBreadboardNode('bb:e4'),'bb:L4');
 assert.equal(canonicalBreadboardNode('bb:f4'),'bb:R4');
 assert.equal(canonicalBreadboardNode('bb:j4'),'bb:R4');
 assert.equal(canonicalBreadboardNode('bb:a13'),null);
 assert.equal(ROW_COUNT,12);
});
test('all reviewed teaching templates have no detected direct electrical short',()=>{
 for(const name of ['blink','button','potentiometer','ultrasonic']){
  const check=analyzeCircuit(fromTemplate(name));
  assert.equal(check.errors.length,0,`${name}: ${JSON.stringify(check.errors)}`);
 }
});
test('blink template recognizes a resistor wired in series',()=>{
 const c=analyzeCircuit(fromTemplate('blink'));
 assert.ok(!c.issues.some(i=>i.code==='LED_MISSING_RESISTOR'||i.code==='LED_RESISTOR_UNVERIFIED'));
});
test('breadboard strips conduct across a-e, not across the middle gap',()=>{
 let p=newCircuit();p=addWire(p,'uno:5V','bb:a4');
 assert.throws(()=>addWire(p,'bb:e4','uno:GND'),/Unsafe connection blocked/);
 assert.doesNotThrow(()=>addWire(p,'bb:f4','uno:GND'));
});
test('power rails cannot be tied to ground or one another',()=>{
 assert.throws(()=>addWire(newCircuit(),'uno:5V','uno:GND'),/Unsafe connection blocked/);
 assert.throws(()=>addWire(newCircuit(),'uno:5V','uno:3.3V'),/Unsafe connection blocked/);
 assert.throws(()=>addWire(newCircuit(),'uno:3.3V','uno:GND'),/Unsafe connection blocked/);
});
test('duplicate, self and already-connected wires are rejected',()=>{
 let p=addWire(newCircuit(),'uno:5V','bb:a4');
 assert.throws(()=>addWire(p,'uno:5V','bb:a4'),/already exists/);
 assert.throws(()=>addWire(p,'bb:a4','bb:b4'),/already on the same/);
 assert.throws(()=>addWire(p,'bb:f5','bb:f5'),/different terminals/);
 assert.throws(()=>addWire(p,'not-a-pin','bb:a1'),/existing terminals/);
});
test('a resistor elsewhere does not excuse an LED wired without current limiting',()=>{
 let p=addPart(newCircuit(),'led');p=addPart(p,'resistor');
 const led=p.parts.find(x=>x.type==='led').id;
 p=addWire(p,'uno:D13',led+':A');p=addWire(p,led+':K','uno:GND');
 assert.ok(analyzeCircuit(p).errors.some(i=>i.code==='LED_MISSING_RESISTOR'));
});
test('adding and removing parts cleans dependent wires, preserving others',()=>{
 let p=addPart(newCircuit(),'button');const id=p.parts[0].id;
 p=addWire(p,'uno:D2',id+':A');p=addWire(p,'uno:5V','bb:+');
 p=removePart(p,id);assert.equal(p.parts.length,0);assert.equal(p.wires.length,1);
 p=removeWire(p,p.wires[0].id);assert.equal(p.wires.length,0);
});
test('JSON roundtrip is strict, deterministic and never accepts foreign pins',()=>{
 const p=fromTemplate('blink');assert.deepEqual(normalizeCircuit(JSON.parse(serializeCircuit(p))),p);
 assert.throws(()=>normalizeCircuit({...p,board:'esp32:esp32:esp32'}),/Only CircuitByte/);
 assert.throws(()=>normalizeCircuit({...p,wires:[{id:'w90',a:'uno:GND',b:'evil:VCC'}]}),/Invalid/);
 assert.throws(()=>normalizeCircuit({...p,parts:[{id:'r1',type:'resistor'},{id:'r1',type:'resistor'}]}),/Invalid or duplicate/);
});
test('parts palette is bounded and uses unique identifiers',()=>{
 let p=newCircuit();for(let i=0;i<MAX_PARTS;i++)p=addPart(p,'led');
 assert.equal(new Set(p.parts.map(x=>x.id)).size,MAX_PARTS);
 assert.throws(()=>addPart(p,'led'),/Maximum/);
 assert.ok(Object.keys(PART_TYPES).includes('ultrasonic'));
});

test('analog output connected to digital pin gets a compatibility warning',()=>{
 let p=addPart(newCircuit(),'tmp36');const id=p.parts[0].id;
 p=addWire(p,id+':OUT','uno:D7');
 assert.ok(analyzeCircuit(p).warnings.some(i=>i.code==='ANALOG_SIGNAL_ON_DIGITAL'));
});
test('direct GPIO connection to supply receives a caution',()=>{
 let p=addWire(newCircuit(),'uno:D8','uno:5V');
 assert.ok(analyzeCircuit(p).warnings.some(i=>i.code==='GPIO_TO_POWER_RAIL'));
});
