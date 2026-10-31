import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
let connection;
mock.module('../lib/db.js',{namedExports:{db:()=>({connect:async()=>{
 if(connection instanceof Error)throw connection;
 return connection;
}})}});
mock.module('../lib/auth.js',{namedExports:{requireUser:async()=>({id:'test-member'}),sameOrigin:()=>{}}});
const {POST}=await import('../app/api/studio/projects/route.js');
const request=()=>new Request('https://circuitbyte.vercel.app/api/studio/projects',{
 method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({title:'Test sketch',code:'void setup(){} void loop(){}',parts:['cb-059'],board:'arduino:avr:uno'})
});
test('Saving a project returns a controlled retry response if the connection fails',async()=>{
 connection=new Error('connection unavailable');
 const response=await POST(request());
 assert.equal(response.status,503);
 assert.match((await response.json()).error,/retry/i);
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('Saving a project handles a failed rollback and always releases the connection',async()=>{
 let released=false;
 connection={query:async()=>{throw Error('connection lost');},release:()=>{released=true;}};
 const response=await POST(request());
 assert.equal(response.status,503);
 assert.equal(released,true);
});
