import {randomUUID} from 'node:crypto';
import {db} from './db.js';
import {normalizeCouponCode,OrderError,snapshotItems,validateCartItems,validateFulfillment} from './order-rules.mjs';
import {productOptions} from './product-options.mjs';

const idPattern=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const kinds=new Set(['percent','fixed','maxim','bundle']);
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;

function manilaExpiration(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||value.startsWith('0000-'))throw new OrderError('Enter an expiration date and time in Philippine time.');
 const date=new Date(value+'+08:00');
 if(!Number.isFinite(date.getTime())||new Date(date.getTime()+28800000).toISOString().slice(0,16)!==value){
  throw new OrderError('Enter a valid expiration date and time.');
 }
 return date;
}

export async function listShopPromotions(offset){
 const [{rows},{rows:products}]=await Promise.all([
  db().query(`SELECT id,code,kind,rules,expires_at,enabled,version,expires_at<=now() AS expired
   FROM shop_promotions ORDER BY updated_at DESC,id DESC LIMIT 41 OFFSET $1`,[offset]),
  db().query('SELECT id,name,active FROM products ORDER BY name,id')
 ]);
 return {promotions:rows.slice(0,40),products,hasMore:rows.length>40};
}

export async function saveShopPromotion(body,actor){
 if(!body||!kinds.has(body.kind)||typeof body.enabled!=='boolean')throw new OrderError('Choose a promotion type and status.');
 const code=normalizeCouponCode(body.code),expiresAt=manilaExpiration(body.expiresAt);
 if(body.id!==undefined&&(typeof body.id!=='string'||!idPattern.test(body.id)||!integer(body.version,1,2147483647)))throw new OrderError('Invalid promotion selection.');
 let rules={};
 if(body.kind==='percent'){
  const hundredths=Math.round(body.percent*100);
  if(!Number.isFinite(body.percent)||!integer(hundredths,1,10000)||Math.abs(body.percent-hundredths/100)>1e-8){
   throw new OrderError('Enter a discount percentage from 0.01 to 100, with up to two decimal places.');
  }
  rules={percent:hundredths/100};
 }else if(body.kind==='fixed'){
  if(!integer(body.amountCents,1,2147483647))throw new OrderError('Enter a valid peso discount amount.');
  rules={amountCents:body.amountCents};
 }else if(body.kind==='bundle'){
  if(typeof body.buyId!=='string'||!integer(body.buyQuantity,1,999))throw new OrderError('Choose a qualifying product and quantity.');
  const gift=validateCartItems([{...body.gift,price_cents:0}])[0];
  if(productOptions[gift.id]?.wireLengthsCm&&gift.wireLengthCm===undefined)throw new OrderError('Set the free wire length in centimeters.');
  const {rows}=await db().query('SELECT id,active FROM products WHERE id=ANY($1::text[])',[[body.buyId,gift.id]]);
  if(![body.buyId,gift.id].every(id=>rows.some(row=>row.id===id&&(!body.enabled||row.active)))){
   throw new OrderError('Select published products for an active bundle.');
  }
  rules={buyId:body.buyId,buyQuantity:body.buyQuantity,gift};
 }
 const fields=[code,body.kind,JSON.stringify(rules),expiresAt,body.enabled,actor];
 try{
  const {rows:[promotion]}=body.id===undefined
   ?await db().query(`INSERT INTO shop_promotions(code,kind,rules,expires_at,enabled,updated_by,id)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[...fields,randomUUID()])
   :await db().query(`UPDATE shop_promotions SET code=$1,kind=$2,rules=$3,expires_at=$4,enabled=$5,
     updated_by=$6,updated_at=now(),version=version+1 WHERE id=$7 AND version=$8 RETURNING id`,[...fields,body.id,body.version]);
  if(!promotion)throw new OrderError('This promotion changed. Reload it before saving.',409);
  return promotion;
 }catch(error){
  if(error.code==='23505')throw new OrderError('That promo code is already in use.',409);
  throw error;
 }
}

export async function priceShopCart(connection,{items,fulfillmentMethod,couponCode},{lock=false}={}){
 let coupon;
 if(couponCode){
  const {rows}=await connection.query(`SELECT id,code,kind,rules,version,enabled,expires_at<=clock_timestamp() AS expired
   FROM shop_promotions WHERE code=$1${lock?' FOR SHARE':''}`,[couponCode]);
  coupon=rows[0];
  if(!coupon?.enabled||coupon.expired)throw new OrderError('This promo code is invalid, disabled or expired.',409);
 }
 const gift=coupon?.kind==='bundle'?coupon.rules.gift:null;
 const ids=items.map(item=>item.id);
 if(gift)ids.push(gift.id);
 const {rows:products}=await connection.query(`SELECT * FROM products WHERE id=ANY($1::text[]) ORDER BY id${lock?' FOR UPDATE':''}`,[ids]);
 const cart=items.slice();
 if(gift){
  const {buyId,buyQuantity}=coupon.rules;
  const qualifier=products.find(product=>product.id===buyId);
  const quantity=items.reduce((sum,item)=>sum+(item.id===buyId?item.quantity:0),0);
  if(quantity<buyQuantity)throw new OrderError(`This bundle requires ${buyQuantity} × ${qualifier?.name||'the qualifying product'}.`,409);
  const product=products.find(product=>product.id===gift.id);
  if(!product?.active||product.stock===null)throw new OrderError('The promotional gift is currently unavailable.',409);
  cart.push({...gift,price_cents:product.price_cents});
 }
 const snapshots=snapshotItems(cart,products);
 let giftItem;
 if(gift){
  const index=snapshots.length-1;
  giftItem={...snapshots[index],price_cents:0,promotion_gift:true};
  snapshots[index]=giftItem;
 }
 const subtotal=snapshots.reduce((sum,item)=>sum+item.price_cents*item.quantity,0);
 if(!coupon)return {items:snapshots,total:subtotal,promotion:null};
 const freeMaxim=coupon.kind==='maxim';
 if(freeMaxim&&fulfillmentMethod!=='maxim')throw new OrderError('Choose Maxim delivery to use this code.',409);
 const discount=coupon.kind==='percent'?Number((BigInt(subtotal)*BigInt(Math.round(coupon.rules.percent*100))+5000n)/10000n):
  coupon.kind==='fixed'?Math.min(subtotal,coupon.rules.amountCents):0;
 return {items:snapshots,total:subtotal-discount,promotion:{
  id:coupon.id,code:coupon.code,kind:coupon.kind,version:coupon.version,subtotal_cents:subtotal,
  discount_cents:discount,free_maxim:freeMaxim,...(giftItem?{gift:giftItem}:{})
 }};
}

export async function quoteShopPromotion(body){
 const items=validateCartItems(body?.items),couponCode=normalizeCouponCode(body?.couponCode);
 const fulfillmentMethod=validateFulfillment(body?.fulfillmentMethod);
 const result=await priceShopCart(db(),{items,couponCode,fulfillmentMethod});
 return {promotion:result.promotion,total_cents:result.total};
}
