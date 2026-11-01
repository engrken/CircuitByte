import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyGmailSender} from '../lib/studio-email.mjs';
test('The launch SMTP check authenticates using the sender TLS configuration without sending email',async()=>{
 let verified=0,closed=0;
 const result=await verifyGmailSender({env:{GMAIL_SENDER_EMAIL:'sender@example.org',GMAIL_APP_PASSWORD:'abcd efgh ijkl mnop'},
  transportFactory:options=>{assert.equal(options.secure,true);assert.equal(options.port,465);assert.equal(options.auth.pass,'abcdefghijklmnop');
   return {verify:async()=>{verified++;},sendMail:()=>assert.fail('Readiness checks must not send email'),close:()=>{closed++;}};}});
 assert.equal(result.method,'app-password');assert.equal(verified,1);assert.equal(closed,1);
});
test('A failed SMTP authentication closes the transport and fails the launch check',async()=>{
 let closed=false;
 await assert.rejects(verifyGmailSender({env:{GMAIL_SENDER_EMAIL:'sender@example.org',GMAIL_APP_PASSWORD:'abcdefghijklmnop'},
  transportFactory:()=>({verify:async()=>{throw Error('Authentication denied');},close:()=>{closed=true;}})}),/Authentication denied/);
 assert.equal(closed,true);
});
