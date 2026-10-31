import {sameOrigin} from '../../../lib/auth';
import {createOrder,errorResponse,readBody} from '../../../lib/orders';
import {dispatchStudioInvite} from '../../../lib/studio-invites';
export const dynamic='force-dynamic';
export async function POST(req){
 try{sameOrigin(req);}catch{return Response.json({error:'Invalid origin'},{status:403});}
 try{
  const body=await readBody(req);
  const order=await createOrder(body,req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown');
  let invitation='not-requested';
  if(body.studioInvite===true){
   invitation='queued';
   try{invitation=await dispatchStudioInvite(body.requestId,new URL(req.url).origin);}
   catch{/* Email failure never reverses or duplicates an already accepted order. */}
  }
  return Response.json({...order,studioInvitation:invitation},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return errorResponse(e);}
}
