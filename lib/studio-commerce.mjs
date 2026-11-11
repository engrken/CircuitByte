export function studioShoppingLines({spec,selected=[],boardProductId,products=[]}){
 const rows=spec?.bom?.length?spec.bom:[...new Set([...selected,...(boardProductId?[boardProductId]:[])])].map(id=>({id,qty:1}));
 const catalog=new Map(products.map(p=>[p.id,p]));
 return rows.map(row=>{const product=catalog.get(row.id);return {...row,product,available:!!product&&product.stock!==0,quantityKnown:!!spec?.bom?.length};});
}
export function addStudioCartItems(cart,lines){
 const result=new Map(),totals=new Map();
 const key=(id,option='',wireLengthCm)=>JSON.stringify([id,option||'',wireLengthCm??null]);
 for(const item of Array.isArray(cart)?cart:[]){
  if(typeof item?.id!=='string'||!Number.isInteger(item.quantity)||item.quantity<=0)continue;
  const option=typeof item.option==='string'?item.option:'';
  const wireLengthCm=Number.isFinite(item.wireLengthCm)&&item.wireLengthCm>0?item.wireLengthCm:undefined;
  const identity=key(item.id,option,wireLengthCm);
  const previous=result.get(identity)?.quantity||0;
  const quantity=Math.min(999,previous+item.quantity);
  result.set(identity,{id:item.id,quantity,...(option?{option}:{}),...(wireLengthCm!==undefined?{wireLengthCm}:{})});
  totals.set(item.id,(totals.get(item.id)||0)+quantity-previous);
 }
 for(const line of lines){
  if(!line.available||!Number.isInteger(line.qty)||line.qty<1)continue;
  const limit=Number.isInteger(line.product?.stock)?Math.max(0,line.product.stock):999;
  const identity=key(line.id),previous=result.get(identity)?.quantity||0,total=totals.get(line.id)||0;
  const quantity=Math.min(999,Math.max(0,limit-(total-previous)),previous+line.qty);
  if(quantity>0)result.set(identity,{id:line.id,quantity});
  else result.delete(identity);
  totals.set(line.id,total-previous+quantity);
 }
 return [...result.values()];
}
