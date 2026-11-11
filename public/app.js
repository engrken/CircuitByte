'use strict';
const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(n);
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
let products=[],cart=[],category='all',detailId='',toastTimer,page=1,pageSize=12;
const isCatalog=Boolean($('#products'));
const catalogWideLayout=isCatalog?window.matchMedia?.('(min-width: 992px)'):null;
const categoryMenu=isCatalog?$('.category-menu'):null;
if(catalogWideLayout&&categoryMenu){
 const syncCategories=()=>{categoryMenu.open=catalogWideLayout.matches;};
 syncCategories();
 catalogWideLayout.addEventListener('change',syncCategories);
}
const shopMenuToggle=$('.shop-menu-toggle');
if(shopMenuToggle){
 const menuIsOpen=()=>shopMenuToggle.getAttribute('aria-expanded')==='true';
 const closeMenu=()=>shopMenuToggle.setAttribute('aria-expanded','false');
 window.matchMedia?.('(min-width: 1200px)').addEventListener('change',closeMenu);
 shopMenuToggle.addEventListener('click',()=>{
  shopMenuToggle.setAttribute('aria-expanded',String(!menuIsOpen()));
 });
 $('.header').addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!menuIsOpen())return;
  closeMenu();
  shopMenuToggle.focus();
 });
}
const cartParams=new URLSearchParams(location.search);
if(!isCatalog&&(new URLSearchParams(location.search).has('product')||new URLSearchParams(location.search).has('cart')))location.replace('/catalog'+location.search);
const labels={all:'All components',components:'Components',sensors:'Sensors',modules:'Modules',motors:'Motors',boards:'Boards',tools:'Tools & supplies'};
function toast(t){clearTimeout(toastTimer);$('#toast').textContent=t;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200);}
function save(){try{localStorage.setItem('circuitbyte.cart.v2',JSON.stringify(cart));}catch{toast('Storage unavailable. Your cart lasts for this visit only.');}}
const validWireLength=value=>Number.isFinite(value)&&value>0;
const sameVariant=(a,b)=>a.id===b.id&&(a.option||'')===(b.option||'')&&a.wireLengthCm===b.wireLengthCm;
function load(){
 try{
  const saved=JSON.parse(localStorage.getItem('circuitbyte.cart.v2')||localStorage.getItem('cart')||'[]');
  if(!Array.isArray(saved))return;
  for(const row of saved){
   const product=products.find(p=>p.id===row?.id||(!row?.id&&p.name===row?.name));
   if(!product||product.stock===0||!Number.isInteger(row.quantity)||row.quantity<1)continue;
   const option=product.options?.options.includes(row.option)?row.option:'';
   const wireLengthCm=product.options?.wireLengthsCm&&validWireLength(row.wireLengthCm)?row.wireLengthCm:undefined;
   const item={id:product.id,option,wireLengthCm,quantity:Math.min(999,row.quantity)};
   const existing=cart.find(line=>sameVariant(line,item));
   if(existing)existing.quantity=Math.min(999,existing.quantity+item.quantity);
   else cart.push(item);
  }
 }catch{}
}
function add(id,option='',wireLengthCm){
 const product=products.find(p=>p.id===id);
 if(!product||product.stock===0){toast('This item is currently out of stock.');return false;}
 if(product.options&&!product.options.options.includes(option)){toast('Choose '+product.options.label.toLowerCase()+' first.');return false;}
 if(product.options?.wireLengthsCm&&!validWireLength(wireLengthCm)){toast('Choose the Dupont wire length in centimeters.');return false;}
 const quantity=cart.reduce((n,item)=>n+(item.id===id?item.quantity:0),0);
 if(product.stock!==null&&quantity>=product.stock){toast('The available stock for this item is already in your cart.');return false;}
 const choice={id,option,wireLengthCm,quantity:1};
 const existing=cart.find(line=>sameVariant(line,choice));
 if(existing)existing.quantity=Math.min(999,existing.quantity+1);
 else cart.push(choice);
 save();renderCart();toast('Added to your cart');return true;
}
function total(){return cart.reduce((a,x)=>a+Math.round(products.find(p=>p.id===x.id).price*100)*x.quantity,0)/100;}
function invalidate(){ $('#order-result').hidden=true;$('#order-message').value=''; }
function changeVariant(item,choice){
 Object.assign(item,choice);
 const duplicate=cart.find(line=>line!==item&&sameVariant(line,item));
 if(duplicate){
  duplicate.quantity=Math.min(999,duplicate.quantity+item.quantity);
  cart.splice(cart.indexOf(item),1);
 }
 save();renderCart();
}
function renderCart(){
 invalidate();$('#cart-lines').replaceChildren();$('#cart-count').textContent=cart.reduce((a,x)=>a+x.quantity,0);
 $('#prepare').disabled=!cart.length;$('#subtotal').textContent=money(total());
 if(!cart.length)$('#cart-lines').append(el('p','muted','Your cart is waiting for your next idea. Add a component to get started.'));
 cart.forEach((item,index)=>{
  const product=products.find(p=>p.id===item.id),line=el('div','cart-line');
  line.append(el('h3','',product.name));
  if(product.options){
   const label=el('label','cart-option-label',product.options.label),select=el('select','cart-option');
   select.setAttribute('aria-label',product.options.label+' for '+product.name);
   select.append(new Option('Choose '+product.options.label.toLowerCase(),''));
   for(const value of product.options.options)select.append(new Option(value,value));
   select.value=item.option||'';
   select.onchange=()=>changeVariant(item,{option:select.value});
   label.append(select);line.append(label);
  }
  if(product.options?.wireLengthsCm){
   const label=el('label','cart-option-label','Wire length (cm)'),input=el('input','cart-option');
   input.type='number';input.min='0';input.step='any';input.inputMode='decimal';
   input.setAttribute('list','wire-length-suggestions');
   input.setAttribute('aria-label','Wire length in centimeters for '+product.name);
   input.value=item.wireLengthCm??'';
   input.onchange=()=>changeVariant(item,{wireLengthCm:validWireLength(input.valueAsNumber)?input.valueAsNumber:undefined});
   label.append(input);line.append(label);
  }
  const controls=el('div','cart-controls');
  controls.append(el('span','',money(product.price)));
  for(const [text,delta,label] of [['−',-1,'Decrease'],['+',1,'Increase']]){
   const button=el('button','',text);button.type='button';
   button.setAttribute('aria-label',`${label} ${product.name}`);
   const quantity=cart.reduce((n,other)=>n+(other.id===item.id?other.quantity:0),0);
   button.disabled=delta<0?item.quantity<=1:product.stock!==null&&quantity>=product.stock;
   button.onclick=()=>{item.quantity+=delta;save();renderCart();};
   if(delta===1)controls.append(el('span','',item.quantity));
   controls.append(button);
  }
  const remove=el('button','remove','Remove');
  remove.onclick=()=>{cart.splice(index,1);save();renderCart();};
  controls.append(remove);line.append(controls);$('#cart-lines').append(line);
 });
}
function renderCategories(){
 const host=$('#categories');
 if(!host)return;
 host.replaceChildren();
 for(const [id,name] of Object.entries(labels)){
  const button=el('button','category list-group-item list-group-item-action'+(category===id?' active':''));
  button.type='button';
  button.setAttribute('aria-pressed',String(category===id));
  const count=id==='all'?products.length:products.filter(product=>product.categories.includes(id)).length;
  button.append(el('span','',name),el('span','count',count));
  button.onclick=()=>{
   const wasFocused=document.activeElement===button;
   category=id;
   page=1;
   renderCategories();
   renderProducts();
   syncCatalogUrl();
   if(catalogWideLayout&&!catalogWideLayout.matches){
    categoryMenu.open=false;
    categoryMenu.querySelector('summary').focus({preventScroll:true});
   }else if(wasFocused){
    host.querySelector('.active').focus({preventScroll:true});
   }
  };
  host.append(button);
 }
}
function icon(){const wrap=el('div');wrap.innerHTML='<svg aria-hidden="true" viewBox="0 0 120 90" fill="none"><g stroke="currentColor" stroke-width="2"><rect x="35" y="20" width="50" height="50" rx="4"/><rect x="44" y="29" width="32" height="32" rx="2"/><path d="M44 10V20M55 10V20M66 10V20M77 10V20M44 70V80M55 70V80M66 70V80M77 70V80M25 29H35M25 40H35M25 51H35M25 62H35M85 29H95M85 40H95M85 51H95M85 62H95"/></g></svg>';return wrap.firstChild;}
function details(product){
 detailId=product.id;
 $('#detail-learn').href='/learn/'+product.id;$('#detail-title').textContent=product.name;
 $('#detail-desc').textContent=product.description;
 $('#detail-quantity').textContent=[product.quantityLabel,product.stock===null?'Availability: please confirm':`Stock: ${product.stock}`].filter(Boolean).join(' · ');
 $('#detail-price').textContent=money(product.price);
 $('#detail-add').disabled=product.stock===0;
 const select=$('#detail-option'),length=$('#detail-wire-length');
 $('#detail-option-wrap').hidden=!product.options;
 select.required=Boolean(product.options);select.replaceChildren();
 if(product.options){
  $('#detail-option-label').textContent=product.options.label;
  select.append(new Option('Choose '+product.options.label.toLowerCase(),''));
  for(const value of product.options.options)select.append(new Option(value,value));
 }
 $('#detail-wire-length-wrap').hidden=!product.options?.wireLengthsCm;
 length.required=Boolean(product.options?.wireLengthsCm);length.value='';
 $('#details-dialog').showModal();
}
function renderProducts(){if(!isCatalog)return;const term=$('#search').value.trim().toLowerCase();let shown=products.filter(p=>(category==='all'||p.categories.includes(category))&&`${p.name} ${p.description}`.toLowerCase().includes(term));const sort=$('#sort').value;if(sort==='low')shown.sort((a,b)=>a.price-b.price);if(sort==='high')shown.sort((a,b)=>b.price-a.price);if(sort==='name')shown.sort((a,b)=>a.name.localeCompare(b.name));const pages=Math.max(1,Math.ceil(shown.length/pageSize));page=Math.min(Math.max(1,page),pages);const start=(page-1)*pageSize;$('#catalog-count').textContent=shown.length?`Showing ${start+1}–${Math.min(start+pageSize,shown.length)} of ${shown.length} products`:'0 matching products';renderPagination(pages,shown.length);$('#filter-title').textContent=labels[category];$('#empty').hidden=!!shown.length;$('#products').replaceChildren();shown.slice(start,start+pageSize).forEach(p=>{const column=el('div','col'),card=el('article','product card h-100 shadow-sm'),visual=el('div','product-visual');visual.append(icon(),el('small','','PHOTO PENDING'));if(p.imageAvailable){const img=el('img');img.src=p.image;img.alt=p.name;img.loading='lazy';img.onload=()=>visual.classList.add('has-photo');img.onerror=()=>{visual.classList.remove('has-photo');img.remove();};visual.append(img);}const body=el('div','product-body card-body');body.append(el('span','product-category badge text-bg-light',labels[p.categories[0]]));const title=el('h3'),open=el('button','product-title',p.name);open.onclick=()=>details(p);title.append(open);body.append(title,el('p','',p.description),el('p','',p.stock===null?'Availability: confirm with us':p.stock===0?'Out of stock':`In stock: ${p.stock}`));const bottom=el('div','product-bottom');bottom.append(el('span','price',money(p.price)));const b=el('button','add btn btn-primary',p.options?'Choose option ↗':'Add to cart +');b.setAttribute('aria-label',`${p.options?'Choose option for':'Add'} ${p.name}`);b.disabled=p.stock===0;b.onclick=()=>p.options?details(p):add(p.id);bottom.append(b);body.append(bottom);card.append(visual,body);column.append(card);$('#products').append(column);});}
$('#cart-open').onclick=openCart;$('#how').onclick=()=>$('#how-dialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));$('#detail-add').onclick=()=>{
 const product=products.find(p=>p.id===detailId);
 if(!product)return;
 const select=$('#detail-option'),length=$('#detail-wire-length');
 const option=product.options?select.value:'';
 const wireLengthCm=product.options?.wireLengthsCm?length.valueAsNumber:undefined;
 if(product.options&&!option){select.focus();toast('Choose '+product.options.label.toLowerCase()+' first.');return;}
 if(product.options?.wireLengthsCm&&!validWireLength(wireLengthCm)){length.focus();toast('Choose the Dupont wire length in centimeters.');return;}
 if(add(product.id,option,wireLengthCm))$('#details-dialog').close();
};
if(isCatalog){$('#search').oninput=()=>{page=1;renderProducts();syncCatalogUrl(true);};$('#sort').onchange=()=>{page=1;renderProducts();syncCatalogUrl();};$('#page-size').onchange=()=>{pageSize=Number($('#page-size').value);page=1;renderProducts();syncCatalogUrl();};$('#reset').onclick=()=>{category='all';page=1;$('#search').value='';$('#sort').value='featured';renderCategories();renderProducts();syncCatalogUrl();};}$('#checkout').addEventListener('input',invalidate);
let checkoutUser=null;
async function openCart(){
 const dialog=$('#cart-dialog');
 if(!dialog.open)dialog.showModal();
 const status=$('#checkout-session');
 const signIn=$('#checkout-sign-in'),register=$('#checkout-register');
 signIn.textContent='Sign in';register.hidden=false;
 status.textContent='Checking your account…';
 try{
  const response=await fetch('/api/auth/get-session',{cache:'no-store'});
  if(!response.ok)throw Error();
  const session=await response.json();
  checkoutUser=session?.user?.emailVerified?session.user:null;
  $('#checkout-auth').hidden=Boolean(checkoutUser);
  $('#checkout').hidden=!checkoutUser;
  if(checkoutUser){
   $('#checkout-account').textContent='Ordering as '+checkoutUser.email;
   const name=$('#checkout input[name="name"]');
   if(!name.value)name.value=checkoutUser.name||'';
  }
  const pending=session?.user&&!session.user.emailVerified;
  signIn.textContent=pending?'Verify account':'Sign in';
  register.hidden=Boolean(pending);
  status.textContent=pending?'Your account is pending verification. Open My Dashboard to activate it.':'';
 }catch{
  checkoutUser=null;$('#checkout').hidden=true;$('#checkout-auth').hidden=false;
  status.textContent='Your session could not be checked. Sign in or reopen the cart.';
 }
}
$('#change-checkout-account').onclick=async()=>{
 try{
  const response=await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)throw Error();
  window.location.assign('/dashboard?checkout=1'+(paymentSelect.value==='qrph'?'&payment=qrph':''));
 }catch{toast('Could not sign out. Please try again.');}
};
const paymentSelect=$('#checkout select[name="paymentMethod"]');
if(cartParams.get('payment')==='qrph'){
 paymentSelect.value='qrph';
 for(const link of $('#checkout-auth').querySelectorAll('a')){
  const url=new URL(link.href);url.searchParams.set('payment','qrph');link.href=url;
 }
}
function showPaymentDetails(){$('#qr-checkout-note').hidden=paymentSelect.value!=='qrph';}
paymentSelect.onchange=showPaymentDetails;
showPaymentDetails();
const fulfillmentSelect=$('#checkout select[name="fulfillmentMethod"]');
const checkoutLocation=$('#checkout input[name="location"]');
const deliveryFeeAccepted=$('#checkout input[name="deliveryFeeAccepted"]');
function showFulfillmentDetails(){
 const maxim=fulfillmentSelect.value==='maxim';
 $('#maxim-checkout-note').hidden=!maxim;
 $('#meetup-checkout-note').hidden=maxim;
 deliveryFeeAccepted.required=maxim;
 deliveryFeeAccepted.disabled=!maxim;
 $('#checkout-location-label').textContent=maxim?'Delivery address in Roxas City':'Preferred meetup point / landmark';
 checkoutLocation.placeholder=maxim?'House number, street, barangay and landmark':'Barangay, street or landmark in Roxas City';
 checkoutLocation.autocomplete=maxim?'street-address':'off';
}
fulfillmentSelect.onchange=showFulfillmentDetails;
showFulfillmentDetails();

const attemptKey='circuitbyte.checkoutAttempt';
let checkoutAttempt=null,placing=false;
async function checkoutFingerprint(payload){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload));
 return Array.from(new Uint8Array(bytes),value=>value.toString(16).padStart(2,'0')).join('');
}
function saveCheckoutAttempt(){
 try{sessionStorage.setItem(attemptKey,JSON.stringify(checkoutAttempt));}catch{}
}
const restoredAttempt=(async()=>{
 try{
  const attempt=JSON.parse(sessionStorage.getItem(attemptKey)||'null');
  if(!attempt)return;
  // Upgrade pending checkouts that stored the form as plain text.
  if(!/^[0-9a-f]{64}$/.test(attempt.fingerprint)){
   sessionStorage.removeItem(attemptKey);
   attempt.fingerprint=await checkoutFingerprint(attempt.fingerprint);
  }
  checkoutAttempt={fingerprint:attempt.fingerprint,requestId:attempt.requestId,token:attempt.token};
  saveCheckoutAttempt();
 }catch{}
})();
$('#checkout').onsubmit=async e=>{
 e.preventDefault();if(!cart.length||placing)return;
 const f=new FormData(e.currentTarget);
 if(cart.some(i=>products.find(p=>p.id===i.id)?.options&&!i.option)){toast('Choose an option for each product in your cart.');return;}
 if(cart.some(i=>products.find(p=>p.id===i.id)?.options?.wireLengthsCm&&!validWireLength(i.wireLengthCm))){toast('Choose a length for each Dupont wire in your cart.');return;}
 if(!checkoutUser?.emailVerified){toast('Verify your email before placing an order.');return;}
 const maxim=f.get('fulfillmentMethod')==='maxim';
 if(maxim&&f.get('deliveryFeeAccepted')!=='yes'){toast('Please acknowledge the separate Maxim delivery fee.');return;}
 const payload={
  name:String(f.get('name')),contact:String(f.get('contact')),location:String(f.get('location')),
  city:'Roxas City, Capiz',paymentMethod:String(f.get('paymentMethod')),notes:String(f.get('notes')||''),
  invoice:{name:String(f.get('invoiceName')||''),address:String(f.get('invoiceAddress')||''),tin:String(f.get('invoiceTin')||'')},
  items:cart.map(i=>({id:i.id,quantity:i.quantity,price_cents:Math.round(products.find(p=>p.id===i.id).price*100),...(i.option?{option:i.option}:{}),...(i.wireLengthCm!==undefined?{wireLengthCm:i.wireLengthCm}:{})})),
  ...(maxim?{fulfillmentMethod:'maxim',deliveryFeeAccepted:true}:{})
 };
 placing=true;$('#prepare').disabled=true;$('#prepare').textContent='Submitting…';
 try{
  await restoredAttempt;
  const fingerprint=await checkoutFingerprint(JSON.stringify({...payload,account:checkoutUser.id}));
  if(checkoutAttempt&&checkoutAttempt.fingerprint!==fingerprint){
   toast('A previous submission needs checking. Use Track order before changing this checkout.');
   window.location.href='/track.html#'+checkoutAttempt.token;return;
  }
  if(!checkoutAttempt){
   checkoutAttempt={fingerprint,requestId:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('')};
   saveCheckoutAttempt();
  }
  const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({...payload,requestId:checkoutAttempt.requestId,token:checkoutAttempt.token})});
  const data=await response.json();
  if(!response.ok){
   if(response.status<500){checkoutAttempt=null;try{sessionStorage.removeItem(attemptKey);}catch{}}
   throw Error(data.error||'Unable to submit order');
  }
  const link=location.origin+'/track.html#'+checkoutAttempt.token;
  try{localStorage.setItem('circuitbyte.lastTracking',checkoutAttempt.token);sessionStorage.removeItem(attemptKey);}catch{}
  checkoutAttempt=null;cart=[];save();renderCart();
  const purchasedIds=payload.items.map(item=>item.id).filter(id=>/^cb-\d{3}$/.test(id)).slice(0,16);
  $('#studio-build-order').href='/studio?parts='+encodeURIComponent(purchasedIds.join(','));
  const handover=data.fulfillment_method==='maxim'?'Maxim door-to-door. You pay the courier fee separately.':'Meetup in Roxas City, Capiz.';
  const payment=data.payment_method==='qrph'?'QR Ph: View the QR in My Orders when CircuitByte opens payment.':'Cash at handover. CircuitByte will confirm the arrangements.';
  $('#order-message').value=`Order ${data.reference} — ${data.status}\nItems total: ${money(data.total_cents/100)}\n${handover}\n${payment}\n\nPrivate tracking link (keep safe):\n${link}`;
  let a=$('#track-new-order');if(!a){a=el('a','primary','Track this order →');a.id='track-new-order';$('#order-result').prepend(a);}
  a.href=link;$('#order-result').hidden=false;$('#order-result').scrollIntoView({block:'nearest'});
  checkoutLocation.value='';$('#checkout textarea[name="notes"]').value='';
  for(const field of ['invoiceName','invoiceAddress','invoiceTin'])$('#checkout input[name="'+field+'"]').value='';
  toast('Order recorded. Check your email for confirmation.');
 }catch(err){toast(err.message+' — Retry unchanged if the connection failed.');}
 finally{placing=false;$('#prepare').disabled=!cart.length;$('#prepare').textContent='Place order ↗';}
};
$('#copy-order').onclick=async()=>{try{await navigator.clipboard.writeText($('#order-message').value);toast('Order confirmation copied. Keep your tracking link safe.');}catch{$('#order-message').focus();$('#order-message').select();toast('Select and copy the message manually.');}};$('#year').textContent=new Date().getFullYear();
fetch('/api/products').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{products=data;
 const suggested=products.find(p=>p.options?.wireLengthsCm)?.options.wireLengthsCm||[];
 $('#wire-length-suggestions').replaceChildren(...suggested.map(length=>new Option(length+' cm',String(length))));
 load();readCatalogUrl();renderCategories();renderProducts();renderCart();const requested=new URLSearchParams(location.search).get('product');const selected=products.find(p=>p.id===requested);if(selected)details(selected);else if(new URLSearchParams(location.search).get('cart')==='1')openCart();}).catch(()=>{if(isCatalog){$('#catalog-count').textContent='Catalog could not load. Please refresh the page.';$('#products').append(el('p','muted','We could not reach the catalog. Please try again shortly or contact CircuitByte.'));}else toast('Products could not load. Please refresh before opening your cart.');$('#prepare').disabled=true;});

function readCatalogUrl(){if(!isCatalog)return;const q=new URLSearchParams(location.search);category=Object.hasOwn(labels,q.get('category'))?q.get('category'):'all';page=Math.max(1,parseInt(q.get('page'),10)||1);pageSize=[12,24,48].includes(Number(q.get('size')))?Number(q.get('size')):12;$('#page-size').value=pageSize;$('#search').value=(q.get('q')||'').slice(0,200);$('#sort').value=['featured','low','high','name'].includes(q.get('sort'))?q.get('sort'):'featured';}
function syncCatalogUrl(replace=false){if(!isCatalog)return;const url=new URL(location.href);for(const [key,value] of Object.entries({page:page>1?page:'',size:pageSize!==12?pageSize:'',category:category==='all'?'':category,q:$('#search').value.trim(),sort:$('#sort').value==='featured'?'':$('#sort').value})){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}history[replace?'replaceState':'pushState']({},'',url);}
function renderPagination(pages,count){const host=$('#pagination');host.replaceChildren();$('#page-status').textContent=count?`Page ${page} of ${pages}`:'No results. Try changing your filters.';if(!count)return;
 const item=(label,target,disabled=false,current=false)=>{const li=el('li','page-item'+(current?' active':'')),b=el('button','page-link',String(label));b.type='button';b.disabled=disabled;b.setAttribute('aria-label',typeof label==='number'?'Page '+label:label+' page');if(current)b.setAttribute('aria-current','page');b.onclick=()=>{page=target;renderProducts();syncCatalogUrl();$('#filter-title').tabIndex=-1;$('#filter-title').focus({preventScroll:true});$('#catalog').scrollIntoView({block:'start',behavior:'auto'});};li.append(b);host.append(li);};
 item('Previous',page-1,page===1);const visible=[...new Set([1,...Array.from({length:5},(_,i)=>page-2+i).filter(n=>n>=1&&n<=pages),pages])].sort((a,b)=>a-b);let previous=0;for(const n of visible){if(previous&&n-previous>1){const li=el('li','page-item disabled');li.append(el('span','page-link','…'));host.append(li);}item(n,n,false,n===page);previous=n;}item('Next',page+1,page===pages);
}
addEventListener('popstate',()=>{if(isCatalog){readCatalogUrl();renderCategories();renderProducts();}});
