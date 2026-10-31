import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveStudioLibraries,insertSuggestedIncludes} from '../lib/studio-libraries.mjs';
import {STUDIO_ZIP_UNPACK_PYTHON} from '../lib/studio-custom-zip.mjs';
const read=path=>readFile(path,'utf8');
test('LCD library mapping includes hd44780 and built-in Wire when selected',()=>{
 const deps=resolveStudioLibraries({parts:['cb-059','cb-066'],code:'void setup(){} void loop(){}'});
 assert.deepEqual(deps.packages,['hd44780']);
 assert.ok(deps.headers.includes('Wire.h'));
 assert.ok(deps.headers.includes('hd44780ioClass/hd44780_I2Cexp.h'));
});
test('DHT sensor families auto-install both sensor libraries',()=>{
 for(const part of ['cb-050','cb-079']){
  const deps=resolveStudioLibraries({parts:[part]});
  assert.deepEqual(new Set(deps.packages),new Set(['DHT sensor library','Adafruit Unified Sensor']));
 }
});
test('Curated board modules map to matching Arduino Library Manager entries',()=>{
 const expected={
  'cb-019':['Adafruit SSD1306','Adafruit GFX Library'],
  'cb-067':['RTClib'],
  'cb-070':['Servo'],
  'cb-072':['Stepper'],
  'cb-077':['SD'],
  'cb-030':['TinyGPSPlus'],
  'cb-055':['IRremote']
 };
 for(const [part,packages] of Object.entries(expected)){
  const found=resolveStudioLibraries({parts:[part]}).packages;
  for(const pkg of packages)assert.ok(found.includes(pkg),part+' missing '+pkg);
 }
});
test('Headers trigger correct libraries even when catalog items were not selected',()=>{
 assert.deepEqual(new Set(resolveStudioLibraries({code:'#include <DHT.h>\nvoid setup(){}'}).packages),new Set(['DHT sensor library','Adafruit Unified Sensor']));
 assert.deepEqual(resolveStudioLibraries({code:'#include <Wire.h>\n'}).packages,[]);
 assert.ok(resolveStudioLibraries({code:'#include <CustomSensor.h>'}).unknownIncludes.includes('CustomSensor.h'));
});
test('Library includes are inserted once and not duplicated',()=>{
 const a=insertSuggestedIncludes('void setup() {}\nvoid loop(){}',['cb-079']);
 assert.equal((a.match(/#include <DHT.h>/g)||[]).length,1);
 assert.equal(insertSuggestedIncludes(a,['cb-079']),a);
});
test('ZIP sandbox parser contains extraction limits, symlink protections and safe paths',()=>{
 assert.match(STUDIO_ZIP_UNPACK_PYTHON,/2_000_000/);
 assert.match(STUDIO_ZIP_UNPACK_PYTHON,/Too many or no archive entries/);
 assert.match(STUDIO_ZIP_UNPACK_PYTHON,/S_IFLNK/);
 assert.match(STUDIO_ZIP_UNPACK_PYTHON,/Unsafe archive path/);
});
test('School public listing requires consent, affiliation verification and approval',async()=>{
 const pub=await read('app/api/studio/schools/route.js');
 assert.match(pub,/public_consent=true AND school_verified=true AND school_public_approved=true/);
 assert.doesNotMatch(pub,/email[^\n]*return/i);
 const profile=await read('app/api/studio/profile/route.js');
 assert.match(profile,/school_verified=CASE/);
 assert.match(profile,/school_public_approved=CASE/);
 const admin=await read('app/api/admin/schools/route.js');
 assert.match(admin,/requireAdmin/);
 assert.match(admin,/public_consent=true/);
});
test('Project ownership is enforced by user_id for reads and writes',async()=>{
 const route=await read('app/api/studio/projects/route.js');
 assert.match(route,/WHERE user_id=\$1/);
 assert.match(route,/DELETE FROM studio_projects WHERE id=\$1 AND user_id=\$2/);
 assert.match(route,/pg_advisory_xact_lock/);
});
