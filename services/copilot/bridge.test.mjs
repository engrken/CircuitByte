import test from 'node:test';
import assert from 'node:assert/strict';
import {createBridgeServer,validCompletionInput} from './bridge.mjs';
const SECRET='0123456789abcdef0123456789abcdef';
const TOKEN='gho_test_authorized_user';
const messages=[{role:'system',content:'A teacher'},{role:'user',content:'Explain the sensor'}];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function withServer(complete,fn){
 const server=createBridgeServer({secret:SECRET,complete});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{await fn(base);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
async function call(base,path,body,{secret=SECRET,method='POST',headers={}}={}){
 return fetch(base+path,{method,headers:{Authorization:'Bearer '+secret,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
}

test('validates per-user token, exactly two roles and non-empty bounded content',()=>{
 assert.equal(validCompletionInput({token:TOKEN,messages}),true);
 for(const body of [null,[],{token:'ghp_wrong',messages},{token:TOKEN,messages:[]},{token:TOKEN,messages:[messages[1],messages[0]]},{token:TOKEN,messages:[{role:'system',content:''},messages[1]]},{token:TOKEN,messages:[messages[0],{role:'user',content:'x'.repeat(30001)}]}])assert.equal(validCompletionInput(body),false);
});
test('requires strong service secret and completion handler',()=>{
 assert.throws(()=>createBridgeServer({secret:'short',complete:async()=>''}),/32/);
 assert.throws(()=>createBridgeServer({secret:SECRET}),/handler/);
});
test('public healthz reveals no secret; protected health and inference require auth',async()=>{
 await withServer(async()=>'{"ok":true}',async base=>{
  const health=await fetch(base+'/healthz');assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{ready:true});
  const status=await fetch(base+'/health');assert.equal(status.status,401);
  const unauthorized=await call(base,'/completion',{token:TOKEN,messages},{secret:'wrong'});assert.equal(unauthorized.status,401);
  const protectedHealth=await call(base,'/health',undefined,{method:'GET'});assert.equal(protectedHealth.status,200);
  assert.equal((await call(base,'/else',undefined,{method:'GET'})).status,404);
 });
});
test('accepts valid request and protects response from caches',async()=>{
 await withServer(async({token,messages:input})=>{assert.equal(token,TOKEN);assert.deepEqual(input,messages);return '{"title":"Blink"}';},async base=>{
  const r=await call(base,'/completion',{token:TOKEN,messages});assert.equal(r.status,200);
  assert.equal(r.headers.get('cache-control'),'no-store');
  assert.deepEqual(await r.json(),{content:'{"title":"Blink"}'});
 });
});
test('rejects malformed inputs and oversized uploads before calling SDK',async()=>{
 let invoked=0;
 await withServer(async()=>{invoked++;return 'unused';},async base=>{
  assert.equal((await call(base,'/completion',{},{})).status,400);
  assert.equal((await call(base,'/completion',{token:TOKEN,messages},{headers:{'Content-Type':'text/plain'}})).status,415);
  assert.equal((await call(base,'/completion',{token:TOKEN,messages:[messages[0],{role:'user',content:'y'.repeat(90000)}]})).status,413);
  assert.equal((await fetch(base+'/completion',{method:'POST',headers:{Authorization:'Bearer '+SECRET,'Content-Type':'application/json'},body:'not-json'})).status,400);
 });assert.equal(invoked,0);
});
test('limits concurrent completions, and serializes one user token',async()=>{
 let release;
 const blocker=new Promise(resolve=>{release=resolve;});
 await withServer(async()=>{await blocker;return 'done';},async base=>{
  const one=call(base,'/completion',{token:TOKEN,messages});
  await delay(75);
  const same=await call(base,'/completion',{token:TOKEN,messages});assert.equal(same.status,429);
  const two=call(base,'/completion',{token:'ghu_other_user',messages});
  await delay(50);
  const full=await call(base,'/completion',{token:'gho_third_user',messages});assert.equal(full.status,429);
  release();assert.equal((await one).status,200);assert.equal((await two).status,200);
 });
});
test('failure responses do not expose internal exceptions',async()=>{
 await withServer(async()=>{throw Error('private runtime details');},async base=>{
  const r=await call(base,'/completion',{token:TOKEN,messages});assert.equal(r.status,503);
  assert.ok(!(await r.text()).includes('private runtime details'));
 });
});
