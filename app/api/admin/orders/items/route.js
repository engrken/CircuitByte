import {requireAdmin,sameOrigin} from '../../../../../lib/auth.js';
import {readBody,errorResponse,reviewOrderItem} from '../../../../../lib/orders.js';
export const dynamic='force-dynamic';
export async function POST(req){
 let admin;
 try{sameOrigin(req);admin=await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 try{
  const body=await readBody(req);
  const result=await reviewOrderItem(body,admin.email);
  return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return errorResponse(e);}
}
