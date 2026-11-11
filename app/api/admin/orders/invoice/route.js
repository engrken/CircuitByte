import {requireAdmin,sameOrigin} from '../../../../../lib/auth';
import {db} from '../../../../../lib/db';
import {transaction,readBody,errorResponse} from '../../../../../lib/orders';
import {deliverOrderInvoice,issueOrderInvoice} from '../../../../../lib/order-invoices.js';
import {OrderError} from '../../../../../lib/order-rules.mjs';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

export async function POST(req){
 let admin;
 try{sameOrigin(req);admin=await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403,headers});}
 try{
  const body=await readBody(req);
  if(typeof body?.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))throw new OrderError('Invalid order');
  const details={};
  for(const [field,limit] of Object.entries({name:160,address:500,tin:40,notes:500})){
   if(typeof body[field]==='string')details[field]=body[field].trim().slice(0,limit);
  }
  const email=typeof body.email==='string'?body.email.trim():undefined;
  if(email!==undefined&&(email.length>200||(email&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))))throw new OrderError('Enter a valid customer email.');
  const invoice=await transaction(async c=>{
   const {rows:[order]}=await c.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[body.id]);
   if(!order)throw new OrderError('Order not found',404);
   if(order.status!=='Completed')throw new OrderError('Complete this order before issuing an invoice.',409);
   if(email&&!order.customer_user_id&&!order.customer_email){
    await c.query('UPDATE orders SET customer_email=$2,version=version+1 WHERE id=$1',[order.id,email]);
    await c.query("UPDATE order_invoices SET customer_email=$2 WHERE order_id=$1 AND customer_email=''",[order.id,email]);
    order.customer_email=email;
   }
   return issueOrderInvoice(c,order,admin.email,details);
  });
  const delivery=await deliverOrderInvoice(body.id,process.env.BETTER_AUTH_URL||new URL(req.url).origin);
  const {rows:[latest]}=await db().query(`SELECT * FROM order_invoices WHERE order_id=$1`,[body.id]);
  return Response.json({invoice:latest||invoice,delivery},{headers});
 }catch(e){return errorResponse(e);}
}
