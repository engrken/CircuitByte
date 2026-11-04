import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_OPTIONS} from '../lib/studio-boards.mjs';
import {BOARD_PROFILES} from '../lib/studio-compiler.mjs';
import {reviewStudioSketch} from '../lib/studio-sketch-preflight.mjs';

const blink='void setup(){pinMode(13,OUTPUT);} void loop(){digitalWrite(13,HIGH);delay(500);}';
test('Each of 10 selectable boards has an exact pinned compiler profile and a nonblocking serial starter',()=>{
 assert.equal(BOARD_OPTIONS.length,10);
 assert.deepEqual(new Set(BOARD_OPTIONS.map(x=>x.id)),new Set(Object.keys(BOARD_PROFILES)));
 for(const board of BOARD_OPTIONS){
  const profile=BOARD_PROFILES[board.id];
  assert.match(profile.version,/^\d+\.\d+\.\d+$/);
  assert.equal(reviewStudioSketch({board:board.id,code:'void setup(){Serial.begin(115200);} void loop(){Serial.println("ready");}'}).blockers.length,0,board.id);
 }
});
test('ESP32 family rejects core/library mismatches before any Sandbox request',()=>{
 for(const board of ['esp32:esp32:esp32','esp32:esp32:esp32s3','esp32:esp32:esp32c3','esp32:esp32:m5stack-core-esp32']){
  for(const [header,code] of [['SoftwareSerial.h','ESP32_SOFTWARE_SERIAL'],['Servo.h','ESP32_SERVO_HEADER'],['ESP8266WiFi.h','ESP8266_WIFI_ON_ESP32']]){
   const result=reviewStudioSketch({board,code:'#include <'+header+'>\n'+blink});
   assert.equal(result.canCompile,false,board+' '+header);
   assert.ok(result.blockers.some(item=>item.code===code));
  }
 }
});
test('S3, C3, ESP8266 and AVR cannot claim Bluetooth Classic; classic ESP32 is not blocked',()=>{
 const sketch='#include <BluetoothSerial.h>\n'+blink;
 for(const board of ['esp32:esp32:esp32s3','esp32:esp32:esp32c3','esp8266:esp8266:nodemcuv2','arduino:avr:uno']){
  assert.ok(reviewStudioSketch({board,code:sketch}).blockers.some(item=>item.code==='BLUETOOTH_CLASSIC_UNAVAILABLE'),board);
 }
 assert.equal(reviewStudioSketch({board:'esp32:esp32:esp32',code:sketch}).blockers.length,0);
});
test('Only classic ESP32 input-only GPIOs are rejected as output, while flash/strap pins remain cautious',()=>{
 const board='esp32:esp32:esp32';
 const unsafe=reviewStudioSketch({board,code:'void setup(){pinMode(34,OUTPUT);} void loop(){}'});
 assert.equal(unsafe.canCompile,false);
 assert.ok(unsafe.blockers.some(x=>x.code==='ESP32_INPUT_ONLY_GPIO'));
 assert.ok(reviewStudioSketch({board,code:'void setup(){pinMode(6,OUTPUT);} void loop(){}'}).warnings.some(x=>x.code==='ESP32_FLASH_GPIO'));
 const esp8266=reviewStudioSketch({board:'esp8266:esp8266:nodemcuv2',code:'void setup(){pinMode(D8,OUTPUT);} void loop(){}'});
 assert.equal(esp8266.canCompile,true);
 assert.ok(esp8266.warnings.some(x=>x.code==='ESP8266_STRAPPING'));
});
test('Known mismatches are not inferred from comments, string literals, or generic unfinished GPIO aliases',()=>{
 const harmless='// #include <SoftwareSerial.h>\n/* pinMode(34,OUTPUT) */\nvoid setup(){Serial.println("Serial1.begin(9600)");} void loop(){}';
 assert.equal(reviewStudioSketch({board:'esp32:esp32:esp32',code:harmless}).blockers.length,0);
 assert.equal(reviewStudioSketch({board:'arduino:avr:uno',code:harmless}).blockers.length,0);
 const m5=reviewStudioSketch({board:'esp32:esp32:m5stack-core-esp32',code:blink});
 assert.equal(m5.canCompile,true);
 assert.ok(m5.warnings.some(x=>x.code==='M5_BOARD_REVISION'));
});
test('Uno/Nano UART and board-specific WiFi mismatches are reported with a concrete next step',()=>{
 const uno=reviewStudioSketch({board:'arduino:avr:uno',code:'void setup(){Serial1.begin(9600);} void loop(){}'});
 assert.ok(uno.blockers.some(x=>x.code==='AVR_EXTRA_SERIAL_UNAVAILABLE'));
 assert.equal(reviewStudioSketch({board:'arduino:avr:mega:cpu=atmega2560',code:'void setup(){Serial1.begin(9600);} void loop(){}'}).blockers.length,0);
 assert.ok(reviewStudioSketch({board:'esp8266:esp8266:nodemcuv2',code:'#include <WiFi.h>\n'+blink}).blockers.some(x=>x.code==='ESP32_WIFI_ON_ESP8266'));
 const unknown=reviewStudioSketch({board:'arduino:avr:uno',code:'#include <myPrivateSensor.h>\n'+blink});
 assert.equal(unknown.canCompile,true,'unknown header is not enough evidence to claim incompatibility');
 assert.ok(unknown.warnings.some(x=>x.code==='UNRESOLVED_HEADERS'));
});
