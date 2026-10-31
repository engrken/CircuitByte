import {db} from './db.js';
import {gmailConfigured,sendGmailMessage,studioInvitationMessage} from './studio-email.mjs';

// Checkout remains successful even if email is offline. Delivery is an idempotent,
// opt-in outbox process; retry is permitted only after a failed or abandoned claim.
export function studioInvitesReady(env=process.env){
 return env.STUDIO_ORDER_INVITES_ENABLED==='true'&&gmailConfigured(env);
}
export async function dispatchStudioInvite(orderId,origin,{env=process.env,query=db().query.bind(db()),send=sendGmailMessage}={}){
 if(!studioInvitesReady(env))return 'queued';
 const claim=await query(
  "UPDATE studio_order_invites SET state='sending',locked_at=now(),attempts=attempts+1 "+
  "WHERE order_id=$1 AND (state='pending' OR (state='sending' AND locked_at<now()-interval '15 minutes')) "+
  "AND attempts<5 RETURNING email",
  [orderId]
 );
 if(!claim.rows.length)return 'unchanged';
 const recipient=claim.rows[0].email;
 try{
  const ref=await query('SELECT reference FROM orders WHERE id=$1',[orderId]);
  const message=studioInvitationMessage(recipient,{reference:ref.rows[0]?.reference,baseUrl:origin});
  await send(message,{env});
  await query("UPDATE studio_order_invites SET state='sent',sent_at=now(),locked_at=NULL WHERE order_id=$1",[orderId]);
  return 'sent';
 }catch(err){
  // Deliberately avoid logging email addresses, customer details, tokens or Gmail credentials.
  await query("UPDATE studio_order_invites SET state='pending',locked_at=NULL WHERE order_id=$1 AND state='sending'",[orderId]).catch(()=>{});
  throw Error('Studio invitation could not be delivered');
 }
}
