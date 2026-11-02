import {randomBytes,createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {requireUser,sameOrigin} from '../../../../../lib/auth.js';
import {studentUatRejection} from '../../../../../lib/studio-uat.mjs';
import {copilotConfigured,seal,COPILOT_STATE,cookieOptions} from '../../../../../lib/studio-copilot.mjs';
export async function POST(request){
 let user;try{sameOrigin(request);user=await requireUser();}catch{return Response.json({error:'Sign in to your verified Studio account first.'},{status:403});}
 const closed=studentUatRejection();if(closed)return closed;
 if(!copilotConfigured())return Response.json({error:'Copilot integration is awaiting administrator configuration.'},{status:503});
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
 const url=new URL('https://github.com/login/oauth/authorize');
 const redirect=new URL('/api/studio/copilot/callback',process.env.BETTER_AUTH_URL).href;
 url.search=new URLSearchParams({client_id:process.env.COPILOT_CLIENT_ID,redirect_uri:redirect,state,scope:'read:user',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
 const response=NextResponse.redirect(url,303);
 response.cookies.set(COPILOT_STATE,seal({state,verifier,userId:user.id,exp:Date.now()+600000}),{...cookieOptions,maxAge:600});return response;
}
