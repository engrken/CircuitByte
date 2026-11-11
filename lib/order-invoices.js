import {db} from './db.js';
import {OrderError} from './order-rules.mjs';
import {gmailConfigured,sendGmailMessage} from './studio-email.mjs';

const seller=()=>({
 name:process.env.INVOICE_BUSINESS_NAME||'CircuitByte',
 address:process.env.INVOICE_BUSINESS_ADDRESS||'',
 tin:process.env.INVOICE_BUSINESS_TIN||''
});
const peso=cents=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(cents)/100);

// The caller holds the order row lock so stock deduction and invoice issuance commit together.
export async function issueOrderInvoice(c,order,actor,details={}){
 if(order.status!=='Completed')throw new OrderError('Complete this order before issuing an invoice.',409);
 const business=seller();
 const {rows}=await c.query(`INSERT INTO order_invoices(
  order_id,invoice_number,customer_name,customer_email,billing_address,customer_tin,
  seller_name,seller_address,seller_tin,items,subtotal_cents,notes,issued_by,promotion
 ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
 ON CONFLICT(order_id) DO NOTHING RETURNING *`,[
  order.id,'CBI-'+order.reference.replace(/^CB-/,''),
  details.name||order.invoice_customer_name||order.customer_name,order.customer_email,
  details.address??order.invoice_billing_address,details.tin??order.invoice_tin,
  business.name,business.address,business.tin,JSON.stringify(order.items),order.total_cents,details.notes||'',actor,order.promotion||null
 ]);
 return rows[0]||(await c.query('SELECT * FROM order_invoices WHERE order_id=$1',[order.id])).rows[0];
}

export async function deliverOrderInvoice(id,origin){
 const {rows:[invoice]}=await db().query(`UPDATE order_invoices i SET email_claimed_at=date_trunc('milliseconds',clock_timestamp())
  FROM orders o WHERE i.order_id=$1 AND o.id=i.order_id AND i.customer_email<>''
  AND i.email_sent_at IS NULL AND (i.email_claimed_at IS NULL OR i.email_claimed_at<now()-interval '5 minutes')
  RETURNING i.*,o.reference,o.customer_user_id,o.payment_method,
  EXISTS(SELECT 1 FROM "user" u WHERE lower(u.email)=lower(i.customer_email)) AS has_account`,[id]);
 if(!invoice)return 'unchanged';
 const claim=invoice.email_claimed_at;
 try{
  if(!gmailConfigured())throw new Error('Gmail unavailable');
  const items=invoice.items.map(i=>`${i.name}${i.promotion_gift?' (free gift)':''}${i.option?` (${i.option_label||'Option'}: ${i.option})`:''} × ${i.quantity} @ ${peso(i.price_cents)} — ${peso(i.price_cents*i.quantity)}`);
  const promo=invoice.promotion;
  const links=invoice.customer_user_id||invoice.has_account
   ? `Open your CircuitByte dashboard to review your orders: ${new URL('/dashboard',origin)}`
   : `You're invited to create a free CircuitByte account for future orders and Project Studio: ${new URL('/dashboard?register=1',origin)}`;
  const lines=[
   `Hello ${invoice.customer_name},`, '', `Your CircuitByte order ${invoice.reference} has been completed.`,
   `Order invoice ${invoice.invoice_number}`,
   `Issued ${new Date(invoice.issued_at).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}`, '',
   ...items, '', ...(promo?[`Shop promo: ${promo.code}`]:[]),
   ...(promo?.discount_cents?[`Items subtotal: ${peso(promo.subtotal_cents)}`,`Discount: −${peso(promo.discount_cents)}`]:[]),
   ...(promo?.free_maxim?['Maxim delivery fee covered by CircuitByte.']:[]),
   `Total: ${peso(invoice.subtotal_cents)}`,
   `Payment: ${Number(invoice.subtotal_cents)===0?'No payment due':invoice.payment_method==='qrph'?'QR Ph':'Cash at handover'}`, '',
   `Bill to: ${invoice.customer_name}`,invoice.billing_address,
   invoice.customer_tin&&`Buyer TIN: ${invoice.customer_tin}`,
   `Seller: ${invoice.seller_name}`,invoice.seller_address,
   invoice.seller_tin&&`Seller TIN: ${invoice.seller_tin}`,invoice.notes, '',links
  ];
  // Keep the same message identifier across retries.
  await sendGmailMessage({to:invoice.customer_email,subject:`CircuitByte order invoice ${invoice.invoice_number}`,
   body:lines.filter(line=>line!==false).join('\n'),messageId:`<${invoice.invoice_number}@circuitbyte.vercel.app>`});
 }catch(e){
  await db().query(`UPDATE order_invoices SET email_failed_at=now(),email_claimed_at=NULL
    WHERE order_id=$1 AND email_claimed_at=$2`,[id,claim]);
  console.error('Invoice email failed:',e.code||e.name);
  return 'failed';
 }
 await db().query(`UPDATE order_invoices SET email_sent_at=now(),email_claimed_at=NULL,email_failed_at=NULL
   WHERE order_id=$1 AND email_claimed_at=$2`,[id,claim]);
 return 'sent';
}
