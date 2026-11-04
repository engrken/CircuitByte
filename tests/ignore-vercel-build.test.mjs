import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mayIgnoreChange,maySkipBuild} from '../scripts/ci/ignore-vercel-build.mjs';

test('Only nondeployable documentation, CI, or retired service changes can skip Vercel',()=>{
  assert.equal(maySkipBuild(['README.md','docs/production-runbook.md']),true);
  assert.equal(maySkipBuild(['.circleci/config.yml','services/copilot/server.mjs']),true);
  assert.equal(maySkipBuild(['.github/ISSUE_TEMPLATE/bug.yml']),true);
});
test('Source, public assets, environment and config changes must deploy',()=>{
  for(const file of ['app/studio/page.js','public/education/code/blink.ino','package.json','vercel.json','scripts/ci/ignore-vercel-build.mjs','lib/studio-usage.mjs','docs/how-to.md/../app.js']){
    assert.equal(mayIgnoreChange(file),false,file);
    assert.equal(maySkipBuild(['README.md',file]),false,file);
  }
});
test('Unknown or empty git diff must build instead of skipping',()=>{
  assert.equal(maySkipBuild(null),false);
  assert.equal(maySkipBuild([]),false);
});
