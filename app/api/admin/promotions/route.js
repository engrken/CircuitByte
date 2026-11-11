import {requireAdmin,sameOrigin} from '../../../../lib/auth.js';
import {errorResponse,readBody} from '../../../../lib/orders.js';
import {listShopPromotions,saveShopPromotion} from '../../../../lib/shop-promotions.js';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

export async function GET(request){
 try{await requireAdmin();}catch{return Response.json({error:'Sign in as an administrator.'},{status:401,headers});}
 try{
  const offset=Math.max(0,Math.min(100000,Number.parseInt(new URL(request.url).searchParams.get('offset'),10)||0));
  return Response.json(await listShopPromotions(offset),{headers});
 }catch(error){return errorResponse(error);}
}

export async function POST(request){
 let admin;
 try{sameOrigin(request);admin=await requireAdmin();}catch{return Response.json({error:'Administrator access required.'},{status:403,headers});}
 try{
  const body=await readBody(request);
  const promotion=await saveShopPromotion(body,admin.email);
  return Response.json({promotion},{status:body.id?200:201,headers});
 }catch(error){return errorResponse(error);}
}
