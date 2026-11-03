import {randomUUID} from 'node:crypto';
import {db} from './db.js';
import {STUDENT_UAT,requireStudentUat,studentUsagePeriod} from './studio-uat.mjs';
const LIMITS={ai:STUDENT_UAT.limits.ai,compile:STUDENT_UAT.limits.compile};
export async function readStudentQuota(userId){
 const period=studentUsagePeriod();
 const {rows}=await db().query('SELECT operation,used FROM studio_usage_monthly WHERE user_id=$1 AND period=$2',[userId,period]);
 return {period,timeZone:STUDENT_UAT.timeZone,...Object.fromEntries(Object.entries(LIMITS).map(([operation,limit])=>{
  const used=Number(rows.find(row=>row.operation===operation)?.used||0);
  return [operation,{used,limit,remaining:Math.max(0,limit-used)}];
 }))};
}
export async function consumeStudentQuota(userId,operation){
 if(!Object.hasOwn(LIMITS,operation))throw Error('Unsupported quota operation');
 requireStudentUat();
 const period=studentUsagePeriod();
 const client=await db().connect();
 try{
  await client.query('BEGIN');
  const result=await client.query(`INSERT INTO studio_usage_monthly(user_id,period,operation,used)
 VALUES($1,$2,$3,1)
 ON CONFLICT(user_id,period,operation) DO UPDATE
 SET used=studio_usage_monthly.used+1,updated_at=now()
 WHERE studio_usage_monthly.used < $4
 RETURNING used`,[userId,period,operation,LIMITS[operation]]);
  await client.query('COMMIT');
  return {allowed:result.rowCount===1,used:result.rows[0]?.used??LIMITS[operation],limit:LIMITS[operation],period};
 }catch(e){try{await client.query('ROLLBACK');}catch{}throw e;}finally{client.release();}
}

// Lock the monthly row in both operations, never across the actual build.
export async function reserveStudentQuota(userId,operation){
 if(!Object.hasOwn(LIMITS,operation))throw Error('Unsupported quota operation');
 requireStudentUat();
 const period=studentUsagePeriod(),limit=LIMITS[operation],client=await db().connect();
 try{
  await client.query('BEGIN');
  await client.query(`INSERT INTO studio_usage_monthly(user_id,period,operation,used) VALUES($1,$2,$3,0) ON CONFLICT DO NOTHING`,[userId,period,operation]);
  const {rows:[row]}=await client.query('SELECT used FROM studio_usage_monthly WHERE user_id=$1 AND period=$2 AND operation=$3 FOR UPDATE',[userId,period,operation]);
  const {rows:[pending]}=await client.query("SELECT count(*) AS count FROM studio_usage_reservations WHERE user_id=$1 AND period=$2 AND operation=$3 AND status='pending' AND expires_at>now()",[userId,period,operation]);
  const allowed=Number(row.used)+Number(pending.count)<limit,id=allowed?randomUUID():null;
  if(allowed)await client.query('INSERT INTO studio_usage_reservations(id,user_id,period,operation) VALUES($1,$2,$3,$4)',[id,userId,period,operation]);
  await client.query('COMMIT');
  return {allowed,id,userId,period,operation,used:Number(row.used),limit};
 }catch(e){try{await client.query('ROLLBACK');}catch{}throw e;}finally{client.release();}
}
export async function settleStudentQuota(reservation,success){
 const {id,userId,period,operation}=reservation,client=await db().connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT used FROM studio_usage_monthly WHERE user_id=$1 AND period=$2 AND operation=$3 FOR UPDATE',[userId,period,operation]);
  const result=await client.query(`UPDATE studio_usage_reservations SET status=$5 WHERE id=$1 AND user_id=$2 AND period=$3 AND operation=$4 AND status='pending' AND expires_at>now() RETURNING id`,[id,userId,period,operation,success?'success':'failed']);
  if(success&&result.rowCount===1)await client.query('UPDATE studio_usage_monthly SET used=used+1,updated_at=now() WHERE user_id=$1 AND period=$2 AND operation=$3',[userId,period,operation]);
  await client.query('COMMIT');
  return success&&result.rowCount===1;
 }catch(e){try{await client.query('ROLLBACK');}catch{}throw e;}finally{client.release();}
}
