// Checkout stock validation and fulfillment reservations are evaluated inside database transactions.
import {productOptions} from './product-options.mjs';
export class OrderError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export const transitions={Pending:['Confirmed','Cancelled'],Confirmed:['Ready','Cancelled'],Ready:['Completed','Cancelled'],Completed:[],Cancelled:[]};
export function validateOrder(v){
 if(!v||typeof v!=='object')throw new OrderError('Invalid order');
 const text=(key,min,max)=>{if(typeof v[key]!=='string'||v[key].trim().length<min||v[key].trim().length>max)throw new OrderError('Please check '+key);return v[key].trim();};
 const name=text('name',2,100),contact=text('contact',7,40),location=text('location',5,300),notes=text('notes',0,1000);
 if(!/^[+\d ()-]{7,40}$/.test(contact)||contact.replace(/\D/g,'').length<7)throw new OrderError('Enter a valid contact number');
 if(v.city!=='Roxas City, Capiz')throw new OrderError('Meetup and delivery requests are available within Roxas City, Capiz.');
 const fulfillmentMethod=v.fulfillmentMethod??'meetup';
 if(fulfillmentMethod!=='meetup'&&fulfillmentMethod!=='maxim')throw new OrderError('Choose meetup or Maxim delivery.');
 if(fulfillmentMethod==='maxim'&&v.deliveryFeeAccepted!==true)throw new OrderError('Acknowledge that you will pay the Maxim delivery fee separately.');
 if(!/^[0-9a-f-]{36}$/i.test(v.requestId)||!/^[0-9a-f]{64}$/i.test(v.token))throw new OrderError('Invalid checkout session. Refresh and try again.');
 if(!Array.isArray(v.items)||!v.items.length||v.items.length>50)throw new OrderError('Choose between 1 and 50 different products');
 const seen=new Set();const items=v.items.map(i=>{if(!i||typeof i.id!=='string'||!i.id||i.id.length>80||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>999||!Number.isInteger(i.price_cents)||i.price_cents<0)throw new OrderError('Invalid cart item');const option=typeof i.option==='string'?i.option:'';const key=i.id+'\0'+option;if(seen.has(key))throw new OrderError('Combine quantities for identical product choices');seen.add(key);const config=productOptions[i.id];if(config&&!config.options.includes(option))throw new OrderError('Choose a valid '+config.label.toLowerCase()+' for '+i.id);if(!config&&option)throw new OrderError('This item does not accept a variant choice');return {id:i.id,quantity:i.quantity,price_cents:i.price_cents,...(config?{option}:{})};}).sort((a,b)=>a.id.localeCompare(b.id)||String(a.option||'').localeCompare(String(b.option||'')));
 // Studio invitation is strictly opt-in, separate from the purchase itself.
 const paymentMethod=v.paymentMethod??'cash';
 if(paymentMethod!=='cash'&&paymentMethod!=='qrph')throw new OrderError('Choose cash or QR Ph');
 const studioInvite=v.studioInvite===true;
 if(v.studioInvite!==undefined&&typeof v.studioInvite!=='boolean')throw new OrderError('Invalid Studio invitation preference');
 const studioEmail=studioInvite ? String(v.studioEmail||'').trim().toLowerCase() : '';
 if(studioInvite&&(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(studioEmail)||studioEmail.length>200))throw new OrderError('Enter a valid email address to receive your optional Studio invitation');
 return {name,contact,location,notes,city:v.city,requestId:v.requestId,token:v.token,items,studioInvite,studioEmail,paymentMethod,...(fulfillmentMethod==='maxim'?{fulfillmentMethod}:{})};
}
export function snapshotItems(items,products){const totals=new Map();for(const i of items)totals.set(i.id,(totals.get(i.id)||0)+i.quantity);return items.map(i=>{const p=products.find(p=>p.id===i.id);if(!p||!p.active)throw new OrderError('An item is no longer available. Refresh your cart.',409);if(p.price_cents!==i.price_cents)throw new OrderError('A price changed. Refresh the catalog before ordering.',409);if(p.stock!==null&&p.stock-p.reserved_stock<totals.get(i.id))throw new OrderError('Insufficient available stock: '+p.name,409);const config=productOptions[i.id];return {id:p.id,name:p.name,quantity:i.quantity,price_cents:p.price_cents,...(i.option?{option_label:config.label,option:i.option}:{})};});}
export function stockChange(from,to,p,quantity){
 if(!transitions[from]?.includes(to))throw new OrderError('This status change is not allowed',409);
 let stock=p.stock,reserved=p.reserved_stock;
 if(to==='Confirmed'){if(!p.active||stock===null||stock-reserved<quantity)throw new OrderError('Count and verify available stock before confirming: '+p.name,409);reserved+=quantity;}
 if(to==='Cancelled'&&(from==='Confirmed'||from==='Ready'))reserved-=quantity;
 if(to==='Completed'){if(stock===null)throw new OrderError('Stock must be counted',409);reserved-=quantity;stock-=quantity;}
 if(reserved<0||(stock!==null&&(stock<0||reserved>stock)))throw new OrderError('Stock conflict. Reload and review inventory.',409);
 return {stock,reserved_stock:reserved};
}
