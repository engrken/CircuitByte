import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {requireUser} from '../../../../../lib/auth.js';
import {db} from '../../../../../lib/db.js';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};

export async function GET(req){
 let user;
 try{user=await requireUser();}catch{return new Response(null,{status:401,headers});}
 const id=new URL(req.url).searchParams.get('id');
 if(!id||!/^[0-9a-f-]{36}$/i.test(id))return new Response(null,{status:404,headers});
 try{
  const {rows}=await db().query(`SELECT 1 FROM orders WHERE id=$1 AND customer_user_id=$2 AND payment_method='qrph'
   AND payment_verified_at IS NULL AND (status IN ('Confirmed','Ready') OR (status='Pending' AND qr_payment_opened_at IS NOT NULL))`,[id,user.id]);
  if(!rows.length)return new Response(null,{status:404,headers});
  const qr=await readFile(join(process.cwd(),'assets','circuitbyte-qrph.jpg'));
  return new Response(qr,{headers:{...headers,'Content-Type':'image/jpeg'}});
 }catch(error){
  console.error('Payment QR unavailable:',error.code||error.name);
  return new Response(null,{status:503,headers});
 }
}
