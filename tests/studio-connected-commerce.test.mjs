import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_OPTIONS} from '../lib/studio-boards.mjs';
import {previewArduinoSketch} from '../lib/studio-preview.mjs';
import {studioShoppingLines,addStudioCartItems} from '../lib/studio-commerce.mjs';
for(const board of BOARD_OPTIONS)test(board.name+' supports explicit GPIO sequence preview',()=>{
 const result=previewArduinoSketch('void setup(){pinMode(4,OUTPUT);} void loop(){digitalWrite(4,HIGH);delay(100);digitalWrite(4,LOW);delay(100);}',board.id);
 assert.equal(result.supported,true);assert.deepEqual(result.frames.map(f=>f.output[4]),[true,false]);
});
test('ESP built-in LED mapping is never guessed',()=>assert.equal(previewArduinoSketch('void loop(){digitalWrite(LED_BUILTIN,HIGH);delay(100);}','esp32:esp32:esp32').supported,false));
test('Unsupported condition does not produce invented states',()=>assert.equal(previewArduinoSketch('void loop(){if(true){digitalWrite(4,HIGH);}delay(100);}','esp32:esp32:esp32').supported,false));
test('BOM uses catalog IDs, includes selected board, and preserves required quantities',()=>{
 const products=[{id:'board',stock:2},{id:'led',stock:3}];
 const selected=studioShoppingLines({selected:['led','led'],boardProductId:'board',products});
 assert.equal(selected.length,2);assert.equal(selected[0].quantityKnown,false);
 const rows=studioShoppingLines({spec:{bom:[{id:'led',qty:5},{id:'missing',qty:1}]},products});
 assert.equal(rows[0].qty,5);assert.equal(rows[1].available,false);
 assert.deepEqual(addStudioCartItems([{id:'other',quantity:2},{id:'led',quantity:1}],rows),[{id:'other',quantity:2},{id:'led',quantity:3}]);
});
test('Out of stock and malformed cart entries do not enter the cart',()=>{
 const lines=studioShoppingLines({selected:['zero','unknown'],products:[{id:'zero',stock:0}]});
 assert.deepEqual(addStudioCartItems([null,{id:'bad',quantity:-2}],lines),[]);
});

test('Store handoff targets the storefront directly so the home redirect cannot discard parameters',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../app/studio/parts-shop.jsx',import.meta.url),'utf8');
 assert.ok(source.includes('/catalog?product='));
 assert.ok(source.includes('/catalog?cart=1'));
});
