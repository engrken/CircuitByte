import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-15T12:00:00+08:00')});
const pg=new PGlite();let connects=0;
// Each quota change is a single atomic INSERT/UPDATE. PGlite serializes these SQL statements.
const query=(sql,args)=>['BEGIN','COMMIT','ROLLBACK'].includes(sql)?Promise.resolve({rows:[]}):pg.query(sql,args);
mock.module('../lib/db.js',{namedExports:{db:()=>({query,connect:async()=>{connects++;return {query,release(){}};}})}});
const {consumeStudentQuota,readStudentQuota}=await import('../lib/studio-usage.mjs');
after(()=>pg.close());
test('Atomic quota updates stop at 30 AI drafts and 50 builds, with isolated member counters',async()=>{
 await pg.exec('CREATE TABLE "user"(id text PRIMARY KEY); INSERT INTO "user" VALUES(\'member-a\'),(\'member-b\');');
 await pg.exec(await readFile(new URL('../scripts/studio-usage-schema.sql',import.meta.url),'utf8'));
 const ai=await Promise.all(Array.from({length:31},()=>consumeStudentQuota('member-a','ai')));
 assert.equal(ai.filter(result=>result.allowed).length,30);
 const builds=await Promise.all(Array.from({length:51},()=>consumeStudentQuota('member-a','compile')));
 assert.equal(builds.filter(result=>result.allowed).length,50);
 const usage=await readStudentQuota('member-a');assert.equal(usage.ai.remaining,0);assert.equal(usage.compile.used,50);assert.equal(usage.timeZone,'Asia/Manila');
 assert.equal((await readStudentQuota('member-b')).ai.remaining,30);
});
test('After the deadline no quota is consumed, no connection is acquired, and existing usage is retained',async()=>{
 mock.timers.setTime(Date.parse('2026-12-01T00:00:00+08:00'));
 const before=connects;
 await assert.rejects(consumeStudentQuota('member-a','ai'),error=>error.code==='STUDIO_UAT_CLOSED');
 assert.equal(connects,before);
 const {rows}=await query("SELECT used FROM studio_usage_monthly WHERE user_id='member-a' AND operation='ai' AND period='2026-11'");
 assert.equal(rows[0].used,30);
});
