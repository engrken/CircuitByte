'use client';
import {useState} from 'react';
import {productOptions} from '../../../lib/product-options.mjs';
import {Management,ManagementPages,manilaDate,useManagement} from '../management';

const kinds={percent:'Percentage off',fixed:'Peso amount off',maxim:'Free Maxim delivery',bundle:'Buy a product, get a free gift'};
const blank={code:'',kind:'percent',expiresAt:'',enabled:true,percent:'',amount:'',buyId:'',buyQuantity:1,giftId:'',giftQuantity:1,giftOption:'',wireLengthCm:''};
const pesos=cents=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(cents/100);
const manilaInput=value=>new Date(new Date(value).getTime()+28800000).toISOString().slice(0,16);

export default function Promotions(){
 const state=useManagement('/api/admin/promotions');
 const [draft,setDraft]=useState(blank);
 const set=(key,value)=>setDraft(current=>({...current,[key]:value}));
 const giftOptions=productOptions[draft.giftId];
 const products=state.data?.products||[];
 const productName=id=>products.find(product=>product.id===id)?.name||id;
 const productChoices=products.map(product=><option key={product.id} value={product.id}>{product.name}{product.active?'':' (archived)'}</option>);

 function edit(promotion){
  const {rules}=promotion;
  setDraft({...blank,id:promotion.id,version:promotion.version,code:promotion.code,kind:promotion.kind,
   expiresAt:manilaInput(promotion.expires_at),enabled:promotion.enabled,percent:rules.percent??'',amount:rules.amountCents===undefined?'':(rules.amountCents/100).toFixed(2),
   buyId:rules.buyId??'',buyQuantity:rules.buyQuantity??1,giftId:rules.gift?.id??'',giftQuantity:rules.gift?.quantity??1,
   giftOption:rules.gift?.option??'',wireLengthCm:rules.gift?.wireLengthCm??''});
  requestAnimationFrame(()=>document.getElementById('shop-promo-code')?.focus());
 }

 async function save(event){
  event.preventDefault();
  const body={id:draft.id,version:draft.version,code:draft.code,kind:draft.kind,expiresAt:draft.expiresAt,enabled:draft.enabled};
  if(draft.kind==='percent')body.percent=Number(draft.percent);
  if(draft.kind==='fixed')body.amountCents=Math.round(Number(draft.amount)*100);
  if(draft.kind==='bundle'){
   body.buyId=draft.buyId;body.buyQuantity=Number(draft.buyQuantity);
   body.gift={id:draft.giftId,quantity:Number(draft.giftQuantity),option:draft.giftOption,
    ...(giftOptions?.wireLengthsCm?{wireLengthCm:Number(draft.wireLengthCm)}:{})};
  }
  if(await state.save(body,()=>draft.id?'Promotion updated.':'Promotion created.'))setDraft(blank);
 }

 function describe({kind,rules}){
  if(kind==='percent')return `${rules.percent}% off the items subtotal`;
  if(kind==='fixed')return `${pesos(rules.amountCents)} off the items subtotal`;
  if(kind==='maxim')return 'CircuitByte covers the Maxim courier fee';
  return `Buy ${rules.buyQuantity} × ${productName(rules.buyId)} and get ${rules.gift.quantity} × ${productName(rules.gift.id)} free`;
 }

 return <Management title="Shop promotions" description="Create codes for Shop checkout. Shoppers can apply one code per order." state={state}>
  <section className="management-section">
   <h2>{draft.id?'Edit promotion':'Add promotion'}</h2>
   <form onSubmit={save}>
    <div className="management-grid">
     <label>Promo code<input id="shop-promo-code" autoComplete="off" required minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_\-]{2,31}" value={draft.code} onChange={event=>set('code',event.target.value.toUpperCase())}/></label>
     <label>Type<select value={draft.kind} onChange={event=>set('kind',event.target.value)}>{Object.entries(kinds).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>
     <label>Expires on (Philippine time)<input type="datetime-local" required value={draft.expiresAt} onChange={event=>set('expiresAt',event.target.value)}/></label>
    </div>
    {draft.kind==='percent'&&<label>Discount percentage<input type="number" min="0.01" max={100} step="0.01" required value={draft.percent} onChange={event=>set('percent',event.target.value)}/></label>}
    {draft.kind==='fixed'&&<label>Discount amount in pesos<input type="number" min="0.01" max="21474836.47" step="0.01" required value={draft.amount} onChange={event=>set('amount',event.target.value)}/></label>}
    {draft.kind==='maxim'&&<p>The shop covers the actual courier fee for a qualifying Maxim delivery. Arrange payment with the courier when booking.</p>}
    {draft.kind==='bundle'&&<>
     <div className="management-grid">
      <label>Qualifying product<select value={draft.buyId} onChange={event=>set('buyId',event.target.value)} required><option value="">Choose a product</option>{productChoices}</select></label>
      <label>Minimum quantity to buy<input type="number" min={1} max={999} step={1} required value={draft.buyQuantity} onChange={event=>set('buyQuantity',event.target.value)}/></label>
      <label>Free gift product<select value={draft.giftId} onChange={event=>setDraft(current=>({...current,giftId:event.target.value,giftOption:'',wireLengthCm:''}))} required><option value="">Choose a gift</option>{productChoices}</select></label>
      <label>Free quantity per order<input type="number" min={1} max={999} step={1} required value={draft.giftQuantity} onChange={event=>set('giftQuantity',event.target.value)}/></label>
      {giftOptions&&<label>{giftOptions.label} for the gift<select value={draft.giftOption} onChange={event=>set('giftOption',event.target.value)} required><option value="">Choose an option</option>{giftOptions.options.map(option=><option key={option}>{option}</option>)}</select></label>}
      {giftOptions?.wireLengthsCm&&<label>Gift wire length (cm)<input type="number" min="0.01" step="any" value={draft.wireLengthCm} onChange={event=>set('wireLengthCm',event.target.value)} required/></label>}
     </div>
     <p>The free items are added to the order and checked against available stock.</p>
    </>}
    <label className="management-check"><input type="checkbox" checked={draft.enabled} onChange={event=>set('enabled',event.target.checked)}/> Enabled</label>
    <div className="management-actions"><button className="primary" disabled={state.busy}>Save promotion</button>{draft.id&&<button type="button" disabled={state.busy} onClick={()=>setDraft(blank)}>Cancel edit</button>}</div>
   </form>
  </section>
  <section className="management-section">
   <h2>Saved promotions</h2>
   {!state.data?.promotions.length&&<p>No promo codes yet.</p>}
   {state.data?.promotions.map(promotion=><div key={promotion.id} className="management-row">
    <div><strong>{promotion.code}</strong><p>{describe(promotion)}</p><small>{promotion.enabled?(promotion.expired?'Expired':'Active'):'Disabled'} · Expires {manilaDate(promotion.expires_at)} PHT</small></div>
    <button type="button" disabled={state.busy} onClick={()=>edit(promotion)} aria-label={`Edit ${promotion.code}`}>Edit</button>
   </div>)}
   <ManagementPages state={state}/>
  </section>
 </Management>;
}
