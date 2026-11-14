import {requireAdmin,sameOrigin} from '../../../../../lib/auth.js';
import {readBody,errorResponse,reviewOrderItem} from '../../../../../lib/orders.js';
import {db} from '../../../../../lib/db.js';
import {sendGmailMessage,gmailConfigured} from '../../../../../lib/studio-email.mjs';
export const dynamic='force-dynamic';
export async function POST(req){
 let admin;
 try{sameOrigin(req);admin=await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 try{
  const body=await readBody(req);
  const result=await reviewOrderItem(body,admin.email);
  let notification='not_required';
  if(result.action==='remove'){
   const {rows:[order]}=await db().query('SELECT customer_email,reference FROM orders WHERE id=$1',[body.id]);
   if(order?.customer_email){
    if(!gmailConfigured())notification='not_configured';
    else try{
     await sendGmailMessage({to:order.customer_email,subject:'CircuitByte order revised: '+order.reference,
      body:'An item was removed from your order: '+result.item+'\\nReason: '+(body.reason||'Order adjustment')+'\\nUpdated items total: PHP '+(result.order.total_cents/100).toFixed(2)+'\\nPlease review your updated order in My Orders.\\n'+new URL('/dashboard',process.env.BETTER_AUTH_URL||new URL(req.url).origin)});
     notification='sent';
    }catch(e){notification='failed';console.error('Item removal notification failed:',e.code||e.name);}
   }
  }
  return Response.json({...result,notification},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return errorResponse(e);}
}
