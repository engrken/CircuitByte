// Checkout stock validation and fulfillment reservations are evaluated inside database transactions.\nexport class OrderError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export const transitions={Pending:['Confirmed','Cancelled'],Confirmed:['Ready','Cancelled'],Ready:['Completed','Cancelled'],Completed:[],Cancelled:[]};
export function validateOrder(v){
 if(!v||typeof v!=='object')throw new OrderError('Invalid order');
 const text=(key,min,max)=>{if(typeof v[key]!=='string'||v[key].trim().length<min||v[key].trim().length>max)throw new OrderError('Please check '+key);return v[key].trim();};
 const name=text('name',2,100),contact=text('contact',7,40),location=text('location',5,300),notes=text('notes',0,1000);
 if(!/^[+\d ()-]{7,40}$/.test(contact)||contact.replace(/\D/g,'').length<7)throw new OrderError('Enter a valid contact number');
 if(v.city!=='Roxas City, Capiz')throw new OrderError('Meetups are available within Roxas City, Capiz only');
 if(!/^[0-9a-f-]{36}$/i.test(v.requestId)||!/^[0-9a-f]{64}$/i.test(v.token))throw new OrderError('Invalid checkout session. Refresh and try again.');
 if(!Array.isArray(v.items)||!v.items.length||v.items.length>50)throw new OrderError('Choose between 1 and 50 different products');
 const seen=new Set();const items=v.items.map(i=>{if(!i||typeof i.id!=='string'||!i.id||i.id.length>80||seen.has(i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>999||!Number.isInteger(i.price_cents)||i.price_cents<0)throw new OrderError('Invalid cart item');seen.add(i.id);return {id:i.id,quantity:i.quantity,price_cents:i.price_cents};}).sort((a,b)=>a.id.localeCompare(b.id));
 // Studio invitation is strictly opt-in, separate from the purchase itself.
 const studioInvite=v.studioInvite===true;
 if(v.studioInvite!==undefined&&typeof v.studioInvite!=='boolean')throw new OrderError('Invalid Studio invitation preference');
 const studioEmail=studioInvite ? String(v.studioEmail||'').trim().toLowerCase() : '';
 if(studioInvite&&(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(studioEmail)||studioEmail.length>200))throw new OrderError('Enter a valid email address to receive your optional Studio invitation');
 return {name,contact,location,notes,city:v.city,requestId:v.requestId,token:v.token,items,studioInvite,studioEmail};
}
export function snapshotItems(items,products){return items.map(i=>{const p=products.find(p=>p.id===i.id);if(!p||!p.active)throw new OrderError('An item is no longer available. Refresh your cart.',409);if(p.price_cents!==i.price_cents)throw new OrderError('A price changed. Refresh the catalog before ordering.',409);if(p.stock!==null&&p.stock-p.reserved_stock<i.quantity)throw new OrderError('Insufficient available stock: '+p.name,409);return {id:p.id,name:p.name,quantity:i.quantity,price_cents:p.price_cents};});}
export function stockChange(from,to,p,quantity){
 if(!transitions[from]?.includes(to))throw new OrderError('This status change is not allowed',409);
 let stock=p.stock,reserved=p.reserved_stock;
 if(to==='Confirmed'){if(!p.active||stock===null||stock-reserved<quantity)throw new OrderError('Count and verify available stock before confirming: '+p.name,409);reserved+=quantity;}
 if(to==='Cancelled'&&(from==='Confirmed'||from==='Ready'))reserved-=quantity;
 if(to==='Completed'){if(stock===null)throw new OrderError('Stock must be counted',409);reserved-=quantity;stock-=quantity;}
 if(reserved<0||(stock!==null&&(stock<0||reserved>stock)))throw new OrderError('Stock conflict. Reload and review inventory.',409);
 return {stock,reserved_stock:reserved};
}
