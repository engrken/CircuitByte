import test from 'node:test';
import assert from 'node:assert/strict';
import { modelEsp32LedOutput, modelEsp32PullupButton, modelEsp32UltrasonicDistance } from '../lib/esp32/experiment.mjs';

test('LED GPIO output model maps HIGH to on and LOW to off', () => {
  assert.deepEqual(modelEsp32LedOutput(true), { gpio: 23, mode: 'OUTPUT', level: 'HIGH', ledOn: true, voltage: 'nominal 3.3 V logic HIGH' });
  assert.equal(modelEsp32LedOutput(false).ledOn, false);
  assert.equal(modelEsp32LedOutput(false).level, 'LOW');
});

test('INPUT_PULLUP button reads HIGH when released and LOW when pressed', () => {
  assert.equal(modelEsp32PullupButton(false).level, 'HIGH');
  assert.match(modelEsp32PullupButton(false).explanation, /internal pull-up/i);
  assert.equal(modelEsp32PullupButton(true).level, 'LOW');
  assert.match(modelEsp32PullupButton(true).explanation, /connects GPIO32 to GND/i);
});

test('GPIO models accept family-specific pin assignments without changing logic behavior',()=>{
 assert.equal(modelEsp32LedOutput(true,4).gpio,4);
 assert.equal(modelEsp32LedOutput(true,3).level,'HIGH');
 assert.match(modelEsp32PullupButton(true,5).explanation,/GPIO5/);
 assert.equal(modelEsp32PullupButton(false,4).level,'HIGH');
});

test('ultrasonic timing model converts distance to an ideal round-trip echo pulse',()=>{
 const near=modelEsp32UltrasonicDistance(10,20);
 assert.equal(near.withinThreshold,true);
 assert.equal(near.echoPulseUs,583.1);
 const far=modelEsp32UltrasonicDistance(35,20);
 assert.equal(far.withinThreshold,false);
 assert.equal(far.echoPulseUs,2040.8);
 assert.throws(()=>modelEsp32UltrasonicDistance(1),/between 2 and 400/i);
 assert.throws(()=>modelEsp32UltrasonicDistance(30,0),/threshold/i);
});
