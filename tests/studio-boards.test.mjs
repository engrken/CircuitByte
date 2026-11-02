import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_OPTIONS,studioBoardName} from '../lib/studio-boards.mjs';
test('All selectable board IDs retain their own labels on saved and printed projects',()=>{
 assert.equal(BOARD_OPTIONS.length,10);
 assert.equal(studioBoardName('arduino:avr:uno'),'Arduino UNO R3');
 assert.equal(studioBoardName('esp8266:esp8266:nodemcuv2'),'ESP8266 NodeMCU');
 assert.equal(studioBoardName('esp32:esp32:esp32'),'ESP32 Dev Module');
 assert.equal(studioBoardName('esp32:esp32:m5stack-core-esp32'),'M5Stack Core (ESP32)');
 assert.equal(studioBoardName('arduino:avr:nano:cpu=atmega328'),'Arduino Nano ATmega328P');
 assert.equal(studioBoardName('arduino:avr:mega:cpu=atmega2560'),'Arduino Mega 2560');
 assert.equal(studioBoardName('arduino:avr:leonardo'),'Arduino Leonardo');
 assert.equal(studioBoardName('esp32:esp32:esp32s3'),'ESP32-S3 Dev Module');
 assert.equal(studioBoardName('esp32:esp32:esp32c3'),'ESP32-C3 Dev Module');
 assert.equal(studioBoardName('unknown'),'Unknown board');
});
