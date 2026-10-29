import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const pg=new PGlite();
// PGlite runs one session; real PostgreSQL supplies advisory locks in production.
const query=(sql,args)=>sql.startsWith('SELECT pg_advisory_xact_lock')?Promise.resolve({rows:[]}):pg.query(sql,args);
const connection={query,release(){}};
mock.module('../lib/db.js',{namedExports:{db:()=>({query,connect:async()=>connection})}});
const {createOrder,updateOrder,trackOrder}=await import('../lib/orders.js');
after(()=>pg.close());
test('SQL migration and order lifecycle against isolated PostgreSQL engine',async()=>{
 const schema=await readFile(new URL('../scripts/schema.sql',import.meta.url),'utf8');await pg.exec(schema);await pg.exec(schema);
 await query("INSERT INTO products(id,name,categories,price_cents,stock) VALUES('board','Board',ARRAY['boards'],15000,5),('sensor','Sensor',ARRAY['sensors'],1000,1),('unknown','Uncounted',ARRAY['tools'],100,NULL)");
 const body={name:'QA customer',contact:'09171234567',location:'Roxas City test landmark',city:'Roxas City, Capiz',notes:'',requestId:crypto.randomUUID(),token:'b'.repeat(64),items:[{id:'board',quantity:3,price_cents:15000}]};
 const first=await createOrder(body,'test');assert.equal(first.total_cents,45000);assert.equal(first.status,'Pending');
 assert.equal((await createOrder(body,'test')).reference,first.reference);assert.equal((await query('SELECT count(*) FROM orders')).rows[0].count,1);
 await assert.rejects(createOrder({...body,name:'Different'},'test'),/different details/);
 assert.equal((await trackOrder(body.token)).reference,first.reference);await assert.rejects(trackOrder('c'.repeat(64)),/not found/);
 assert.equal('contact' in await trackOrder(body.token),false);
 const update={id:body.requestId,version:1,status:'Confirmed',confirmed_location:'Agreed Roxas City test landmark',customer_update:'Tomorrow, 2 PM PHT'};
 await updateOrder(update,'QA admin');let product=(await query("SELECT * FROM products WHERE id='board'")).rows[0];assert.equal(product.stock,5);assert.equal(product.reserved_stock,3);
 await assert.rejects(updateOrder(update,'QA admin'),/changed/);
 const second={...body,requestId:crypto.randomUUID(),token:'d'.repeat(64)};await assert.rejects(createOrder(second,'test'),/Insufficient/);
 await updateOrder({...update,version:2,status:'Ready'},'QA admin');await updateOrder({...update,version:3,status:'Completed'},'QA admin');
 product=(await query("SELECT * FROM products WHERE id='board'")).rows[0];assert.equal(product.stock,2);assert.equal(product.reserved_stock,0);
 await assert.rejects(updateOrder({...update,version:4,status:'Completed'},'QA admin'),/closed/);
 const third={...body,requestId:crypto.randomUUID(),token:'e'.repeat(64),items:[{id:'board',quantity:2,price_cents:15000}]};await createOrder(third,'test');await updateOrder({...update,id:third.requestId},'QA admin');await updateOrder({...update,id:third.requestId,version:2,status:'Cancelled'},'QA admin');
 product=(await query("SELECT * FROM products WHERE id='board'")).rows[0];assert.equal(product.stock,2);assert.equal(product.reserved_stock,0);
 // A multi-item confirmation failure rolls back reservations of every item.
 const fourth={...body,requestId:crypto.randomUUID(),token:'f'.repeat(64),items:[{id:'board',quantity:2,price_cents:15000},{id:'unknown',quantity:1,price_cents:100}]};await createOrder(fourth,'test');await assert.rejects(updateOrder({...update,id:fourth.requestId},'QA admin'),/Count and verify/);
 assert.equal((await query("SELECT reserved_stock FROM products WHERE id='board'")).rows[0].reserved_stock,0);
 assert.equal((await query('SELECT status FROM orders WHERE id=$1',[fourth.requestId])).rows[0].status,'Pending');
 await assert.rejects(query("UPDATE products SET reserved_stock=3 WHERE id='board'"),/products_reservation_check/);
 assert.equal((await query('SELECT count(*) FROM product_audit')).rows[0].count,4);
});
