import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUnoHex} from '../lib/studio-intel-hex.mjs';
function line(address,type,data=[]){
 const b=[data.length,(address>>8)&255,address&255,type,...data];const sum=b.reduce((a,x)=>a+x,0);
 return ':'+[...b,(-sum)&255].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
}
const eof=':00000001FF';
test('valid 16-bit AVR flash bytes are parsed with checksum and padding',()=>{
 const data=parseUnoHex(line(0,0,[0,0,8,149])+'\n'+eof);
 assert.equal(data.length,32768);assert.deepEqual([...data.slice(0,5)],[0,0,8,149,255]);
});
test('checksum, malformed records, empty payload and missing EOF are rejected',()=>{
 assert.throws(()=>parseUnoHex(':020000000000FF\n'+eof),/checksum/);
 assert.throws(()=>parseUnoHex('bad\n'+eof),/syntax/);
 assert.throws(()=>parseUnoHex(eof),/record count/);
 assert.throws(()=>parseUnoHex(line(0,0,[0,0])+'\n'+line(2,0,[1])),/EOF/);
});
test('outside 32 KB flash and conflicting duplicate bytes are rejected',()=>{
 assert.throws(()=>parseUnoHex(line(32767,0,[1,2])+'\n'+eof),/flash limit/);
 assert.throws(()=>parseUnoHex(line(0,4,[0,1])+'\n'+line(0,0,[0])+'\n'+eof),/flash limit/);
 assert.throws(()=>parseUnoHex(line(0,0,[0])+'\n'+line(0,0,[1])+'\n'+eof),/conflicting/);
});
