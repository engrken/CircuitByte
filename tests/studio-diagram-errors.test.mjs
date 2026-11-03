import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diagramProviderFailure} from '../lib/studio-diagram-errors.mjs';
test('Gateway failures classify account verification without exposing upstream data',async()=>{
 const result=await diagramProviderFailure(Response.json({error:{type:'customer_verification_required',message:'private provider detail',url:'https://private.invalid'}},{status:403}));
 assert.equal(result.code,'IMAGE_ACCESS_DENIED');assert.equal(result.providerCode,'customer_verification_required');
 assert.match(result.error,/requires verification/);assert.doesNotMatch(JSON.stringify(result),/private/);
});
test('Unrecognized provider errors and HTML bodies remain safe',async()=>{
 for(const response of [Response.json({error:{code:'secret-key-like-value',message:'private'}},{status:403}),new Response('<html>private</html>',{status:502})]){
  const result=await diagramProviderFailure(response);assert.equal(result.providerCode,'unclassified');
  assert.doesNotMatch(JSON.stringify(result),/private|secret-key/);assert.match(result.error,/No AI credit was deducted/);
 }
});
