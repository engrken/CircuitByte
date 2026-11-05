import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateDcCircuit,measureDcVoltage} from '../lib/studio-dc-simulator.mjs';
import {newCircuit,addPart,addWire,fromTemplate} from '../lib/studio-circuit-builder.mjs';

function divider(){
 let p=addPart(addPart(newCircuit(),'resistor'),'resistor');
 const [a,b]=p.parts.map(x=>x.id);
 p=addWire(p,'uno:5V',a+':A');p=addWire(p,a+':B',b+':A');p=addWire(p,b+':B','uno:GND');
 return {p,mid:a+':B'};
}
test('two 330-ohm resistors divide 5 V to 2.5 V without remote execution',()=>{
 const {p,mid}=divider();const m=simulateDcCircuit(p);
 assert.equal(m.status,'modeled');assert.ok(Math.abs(measureDcVoltage(m,mid)-2.5)<0.001);
 assert.ok(Math.abs(m.currents[p.parts[0].id].amps-5/660)<0.000001);
});
test('default supplies and probes are available; unconnected nets remain floating',()=>{
 const m=simulateDcCircuit(newCircuit());
 assert.equal(measureDcVoltage(m,'uno:5V','uno:GND'),5);
 assert.equal(measureDcVoltage(m,'uno:3.3V','uno:GND'),3.3);
 assert.equal(measureDcVoltage(m,'bb:a1','uno:GND'),null);
});
test('potentiometer wiper produces real user-controlled voltage division',()=>{
 const m=simulateDcCircuit(fromTemplate('potentiometer'),{potPercent:20});
 assert.equal(m.status,'modeled');
 assert.ok(Math.abs(measureDcVoltage(m,'pot1:WIPER')-1)<0.001);
});
test('LED example stays dark without a firmware or manual GPIO source',()=>{
 const m=simulateDcCircuit(fromTemplate('blink'));
 assert.equal(m.status,'modeled');
 assert.equal(m.currents.led1.amps,null);
});
test('manual D13 high models LED current via a series 330-ohm resistor',()=>{
 const m=simulateDcCircuit(fromTemplate('blink'),{drivePin:'D13',driveHigh:true});
 assert.equal(m.status,'modeled');
 assert.ok(Math.abs(m.currents.led1.amps-3/340)<0.00002);
 const off=simulateDcCircuit(fromTemplate('blink'),{drivePin:'D13',driveHigh:false});
 assert.equal(off.currents.led1.amps,0);
});
test('direct conflicting GPIO-to-power rail drive is refused',()=>{
 let p=addWire(newCircuit(),'uno:D13','uno:5V');
 const m=simulateDcCircuit(p,{drivePin:'D13',driveHigh:false});
 assert.equal(m.status,'blocked');
});
test('connected but unmodeled sensor is explicitly omitted',()=>{
 let p=addPart(newCircuit(),'ultrasonic');
 const m=simulateDcCircuit(p);
 assert.deepEqual(m.unsupported,[p.parts[0].id]);
});
test('solver is deterministic and does not mutate the source netlist',()=>{
 const {p}=divider(),before=JSON.stringify(p);
 assert.deepEqual(simulateDcCircuit(p),simulateDcCircuit(p));
 assert.equal(JSON.stringify(p),before);
});
