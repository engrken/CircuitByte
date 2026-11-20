import test from 'node:test';
import assert from 'node:assert/strict';
import {getEsp32CodegenOptions,generateEsp32Sketch} from '../lib/esp32/codegen.mjs';

test('board-aware generator only offers exposed output-capable GPIOs for LED',()=>{
 const options=getEsp32CodegenOptions('esp32:esp32:esp32','led-blink');
 assert.ok(options.some(pin=>pin.gpio===23));
 for(const gpio of [6,7,8,9,10,11,34,35,36,39])assert.equal(options.some(pin=>pin.gpio===gpio),false);
});

test('button and analog examples filter pins by capability',()=>{
 assert.equal(getEsp32CodegenOptions('esp32:esp32:esp32','button-input').some(pin=>pin.gpio===34),false);
 assert.equal(getEsp32CodegenOptions('esp32:esp32:esp32s3','button-input').some(pin=>pin.gpio===46),false);
 assert.equal(getEsp32CodegenOptions('esp32:esp32:esp32','analog-read').some(pin=>pin.gpio===32),true);
 assert.ok(getEsp32CodegenOptions('esp32:esp32:esp32s3','analog-read').length>0);
 assert.ok(getEsp32CodegenOptions('esp32:esp32:esp32c3','analog-read').length>0);
});

test('generated sketches include selected GPIO and board safety caveats',()=>{
 const sketch=generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'led-blink',gpio:23});
 assert.match(sketch,/LED_GPIO = 23/);
 assert.match(sketch,/3.3V logic/);
 assert.match(generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'button-input',gpio:32}),/INPUT_PULLUP/);
 assert.match(generateEsp32Sketch({board:'esp32:esp32:esp32c3',experiment:'analog-read',gpio:0}),/analogRead/);
});

test('generator rejects unsupported boards and invalid GPIO/experiment combinations',()=>{
 assert.throws(()=>generateEsp32Sketch({board:'generic-s3',gpio:4}),/supported physical-board/i);
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'led-blink',gpio:34}),/does not support/i);
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'unknown',gpio:23}),/Unsupported/i);
});
