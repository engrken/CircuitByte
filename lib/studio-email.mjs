import nodemailer from 'nodemailer';
// Gmail mailer: App Password SMTP over TLS, with Gmail API OAuth2 fallback.
// All secrets remain server-side; mail remains disabled until fully configured.
const oauthRequired=['GMAIL_OAUTH_CLIENT_ID','GMAIL_OAUTH_CLIENT_SECRET','GMAIL_OAUTH_REFRESH_TOKEN'];
const validSender=env=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.GMAIL_SENDER_EMAIL||'');
const normalizedAppPassword=env=>typeof env.GMAIL_APP_PASSWORD==='string'?env.GMAIL_APP_PASSWORD.replace(/\s/g,''):'';
export function gmailMethod(env=process.env){
 if(!validSender(env))return null;
 if(/^[a-zA-Z0-9]{16}$/.test(normalizedAppPassword(env)))return 'app-password';
 if(oauthRequired.every(key=>typeof env[key]==='string'&&env[key].trim()))return 'oauth2';
 return null;
}
export function gmailConfigured(env=process.env){return gmailMethod(env)!==null;}
function smtpOptions(env){
 return {host:'smtp.gmail.com',port:465,secure:true,
  auth:{user:env.GMAIL_SENDER_EMAIL,pass:normalizedAppPassword(env)},
  connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
  tls:{minVersion:'TLSv1.2',servername:'smtp.gmail.com'}};
}
// Authenticates the configured SMTP sender without sending a message.
export async function verifyGmailSender({env=process.env,transportFactory=nodemailer.createTransport}={}){
 if(gmailMethod(env)!=='app-password')throw Error('SMTP readiness verification requires a configured Gmail App Password.');
 const transport=transportFactory(smtpOptions(env));
 try{await transport.verify();return {method:'app-password'};}
 finally{transport.close?.();}
}
function address(value){
 const text=String(value||'').trim();
 if(text.length>200||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text))throw Error('Invalid email recipient.');
 return text;
}
function base64url(bytes){return Buffer.from(bytes).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function formatGmailMessage({to,subject,body},env=process.env){
 const sender=address(env.GMAIL_SENDER_EMAIL),recipient=address(to);
 if(typeof subject!=='string'||subject.length>130||/[\r\n]/.test(subject))throw Error('Invalid mail subject.');
 if(typeof body!=='string'||body.length>10000)throw Error('Invalid mail body.');
 const mime=[
  'From: CircuitByte Studio <'+sender+'>',
  'To: '+recipient,
  'Subject: '+subject,
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  '',
  Buffer.from(body,'utf8').toString('base64')
 ].join('\r\n');
 return base64url(Buffer.from(mime,'utf8'));
}
async function jsonOrThrow(response,context){
 if(!response.ok)throw Error(context+' unavailable ('+response.status+').');
 return response.json();
}
export async function sendGmailMessage(message,{env=process.env,fetcher=fetch,transportFactory=nodemailer.createTransport}={}){
 const method=gmailMethod(env);
 if(!method)throw Error('Gmail sender is not configured.');
 if(method==='app-password'){
  const transport=transportFactory(smtpOptions(env));
  try{
   const recipient=address(message.to),sender=address(env.GMAIL_SENDER_EMAIL);
   if(typeof message.subject!=='string'||message.subject.length>130||/[\r\n]/.test(message.subject))throw Error('Invalid mail subject.');
   if(typeof message.body!=='string'||message.body.length>10000)throw Error('Invalid mail body.');
   const receipt=await transport.sendMail({
    from:{name:'CircuitByte Studio',address:sender},
    to:recipient,
    subject:message.subject,
    text:message.body,
    disableFileAccess:true,disableUrlAccess:true
   });
   if(!Array.isArray(receipt?.accepted)||!receipt.accepted.map(x=>String(x).toLowerCase()).includes(recipient.toLowerCase())){
    throw Error('Gmail SMTP did not accept the intended recipient.');
   }
   return {id:receipt.messageId||'smtp-accepted'};
  }finally{transport.close?.();}
 }

 const auth=await fetcher('https://oauth2.googleapis.com/token',{
  method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:env.GMAIL_OAUTH_CLIENT_ID,client_secret:env.GMAIL_OAUTH_CLIENT_SECRET,
   refresh_token:env.GMAIL_OAUTH_REFRESH_TOKEN,grant_type:'refresh_token'}),
  signal:AbortSignal.timeout(10000)
 });
 const tokens=await jsonOrThrow(auth,'Gmail OAuth');
 if(typeof tokens.access_token!=='string')throw Error('Gmail OAuth did not return an access token.');
 const send=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
  method:'POST',
  headers:{'Authorization':'Bearer '+tokens.access_token,'Content-Type':'application/json'},
  body:JSON.stringify({raw:formatGmailMessage(message,env)}),
  signal:AbortSignal.timeout(10000)
 });
 const result=await jsonOrThrow(send,'Gmail message delivery');
 if(typeof result.id!=='string')throw Error('Gmail did not confirm the message ID.');
 return {id:result.id};
}
export function studioInvitationMessage(email,{reference,baseUrl}){
 const url=new URL('/dashboard',baseUrl).toString();
 return {to:email,subject:'Build your electronics project with CircuitByte Studio',
  body:'Hello!\n\nThank you for ordering CircuitByte components'+(reference?' (order '+reference+')':'')+'.\n\nYou requested an invitation to CircuitByte Project Studio. Create a free account after registration opens, confirm your email, and explore Arduino code, diagrams, component libraries and supported LED previews.\n\nOpen the member dashboard:\n'+url+'\n\nFree guided features are available; the proposed paid plans are not active subscriptions. An order is never required to use free learning features.\n\nYou received this message because you opted in during checkout. We do not automatically create accounts from order details.\n\nCircuitByte Studio'};
}
