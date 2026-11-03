import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewElectricalDesign} from '../lib/studio-electrical-verification.mjs';
test('SIM900A screenshot power and raw RX wiring block progression',()=>{
 const result=reviewElectricalDesign({connections:[{pin:'5V',to:'SIM900A_VCC',net:'power',kind:'power'},{pin:'D11',to:'SIM900A_RXD',net:'rx',kind:'conditional'},{pin:'D10',to:'SIM900A_TXD',net:'tx',kind:'conditional'},{pin:'GND',to:'SIM900A_GND',net:'ground',kind:'ground'}]});
 assert.equal(result.status,'failed');
 for(const code of ['MODEM_SUPPLY_UNVERIFIED','MODEM_RX_LEVEL_SHIFT','MODEM_UART_LEVELS'])assert.ok(result.findings.some(f=>f.code===code));
});
test('Modem starter with documented level translation still needs an independent supply review',()=>{
 const result=reviewElectricalDesign({connections:[{pin:'D11',to:'SIM900A RXD via level translator',net:'rx',kind:'digital-output'},{pin:'GND',to:'SIM900A GND',net:'ground',kind:'ground'}]});
 assert.equal(result.status,'incomplete');assert.ok(result.findings.some(f=>f.code==='MODEM_UART_LEVELS'));
 assert.ok(!result.findings.some(f=>f.severity==='error'));
});
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
 const result=reviewElectricalDesign({connections:[{pin:'D2',net:'SIGNAL',to:'module input',kind:'digital-output'},{pin:'GND',net:'GND',to:'module GND',kind:'ground'}],components:[{name:'module',supplyVoltage:5,maxSupplyVoltage:5,minSupplyVoltage:3.3,maxCurrentMa:100,loadCurrentMa:20}]});
 assert.equal(result.status,'checks-passed');
 assert.equal(result.hardwareValidated,false);
});

test('M5Stack and ESP32 never pass without a verified board-specific pinout',()=>{
 for(const board of ['esp32:esp32:esp32','esp32:esp32:m5stack-core-esp32','esp8266:esp8266:nodemcuv2']){
  const result=reviewElectricalDesign({board,connections:[{pin:'GPIO21',net:'SIGNAL'}],components:[{name:'module',supplyVoltage:3.3,minSupplyVoltage:3,maxSupplyVoltage:3.6,maxCurrentMa:50,loadCurrentMa:10}]});
  assert.equal(result.status,'incomplete');
  assert.ok(result.findings.some(f=>f.code==='BOARD_PINOUT_UNVERIFIED'));
 }
});

test('AI-generated netlists with missing destination and ground cannot pass static review',()=>{
 const result=reviewElectricalDesign({connections:[{pin:'D3',net:'SIGNAL',kind:'digital-output'}],components:[{name:'sensor',supplyVoltage:5,minSupplyVoltage:3,maxSupplyVoltage:5,maxCurrentMa:50,loadCurrentMa:10}]});
 assert.equal(result.status,'incomplete');
 assert.ok(result.findings.some(f=>f.code==='CONNECTION_DETAILS_MISSING'));
 assert.ok(result.findings.some(f=>f.code==='GROUND_PATH_UNVERIFIED'));
});

test('Studio editor conservatively invalidates an earlier wiring review after source changes',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../app/studio/workspace.jsx',import.meta.url),'utf8');
 assert.match(source,/status:review.status==='failed'\?'failed':'incomplete'/);
 assert.match(source,/code:'SKETCH_EDITED'/);
 assert.match(source,/\[board,project\?\.board,project\?\.netlist,spec,codeDirty,connections,connectionPlan.rejected.length\]/);
});
