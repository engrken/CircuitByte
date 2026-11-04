import test from 'node:test';
import assert from 'node:assert/strict';
import {validCopilotRequest,validCopilotOutput,MAX_BODY_BYTES} from '../guards.mjs';
const good=()=>({token:'gho_sample_123',messages:[{role:'system',content:'Use safe output.'},{role:'user',content:'Blink a led.'}]});
test('accepts supported OAuth user tokens for two-role requests',()=>{
 assert.equal(validCopilotRequest(good()),true);
 assert.equal(validCopilotRequest({...good(),token:'ghu_sample_123'}),true);
});
test('rejects arbitrary tokens and unsafe or oversized payloads',()=>{
 assert.equal(validCopilotRequest({...good(),token:'github_pat_example'}),false);
 assert.equal(validCopilotRequest({...good(),token:''}),false);
 assert.equal(validCopilotRequest({...good(),messages:[{role:'user',content:'one'}]}),false);
 assert.equal(validCopilotRequest({...good(),messages:[{role:'system',content:''},{role:'user',content:'x'}]}),false);
 assert.equal(validCopilotRequest({...good(),messages:[{role:'system',content:'a'},{role:'user',content:'x'.repeat(30001)}]}),false);
 assert.equal(validCopilotRequest(null),false);
 assert.equal(validCopilotRequest([]),false);
});
test('validates content size and nonempty completions',()=>{
 assert.equal(validCopilotOutput('ok'),true);
 assert.equal(validCopilotOutput(''),false);
 assert.equal(validCopilotOutput('x'.repeat(50001)),false);
 assert.equal(MAX_BODY_BYTES,80000);
});
