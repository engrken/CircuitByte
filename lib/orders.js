import {createHash,randomBytes} from 'node:crypto';
import {db} from './db.js';
import {OrderError,validateOrder,snapshotItems,stockChange,transitions} from './order-rules.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
export function publicOrder(o){return {reference:o.reference,status:o.status,items:o.items,total_cents:Number(o.total_cents),proposed_location:o.proposed_location,confirmed_location:o.confirmed_location,customer_update:o.customer_update,created_at:o.created_at,updated_at:o.updated_at};}
export async function transaction(fn){const c=await db().connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function rateLimit(c,key,limit){const {rows}=await c.query(`INSERT INTO order_rate_limits(key,window_start,count) VALUES($1,now(),1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN order_rate_limits.window_start<now()-interval '1 hour' THEN 1 ELSE order_rate_limits.count+1 END,window_start=CASE WHEN order_rate_limits.window_start<now()-interval '1 hour' THEN now() ELSE order_rate_limits.window_start END RETURNING count`,[key]);if(rows[0].count>limit)throw new OrderError('Too many orders. Please try again later or contact CircuitByte.',429);}
export async function createOrder(body,ip){const p=validateOrder(body),tokenHash=hash(p.token),requestHash=hash(JSON.stringify({...p,token:undefined}));return transaction(async c=>{
 // Serializes retries before checking the unique request ID.
 await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[p.requestId]);
 const existing=(await c.query('SELECT * FROM orders WHERE id=$1',[p.requestId])).rows[0];
 if(existing){if(existing.token_hash!==tokenHash||existing.request_hash!==requestHash)throw new OrderError('Checkout already submitted with different details',409);return publicOrder(existing);}
 await rateLimit(c,'ip:'+hash(ip),20);await rateLimit(c,'contact:'+hash(p.contact.replace(/\D/g,'')),5);
 const products=(await c.query('SELECT * FROM products WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[p.items.map(i=>i.id)])).rows;
 const items=snapshotItems(p.items,products),total=items.reduce((s,i)=>s+i.price_cents*i.quantity,0);
 const reference='CB-'+new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Manila'}).replaceAll('-','')+'-'+randomBytes(5).toString('hex').toUpperCase();
 const o=(await c.query(`INSERT INTO orders(id,reference,token_hash,request_hash,customer_name,contact,proposed_location,notes,items,total_cents) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[p.requestId,reference,tokenHash,requestHash,p.name,p.contact,p.location,p.notes,JSON.stringify(items),total])).rows[0];
 await c.query("INSERT INTO order_events(order_id,status,actor) VALUES($1,'Pending','Customer')",[o.id]);
 if(p.studioInvite){
  await c.query('INSERT INTO studio_order_invites(order_id,email) VALUES($1,$2)',[o.id,p.studioEmail]);
 }
 return publicOrder(o);
 });}
export async function trackOrder(token){if(typeof token!=='string'||!/^[0-9a-f]{64}$/i.test(token))throw new OrderError('Invalid tracking code',404);const o=(await db().query('SELECT * FROM orders WHERE token_hash=$1',[hash(token)])).rows[0];if(!o)throw new OrderError('Order not found. Check your private tracking code.',404);return publicOrder(o);}
export async function updateOrder(p,actor){
 if(!p||typeof p.id!=='string'||!/^[0-9a-f-]{36}$/i.test(p.id)||!Number.isInteger(p.version)||!Object.hasOwn(transitions,p.status)||typeof p.confirmed_location!=='string'||p.confirmed_location.trim().length>300||typeof p.customer_update!=='string'||p.customer_update.trim().length>1000)throw new OrderError('Invalid order update');
 return transaction(async c=>{const before=(await c.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[p.id])).rows[0];if(!before)throw new OrderError('Order not found',404);if(before.version!==p.version)throw new OrderError('Order changed. Reload before updating.',409);
 if(['Completed','Cancelled'].includes(before.status))throw new OrderError('This order is closed',409);
 if(p.status!==before.status&&!transitions[before.status].includes(p.status))throw new OrderError('Invalid status transition',409);
 if(['Confirmed','Ready','Completed'].includes(p.status)&&p.confirmed_location.trim().length<5)throw new OrderError('Confirm the meetup location within Roxas City first');
 if(p.status!==before.status){const products=(await c.query('SELECT * FROM products WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[before.items.map(i=>i.id)])).rows;
 for(const i of before.items){const product=products.find(x=>x.id===i.id);if(!product)throw new OrderError('Product missing',409);const next=stockChange(before.status,p.status,product,i.quantity);if(next.stock===product.stock&&next.reserved_stock===product.reserved_stock)continue;
 const after=(await c.query('UPDATE products SET stock=$2,reserved_stock=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[i.id,next.stock,next.reserved_stock])).rows[0];
 await c.query('INSERT INTO product_audit(product_id,actor,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5)',[i.id,actor,before.reference+': '+before.status+' → '+p.status,JSON.stringify(product),JSON.stringify(after)]);}}
 const o=(await c.query('UPDATE orders SET status=$2,confirmed_location=$3,customer_update=$4,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[p.id,p.status,p.confirmed_location.trim(),p.customer_update.trim()])).rows[0];
 await c.query('INSERT INTO order_events(order_id,status,actor,note) VALUES($1,$2,$3,$4)',[p.id,p.status,actor,p.customer_update.trim()]);return publicOrder(o);
 });}
export function errorResponse(e){if(!(e instanceof OrderError))console.error('Order operation failed:',e.code||e.name);return Response.json({error:e instanceof OrderError?e.message:'Orders are temporarily unavailable. Please try again.'},{status:e instanceof OrderError?e.status:503,headers:{'Cache-Control':'no-store'}});}
export async function readBody(req){const text=await req.text();if(text.length>20000)throw new OrderError('Request too large',413);try{return JSON.parse(text);}catch{throw new OrderError('Invalid request');}}
