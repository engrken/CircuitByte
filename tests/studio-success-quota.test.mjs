import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-15T12:00:00+08:00')});
const pg=new PGlite();
// A real transaction per client; serialize clients for PGlite's single connection.
let queue=Promise.resolve();
const query=(sql,args)=>pg.query(sql,args);
mock.module('../lib/db.js',{namedExports:{db:()=>({query,connect:async()=>{
 const previous=queue;let unlock;queue=new Promise(r=>unlock=r);await previous;
 return {query,release:unlock};
}})}});
const {reserveStudentQuota,settleStudentQuota,readStudentQuota}=await import('../lib/studio-usage.mjs');
after(()=>pg.close());
test('Successful builds alone count; reservations bound concurrency, expire and settle once',async()=>{
 await pg.exec('CREATE TABLE "user"(id text PRIMARY KEY); INSERT INTO "user" VALUES(\'a\'),(\'b\');');
 await pg.exec(await readFile(new URL('../scripts/studio-usage-schema.sql',import.meta.url),'utf8'));
 const reservations=await Promise.all(Array.from({length:51},()=>reserveStudentQuota('a','compile')));
 assert.equal(reservations.filter(r=>r.allowed).length,50);
 assert.equal((await readStudentQuota('a')).compile.used,0);
 await settleStudentQuota(reservations[0],false);
 assert.equal((await readStudentQuota('a')).compile.used,0);
 const replacement=await reserveStudentQuota('a','compile');assert.equal(replacement.allowed,true);
 assert.deepEqual(await Promise.all([settleStudentQuota(replacement,true),settleStudentQuota(replacement,true)]),[true,false]);
 assert.equal((await readStudentQuota('a')).compile.used,1);
 assert.equal((await readStudentQuota('b')).compile.used,0);
 await pg.exec("UPDATE studio_usage_reservations SET expires_at=now()-interval '1 second' WHERE status='pending'");
 assert.equal(await settleStudentQuota(reservations[1],true),false);
 assert.equal((await reserveStudentQuota('a','compile')).allowed,true);
 assert.equal((await readStudentQuota('a')).compile.used,1);
});
