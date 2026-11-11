import {put,del} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import {requireAdmin,sameOrigin} from '../../../../lib/auth.js';
import {db} from '../../../../lib/db.js';
import {transaction} from '../../../../lib/orders.js';

const headers={'Cache-Control':'private, no-store'};
const fail=(error,status)=>Response.json({error},{status,headers});
class StaleProduct extends Error {}

export async function POST(req){
 let user;
 try{sameOrigin(req);user=await requireAdmin();}catch{return fail('Unauthorized',403);}
 let data;
 try{data=await req.formData();}catch{return fail('The photo upload could not be read.',400);}
 const file=data.get('file'),id=data.get('id'),version=Number(data.get('version'));
 if(typeof id!=='string'||!id||id.length>80||!Number.isInteger(version)||version<1)return fail('Reload this product before uploading.',400);
 if(!file||typeof file.arrayBuffer!=='function'||!file.size||file.size>3000000)return fail('Choose an image under 3 MB.',400);
 let blob;
 try{
  const bytes=Buffer.from(await file.arrayBuffer());
  const ext=bytes.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':
   bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':
    bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;
  if(!ext)return fail('Choose a JPEG, PNG or WebP image.',400);

  const {rows:[current]}=await db().query('SELECT version FROM products WHERE id=$1',[id]);
  if(current?.version!==version)return fail('Reload this product before uploading.',409);
  blob=await put(`products/${randomUUID()}.${ext}`,bytes,{access:'public',contentType:ext==='jpg'?'image/jpeg':`image/${ext}`});
  const product=await transaction(async client=>{
   const {rows:[before]}=await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE',[id]);
   if(before?.version!==version)throw new StaleProduct();
   const {rows:[after]}=await client.query('UPDATE products SET image_url=$1,version=version+1,updated_at=now() WHERE id=$2 RETURNING *',[blob.url,id]);
   await client.query('INSERT INTO product_audit(product_id,actor,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5)',
    [id,user.email,'Photo replaced',JSON.stringify(before),JSON.stringify(after)]);
   return after;
  });
  return Response.json(product,{headers});
 }catch(error){
  if(blob){
   // A lost COMMIT response may still mean the photo is in use.
   try{
    const {rows:[product]}=await db().query('SELECT image_url FROM products WHERE id=$1',[id]);
    if(product?.image_url!==blob.url)await del(blob.url);
   }catch(cleanupError){console.error('Product photo cleanup failed:',cleanupError.code||cleanupError.name);}
  }
  if(error instanceof StaleProduct)return fail('Reload this product before uploading.',409);
  console.error('Product photo upload failed:',error.code||error.name);
  return fail('Upload failed. Please retry.',500);
 }
}
