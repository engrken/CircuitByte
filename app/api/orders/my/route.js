import {requireUser,sameOrigin} from '../../../../lib/auth';
import {errorResponse,listCustomerOrders,readBody,recordPaymentReference} from '../../../../lib/orders';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};

export async function GET(){
 let user;
 try{user=await requireUser();}catch{return Response.json({error:'Sign in with a verified account.'},{status:401,headers});}
 try{return Response.json({orders:await listCustomerOrders(user.id)},{headers});}catch(e){return errorResponse(e);}
}

export async function POST(req){
 let user;
 try{sameOrigin(req);user=await requireUser();}catch{return Response.json({error:'Sign in with a verified account.'},{status:403,headers});}
 try{
  const body=await readBody(req);
  await recordPaymentReference(body?.id,body?.reference,user.id);
  return Response.json({ok:true},{headers});
 }catch(e){return errorResponse(e);}
}
