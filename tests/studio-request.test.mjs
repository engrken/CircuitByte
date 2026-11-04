import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {studioRequest,studioProgressRequest} from '../lib/studio-request.mjs';
test('Studio requests preserve service validation errors and handle non-JSON responses',async()=>{
 const fetch=mock.method(globalThis,'fetch',async()=>Response.json({error:'Monthly limit reached'},{status:429}));
 try{
  await assert.rejects(studioRequest('/api/studio/ai',{}),/Monthly limit reached/);
  fetch.mock.mockImplementation(async()=>new Response('<html>unavailable</html>',{status:502}));
  await assert.rejects(studioRequest('/api/studio/ai',{}),/unreadable response/);
 }finally{fetch.mock.restore();}
});
test('A stalled operation is aborted and releases the busy-state error path',async()=>{
 const fetch=mock.method(globalThis,'fetch',async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true})));
 try{await assert.rejects(studioRequest('/api/studio/compile',{}, {timeoutMs:5}),/timed out/);}
 finally{fetch.mock.restore();}
});

function ndjsonReply(chunks){
 const encoder=new TextEncoder();
 const body=new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(encoder.encode(chunk));controller.close();}});
 return new Response(body,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8'}});
}
test('Progressive Studio generation handles split frames and returns only validated complete draft',async()=>{
 const messages=[];
 const fetch=mock.method(globalThis,'fetch',async()=>ndjsonReply([
  '{"type":"status","message":"Checking materials"}\\n'.replace('\\n','\n').slice(0,21),
  '{"type":"status","message":"Checking materials"}\n'.slice(21),
  '{"type":"complete","result":{"code":"void setup() {} void loop() {}","wires":[]}}\n'
 ]));
 try{
  const result=await studioProgressRequest('/api/studio/ai/progress',{prompt:'blink LED'},{onProgress:msg=>messages.push(msg)});
  assert.deepEqual(messages,['Checking materials']);
  assert.match(result.code,/void setup/);
  assert.deepEqual(result.wires,[]);
 }finally{fetch.mock.restore();}
});
test('Progressive Studio generation rejects provider errors, malformed output and truncated streams',async()=>{
 const fetch=mock.method(globalThis,'fetch',async()=>ndjsonReply(['{"type":"error","status":422,"error":"Invalid GPIO"}\n']));
 try{
  await assert.rejects(studioProgressRequest('/api/studio/ai/progress',{}),/Invalid GPIO/);
  fetch.mock.mockImplementation(async()=>ndjsonReply(['{"type":"complete","result":{"code":32}}\n']));
  await assert.rejects(studioProgressRequest('/api/studio/ai/progress',{}),/valid sketch/);
  fetch.mock.mockImplementation(async()=>ndjsonReply(['{"type":"status","message":"Waiting"}\n']));
  await assert.rejects(studioProgressRequest('/api/studio/ai/progress',{}),/without a verified draft/);
  fetch.mock.mockImplementation(async()=>new Response('Not found',{status:404}));
  await assert.rejects(studioProgressRequest('/api/studio/ai/progress',{}),/streaming service is unavailable/);
 }finally{fetch.mock.restore();}
});
test('Progressive Studio generation aborts a stalled request without returning incomplete hardware advice',async()=>{
 const fetch=mock.method(globalThis,'fetch',async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true})));
 try{await assert.rejects(studioProgressRequest('/api/studio/ai/progress',{}, {timeoutMs:5}),/timed out/);}
 finally{fetch.mock.restore();}
});
