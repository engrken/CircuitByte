import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
let signedIn=false,ledgerDown=false,reads=0;
mock.module('../lib/auth.js',{namedExports:{requireUser:async()=>{if(!signedIn)throw Error('Sign in required');return {id:'private-member-id',email:'private@example.org'};}}});
mock.module('../lib/studio-usage.mjs',{namedExports:{readStudentQuota:async()=>{
 reads++;if(ledgerDown)throw Error('Ledger offline');return {period:'2026-11',ai:{used:3,limit:30,remaining:27},compile:{used:2,limit:50,remaining:48}};
}}});
const original={ai:process.env.STUDIO_AI_ENABLED,compiler:process.env.STUDIO_COMPILER_ENABLED,key:process.env.AI_GATEWAY_API_KEY};
after(()=>{for(const [key,value] of Object.entries({STUDIO_AI_ENABLED:original.ai,STUDIO_COMPILER_ENABLED:original.compiler,AI_GATEWAY_API_KEY:original.key})){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
const {GET}=await import('../app/api/studio/capabilities/route.js');
test('Public availability does not leak member data or read the private ledger',async()=>{
 process.env.STUDIO_AI_ENABLED='true';process.env.STUDIO_COMPILER_ENABLED='true';process.env.AI_GATEWAY_API_KEY='test-only-key';
 const response=await GET(),body=await response.json();
 assert.equal(body.authenticated,false);assert.equal(body.usage,null);assert.equal(reads,0);
 assert.equal(body.aiEnabled,true);assert.deepEqual(body.compileBoards,['arduino:avr:uno']);
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.doesNotMatch(JSON.stringify(body),/test-only-key|private-member|private@example/);
});
test('Verified members see remaining allowance without consuming it',async()=>{
 signedIn=true;
 const body=await (await GET()).json();assert.equal(body.authenticated,true);assert.equal(body.usage.ai.remaining,27);assert.equal(reads,1);
});
test('A ledger outage and disabled service stay explicit',async()=>{
 ledgerDown=true;process.env.STUDIO_AI_ENABLED='false';process.env.STUDIO_COMPILER_ENABLED='false';
 const body=await (await GET()).json();assert.equal(body.usage,null);assert.equal(body.aiEnabled,false);assert.equal(body.compilerEnabled,false);
});
