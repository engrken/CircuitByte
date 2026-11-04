import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const unoScript=new URL('../scripts/ci/uno-affected.sh',import.meta.url).pathname;
const ignoreScript=new URL('../scripts/ci/ignore-vercel-build.mjs',import.meta.url).pathname;
function git(cwd,...args){const r=spawnSync('git',args,{cwd,encoding:'utf8'});assert.equal(r.status,0,'git '+args.join(' ')+' '+r.stderr);return r.stdout;}
function check(cmd,args,cwd){return spawnSync(cmd,args,{cwd,encoding:'utf8'});}
test('Vercel deploys main but suppresses unrequested previews; only ignored changes skip a build',()=>{
 assert.equal(vercel.git.deploymentEnabled.main,true);
 assert.equal(vercel.git.deploymentEnabled['**'],false);
 assert.equal(vercel.ignoreCommand,'node scripts/ci/ignore-vercel-build.mjs');
});
test('Git impact checks fail safe for unknown history, skip docs, and compile changed Arduino sketches',()=>{
 const dir=mkdtempSync(join(tmpdir(),'circuitbyte-ci-'));
 try{
  git(dir,'init','-q');git(dir,'config','user.name','CI Tester');git(dir,'config','user.email','ci@example.invalid');
  writeFileSync(join(dir,'app.js'),'initial');git(dir,'add','.');git(dir,'commit','-qm','baseline');
  assert.equal(check('node',[ignoreScript],dir).status,1,'root commit must build');
  assert.equal(check('bash',[unoScript],dir).status,0,'root commit must test');
  mkdirSync(join(dir,'docs'));writeFileSync(join(dir,'docs/readme.md'),'docs');git(dir,'add','.');git(dir,'commit','-qm','docs');
  assert.equal(check('node',[ignoreScript],dir).status,0,'docs-only commit should skip build');
  assert.equal(check('bash',[unoScript],dir).status,1,'docs-only commit should skip Arduino downloads');
  mkdirSync(join(dir,'public/education/code'),{recursive:true});
  writeFileSync(join(dir,'public/education/code/led.ino'),'void setup(){} void loop(){}');
  git(dir,'add','.');git(dir,'commit','-qm','arduino-sketch');
  assert.equal(check('node',[ignoreScript],dir).status,1,'sketch change must build');
  assert.equal(check('bash',[unoScript],dir).status,0,'sketch change must invoke Arduino check');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
