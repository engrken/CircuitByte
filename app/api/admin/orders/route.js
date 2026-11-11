import {requireAdmin,sameOrigin} from '../../../../lib/auth';
import {db} from '../../../../lib/db';
import {updateOrder,errorResponse,readBody} from '../../../../lib/orders';
import {deliverOrderInvoice} from '../../../../lib/order-invoices.js';
import {gmailConfigured,sendGmailMessage} from '../../../../lib/studio-email.mjs';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const orderDetails=`SELECT o.id,o.reference,o.customer_name,o.customer_email,o.customer_user_id IS NULL AS guest,
 o.invoice_customer_name,o.invoice_billing_address,o.invoice_tin,o.contact,o.proposed_location,o.confirmed_location,
 o.notes,o.customer_update,o.items,o.total_cents,o.status,o.version,o.created_at,o.updated_at,
 o.payment_method,o.payment_reference,o.payment_verified_at,o.qr_payment_opened_at,
 (SELECT jsonb_object_agg(n.kind,CASE WHEN n.sent_at IS NOT NULL THEN 'sent' WHEN n.failed_at IS NOT NULL THEN 'failed' ELSE 'pending' END)
  FROM order_notifications n WHERE n.order_id=o.id) AS notifications,
 to_jsonb(i)-'email_claimed_at'-'issued_by' AS invoice
 FROM orders o LEFT JOIN order_invoices i ON i.order_id=o.id`;

export async function GET(req){
 try{await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:401,headers});}
 try{
  const params=new URL(req.url).searchParams,status=params.get('status')||'',query=(params.get('q')||'').trim().slice(0,100);
  const offset=Math.max(0,Math.min(100000,parseInt(params.get('offset'),10)||0));
  const [{rows},{rows:[summary]}]=await Promise.all([
   db().query(orderDetails+` WHERE ($1='' OR o.status=$1) AND ($2='' OR o.reference ILIKE '%'||$2||'%'
    OR o.customer_name ILIKE '%'||$2||'%' OR o.customer_email ILIKE '%'||$2||'%')
    ORDER BY o.created_at DESC,o.id DESC LIMIT 51 OFFSET $3`,[status,query,offset]),
   db().query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE status='Pending')::int AS pending,
    count(*) FILTER(WHERE status='Confirmed')::int AS confirmed,count(*) FILTER(WHERE status='Ready')::int AS ready,
    count(*) FILTER(WHERE status='Completed')::int AS completed,count(*) FILTER(WHERE status='Cancelled')::int AS cancelled
    FROM orders`)
  ]);
  return Response.json({orders:rows.slice(0,50),hasMore:rows.length>50,summary},{headers});
 }catch(e){return errorResponse(e);}
}

export async function POST(req){
 let user;
 try{sameOrigin(req);user=await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403,headers});}
 try{
  const body=await readBody(req),updated=await updateOrder(body,user.email);
  const origin=process.env.BETTER_AUTH_URL||new URL(req.url).origin;
  let delivery='';
  if(updated.statusChanged&&updated.order.status==='Completed'&&updated.email){
   try{delivery=await deliverOrderInvoice(body.id,origin);}
   catch(e){console.error('Invoice delivery status unavailable:',e.code||e.name);delivery='failed';}
  }else if((updated.statusChanged||updated.paymentOpened||updated.paymentVerified)&&updated.email&&gmailConfigured()){
   try{
    const message=updated.paymentOpened?'QR Ph payment is now available. Open My Orders to see your total and payment code.':
     updated.paymentVerified?'Your QR Ph payment is verified. Open My Orders for handover details.':
      `Your CircuitByte order is now ${updated.order.status}.`;
    await sendGmailMessage({
     to:updated.email,subject:`CircuitByte order update: ${updated.order.reference}`,
     body:`${message}\n\n${body.customer_update||''}\n\n${new URL('/dashboard',origin)}`
    });
   }catch(e){console.error('Order status email failed:',e.code||e.name);}
  }
  const {rows:[order]}=await db().query(orderDetails+' WHERE o.id=$1',[body.id]);
  return Response.json({order,delivery},{headers});
 }catch(e){return errorResponse(e);}
}
