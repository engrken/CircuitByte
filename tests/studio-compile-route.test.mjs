import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
let authenticated=true,quotaAllowed=true,quotaReads=0,builds=0;
mock.module('../lib/auth.js',{namedExports:{sameOrigin:()=>{},requireUser:async()=>{if(!authenticated)throw Error('Sign in required');return {id:'verified-test-member'};}}});
mock.module('../lib/studio-usage.mjs',{namedExports:{consumeStudentQuota:async()=>{quotaReads++;return {allowed:quotaAllowed,limit:50};}}});
const profiles={
 'arduino:avr:uno':{fqbn:'arduino:avr:uno'},
 'esp32:esp32:m5stack-core-esp32':{fqbn:'esp32:esp32:m5stack_core'}
};
mock.module('../lib/studio-compiler.mjs',{namedExports:{BOARD_PROFILES:profiles,compileStudioSketch:async({profile})=>{builds++;return {ok:true,stage:'compile',board:profile.fqbn,firmwareHex:'test-hex'};}}});
const {POST}=await import('../app/api/studio/compile/route.js');
const original=process.env.STUDIO_COMPILER_ENABLED;
after(()=>{if(original===undefined)delete process.env.STUDIO_COMPILER_ENABLED;else process.env.STUDIO_COMPILER_ENABLED=original;});
const request=(board='arduino:avr:uno')=>new Request('https://circuitbyte.vercel.app/api/studio/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({board,code:'void setup(){} void loop(){}'})});
test('Enabled compilation still requires a verified account',async()=>{
 process.env.STUDIO_COMPILER_ENABLED='true';authenticated=false;
 assert.equal((await POST(request())).status,403);assert.equal(builds,0);assert.equal(quotaReads,0);authenticated=true;
});
test('Inherited object keys cannot trigger billable compiler work',async()=>{
 for(const board of ['__proto__','constructor','unsupported'])assert.equal((await POST(request(board))).status,400);
 assert.equal(builds,0);assert.equal(quotaReads,0);
});
test('The monthly allowance remains enforced before sandbox creation',async()=>{
 quotaAllowed=false;assert.equal((await POST(request())).status,429);assert.equal(builds,0);quotaAllowed=true;
});
test('M5Core maps the saved Studio ID to the current ESP32 toolchain target',async()=>{
 const response=await POST(request('esp32:esp32:m5stack-core-esp32')),body=await response.json();
 assert.equal(response.status,200);assert.equal(body.board,'esp32:esp32:m5stack-core-esp32');assert.equal(body.fqbn,'esp32:esp32:m5stack_core');assert.equal(builds,1);
});
