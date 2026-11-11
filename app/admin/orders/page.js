'use client';
import {useState,useEffect} from 'react';
import '../admin.css';
import './orders.css';
import {OrderProgress,paymentLabel,fulfillmentLabel,peso} from '../../order-display';
const options={Pending:['Pending','Confirmed','Cancelled'],Confirmed:['Confirmed','Ready','Cancelled'],Ready:['Ready','Completed','Cancelled'],Completed:['Completed'],Cancelled:['Cancelled']};
const esc=s=>String(s||'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function printInvoice(invoice,order){const w=window.open('','_blank','width=850,height=900');if(!w)throw Error('Allow pop-ups to print the invoice.');w.opener=null;
 const promo=invoice.promotion;
 const promotionLines=promo?`<p>Shop promo: ${esc(promo.code)}</p>${promo.discount_cents?`<p>Items subtotal: ${peso(promo.subtotal_cents)}<br>Discount: −${peso(promo.discount_cents)}</p>`:''}${promo.free_maxim?'<p>Maxim courier fee covered by CircuitByte.</p>':''}`:'';
 const rows=(invoice.items||order.items||[]).map(i=>`<tr><td>${esc(i.name)}${i.promotion_gift?' (free gift)':''}${i.option?`<small><br>${esc(i.option_label||'Option')}: ${esc(i.option)}</small>`:''}</td><td>${i.quantity}</td><td>₱${(i.price_cents/100).toFixed(2)}</td><td>₱${(i.price_cents*i.quantity/100).toFixed(2)}</td></tr>`).join('');w.document.write(`<!doctype html><html><head><title>Invoice ${esc(invoice.invoice_number)}</title><style>body{font:15px Arial,sans-serif;color:#182e29;margin:48px}.top{display:flex;justify-content:space-between;border-bottom:2px solid #17644f;padding-bottom:18px}.muted{color:#64756f}table{width:100%;border-collapse:collapse;margin:28px 0}td,th{text-align:left;padding:12px;border-bottom:1px solid #dce5df}th{background:#f0f5f2}.total{text-align:right;font-size:20px;font-weight:bold}.foot{margin-top:60px;border-top:1px solid #dce5df;padding-top:14px}@media print{button{display:none}}</style></head><body><div class="top"><div><h1>${esc(invoice.seller_name||'CircuitByte')}</h1><div>${esc(invoice.seller_address)}</div><div>${invoice.seller_tin?`TIN: ${esc(invoice.seller_tin)}`:''}</div></div><div><h2>ORDER INVOICE</h2><b>${esc(invoice.invoice_number)}</b><div>${new Date(invoice.issued_at).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}</div></div></div><h3>Bill to</h3><div>${esc(invoice.customer_name)}</div><div>${esc(invoice.customer_email)}</div><div>${esc(invoice.billing_address)}</div><div>${invoice.customer_tin?`TIN: ${esc(invoice.customer_tin)}`:''}</div><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>${promotionLines}<p class="total">Total: ₱${(Number(invoice.subtotal_cents)/100).toFixed(2)}</p><p>Order reference: ${esc(order.reference)} · ${esc(paymentLabel(order.payment_method,order.total_cents))}</p><p>${esc(invoice.notes)}</p><div class="foot muted">CircuitByte · Roxas City, Capiz<br></div><script>window.onload=()=>window.print()</script></body></html>`);w.document.close();}
const statuses=['Pending','Confirmed','Ready','Completed','Cancelled'];
const closed=status=>status==='Completed'||status==='Cancelled';
const date=value=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});

function paymentStatus(order){
 if(order.payment_method!=='qrph')return paymentLabel(order.payment_method,order.total_cents);
 if(order.payment_verified_at)return 'QR Ph · Verified';
 if(order.payment_reference||order.has_payment_reference)return 'QR Ph · Review transfer';
 return order.status==='Pending'&&!order.qr_payment_opened_at?'QR Ph · Awaiting stock review':'QR Ph · Awaiting payment';
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
   const r=await fetch('/api/admin/orders?'+new URLSearchParams({status:filter,offset}),{
    signal,cache:'no-store',headers:{'x-circuitbyte-order-search':new URLSearchParams({q:query}).toString()}
   });
   const data=await r.json();
   if(!r.ok)throw new Error(r.status===401?'Sign in through the inventory dashboard to view orders.':data.error);
   if(signal?.aborted)return;
   setSummary(data.summary);
   if(!data.orders.length&&offset>0){setOffset(offset-50);return;}
   setOrders(data.orders);setMore(data.hasMore);
   return data.orders;
  }catch(e){
   if(e.name!=='AbortError'){setOrders([]);setError(e.message);}
  }finally{if(!signal?.aborted)setLoading(false);}
 }
 useEffect(()=>{const controller=new AbortController();load(controller.signal);return()=>controller.abort();},[filter,query,offset]);

 async function fetchOrder(id){
  const response=await fetch('/api/admin/orders?'+new URLSearchParams({id}),{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Could not load order details.');
  return data.order;
 }
 async function openOrder(id){
  setBusy(true);setError('');setNotice('');
  try{
   const order=await fetchOrder(id);
   setSelected({...order,originalStatus:order.status});
   window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }

 function deliveryNotice(delivery,email){
  if(delivery==='sent')return ' Invoice emailed to the customer.';
  if(delivery==='failed')return ' Invoice email failed. Use Retry email to try again.';
  if(!email)return ' Add a customer email to send the invoice.';
  return '';
 }
 async function save(event){
  event.preventDefault();
  const openQrPayment=event.nativeEvent.submitter?.value==='open-qr';setBusy(true);setError('');setNotice('');
  try{
   const r=await fetch('/api/admin/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    id:selected.id,version:selected.version,status:selected.status,customer_email:selected.customer_email,
    confirmed_location:selected.confirmed_location,customer_update:selected.customer_update,verifyPayment:selected.verifyPayment,openQrPayment
   })});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error);
   setSelected({...data.order,originalStatus:data.order.status});
   setNotice((openQrPayment?'QR Ph payment opened. Stock is held while the customer pays.':selected.verifyPayment?'Payment verified. The order reservation is confirmed.':'Order updated.')+(data.order.status==='Completed'?deliveryNotice(data.delivery,data.order.customer_email):''));
   await load();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function moveCancelledOrder(){
  const restoring=Boolean(selected.deleted_at);
  setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/admin/orders',{
    method:restoring?'PATCH':'DELETE',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:selected.id,version:selected.version})
   });
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Could not update the order.');
   setSelected(null);
   setNotice(restoring?`Order ${data.order.reference} restored to Cancelled.`:
    `Order ${data.order.reference} moved to Deleted. You can restore it from that tab.`);
   await load();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function retryNotifications(){
  setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/admin/orders/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error);
   const updated=await fetchOrder(selected.id);
   setSelected({...selected,notifications:updated.notifications});
   setNotice('Order email delivery status refreshed.');
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
   <input aria-label="Search orders" type="search" maxLength={100} placeholder="Search reference, customer or email" value={query} disabled={busy} onChange={e=>{setQuery(e.target.value);setOffset(0);setSelected(null);setError('');}}/>
   <button className="secondary" disabled={loading||busy} onClick={async()=>{setError('');await load();setSelected(null);}}>Refresh</button>
  </div>
  <div className="status-tabs" aria-label="Filter orders by status">{['',...statuses,'Deleted'].map(status=><button type="button" key={status} disabled={busy} aria-pressed={filter===status}
   onClick={()=>{setFilter(status);setOffset(0);setSelected(null);setError('');}}>{status||'All orders'} <b>{summary[status.toLowerCase()||'total']??'–'}</b></button>)}</div>
  {selected&&<form className="order-editor" key={selected.id} onSubmit={save}>
   <div className="order-heading"><div><span className="status-pill">{selected.deleted_at?'Deleted':selected.originalStatus}</span><h2>{selected.reference}</h2></div>
    <button className="secondary" disabled={busy} type="button" onClick={()=>setSelected(null)}>Close</button></div>
   <OrderProgress status={selected.originalStatus}/>
   <p><strong>{selected.customer_name}</strong> · <a href={'tel:'+selected.contact.replace(/[^+\d]/g,'')}>{selected.contact}</a></p>
   {selected.guest&&!closed(selected.originalStatus)?<label>Customer email (optional)<input type="email" maxLength={200} value={selected.customer_email} onChange={e=>setSelected({...selected,customer_email:e.target.value})}/></label>:<p>{selected.customer_email}</p>}
   <p><strong>{fulfillmentLabel(selected.fulfillment_method)}</strong></p>
   <p><strong>{selected.fulfillment_method==='maxim'?'Requested delivery address:':'Requested meetup:'}</strong> {selected.proposed_location}</p>
   {selected.fulfillment_method==='maxim'&&<p>{selected.promotion?.free_maxim?'CircuitByte pays the courier fee. Arrange payment with Maxim before booking.':'Customer pays the courier fee separately. Confirm the quote and handover arrangements before booking.'}
    {selected.payment_method==='cash'&&Number(selected.total_cents)>0?' Confirm how the buyer will pay for the items before dispatch.':''} Share only the name, contact number and drop-off details needed for delivery.</p>}
   {selected.fulfillment_method==='maxim'&&!closed(selected.originalStatus)&&<p><a href="https://taximaxim.com/ph/en/8445-roxas/order-a-taxi-online" target="_blank" rel="noopener noreferrer">Open Maxim Roxas ↗</a></p>}
   {selected.notes&&<p><strong>Customer message:</strong> {selected.notes}</p>}
   <ul className="order-items">{selected.items.map((item,index)=><li key={item.id+'-'+index}>
    {item.name}{item.promotion_gift?' (free gift)':''}{item.option?` — ${item.option_label||'Variant'}: ${item.option}`:''} × {item.quantity} — {peso(item.price_cents*item.quantity)}
   </li>)}</ul>
   <div className="payment-review">
    {selected.promotion&&<p>Promo <strong>{selected.promotion.code}</strong>{selected.promotion.discount_cents>0&&` · ${peso(selected.promotion.subtotal_cents)} − ${peso(selected.promotion.discount_cents)}`}</p>}
    <strong>{peso(selected.total_cents)} · {paymentStatus(selected)}</strong>
    {selected.payment_reference&&<p>Transfer reference <strong>{selected.payment_reference}</strong></p>}
    {selected.payment_reference&&!selected.payment_verified_at&&!closed(selected.originalStatus)&&<label className="payment-check">
     <input type="checkbox" checked={Boolean(selected.verifyPayment)} onChange={e=>setSelected({...selected,verifyPayment:e.target.checked})}/>
     I matched the transfer reference and received amount in Peddlr Kankolek.
    </label>}
   </div>
   {selected.notifications&&<div className="order-email-status">
    <h3>Order emails</h3>
    {Object.entries(selected.notifications).map(([kind,state])=><p key={kind}>{kind==='payment_review'?'Payment review':kind==='shop'?'Shop':'Customer'} · {state==='sent'?'Sent':state==='failed'?'Delivery failed':'Pending'}</p>)}
    {!selected.deleted_at&&Object.values(selected.notifications).some(state=>state!=='sent')&&<button type="button" className="secondary" disabled={busy} onClick={retryNotifications}>Retry unsent emails</button>}
   </div>}
   {closed(selected.originalStatus)?<>
    {selected.confirmed_location&&<p><strong>Handover:</strong> {selected.confirmed_location}</p>}
    {selected.customer_update&&<p>{selected.customer_update}</p>}
   </>:<>
    <label>Status<select disabled={busy} value={selected.status} onChange={e=>setSelected({...selected,status:e.target.value})}>
     {options[selected.originalStatus].filter(status=>!(selected.originalStatus==='Pending'&&selected.payment_method==='qrph'&&status==='Confirmed')).map(status=><option key={status}>{status}</option>)}
    </select></label>
    <label>{selected.fulfillment_method==='maxim'?'Confirmed delivery address in Roxas City':'Confirmed meetup location in Roxas City'}<input maxLength={300} required={['Confirmed','Ready','Completed'].includes(selected.status)}
     value={selected.confirmed_location} onChange={e=>setSelected({...selected,confirmed_location:e.target.value})}/></label>
    {selected.fulfillment_method==='maxim'&&<button className="secondary" type="button" disabled={busy}
     onClick={()=>setSelected({...selected,confirmed_location:selected.proposed_location})}>Use requested address</button>}
    <label>Update for customer<textarea maxLength={1000} placeholder="Agreed date, time or landmark"
     value={selected.customer_update} onChange={e=>setSelected({...selected,customer_update:e.target.value})}/></label>
    <button disabled={busy}>{busy?'Saving…':selected.verifyPayment?'Verify payment and save':'Save order update'}</button>
    {selected.payment_method==='qrph'&&selected.originalStatus==='Pending'&&selected.status==='Pending'&&!selected.qr_payment_opened_at&&<button className="secondary" type="submit" value="open-qr" disabled={busy}>Open QR Ph payment</button>}
   </>}
   {selected.originalStatus==='Cancelled'&&<p><button type="button" className="secondary" disabled={busy} onClick={moveCancelledOrder}>
    {selected.deleted_at?'Restore cancelled order':'Delete cancelled order'}
   </button></p>}
   {selected.originalStatus==='Completed'&&<Invoice order={selected} busy={busy} onIssue={issue} onPrint={()=>{
    try{printInvoice(selected.invoice,selected);}catch(e){setError(e.message);}
   }}/>}
  </form>}
  {loading?<p role="status">Loading orders…</p>:<div className="order-grid">{orders.map(order=><article className="order-card" key={order.id}>
   <div className="order-heading"><span className="status-pill">{order.deleted_at?'Deleted':order.status}</span><small>{date(order.created_at)}</small></div>
   <h2>{order.reference}</h2><strong>{fulfillmentLabel(order.fulfillment_method)}</strong>
   <OrderProgress status={order.status}/>
   <p>{order.item_count} items · {peso(order.total_cents)}</p>
   <p>{paymentStatus(order)}</p>
   {order.invoice_number&&<p>Invoice {order.invoice_number}{order.invoice_email_failed?' · Email failed':''}</p>}
   <button disabled={busy} type="button" onClick={()=>openOrder(order.id)}>Manage order</button>
  </article>)}</div>}
  {!loading&&!error&&orders.length===0&&<p>No orders match these filters.</p>}
  <nav className="pager" aria-label="Order pages">
   <button className="secondary" disabled={!offset||busy||loading} onClick={()=>{setOffset(Math.max(0,offset-50));setSelected(null);}}>← Previous</button>
   <span>Page {Math.floor(offset/50)+1}</span>
   <button className="secondary" disabled={!more||busy||loading} onClick={()=>{setOffset(offset+50);setSelected(null);}}>Next →</button>
  </nav>
 </main>;
}
