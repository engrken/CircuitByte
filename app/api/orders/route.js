import {after} from 'next/server';
import {requireUser,sameOrigin} from '../../../lib/auth';
import {createOrder,errorResponse,readBody} from '../../../lib/orders';
import {deliverOrderNotifications} from '../../../lib/order-notifications.js';

export const dynamic='force-dynamic';
export async function POST(req){
 try{sameOrigin(req);}catch{return Response.json({error:'Invalid origin'},{status:403});}
 let user;
 try{user=await requireUser();}catch{return Response.json({error:'Sign in and verify your email before placing an order.'},{status:401});}
 try{
  const body=await readBody(req);
  const order=await createOrder(body,req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown',user);
  const origin=process.env.BETTER_AUTH_URL||new URL(req.url).origin;
  after(async()=>{
   try{await deliverOrderNotifications(body.requestId,origin);}
   catch(error){console.error('Could not send new order notifications:',error.code||error.name);}
  });
  return Response.json(order,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return errorResponse(e);}
}
