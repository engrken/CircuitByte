import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const pg=new PGlite();
const query=(sql,args)=>sql.startsWith('SELECT pg_advisory_xact_lock')?Promise.resolve({rows:[]}):pg.query(sql,args);
const connection={query,release(){}};
mock.module('../lib/db.js',{namedExports:{db:()=>({query,connect:async()=>connection})}});
const {createOrder,trackOrder}=await import('../lib/orders.js');
after(()=>pg.close());
test('opted-in purchase queue is idempotent and never reveals email in public receipt',async()=>{
 await pg.exec(await readFile(new URL('../scripts/schema.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../scripts/schema.sql',import.meta.url),'utf8'));
 await query("INSERT INTO products(id,name,categories,price_cents,stock) VALUES('board','UNO',ARRAY['boards'],25000,5)");
 const order={name:'QA buyer',contact:'09171234567',location:'Roxas City plaza',city:'Roxas City, Capiz',notes:'',
  requestId:crypto.randomUUID(),token:'a'.repeat(64),items:[{id:'board',quantity:1,price_cents:25000}],
  studioInvite:true,studioEmail:'maker@example.org'};
 const receipt=await createOrder(order,'127.0.0.1');
 assert.match(receipt.reference,/^CB-/);
 assert.equal('studioEmail' in receipt,false);
 assert.equal((await createOrder(order,'127.0.0.1')).reference,receipt.reference);
 const count=await query('SELECT count(*)::integer AS n FROM studio_order_invites');
 assert.equal(count.rows[0].n,1);
 const invite=await query('SELECT email,state,attempts FROM studio_order_invites');
 assert.equal(invite.rows[0].email,'maker@example.org');
 assert.equal(invite.rows[0].state,'pending');
 assert.equal(invite.rows[0].attempts,0);
 assert.equal('studioEmail' in await trackOrder(order.token),false);
 await assert.rejects(createOrder({...order,studioEmail:'someoneelse@example.org'},'127.0.0.1'),/different details/);
 const guest={...order,requestId:crypto.randomUUID(),token:'b'.repeat(64),studioInvite:false,studioEmail:'someoneelse@example.org'};
 await createOrder(guest,'127.0.0.1');
 assert.equal((await query('SELECT count(*)::integer AS n FROM studio_order_invites')).rows[0].n,1);
 assert.equal((await query('SELECT count(*)::integer AS n FROM orders')).rows[0].n,2);
});
