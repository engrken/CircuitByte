import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers.js';
export const COPILOT_COOKIE='__Host-circuitbyte-copilot';
export const COPILOT_STATE='__Host-circuitbyte-copilot-state';
export const cookieOptions={httpOnly:true,secure:true,sameSite:'lax',path:'/'};
export function copilotConfigured(){
 try{return process.env.STUDIO_COPILOT_ENABLED==='true'&&Boolean(process.env.COPILOT_CLIENT_ID&&process.env.COPILOT_CLIENT_SECRET&&process.env.COPILOT_COOKIE_SECRET?.length>=32&&process.env.COPILOT_SERVICE_SECRET?.length>=32)&&new URL(process.env.COPILOT_SERVICE_URL).protocol==='https:';}catch{return false;}
}
function key(){const secret=process.env.COPILOT_COOKIE_SECRET;if(!secret||secret.length<32)throw Error('Copilot session encryption is not configured.');return createHash('sha256').update(secret).digest();}
export function seal(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
export function unseal(value){try{const bytes=Buffer.from(value||'','base64url');if(bytes.length<29||bytes.length>3000)return null;const cipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));const result=JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]));return result.exp>Date.now()?result:null;}catch{return null;}}
export async function copilotIdentity(userId){const jar=await cookies();const identity=unseal(jar.get(COPILOT_COOKIE)?.value);return identity?.userId===userId&&typeof identity.token==='string'?identity:null;}
export async function copilotCompletion({identity,messages,signal}){
 if(!copilotConfigured()||!identity)throw Error('Connect your GitHub account before using Copilot.');
 const response=await fetch(new URL('/completion',process.env.COPILOT_SERVICE_URL),{method:'POST',redirect:'error',cache:'no-store',signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.COPILOT_SERVICE_SECRET},body:JSON.stringify({token:identity.token,messages})});
 if(!response.ok)return Response.json({error:'Copilot is unavailable. Check your GitHub subscription, authorization and remaining allowance.'},{status:response.status});
 const data=await response.json();
 if(typeof data.content!=='string'||data.content.length>50000)throw Error('Invalid Copilot response.');
 return Response.json({choices:[{message:{content:data.content}}]});
}
