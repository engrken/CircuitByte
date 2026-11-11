import {db} from './db.js';
import {gmailConfigured,sendGmailMessage} from './studio-email.mjs';

const currency=new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'});
export async function deliverOrderNotifications(id,origin){
 const {rows}=await db().query(`UPDATE order_notifications n
  SET claimed_at=date_trunc('milliseconds',clock_timestamp())
  FROM orders o WHERE n.order_id=$1 AND n.order_id=o.id AND n.sent_at IS NULL
  AND (n.claimed_at IS NULL OR n.claimed_at<now()-interval '5 minutes')
  RETURNING n.kind,n.recipient,n.claimed_at,o.reference,o.customer_name,o.total_cents,o.payment_method`,[id]);
 const results=await Promise.allSettled(rows.map(async notice=>{
  const {kind,reference,recipient,claimed_at}=notice;
  const shop=kind!=='customer';
  const review=kind==='payment_review';
  const total=currency.format(Number(notice.total_cents)/100);
  const payment=notice.payment_method==='qrph'?'QR Ph':'Cash at handover';
  const path=shop?'/admin/orders':'/dashboard';
  const next=review?'Match the reference and amount against the payment received, then verify it in Orders.':
   shop?'Open Orders to review stock and fulfillment.':'Open My Orders to see updates and payment instructions.';
  const introduction=review?'A buyer submitted a QR Ph transfer reference.':
   shop?`A new order was placed by ${notice.customer_name}.`:`Hi ${notice.customer_name}, we received your order.`;
  try{
   if(!gmailConfigured())throw Error('Order email is unavailable');
   await sendGmailMessage({
    to:recipient,subject:review?`QR Ph payment to review: ${reference}`:shop?`New CircuitByte order ${reference}`:`CircuitByte order received: ${reference}`,
    body:`${introduction}\n\nOrder: ${reference}\nTotal: ${total}\nPayment: ${payment}\n\n${next}\n${new URL(path,origin)}\n\nCircuitByte`,
    messageId:`<${reference}-${kind}@circuitbyte.vercel.app>`
   });
  }catch(error){
   await db().query(`UPDATE order_notifications SET failed_at=now(),claimed_at=NULL
    WHERE order_id=$1 AND kind=$2 AND claimed_at=$3`,[id,kind,claimed_at]);
   console.error('Order email failed:',kind,error.code||error.name);
   return;
  }
  await db().query(`UPDATE order_notifications SET sent_at=now(),claimed_at=NULL,failed_at=NULL
   WHERE order_id=$1 AND kind=$2 AND claimed_at=$3`,[id,kind,claimed_at]);
 }));
 for(const result of results)if(result.status==='rejected')console.error('Could not record order email delivery:',result.reason?.code||result.reason?.name);
}
