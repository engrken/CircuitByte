import test from 'node:test';
import assert from 'node:assert/strict';
import { ESP32_CIRCUIT_STARTERS, buildEsp32CircuitStarter } from '../lib/esp32/starters.mjs';
import { reviewElectricalDesign } from '../lib/studio-electrical-verification.mjs';

test('ESP32 starter catalog contains the LED and pushbutton learning circuits', () => {
  assert.deepEqual(ESP32_CIRCUIT_STARTERS.map(item => item.id), ['external-led', 'button-input']);
});

test('LED starter uses a series resistor and a classic ESP32 output-capable GPIO', () => {
  const starter = buildEsp32CircuitStarter('external-led');
  assert.match(starter.code, /LED_GPIO = 23/);
  assert.match(starter.netlist[0].to, /220–330 Ω series resistor/);
  const review = reviewElectricalDesign({ board: starter.board, connections: starter.netlist, components: [] });
  assert.ok(!review.findings.some(item => item.code === 'INPUT_ONLY_PIN' || item.code === 'PIN_UNKNOWN'));
  assert.equal(review.hardwareValidated, false);
});

test('button starter uses INPUT_PULLUP and a valid classic ESP32 ADC1 GPIO', () => {
  const starter = buildEsp32CircuitStarter('button-input');
  assert.match(starter.code, /INPUT_PULLUP/);
  assert.match(starter.code, /current == LOW/);
  assert.equal(starter.netlist[0].pin, 'GPIO32');
  const review = reviewElectricalDesign({ board: starter.board, connections: starter.netlist, components: [] });
  assert.ok(!review.findings.some(item => item.code === 'INPUT_ONLY_PIN' || item.code === 'PIN_UNKNOWN'));
});

test('starter templates refuse unverified S3/C3 pin mappings', () => {
  assert.throws(() => buildEsp32CircuitStarter('external-led', 'esp32:esp32:esp32s3'), /only for the classic ESP32/i);
  assert.throws(() => buildEsp32CircuitStarter('external-led', 'esp32:esp32:esp32c3'), /only for the classic ESP32/i);
});

test('unknown starter IDs are rejected', () => {
  assert.throws(() => buildEsp32CircuitStarter('not-a-starter'), /supported ESP32 circuit starter/i);
});
