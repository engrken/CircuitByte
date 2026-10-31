import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateOrder} from '../lib/order-rules.mjs';
import {gmailConfigured,gmailMethod,formatGmailMessage,sendGmailMessage,studioInvitationMessage} from '../lib/studio-email.mjs';
const base={name:'Buyer',contact:'09171234567',location:'Roxas City public market',
 city:'Roxas City, Capiz',notes:'',requestId:'abf6d7e8-99ab-4c15-a673-a082c829ef64',
 token:'f'.repeat(64),items:[{id:'cb-059',quantity:1,price_cents:29900}]};
test('Guest checkout remains valid without an account or email',()=>{
 const p=validateOrder(base);
 assert.equal(p.studioInvite,false);
 assert.equal(p.studioEmail,'');
});
test('Studio email is retained only after explicit opt-in',()=>{
 assert.equal(validateOrder({...base,studioEmail:'unrequested@example.org'}).studioEmail,'');
 const opt=validateOrder({...base,studioInvite:true,studioEmail:' Buyer@Example.org '});
 assert.equal(opt.studioEmail,'buyer@example.org');
 assert.equal(opt.studioInvite,true);
 for(const email of ['not-an-email','x@','example@invalid','test@example.com\nBcc: stolen@example.org']){
  assert.throws(()=>validateOrder({...base,studioInvite:true,studioEmail:email}),/email/i);
 }
 assert.throws(()=>validateOrder({...base,studioInvite:'yes'}),/preference/);
});
test('Gmail sender stays closed when any OAuth credential is absent',()=>{
 const env={GMAIL_SENDER_EMAIL:'circuitbyte@example.org',GMAIL_OAUTH_CLIENT_ID:'client',GMAIL_OAUTH_CLIENT_SECRET:'secret'};
 assert.equal(gmailConfigured(env),false);
 assert.equal(gmailConfigured({...env,GMAIL_OAUTH_REFRESH_TOKEN:'token'}),true);
});
test('Gmail MIME builder uses safe headers and base64-encoded body',()=>{
 const env={GMAIL_SENDER_EMAIL:'circuitbyte@example.org'};
 const raw=formatGmailMessage({to:'student@example.org',subject:'CircuitByte Studio',body:'Welcome to CircuitByte!'},env);
 const decoded=Buffer.from(raw.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8');
 assert.match(decoded,/To: student@example.org/);
 assert.match(decoded,/From: CircuitByte Studio <circuitbyte@example.org>/);
 assert.match(decoded,/Content-Transfer-Encoding: base64/);
 assert.ok(decoded.includes(Buffer.from('Welcome to CircuitByte!').toString('base64')));
 assert.throws(()=>formatGmailMessage({to:'victim@example.org\nBcc:evil@example.org',subject:'Hello',body:'x'},env));
});
test('Gmail OAuth sender uses Google token exchange and send API, no ChatGPT key',async()=>{
 const env={GMAIL_SENDER_EMAIL:'store@example.org',GMAIL_OAUTH_CLIENT_ID:'client',GMAIL_OAUTH_CLIENT_SECRET:'secret',GMAIL_OAUTH_REFRESH_TOKEN:'refresh'};
 let requests=[];
 const fetcher=async(url,options)=>{
  requests.push({url,options});
  return url.includes('oauth2.googleapis.com')
   ? new Response(JSON.stringify({access_token:'mock-access-token'}),{status:200})
   : new Response(JSON.stringify({id:'gmail-message-id'}),{status:200});
 };
 const result=await sendGmailMessage({to:'recipient@example.org',subject:'Studio invitation',body:'Hello'}, {env,fetcher});
 assert.equal(result.id,'gmail-message-id');
 assert.equal(requests.length,2);
 assert.equal(new URL(requests[0].url).hostname,'oauth2.googleapis.com');
 assert.equal(new URL(requests[1].url).hostname,'gmail.googleapis.com');
 assert.equal(requests[1].options.headers.Authorization,'Bearer mock-access-token');
 assert.ok(!JSON.stringify(requests[1]).includes('refresh'));
});
test('Studio invitation message contains public dashboard link but never tracking token',()=>{
 const message=studioInvitationMessage('buyer@example.org',{reference:'CB-20261031-ABCDE',baseUrl:'https://circuitbyte.vercel.app'});
 assert.match(message.body,/https:\/\/circuitbyte\.vercel\.app\/dashboard/);
 assert.match(message.body,/requested an invitation/);
 assert.doesNotMatch(message.body,/track\.html/);
});

test('checkout-to-Studio deep link uses selected product IDs, not private tracking tokens',async()=>{
 const storefront=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const workspace=await readFile(new URL('../app/studio/workspace.jsx',import.meta.url),'utf8');
 assert.match(storefront,/studio-build-order/);
 assert.match(storefront,/purchasedIds/);
 assert.match(storefront,/encodeURIComponent\(purchasedIds\.join/);
 assert.match(workspace,/params\.has\('parts'\)/);
 assert.match(workspace,/product\.id===part/);
 assert.doesNotMatch(storefront,/studio-build-order'\)\.href[^\n]*checkoutAttempt\.token/);
});

test('Gmail App Password configuration enables SMTP without OAuth',()=>{
 const env={GMAIL_SENDER_EMAIL:'maker@gmail.com',GMAIL_APP_PASSWORD:'abcd efgh ijkl mnop'};
 assert.equal(gmailMethod(env),'app-password');
 assert.equal(gmailConfigured(env),true);
 assert.equal(gmailConfigured({...env,GMAIL_APP_PASSWORD:'regular-password'}),false);
 assert.equal(gmailMethod({...env,GMAIL_OAUTH_CLIENT_ID:'optional'}),'app-password');
});
test('Gmail SMTP uses TLS port 465 and does not expose credentials',async()=>{
 const env={GMAIL_SENDER_EMAIL:'maker@gmail.com',GMAIL_APP_PASSWORD:'abcd efgh ijkl mnop'};
 let opts,output,closed=false;
 const transportFactory=options=>{opts=options;return {
  sendMail:async data=>{output=data;return {accepted:['recipient@example.org'],messageId:'smtp-123'};},
  close:()=>{closed=true;}
 };};
 const sent=await sendGmailMessage({to:'recipient@example.org',subject:'Verify CircuitByte',body:'Confirm your email'},{env,transportFactory});
 assert.equal(sent.id,'smtp-123');
 assert.equal(JSON.stringify(sent).includes('abcdefghijklmnop'),false);
 assert.equal(opts.host,'smtp.gmail.com');
 assert.equal(opts.port,465);
 assert.equal(opts.secure,true);
 assert.equal(opts.tls.minVersion,'TLSv1.2');
 assert.equal(opts.auth.user,env.GMAIL_SENDER_EMAIL);
 assert.equal(opts.auth.pass,'abcdefghijklmnop');
 assert.equal(output.from.address,env.GMAIL_SENDER_EMAIL);
 assert.equal(output.to,'recipient@example.org');
 assert.equal(output.text,'Confirm your email');
 assert.equal(output.disableUrlAccess,true);
 assert.equal(closed,true);
});
test('Gmail SMTP rejects unexpected recipients, closes transport on failure',async()=>{
 let closed=false;
 const env={GMAIL_SENDER_EMAIL:'maker@gmail.com',GMAIL_APP_PASSWORD:'abcdefghijklmnop'};
 const transportFactory=()=>({sendMail:async()=>({accepted:['wrong@example.org']}),close:()=>{closed=true;}});
 await assert.rejects(sendGmailMessage({to:'correct@example.org',subject:'Test',body:'Test'},{env,transportFactory}),/did not accept/);
 assert.equal(closed,true);
});
