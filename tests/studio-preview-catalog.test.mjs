import test from 'node:test';
import assert from 'node:assert/strict';
import {previewArduinoSketch,BLINK_DEMO_CODE} from '../lib/studio-preview.mjs';
import {auditStudioCatalog} from '../lib/studio-part-capabilities.mjs';
import {STUDIO_LIBRARY_REGISTRY,resolveStudioLibraries,insertSuggestedIncludes} from '../lib/studio-libraries.mjs';
import catalog from '../scripts/catalog.json' with {type:'json'};

test('Blink demo produces two alternating D13 states',()=>{
 const result=previewArduinoSketch(BLINK_DEMO_CODE);
 assert.equal(result.supported,true,JSON.stringify(result));
 assert.deepEqual(result.pins,[13]);
 assert.deepEqual(result.frames.map(x=>x.output[13]),[true,false]);
 assert.deepEqual(result.frames.map(x=>x.duration),[600,600]);
});
test('Blink preview responds to changed delays',()=>{
 const result=previewArduinoSketch(BLINK_DEMO_CODE.replaceAll('600','250'));
 assert.equal(result.supported,true);
 assert.equal(result.duration,500);
});
test('Preview handles two independently toggled LED pins',()=>{
 const code='void loop(){digitalWrite(8,HIGH); digitalWrite(9,LOW);delay(200);digitalWrite(8,LOW);digitalWrite(9,HIGH);delay(300);}';
 const result=previewArduinoSketch(code);
 assert.equal(result.supported,true);
 assert.deepEqual(result.pins,[8,9]);
 assert.deepEqual(result.frames[0].output,{8:true,9:false});
 assert.deepEqual(result.frames[1].output,{8:false,9:true});
});
test('Preview refuses conditions and helper logic it does not actually interpret',()=>{
 const complex='void loop(){if(analogRead(A0)>100)digitalWrite(9,HIGH);delay(200);}';
 assert.equal(previewArduinoSketch(complex).supported,false);
 const helper='void loop(){blinkSomeLeds();delay(200);}';
 assert.equal(previewArduinoSketch(helper).supported,false);
 assert.equal(previewArduinoSketch('void loop(){digitalWrite(13,HIGH);}').supported,false);
});
test('All CircuitByte catalog entries get an explicit library or hardware capability label',()=>{
 const audit=auditStudioCatalog(catalog,STUDIO_LIBRARY_REGISTRY);
 assert.equal(audit.total,catalog.length);
 assert.ok(audit.total>=100);
 assert.equal(new Set(audit.items.map(x=>x.id)).size,audit.total);
 assert.ok(audit.items.every(x=>x.status&&x.note));
 assert.equal(audit.items.find(x=>x.id==='cb-062').status,'different-board');
 assert.equal(audit.items.find(x=>x.id==='cb-066').status,'managed-library');
 assert.equal(audit.items.find(x=>x.id==='cb-009').status,'standard-arduino');
});
test('Manual trusted libraries merge with automatic parts and code headers',()=>{
 const d=resolveStudioLibraries({parts:['cb-066'],manualLibraries:['rtc1302','encoder']});
 assert.ok(d.packages.includes('hd44780'));
 assert.ok(d.packages.includes('Rtc by Makuna'));
 assert.ok(d.packages.includes('Encoder'));
 const sketch=insertSuggestedIncludes('void setup(){} void loop(){}',['cb-066'],['rtc1302']);
 assert.match(sketch,/#include <RtcDS1302.h>/);
 assert.equal(insertSuggestedIncludes(sketch,['cb-066'],['rtc1302']),sketch);
});
