import {cookies} from 'next/headers.js';
import {NextResponse} from 'next/server';
import {requireUser} from '../../../../../lib/auth.js';
import {copilotConfigured,seal,unseal,COPILOT_COOKIE,COPILOT_STATE,cookieOptions} from '../../../../../lib/studio-copilot.mjs';
export const dynamic='force-dynamic';
export async function GET(request){
 const response=NextResponse.redirect(new URL('/studio?copilot=failed',process.env.BETTER_AUTH_URL||new URL(request.url).origin),303);
 response.cookies.set(COPILOT_STATE,'',{...cookieOptions,maxAge:0});
 response.headers.set('Cache-Control','private, no-store');
 try{
  if(!copilotConfigured())return response;
  const user=await requireUser(),jar=await cookies(),state=unseal(jar.get(COPILOT_STATE)?.value),url=new URL(request.url);
  if(!state||state.userId!==user.id||state.state!==url.searchParams.get('state')||!url.searchParams.get('code')||url.searchParams.has('error'))return response;
  const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:process.env.COPILOT_CLIENT_ID,client_secret:process.env.COPILOT_CLIENT_SECRET,code:url.searchParams.get('code'),code_verifier:state.verifier,redirect_uri:new URL('/api/studio/copilot/callback',process.env.BETTER_AUTH_URL).href})});
  const token=await tokenResponse.json();if(!tokenResponse.ok||typeof token.access_token!=='string'||!/^gh[ou]_/.test(token.access_token)||token.access_token.length>1000)return response;
  const profileResponse=await fetch('https://api.github.com/user',{cache:'no-store',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+token.access_token,Accept:'application/vnd.github+json'}});
  const profile=await profileResponse.json();if(!profileResponse.ok||typeof profile.login!=='string')return response;
  const ttl=Math.min(28800,Number(token.expires_in)||28800);
  response.cookies.set(COPILOT_COOKIE,seal({userId:user.id,token:token.access_token,login:profile.login,exp:Date.now()+ttl*1000}),{...cookieOptions,maxAge:ttl});
  response.headers.set('Location',new URL('/studio?copilot=connected',process.env.BETTER_AUTH_URL).href);return response;
 }catch{return response;}
}
