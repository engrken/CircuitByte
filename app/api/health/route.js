import {db} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
  const started=Date.now();
  try{
    await db().query('SELECT 1');
    return Response.json({status:'ok',database:'reachable',durationMs:Date.now()-started},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({status:'degraded',database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
