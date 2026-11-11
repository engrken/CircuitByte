import {after,before,mock,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const pg=new PGlite();
const query=(sql,args)=>sql.startsWith('SELECT pg_advisory_xact_lock')?Promise.resolve({rows:[]}):pg.query(sql,args);
mock.module('../lib/db.js',{namedExports:{db:()=>({query,connect:async()=>({query,release(){}})})}});
let admin=false,verifiedBuyer=false,mailFails=false;
const messages=[];
const origin='https://circuitbyte.vercel.app';
const buyer={id:'buyer',email:'buyer@example.invalid'};
mock.module('../lib/auth.js',{namedExports:{
 requireAdmin:async()=>{if(!admin)throw Error('Unauthorized');return {email:'admin@example.invalid'};},
 requireUser:async()=>{if(!verifiedBuyer)throw Error('Unauthorized');return buyer;},
 sameOrigin:req=>{if(req.headers.get('origin')!==origin)throw Error('Invalid origin');}
}});
mock.module('../lib/studio-email.mjs',{namedExports:{
 gmailConfigured:()=>true,sendGmailMessage:async message=>{if(mailFails)throw Error('Fixture mail outage');messages.push(message);}
}});
const accounts=await import('../app/api/admin/accounts/route.js');
const promotions=await import('../app/api/admin/promotions/route.js');
const {POST:quote}=await import('../app/api/orders/promotion/route.js');
const {createOrder,listCustomerOrders,updateOrder}=await import('../lib/orders.js');
const {deliverOrderInvoice}=await import('../lib/order-invoices.js');
const request=(path,body,source=origin)=>new Request(origin+path,body===undefined?{}:{
 method:'POST',headers:{Origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)
});
const adminAccount=body=>accounts.POST(request('/api/admin/accounts',body));
const promoRequest=body=>promotions.POST(request('/api/admin/promotions',body));
const offer=(code,kind,fields={})=>({code,kind,enabled:true,expiresAt:'2099-11-12T20:00',...fields});
const orderBody=(items,extra={})=>({name:'Test Buyer',contact:'09170000001',location:'Test location, Roxas City',
 city:'Roxas City, Capiz',notes:'',requestId:crypto.randomUUID(),token:crypto.randomUUID().replaceAll('-','').repeat(2),items,...extra});
const part=(id,price_cents,fields={})=>({id,price_cents,quantity:1,...fields});
const usePromo=({promotion,total_cents})=>({couponCode:promotion.code,couponId:promotion.id,couponVersion:promotion.version,couponTotalCents:total_cents});
async function getQuote(couponCode,items,fulfillmentMethod='meetup'){
 return quote(request('/api/orders/promotion',{couponCode,items,fulfillmentMethod}));
}
async function addPromo(promotion){
 const response=await promoRequest(promotion);
 assert.equal(response.status,201,await response.clone().text());
 return (await response.json()).promotion.id;
}

before(async()=>{
 await pg.exec(await readFile(new URL('../scripts/schema.sql',import.meta.url),'utf8'));
 await pg.exec(`CREATE TABLE "user"(id text PRIMARY KEY,name text,email text,"emailVerified" boolean NOT NULL,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
  CREATE TABLE "session"(id text PRIMARY KEY,"userId" text REFERENCES "user"(id));
  INSERT INTO "user"(id,name,email,"emailVerified") VALUES('pending','Pending user','pending@example.invalid',false),('buyer','Test Buyer','buyer@example.invalid',true);
  INSERT INTO "session" VALUES('pending-session','pending');
  INSERT INTO products(id,name,categories,price_cents,stock) VALUES
   ('board','Board',ARRAY['boards'],15005,12),('cb-066','LCD',ARRAY['modules'],19900,5),('cb-076','Dupont jumper wire',ARRAY['components'],2000,2);`);
 await pg.exec(await readFile(new URL('../scripts/manual-account-verification.sql',import.meta.url),'utf8'));
});
after(()=>pg.close());

test('manual verification is admin-only, auditable and retries email independently of activation',async()=>{
 const list=new Request(origin+'/api/admin/accounts');
 const verify={action:'verify',id:'pending',reason:'Confirmed through the known email address',confirmed:true};
 assert.equal((await accounts.GET(list)).status,401);
 assert.equal((await adminAccount(verify)).status,403);
 admin=true;
 const pending=await (await accounts.GET(list)).json();
 assert.deepEqual(pending.pending.map(account=>account.id),['pending']);
 assert.equal((await accounts.POST(request('/api/admin/accounts',verify,'https://example.invalid'))).status,403);
 assert.equal((await adminAccount({...verify,confirmed:false})).status,400);
 mailFails=true;
 try{
  const result=await adminAccount(verify);
  assert.equal(result.status,200,await result.clone().text());
  assert.equal((await result.json()).delivery,'failed');
 }finally{mailFails=false;}
 assert.equal((await query('SELECT "emailVerified" FROM "user" WHERE id=$1',['pending'])).rows[0].emailVerified,true);
 assert.equal((await query('SELECT count(*)::int AS count FROM "session" WHERE "userId"=$1',['pending'])).rows[0].count,0);
 assert.equal((await adminAccount(verify)).status,409);
 assert.equal((await (await adminAccount({action:'retry',id:'pending'})).json()).delivery,'sent');
 assert.equal((await (await adminAccount({action:'retry',id:'pending'})).json()).delivery,'sent');
 assert.equal(messages.length,1);
 assert.equal(messages[0].to,'pending@example.invalid');
 assert.match(messages[0].body,/has been verified by an administrator/);
 const updated=await (await accounts.GET(list)).json();
 assert.deepEqual(updated.pending,[]);
 assert.equal(updated.recent[0].reason,verify.reason);
 assert.equal(updated.recent[0].verified_by,'admin@example.invalid');
 assert.equal(updated.recent[0].delivery,'sent');
});

test('a discount quote rejects stale or altered terms and survives order retries and invoice issuance',async()=>{
 const promotion=offer('SAVE10','percent',{percent:10});
 admin=false;
 assert.equal((await promoRequest(promotion)).status,403);
 admin=true;
 const id=await addPromo(promotion);
 assert.equal((await promoRequest(promotion)).status,409);
 assert.equal((await promoRequest({...promotion,expiresAt:'2030-02-31T12:00'})).status,400);
 const items=[part('board',15005)];
 assert.equal((await getQuote('SAVE10',items)).status,403);
 verifiedBuyer=true;
 const first=await getQuote('save10',items);
 assert.equal(first.status,200,await first.clone().text());
 const oldQuote=await first.json();
 assert.equal(oldQuote.total_cents,13504);
 const list=await (await promotions.GET(new Request(origin+'/api/admin/promotions'))).json();
 assert.equal(list.promotions[0].expires_at,'2099-11-12T12:00:00.000Z');
 assert.equal((await promoRequest({...promotion,id,version:1,percent:20})).status,200);
 await assert.rejects(createOrder(orderBody(items,usePromo(oldQuote)),'discount',buyer),/promotion changed/);
 const newQuote=await (await getQuote('SAVE10',items)).json();
 assert.equal(newQuote.total_cents,12004);
 const order=orderBody(items,usePromo(newQuote));
 await assert.rejects(createOrder({...order,couponTotalCents:1},'discount',buyer),/promotion changed/);
 const receipt=await createOrder(order,'discount',buyer);
 assert.equal(receipt.total_cents,12004);
 assert.equal(receipt.promotion.discount_cents,3001);
 assert.equal((await promoRequest({...promotion,id,version:2,enabled:false})).status,200);
 assert.equal((await getQuote('SAVE10',items)).status,409);
 assert.deepEqual(await createOrder(order,'discount',buyer),receipt);
 for(const [index,status] of ['Confirmed','Ready','Completed'].entries()){
  await updateOrder({id:order.requestId,version:index+1,status,confirmed_location:'Confirmed Roxas City pickup',customer_update:''},'QA admin');
 }
 const {rows:[invoice]}=await query('SELECT subtotal_cents,promotion FROM order_invoices WHERE order_id=$1',[order.requestId]);
 assert.equal(invoice.subtotal_cents,12004);
 assert.equal(invoice.promotion.discount_cents,3001);
 assert.equal(await deliverOrderInvoice(order.requestId,origin),'sent');
 assert.match(messages.at(-1).body,/Shop promo: SAVE10/);
 assert.match(messages.at(-1).body,/Discount: −/);
});

test('bundle gifts reserve actual stock and free Maxim codes apply only to Maxim',async()=>{
 await addPromo(offer('LCDKIT','bundle',{buyId:'cb-066',buyQuantity:1,gift:{id:'cb-076',quantity:1,option:'M-F',wireLengthCm:20}}));
 const lcd=part('cb-066',19900,{option:'Blue'}),wire=part('cb-076',2000,{option:'M-F',wireLengthCm:20});
 assert.equal((await getQuote('LCDKIT',[wire])).status,409);
 assert.equal((await getQuote('LCDKIT',[lcd,{...wire,quantity:2}])).status,409);
 const bundle=await (await getQuote('LCDKIT',[lcd,wire])).json();
 assert.equal(bundle.total_cents,21900);
 assert.equal(bundle.promotion.gift.option,'M-F · 20 cm');
 const order=orderBody([lcd,wire],{...usePromo(bundle),contact:'09170000002'});
 await createOrder(order,'bundle',buyer);
 const [record]=await listCustomerOrders(buyer.id);
 assert.equal(record.items.find(item=>item.promotion_gift).price_cents,0);
 const update={id:order.requestId,version:1,status:'Confirmed',confirmed_location:'Confirmed Roxas City pickup',customer_update:''};
 await updateOrder(update,'QA admin');
 assert.equal((await query("SELECT reserved_stock FROM products WHERE id='cb-076'")).rows[0].reserved_stock,2);
 await updateOrder({...update,version:2,status:'Cancelled'},'QA admin');
 assert.equal((await query("SELECT reserved_stock FROM products WHERE id='cb-076'")).rows[0].reserved_stock,0);

 await addPromo(offer('SHIPFREE','maxim'));
 assert.equal((await getQuote('SHIPFREE',[lcd])).status,409);
 const delivery=await (await getQuote('SHIPFREE',[lcd],'maxim')).json();
 const delivered=await createOrder(orderBody([lcd],{...usePromo(delivery),fulfillmentMethod:'maxim',contact:'09170000003'}),'delivery',buyer);
 assert.equal(delivered.promotion.free_maxim,true);
 assert.equal(delivered.total_cents,19900);
 await addPromo(offer('OLD100','fixed',{amountCents:100,expiresAt:'2020-01-01T00:00'}));
 assert.equal((await getQuote('OLD100',[lcd])).status,409);
 await addPromo(offer('PESO','fixed',{amountCents:99999}));
 const fixed=await (await getQuote('PESO',[lcd])).json();
 assert.equal(fixed.total_cents,0);
 await assert.rejects(createOrder(orderBody([lcd],{...usePromo(fixed),paymentMethod:'qrph'}),'discount',buyer),/zero/);
});
