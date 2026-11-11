import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const pg=new PGlite();
const query=(sql,args)=>pg.query(sql,args);
mock.module('../lib/db.js',{namedExports:{db:()=>({query,connect:async()=>({query,release(){}})})}});
mock.module('../lib/auth.js',{namedExports:{requireAdmin:async()=>({email:'admin@example.invalid'}),sameOrigin:()=>{}}});
const deleted=[];
let updateWhileUploading=false;
mock.module('@vercel/blob',{namedExports:{
 async put(path){
  if(updateWhileUploading)await query("UPDATE products SET version=version+1 WHERE id='photo-item'");
  return {url:'https://test.example.invalid/'+path};
 },
 async del(url){deleted.push(url);}
}});
const {POST:upload}=await import('../app/api/admin/upload/route.js');
after(()=>pg.close());

test('photo upload reports malformed forms, saves one version, and cleans up stale uploads',async()=>{
 await pg.exec(await readFile(new URL('../scripts/schema.sql',import.meta.url),'utf8'));
 await query("INSERT INTO products(id,name,categories,price_cents,stock) VALUES('photo-item','Photo item',ARRAY['tools'],100,1)");
 const url='https://circuitbyte.vercel.app/api/admin/upload';
 const malformed=await upload(new Request(url,{method:'POST',body:'not multipart'}));
 assert.equal(malformed.status,400);
 assert.match((await malformed.json()).error,/could not be read/);
 const request=version=>{
  const form=new FormData();
  form.set('id','photo-item');form.set('version',String(version));
  form.set('file',new File([Uint8Array.of(255,216,255)],'photo.jpg',{type:'image/jpeg'}));
  return new Request(url,{method:'POST',body:form});
 };
 const response=await upload(request(1));
 assert.equal(response.status,200);
 const saved=await response.json();
 assert.equal(saved.version,2);
 assert.match(saved.image_url,/products\/.*\.jpg$/);
 updateWhileUploading=true;
 const stale=await upload(request(2));
 assert.equal(stale.status,409);
 assert.equal(deleted.length,1);
 assert.notEqual(deleted[0],saved.image_url);
 const {rows:[current]}=await query("SELECT image_url,version FROM products WHERE id='photo-item'");
 assert.deepEqual(current,{image_url:saved.image_url,version:3});
 assert.equal((await query("SELECT count(*) FROM product_audit WHERE reason='Photo replaced'")).rows[0].count,1);
});
