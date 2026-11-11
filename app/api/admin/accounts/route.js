import {requireAdmin,sameOrigin} from '../../../../lib/auth.js';
import {deliverManualVerification,listPendingAccounts,manuallyVerifyAccount} from '../../../../lib/manual-account-verification.js';
import {errorResponse,readBody} from '../../../../lib/orders.js';
import {OrderError} from '../../../../lib/order-rules.mjs';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

export async function GET(request){
 try{await requireAdmin();}catch{return Response.json({error:'Sign in as an administrator.'},{status:401,headers});}
 try{
  const offset=Math.max(0,Math.min(100000,Number.parseInt(new URL(request.url).searchParams.get('offset'),10)||0));
  return Response.json(await listPendingAccounts(offset),{headers});
 }catch(error){return errorResponse(error);}
}

export async function POST(request){
 let admin;
 try{sameOrigin(request);admin=await requireAdmin();}catch{return Response.json({error:'Administrator access required.'},{status:403,headers});}
 try{
  const body=await readBody(request);
  if(typeof body?.id!=='string'||!/^[a-z0-9_-]{1,100}$/i.test(body.id)||!['verify','retry'].includes(body.action)){
   throw new OrderError('Choose a valid account action.');
  }
  if(body.action==='verify'){
   if(body.confirmed!==true)throw new OrderError('Confirm that you checked who controls the account and email address.');
   await manuallyVerifyAccount(body.id,body.reason,admin.email);
  }
  let delivery='pending';
  try{delivery=await deliverManualVerification(body.id,process.env.BETTER_AUTH_URL||new URL(request.url).origin);}
  catch(error){console.error('Account verification notice status unavailable:',error.code||error.name);}
  if(delivery==='missing')throw new OrderError('Verification record not found.',404);
  return Response.json({delivery},{headers});
 }catch(error){return errorResponse(error);}
}
