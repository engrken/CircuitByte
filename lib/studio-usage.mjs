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
