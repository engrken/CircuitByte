import {db} from '../../../../lib/db';
import {requireAdmin,sameOrigin} from '../../../../lib/auth';
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
   RETURNING *`,[p.id,p.name,p.description,p.categories,p.price_cents,p.stock,p.quantity_label,p.active]);
  await client.query('INSERT INTO product_audit(product_id,actor,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5)',[p.id,user.email,p.reason,JSON.stringify(before??null),JSON.stringify(result.rows[0])]);
  await client.query('COMMIT');transactionOpen=false;
  return Response.json(result.rows[0],{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  if(transactionOpen&&client)await client.query('ROLLBACK').catch(()=>{});
  console.error('Admin product save failed:',e.code||e.name);
  const message=e.code==='23505'?'A product with that ID already exists.':e.code==='23503'?'This product is referenced by existing records and could not be saved.':'The product could not be saved because of a database error. Please retry or contact the administrator.';
  return Response.json({error:message},{status:500,headers:{'Cache-Control':'no-store'}});
 }finally{client?.release();}
}
