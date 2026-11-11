import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {getMigrations} from 'better-auth/db/migration';
import {adminOtpSchema,requireAdminOtpEnrollment} from '../lib/admin-otp.mjs';

process.env.BETTER_AUTH_SECRET='test-only-secret-for-better-auth-12345678';
process.env.BETTER_AUTH_URL='https://circuitbyte.vercel.app';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-12-01T00:00:00+08:00')});
const pg=new PGlite();
const query=(sql,args)=>pg.query(sql,args);
const client={query,release(){}};
const pool={query,connect:async()=>client,end:async()=>{}};
mock.module('../lib/db.js',{namedExports:{db:()=>pool}});
let currentHeaders=new Headers();
mock.module('next/headers.js',{namedExports:{headers:async()=>currentHeaders}});
const mail=[];
let mailUnavailable=false;
mock.module('../lib/studio-email.mjs',{namedExports:{gmailConfigured:()=>true,sendGmailMessage:async message=>{if(mailUnavailable)throw Error('Fixture mail outage');mail.push(message);}}});
const {auth,requireUser,studioSignupEnabled}=await import('../lib/auth.js');
after(()=>pg.close());

test('Legacy accounts stay active and new accounts sign in to a pending dashboard until verified',async()=>{
 const {runMigrations}=await getMigrations(adminOtpSchema(pool));
 await runMigrations();
 const post=browser('192.0.2.1'),legacyBrowser=browser('192.0.2.8'),guest=browser('192.0.2.9');
 const verifyMigration=await readFile(new URL('../scripts/account-verification.sql',import.meta.url),'utf8');
 const legacy={name:'Existing Buyer',email:'existing@example.org',password:'test-only-existing-password'};
 const member={name:'New Buyer',email:'new@example.org',password:'test-only-new-password'};
 assert.equal(studioSignupEnabled(),true);

 let response=await legacyBrowser('/sign-up/email',legacy);
 assert.equal(response.status,200,await response.clone().text());
 await pg.exec(verifyMigration);
 response=await legacyBrowser('/sign-in/email',{email:legacy.email,password:legacy.password});
 assert.equal(response.status,200,await response.clone().text());
 assert.equal((await response.json()).user.emailVerified,true);

 response=await post('/sign-up/email',member);
 assert.equal(response.status,200,await response.clone().text());
 assert.equal(response.headers.get('set-cookie'),null);
 assert.equal(mail.length,0);
 await pg.exec(verifyMigration);
 response=await post('/sign-in/email',{email:member.email,password:member.password});
 assert.equal(response.status,200,await response.clone().text());
 assert.equal((await (await post('/get-session')).json()).user.emailVerified,false);
 await assert.rejects(requireUser(),/Verify your email/);
 const {GET:libraries}=await import('../app/api/studio/libraries/route.js');
 const lookup=new Request(process.env.BETTER_AUTH_URL+'/api/studio/libraries');
 assert.equal((await libraries(lookup)).status,401);
 const send={email:member.email,type:'email-verification'};
 assert.equal((await guest('/email-otp/send-verification-otp',send)).status,401);
 assert.equal((await legacyBrowser('/email-otp/send-verification-otp',send)).status,403);
 response=await post('/email-otp/send-verification-otp',send);
 assert.equal(response.status,200,await response.clone().text());
 assert.equal(mail.length,1);
 const otp=mail.at(-1).body.match(/\b\d{6}\b/)[0];
 assert.equal((await post('/sign-in/email-otp',{email:member.email,otp})).status,404);
 assert.equal((await guest('/email-otp/verify-email',{email:member.email,otp})).status,401);
 response=await post('/email-otp/verify-email',{email:member.email,otp});
 assert.equal(response.status,200,await response.clone().text());
 assert.equal((await (await post('/get-session')).json()).user.emailVerified,true);
 assert.equal((await requireUser()).email,member.email);
 assert.equal((await libraries(lookup)).status,200);
});

function browser(ip){
 const cookies=new Map();
 const cookieHeader=()=>[...cookies].map(([k,v])=>k+'='+v).join('; ');
 return async(path,body)=>{
  const origin=process.env.BETTER_AUTH_URL;
  const response=await auth().handler(new Request(origin+'/api/auth'+path,{
   method:body===undefined?'GET':'POST',
   headers:{'content-type':'application/json',origin,'x-forwarded-for':ip,cookie:cookieHeader()},
   body:body===undefined?undefined:JSON.stringify(body)
  }));
  for(const cookie of response.headers.getSetCookie()){
   const first=cookie.split(';')[0];
   const delimiter=first.indexOf('=');
   const key=first.slice(0,delimiter);
   const value=first.slice(delimiter+1);
   if(!value)cookies.delete(key);
   else cookies.set(key,value);
  }
  currentHeaders=new Headers({cookie:cookieHeader()});
  return response;
 };
}

test('a pending registration can recover from a delivery failure by requesting another code',async()=>{
 const post=browser('192.0.2.6');
 const member={name:'Retry Buyer',email:'retry@example.org',password:'test-only-retry-password'};
 const resend={email:member.email,type:'email-verification'};
 mailUnavailable=true;
 try{
  const signup=await post('/sign-up/email',member);
  assert.equal(signup.status,200,await signup.clone().text());
  assert.equal(signup.headers.get('set-cookie'),null);
  assert.equal((await post('/sign-in/email',member)).status,200);
  assert.equal((await post('/send-verification-email',{email:member.email})).status,503);
  mock.timers.tick(1000);
  const failed=await post('/email-otp/send-verification-otp',resend);
  assert.equal(failed.status,503,await failed.clone().text());
  assert.match((await failed.json()).message,/Could not send a registration code/);
 }finally{mailUnavailable=false;}

 mock.timers.tick(1000);
 const sent=await post('/email-otp/send-verification-otp',resend);
 assert.equal(sent.status,200,await sent.clone().text());
 const message=mail.at(-1);
 assert.equal(message.to,member.email);
 const otp=message.body.match(/\b\d{6}\b/)[0];
 const verified=await post('/email-otp/verify-email',{email:member.email,otp});
 assert.equal(verified.status,200,await verified.clone().text());
 assert.equal((await post('/sign-in/email',{email:member.email,password:member.password})).status,200);
});

test('verification links activate only the matching signed-in account and preserve the cart return',async()=>{
 const post=browser('192.0.2.10'),guest=browser('192.0.2.11'),other=browser('192.0.2.12');
 const member={name:'Link Buyer',email:'link@example.org',password:'test-only-link-password'};
 const callbackURL='/dashboard?checkout=1&payment=qrph&emailVerification=link';
 assert.equal((await post('/sign-up/email',member)).status,200);
 assert.equal((await post('/sign-in/email',member)).status,200);
 assert.equal((await guest('/send-verification-email',{email:member.email,callbackURL})).status,401);
 const sent=await post('/send-verification-email',{email:member.email,callbackURL});
 assert.equal(sent.status,200,await sent.clone().text());
 const message=mail.at(-1);
 assert.equal(message.to,member.email);
 const url=new URL(message.body.split('\n')[1]);
 assert.equal(url.origin,process.env.BETTER_AUTH_URL);
 const link=url.pathname.slice('/api/auth'.length)+url.search;
 assert.equal((await guest(link)).headers.get('location'),'/dashboard?emailVerification=sign-in');
 assert.equal((await other('/sign-in/email',{email:'existing@example.org',password:'test-only-existing-password'})).status,200);
 assert.equal((await other(link)).status,403);
 assert.equal((await (await post('/get-session')).json()).user.emailVerified,false);
 const verified=await post(link);
 assert.equal(verified.status,302,await verified.clone().text());
 assert.equal(verified.headers.get('location'),callbackURL);
 assert.equal((await (await post('/get-session')).json()).user.emailVerified,true);
 assert.equal((await requireUser()).email,member.email);
});

test('administrator setup and every sign-in require an email code before issuing a session',async()=>{
 const origin=process.env.BETTER_AUTH_URL;
 process.env.ADMIN_EMAIL='admin@example.org';
 process.env.ADMIN_SETUP_TOKEN='test-only-setup-token';
 const {POST:setup}=await import('../app/api/admin/setup/route.js');
 const password='test-only-admin-password';
 const request=(token)=>new Request(origin+'/api/admin/setup',{method:'POST',
  headers:{'content-type':'application/json',origin},body:JSON.stringify({token,password})});
 assert.equal((await setup(request('wrong'))).status,403);
 const created=await setup(request(process.env.ADMIN_SETUP_TOKEN));
 assert.equal(created.status,200,await created.clone().text());
 assert.equal((await setup(request(process.env.ADMIN_SETUP_TOKEN))).status,409);

 const post=browser('192.0.2.2');
 const credentials={email:process.env.ADMIN_EMAIL,password};
 const initial=await post('/sign-in/email',credentials);
 assert.equal(initial.status,200,await initial.clone().text());
 assert.deepEqual(await initial.json(),{twoFactorRedirect:true,twoFactorMethods:['otp']});
 assert.equal(await (await post('/get-session')).json(),null);
 assert.equal((await post('/two-factor/disable',{password})).status,404);
 const anotherBrowser=browser('192.0.2.3');
 mailUnavailable=true;
 const unsent=await post('/two-factor/send-otp',{});
 mailUnavailable=false;
 assert.equal(unsent.status,503,await unsent.clone().text());
 mock.timers.tick(2000);
 const sent=await post('/two-factor/send-otp',{});
 assert.equal(sent.status,200,await sent.clone().text());
 const message=mail.at(-1);
 assert.equal(message.to,process.env.ADMIN_EMAIL);
 assert.match(message.subject,/administrator sign-in/);
 const code=message.body.match(/\b\d{6}\b/)[0];
 assert.equal((await anotherBrowser('/two-factor/verify-otp',{code})).status,401);
 assert.equal((await post('/two-factor/verify-otp',{code,trustDevice:true})).status,400);
 assert.equal((await post('/two-factor/verify-otp',{code:code==='000000'?'000001':'000000'})).status,401);
 assert.equal(await (await post('/get-session')).json(),null);
 const verified=await post('/two-factor/verify-otp',{code});
 assert.equal(verified.status,200,await verified.clone().text());
 const session=await (await post('/get-session')).json();
 assert.equal(session.user.emailVerified,true);
 assert.equal(session.session.adminOtpVerified,true);

 // Simulate an existing administrator moving from password-only sessions.
 await pg.query('UPDATE "user" SET "twoFactorEnabled"=false WHERE id=$1',[session.user.id]);
 await pg.query('UPDATE "session" SET "adminOtpVerified"=false WHERE id=$1',[session.session.id]);
 await requireAdminOtpEnrollment(pool,process.env.ADMIN_EMAIL);
 assert.equal(await (await post('/get-session')).json(),null);
 const next=await anotherBrowser('/sign-in/email',credentials);
 assert.equal((await next.json()).twoFactorRedirect,true);
 assert.equal(await (await anotherBrowser('/get-session')).json(),null);
});

test('customers can change a strong password and revoke other or all sessions',async()=>{
 const email='existing@example.org',password='test-only-existing-password';
 const nextPassword='fixture customer new passphrase';
 const first=browser('192.0.2.4'),second=browser('192.0.2.5');
 const signIn=(client,value=password)=>client('/sign-in/email',{email,password:value});
 assert.equal((await signIn(first)).status,200);
 assert.equal((await signIn(second)).status,200);
 assert.equal((await first('/change-password',{currentPassword:password,newPassword:'a'.repeat(20)})).status,400);
 const changed=await first('/change-password',{currentPassword:password,newPassword:nextPassword,revokeOtherSessions:false});
 assert.equal(changed.status,200,await changed.clone().text());
 assert.equal(await (await second('/get-session')).json(),null);
 assert.ok((await (await first('/get-session')).json()).user);
 assert.equal((await signIn(second,nextPassword)).status,200);
 assert.equal((await first('/revoke-other-sessions',{})).status,200);
 assert.equal(await (await second('/get-session')).json(),null);
 assert.equal((await signIn(second,nextPassword)).status,200);
 assert.equal((await first('/revoke-sessions',{})).status,200);
 assert.equal(await (await first('/get-session')).json(),null);
 assert.equal(await (await second('/get-session')).json(),null);
});
