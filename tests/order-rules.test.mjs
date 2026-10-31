import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOrder,snapshotItems,stockChange,transitions} from '../lib/order-rules.mjs';
const product={id:'one',name:'Board',price_cents:10000,stock:10,reserved_stock:3,active:true};
const order={name:'Test customer',contact:'09171234567',location:'Barangay landmark, Roxas City',city:'Roxas City, Capiz',notes:'',requestId:'e16ea8ad-8e34-4b4d-b88a-392f41101a6e',token:'a'.repeat(64),items:[{id:'one',quantity:2,price_cents:10000}]};
test('valid Roxas City guest checkout',()=>assert.equal(validateOrder(order).location,order.location));
test('rejects another city, duplicate items, fractional quantity and missing meetup',()=>{for(const p of [{city:'Iloilo'},{items:[...order.items,...order.items]},{items:[{...order.items[0],quantity:1.5}]},{location:''}])assert.throws(()=>validateOrder({...order,...p}));});
test('server snapshots prices and rejects price changes, unavailable products and reserved stock',()=>{assert.deepEqual(snapshotItems(order.items,[product]),[{id:'one',name:'Board',quantity:2,price_cents:10000}]);for(const p of [{price_cents:10001},{active:false},{stock:4}])assert.throws(()=>snapshotItems(order.items,[{...product,...p}]));});
test('unknown stock may be requested but cannot be confirmed',()=>{assert.equal(snapshotItems(order.items,[{...product,stock:null,reserved_stock:0}]).length,1);assert.throws(()=>stockChange('Pending','Confirmed',{...product,stock:null,reserved_stock:0},2));});
test('confirm reserves, ready keeps stock, complete deducts both',()=>{let p={...product,...stockChange('Pending','Confirmed',product,2)};assert.equal(p.stock,10);assert.equal(p.reserved_stock,5);p={...p,...stockChange('Confirmed','Ready',p,2)};assert.equal(p.reserved_stock,5);assert.deepEqual(stockChange('Ready','Completed',p,2),{stock:8,reserved_stock:3});});
test('cancellation releases reservations only for confirmed or ready orders',()=>{assert.deepEqual(stockChange('Pending','Cancelled',product,2),{stock:10,reserved_stock:3});for(const state of ['Confirmed','Ready'])assert.deepEqual(stockChange(state,'Cancelled',product,2),{stock:10,reserved_stock:1});});
test('rejects overselling, double completion, terminal changes and skipped transitions',()=>{assert.throws(()=>stockChange('Pending','Confirmed',product,8));for(const from of Object.keys(transitions))for(const to of Object.keys(transitions))if(!transitions[from].includes(to))assert.throws(()=>stockChange(from,to,product,2));});

test('rejects negative, noninteger and excessive cart quantities',()=>{
 for(const quantity of [-1,0,0.5,1000])assert.throws(()=>validateOrder({...order,items:[{...order.items[0],quantity}]}));
});
test('prevents overselling when reservations consume remaining stock',()=>{
 assert.throws(()=>stockChange('Pending','Confirmed',{...product,stock:5,reserved_stock:4},2));
 assert.throws(()=>stockChange('Ready','Completed',{...product,stock:1,reserved_stock:2},2));
});
test('completed and cancelled orders cannot transition again',()=>{
 assert.deepEqual(transitions.Completed,[]);
 assert.deepEqual(transitions.Cancelled,[]);
});
