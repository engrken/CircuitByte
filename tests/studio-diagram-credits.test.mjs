import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-15T12:00:00+08:00')});
let charged=0,settled=false,reserved=0;
mock.module('../lib/auth.js',{namedExports:{sameOrigin:()=>{},requireUser:async()=>({id:'test'})}});
mock.module('../lib/studio-usage.mjs',{namedExports:{reserveStudentQuota:async()=>{reserved++;settled=false;return {allowed:true};},settleStudentQuota:async(q,ok)=>{if(!settled){settled=true;if(ok)charged++;}return ok;}}});
const originalFetch=globalThis.fetch,originalEnabled=process.env.STUDIO_AI_ENABLED,originalKey=process.env.AI_GATEWAY_API_KEY;
after(()=>{globalThis.fetch=originalFetch;for(const [key,val] of Object.entries({STUDIO_AI_ENABLED:originalEnabled,AI_GATEWAY_API_KEY:originalKey}))if(val===undefined)delete process.env[key];else process.env[key]=val;});
process.env.STUDIO_AI_ENABLED='true';process.env.AI_GATEWAY_API_KEY='mock-only';
const {POST}=await import('../app/api/studio/diagram/route.js');
const request=()=>new Request('https://circuitbyte.vercel.app/api/studio/diagram',{method:'POST',body:JSON.stringify({board:'arduino:avr:uno',connections:[{pin:'D13',to:'LED through resistor',net:'LED',kind:'digital-output'}]})});
test('Screenshot wiring is rejected before reserving quota or contacting the image provider',async()=>{
 const before={charged,reserved};let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('must not run');};
 const response=await POST(new Request('https://circuitbyte.vercel.app/api/studio/diagram',{method:'POST',body:JSON.stringify({board:'esp32:esp32:esp32',connections:[{pin:'GPIO35',to:'ESP32 Dev Board CH340 - USB Type C',net:'CURRENT_SENSOR_PIN',kind:'conditional'},{pin:'ACS712_MODULE_VCC',to:'ACS712 Hall Effect Current Sensor Module 30A',net:'3.3V',kind:'conditional'}]})}));
 assert.equal(response.status,422);assert.equal(calls,0);assert.equal(charged,before.charged);assert.equal(reserved,before.reserved);
 assert.ok((await response.json()).findings.some(f=>f.code==='ACS712_SUPPLY'));
});
test('Provider rejection, invalid image and timeout never consume AI credits',async()=>{
 for(const fetcher of [async()=>new Response('',{status:403}),async()=>Response.json({choices:[]}),async()=>{throw Error('timeout');}]){
  globalThis.fetch=fetcher;const result=await POST(request());assert.ok(result.status>=500);assert.equal(charged,0);assert.equal(settled,true);
 }
});
test('A usable delivered illustration consumes exactly one AI credit',async()=>{
 const png=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
 globalThis.fetch=async()=>Response.json({choices:[{message:{images:[{image_url:{url:'data:image/png;base64,'+png.toString('base64')}}]}}]});
 const response=await POST(request());assert.equal(response.status,200);assert.match((await response.json()).image,/^data:image\/jpeg;base64,/);assert.equal(charged,1);
});
test('The default image-generation API delivers a real image and charges only once',async()=>{
 const before=charged;
 const png=await sharp({create:{width:4,height:4,channels:3,background:'green'}}).png().toBuffer();
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://ai-gateway.vercel.sh/v1/images/generations');
  assert.equal(JSON.parse(options.body).model,'bfl/flux-2-flex');
  return Response.json({data:[{b64_json:png.toString('base64')}]});
 };
 const response=await POST(request());assert.equal(response.status,200);
 const result=await response.json();assert.equal(result.model,'bfl/flux-2-flex');
 assert.equal((await sharp(Buffer.from(result.image.split(',')[1],'base64')).metadata()).format,'jpeg');
 assert.equal(charged,before+1);
});
