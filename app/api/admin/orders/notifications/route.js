import {requireAdmin,sameOrigin} from '../../../../../lib/auth';
import {errorResponse,readBody} from '../../../../../lib/orders';
import {deliverOrderNotifications} from '../../../../../lib/order-notifications.js';

export const dynamic='force-dynamic';
export async function POST(req){
 try{sameOrigin(req);await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 try{
  const body=await readBody(req);
  if(typeof body?.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))return Response.json({error:'Invalid order'},{status:400});
  await deliverOrderNotifications(body.id,process.env.BETTER_AUTH_URL||new URL(req.url).origin);
  return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return errorResponse(e);}
}
