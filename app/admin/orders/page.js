'use client';
import {useState,useEffect} from 'react';
import '../admin.css';
import './orders.css';
import {OrderProgress,paymentLabel,peso} from '../../order-display';
const options={Pending:['Pending','Confirmed','Cancelled'],Confirmed:['Confirmed','Ready','Cancelled'],Ready:['Ready','Completed','Cancelled'],Completed:['Completed'],Cancelled:['Cancelled']};
const esc=s=>String(s||'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function printInvoice(invoice,order){const w=window.open('','_blank','width=850,height=900');if(!w)throw Error('Allow pop-ups to print the invoice.');w.opener=null;const rows=(invoice.items||order.items||[]).map(i=>`<tr><td>${esc(i.name)}${i.option?`<small><br>${esc(i.option_label||'Option')}: ${esc(i.option)}</small>`:''}</td><td>${i.quantity}</td><td>₱${(i.price_cents/100).toFixed(2)}</td><td>₱${(i.price_cents*i.quantity/100).toFixed(2)}</td></tr>`).join('');w.document.write(`<!doctype html><html><head><title>Invoice ${esc(invoice.invoice_number)}</title><style>body{font:15px Arial,sans-serif;color:#182e29;margin:48px}.top{display:flex;justify-content:space-between;border-bottom:2px solid #17644f;padding-bottom:18px}.muted{color:#64756f}table{width:100%;border-collapse:collapse;margin:28px 0}td,th{text-align:left;padding:12px;border-bottom:1px solid #dce5df}th{background:#f0f5f2}.total{text-align:right;font-size:20px;font-weight:bold}.foot{margin-top:60px;border-top:1px solid #dce5df;padding-top:14px}@media print{button{display:none}}</style></head><body><div class="top"><div><h1>${esc(invoice.seller_name||'CircuitByte')}</h1><div>${esc(invoice.seller_address)}</div><div>${invoice.seller_tin?`TIN: ${esc(invoice.seller_tin)}`:''}</div></div><div><h2>ORDER INVOICE</h2><b>${esc(invoice.invoice_number)}</b><div>${new Date(invoice.issued_at).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}</div></div></div><h3>Bill to</h3><div>${esc(invoice.customer_name)}</div><div>${esc(invoice.customer_email)}</div><div>${esc(invoice.billing_address)}</div><div>${invoice.customer_tin?`TIN: ${esc(invoice.customer_tin)}`:''}</div><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total: ₱${(Number(invoice.subtotal_cents)/100).toFixed(2)}</p><p>Order reference: ${esc(order.reference)} · ${esc(paymentLabel(order.payment_method))}</p><p>${esc(invoice.notes)}</p><div class="foot muted">CircuitByte · Roxas City, Capiz<br></div><script>window.onload=()=>window.print()</script></body></html>`);w.document.close();}
const statuses=['Pending','Confirmed','Ready','Completed','Cancelled'];
const closed=status=>status==='Completed'||status==='Cancelled';
const date=value=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});

function paymentStatus(order){
 if(order.payment_method!=='qrph')return 'Cash at handover';
 if(order.payment_verified_at)return 'QR Ph · Verified';
 if(order.payment_reference)return 'QR Ph · Review transfer';
 return order.status==='Pending'?'QR Ph · Awaiting stock confirmation':'QR Ph · Awaiting payment';
}

function Invoice({order,busy,onIssue,onPrint}){
 const invoice=order.invoice;
 const delivery=invoice?.email_sent_at?`Emailed ${date(invoice.email_sent_at)}`
  :invoice?.email_failed_at?'Email delivery failed'
  :invoice?.customer_email?'Email delivery pending':'No customer email on file';
 return <section className="invoice-box">
  <h3>Order invoice</h3>
  {invoice?<div className="invoice-summary">
   <strong>{invoice.invoice_number}</strong> · {date(invoice.issued_at)}
   <p>{invoice.customer_name}{invoice.billing_address?' · '+invoice.billing_address:''}</p>
   <p>{delivery}</p>
   <button type="button" className="secondary" onClick={onPrint}>Print invoice</button>
   {invoice.customer_email&&!invoice.email_sent_at&&<button type="button" disabled={busy} onClick={()=>onIssue({})}>Retry email</button>}
  </div>:<>
   <p>Issue an invoice for this previously completed order.</p>
   <label>Customer / business name<input name="invoiceName" maxLength={160} defaultValue={order.invoice_customer_name||order.customer_name}/></label>
   <label>Billing address<input name="invoiceAddress" maxLength={500} defaultValue={order.invoice_billing_address}/></label>
   <label>Customer TIN<input name="invoiceTin" maxLength={40} defaultValue={order.invoice_tin}/></label>
   <label>Invoice note<textarea name="invoiceNotes" maxLength={500}/></label>
  </>}
  {order.guest&&!order.customer_email&&<label>Customer email<input name="invoiceEmail" type="email" maxLength={200}/></label>}
  {(!invoice||(order.guest&&!order.customer_email))&&<button type="button" disabled={busy} onClick={e=>{
   const form=new FormData(e.currentTarget.form);
   onIssue({name:form.get('invoiceName'),address:form.get('invoiceAddress'),tin:form.get('invoiceTin'),notes:form.get('invoiceNotes'),email:form.get('invoiceEmail')});
  }}>{invoice?'Save email and send invoice':'Issue invoice'}</button>}
 </section>;
}

export default function Orders(){
 const [orders,setOrders]=useState([]),[summary,setSummary]=useState({});
 const [filter,setFilter]=useState(''),[query,setQuery]=useState(''),[offset,setOffset]=useState(0),[more,setMore]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [selected,setSelected]=useState(null);

 async function load(signal){
  setLoading(true);
  try{
   const r=await fetch('/api/admin/orders?'+new URLSearchParams({status:filter,q:query,offset}),{signal,cache:'no-store'});
   const data=await r.json();
   if(!r.ok)throw new Error(r.status===401?'Sign in through the inventory dashboard to view orders.':data.error);
   if(signal?.aborted)return;
   setOrders(data.orders);setMore(data.hasMore);setSummary(data.summary);
   return data.orders;
  }catch(e){
   if(e.name!=='AbortError'){setOrders([]);setError(e.message);}
  }finally{if(!signal?.aborted)setLoading(false);}
 }
 useEffect(()=>{const controller=new AbortController();load(controller.signal);return()=>controller.abort();},[filter,query,offset]);

 function deliveryNotice(delivery,email){
  if(delivery==='sent')return ' Invoice emailed to the customer.';
  if(delivery==='failed')return ' Invoice email failed. Use Retry email to try again.';
  if(!email)return ' Add a customer email to send the invoice.';
  return '';
 }
 async function save(event){
  event.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const r=await fetch('/api/admin/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    id:selected.id,version:selected.version,status:selected.status,customer_email:selected.customer_email,
    confirmed_location:selected.confirmed_location,customer_update:selected.customer_update,verifyPayment:selected.verifyPayment
   })});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error);
   setSelected({...data.order,originalStatus:data.order.status});
   setNotice('Order updated.'+(data.order.status==='Completed'?deliveryNotice(data.delivery,data.order.customer_email):''));
   await load();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function issue(details){
  setBusy(true);setError('');setNotice('');
  try{
   const r=await fetch('/api/admin/orders/invoice',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:selected.id,...details})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error);
   setSelected({...selected,customer_email:data.invoice.customer_email,invoice:data.invoice});
   setNotice(`Invoice ${data.invoice.invoice_number} saved.`+deliveryNotice(data.delivery,data.invoice.customer_email));
   await load();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }

 return <main className="orders-admin">
  <nav className="order-nav"><a href="/admin">← Inventory</a><a href="/catalog">Storefront</a><a href="/admin/studio-invites">Studio invitations</a></nav>
  <header className="orders-hero"><h1>Orders &amp; fulfillment</h1><p>Confirm stock, check payments, and prepare orders for handover.</p></header>
  {error&&<p role="alert" className="order-error">{error}</p>}
  {notice&&<p role="status" className="order-notice">{notice}</p>}
  <div className="order-filters">
   <input aria-label="Search orders" type="search" placeholder="Search reference, customer or email" value={query} disabled={busy} onChange={e=>{setQuery(e.target.value);setOffset(0);setSelected(null);setError('');}}/>
   <button className="secondary" disabled={loading||busy} onClick={async()=>{setError('');await load();setSelected(null);}}>Refresh</button>
  </div>
  <div className="status-tabs" aria-label="Filter orders by status">{['',...statuses].map(status=><button type="button" key={status} disabled={busy} aria-pressed={filter===status}
   onClick={()=>{setFilter(status);setOffset(0);setSelected(null);setError('');}}>{status||'All orders'} <b>{summary[status.toLowerCase()||'total']??'–'}</b></button>)}</div>
  {selected&&<form className="order-editor" key={selected.id} onSubmit={save}>
   <div className="order-heading"><div><span className="status-pill">{selected.originalStatus}</span><h2>{selected.reference}</h2></div>
    <button className="secondary" disabled={busy} type="button" onClick={()=>setSelected(null)}>Close</button></div>
   <OrderProgress status={selected.originalStatus}/>
   <p><strong>{selected.customer_name}</strong> · <a href={'tel:'+selected.contact.replace(/[^+\d]/g,'')}>{selected.contact}</a></p>
   {selected.guest&&!closed(selected.originalStatus)?<label>Customer email (optional)<input type="email" maxLength={200} value={selected.customer_email} onChange={e=>setSelected({...selected,customer_email:e.target.value})}/></label>:<p>{selected.customer_email}</p>}
   <p><strong>Requested meetup:</strong> {selected.proposed_location}</p>
   {selected.notes&&<p><strong>Customer message:</strong> {selected.notes}</p>}
   <ul className="order-items">{selected.items.map((item,index)=><li key={item.id+'-'+index}>
    {item.name}{item.option?` — ${item.option_label||'Variant'}: ${item.option}`:''} × {item.quantity} — {peso(item.price_cents*item.quantity)}
   </li>)}</ul>
   <div className="payment-review">
    <strong>{peso(selected.total_cents)} · {paymentStatus(selected)}</strong>
    {selected.payment_reference&&<p>Transfer reference <strong>{selected.payment_reference}</strong></p>}
    {selected.payment_reference&&!selected.payment_verified_at&&!closed(selected.originalStatus)&&<label className="payment-check">
     <input type="checkbox" checked={Boolean(selected.verifyPayment)} onChange={e=>setSelected({...selected,verifyPayment:e.target.checked})}/>
     I matched this transfer reference and amount to the payment received.
    </label>}
   </div>
   {closed(selected.originalStatus)?<>
    {selected.confirmed_location&&<p><strong>Handover:</strong> {selected.confirmed_location}</p>}
    {selected.customer_update&&<p>{selected.customer_update}</p>}
   </>:<>
    <label>Status<select disabled={busy} value={selected.status} onChange={e=>setSelected({...selected,status:e.target.value})}>
     {options[selected.originalStatus].map(status=><option key={status}>{status}</option>)}
    </select></label>
    <label>Confirmed meetup location in Roxas City<input maxLength={300} required={['Confirmed','Ready','Completed'].includes(selected.status)}
     value={selected.confirmed_location} onChange={e=>setSelected({...selected,confirmed_location:e.target.value})}/></label>
    <label>Update for customer<textarea maxLength={1000} placeholder="Agreed date, time or landmark"
     value={selected.customer_update} onChange={e=>setSelected({...selected,customer_update:e.target.value})}/></label>
    <button disabled={busy}>{busy?'Saving…':'Save order update'}</button>
   </>}
   {selected.originalStatus==='Completed'&&<Invoice order={selected} busy={busy} onIssue={issue} onPrint={()=>{
    try{printInvoice(selected.invoice,selected);}catch(e){setError(e.message);}
   }}/>}
  </form>}
  {loading?<p role="status">Loading orders…</p>:<div className="order-grid">{orders.map(order=><article className="order-card" key={order.id}>
   <div className="order-heading"><span className="status-pill">{order.status}</span><small>{date(order.created_at)}</small></div>
   <h2>{order.reference}</h2><strong>{order.customer_name}</strong>
   <OrderProgress status={order.status}/>
   <p>{order.items.reduce((n,item)=>n+item.quantity,0)} items · {peso(order.total_cents)}</p>
   <p>{paymentStatus(order)}</p>
   {order.invoice&&<p>Invoice {order.invoice.invoice_number}{order.invoice.email_failed_at?' · Email failed':''}</p>}
   <button disabled={busy} type="button" onClick={()=>{setSelected({...order,originalStatus:order.status});setError('');setNotice('');window.scrollTo({top:0,behavior:'smooth'});}}>Manage order</button>
  </article>)}</div>}
  {!loading&&!error&&orders.length===0&&<p>No orders match these filters.</p>}
  <nav className="pager" aria-label="Order pages">
   <button className="secondary" disabled={!offset||busy||loading} onClick={()=>{setOffset(Math.max(0,offset-50));setSelected(null);}}>← Previous</button>
   <span>Page {Math.floor(offset/50)+1}</span>
   <button className="secondary" disabled={!more||busy||loading} onClick={()=>{setOffset(offset+50);setSelected(null);}}>Next →</button>
  </nav>
 </main>;
}
