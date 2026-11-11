import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {getMigrations} from 'better-auth/db/migration';

process.env.BETTER_AUTH_SECRET='test-only-secret-for-better-auth-12345678';
process.env.BETTER_AUTH_URL='https://circuitbyte.vercel.app';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-12-01T00:00:00+08:00')});
const pg=new PGlite();
const query=(sql,args)=>pg.query(sql,args);
const client={query,release(){}};
const pool={query,connect:async()=>client,end:async()=>{}};
mock.module('../lib/db.js',{namedExports:{db:()=>pool}});
const mail=[];
mock.module('../lib/studio-email.mjs',{namedExports:{gmailConfigured:()=>true,sendGmailMessage:async message=>mail.push(message)}});
const {auth,studioSignupEnabled}=await import('../lib/auth.js');
after(()=>pg.close());

test('Existing accounts are grandfathered and new accounts verify registration once after UAT closes',async()=>{
 const {runMigrations}=await getMigrations({database:pool,emailAndPassword:{enabled:true},rateLimit:{enabled:true,storage:'database'}});
 await runMigrations();
 const origin=process.env.BETTER_AUTH_URL;
 const post=(path,body)=>auth().handler(new Request(origin+'/api/auth'+path,{
  method:'POST',headers:{'content-type':'application/json',origin,'x-forwarded-for':'192.0.2.1'},body:JSON.stringify(body)
 }));
 const verifyMigration=await readFile(new URL('../scripts/account-verification.sql',import.meta.url),'utf8');
 const legacy={name:'Existing Buyer',email:'existing@example.org',password:'test-only-existing-password'};
 const member={name:'New Buyer',email:'new@example.org',password:'test-only-new-password'};
 assert.equal(studioSignupEnabled(),true);

 let response=await post('/sign-up/email',legacy);
 assert.equal(response.status,200,await response.clone().text());
 await pg.exec(verifyMigration);
 response=await post('/sign-in/email',{email:legacy.email,password:legacy.password});
 assert.equal(response.status,200,await response.clone().text());
 assert.equal((await response.json()).user.emailVerified,true);

 response=await post('/sign-up/email',member);
 assert.equal(response.status,200,await response.clone().text());
 assert.equal(response.headers.get('set-cookie'),null);
 assert.equal(mail.length,2);
 const otp=mail[1].body.match(/\b\d{6}\b/)[0];
 await pg.exec(verifyMigration);
 response=await post('/sign-in/email',{email:member.email,password:member.password});
 assert.equal(response.status,403,await response.clone().text());
 assert.equal(response.headers.get('set-cookie'),null);
 assert.equal((await post('/sign-in/email-otp',{email:member.email,otp})).status,404);
 response=await post('/email-otp/verify-email',{email:member.email,otp});
 assert.equal(response.status,200,await response.clone().text());
 response=await post('/sign-in/email',{email:member.email,password:member.password});
 assert.equal(response.status,200,await response.clone().text());
 assert.equal((await response.json()).user.emailVerified,true);
 assert.equal(mail.length,2);
});
