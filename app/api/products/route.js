import previewCatalog from '../../../scripts/catalog.json';
import {db} from '../../../lib/db';
import {productOptions} from '../../../lib/product-options.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.VERCEL_ENV==='preview'&&!process.env.CIRCUITBYTE_PREVIEW_DATABASE_URL){
  return Response.json(previewCatalog.map(({id,name,description,categories,price,quantityLabel})=>({
   id,name,description,categories,price,quantityLabel,stock:null,image:null,imageAvailable:false,options:productOptions[id]||null
  })),{headers:{'Cache-Control':'no-store'}});
 }
 try{const {rows}=await db().query(`SELECT id,name,description,categories,price_cents,CASE WHEN stock IS NULL THEN NULL ELSE stock-reserved_stock END AS stock,quantity_label,image_url FROM products WHERE active=true ORDER BY name`);return Response.json(rows.map(p=>({id:p.id,name:p.name,description:p.description,categories:p.categories,price:p.price_cents/100,stock:p.stock,quantityLabel:p.quantity_label,image:p.image_url,imageAvailable:!!p.image_url,options:productOptions[p.id]||null})),{headers:{'Cache-Control':'public, s-maxage=15, stale-while-revalidate=30'}});}catch{return Response.json({error:'Catalog temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}}); }}
