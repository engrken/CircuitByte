import {requireAdmin,sameOrigin} from '../../../../lib/auth.js';
import {db} from '../../../../lib/db.js';
import {updateOrder,errorResponse,readBody} from '../../../../lib/orders.js';
import {deliverOrderInvoice} from '../../../../lib/order-invoices.js';
import {gmailConfigured,sendGmailMessage} from '../../../../lib/studio-email.mjs';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const orderIdPattern=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const orderDetails=`SELECT o.id,o.reference,o.customer_name,o.customer_email,o.customer_user_id IS NULL AS guest,
 o.invoice_customer_name,o.invoice_billing_address,o.invoice_tin,o.contact,o.proposed_location,o.confirmed_location,
 o.notes,o.customer_update,o.items,o.total_cents,o.promotion,o.status,o.version,o.created_at,o.updated_at,
 o.payment_method,o.payment_reference,o.payment_verified_at,o.qr_payment_opened_at,
 o.fulfillment_method,o.delivery_fee_acknowledged_at,o.deleted_at,
 (SELECT jsonb_object_agg(n.kind,CASE WHEN n.sent_at IS NOT NULL THEN 'sent' WHEN n.failed_at IS NOT NULL THEN 'failed' ELSE 'pending' END)
  FROM order_notifications n WHERE n.order_id=o.id) AS notifications,
 to_jsonb(i)-'email_claimed_at'-'issued_by' AS invoice
 FROM orders o LEFT JOIN order_invoices i ON i.order_id=o.id`;

const orderList=`SELECT o.id,o.reference,o.status,o.created_at,o.total_cents,o.fulfillment_method,o.deleted_at,
 o.payment_method,o.payment_reference IS NOT NULL AS has_payment_reference,o.payment_verified_at,o.qr_payment_opened_at,
 (SELECT coalesce(sum((item->>'quantity')::int),0)::int FROM jsonb_array_elements(o.items) item) AS item_count,
 i.invoice_number,i.email_failed_at IS NOT NULL AS invoice_email_failed
 FROM orders o LEFT JOIN order_invoices i ON i.order_id=o.id`;

export async function GET(req){
 try{await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:401,headers});}
 try{
  const params=new URL(req.url).searchParams,id=params.get('id');
  if(id!==null){
   if(!orderIdPattern.test(id))return Response.json({error:'Invalid order.'},{status:400,headers});
   const {rows:[order]}=await db().query(orderDetails+' WHERE o.id=$1',[id]);
   if(!order)return Response.json({error:'Order not found.'},{status:404,headers});
   return Response.json({order},{headers});
  }
  const search=new URLSearchParams(req.headers.get('x-circuitbyte-order-search')||'');
  const status=params.get('status')||'',query=(search.get('q')??params.get('q')??'').trim().slice(0,100);
  const offset=Math.max(0,Math.min(100000,parseInt(params.get('offset'),10)||0));
  const [{rows},{rows:[summary]}]=await Promise.all([
   db().query(orderList+` WHERE (
    ($1='Deleted' AND o.deleted_at IS NOT NULL)
    OR (o.deleted_at IS NULL AND ($1='' OR o.status=$1))
   ) AND ($2='' OR o.reference ILIKE '%'||$2||'%'
    OR o.customer_name ILIKE '%'||$2||'%' OR o.customer_email ILIKE '%'||$2||'%')
    ORDER BY o.created_at DESC,o.id DESC LIMIT 51 OFFSET $3`,[status,query,offset]),
   db().query(`SELECT count(*) FILTER(WHERE deleted_at IS NULL)::int AS total,
    count(*) FILTER(WHERE deleted_at IS NOT NULL)::int AS deleted,count(*) FILTER(WHERE status='Pending')::int AS pending,
    count(*) FILTER(WHERE status='Confirmed')::int AS confirmed,count(*) FILTER(WHERE status='Ready')::int AS ready,
    count(*) FILTER(WHERE status='Completed')::int AS completed,count(*) FILTER(WHERE status='Cancelled' AND deleted_at IS NULL)::int AS cancelled
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
     body:`${message}\n\nView private order details in My Orders.\n${new URL('/dashboard',origin)}`
    });
   }catch(e){console.error('Order status email failed:',e.code||e.name);}
  }
  const {rows:[order]}=await db().query(orderDetails+' WHERE o.id=$1',[body.id]);
  return Response.json({order,delivery},{headers});
 }catch(e){return errorResponse(e);}
}


async function setCancelledOrderDeleted(req,deleted){
 let admin;
 try{sameOrigin(req);admin=await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403,headers});}
 try{
  const body=await readBody(req);
  if(typeof body?.id!=='string'||!orderIdPattern.test(body.id)||!Number.isInteger(body.version)||body.version<1){
   return Response.json({error:'Invalid order.'},{status:400,headers});
  }
  const {rows:[order]}=await db().query(`WITH moved AS (
   UPDATE orders SET deleted_at=CASE WHEN $3 THEN now() ELSE NULL END,version=version+1
   WHERE id=$1 AND version=$2 AND status='Cancelled' AND (deleted_at IS NULL)=$3
   RETURNING id,reference,status,deleted_at
  ), audit AS (
   INSERT INTO order_events(order_id,status,actor,note)
   SELECT id,status,$4,$5 FROM moved
  ) SELECT id,reference,deleted_at FROM moved`,[
   body.id,body.version,deleted,admin.email,deleted?'Deleted from admin orders':'Restored to admin orders'
  ]);
  if(!order)return Response.json({error:'Only cancelled orders can be moved. Refresh the list if the order has changed.'},{status:409,headers});
  return Response.json({order},{headers});
 }catch(e){return errorResponse(e);}
}

export async function DELETE(req){return setCancelledOrderDeleted(req,true);}
export async function PATCH(req){return setCancelledOrderDeleted(req,false);}
