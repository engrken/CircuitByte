import {requireUser,sameOrigin} from '../../../../lib/auth.js';
import {errorResponse,readBody} from '../../../../lib/orders.js';
import {quoteShopPromotion} from '../../../../lib/shop-promotions.js';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

export async function POST(request){
 try{sameOrigin(request);await requireUser();}catch{
  return Response.json({error:'Sign in with a verified account to apply a Shop promo.'},{status:403,headers});
 }
 try{return Response.json(await quoteShopPromotion(await readBody(request)),{headers});}
 catch(error){return errorResponse(error);}
}
