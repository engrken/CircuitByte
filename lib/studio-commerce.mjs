export function studioShoppingLines({spec,selected=[],boardProductId,products=[]}){
 const rows=spec?.bom?.length?spec.bom:[...new Set([...selected,...(boardProductId?[boardProductId]:[])])].map(id=>({id,qty:1}));
 const catalog=new Map(products.map(p=>[p.id,p]));
 return rows.map(row=>{const product=catalog.get(row.id);return {...row,product,available:!!product&&product.stock!==0,quantityKnown:!!spec?.bom?.length};});
}
export function addStudioCartItems(cart,lines){
 const result=new Map();
 for(const item of Array.isArray(cart)?cart:[])if(typeof item?.id==='string'&&Number.isInteger(item.quantity)&&item.quantity>0)result.set(item.id,{id:item.id,quantity:Math.min(item.quantity,999)});
 for(const line of lines){
  if(!line.available||!Number.isInteger(line.qty)||line.qty<1)continue;
  const limit=Number.isInteger(line.product?.stock)?Math.max(0,line.product.stock):999;
  const quantity=Math.min(999,limit,(result.get(line.id)?.quantity||0)+line.qty);
  if(quantity>0)result.set(line.id,{id:line.id,quantity});
 }
 return [...result.values()];
}
