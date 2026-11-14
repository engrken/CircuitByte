import {db} from '../../../../../lib/db.js';
import {requireAdmin,sameOrigin} from '../../../../../lib/auth.js';
import {synchronizePendingPrices} from '../route.js';

export const dynamic='force-dynamic';

// Explicit admin-only reconciliation for orders that predate the automatic sync fix.
export async function POST(req){
 let admin;
 try{sameOrigin(req);admin=await requireAdmin();}
 catch{return Response.json({error:'Admin sign-in required.'},{status:403});}
 const client=await db().connect();
 try{
  await client.query('BEGIN');
  const {rows:products}=await client.query('SELECT id,price_cents FROM products ORDER BY id');
  let repricedOrders=0;
  for(const product of products){
   repricedOrders+=await synchronizePendingPrices(client,product.id,Number(product.price_cents),admin.email);
  }
  await client.query('COMMIT');
  return Response.json({ok:true,repricedOrders,productsChecked:products.length},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  console.error('Pending order reconciliation failed:',error.code||error.name);
  return Response.json({error:'Unable to reconcile pending orders. Please retry.'},{status:500});
 }finally{client.release();}
}
