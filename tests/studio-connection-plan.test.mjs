import {test} from 'node:test';import assert from 'node:assert/strict';
import {prepareConnectionPlan} from '../lib/studio-connection-plan.mjs';
test('Wiring resolves pin aliases, removes duplicate wires and refuses variable names as components',()=>{
 const rows=[{pin:'LED_PIN',to:'LED anode',kind:'digital-output'},{pin:'2',to:'LED anode',kind:'digital-output'},{pin:'34',to:'ACS712_PIN'},{pin:'SDA',to:'LCD_SDA'},{pin:'ESP32 GND',to:'LCD GND',kind:'power'}];
 const plan=prepareConnectionPlan(rows,'const int LED_PIN = 2;\nconst int ACS712_PIN = 34;','esp32:esp32:esp32');
 assert.equal(plan.connections.length,2);assert.equal(plan.rejected.length,2);assert.equal(plan.connections[1].pin,'GND');assert.equal(plan.connections[1].kind,'ground');
});
