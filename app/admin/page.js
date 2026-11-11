'use client';
import {useState,useEffect} from 'react';
import './admin.css';
import {createAuthClient} from 'better-auth/react';
const auth=createAuthClient();
const blank={id:'',name:'',description:'',categories:['components'],price_cents:0,stock:null,quantity_label:'',active:true,version:0,reason:''};
const maxStock=1000000;
const productDraft=item=>({...item,reason:'',priceInput:String(item.price_cents/100)});
const pageSize=25;
const availableStock=p=>p.stock===null?null:p.stock-p.reserved_stock;
const isOutOfStock=p=>p.active&&availableStock(p)===0;
const isLowStock=p=>p.active&&availableStock(p)>0&&availableStock(p)<=5;
const isUncounted=p=>p.stock===null;
const inventoryFilters={all:()=>true,active:p=>p.active,archived:p=>!p.active,out:isOutOfStock,low:isLowStock,unknown:isUncounted};

function RestockRow({item,busy,onRestock,onEdit}){
 const uncounted=isUncounted(item);
 return <li className="restock-row">
  <div>
   <strong>{item.name}</strong>
   <p>{uncounted?'Stock not counted':item.reserved_stock>0?`0 available · ${item.reserved_stock} reserved`:'0 available'}</p>
   {!item.active&&<small>Archived</small>}
  </div>
  <form className="restock-form" onSubmit={e=>{
   e.preventDefault();
   const quantity=new FormData(e.currentTarget).get('quantity');
   onRestock(item,quantity);
  }}>
   <label>{uncounted?'On-hand count':'Units to add'}
    <input type="number" name="quantity" inputMode="numeric" min={uncounted?0:1}
     max={maxStock-(item.stock??0)} step="1" required disabled={busy}
     aria-label={(uncounted?'On-hand count for ':'Restock quantity for ')+item.name}/>
   </label>
   <button type="submit" disabled={busy}>{uncounted?'Save count':'Restock'}</button>
   <button type="button" className="restock-edit" onClick={()=>onEdit(item)} disabled={busy}>Edit</button>
  </form>
 </li>;
}
export default function Admin(){
const [items,setItems]=useState([]),[product,setProduct]=useState(null),[error,setError]=useState('');
const [signed,setSigned]=useState(null),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[busy,setBusy]=useState(false);
const [history,setHistory]=useState(null),[filter,setFilter]=useState('all'),[category,setCategory]=useState('all'),[page,setPage]=useState(1);
const [orderSummary,setOrderSummary]=useState(null),[selectedPhoto,setSelectedPhoto]=useState(null),[preview,setPreview]=useState('');
const [savedPhotoDraft,setSavedPhotoDraft]=useState(null);
useEffect(()=>{if(!selectedPhoto){setPreview('');return;}const url=URL.createObjectURL(selectedPhoto);setPreview(url);return()=>URL.revokeObjectURL(url);},[selectedPhoto]);

async function load(showSignInError=false){
 setLoading(true);
 const read=async path=>{
  const response=await fetch(path,{cache:'no-store'});
  return {response,data:await response.json().catch(()=>null)};
 };
 try{
  const [inventory,orders]=await Promise.allSettled([read('/api/admin/products'),read('/api/admin/orders?offset=0')]);
  setOrderSummary(orders.status==='fulfilled'&&orders.value.response.ok?orders.value.data?.summary:null);
  if(inventory.status==='rejected'){
   setError('Could not connect to CircuitByte. Refresh inventory to retry.');
   return null;
  }
  const {response,data}=inventory.value;
  if(response.status===401||response.status===403){
   setItems([]);setOrderSummary(null);setSigned(false);
   if(showSignInError)setError(data?.error||'Sign in with your administrator account.');
   return null;
  }
  if(!response.ok||!Array.isArray(data)){
   setError(data?.error||'Could not load inventory. Refresh inventory to retry.');
   return null;
  }
  setItems(data);setSigned(true);
  return data;
 }finally{setLoading(false);}
}
useEffect(()=>{load();},[]);

async function login(e){
 e.preventDefault();setBusy(true);setError('');
 try{
  const f=new FormData(e.currentTarget);
  const result=await auth.signIn.email({email:f.get('email'),password:f.get('password')});
  if(result.error)throw Error(result.error.message);
  await load(true);
 }catch(e){setError(e.message);}finally{setBusy(false);}
}
async function signOut(){
 setBusy(true);setError('');
 try{
  const result=await auth.signOut();
  if(result?.error)throw Error(result.error.message);
  setSigned(false);setItems([]);setOrderSummary(null);setHistory(null);closeEditor();
 }catch(e){setError(e.message||'Could not sign out. Please retry.');}finally{setBusy(false);}
}
function closeEditor(){setProduct(null);setSelectedPhoto(null);setSavedPhotoDraft(null);}
function updateInventory(item){
 setItems(current=>{
  const next=current.filter(p=>p.id!==item.id).concat(item);
  return next.sort((a,b)=>a.name.localeCompare(b.name));
 });
 setHistory(null);
}
async function save(e){
 e.preventDefault();if(busy)return;
 const {priceInput,...details}=product;
 const price_cents=Math.round(Number(priceInput)*100);
 if(!priceInput.trim()||!Number.isInteger(price_cents)||price_cents<0||price_cents>100000000){
  setError('Enter a price from ₱0 to ₱1,000,000.');
  return;
 }
 setBusy(true);setError('');
 try{
  let saved=product;
  if(product!==savedPhotoDraft){
   const response=await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({...details,price_cents,reason:details.reason?.trim()||'Updated product details'})});
   const data=await response.json().catch(()=>null);
   if(!response.ok||!data)throw Error(data?.error||`Could not save product (HTTP ${response.status}).`);
   updateInventory(data);saved=productDraft(data);
   setProduct(saved);setSavedPhotoDraft(saved);
  }
  if(selectedPhoto){
   try{
    const form=new FormData();
    form.set('file',selectedPhoto);form.set('id',saved.id);form.set('version',String(saved.version));
    const response=await fetch('/api/admin/upload',{method:'POST',body:form});
    const data=await response.json().catch(()=>null);
    if(response.status===409){
     const items=await load(true),current=items?.find(p=>p.id===saved.id);
     if(current){const draft=productDraft(current);setProduct(draft);setSavedPhotoDraft(draft);}
    }
    if(!response.ok||!data)throw Error(data?.error||`Upload failed (HTTP ${response.status}).`);
    updateInventory(data);
   }catch(e){
    setError('Product details were saved. Photo upload failed: '+e.message+' Use Retry photo to try again.');
    return;
   }
  }
  closeEditor();
  setError(selectedPhoto?'Product and photo saved successfully.':'Product saved successfully.');
 }catch(e){setError(e.message||'Product could not be saved. Please retry.');}finally{setBusy(false);}
}
function photo(e){const file=e.target.files?.[0];if(!file){setSelectedPhoto(null);return;}if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3000000){setError('Choose a JPEG, PNG or WebP image under 3 MB.');e.target.value='';setSelectedPhoto(null);return;}setSelectedPhoto(file);setError('');}
async function restock(item,rawQuantity){
 if(busy)return;
 const quantity=Number(rawQuantity),uncounted=isUncounted(item);
 const stock=(item.stock??0)+quantity;
 if(typeof rawQuantity!=='string'||!rawQuantity.trim()||!Number.isInteger(quantity)||quantity<(uncounted?0:1)||stock>maxStock){
  setError(uncounted?'Enter a whole on-hand quantity of zero or more.':'Enter a positive whole quantity to restock.');
  return;
 }
 setBusy(true);setError('');
 try{
  const response=await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({...item,stock,reason:uncounted?`Recorded on-hand count of ${quantity}`:`Restocked ${quantity} unit(s)`})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Stock could not be saved. Refresh the inventory and try again.');
  updateInventory(data);
  setError(`Stock saved for ${data.name}. ${availableStock(data)} available.`);
 }catch(e){setError(e.message||'The save could not be confirmed. Refresh inventory before retrying.');}
 finally{setBusy(false);}
}

function edit(item){
 setError('');setSelectedPhoto(null);setSavedPhotoDraft(null);setProduct(productDraft(item));
}

function openStockList(status){
 setFilter(status);setCategory('all');setQuery('');setPage(1);
 requestAnimationFrame(()=>document.getElementById('inventory-results')?.focus());
}

const search=query.trim().toLowerCase();
const filteredItems=items.filter(p=>(category==='all'||p.categories.includes(category))&&p.name.toLowerCase().includes(search)&&inventoryFilters[filter](p));
const pageCount=Math.max(1,Math.ceil(filteredItems.length/pageSize));
const currentPage=Math.min(page,pageCount);
const visibleItems=filteredItems.slice((currentPage-1)*pageSize,currentPage*pageSize);
const stockView=filter==='out'||filter==='unknown';
const success=error.startsWith('Product saved')||error.startsWith('Product and photo saved')||error.startsWith('Stock saved');
return <main style={{maxWidth:1100,margin:'30px auto',padding:20,fontFamily:'system-ui',color:'#183c37'}}><style>{`body{background:#f0f4ef}input,textarea,select,button{font:inherit;padding:12px;border:1px solid #b3c7bd;border-radius:7px}button{cursor:pointer;background:#174d40;color:white}label{display:grid;gap:6px;margin:14px 0}table{width:100%;border-collapse:collapse;background:white}td,th{text-align:left;padding:14px;border-bottom:1px solid #ddd}form{max-width:650px}nav{display:flex;gap:12px;flex-wrap:wrap}textarea{min-height:100px}`}</style><a href="/">← Storefront</a><h1>CircuitByte / Admin</h1><p>Manage stock, product changes and customer fulfillment from one workspace.</p><p role={success?'status':'alert'} aria-live="polite" style={{minHeight:24,color:success?'#17633b':error?'#a12323':'inherit',fontWeight:600}}>{error}</p>{signed===null?<p role="status">{loading?'Checking administrator access…':<button type="button" onClick={()=>load()}>Retry inventory</button>}</p>:!signed?<form onSubmit={login}><h2>Administrator sign in</h2><label>Email<input name="email" type="email" required autoComplete="username"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label><button disabled={busy}>Sign in</button></form>:<><nav><a href="/admin/orders">Orders &amp; fulfillment →</a><button disabled={busy} onClick={()=>edit({...blank,id:crypto.randomUUID()})}>Add product</button><button disabled={busy||loading||Boolean(product)} onClick={async()=>{setError('');await load(true);}}>Refresh inventory</button><button disabled={busy||loading} onClick={signOut}>Sign out</button><input aria-label="Search inventory" placeholder="Search inventory" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/><select aria-label="Product category" value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}>{Object.entries({all:'All categories',components:'Components',sensors:'Sensors',modules:'Modules',motors:'Motors',boards:'Boards',tools:'Tools & supplies'}).map(([id,label])=><option key={id} value={id}>{label} ({items.filter(p=>id==='all'||p.categories.includes(id)).length})</option>)}</select><select aria-label="Inventory status" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="all">All products</option><option value="active">Published</option><option value="archived">Archived</option><option value="out">Out of stock</option><option value="low">Low stock</option><option value="unknown">Uncounted</option></select><button onClick={async()=>{if(history){setHistory(null);return;}try{const r=await fetch('/api/admin/history');if(!r.ok)throw Error('History unavailable');setHistory(await r.json());}catch(e){setError(e.message);}}}>{history?'Hide activity':'Activity history'}</button></nav><div className="inventory-stats"><div><strong>{items.length}</strong><span>Catalog products</span></div><button type="button" className="inventory-stat-action" aria-pressed={filter==='out'} aria-controls="inventory-results"
 disabled={busy||Boolean(product)} onClick={()=>openStockList('out')}><strong>{items.filter(isOutOfStock).length}</strong><span>Out of stock</span></button>
<div><strong>{items.filter(isLowStock).length}</strong><span>Low available stock</span></div>
<button type="button" className="inventory-stat-action" aria-pressed={filter==='unknown'} aria-controls="inventory-results"
 disabled={busy||Boolean(product)} onClick={()=>openStockList('unknown')}><strong>{items.filter(isUncounted).length}</strong><span>Awaiting stock count</span></button><div><strong>{orderSummary?.pending??'—'}</strong><span>Pending orders</span></div><div><strong>{orderSummary?.confirmed??'—'}</strong><span>Confirmed</span></div><div><strong>{orderSummary?.ready??'—'}</strong><span>Ready for handover</span></div></div>{history&&<section className="history"><h2>Recent activity</h2><p>Latest 100 changes · Philippine time</p>{history.length===0?<p>No changes yet.</p>:history.map(h=><article key={h.id}><strong>{h.name}</strong> — {h.reason}<small>{h.actor} · {new Date(h.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</small><small>Price: ₱{((h.before_data?.price_cents??0)/100).toFixed(2)} → ₱{((h.after_data?.price_cents??0)/100).toFixed(2)} · Stock: {h.before_data?.stock??'uncounted'} → {h.after_data?.stock??'uncounted'}</small></article>)}</section>}{product?<form onSubmit={save}><h2>{product.version?'Edit product':'New product'}</h2><fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>{['name','description','quantity_label','reason'].map(k=><label key={k}>{k==='reason'?'Change note (optional)':k.replaceAll('_',' ')}{k==='description'?<textarea value={product[k]} onChange={e=>setProduct({...product,[k]:e.target.value})}/>:<input required={k==='name'} placeholder={k==='reason'?'e.g. Updated description or stock':''} value={product[k]} onChange={e=>setProduct({...product,[k]:e.target.value})}/>}</label>)}<label>Price (PHP)<input type="number" min="0" step="0.01" required max="1000000" value={product.priceInput} onChange={e=>setProduct({...product,priceInput:e.target.value})}/></label><label>Total on-hand stock (includes reserved units; blank = not counted)<input type="number" min="0" step="1" value={product.stock??''} onChange={e=>setProduct({...product,stock:e.target.value===''?null:Number(e.target.value)})}/></label>{product.reserved_stock>0&&<p className="stock-reservation-note">{product.reserved_stock} unit(s) reserved for open orders · {Math.max(0,(product.stock??0)-product.reserved_stock)} available to sell.</p>}<label>Category<select value={product.categories[0]} onChange={e=>setProduct({...product,categories:[e.target.value]})}>{['components','sensors','modules','motors','boards','tools'].map(c=><option key={c}>{c}</option>)}</select></label><label><span><input type="checkbox" checked={product.active} onChange={e=>setProduct({...product,active:e.target.checked})}/> Published</span></label><button disabled={busy}>{busy?'Saving…':product===savedPhotoDraft&&selectedPhoto?'Retry photo':'Save product'}</button> <button type="button" disabled={busy} onClick={()=>{setError('');closeEditor();}}>Cancel</button><label>Product photo (JPEG/PNG/WebP, maximum 3 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={photo}/><small>Selected photo uploads when you save the product.</small>{(preview||product.image_url)&&<img src={preview||product.image_url} alt="Product preview" style={{width:160,height:140,objectFit:'contain'}}/>}</label></fieldset></form>:
 <section id="inventory-results" tabIndex={-1} aria-labelledby="inventory-results-heading">
  <h2 id="inventory-results-heading">{filter==='out'?'Out-of-stock products':filter==='unknown'?'Products awaiting a stock count':'Inventory'}</h2>
  {stockView&&<p>{filter==='out'?'Add new units to on-hand stock. Existing reservations are kept.':'Enter the total units you currently have on hand.'}</p>}
  {!visibleItems.length?<p>{stockView?'No products match this stock filter.':'No products match these filters.'}</p>:stockView?
   <ul className="restock-list">{visibleItems.map(item=><RestockRow key={item.id+':'+item.version} item={item} busy={busy} onRestock={restock} onEdit={edit}/>)}</ul>:
   <div style={{overflowX:'auto'}}>
    <table>
     <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead>
     <tbody>{visibleItems.map(p=><tr key={p.id}>
      <td>{p.name}</td><td>₱{(p.price_cents/100).toFixed(2)}</td>
      <td>{p.stock??'Not counted'}{p.reserved_stock>0&&<small> · {p.reserved_stock} reserved · {availableStock(p)} available</small>}</td>
      <td>{p.active?'Published':'Archived'}</td>
      <td><button type="button" disabled={busy} onClick={()=>edit(p)}>Edit</button></td>
     </tr>)}</tbody>
    </table>
   </div>}
  {pageCount>1&&<nav className="inventory-pager" aria-label="Inventory pages">
   <button type="button" disabled={currentPage<=1||busy} onClick={()=>setPage(currentPage-1)}>← Previous</button>
   <span>Page {currentPage} of {pageCount} · {filteredItems.length} products</span>
   <button type="button" disabled={currentPage>=pageCount||busy} onClick={()=>setPage(currentPage+1)}>Next →</button>
  </nav>}
 </section>}</>}</main>}
