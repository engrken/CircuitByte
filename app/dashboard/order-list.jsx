'use client';
import {useState} from 'react';
import {OrderProgress,paymentLabel,peso} from '../order-display';

function Payment({order,onUpdate}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
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
 if(order.status==='Pending')return <p>Payment opens after CircuitByte confirms stock.</p>;
 if(!['Confirmed','Ready'].includes(order.status))return null;
 return <details className="order-payment">
  <summary>{order.payment_reference?'QR Ph reference submitted · awaiting verification':'Pay with QR Ph'}</summary>
  {!order.payment_reference&&<p>Scan the QR Ph code and pay <strong>{peso(order.total_cents)}</strong> to <strong>CircuitByte</strong>. Check the recipient and any fees displayed in your banking or wallet app before sending.</p>}
  {order.payment_reference&&<p>Reference on file: <strong>{order.payment_reference}</strong>. You can correct it below.</p>}
  {!order.payment_reference&&<a href="/circuitbyte-qrph.jpg" download="CircuitByte-QR-Ph.jpg">Open or save the payment QR<img src="/circuitbyte-qrph.jpg" alt="CircuitByte QR Ph payment code and Netbank fee schedule" width="857" height="1536" loading="lazy"/></a>}
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
  {orders.length?<ul className="account-projects buyer-orders">{orders.map(order=><li key={order.id}>
   <strong>{order.reference}</strong>
   <OrderProgress status={order.status}/>
   <p>{order.items.reduce((n,item)=>n+item.quantity,0)} items · {peso(order.total_cents)} · {paymentLabel(order.payment_method)}</p>
   {order.confirmed_location&&<p>Handover: {order.confirmed_location}</p>}
   {order.customer_update&&<p>{order.customer_update}</p>}
   {order.invoice_number&&<p>Order invoice <strong>{order.invoice_number}</strong></p>}
   {order.payment_method==='qrph'&&<Payment order={order} onUpdate={onUpdate}/>}
  </li>)}</ul>:<p className="account-muted">Orders placed with this account will appear here.</p>}
 </section>;
}
