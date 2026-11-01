// Explicit production launch gate. Never sends email or creates member accounts.
import {verifyGmailSender} from '../lib/studio-email.mjs';
import {getStudentUat} from '../lib/studio-uat.mjs';
if(process.env.VERCEL_ENV!=='production'||process.env.STUDIO_UAT_VERIFY_ON_BUILD!=='true')process.exit(0);
if(!getStudentUat().active)throw Error('Student UAT launch verification is outside the published dates.');
if(process.env.STUDIO_PUBLIC_SIGNUPS_ENABLED!=='true'||process.env.STUDIO_AI_ENABLED!=='true'||process.env.STUDIO_COMPILER_ENABLED!=='true')throw Error('Student UAT required service flags are not enabled.');
try{await verifyGmailSender();console.log('STUDENT_UAT_SMTP_VERIFIED: TLS sender authentication succeeded; no message sent.');}
catch{throw Error('Student UAT Gmail sender authentication failed. Check sender credentials and SMTP availability.');}
const credential=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
if(!credential)throw Error('Student UAT AI Gateway credential missing.');
const headers={'Authorization':'Bearer '+credential,'Content-Type':'application/json'};
const model=process.env.STUDIO_AI_MODEL||'google/gemini-2.5-flash-lite';
const available=await fetch('https://ai-gateway.vercel.sh/v1/models',{headers,signal:AbortSignal.timeout(15000)});
if(!available.ok)throw Error('Student UAT model discovery failed (HTTP '+available.status+').');
const catalog=await available.json();
if(!catalog.data?.some(item=>item.id===model))throw Error('Configured Student UAT AI model is absent from the live model catalog.');
const response=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{
 method:'POST',headers,signal:AbortSignal.timeout(30000),
 body:JSON.stringify({model,max_tokens:300,temperature:0,
  messages:[{role:'system',content:'Return only a JSON object with a code string containing an Arduino sketch. No markdown.'},
   {role:'user',content:'Produce a minimal Arduino Uno Serial sketch. setup begins Serial at 115200. loop prints UAT then delays 1000 ms. No external hardware.'}]})
});
if(!response.ok)throw Error('Student UAT live AI draft failed (HTTP '+response.status+').');
const result=await response.json();
let draft;try{draft=JSON.parse(String(result.choices?.[0]?.message?.content||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw Error('Student UAT live AI response was not valid JSON.');}
if(!/\bvoid\s+setup\s*\(/.test(draft.code||'')||!/\bvoid\s+loop\s*\(/.test(draft.code||''))throw Error('Student UAT live AI response did not contain an Arduino sketch.');
console.log('STUDENT_UAT_AI_VERIFIED: configured model '+model+' returned a valid JSON sketch; no member quota consumed.');
