import fs from 'node:fs/promises';
import path from 'node:path';
import {put} from '@vercel/blob';
import {createHash} from 'node:crypto';
const directory=process.argv[2];
if(!directory)throw Error('Usage: node --env-file=.env.local scripts/upload-legacy.mjs IMAGE_DIRECTORY');
const catalog=JSON.parse(await fs.readFile(new URL('./catalog.json',import.meta.url),'utf8'));
const manifest=new URL('./legacy-images.json',import.meta.url);
const output=await fs.readFile(manifest,'utf8').then(JSON.parse).catch(()=>[]);
for(const product of catalog){
 if(output.some(p=>p.id===product.id))continue;
 const name=path.basename(product.image);const data=await fs.readFile(path.join(directory,name));
 if(data[0]!==255||data[1]!==216)throw Error(`Invalid JPEG: ${name}`);
 const hash=createHash('sha256').update(data).digest('hex').slice(0,16);
 const blob=await put(`legacy/${hash}-${name}`,data,{access:'public',contentType:'image/jpeg',allowOverwrite:false});
 output.push({id:product.id,source:`https://circuitbyte.rf.gd/${product.image}`,url:blob.url});
 await fs.writeFile(manifest,JSON.stringify(output,null,2)+'\n');
 if(output.length%20===0)console.log(`${output.length} photos stored`);
}
console.log(`Complete: ${output.length} product images stored in Blob`);
