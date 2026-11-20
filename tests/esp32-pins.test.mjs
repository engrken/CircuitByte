import test from 'node:test';
import assert from 'node:assert/strict';
import {ESP32_CLASSIC_REFERENCE,getEsp32ReferencePin} from '../lib/esp32/pins.mjs';

test('classic ESP32 reference identifies its limitations and target explicitly',()=>{
 assert.equal(ESP32_CLASSIC_REFERENCE.boardTarget,'esp32:esp32:esp32');
 assert.match(ESP32_CLASSIC_REFERENCE.note,/exact board/i);
 assert.match(ESP32_CLASSIC_REFERENCE.voltage,/3\.3V/);
});

test('classic ESP32 exposed GPIO entries are unique and exclude flash pins',()=>{
 const gpios=ESP32_CLASSIC_REFERENCE.pins.map(pin=>pin.gpio);
 assert.equal(new Set(gpios).size,gpios.length);
 for(const gpio of [6,7,8,9,10,11])assert.equal(gpios.includes(gpio),false);
 assert.ok(gpios.includes(34)&&gpios.includes(39));
});

test('input-only classic ESP32 pins cannot be mistaken for output-capable pins',()=>{
 for(const gpio of [34,35,36,39]){
  const pin=getEsp32ReferencePin(gpio);
  assert.ok(pin);
  assert.ok(pin.capabilities.includes('Digital input'));
  assert.equal(pin.capabilities.includes('PWM'),false);
  assert.ok(pin.restrictions.some(item=>/Input only/i.test(item)));
 }
});

test('strapping and UART pins expose their boot or serial caveats',()=>{
 assert.ok(getEsp32ReferencePin(0).restrictions.some(item=>/strapping/i.test(item)));
 assert.ok(getEsp32ReferencePin(12).restrictions.some(item=>/flash voltage/i.test(item)));
 assert.ok(getEsp32ReferencePin(1).restrictions.some(item=>/USB serial/i.test(item)));
 assert.ok(getEsp32ReferencePin(3).restrictions.some(item=>/USB serial/i.test(item)));
});

test('ADC2 reference pins call out classic ESP32 Wi-Fi limitation',()=>{
 for(const gpio of [4,25,26,27]){
  assert.ok(getEsp32ReferencePin(gpio).capabilities.includes('ADC2'));
  assert.ok(getEsp32ReferencePin(gpio).restrictions.some(item=>/Wi-Fi/i.test(item)));
 }
 assert.equal(getEsp32ReferencePin(32).capabilities.includes('ADC1'),true);
});

test('unknown or non-exposed GPIO values do not return a fabricated pin',()=>{
 assert.equal(getEsp32ReferencePin(6),null);
 assert.equal(getEsp32ReferencePin(99),null);
 assert.equal(getEsp32ReferencePin('not-a-pin'),null);
});
