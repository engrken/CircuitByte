// Firmware families are explicit: compilation support does not imply one universal bootloader.
export const UPLOAD_PROFILES={
 'arduino:avr:uno':{kind:'stk500',baud:115200,maxFlash:32256,label:'ATmega328P / Optiboot'},
 'arduino:avr:nano:cpu=atmega328':{kind:'stk500',baud:115200,maxFlash:30720,label:'Nano ATmega328P / new bootloader'},
 'arduino:avr:nano:cpu=atmega328old':{kind:'stk500',baud:57600,maxFlash:30720,label:'Nano ATmega328P / old bootloader'},
 'esp8266:esp8266:nodemcuv2':{kind:'esp',chip:'ESP8266',label:'ESP8266 ROM bootloader'},
 'esp32:esp32:esp32':{kind:'esp',chip:'ESP32',label:'ESP32 ROM bootloader'},
 'esp32:esp32:esp32s3':{kind:'esp',chip:'ESP32-S3',label:'ESP32-S3 ROM bootloader'},
 'esp32:esp32:esp32c3':{kind:'esp',chip:'ESP32-C3',label:'ESP32-C3 ROM bootloader'},
 'esp32:esp32:m5stack-core-esp32':{kind:'esp',chip:'ESP32',label:'M5Stack Core / ESP32 ROM bootloader'}
};
export const uploadProfile=board=>UPLOAD_PROFILES[board]||null;
export function validateEspFiles(files){
 if(!Array.isArray(files)||!files.length||files.length>6)throw Error('Select one to six firmware BIN files.');
 let total=0;
 const result=files.map(file=>{
  const address=typeof file.address==='number'?file.address:/^(?:0x[\da-f]+|\d+)$/i.test(file.address||'')?Number(file.address):NaN;
  if(!Number.isSafeInteger(address)||address<0||address%4096!==0||address>=0x1000000)throw Error('Enter a valid flash offset aligned to 0x1000 from the matching build upload command.');
  if(!(file.data instanceof Uint8Array)||!file.data.length||address+file.data.length>0x1000000)throw Error('Invalid firmware size (16 MB address space limit).');
  total+=file.data.length;return {...file,address};
 }).sort((a,b)=>a.address-b.address);
 if(total>0x1000000)throw Error('Firmware exceeds 16 MB.');
 for(let i=1;i<result.length;i++)if(result[i].address<Math.ceil((result[i-1].address+result[i-1].data.length)/4096)*4096)throw Error('Firmware files overlap in the same flash sector.');
 return result;
}
export async function uploadEspFirmware(port,board,files,{onProgress=()=>{},onLog=()=>{}}={}){
 const profile=uploadProfile(board);if(profile?.kind!=='esp')throw Error('Choose an ESP board.');
 const fileArray=validateEspFiles(files);
 const [{ESPLoader,Transport},{default:CryptoJS}]=await Promise.all([import('esptool-js'),import('crypto-js')]);
 const transport=new Transport(port,false);
 const loader=new ESPLoader({transport,baudrate:115200,romBaudrate:115200,terminal:{clean(){},write:onLog,writeLine:line=>onLog(line+'\n')},debugLogging:false});
 try{
  await loader.main();
  const detected=loader.chip?.CHIP_NAME;
  if(detected!==profile.chip)throw Error('Detected '+detected+' but selected '+profile.chip+'. No flash write performed.');
  const size=await loader.detectFlashSize();
  if(!size)throw Error('Cannot determine flash capacity. No flash write performed.');
  const capacity=loader.flashSizeBytes(size);
  if(fileArray.some(f=>f.address+f.data.length>capacity))throw Error('Firmware does not fit detected flash capacity.');
  await loader.writeFlash({fileArray,flashSize:'keep',flashMode:'keep',flashFreq:'keep',eraseAll:false,compress:true,
   calculateMD5Hash:bytes=>CryptoJS.MD5(CryptoJS.lib.WordArray.create(bytes)).toString(),
   reportProgress:(index,written,total)=>onProgress(Math.floor((index+written/Math.max(1,total))/fileArray.length*100))});
  onProgress(100);
  try{await loader.after('hard_reset');}catch{onLog('Flash verified. Press RESET manually to start the application.\n');}
  return {chip:detected,verified:true};
 }finally{try{await transport.disconnect();}catch{}}
}

export async function decodeEspImage(file){
 const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));
 if(file.encoding==='gzip-base64'){
  if(typeof DecompressionStream==='undefined')throw Error('Use a current desktop Chrome or Edge browser to unpack this firmware.');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const data=new Uint8Array(await new Response(stream).arrayBuffer());
  if(data.length!==file.size||data.length>16777216)throw Error('Compiled firmware package size is invalid.');
  return data;
 }
 return bytes;
}
