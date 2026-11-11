import './order-display.css';
const stages=['Pending','Confirmed','Ready','Completed'];
export const peso=cents=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(cents)/100);
export const paymentLabel=(method,totalCents)=>Number(totalCents)===0?'No item payment due':method==='qrph'?'QR Ph':'Cash at handover';
export const fulfillmentLabel=method=>method==='maxim'?'Maxim door-to-door':'Meetup';
export function OrderProgress({status}){
 if(status==='Cancelled')return <p className="order-cancelled">Cancelled</p>;
 const current=stages.indexOf(status);
 return <ol className="order-progress" aria-label={'Order progress: '+status}>
  {stages.map((stage,index)=><li key={stage} className={index<=current?'reached':''} aria-current={index===current?'step':undefined}>{stage}</li>)}
 </ol>;
}
