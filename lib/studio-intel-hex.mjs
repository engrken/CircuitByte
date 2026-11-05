// Intel HEX decoder for the bounded 32 KB ATmega328P program image.
// No arbitrary code evaluation; rejects malformed checksums and out-of-range records.
export function parseUnoHex(input){
 if(typeof input!=='string'||input.length>200000)throw Error('HEX file is missing or too large (200 KB maximum).');
 const lines=input.trim().split(/\r?\n/);
 if(lines.length<2||lines.length>3000)throw Error('Unexpected Intel HEX record count.');
 const image=new Uint8Array(32768).fill(0xff),written=new Uint8Array(32768);
 let base=0,eof=false,bytes=0;
 for(const line of lines){
  const value=line.trim();
  if(!/^:(?:[0-9A-Fa-f]{2})+$/.test(value))throw Error('Invalid Intel HEX record syntax.');
  const hex=value.slice(1),raw=new Uint8Array(hex.length/2);
  for(let i=0;i<raw.length;i++)raw[i]=parseInt(hex.slice(i*2,i*2+2),16);
  if(raw.length<5||raw.length!==raw[0]+5)throw Error('Incorrect Intel HEX record length.');
  if(raw.reduce((sum,v)=>(sum+v)&255,0)!==0)throw Error('Intel HEX checksum failure.');
  if(eof)throw Error('Intel HEX contains data after EOF.');
  const n=raw[0],at=raw[1]*256+raw[2],type=raw[3];
  if(type===0){
   const absolute=base+at;
   if(absolute+n>image.length)throw Error('HEX address exceeds the ATmega328P 32 KB flash limit.');
   for(let i=0;i<n;i++){
    const address=absolute+i,value=raw[i+4];
    if(written[address]&&image[address]!==value)throw Error('HEX records contain conflicting program bytes.');
    image[address]=value;written[address]=1;
   }
   bytes+=n;
  }else if(type===1){if(n||at)throw Error('Malformed Intel HEX EOF.');eof=true;}
  else if(type===4){if(n!==2||at!==0)throw Error('Invalid extended linear address record.');base=(raw[4]*256+raw[5])*65536;}
  else if(type===2){if(n!==2||at!==0)throw Error('Invalid extended segment address record.');base=(raw[4]*256+raw[5])*16;}
  else if(type!==3&&type!==5)throw Error('Unsupported Intel HEX record type.');
 }
 if(!eof||!bytes)throw Error('HEX must contain program data and an EOF record.');
 return image;
}
