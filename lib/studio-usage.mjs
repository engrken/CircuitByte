import {db} from './db.js';
const LIMITS={ai:30,compile:50};
export async function readStudentQuota(userId){
 const period=new Date().toISOString().slice(0,7);
 const {rows}=await db().query('SELECT operation,used FROM studio_usage_monthly WHERE user_id=$1 AND period=$2',[userId,period]);
 return {period,timeZone:'UTC',...Object.fromEntries(Object.entries(LIMITS).map(([operation,limit])=>{
  const used=Number(rows.find(row=>row.operation===operation)?.used||0);
  return [operation,{used,limit,remaining:Math.max(0,limit-used)}];
 }))};
}
export async function consumeStudentQuota(userId,operation){
 if(!Object.hasOwn(LIMITS,operation))throw Error('Unsupported quota operation');
 const period=new Date().toISOString().slice(0,7);
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
