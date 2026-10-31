import {db} from '../../../../lib/db';
import {requireAdmin,sameOrigin} from '../../../../lib/auth';
import {dispatchStudioInvite,studioInvitesReady} from '../../../../lib/studio-invites';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(){
 try{await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 const result=await db().query(
  "SELECT i.order_id,i.email,i.state,i.attempts,i.created_at,i.sent_at,o.reference FROM studio_order_invites i JOIN orders o ON o.id=i.order_id ORDER BY i.created_at DESC LIMIT 100"
 );
 return Response.json({ready:studioInvitesReady(),invites:result.rows},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request){
 try{sameOrigin(request);await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 if(!studioInvitesReady())return Response.json({error:'Gmail invitations are not enabled or Gmail OAuth2 settings are incomplete.'},{status:503});
 let orderId;
 try{({orderId}=z.object({orderId:z.string().uuid()}).parse(await request.json()));}
 catch{return Response.json({error:'Invalid order ID'},{status:400});}
 const existing=await db().query('SELECT order_id FROM studio_order_invites WHERE order_id=$1',[orderId]);
 if(!existing.rowCount)return Response.json({error:'No customer opted in on this order.'},{status:404});
 try{
  const result=await dispatchStudioInvite(orderId,new URL(request.url).origin);
  return Response.json({delivery:result},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Invitation delivery failed; keep the request pending for another attempt.'},{status:502});}
}
