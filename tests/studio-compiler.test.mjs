import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_PROFILES,compileStudioSketch} from '../lib/studio-compiler.mjs';
import {resolveStudioLibraries} from '../lib/studio-libraries.mjs';
function fakeSandbox({failedStage,failArtifact=false}={}){
 const events=[];let offline=false;
 const sandbox={
  async runCommand({cmd,args}){
   const stage=cmd==='bash'?'toolchain':args[0]==='lib'?'libraries':cmd==='python3'?'library-import':'compile';
   events.push({stage,cmd,args});
   if(stage==='compile'||stage==='library-import')assert.equal(offline,true,'User code must only run after network isolation');
   return {exitCode:stage===failedStage?1:0,stdout:async()=>stage===failedStage?'Compiler diagnostic':'Build complete',stderr:async()=>''};
  },
  async update(policy){assert.equal(policy.networkPolicy,'deny-all');offline=true;events.push({stage:'deny-network'});},
  async mkDir(path){assert.match(path,/^\/vercel\/sandbox\//);},
  async writeFiles(files){assert.equal(offline,true);for(const file of files)assert.match(file.path,/^\/vercel\/sandbox\//);},
  async readFileToBuffer({path}){assert.match(path,/^\/vercel\/sandbox\/build\//);if(failArtifact)throw Error('Artifact unavailable');return Buffer.from(path.endsWith('.hex')?'test-hex':'test-binary');},
  async stop(){events.push({stage:'stop'});}
 };
 return {sandbox,events};
}
const dependencies={packages:[],details:[]};
test('Compiler isolates every board before writing code and returns the matching artifact',async()=>{
 for(const profile of Object.values(BOARD_PROFILES)){
  const {sandbox,events}=fakeSandbox();
  const result=await compileStudioSketch({profile,code:'void setup(){} void loop(){}',dependencies,createSandbox:async options=>{assert.equal(options.persistent,false);assert.equal(options.timeout,240000);return sandbox;}});
  assert.equal(result.ok,true);assert.equal(result.board,profile.fqbn);
  assert.equal(Boolean(result.firmwareHex),profile.core==='arduino:avr');
  assert.equal(Boolean(result.firmwareBin),profile.core!=='arduino:avr');
  assert.equal(events.at(-1).stage,'stop');
  if(profile.version)assert.ok(events[0].args[1].includes(profile.core+'@'+profile.version));
 }
});
test('Toolchain, library and artifact failures always stop the sandbox',async()=>{
 for(const options of [{failedStage:'toolchain'},{failedStage:'libraries'},{failArtifact:true}]){
  const {sandbox,events}=fakeSandbox(options);
  const result=await compileStudioSketch({profile:BOARD_PROFILES['arduino:avr:uno'],code:'void setup(){} void loop(){}',dependencies:{packages:['DHT sensor library'],details:[]},createSandbox:async()=>sandbox});
  assert.equal(result.ok,false);assert.equal(events.at(-1).stage,'stop');
  assert.equal(events.some(event=>event.stage==='compile'),Boolean(options.failArtifact));
 }
});
test('ESP core headers and SD are resolved without installing the AVR-only replacement',()=>{
 for(const board of ['esp32:esp32:esp32','esp32:esp32:m5stack-core-esp32']){
  const result=resolveStudioLibraries({board,parts:['cb-077'],code:'#include <WiFi.h>\n#include <WebServer.h>\n#include <Preferences.h>\n#include <SD.h>'});
  assert.deepEqual(result.unknownIncludes,[]);assert.equal(result.packages.includes('SD'),false);
 }
 const result=resolveStudioLibraries({board:'esp8266:esp8266:nodemcuv2',code:'#include <ESP8266WiFi.h>\n#include <ESP8266WebServer.h>'});
 assert.deepEqual(result.unknownIncludes,[]);
 assert.ok(resolveStudioLibraries({code:'#include <M5Unified.h>'}).packages.includes('M5Unified'));
});
