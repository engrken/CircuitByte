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
 assert.equal(getEsp32CodegenOptions('esp32:esp32:esp32','pwm-fade').some(pin=>pin.gpio===34),false);
 assert.equal(getEsp32CodegenOptions('esp32:esp32:esp32s3','button-input').some(pin=>pin.gpio===46),false);
 assert.equal(getEsp32CodegenOptions('esp32:esp32:esp32','analog-read').some(pin=>pin.gpio===32),true);
 assert.ok(getEsp32CodegenOptions('esp32:esp32:esp32s3','analog-read').length>0);
 assert.ok(getEsp32CodegenOptions('esp32:esp32:esp32c3','analog-read').length>0);
});

test('generated sketches include selected GPIO and board safety caveats',()=>{
 const sketch=generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'led-blink',gpio:23});
 assert.match(sketch,/LED_GPIO = 23/);
 assert.match(sketch,/3.3V logic/);
 const fade=generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'pwm-fade',gpio:23});
 assert.match(fade,/analogWrite\(LED_GPIO, brightness\)/);
 assert.match(fade,/current Arduino-ESP32 core/);
 assert.ok(getEsp32CodegenOptions('esp32:esp32:esp32s3','pwm-fade').length>0);
 assert.ok(getEsp32CodegenOptions('esp32:esp32:esp32c3','pwm-fade').length>0);
 assert.match(generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'button-input',gpio:32}),/INPUT_PULLUP/);
 assert.match(generateEsp32Sketch({board:'esp32:esp32:esp32c3',experiment:'analog-read',gpio:0}),/analogRead/);
});

test('ultrasonic distance example assigns separate trigger and echo GPIOs and warns about 5V echo',()=>{
 for(const board of ['esp32:esp32:esp32','esp32:esp32:esp32s3','esp32:esp32:esp32c3']) {
   const triggerOptions=getEsp32CodegenOptions(board,'ultrasonic-distance','trigger');
   const echoOptions=getEsp32CodegenOptions(board,'ultrasonic-distance','echo');
   assert.ok(triggerOptions.length>0);
   assert.ok(echoOptions.length>0);
   assert.equal(triggerOptions.some(pin=>pin.gpio===34),false);
   const sketch=generateEsp32Sketch({board,experiment:'ultrasonic-distance',triggerGpio:triggerOptions[0].gpio,echoGpio:echoOptions.find(pin=>pin.gpio!==triggerOptions[0].gpio).gpio});
   assert.match(sketch,/pulseIn\(ECHO_GPIO, HIGH, ECHO_TIMEOUT_US\)/);
   assert.match(sketch,/distanceCm/);
   assert.match(sketch,/resistor divider or proper level shifter/);
   assert.match(sketch,/Never connect a 5V ECHO signal directly/);
 }
});

test('ultrasonic generator rejects identical or unsupported trigger/echo pins',()=>{
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'ultrasonic-distance',triggerGpio:23,echoGpio:23}),/different GPIO/i);
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'ultrasonic-distance',triggerGpio:34,echoGpio:32}),/valid output and input/i);
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'ultrasonic-distance',triggerGpio:23,echoGpio:6}),/valid output and input/i);
});

test('generator rejects unsupported boards and invalid GPIO/experiment combinations',()=>{
 assert.throws(()=>generateEsp32Sketch({board:'generic-s3',gpio:4}),/supported physical-board/i);
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'led-blink',gpio:34}),/does not support/i);
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'unknown',gpio:23}),/Unsupported/i);
});


test('I2C scanner uses explicit distinct GPIO selections and scans the standard address range on all supported boards',()=>{
 for(const board of ['esp32:esp32:esp32','esp32:esp32:esp32s3','esp32:esp32:esp32c3']) {
   const options=getEsp32CodegenOptions(board,'i2c-scanner');
   assert.ok(options.length>1);
   assert.ok(options.every(pin=>pin.capabilities.includes('Digital I/O')));
   const sda=options[0];
   const scl=options.find(pin=>pin.gpio!==sda.gpio);
   const sketch=generateEsp32Sketch({board,experiment:'i2c-scanner',sdaGpio:sda.gpio,sclGpio:scl.gpio});
   assert.match(sketch,/Wire\.begin\(SDA_GPIO, SCL_GPIO\\)/);
   assert.match(sketch,/address = 0x03; address <= 0x77/);
   assert.match(sketch,/Wire\.endTransmission\(\\)/);
   assert.match(sketch,/3\.3V-compatible I²C pull-ups/);
   assert.match(sketch,/never pull SDA\\/SCL up to 5V/);
 }
});

test('I2C scanner rejects identical, input-only and unexposed GPIO selections',()=>{
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'i2c-scanner',sdaGpio:21,sclGpio:21}),/different GPIO/i);
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'i2c-scanner',sdaGpio:34,sclGpio:21}),/two exposed digital GPIO/i);
 assert.throws(()=>generateEsp32Sketch({board:'esp32:esp32:esp32',experiment:'i2c-scanner',sdaGpio:6,sclGpio:21}),/two exposed digital GPIO/i);
});
