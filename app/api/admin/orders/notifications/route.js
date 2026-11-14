import {requireAdmin,sameOrigin} from '../../../../../lib/auth';
import {errorResponse,readBody} from '../../../../../lib/orders';
import {gmailMethod,verifyGmailSender} from '../../../../../lib/studio-email.mjs';
import {db} from '../../../../../lib/db.js';
import {deliverOrderNotifications} from '../../../../../lib/order-notifications.js';

export const dynamic='force-dynamic';
export async function GET(){
 try{await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:401});}
 const method=gmailMethod();
 if(!method)return Response.json({configured:false,ready:false,error:'Gmail sender credentials are incomplete.'},{headers:{'Cache-Control':'private, no-store'}});
 if(method==='oauth2')return Response.json({configured:true,method,ready:null,note:'OAuth configured; actual delivery requires a send test.'},{headers:{'Cache-Control':'private, no-store'}});
 try{await verifyGmailSender();return Response.json({configured:true,method,ready:true},{headers:{'Cache-Control':'private, no-store'}});}
 catch(error){console.error('Shop mail SMTP verification failed:',error.code||error.name);return Response.json({configured:true,method,ready:false,error:'SMTP authentication or connectivity failed. Check server logs and sender credentials.'},{headers:{'Cache-Control':'private, no-store'}});}
}
export async function POST(req){
 try{sameOrigin(req);await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 try{
  const body=await readBody(req);
  if(typeof body?.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))return Response.json({error:'Invalid order'},{status:400});
  await deliverOrderNotifications(body.id,process.env.BETTER_AUTH_URL||new URL(req.url).origin);
  const {rows}=await db().query('SELECT kind,CASE WHEN sent_at IS NOT NULL THEN \'sent\' WHEN failed_at IS NOT NULL THEN \'failed\' ELSE \'pending\' END AS state FROM order_notifications WHERE order_id=$1',[body.id]);
  return Response.json({ok:rows.length>0&&rows.every(x=>x.state==='sent'),notifications:Object.fromEntries(rows.map(x=>[x.kind,x.state]))},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return errorResponse(e);}
}
