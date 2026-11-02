import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
const old={ai:process.env.STUDIO_AI_ENABLED,key:process.env.AI_GATEWAY_API_KEY};
process.env.STUDIO_AI_ENABLED='true';
process.env.AI_GATEWAY_API_KEY='TEST_ONLY_GATEWAY_KEY';
let used=0,requests=0,lastPayload;
mock.module('../lib/auth.js',{namedExports:{requireUser:async()=>({id:'test-user',email:'test@example.org'}),sameOrigin:request=>{if(request.headers.get('origin')!==new URL(request.url).origin)throw Error('Cross-origin');}}});
mock.module('../lib/studio-usage.mjs',{namedExports:{consumeStudentQuota:async()=>{used++;return {allowed:true,limit:30,used};}}});
mock.module('../lib/studio-knowledge-store.mjs',{namedExports:{readReviewedKnowledge:async()=>[]}});
const {POST}=await import('../app/api/studio/ai/route.js');
const code='void setup(){Serial.begin(9600);} void loop(){Serial.println("hello");delay(1000);}';
const compile='CircuitByteSketch.ino:1: error: expected semicolon before delay';
const request=body=>new Request('https://circuitbyte.vercel.app/api/studio/ai',{method:'POST',headers:{Origin:'https://circuitbyte.vercel.app','Content-Type':'application/json'},body:JSON.stringify({board:'arduino:avr:uno',parts:['cb-059','cb-074'],prompt:'Read sensor and show results over Serial every second.',...body})});
const mocked=mock.method(globalThis,'fetch',async (_url,options)=>{
 requests++;lastPayload=JSON.parse(options.body);
 return Response.json({choices:[{message:{content:JSON.stringify({title:'Serial test repair',summary:'Simple serial output',code,wires:[],netlist:[],warnings:[]})}}]});
});
after(()=>{
 mocked.mock.restore();
 if(old.ai===undefined)delete process.env.STUDIO_AI_ENABLED;else process.env.STUDIO_AI_ENABLED=old.ai;
 if(old.key===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=old.key;
});
test('AI repair receives bounded sketch diagnostics, preserves validated output and consumes one quota',async()=>{
 const response=await POST(request({repairCode:code,compilerFeedback:compile}));
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.code,code);assert.ok(result.warnings.some(s=>s.includes('recompile')));
 assert.equal(used,1);assert.equal(requests,1);
 const context=JSON.parse(lastPayload.messages[1].content).repairAttempt;
 assert.equal(context.currentSketch,code);assert.equal(context.compilerDiagnostics,compile);
});
test('Potential credentials block repair before quota consumption or provider request',async()=>{
 const bad='void setup(){const char* ssid="private-network";} void loop(){Serial.println("hi");}';
 const response=await POST(request({repairCode:bad,compilerFeedback:compile}));
 assert.equal(response.status,400);
 assert.equal(used,1);assert.equal(requests,1);
});
test('Normal Studio AI generation remains backwards-compatible with no repair payload',async()=>{
 const response=await POST(request({}));
 assert.equal(response.status,200);
 assert.equal(used,2);assert.equal(requests,2);
 const userContext=JSON.parse(lastPayload.messages[1].content);
 assert.equal(userContext.repairAttempt,undefined);
});
