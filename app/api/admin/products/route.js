import {db} from '../../../../lib/db.js';
import {requireAdmin,sameOrigin} from '../../../../lib/auth.js';
import {z} from 'zod';

const schema=z.object({
 id:z.string().min(1).max(80),name:z.string().trim().min(1).max(200),
 description:z.string().max(10000),
 categories:z.array(z.enum(['components','sensors','modules','motors','boards','tools'])).min(1),
 price_cents:z.number().int().min(0).max(100000000),
 stock:z.number().int().min(0).max(1000000).nullable(),
 quantity_label:z.string().max(200),active:z.boolean(),
 version:z.number().int().min(0),reason:z.string().trim().min(1).max(500)
});

// Reprice only unreviewed lines of unpaid Pending orders, atomically with the catalog edit.
// A confirmed line is a price commitment, even when the overall order is still Pending.
async function synchronizePendingPrices(client,productId,newPrice,actor){
 const {rows:orders}=await client.query(`SELECT id,reference,items,total_cents,promotion FROM orders
  WHERE status='Pending' AND deleted_at IS NULL AND qr_payment_opened_at IS NULL
   AND payment_reference IS NULL AND payment_verified_at IS NULL
   AND items @> $1::jsonb ORDER BY id FOR UPDATE`,[JSON.stringify([{id:productId}])]);
 let changed=0;
 for(const order of orders){
  let modified=false;
  const items=order.items.map(item=>{
   if(item.id!==productId||item.review_status==='confirmed'||item.promotion_gift||item.price_cents===newPrice)return item;
   modified=true;return {...item,price_cents:newPrice};
  });
  if(!modified)continue;
  const subtotal=items.reduce((sum,item)=>sum+item.price_cents*item.quantity,0);
  let promotion=order.promotion,discount=0;
  if(promotion){
   if(promotion.kind==='percent'){
    const oldSubtotal=Number(promotion.subtotal_cents)||0;
    // Preserve the agreed effective discount rate without querying a potentially edited promotion.
    discount=oldSubtotal>0?Math.min(subtotal,Math.round(subtotal*Number(promotion.discount_cents)/oldSubtotal)):0;
   }else if(promotion.kind==='fixed'){
    discount=Math.min(subtotal,Number(promotion.discount_cents)||0);
   }
   promotion={...promotion,subtotal_cents:subtotal,discount_cents:discount};
  }
  const total=subtotal-discount;
  await client.query('UPDATE orders SET items=$2,total_cents=$3,promotion=$4,version=version+1,updated_at=now() WHERE id=$1',
   [order.id,JSON.stringify(items),total,promotion?JSON.stringify(promotion):null]);
  await client.query('INSERT INTO order_events(order_id,status,actor,note) VALUES($1,$2,$3,$4)',
   [order.id,'Pending',actor,'Catalog price updated for unconfirmed item; revised order total: PHP '+(total/100).toFixed(2)]);
  changed++;
 }
 return changed;
}

export const dynamic='force-dynamic';

export async function GET(){
 try{await requireAdmin();}catch{return Response.json({error:'Admin sign-in required. Please sign in again.'},{status:401,headers:{'Cache-Control':'no-store'}});}
 try{
  const {rows}=await db().query('SELECT * FROM products ORDER BY name');
  return Response.json(rows,{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('Admin product list failed:',e.code||e.name);
  return Response.json({error:'Products could not be loaded from the database. Refresh and retry.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}

export async function POST(req){
 let user;
 try{sameOrigin(req);user=await requireAdmin();}
 catch{return Response.json({error:'Your admin session may have expired. Sign in again and retry.'},{status:403,headers:{'Cache-Control':'no-store'}});}
 let body;
 try{body=await req.json();}
 catch{return Response.json({error:'The product form could not be read. Refresh and retry.'},{status:400});}
 const parsed=schema.safeParse(body);
 if(!parsed.success){
  const detail=parsed.error.issues.map(x=>`${x.path.join('.')||'Product'}: ${x.message}`).join('; ');
  return Response.json({error:'Please correct the product details. '+detail},{status:400});
 }
 const p=parsed.data;let client=null,transactionOpen=false;
 try{
  client=await db().connect();
  await client.query('BEGIN');transactionOpen=true;
  const before=(await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE',[p.id])).rows[0];
  if((before?.version??0)!==p.version){
   await client.query('ROLLBACK');transactionOpen=false;
   return Response.json({error:'This product changed since you opened it. Reload the product and retry.'},{status:409});
  }
  if(before?.reserved_stock>0&&(p.stock===null||p.stock<before.reserved_stock)){
   await client.query('ROLLBACK');transactionOpen=false;
   return Response.json({error:`Stock cannot be less than the ${before.reserved_stock} units reserved for open orders.`},{status:409});
  }
  const result=await client.query(`
   INSERT INTO products(id,name,description,categories,price_cents,stock,quantity_label,active,version)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,1)
   ON CONFLICT(id) DO UPDATE SET name=$2,description=$3,categories=$4,price_cents=$5,
    stock=$6,quantity_label=$7,active=$8,version=products.version+1,updated_at=now()
   WHERE products.version=$9
   RETURNING *`,[p.id,p.name,p.description,p.categories,p.price_cents,p.stock,p.quantity_label,p.active,p.version]);
  if(!result.rows.length){
   await client.query('ROLLBACK');transactionOpen=false;
   return Response.json({error:'This product changed while saving. Refresh inventory and retry.'},{status:409});
  }
  await client.query('INSERT INTO product_audit(product_id,actor,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5)',[p.id,user.email,p.reason,JSON.stringify(before??null),JSON.stringify(result.rows[0])]);
  const repricedOrders=before&&before.price_cents!==p.price_cents
   ?await synchronizePendingPrices(client,p.id,p.price_cents,user.email):0;
  await client.query('COMMIT');transactionOpen=false;
  return Response.json({...result.rows[0],repriced_orders:repricedOrders},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  if(transactionOpen&&client)await client.query('ROLLBACK').catch(()=>{});
  console.error('Admin product save failed:',e.code||e.name);
  const message=e.code==='23505'?'A product with that ID already exists.':e.code==='23503'?'This product is referenced by existing records and could not be saved.':'The product could not be saved because of a database error. Please retry or contact the administrator.';
  return Response.json({error:message},{status:500,headers:{'Cache-Control':'no-store'}});
 }finally{client?.release();}
}
