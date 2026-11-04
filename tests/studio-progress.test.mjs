import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStudioProgressResponse} from '../lib/studio-progress.mjs';

async function events(response){
 assert.match(response.headers.get('content-type'),/application\/x-ndjson/);
 const text=await response.text();return text.trim().split('\n').map(row=>JSON.parse(row));
}
test('progress stream never sends unvalidated code and emits one verified result',async()=>{
 const response=createStudioProgressResponse(async()=>Response.json({code:'void setup() {} void loop() {}',wires:[['D2','LED']]}));
 const messages=await events(response);
 assert.equal(messages[0].type,'status');
 assert.equal(messages.at(-1).type,'complete');
 assert.equal(messages.at(-1).result.code,'void setup() {} void loop() {}');
 assert.equal(messages.filter(e=>e.type==='complete').length,1);
 assert.ok(messages.filter(e=>e.type==='status').every(e=>!JSON.stringify(e).includes('void setup')));
});
test('provider and validation errors never appear as completed drafts',async()=>{
 const result=await events(createStudioProgressResponse(async()=>Response.json({error:'Sketch failed validation'},{status:422})));
 assert.equal(result.at(-1).type,'error');assert.equal(result.at(-1).status,422);
 assert.equal(result.filter(x=>x.type==='complete').length,0);
});
test('malformed AI response and thrown handler produce error without code',async()=>{
 for(const run of [async()=>new Response('<html />'),async()=>{throw Error('private token text');}]){
  const result=await events(createStudioProgressResponse(run));
  assert.equal(result.at(-1).type,'error');
  assert.doesNotMatch(JSON.stringify(result),/private token text/);
 }
});
test('client cancellation aborts the wrapped request',async()=>{
 let canceled=false;
 const stream=createStudioProgressResponse(()=>new Promise(()=>{}),{onCancel:()=>{canceled=true;}});
 const reader=stream.body.getReader();
 const first=await reader.read();assert.equal(first.done,false);
 await reader.cancel();
 assert.equal(canceled,true);
});
