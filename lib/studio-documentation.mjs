// Shared, deterministic BOM and netlist validation. Catalog prices are illustrative snapshots.
const PINS = new Set(['5V','3.3V','GND',...Array.from({length:14},(_,i)=>'D'+i),...Array.from({length:6},(_,i)=>'A'+i)]);
const SIGNAL_KINDS = new Set(['digital-input','digital-output','analog-input','i2c','spi','power','ground','conditional']);
export function validateStudioSpecification(spec, slug) {
  const errors=[];
  if(!spec||!spec.assets?.schematic||!spec.assets?.wiring) return ['Missing schematic or wiring reference'];
  const used=new Map();
  for(const row of spec.connections||[]) {
    if(!row.pin||!row.to||!row.net||!SIGNAL_KINDS.has(row.kind))errors.push('Incomplete pin connection');
    if(!PINS.has(row.pin) && row.kind!=='conditional')errors.push('Unsupported UNO pin: '+row.pin);
    if(row.kind==='conditional')continue;
    if(!['5V','3.3V','GND'].includes(row.pin)){
      const prior=used.get(row.pin);
      if(prior && prior!==row.net)errors.push('Conflicting nets on '+row.pin);
      used.set(row.pin,row.net);
    }
  }
  for(const kind of ['schematic','wiring']) {
    if(spec.assets[kind]!== '/education/diagrams/'+slug+'-'+kind+'.svg')errors.push('Diagram path mismatch');
  }
  if(!spec.bom?.length)errors.push('Empty bill of materials');
  for(const line of spec.bom||[])if(!line.id||!Number.isInteger(line.qty)||line.qty<=0)errors.push('Invalid BOM line');
  return errors;
}
export function estimateStudioBom(spec, products) {
  if(!spec)return {lines:[],requiredTotal:0,optionalTotal:0,excluded:[],complete:false,pricingNotice:'No validated catalog BOM for this draft.'};
  const lookup=new Map(products.map(p=>[p.id,p]));
  const lines=(spec.bom||[]).map(line=>{
    const product=lookup.get(line.id);
    const price=typeof product?.price==='number'&&Number.isFinite(product.price)&&product.price>=0?product.price:null;
    return {...line,name:product?.name||('Unlisted '+line.id),unitPrice:price,subtotal:price===null?null:Math.round(price*line.qty*100)/100};
  });
  const required=lines.filter(x=>!x.optional),optional=lines.filter(x=>x.optional);
  const known=required.every(x=>x.subtotal!==null);
  const add=arr=>Math.round(arr.reduce((sum,x)=>sum+(x.subtotal??0),0)*100)/100;
  return {
    lines,requiredTotal:known?add(required):null,optionalTotal:add(optional),
    excluded:(spec.extras||[]).map(extra=>({...extra,source:'not in catalog or not included'})),
    complete:known&&!(spec.extras||[]).length,
    pricingNotice:'Illustrative PHP total from a static catalog snapshot, not a live quotation. Variant, pack size, stock, shipping, taxes and unlisted items must be confirmed before purchase.'
  };
}
