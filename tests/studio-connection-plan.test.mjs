import {test} from 'node:test';import assert from 'node:assert/strict';
import {prepareConnectionPlan} from '../lib/studio-connection-plan.mjs';
test('Wiring resolves pin aliases, removes duplicate wires and refuses variable names as components',()=>{
 const rows=[{pin:'LED_PIN',to:'LED anode',kind:'digital-output'},{pin:'2',to:'LED anode',kind:'digital-output'},{pin:'34',to:'ACS712_PIN'},{pin:'SDA',to:'LCD_SDA'},{pin:'ESP32 GND',to:'LCD GND',kind:'power'}];
 const plan=prepareConnectionPlan(rows,'const int LED_PIN = 2;\nconst int ACS712_PIN = 34;','esp32:esp32:esp32');
 assert.equal(plan.connections.length,2);assert.equal(plan.rejected.length,2);assert.equal(plan.connections[1].pin,'GND');assert.equal(plan.connections[1].kind,'ground');
});
test('Screenshot controller self-connections, reversed module endpoints and aliases never become diagram pins',()=>{
 const rows=[
  {pin:'GPIO34',to:'ESP32 Dev Board CH340 - USB Type C',net:'VOLTAGE_SENSOR_PIN',kind:'conditional'},
  {pin:'GPIO35',to:'ESP32 Dev Board CH340 - USB Type C',net:'CURRENT_SENSOR_PIN',kind:'conditional'},
  {pin:'3.3V',to:'ESP32 Dev Board CH340 - USB Type C',net:'3.3V',kind:'conditional'},
  {pin:'GND',to:'ESP32 Dev Board CH340 - USB Type C',net:'GND',kind:'conditional'},
  {pin:'ACS712_MODULE_VCC',to:'ACS712 Hall Effect Current Sensor Module 30A',net:'3.3V',kind:'conditional'},
  {pin:'ACS712_MODULE_GND',to:'ACS712 Hall Effect Current Sensor Module 30A',net:'GND',kind:'conditional'},
  {pin:'ACS712_MODULE_OUT',to:'ACS712 Hall Effect Current Sensor Module 30A',net:'CURRENT_SENSOR_PIN',kind:'conditional'},
  ...['3.3V','GND','VOLTAGE_SENSOR_PIN'].map((net,i)=>({pin:['VOLTAGE_SENSOR_MODULE_VCC','VOLTAGE_SENSOR_MODULE_GND','VOLTAGE_SENSOR_MODULE_OUT'][i],to:'0 To 25V DC Voltage Sensor Module',net,kind:'conditional'}))
 ];
 const plan=prepareConnectionPlan(rows,'const int VOLTAGE_SENSOR_PIN=34;\nconst int CURRENT_SENSOR_PIN=35;','esp32:esp32:esp32');
 assert.equal(plan.connections.length,0);assert.equal(plan.rejected.length,10);assert.equal(plan.issues.length,10);
 assert.ok(plan.issues.some(issue=>issue.code==='DESTINATION_IS_CONTROLLER'));
 assert.ok(plan.issues.some(issue=>issue.code==='SOURCE_NOT_BOARD_PIN'));
});
test('A product name and net alias are not a hardware destination, even when the code omits its declaration',()=>{
 const plan=prepareConnectionPlan([{pin:'GPIO35',to:'ACS712 Hall Effect Current Sensor Module 30A',net:'CURRENT_SENSOR_PIN',kind:'analog-input'}],'','esp32:esp32:esp32');
 assert.equal(plan.connections.length,0);assert.equal(plan.issues[0].code,'TERMINAL_MISSING');
});
test('Corrected physical terminal labels and code-resolved source pins remain intact',()=>{
 const rows=[{pin:'CURRENT_SENSOR_PIN',to:'ACS712 OUT via voltage conditioning',net:'CURRENT_SENSOR_PIN',kind:'analog-input'},{pin:'5V',to:'ACS712 VCC',net:'5V',kind:'power'},{pin:'GND',to:'ACS712 GND',net:'GND',kind:'ground'}];
 const plan=prepareConnectionPlan(rows,'const int CURRENT_SENSOR_PIN=35;','esp32:esp32:esp32');
 assert.equal(plan.rejected.length,0);assert.equal(plan.connections.length,3);assert.equal(plan.connections[0].pin,'35');
});
