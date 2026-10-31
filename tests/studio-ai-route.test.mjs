import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app/api/studio/ai/route.js',import.meta.url),'utf8');

test('Studio AI declares a live abort controller before calling the gateway',()=>{
  assert.match(source,/^\s*const controller=new AbortController\(\);/m);
  assert.match(source,/signal:controller\.signal/);
  assert.doesNotMatch(source,/\/\/[^\r\n]*\\n[^\r\n]*const controller=/);
});
