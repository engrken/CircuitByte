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
 const order=await createOrder(body,'127.0.0.1',user);
 assert.equal(order.payment_method,'qrph');
 assert.equal((await createOrder(body,'127.0.0.1',user)).reference,order.reference);
 await assert.rejects(createOrder({...body,paymentMethod:'cash'},'127.0.0.1',user),/different details/);
 await assert.rejects(recordPaymentReference(body.requestId,'ABC123',user.id),/unavailable/);
 const update={id:body.requestId,version:1,status:'Confirmed',confirmed_location:'Roxas City plaza',customer_update:''};
 await updateOrder(update,'admin');
 await assert.rejects(recordPaymentReference(body.requestId,'ABC123','other-user'),/unavailable/);
 await recordPaymentReference(body.requestId,'ABC-123',user.id);
 assert.equal('payment_reference' in await trackOrder(body.token),false);
 assert.equal('customer_email' in await trackOrder(body.token),false);
 await updateOrder({...update,status:'Ready',version:3},'admin');
 await assert.rejects(updateOrder({...update,status:'Completed',version:4},'admin'),/Verify the QR Ph transfer/);
 await updateOrder({...update,status:'Completed',version:4,verifyPayment:true},'admin');

 const origin='https://circuitbyte.vercel.app';
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
