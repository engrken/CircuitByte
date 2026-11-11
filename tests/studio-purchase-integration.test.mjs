import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const pg=new PGlite();
const query=async(sql,args)=>{
 if(sql.startsWith('SELECT pg_advisory_xact_lock'))return {rows:[]};
 const result=await pg.query(sql,args);
 return {...result,rowCount:result.affectedRows};
};
const connection={query,release(){}};
mock.module('../lib/db.js',{namedExports:{db:()=>({query,connect:async()=>connection})}});
const sent=[];
let mailUnavailable=false;
mock.module('../lib/studio-email.mjs',{namedExports:{
 gmailConfigured:()=>true,sendGmailMessage:async message=>{
  if(mailUnavailable)throw new Error('Unavailable');
  sent.push(message);
 }
}});
const {createOrder,trackOrder,recordPaymentReference,updateOrder}=await import('../lib/orders.js');
const {deliverOrderInvoice}=await import('../lib/order-invoices.js');
const {deliverOrderNotifications}=await import('../lib/order-notifications.js');
let activeUser;
mock.module('../lib/auth.js',{namedExports:{requireUser:async()=>{
 if(!activeUser)throw Error('Sign in required');
 return activeUser;
}}});
const qrRoute=await import('../app/api/orders/my/qr/route.js');
after(()=>pg.close());

test('QR Ph reference belongs to the buyer and payment must be verified before completion',async()=>{
 await pg.exec(await readFile(new URL('../scripts/schema.sql',import.meta.url),'utf8'));
 await pg.exec(`CREATE TABLE "user"(email text PRIMARY KEY);
  INSERT INTO "user" VALUES('maker@example.org');
  INSERT INTO products(id,name,categories,price_cents,stock) VALUES('board','UNO',ARRAY['boards'],25000,5);`);
 const user={id:'buyer',email:'maker@example.org'};
 const body={name:'QA buyer',contact:'09171234567',location:'Roxas City plaza',city:'Roxas City, Capiz',notes:'',
  requestId:crypto.randomUUID(),token:'a'.repeat(64),items:[{id:'board',quantity:1,price_cents:25000}],
  paymentMethod:'qrph'};
 const shopEmail='shop@example.org';
 const order=await createOrder(body,'127.0.0.1',user,shopEmail);
 assert.equal(order.payment_method,'qrph');
 assert.equal((await createOrder(body,'127.0.0.1',user)).reference,order.reference);
 await assert.rejects(createOrder({...body,paymentMethod:'cash'},'127.0.0.1',user),/different details/);
 await assert.rejects(recordPaymentReference(body.requestId,'ABC123',user.id),/unavailable/);
 const origin='https://circuitbyte.vercel.app';
 const qrRequest=new Request(origin+'/api/orders/my/qr?id='+body.requestId);
 assert.equal((await qrRoute.GET(qrRequest)).status,401);
 activeUser=user;
 assert.equal((await qrRoute.GET(qrRequest)).status,404);
 const update={id:body.requestId,version:1,status:'Pending',confirmed_location:'Roxas City plaza',customer_update:''};
 await assert.rejects(updateOrder({...update,status:'Confirmed'},'admin'),/verify the transfer/);
 const opened=await updateOrder({...update,openQrPayment:true},'admin');
 assert.equal(opened.order.status,'Pending');
 assert.equal(opened.paymentOpened,true);
 assert.equal((await query("SELECT reserved_stock FROM products WHERE id='board'")).rows[0].reserved_stock,1);
 const qr=await qrRoute.GET(qrRequest);
 assert.equal(qr.status,200);
 assert.equal(qr.headers.get('cache-control'),'private, no-store');
 assert.equal(qr.headers.get('content-type'),'image/jpeg');
 assert.ok(Buffer.from(await qr.arrayBuffer()).equals(await readFile(new URL('../assets/circuitbyte-qrph.jpg',import.meta.url))));
 activeUser={id:'other-user'};
 assert.equal((await qrRoute.GET(qrRequest)).status,404);
 activeUser=user;
 await assert.rejects(recordPaymentReference(body.requestId,'ABC123','other-user'),/unavailable/);
 await recordPaymentReference(body.requestId,'ABC-123',user.id,shopEmail);
 assert.equal('payment_reference' in await trackOrder(body.token),false);
 assert.equal('customer_email' in await trackOrder(body.token),false);
 const verified=await updateOrder({...update,version:3,verifyPayment:true},'admin');
 assert.equal(verified.order.status,'Confirmed');
 assert.equal((await query("SELECT reserved_stock FROM products WHERE id='board'")).rows[0].reserved_stock,1);
 assert.equal((await qrRoute.GET(qrRequest)).status,404);
 await updateOrder({...update,status:'Ready',version:4},'admin');
 await updateOrder({...update,status:'Completed',version:5},'admin');
 assert.deepEqual((await query("SELECT stock,reserved_stock FROM products WHERE id='board'")).rows[0],{stock:4,reserved_stock:0});

 const cancelled={...body,requestId:crypto.randomUUID(),token:'b'.repeat(64)};
 await createOrder(cancelled,'127.0.0.1',user,shopEmail);
 await updateOrder({...update,id:cancelled.requestId,openQrPayment:true},'admin');
 await updateOrder({...update,id:cancelled.requestId,status:'Cancelled',version:2},'admin');
 assert.equal((await query("SELECT reserved_stock FROM products WHERE id='board'")).rows[0].reserved_stock,0);

 mailUnavailable=true;
 await deliverOrderNotifications(body.requestId,origin);
 assert.equal((await query('SELECT count(*) FROM order_notifications WHERE order_id=$1 AND failed_at IS NOT NULL',[body.requestId])).rows[0].count,3);
 mailUnavailable=false;
 await deliverOrderNotifications(body.requestId,origin);
 await deliverOrderNotifications(body.requestId,origin);
 assert.deepEqual(sent.map(message=>message.to).sort(),[user.email,shopEmail,shopEmail].sort());
 assert.ok(sent.every(message=>message.body.includes(order.reference)&&!message.body.includes('messenger.com')));
 sent.length=0;

 mailUnavailable=true;
 assert.equal(await deliverOrderInvoice(body.requestId,origin),'failed');
 mailUnavailable=false;
 assert.equal(await deliverOrderInvoice(body.requestId,origin),'sent');
 assert.equal(await deliverOrderInvoice(body.requestId,origin),'unchanged');
 assert.equal(sent.length,1);
 assert.equal(sent[0].to,user.email);
 assert.match(sent[0].body,/Order invoice CBI-/);
 assert.doesNotMatch(sent[0].body,/invited|register=1/);

 // A legacy guest gets the registration invitation in their order invoice.
 await query('DELETE FROM "user" WHERE email=$1',[user.email]);
 await query("UPDATE orders SET customer_user_id=NULL WHERE id=$1",[body.requestId]);
 await query("UPDATE order_invoices SET email_sent_at=NULL WHERE order_id=$1",[body.requestId]);
 assert.equal(await deliverOrderInvoice(body.requestId,origin),'sent');
 assert.match(sent[1].body,/\/dashboard\?register=1/);
});
