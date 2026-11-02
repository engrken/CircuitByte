import {NextResponse} from 'next/server';
import {requireUser,sameOrigin} from '../../../../../lib/auth.js';
import {COPILOT_COOKIE,COPILOT_STATE,cookieOptions} from '../../../../../lib/studio-copilot.mjs';
export async function POST(request){
 try{sameOrigin(request);await requireUser();}catch{return Response.json({error:'Sign in required.'},{status:403});}
 const response=NextResponse.json({disconnected:true});
 for(const name of [COPILOT_COOKIE,COPILOT_STATE])response.cookies.set(name,'',{...cookieOptions,maxAge:0});
 response.headers.set('Cache-Control','no-store');return response;
}
