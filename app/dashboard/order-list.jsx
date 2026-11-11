'use client';
import {useState} from 'react';
import {OrderProgress,paymentLabel,fulfillmentLabel,peso} from '../order-display';

function Payment({order,onUpdate}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[showQr,setShowQr]=useState(false);
 async function submit(event){
  event.preventDefault();setBusy(true);setError('');setSaved(false);
  const reference=new FormData(event.currentTarget).get('reference');
  try{
   const response=await fetch('/api/orders/my',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:order.id,reference})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error);
   await onUpdate();setSaved(true);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 if(order.status==='Cancelled')return null;
 if(order.payment_verified_at)return <p className="account-status">QR Ph payment verified.</p>;
 if(order.status==='Pending'&&!order.qr_payment_opened_at)return <p>Payment opens after CircuitByte checks stock.</p>;
 if(!['Pending','Confirmed','Ready'].includes(order.status))return null;
 const qrUrl='/api/orders/my/qr?id='+encodeURIComponent(order.id);
 return <details className="order-payment" onToggle={e=>setShowQr(e.currentTarget.open)}>
  <summary>{order.payment_reference?'QR Ph reference submitted · awaiting verification':'Pay with QR Ph'}</summary>
  {!order.payment_reference&&<p>Your items total is <strong>{peso(order.total_cents)}</strong>. Scan the code for <strong>CircuitByte</strong> and enter the items total plus the applicable Kolek fee shown with the QR. Check the recipient and total before sending.</p>}
  {order.payment_reference&&<p>Reference on file: <strong>{order.payment_reference}</strong>. You can correct it below.</p>}
  {showQr&&!order.payment_reference&&<a href={qrUrl} download="CircuitByte-QR-Ph.jpg">Save the payment QR<img src={qrUrl} alt="CircuitByte QR Ph payment code and Peddlr Kolek fee schedule" width="857" height="1536" loading="lazy"/></a>}
  <form onSubmit={submit}>
   <label>Transfer reference<input name="reference" maxLength={100} required defaultValue={order.payment_reference||''}/></label>
   <button disabled={busy}>{busy?'Submitting…':'Submit transfer reference'}</button>
  </form>
  {saved&&<p role="status">Reference saved. CircuitByte will verify the payment.</p>}
  {error&&<p role="alert">{error}</p>}
 </details>;
}
export default function OrderList({orders,onUpdate}){
 return <section className="account-card"><div className="account-top"><div><h2>My orders</h2></div><a href="/catalog">Shop components →</a></div>
  {orders.length>0&&<p><a href="/faq#warranty">Warranty and replacement help</a></p>}
  {orders.length?<ul className="account-projects buyer-orders">{orders.map(order=><li key={order.id}>
   <strong>{order.reference}</strong>
   <OrderProgress status={order.status}/>
   <p>{order.items.reduce((n,item)=>n+item.quantity,0)} items · {peso(order.total_cents)} · {paymentLabel(order.payment_method,order.total_cents)}</p>
   {order.promotion&&<p>Promo <strong>{order.promotion.code}</strong>{order.promotion.discount_cents>0&&` · −${peso(order.promotion.discount_cents)}`}
    {order.promotion.gift&&` · ${order.promotion.gift.quantity} × ${order.promotion.gift.name} free`}</p>}
   <p><strong>{fulfillmentLabel(order.fulfillment_method)}</strong></p>
   {order.fulfillment_method==='maxim'?<>
    <p>{order.confirmed_location?'Confirmed delivery address':'Requested delivery address'}: {order.confirmed_location||order.proposed_location}</p>
    <p>{order.promotion?.free_maxim?'CircuitByte covers the Maxim courier fee.':'You pay the Maxim courier fee separately.'} CircuitByte confirms the delivery arrangements before booking.</p>
   </>:<p>{order.confirmed_location?'Confirmed meetup':'Requested meetup'}: {order.confirmed_location||order.proposed_location}</p>}
   {order.customer_update&&<p>{order.customer_update}</p>}
   {order.invoice_number&&<p>Order invoice <strong>{order.invoice_number}</strong></p>}
   {order.payment_method==='qrph'&&<Payment order={order} onUpdate={onUpdate}/>}
  </li>)}</ul>:<p className="account-muted">Orders placed with this account will appear here.</p>}
 </section>;
}
