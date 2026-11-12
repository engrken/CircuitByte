import {createHash,randomBytes} from 'node:crypto';
import {db} from './db.js';
import {issueOrderInvoice} from './order-invoices.js';
import {OrderError,validateOrder,stockChange,transitions} from './order-rules.mjs';
import {priceShopCart} from './shop-promotions.js';
const shopOrderEmail=()=>process.env.ORDER_NOTIFICATION_EMAIL||process.env.ADMIN_EMAIL||process.env.GMAIL_SENDER_EMAIL||'';
const hash=v=>createHash('sha256').update(v).digest('hex');
function orderReceipt(o){
 return {reference:o.reference,status:o.status,payment_method:o.payment_method,
  fulfillment_method:o.fulfillment_method,total_cents:Number(o.total_cents),promotion:o.promotion};
}
export async function transaction(fn){const c=await db().connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function rateLimit(c,key,limit){const {rows}=await c.query(`INSERT INTO order_rate_limits(key,window_start,count) VALUES($1,now(),1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN order_rate_limits.window_start<now()-interval '1 hour' THEN 1 ELSE order_rate_limits.count+1 END,window_start=CASE WHEN order_rate_limits.window_start<now()-interval '1 hour' THEN now() ELSE order_rate_limits.window_start END RETURNING count`,[key]);if(rows[0].count>limit)throw new OrderError('Too many orders. Please try again later or contact CircuitByte.',429);}
export async function createOrder(body,ip,user,shopEmail=shopOrderEmail()){const p=validateOrder(body),tokenHash=hash(p.token);
 const invoice=body.invoice&&typeof body.invoice==='object'?body.invoice:{};
 const invoiceName=String(invoice.name||p.name).trim().slice(0,160)||p.name;
 const invoiceAddress=String(invoice.address||'').trim().slice(0,500),invoiceTin=String(invoice.tin||'').trim().slice(0,40);
 const requestHash=hash(JSON.stringify({...p,token:undefined,user:user.id,invoiceName,invoiceAddress,invoiceTin}));
 const legacyHash=hash(JSON.stringify({...p,token:undefined,paymentMethod:undefined,user:user.id}));return transaction(async c=>{
 // Serializes retries before checking the unique request ID.
 await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[p.requestId]);
 const existing=(await c.query('SELECT * FROM orders WHERE id=$1',[p.requestId])).rows[0];
 if(existing){if(existing.token_hash!==tokenHash||(existing.request_hash!==requestHash&&!(p.paymentMethod==='cash'&&!p.fulfillmentMethod&&existing.request_hash===legacyHash)))throw new OrderError('Checkout already submitted with different details',409);return orderReceipt(existing);}
 await rateLimit(c,'ip:'+hash(ip),20);await rateLimit(c,'contact:'+hash(p.contact.replace(/\D/g,'')),5);
 const {items,total,promotion}=await priceShopCart(c,p,{lock:true});
 if(promotion&&(promotion.id!==p.couponId||promotion.version!==p.couponVersion||total!==p.couponTotalCents)){
  throw new OrderError('This promotion changed. Apply the code again and review the new total.',409);
 }
 const buyerPaysDelivery=p.fulfillmentMethod==='lbc'||(p.fulfillmentMethod==='maxim'&&!promotion?.free_maxim);
 if(buyerPaysDelivery&&body.deliveryFeeAccepted!==true)throw new OrderError('Acknowledge that the separate courier shipping fee is paid by the buyer.');
 if(p.fulfillmentMethod==='lbc'&&total>0&&p.paymentMethod!=='qrph')throw new OrderError('LBC orders require QR Ph payment for the item total before dispatch.');
 if(total===0&&p.paymentMethod==='qrph')throw new OrderError('The items total is zero. Choose cash at handover to continue without a transfer.');
 const reference='CB-'+new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Manila'}).replaceAll('-','')+'-'+randomBytes(5).toString('hex').toUpperCase();
 const o=(await c.query(`INSERT INTO orders(id,reference,token_hash,request_hash,customer_name,customer_email,customer_user_id,invoice_customer_name,invoice_billing_address,invoice_tin,contact,proposed_location,notes,items,total_cents,payment_method,fulfillment_method,delivery_fee_acknowledged_at,promotion)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,CASE WHEN $18 THEN now() END,$19) RETURNING *`,
  [p.requestId,reference,tokenHash,requestHash,p.name,user.email,user.id,invoiceName,invoiceAddress,invoiceTin,p.contact,p.location,p.notes,JSON.stringify(items),total,p.paymentMethod,p.fulfillmentMethod??'meetup',buyerPaysDelivery,promotion])).rows[0];
 await c.query("INSERT INTO order_events(order_id,status,actor) VALUES($1,'Pending','Customer')",[o.id]);
 await c.query(`INSERT INTO order_notifications(order_id,kind,recipient)
  SELECT $1,kind,recipient FROM (VALUES ('customer',$2::text),('shop',$3::text)) AS n(kind,recipient)
  WHERE recipient<>''`,[o.id,user.email,shopEmail||'']);
 return orderReceipt(o);
 });}
export async function listCustomerOrders(userId){
 const {rows}=await db().query(`SELECT o.id,o.reference,o.items,o.total_cents,o.promotion,o.status,o.payment_method,o.payment_reference,
  o.payment_verified_at,o.qr_payment_opened_at,o.fulfillment_method,o.proposed_location,o.confirmed_location,o.customer_update,
  i.invoice_number FROM orders o LEFT JOIN order_invoices i ON i.order_id=o.id
  WHERE o.customer_user_id=$1 ORDER BY o.created_at DESC LIMIT 100`,[userId]);
 return rows;
}
export async function trackOrder(token){
 if(typeof token!=='string'||!/^[0-9a-f]{64}$/i.test(token))throw new OrderError('Invalid tracking code',404);
 const {rows:[order]}=await db().query('SELECT reference,status,updated_at FROM orders WHERE token_hash=$1',[hash(token)]);
 if(!order)throw new OrderError('Order not found. Check your private tracking code.',404);
 return order;
}
export async function updateOrder(p,actor){
 if(!p||typeof p.id!=='string'||!/^[0-9a-f-]{36}$/i.test(p.id)||!Number.isInteger(p.version)||!Object.hasOwn(transitions,p.status)||typeof p.confirmed_location!=='string'||p.confirmed_location.trim().length>300||typeof p.customer_update!=='string'||p.customer_update.trim().length>1000)throw new OrderError('Invalid order update');
 return transaction(async c=>{const before=(await c.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[p.id])).rows[0];if(!before)throw new OrderError('Order not found',404);if(before.version!==p.version)throw new OrderError('Order changed. Reload before updating.',409);
 if(['Completed','Cancelled'].includes(before.status))throw new OrderError('This order is closed',409);
 const qr=before.payment_method==='qrph';
 const opened=Boolean(before.qr_payment_opened_at);
 const openPayment=p.openQrPayment===true&&qr&&before.status==='Pending'&&p.status==='Pending'&&!opened;
 const verifyPayment=p.verifyPayment===true&&!before.payment_verified_at;
 if(verifyPayment&&(!qr||!before.payment_reference||p.status==='Cancelled'))throw new OrderError('Review the received QR Ph transfer before confirming payment.',409);
 if(qr&&before.status==='Pending'&&p.status==='Confirmed'&&!verifyPayment)throw new OrderError('Open QR Ph payment and verify the transfer before confirming.',409);
 if(p.status==='Completed'&&qr&&!before.payment_verified_at&&!verifyPayment)throw new OrderError('Verify the QR Ph transfer before completing this order.',409);
 const nextStatus=qr&&before.status==='Pending'&&verifyPayment?'Confirmed':p.status;
 const email=before.customer_user_id||p.customer_email===undefined?before.customer_email:String(p.customer_email||'').trim();
 if(email!==before.customer_email&&(email.length>200||(email&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))))throw new OrderError('Enter a valid customer email.');
 if(nextStatus!==before.status&&!transitions[before.status].includes(nextStatus))throw new OrderError('Invalid status transition',409);
 if((openPayment||['Confirmed','Ready','Completed'].includes(nextStatus))&&p.confirmed_location.trim().length<5)throw new OrderError(before.fulfillment_method==='maxim'?'Confirm the delivery address within Roxas City first.':'Confirm the meetup location within Roxas City first.');
 // While payment is open, keep the stock available to this buyer. Verification
 // converts that hold into the confirmed reservation without counting it twice.
 const stockFrom=before.status==='Pending'&&opened?'Confirmed':before.status;
 const stockTo=openPayment?'Confirmed':nextStatus==='Pending'&&opened?'Confirmed':nextStatus;
 if(stockTo!==stockFrom){const quantities=new Map();for(const i of before.items)quantities.set(i.id,(quantities.get(i.id)||0)+i.quantity);const products=(await c.query('SELECT * FROM products WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[Array.from(quantities.keys())])).rows;
 for(const [id,quantity] of quantities){const product=products.find(x=>x.id===id);if(!product)throw new OrderError('Product missing',409);const next=stockChange(stockFrom,stockTo,product,quantity);if(next.stock===product.stock&&next.reserved_stock===product.reserved_stock)continue;
 const after=(await c.query('UPDATE products SET stock=$2,reserved_stock=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[id,next.stock,next.reserved_stock])).rows[0];
 const reason=openPayment?'QR Ph payment opened':before.reference+': '+before.status+' → '+nextStatus;
 await c.query('INSERT INTO product_audit(product_id,actor,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5)',[id,actor,reason,JSON.stringify(product),JSON.stringify(after)]);}}
 const o=(await c.query('UPDATE orders SET status=$2,confirmed_location=$3,customer_update=$4,customer_email=$5,payment_verified_at=CASE WHEN $6 THEN now() ELSE payment_verified_at END,qr_payment_opened_at=CASE WHEN $7 THEN now() ELSE qr_payment_opened_at END,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[p.id,nextStatus,p.confirmed_location.trim(),p.customer_update.trim(),email,verifyPayment,openPayment])).rows[0];
 await c.query('INSERT INTO order_events(order_id,status,actor,note) VALUES($1,$2,$3,$4)',[p.id,nextStatus,actor,openPayment?'QR Ph payment opened':p.customer_update.trim()]);if(o.status==='Completed')await issueOrderInvoice(c,o,actor);
 return {order:orderReceipt(o),statusChanged:before.status!==o.status,paymentOpened:openPayment,paymentVerified:verifyPayment,email:o.customer_email};
 });}
export async function recordPaymentReference(id,reference,userId,shopEmail=shopOrderEmail()){
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)||typeof reference!=='string'||reference.length>100)throw new OrderError('Invalid payment details');
 const normalized=reference.trim().replace(/[\s-]/g,'').toUpperCase();
 if(!/^[A-Z0-9]{6,40}$/.test(normalized))throw new OrderError('Enter the transfer reference shown by your bank or e-wallet.');
 try{
  const {rows}=await db().query(`WITH matched_order AS (
   UPDATE orders SET payment_reference=$3,version=version+1,updated_at=now()
   WHERE id=$1 AND customer_user_id=$2 AND payment_method='qrph'
   AND (status IN ('Confirmed','Ready') OR (status='Pending' AND qr_payment_opened_at IS NOT NULL)) AND payment_verified_at IS NULL
   RETURNING id
  ), review_notice AS (
   INSERT INTO order_notifications(order_id,kind,recipient)
   SELECT id,'payment_review',$4 FROM matched_order WHERE $4<>'' ON CONFLICT DO NOTHING
  ) SELECT id FROM matched_order`,[id,userId,normalized,shopEmail]);
  if(!rows.length)throw new OrderError('This order is unavailable for QR Ph payment.',409);
 }catch(e){
  if(e.code==='23505')throw new OrderError('This transfer reference is already in use.',409);
  throw e;
 }
}
export function errorResponse(e){if(!(e instanceof OrderError))console.error('Order operation failed:',e.code||e.name);return Response.json({error:e instanceof OrderError?e.message:'Orders are temporarily unavailable. Please try again.'},{status:e instanceof OrderError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}
export async function readBody(req){const text=await req.text();if(text.length>20000)throw new OrderError('Request too large',413);try{return JSON.parse(text);}catch{throw new OrderError('Invalid request');}}
