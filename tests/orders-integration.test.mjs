import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const pg=new PGlite();
// PGlite runs one session; real PostgreSQL supplies advisory locks in production.
const query=(sql,args)=>sql.startsWith('SELECT pg_advisory_xact_lock')?Promise.resolve({rows:[]}):pg.query(sql,args);
const connection={query,release(){}};
mock.module('../lib/db.js',{namedExports:{db:()=>({query,connect:async()=>connection})}});
const {createOrder,updateOrder,trackOrder,listCustomerOrders,recordPaymentReference}=await import('../lib/orders.js');
let adminSignedIn=false;
mock.module('../lib/auth.js',{namedExports:{requireAdmin:async()=>{
 if(!adminSignedIn)throw new Error('Unauthorized');
 return {email:'admin@example.invalid'};
},sameOrigin:()=>{}}});
const {GET:adminOrders,DELETE:deleteOrder,PATCH:restoreOrder}=await import('../app/api/admin/orders/route.js');
const schema=await readFile(new URL('../scripts/schema.sql',import.meta.url),'utf8');
after(()=>pg.close());
test('SQL migration and order lifecycle against isolated PostgreSQL engine',async()=>{
 await pg.exec(schema);await pg.exec(schema);
 await query("INSERT INTO products(id,name,categories,price_cents,stock) VALUES('board','Board',ARRAY['boards'],15000,5),('sensor','Sensor',ARRAY['sensors'],1000,1),('unknown','Uncounted',ARRAY['tools'],100,NULL)");
 const body={name:'QA customer',contact:'09171234567',location:'Roxas City test landmark',city:'Roxas City, Capiz',notes:'',requestId:crypto.randomUUID(),token:'b'.repeat(64),items:[{id:'board',quantity:3,price_cents:15000}]};
 const user={id:'qa-member',email:'buyer@example.invalid'};
 const first=await createOrder(body,'test',user);assert.equal(first.total_cents,45000);assert.equal(first.status,'Pending');
 assert.equal((await createOrder(body,'test',user)).reference,first.reference);assert.equal((await query('SELECT count(*) FROM orders')).rows[0].count,1);
 await assert.rejects(createOrder({...body,name:'Different'},'test',user),/different details/);
 assert.equal((await trackOrder(body.token)).reference,first.reference);await assert.rejects(trackOrder('c'.repeat(64)),/not found/);
 assert.equal('contact' in await trackOrder(body.token),false);
 const update={id:body.requestId,version:1,status:'Confirmed',confirmed_location:'Agreed Roxas City test landmark',customer_update:'Tomorrow, 2 PM PHT'};
 await updateOrder(update,'QA admin');let product=(await query("SELECT * FROM products WHERE id='board'")).rows[0];assert.equal(product.stock,5);assert.equal(product.reserved_stock,3);
 await assert.rejects(updateOrder(update,'QA admin'),/changed/);
 const second={...body,requestId:crypto.randomUUID(),token:'d'.repeat(64)};await assert.rejects(createOrder(second,'test',user),/Insufficient/);
 await updateOrder({...update,version:2,status:'Ready'},'QA admin');await updateOrder({...update,version:3,status:'Completed'},'QA admin');
 product=(await query("SELECT * FROM products WHERE id='board'")).rows[0];assert.equal(product.stock,2);assert.equal(product.reserved_stock,0);
 const invoice=(await query('SELECT customer_email,subtotal_cents FROM order_invoices WHERE order_id=$1',[body.requestId])).rows[0];
 assert.equal(invoice.customer_email,user.email);assert.equal(invoice.subtotal_cents,45000);
 await assert.rejects(updateOrder({...update,version:4,status:'Completed'},'QA admin'),/closed/);
 const third={...body,requestId:crypto.randomUUID(),token:'e'.repeat(64),items:[{id:'board',quantity:2,price_cents:15000}]};await createOrder(third,'test',user);await updateOrder({...update,id:third.requestId},'QA admin');await updateOrder({...update,id:third.requestId,version:2,status:'Cancelled'},'QA admin');
 product=(await query("SELECT * FROM products WHERE id='board'")).rows[0];assert.equal(product.stock,2);assert.equal(product.reserved_stock,0);
 // A multi-item confirmation failure rolls back reservations of every item.
 const fourth={...body,requestId:crypto.randomUUID(),token:'f'.repeat(64),items:[{id:'board',quantity:2,price_cents:15000},{id:'unknown',quantity:1,price_cents:100}]};await createOrder(fourth,'test',user);await assert.rejects(updateOrder({...update,id:fourth.requestId},'QA admin'),/Count and verify/);
 assert.equal((await query("SELECT reserved_stock FROM products WHERE id='board'")).rows[0].reserved_stock,0);
 assert.equal((await query('SELECT status FROM orders WHERE id=$1',[fourth.requestId])).rows[0].status,'Pending');
 await assert.rejects(query("UPDATE products SET reserved_stock=3 WHERE id='board'"),/products_reservation_check/);
 assert.equal((await query('SELECT count(*) FROM product_audit')).rows[0].count,4);
});

test('Maxim checkout records fee acknowledgment and limits delivery data to the buyer and selected admin order',async()=>{
 await pg.exec(schema);
 await query("INSERT INTO products(id,name,categories,price_cents,stock) VALUES('delivery-fixture','Delivery item',ARRAY['boards'],5500,1)");
 const origin='https://circuitbyte.vercel.app',address='Unit 12, Test Street, Roxas City';
 const buyer={id:'maxim-buyer',email:'maxim-buyer@example.invalid'};
 const body={name:'Delivery Customer',contact:'09170000000',location:address,city:'Roxas City, Capiz',
  notes:'Private delivery instructions',requestId:crypto.randomUUID(),token:'2'.repeat(64),items:[{id:'delivery-fixture',quantity:1,price_cents:5500}],
  fulfillmentMethod:'maxim',invoice:{tin:'test-invoice-identifier'}};
 await assert.rejects(createOrder(body,'test',buyer),/Acknowledge/);
 const accepted={...body,deliveryFeeAccepted:true};
 const receipt=await createOrder(accepted,'test',buyer);
 assert.equal(receipt.fulfillment_method,'maxim');
 assert.equal(receipt.total_cents,5500);
 assert.equal('proposed_location' in receipt,false);
 assert.equal((await createOrder(accepted,'test',buyer)).reference,receipt.reference);
 await assert.rejects(createOrder({...accepted,fulfillmentMethod:'meetup'},'test',buyer),/different details/);
 const tracked=await trackOrder(body.token);
 assert.deepEqual(Object.keys(tracked).sort(),['reference','status','updated_at']);
 assert.equal(tracked.reference,receipt.reference);
 const [owned]=await listCustomerOrders(buyer.id);
 assert.equal(owned.proposed_location,address);
 assert.equal('invoice_tin' in owned,false);
 assert.deepEqual(await listCustomerOrders('other-buyer'),[]);

 const detailRequest=new Request(origin+'/api/admin/orders?id='+body.requestId);
 assert.equal((await adminOrders(detailRequest)).status,401);
 adminSignedIn=true;
 const response=await adminOrders(new Request(origin+'/api/admin/orders',{
  headers:{'x-circuitbyte-order-search':new URLSearchParams({q:buyer.email}).toString()}
 }));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 const data=await response.json();
 assert.equal(data.orders.length,1);
 const listed=data.orders[0];
 assert.equal(listed.item_count,1);
 for(const key of ['customer_name','customer_email','contact','notes','proposed_location','invoice_tin','payment_reference'])assert.equal(key in listed,false);

 const {order}=await (await adminOrders(detailRequest)).json();
 assert.equal(order.proposed_location,address);
 assert.equal(order.customer_email,buyer.email);
 assert.ok(order.delivery_fee_acknowledged_at);
 const update={id:body.requestId,version:1,status:'Confirmed',confirmed_location:'',customer_update:''};
 await assert.rejects(updateOrder(update,'QA admin'),/Confirm the delivery address/);
 const confirmed=await updateOrder({...update,confirmed_location:address},'QA admin');
 assert.equal(confirmed.order.status,'Confirmed');
 assert.equal((await listCustomerOrders(buyer.id))[0].confirmed_location,address);
});

test('admins can delete and restore cancelled orders while retaining the payment and stock history',async()=>{
 await pg.exec(schema);
 await query("INSERT INTO products(id,name,categories,price_cents,stock) VALUES('cancel-fixture','Cancel item',ARRAY['boards'],5000,1)");
 const origin='https://circuitbyte.vercel.app';
 const buyer={id:'cancel-buyer',email:'cancel-buyer@example.invalid'};
 const id=crypto.randomUUID(),token='9'.repeat(64);
 const receipt=await createOrder({name:'Cancel Buyer',contact:'09170000001',location:'Test landmark, Roxas City',city:'Roxas City, Capiz',
  notes:'',requestId:id,token,items:[{id:'cancel-fixture',quantity:1,price_cents:5000}],paymentMethod:'qrph'},'test',buyer);
 const action=(method,version)=>new Request(origin+'/api/admin/orders',{
  method,headers:{'Content-Type':'application/json'},body:JSON.stringify({id,version})
 });
 const list=async status=>{
  const params=new URLSearchParams({status,q:receipt.reference});
  const response=await adminOrders(new Request(origin+'/api/admin/orders?'+params));
  assert.equal(response.status,200);
  return response.json();
 };
 adminSignedIn=false;
 assert.equal((await deleteOrder(action('DELETE',1))).status,403);
 adminSignedIn=true;
 assert.equal((await deleteOrder(action('DELETE',1))).status,409);
 const update={id,version:1,status:'Pending',confirmed_location:'Test landmark, Roxas City',customer_update:''};
 await updateOrder({...update,openQrPayment:true},'QA admin');
 await recordPaymentReference(id,'ABC123456',buyer.id);
 await updateOrder({...update,version:3,verifyPayment:true},'QA admin');
 await updateOrder({...update,version:4,status:'Cancelled'},'QA admin');
 const stock=()=>query("SELECT stock,reserved_stock FROM products WHERE id='cancel-fixture'").then(result=>result.rows[0]);
 assert.deepEqual(await stock(),{stock:1,reserved_stock:0});
 const cancelled=await list('Cancelled');
 assert.equal(cancelled.orders.length,1);
 assert.equal((await deleteOrder(action('DELETE',4))).status,409);
 const deletion=await deleteOrder(action('DELETE',5));
 assert.equal(deletion.status,200);
 assert.ok((await deletion.json()).order.deleted_at);
 assert.equal((await list('Cancelled')).orders.length,0);
 assert.equal((await list('')).orders.length,0);
 const deleted=await list('Deleted');
 assert.equal(deleted.orders[0].id,id);
 assert.equal(deleted.summary.cancelled,cancelled.summary.cancelled-1);
 assert.equal(deleted.summary.deleted,cancelled.summary.deleted+1);
 assert.equal((await trackOrder(token)).status,'Cancelled');
 const [buyerOrder]=await listCustomerOrders(buyer.id);
 assert.equal(buyerOrder.payment_reference,'ABC123456');
 assert.ok(buyerOrder.payment_verified_at);
 assert.deepEqual(await stock(),{stock:1,reserved_stock:0});
 assert.equal((await restoreOrder(action('PATCH',6))).status,200);
 assert.equal((await list('Deleted')).orders.length,0);
 assert.equal((await list('Cancelled')).orders.length,1);
 const audit=(await query("SELECT note FROM order_events WHERE order_id=$1 AND actor='admin@example.invalid' ORDER BY id",[id])).rows;
 assert.deepEqual(audit.map(event=>event.note),['Deleted from admin orders','Restored to admin orders']);
});
