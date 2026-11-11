'use client';
import {useState,useEffect,useRef} from 'react';
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
const categoryLabels={all:'All categories',components:'Components',sensors:'Sensors',modules:'Modules',motors:'Motors',boards:'Boards',tools:'Tools & supplies'};
const productCategories=Object.keys(categoryLabels).filter(id=>id!=='all');
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
const editorHeading=useRef(null);
const editing=Boolean(product);
useEffect(()=>{if(editing)editorHeading.current?.focus();},[editing]);
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

async function toggleHistory(){
 if(history){setHistory(null);return;}
 try{
  const response=await fetch('/api/admin/history');
  if(!response.ok)throw Error('History unavailable');
  setHistory(await response.json());
 }catch(error){setError(error.message);}
}

function edit(item){
 setError('');setSelectedPhoto(null);setSavedPhotoDraft(null);setProduct(productDraft(item));
}

function showInventoryList(status){
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
const notice=<p className={success?'inventory-notice success':'inventory-notice'} role={success?'status':'alert'} aria-live="polite">{error}</p>;

return <main className="inventory-admin" id="main">
 <header className="inventory-header">
  <div>
   <p>CircuitByte Admin</p>
   <h1>Inventory &amp; orders</h1>
  </div>
  <nav className="inventory-nav" aria-label="Admin navigation">
   <a href="/catalog">Shop ↗</a>
   {signed&&<>
    <button type="button" className="inventory-secondary" disabled={busy||loading} onClick={signOut}>Sign out</button>
   </>}
  </nav>
 </header>

 {!signed&&notice}
 {signed===null?(
  loading?<p role="status">Checking administrator access…</p>:
   <button type="button" onClick={()=>load()}>Retry inventory</button>
 ):!signed?(
  <form onSubmit={login}>
   <h2>Administrator sign in</h2>
   <label>Email<input name="email" type="email" required autoComplete="username"/></label>
   <label>Password<input name="password" type="password" required autoComplete="current-password"/></label>
   <button disabled={busy}>Sign in</button>
  </form>
 ):<>
  <div className="inventory-overview">
   <section aria-labelledby="stock-overview-title">
    <h2 id="stock-overview-title">Stock overview</h2>
    <div className="inventory-stats">
     <button type="button" className="inventory-stat-action" aria-pressed={filter==='out'} aria-controls={editing?undefined:'inventory-results'}
      disabled={busy||editing} onClick={()=>showInventoryList('out')}>
      <strong>{items.filter(isOutOfStock).length}</strong><span>Out of stock</span>
     </button>
     <button type="button" className="inventory-stat-action" aria-pressed={filter==='unknown'} aria-controls={editing?undefined:'inventory-results'}
      disabled={busy||editing} onClick={()=>showInventoryList('unknown')}>
      <strong>{items.filter(isUncounted).length}</strong><span>Awaiting stock count</span>
     </button>
     <button type="button" className="inventory-stat-action" aria-pressed={filter==='low'} aria-controls={editing?undefined:'inventory-results'}
      disabled={busy||editing} onClick={()=>showInventoryList('low')}>
      <strong>{items.filter(isLowStock).length}</strong><span>Low available stock</span>
     </button>
     <div><strong>{items.length}</strong><span>Catalog products</span></div>
    </div>
   </section>
   <section className="order-overview" aria-labelledby="order-overview-title">
    <h2 id="order-overview-title">Order queue</h2>
    <dl>
     <div><dt>Pending orders</dt><dd>{orderSummary?.pending??'—'}</dd></div>
     <div><dt>Confirmed</dt><dd>{orderSummary?.confirmed??'—'}</dd></div>
     <div><dt>Ready for handover</dt><dd>{orderSummary?.ready??'—'}</dd></div>
    </dl>
    <a href="/admin/orders">Orders &amp; fulfillment →</a>
   </section>
  </div>

  {notice}
  {product?(
   <form onSubmit={save} className="inventory-editor">
    <h2 ref={editorHeading} tabIndex={-1}>{product.version?'Edit product':'New product'}</h2>
    <fieldset disabled={busy}>
     {['name','description','quantity_label','reason'].map(k=><label key={k}>
      {k==='reason'?'Change note (optional)':k.replaceAll('_',' ')}
      {k==='description'?<textarea value={product[k]} onChange={e=>setProduct({...product,[k]:e.target.value})}/>:
       <input required={k==='name'} placeholder={k==='reason'?'e.g. Updated description or stock':''} value={product[k]}
        onChange={e=>setProduct({...product,[k]:e.target.value})}/>}
     </label>)}
     <label>Price (PHP)
      <input type="number" min="0" step="0.01" required max="1000000" value={product.priceInput}
       onChange={e=>setProduct({...product,priceInput:e.target.value})}/>
     </label>
     <label>Total on-hand stock (includes reserved units; blank = not counted)
      <input type="number" min="0" step="1" value={product.stock??''}
       onChange={e=>setProduct({...product,stock:e.target.value===''?null:Number(e.target.value)})}/>
     </label>
     {product.reserved_stock>0&&<p className="stock-reservation-note">
      {product.reserved_stock} unit(s) reserved for open orders · {Math.max(0,(product.stock??0)-product.reserved_stock)} available to sell.
     </p>}
     <label>Category
      <select value={product.categories[0]} onChange={e=>setProduct({...product,categories:[e.target.value]})}>
       {productCategories.map(id=><option key={id} value={id}>{categoryLabels[id]}</option>)}
      </select>
     </label>
     <label><span><input type="checkbox" checked={product.active} onChange={e=>setProduct({...product,active:e.target.checked})}/> Published</span></label>
     <label>Product photo (JPEG/PNG/WebP, maximum 3 MB)
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={photo}/>
      <small>Selected photo uploads when you save the product.</small>
      {(preview||product.image_url)&&<img className="inventory-photo-preview" src={preview||product.image_url} alt="Product preview"/>}
     </label>
     <div className="inventory-actions">
      <button disabled={busy}>{busy?'Saving…':product===savedPhotoDraft&&selectedPhoto?'Retry photo':'Save product'}</button>
      <button type="button" className="inventory-secondary" disabled={busy} onClick={()=>{setError('');closeEditor();}}>Cancel</button>
     </div>
    </fieldset>
   </form>
  ):(
   <section id="inventory-results" tabIndex={-1} aria-labelledby="inventory-results-heading">
    {stockView&&<button type="button" className="inventory-secondary" onClick={()=>showInventoryList('all')}>← Back to inventory</button>}
    <div className="inventory-list-heading">
     <div>
      <h2 id="inventory-results-heading">{filter==='out'?'Out-of-stock products':filter==='unknown'?'Products awaiting a stock count':'Inventory'}</h2>
      <p>{filteredItems.length} {filteredItems.length===1?'product':'products'}</p>
     </div>
     <div className="inventory-actions">
      <button type="button" disabled={busy} onClick={()=>edit({...blank,id:crypto.randomUUID()})}>Add product</button>
      <button type="button" className="inventory-secondary" disabled={busy||loading} onClick={()=>{setError('');load(true);}}>Refresh inventory</button>
      <button type="button" className="inventory-secondary" aria-expanded={Boolean(history)} onClick={toggleHistory}>{history?'Hide activity':'Activity history'}</button>
     </div>
    </div>
    <div className="inventory-filters">
     <label>Search inventory
      <input type="search" placeholder="Product name" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/>
     </label>
     <label>Product category
      <select value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}>
       {Object.entries(categoryLabels).map(([id,label])=><option key={id} value={id}>
        {label} ({items.filter(p=>id==='all'||p.categories.includes(id)).length})
       </option>)}
      </select>
     </label>
     <label>Inventory status
      <select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}>
       <option value="all">All products</option><option value="active">Published</option><option value="archived">Archived</option>
       <option value="out">Out of stock</option><option value="low">Low stock</option><option value="unknown">Uncounted</option>
      </select>
     </label>
    </div>
    {history&&<section className="history">
     <h2>Recent activity</h2><p>Latest 100 changes · Philippine time</p>
     {history.length===0?<p>No changes yet.</p>:history.map(h=><article key={h.id}>
      <strong>{h.name}</strong> — {h.reason}
      <small>{h.actor} · {new Date(h.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</small>
      <small>Price: ₱{((h.before_data?.price_cents??0)/100).toFixed(2)} → ₱{((h.after_data?.price_cents??0)/100).toFixed(2)} · Stock: {h.before_data?.stock??'uncounted'} → {h.after_data?.stock??'uncounted'}</small>
     </article>)}
    </section>}
    {stockView&&<p className="inventory-stock-guide">{filter==='out'?'Add new units to on-hand stock. Existing reservations are kept.':'Enter the total units you currently have on hand.'}</p>}
    {!visibleItems.length?<p className="inventory-empty">{stockView?'No products match this stock filter.':'No products match these filters.'}</p>:stockView?(
     <ul className="restock-list">
      {visibleItems.map(item=><RestockRow key={item.id+':'+item.version} item={item} busy={busy} onRestock={restock} onEdit={edit}/>)}
     </ul>
    ):(
     <table className="inventory-table" aria-label="Product inventory" role="table">
      <thead role="rowgroup"><tr role="row">
       {['Product','Price','Stock','Status','Action'].map(label=><th key={label} scope="col" role="columnheader">{label}</th>)}
      </tr></thead>
      <tbody role="rowgroup">{visibleItems.map(p=><tr key={p.id} role="row">
       <th className="inventory-product-name" scope="row" role="rowheader">{p.name}</th>
       <td className="inventory-price" role="cell">₱{(p.price_cents/100).toFixed(2)}</td>
       <td className="inventory-stock" role="cell">
        <span>{p.stock===null?'Stock not counted':p.stock+' on hand'}</span>
        {p.reserved_stock>0&&<small>{p.reserved_stock} reserved · {availableStock(p)} available</small>}
       </td>
       <td className="inventory-visibility" role="cell">
        <span className={'inventory-badge'+(p.active?'':' archived')}>{p.active?'Published':'Archived'}</span>
       </td>
       <td className="inventory-edit" role="cell">
        <button type="button" className="inventory-secondary" disabled={busy} onClick={()=>edit(p)} aria-label={'Edit '+p.name}>Edit</button>
       </td>
      </tr>)}</tbody>
     </table>
    )}
    {pageCount>1&&<nav className="inventory-pager" aria-label="Inventory pages">
     <button type="button" disabled={currentPage<=1||busy} onClick={()=>setPage(currentPage-1)}>← Previous</button>
     <span>Page {currentPage} of {pageCount} · {filteredItems.length} products</span>
     <button type="button" disabled={currentPage>=pageCount||busy} onClick={()=>setPage(currentPage+1)}>Next →</button>
    </nav>}
   </section>
  )}
 </>}
</main>;
}
