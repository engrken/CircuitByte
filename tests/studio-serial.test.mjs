import test from 'node:test';
import assert from 'node:assert/strict';
import {describeSerialPort,parseIntelHex,uploadUnoHex,UNO_MAX_FLASH} from '../lib/studio-serial.mjs';

function line(type,addr,payload=[]){
 const values=[payload.length,(addr>>8)&255,addr&255,type,...payload];
 values.push((-values.reduce((s,v)=>s+v,0))&255);
 return ':'+values.map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
}
function hex(...records){return [...records,line(1,0)].join('\n')+'\n';}
class FakeUnoPort {
 constructor({signature=[0x1e,0x95,0x0f],corruptReadback=false}={}){
   this.signature=signature;this.corruptReadback=corruptReadback;
   this.flash=new Uint8Array(UNO_MAX_FLASH).fill(255);
   this.address=0;this.commands=[];this.opened=false;this.writtenPages=0;
 }
 getInfo(){return {usbVendorId:0x2341,usbProductId:0x0043};}
 async open(options){
   assert.equal(options.baudRate,115200);
   this.opened=true;
   this.readable=new ReadableStream({start:controller=>{this.controller=controller;}});
   this.writable=new WritableStream({write:async bytes=>this.respond([...bytes])});
 }
 async setSignals(){}
 async close(){this.opened=false;}
 respond(bytes){
   const command=bytes[0],answer=[0x14],args=bytes.slice(1,-1);
   assert.equal(bytes.at(-1),0x20);
   this.commands.push(command);
   switch(command){
    case 0x30: break;
    case 0x75: answer.push(...this.signature);break;
    case 0x55:this.address=(args[0]|(args[1]<<8))*2;break;
    case 0x64:{
      const size=(args[0]<<8)|args[1];assert.equal(args[2],0x46);
      assert.equal(size,128);this.flash.set(args.slice(3,3+size),this.address);this.writtenPages++;break;
    }
    case 0x74:{
      const size=(args[0]<<8)|args[1];
      const data=this.flash.slice(this.address,this.address+size);
      if(this.corruptReadback)data[0]^=1;
      answer.push(...data);break;
    }
    case 0x51:break;
    default:throw Error('Unexpected bootloader command '+command);
   }
   answer.push(0x10);
   this.controller.enqueue(Uint8Array.from(answer));
 }
}
test('Vendor and product IDs are hints, never claim board verified',()=>{
 const details=describeSerialPort({usbVendorId:0x1a86,usbProductId:0x7523});
 assert.match(details.label,/WCH/);
 assert.match(details.identity,/0x1a86/);
 assert.match(details.warning,/does not verify/);
});
test('Intel HEX accepts valid records and pads flash pages',()=>{
 const file=hex(line(0,0,[1,2,3,4]),line(0,0x80,[5,6,7]));
 const image=parseIntelHex(file);
 assert.equal(image.pages,2);
 assert.equal(image.flash.length,256);
 assert.deepEqual([...image.flash.slice(0,5)],[1,2,3,4,255]);
 assert.deepEqual([...image.flash.slice(128,132)],[5,6,7,255]);
});
test('Intel HEX refuses invalid checksum, missing EOF and bootloader overwrites',()=>{
 const valid=line(0,0,[0,1,2]);
 assert.throws(()=>parseIntelHex(valid.replace(/.$/,'F')+'\n'+line(1,0)),/checksum/i);
 assert.throws(()=>parseIntelHex(valid),/end-of-file/);
 assert.throws(()=>parseIntelHex(hex(line(0,UNO_MAX_FLASH,[0x99]))),/exceeds UNO/);
 assert.throws(()=>parseIntelHex(hex(line(6,0,[]))),/Unsupported/);
 assert.throws(()=>parseIntelHex(hex(line(0,0,[255]),line(0,0,[1]))),/overlapping/);
});
test('UNO serial uploader uses STK500, verifies MCU signature and flash readback',async()=>{
 const port=new FakeUnoPort();
 const image=hex(line(0,0,[0x12,0x34,0x56,0x78]),line(0,0x80,[0x99,0xaa]));
 const progress=[];
 const result=await uploadUnoHex(port,image,{onProgress:p=>progress.push(p.percent)});
 assert.equal(result.ok,true);
 assert.equal(result.verified,true);
 assert.equal(result.pages,2);
 assert.deepEqual(progress,[50,100]);
 assert.equal(port.writtenPages,2);
 assert.equal(port.opened,false);
 assert.deepEqual([...port.flash.slice(0,5)],[0x12,0x34,0x56,0x78,0xff]);
 assert.deepEqual([...port.flash.slice(0x80,0x83)],[0x99,0xaa,0xff]);
 assert.ok(port.commands.includes(0x75));
 assert.equal(port.commands.at(-1),0x51);
});
test('UNO uploader refuses incorrect MCU signature and does not flash',async()=>{
 const port=new FakeUnoPort({signature:[0,0,0]});
 const image=hex(line(0,0,[1,2,3]));
 await assert.rejects(uploadUnoHex(port,image),/not ATmega328P/i);
 assert.equal(port.writtenPages,0);
 assert.equal(port.opened,false);
});
test('UNO uploader fails when readback differs from firmware',async()=>{
 const port=new FakeUnoPort({corruptReadback:true});
 await assert.rejects(uploadUnoHex(port,hex(line(0,0,[8,7,6]))),/verification failed/);
 assert.equal(port.opened,false);
});
