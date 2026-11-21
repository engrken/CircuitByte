import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEsp32CircuitStarter } from '../lib/esp32/starters.mjs';

test('LED wiring diagram source data has a resistor between GPIO and LED anode', () => {
  for (const board of ['esp32:esp32:esp32','esp32:esp32:esp32s3','esp32:esp32:esp32c3']) {
    const starter = buildEsp32CircuitStarter('external-led', board);
    assert.match(starter.netlist[0].to, /LED anode through 220–330 Ω series resistor/);
    assert.equal(starter.netlist[1].pin, 'GND');
    assert.match(starter.netlist[1].to, /LED cathode/);
    assert.ok(starter.warnings.some(warning => /3\.3 V only/.test(warning)));
  }
});

test('button wiring diagram source data shows a GPIO-to-switch-to-ground path', () => {
  for (const board of ['esp32:esp32:esp32','esp32:esp32:esp32s3','esp32:esp32:esp32c3']) {
    const starter = buildEsp32CircuitStarter('button-input', board);
    assert.match(starter.netlist[0].to, /Momentary pushbutton terminal A/);
    assert.equal(starter.netlist[1].pin, 'GND');
    assert.match(starter.netlist[1].to, /Momentary pushbutton terminal B/);
    assert.match(starter.code, /INPUT_PULLUP/);
  }
});
