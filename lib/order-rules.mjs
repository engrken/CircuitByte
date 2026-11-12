// Checkout stock validation and fulfillment reservations are evaluated inside database transactions.
import {productOptions} from './product-options.mjs';
export class OrderError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export const transitions={Pending:['Confirmed','Cancelled'],Confirmed:['Ready','Cancelled'],Ready:['Completed','Cancelled'],Completed:[],Cancelled:[]};
export function normalizeCouponCode(value){
 const code=typeof value==='string'?value.trim().toUpperCase():'';
 if(!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code))throw new OrderError('Enter a promo code with 3–32 letters, numbers, hyphens or underscores.');
 return code;
}
export function validateFulfillment(value='meetup'){
 if(value!=='meetup'&&value!=='maxim'&&value!=='lbc')throw new OrderError('Choose meetup, Maxim delivery, or LBC shipping.');
 return value;
}
export function validateOrder(v){
 if(!v||typeof v!=='object')throw new OrderError('Invalid order');
 const text=(key,min,max)=>{if(typeof v[key]!=='string'||v[key].trim().length<min||v[key].trim().length>max)throw new OrderError('Please check '+key);return v[key].trim();};
 const name=text('name',2,100),contact=text('contact',7,40),location=text('location',5,300),notes=text('notes',0,1000);
 if(!/^[+\d ()-]{7,40}$/.test(contact)||contact.replace(/\D/g,'').length<7)throw new OrderError('Enter a valid contact number');
 const fulfillmentMethod=validateFulfillment(v.fulfillmentMethod??'meetup');
 if(fulfillmentMethod!=='lbc'&&v.city!=='Roxas City, Capiz')throw new OrderError('Meetup and Maxim delivery requests are available within Roxas City, Capiz.');
 if(fulfillmentMethod==='lbc'&&location.length<15)throw new OrderError('Enter a complete LBC delivery address, including the city, province, and postal code.');
 const couponCode=v.couponCode===undefined?null:normalizeCouponCode(v.couponCode);
 if(fulfillmentMethod==='lbc'&&v.deliveryFeeAccepted!==true)throw new OrderError('Acknowledge that the separately quoted LBC shipping fee is paid by the buyer.');
 if(fulfillmentMethod==='maxim'&&!couponCode&&v.deliveryFeeAccepted!==true)throw new OrderError('Acknowledge that you will pay the Maxim delivery fee separately.');
 if(couponCode&&(typeof v.couponId!=='string'||!/^[0-9a-f-]{36}$/i.test(v.couponId)||!Number.isSafeInteger(v.couponVersion)||v.couponVersion<1||!Number.isSafeInteger(v.couponTotalCents)||v.couponTotalCents<0)){
  throw new OrderError('Apply the promo code and review the total before placing the order.');
 }
 if(!/^[0-9a-f-]{36}$/i.test(v.requestId)||!/^[0-9a-f]{64}$/i.test(v.token))throw new OrderError('Invalid checkout session. Refresh and try again.');
 const items=validateCartItems(v.items);
 // Studio invitation is strictly opt-in, separate from the purchase itself.
 const paymentMethod=v.paymentMethod??'cash';
 if(paymentMethod!=='cash'&&paymentMethod!=='qrph')throw new OrderError('Choose cash or QR Ph');
 const studioInvite=v.studioInvite===true;
 if(v.studioInvite!==undefined&&typeof v.studioInvite!=='boolean')throw new OrderError('Invalid Studio invitation preference');
 const studioEmail=studioInvite ? String(v.studioEmail||'').trim().toLowerCase() : '';
 if(studioInvite&&(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(studioEmail)||studioEmail.length>200))throw new OrderError('Enter a valid email address to receive your optional Studio invitation');
 return {name,contact,location,notes,city:v.city,requestId:v.requestId,token:v.token,items,studioInvite,studioEmail,paymentMethod,
  ...(fulfillmentMethod==='maxim'?{fulfillmentMethod}:{}),...(couponCode?{couponCode,couponId:v.couponId,couponVersion:v.couponVersion,couponTotalCents:v.couponTotalCents}:{})};
}
export function validateCartItems(items){
 if(!Array.isArray(items)||!items.length||items.length>50)throw new OrderError('Choose between 1 and 50 different products');
 const seen=new Set();
 return items.map(i=>{
  if(!i||typeof i.id!=='string'||!i.id||i.id.length>80||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>999||!Number.isInteger(i.price_cents)||i.price_cents<0)throw new OrderError('Invalid cart item');
  const config=productOptions[i.id],option=typeof i.option==='string'?i.option:'';
  if(config&&!config.options.includes(option))throw new OrderError('Choose a valid '+config.label.toLowerCase()+' for '+i.id);
  if(!config&&option)throw new OrderError('This item does not accept a variant choice');
  const wireLengthCm=i.wireLengthCm;
  if(wireLengthCm!==undefined&&(!config?.wireLengthsCm||!Number.isFinite(wireLengthCm)||wireLengthCm<=0))throw new OrderError('Enter a valid Dupont wire length in centimeters.');
  const key=JSON.stringify([i.id,option,wireLengthCm]);
  if(seen.has(key))throw new OrderError('Combine quantities for identical product choices');
  seen.add(key);
  return {id:i.id,quantity:i.quantity,price_cents:i.price_cents,...(config?{option}:{}),...(wireLengthCm!==undefined?{wireLengthCm}:{})};
 }).sort((a,b)=>a.id.localeCompare(b.id)||String(a.option||'').localeCompare(String(b.option||''))||(a.wireLengthCm??0)-(b.wireLengthCm??0));
}
export function snapshotItems(items,products){
 const totals=new Map();
 for(const item of items)totals.set(item.id,(totals.get(item.id)||0)+item.quantity);
 return items.map(item=>{
  const product=products.find(p=>p.id===item.id);
  if(!product||!product.active)throw new OrderError('An item is no longer available. Refresh your cart.',409);
  if(product.price_cents!==item.price_cents)throw new OrderError('A price changed. Refresh the catalog before ordering.',409);
  if(product.stock!==null&&product.stock-product.reserved_stock<totals.get(item.id))throw new OrderError('Insufficient available stock: '+product.name,409);
  const config=productOptions[item.id];
  // Existing checkout retries are resolved before creating a new item snapshot.
  if(config?.wireLengthsCm&&item.wireLengthCm===undefined)throw new OrderError('Choose the Dupont wire length in centimeters.');
  const snapshot={id:product.id,name:product.name,quantity:item.quantity,price_cents:product.price_cents};
  if(!item.option)return snapshot;
  if(config.wireLengthsCm)return {...snapshot,option_label:'Connector type and wire length',option:`${item.option} · ${item.wireLengthCm} cm`};
  return {...snapshot,option_label:config.label,option:item.option};
 });
}
export function stockChange(from,to,p,quantity){
 if(!transitions[from]?.includes(to))throw new OrderError('This status change is not allowed',409);
 let stock=p.stock,reserved=p.reserved_stock;
 if(to==='Confirmed'){if(!p.active||stock===null||stock-reserved<quantity)throw new OrderError('Count and verify available stock before confirming: '+p.name,409);reserved+=quantity;}
 if(to==='Cancelled'&&(from==='Confirmed'||from==='Ready'))reserved-=quantity;
 if(to==='Completed'){if(stock===null)throw new OrderError('Stock must be counted',409);reserved-=quantity;stock-=quantity;}
 if(reserved<0||(stock!==null&&(stock<0||reserved>stock)))throw new OrderError('Stock conflict. Reload and review inventory.',409);
 return {stock,reserved_stock:reserved};
}
