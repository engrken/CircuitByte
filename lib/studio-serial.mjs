// Browser-only serial utilities; no Web APIs are touched at import time.
// Device recognition is advisory: a USB-to-serial VID/PID does NOT identify MCU/bootloader.
export const UNO_MAX_FLASH=32256; // Arduino UNO R3 Optiboot application area.
export const UNO_SIGNATURE=[0x1e,0x95,0x0f]; // ATmega328P.
export const UNO_BAUD=115200;
const USB_DEVICES=new Map([
  [0x2341,'Arduino-branded USB interface'],
  [0x2a03,'Arduino-branded USB interface'],
  [0x1a86,'WCH CH340/CH341/CH910x USB-serial adapter'],
  [0x10c4,'Silicon Labs CP210x USB-serial adapter'],
  [0x0403,'FTDI USB-serial adapter']
]);
export function describeSerialPort(info={}) {
  const vendor=Number.isInteger(info.usbVendorId)?info.usbVendorId:null;
  const product=Number.isInteger(info.usbProductId)?info.usbProductId:null;
  const fmt=n=>n===null?'unknown':'0x'+n.toString(16).padStart(4,'0');
  return {
    label:vendor===null?'Serial port (USB identity unavailable)':
      (USB_DEVICES.get(vendor)||'Unidentified USB serial interface'),
    usbVendorId:vendor,usbProductId:product,
    identity:'VID '+fmt(vendor)+' · PID '+fmt(product),
    warning:'USB identity does not verify Arduino UNO, ATmega328P, the installed bootloader, or its baud rate.'
  };
}
function expect(cond,message){if(!cond)throw new Error(message);}
// Intel HEX is ASCII; check records and checksums before any flashing.
export function parseIntelHex(text) {
  expect(typeof text==='string'&&text.length>0&&text.length<250000,'Choose a valid .hex file under 250 KB.');
  const data=new Uint8Array(UNO_MAX_FLASH).fill(0xff);
  const written=new Uint8Array(UNO_MAX_FLASH);
  let count=0,base=0,ended=false,used=0;
  const lines=text.trim().split(/\r?\n/);
  expect(lines.length<=4096,'Firmware has too many HEX records.');
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    expect(/^:[0-9a-fA-F]+$/.test(line)&&line.length>=11&&(line.length-1)%2===0,'Malformed Intel HEX at line '+(i+1)+'.');
    const bytes=new Uint8Array((line.length-1)/2);
    for(let j=0;j<bytes.length;j++)bytes[j]=parseInt(line.slice(j*2+1,j*2+3),16);
    const n=bytes[0],offset=(bytes[1]<<8)|bytes[2],type=bytes[3];
    expect(bytes.length===5+n,'Incorrect Intel HEX record length at line '+(i+1)+'.');
    expect(bytes.reduce((a,b)=>a+b,0)%256===0,'Intel HEX checksum mismatch at line '+(i+1)+'.');
    expect(!ended,'HEX records found after end-of-file marker.');
    if(type===0x00){
      const start=base+offset;
      expect(start>=0&&start+n<=UNO_MAX_FLASH,'Firmware exceeds UNO application flash (32,256 bytes).');
      for(let j=0;j<n;j++){const p=start+j;const value=bytes[4+j];if(written[p]&&data[p]!==value)throw new Error('Conflicting overlapping HEX records.');data[p]=value;written[p]=1;}
      used=Math.max(used,start+n);count+=n;
    } else if(type===0x01){
      expect(n===0,'Invalid Intel HEX end-of-file record.');
      ended=true;
    } else if(type===0x02){expect(n===2,'Invalid Intel HEX segment-address record.');base=(((bytes[4]<<8)|bytes[5])<<4);}
    else if(type===0x04){expect(n===2,'Invalid Intel HEX linear-address record.');base=(((bytes[4]<<8)|bytes[5])*65536);}
    else if(type===0x03||type===0x05){expect(n===4,'Invalid Intel HEX execution-address record.');}
    else throw new Error('Unsupported Intel HEX record type '+type+'.');
  }
  expect(ended,'Firmware lacks an Intel HEX end-of-file record.');
  expect(count>0&&used>0,'HEX contains no program bytes.');
  return {flash:data.slice(0,Math.ceil(used/128)*128),usedBytes:used,recordBytes:count,pages:Math.ceil(used/128)};
}
// A queued reader prevents orphaned concurrent read() calls after a timeout.
export class SerialResponseQueue {
  constructor(reader){this.reader=reader;this.bytes=[];this.waiting=[];this.closed=false;this.error=null;this.loop=this.pump();}
  async pump(){
    try{
      while(!this.closed){
        const {value,done}=await this.reader.read();
        if(done)break;
        for(const b of value||[]){
          const waiting=this.waiting.shift();
          if(waiting){clearTimeout(waiting.timer);waiting.resolve(b);}
          else this.bytes.push(b);
        }
      }
    }catch(e){this.error=e;}
    finally{
      this.closed=true;
      for(const w of this.waiting.splice(0)){clearTimeout(w.timer);w.reject(this.error||new Error('Serial port disconnected.'));}
    }
  }
  readByte(timeoutMs=1500){
    if(this.bytes.length)return Promise.resolve(this.bytes.shift());
    if(this.closed)return Promise.reject(this.error||new Error('Serial port disconnected.'));
    return new Promise((resolve,reject)=>{
      const waiter={resolve,reject,timer:null};
      waiter.timer=setTimeout(()=>{this.waiting=this.waiting.filter(x=>x!==waiter);reject(new Error('Timed out waiting for Arduino bootloader.'));},timeoutMs);
      this.waiting.push(waiter);
    });
  }
  flush(){this.bytes.length=0;}
  async stop(){
    this.closed=true;
    try{await this.reader.cancel();}catch{}
    try{await this.loop;}catch{}
    try{this.reader.releaseLock();}catch{}
  }
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function sendStk(writer,responses,command,count=0,timeout=1700){
  await writer.write(Uint8Array.from([...command,0x20]));
  const start=await responses.readByte(timeout);
  expect(start===0x14,'Board is not responding using the UNO STK500v1 bootloader.');
  const payload=[];
  for(let i=0;i<count;i++)payload.push(await responses.readByte(timeout));
  expect(await responses.readByte(timeout)===0x10,'Arduino bootloader reported a command error.');
  return payload;
}
export async function uploadUnoHex(port,hex,{onProgress=()=>{}}={}){
  expect(port&&typeof port.open==='function','Select a serial port first.');
  const firmware=parseIntelHex(hex);
  let reader,writer,responses,portOpened=false,signature;
  try{
    await port.open({baudRate:UNO_BAUD,bufferSize:2048});
    portOpened=true;
    writer=port.writable.getWriter();
    reader=port.readable.getReader();
    responses=new SerialResponseQueue(reader);
    // DTR pulses UNO's auto-reset circuit. USB bridges vary; manual reset may be needed.
    if(typeof port.setSignals==='function'){
      try{
        await port.setSignals({dataTerminalReady:false,requestToSend:false});
        await delay(120);
        await port.setSignals({dataTerminalReady:true,requestToSend:false});
        await delay(120);
        await port.setSignals({dataTerminalReady:false,requestToSend:false});
      }catch{/* Some bridges cannot set modem-control lines. */}
    }
    await delay(100);
    let synced=false;
    for(let attempt=0;attempt<6;attempt++){
      try{responses.flush();await sendStk(writer,responses,[0x30],0,650);synced=true;break;}
      catch{await delay(120);}
    }
    expect(synced,'UNO bootloader did not sync at 115200 baud. Check board, cable, driver, reset, and RX/TX wiring.');
    signature=await sendStk(writer,responses,[0x75],3);
    expect(signature.every((b,i)=>b===UNO_SIGNATURE[i]),'Chip signature is not ATmega328P. Refusing to upload to an unknown board.');
    for(let page=0;page<firmware.pages;page++){
      const start=page*128;
      const word=start/2;
      const bytes=firmware.flash.slice(start,start+128);
      await sendStk(writer,responses,[0x55,word&0xff,(word>>8)&0xff]);
      await sendStk(writer,responses,[0x64,0x00,0x80,0x46,...bytes],0,3500);
      await sendStk(writer,responses,[0x55,word&0xff,(word>>8)&0xff]);
      const readback=await sendStk(writer,responses,[0x74,0x00,0x80,0x46],128,3500);
      expect(bytes.every((b,i)=>b===readback[i]),'Flash verification failed on page '+(page+1)+'.');
      onProgress({done:page+1,total:firmware.pages,percent:Math.round((page+1)*100/firmware.pages)});
    }
    await sendStk(writer,responses,[0x51]);
    return {ok:true,pages:firmware.pages,usedBytes:firmware.usedBytes,verified:true,signature:'1E 95 0F'};
  }finally{
    if(responses)await responses.stop();
    else if(reader)try{reader.releaseLock();}catch{}
    if(writer)try{writer.releaseLock();}catch{}
    if(portOpened)try{await port.close();}catch{}
  }
}
