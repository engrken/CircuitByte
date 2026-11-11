import {db} from './db.js';
import {OrderError} from './order-rules.mjs';
import {sendGmailMessage} from './studio-email.mjs';

export async function listPendingAccounts(offset){
 const [{rows},{rows:recent}]=await Promise.all([
  db().query(`SELECT id,name,email,"createdAt" FROM "user" WHERE NOT "emailVerified"
   ORDER BY "createdAt",id LIMIT 41 OFFSET $1`,[offset]),
  db().query(`SELECT v.user_id,u.name,v.email,v.verified_by,v.reason,v.verified_at,
   CASE WHEN v.sent_at IS NOT NULL THEN 'sent' WHEN v.failed_at IS NOT NULL THEN 'failed' ELSE 'pending' END AS delivery
   FROM account_manual_verifications v JOIN "user" u ON u.id=v.user_id
   ORDER BY (v.sent_at IS NOT NULL),v.verified_at DESC LIMIT 40`)
 ]);
 return {pending:rows.slice(0,40),recent,hasMore:rows.length>40};
}

export async function manuallyVerifyAccount(id,reason,actor){
 if(typeof reason!=='string'||reason.trim().length<5||reason.trim().length>300){
  throw new OrderError('Enter a brief reason for the account verification.');
 }
 const {rows:[account]}=await db().query(`WITH verified AS (
  UPDATE "user" SET "emailVerified"=true,"updatedAt"=now()
  WHERE id=$1 AND NOT "emailVerified" RETURNING id,email
 ), revoked AS (
  DELETE FROM "session" WHERE "userId" IN (SELECT id FROM verified)
 ), recorded AS (
  INSERT INTO account_manual_verifications(user_id,email,verified_by,reason)
  SELECT id,email,$2,$3 FROM verified RETURNING user_id
 ) SELECT user_id FROM recorded`,[id,actor,reason.trim()]);
 if(!account)throw new OrderError('This account is no longer pending verification. Refresh the list.',409);
 return account;
}

export async function deliverManualVerification(id,origin){
 const {rows:[claim]}=await db().query(`UPDATE account_manual_verifications SET claimed_at=date_trunc('milliseconds',clock_timestamp())
  WHERE user_id=$1 AND sent_at IS NULL AND (claimed_at IS NULL OR claimed_at<now()-interval '5 minutes')
  RETURNING email,claimed_at`,[id]);
 if(!claim){
  const {rows:[row]}=await db().query('SELECT sent_at FROM account_manual_verifications WHERE user_id=$1',[id]);
  return row?(row.sent_at?'sent':'pending'):'missing';
 }
 try{
  await sendGmailMessage({to:claim.email,subject:'Your CircuitByte account is verified',
   body:`Your CircuitByte account has been verified by an administrator. Sign in to My Dashboard to place Shop orders and use Project Studio.\n\n${new URL('/dashboard',origin)}\n\nCircuitByte`,
   messageId:`<account-verified-${id}@circuitbyte.vercel.app>`});
 }catch(error){
  await db().query(`UPDATE account_manual_verifications SET failed_at=now(),claimed_at=NULL
   WHERE user_id=$1 AND claimed_at=$2`,[id,claim.claimed_at]);
  console.error('Account verification notice failed:',error.code||error.name);
  return 'failed';
 }
 await db().query(`UPDATE account_manual_verifications SET sent_at=now(),claimed_at=NULL,failed_at=NULL
  WHERE user_id=$1 AND claimed_at=$2`,[id,claim.claimed_at]);
 return 'sent';
}
