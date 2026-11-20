import test from 'node:test';
import assert from 'node:assert/strict';
import { modelEsp32LedOutput, modelEsp32PullupButton } from '../lib/esp32/experiment.mjs';

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
 assert.equal(modelEsp32PullupButton(true,5).explanation,/GPIO5/.test(modelEsp32PullupButton(true,5).explanation)?'GPIO5':'');
 assert.equal(modelEsp32PullupButton(false,4).level,'HIGH');
});
