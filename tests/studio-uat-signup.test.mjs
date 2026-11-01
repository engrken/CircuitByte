import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-15T12:00:00+08:00')});
let options;
mock.module('better-auth',{namedExports:{betterAuth:config=>{options=config;return {api:{}};}}});
mock.module('next/headers.js',{namedExports:{headers:async()=>new Headers()}});
mock.module('../lib/db.js',{namedExports:{db:()=>({})}});
mock.module('../lib/studio-email.mjs',{namedExports:{gmailConfigured:()=>true,sendGmailMessage:async()=>{}}});
const {auth}=await import('../lib/auth.js');
test('A cached auth instance rechecks signup expiry instead of keeping registration open',async()=>{
 auth();const created=await options.databaseHooks.user.create.before({email:'uat-member@example.invalid'});assert.equal(created.data.email,'uat-member@example.invalid');
 mock.timers.setTime(Date.parse('2026-12-01T00:00:00+08:00'));
 await assert.rejects(options.databaseHooks.user.create.before({email:'later-member@example.invalid'}),/registration is closed/i);
});
