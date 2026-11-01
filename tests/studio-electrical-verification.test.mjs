import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewElectricalDesign} from '../lib/studio-electrical-verification.mjs';
test('missing netlist and component ratings cannot pass',()=>{
 const result=reviewElectricalDesign();
 assert.equal(result.status,'incomplete');
 assert.equal(result.hardwareValidated,false);
});
test('conflicting nets fail',()=>{
 const result=reviewElectricalDesign({connections:[{pin:'D2',net:'A'},{pin:'D2',net:'B'}]});
 assert.equal(result.status,'failed');
 assert.ok(result.findings.some(f=>f.code==='PIN_CONFLICT'));
});
test('known component overvoltage fails',()=>{
 const result=reviewElectricalDesign({connections:[{pin:'D2',net:'A'}],components:[{name:'sensor',supplyVoltage:5,maxSupplyVoltage:3.6,maxCurrentMa:50}]});
 assert.equal(result.status,'failed');
 assert.ok(result.findings.some(f=>f.code==='SUPPLY_OVERVOLTAGE'));
});
test('3.3 V board rejects 5 V signals when voltage is specified',()=>{
 const result=reviewElectricalDesign({board:'esp32:esp32:esp32',connections:[{pin:'GPIO21',net:'SDA',kind:'digital-input',signalVoltage:5}]});
 assert.equal(result.status,'failed');
});
test('documented ratings can pass static checks without claiming hardware validation',()=>{
 const result=reviewElectricalDesign({connections:[{pin:'D2',net:'SIGNAL'}],components:[{name:'module',supplyVoltage:5,maxSupplyVoltage:5,minSupplyVoltage:3.3,maxCurrentMa:100,loadCurrentMa:20}]});
 assert.equal(result.status,'checks-passed');
 assert.equal(result.hardwareValidated,false);
});
