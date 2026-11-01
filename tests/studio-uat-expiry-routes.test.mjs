import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-12-01T00:00:00+08:00')});
let queries=0;
mock.module('../lib/auth.js',{namedExports:{sameOrigin:()=>{},requireUser:async()=>({id:'verified-member'})}});
mock.module('../lib/db.js',{namedExports:{db:()=>({query:async()=>{queries++;return {rows:[{id:'saved-project',title:'Retained project'}]};},connect:async()=>{throw Error('No writes should occur after expiry');}})}});
const compile=await import('../app/api/studio/compile/route.js');
const projects=await import('../app/api/studio/projects/route.js');
const request=path=>new Request('https://circuitbyte.vercel.app'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
test('Expired compile and new-project requests are denied before paid work or database writes',async()=>{
 for(const response of [await compile.POST(request('/api/studio/compile')),await projects.POST(request('/api/studio/projects'))]){
  assert.equal(response.status,403);assert.equal((await response.json()).code,'STUDIO_UAT_CLOSED');
 }
 assert.equal(queries,0);
});
test('Existing private projects can still be read after expiry',async()=>{
 const response=await projects.GET();assert.equal(response.status,200);assert.equal((await response.json()).projects[0].title,'Retained project');assert.equal(queries,1);
});
