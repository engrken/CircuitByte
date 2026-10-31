import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDIO_BUILDS,prepareStudioProject} from '../lib/studio.mjs';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';

test('Studio starter projects are distinct and backed by real catalog sketches',async()=>{
  assert.equal(STUDIO_BUILDS.length,5);
  assert.equal(new Set(STUDIO_BUILDS.map(item=>item.slug)).size,5);
  for(const build of STUDIO_BUILDS){
    assert.ok(build.title&&build.wires.length>=4&&build.parts.includes('cb-059'));
    await access(path.resolve('public/education/code',build.slug+'.ino'));
    const code=await readFile(path.resolve('public/education/code',build.slug+'.ino'),'utf8');
    assert.match(code,/\bvoid\s+setup\s*\(/);
    assert.match(code,/\bvoid\s+loop\s*\(/);
  }
});
test('Studio matches ultrasonic hardware and reports missing required parts',()=>{
  const result=prepareStudioProject({prompt:'Make an ultrasonic distance alarm with a buzzer.',parts:['cb-059','cb-074']});
  assert.equal(result.slug,'ultrasonic-distance-alarm');
  assert.ok(result.missing.includes('cb-029'));
  assert.equal(result.method,'guided-template');
});
test('Studio matches a joystick when selected and does not claim AI or hardware verification',()=>{
  const result=prepareStudioProject({prompt:'Control direction indicator lights with my joystick.',parts:['cb-059','cb-015']});
  assert.equal(result.slug,'joystick-direction-lights');
  assert.match(result.note,/not.*AI.generated/i);
});
test('Studio rejects unsupported high-voltage and empty requirements',()=>{
  assert.throws(()=>prepareStudioProject({prompt:'Operate a 230 VAC mains outlet with a relay.',parts:['cb-059']}),/low-voltage/);
  assert.throws(()=>prepareStudioProject({prompt:'short',parts:['cb-059']}),/at least 12/);
  assert.throws(()=>prepareStudioProject({prompt:'Build a complex quadcopter radio telemetry link',parts:['cb-059']}),/No reliable starter/);
});
test('guided examples reject incompatible controller, current sensor and network requests', () => {
  for (const part of ['cb-062','cb-063','cb-064','cb-081']) {
    assert.throws(() => prepareStudioProject({prompt:'Log sensor data to SD',parts:[part,'cb-077']}), /AI draft/);
  }
  assert.throws(() => prepareStudioProject({prompt:'Display the sensor data on a web dashboard',parts:['cb-059','cb-077']}), /AI draft/);
});
