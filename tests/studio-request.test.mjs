import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {studioRequest} from '../lib/studio-request.mjs';
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
