import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-15T12:00:00+08:00')});
let charged=0,settled=false;
mock.module('../lib/auth.js',{namedExports:{sameOrigin:()=>{},requireUser:async()=>({id:'test'})}});
mock.module('../lib/studio-usage.mjs',{namedExports:{reserveStudentQuota:async()=>{settled=false;return {allowed:true};},settleStudentQuota:async(q,ok)=>{if(!settled){settled=true;if(ok)charged++;}return ok;}}});
const originalFetch=globalThis.fetch,originalEnabled=process.env.STUDIO_AI_ENABLED,originalKey=process.env.AI_GATEWAY_API_KEY;
after(()=>{globalThis.fetch=originalFetch;for(const [key,val] of Object.entries({STUDIO_AI_ENABLED:originalEnabled,AI_GATEWAY_API_KEY:originalKey}))if(val===undefined)delete process.env[key];else process.env[key]=val;});
process.env.STUDIO_AI_ENABLED='true';process.env.AI_GATEWAY_API_KEY='mock-only';
const {POST}=await import('../app/api/studio/diagram/route.js');
const request=()=>new Request('https://circuitbyte.vercel.app/api/studio/diagram',{method:'POST',body:JSON.stringify({board:'arduino:avr:uno',connections:[{pin:'D13',to:'LED through resistor',net:'LED',kind:'digital-output'}]})});
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
