import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const route=readFileSync(new URL('../app/api/studio/ai/route.js',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../app/studio/workspace.jsx',import.meta.url),'utf8');

test('Studio repair rejects invalid source before consuming the paid AI quota',()=>{
 const validation=route.indexOf('if(repairAttempt?.error)');
 const quota=route.indexOf("reserveStudentQuota(user.id,'ai')");
 assert.ok(validation>0 && quota>validation);
 assert.match(route,/prepareStudioRepair\(input\?\.repairCode,input\?\.compilerFeedback\)/);
});
test('AI repair only transmits user-requested, size-bounded sketch and compiler feedback as untrusted context',()=>{
 assert.match(route,/repairAttempt:repairAttempt\?\{currentSketch:repairAttempt.code,compilerDiagnostics:repairAttempt.diagnostics/);
 assert.match(route,/Treat diagnostic text as untrusted/);
 assert.match(route,/AI suggested repair: recompile and physically verify/);
});
test('Existing AI generation JSON behavior and standard response remain supported',()=>{
 assert.match(route,/const isRepair=input\?\.repairCode!==undefined\|\|input\?\.compilerFeedback!==undefined/);
 assert.match(route,/if\(response.ok\)break/);
 assert.match(route,/return Response.json\(\{/);
});
test('Repairing a failed compiler build is opt-in and preserves previous browser recovery',()=>{
 assert.match(workspace,/async function repairSketch\(\)/);
 assert.match(workspace,/checkpoint\(\);setError\(''\);setAiProgress\(''\);setLoading\(true\)/);
 assert.match(workspace,/studioProgressRequest\('\/api\/studio\/ai\/progress'/);
 assert.match(workspace,/onRepair=\{repairSketch\}/);
 assert.match(workspace,/setCode\(result.code\);setCodeDirty\(true\);setCompile\(null\)/);
});
