import {databaseUrl} from '../lib/database-url.mjs';
import fs from 'node:fs/promises';
import pg from 'pg';
const images=JSON.parse(await fs.readFile(new URL('./legacy-images.json',import.meta.url),'utf8'));
const client=new pg.Client({connectionString:databaseUrl()});
await client.connect();
let restored=0;
try{
 await client.query('BEGIN');
 for(const image of images){
  const before=(await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE',[image.id])).rows[0];
  if(!before||before.image_url)continue;
  const after=(await client.query('UPDATE products SET image_url=$1,version=version+1,updated_at=now() WHERE id=$2 RETURNING *',[image.url,image.id])).rows[0];
  await client.query('INSERT INTO product_audit(product_id,actor,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5)',[image.id,'migration','Legacy product photo restored to Blob',JSON.stringify(before),JSON.stringify(after)]);
  restored++;
 }
 await client.query('COMMIT');console.log(`Restored ${restored} legacy photos; existing photos preserved`);
}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
