import {db} from './db';
const LIMITS={ai:15,compile:25};
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
