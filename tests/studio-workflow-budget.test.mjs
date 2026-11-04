import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reuseSuccessfulCompilation} from '../lib/studio-workflow.mjs';

test('A successful unchanged Studio compile can be reused without spending another Sandbox run',()=>{
 assert.equal(reuseSuccessfulCompilation({ok:true},'board|code|libs','board|code|libs'),true);
 assert.equal(reuseSuccessfulCompilation({ok:false},'board|code|libs','board|code|libs'),false);
 assert.equal(reuseSuccessfulCompilation({ok:true},'board|old','board|new'),false);
 assert.equal(reuseSuccessfulCompilation(null,'board|code','board|code'),false);
 assert.equal(reuseSuccessfulCompilation({ok:true},'','board|code'),false);
});
test('The reuse guard occurs before requesting cloud compilation',()=>{
 const source=readFileSync(new URL('../app/studio/workspace.jsx',import.meta.url),'utf8');
 const start=source.indexOf('async function runCompile()');
 const end=source.indexOf('async function repairSketch()',start);
 const operation=source.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.ok(operation.indexOf('reuseSuccessfulCompilation(compile,compiledKey,buildKey)')>=0);
 assert.ok(operation.indexOf('reuseSuccessfulCompilation')<operation.indexOf("studioRequest('/api/studio/compile'"));
 assert.match(operation,/no new Sandbox run or build credit was used/);
});
