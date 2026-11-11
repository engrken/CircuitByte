import {requireUser,sameOrigin} from '../../../lib/auth';
import {createOrder,errorResponse,readBody} from '../../../lib/orders';
import {gmailConfigured,sendGmailMessage} from '../../../lib/studio-email.mjs';
export const dynamic='force-dynamic';
export async function POST(req){
 try{sameOrigin(req);}catch{return Response.json({error:'Invalid origin'},{status:403});}
 let user;try{user=await requireUser();}catch{return Response.json({error:'Sign in and verify your email before placing an order.'},{status:401});}
 try{
  const body=await readBody(req);
  const order=await createOrder(body,req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown',user);
  if(gmailConfigured()){
   try{await sendGmailMessage({to:user.email,subject:`CircuitByte order received · ${order.reference}`,body:`Hi ${user.name||'there'},\n\nWe received your order ${order.reference}.\nStatus: Pending\nTotal: ₱${(order.total_cents/100).toFixed(2)}\n\nSign in to your CircuitByte account to follow its progress.\n${process.env.BETTER_AUTH_URL||new URL(req.url).origin}/dashboard\n\nCircuitByte`});}catch(e){console.error('Customer order email failed:',e.message);}
   try{if(process.env.ADMIN_EMAIL)await sendGmailMessage({to:process.env.ADMIN_EMAIL,subject:`New CircuitByte order · ${order.reference}`,body:`A customer submitted order ${order.reference}.\nCustomer: ${user.name||''} <${user.email}>\nTotal: ₱${(order.total_cents/100).toFixed(2)}\n\nManage orders: ${process.env.BETTER_AUTH_URL||new URL(req.url).origin}/admin/orders`});}catch(e){console.error('Admin order email failed:',e.message);}
  }
  return Response.json(order,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return errorResponse(e);}
}
