// Arduino UNO library registry: catalog SKUs are not package names.
export const STUDIO_LIBRARY_REGISTRY=Object.freeze({
 hd44780:{name:'hd44780',headers:['hd44780.h','hd44780ioClass/hd44780_I2Cexp.h'],products:['cb-066'],reason:'16x2 I2C LCD display'},
 dht:{name:'DHT sensor library',headers:['DHT.h'],products:['cb-079'],reason:'DHT22 digital humidity and temperature sensor'},
 unified:{name:'Adafruit Unified Sensor',headers:['Adafruit_Sensor.h'],products:['cb-079'],reason:'DHT library dependency'},
 sd:{name:'SD',headers:['SD.h'],products:['cb-077'],reason:'SPI microSD card module'},
 wire:{name:null,headers:['Wire.h'],products:['cb-066'],reason:'I2C support included with Arduino AVR'},
 spi:{name:null,headers:['SPI.h'],products:['cb-077'],reason:'SPI support included with Arduino AVR'}
});
export const STUDIO_BUILTIN_HEADERS=['Arduino.h','Wire.h','SPI.h','EEPROM.h','Servo.h','SD.h','SoftwareSerial.h','LiquidCrystal.h'];
export function resolveStudioLibraries({parts=[],code=''}={}){
 const selected=new Set((Array.isArray(parts)?parts:[]).filter(x=>typeof x==='string').slice(0,32));
 const includes=new Set([...String(code).matchAll(/^[ \t]*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map(x=>x[1]));
 const required=Object.entries(STUDIO_LIBRARY_REGISTRY).filter(([,v])=>v.products.some(id=>selected.has(id))||v.headers.some(h=>includes.has(h)));
 const packages=[...new Set(required.map(([,v])=>v.name).filter(Boolean))];
 const headers=[...new Set(required.flatMap(([,v])=>v.headers))];
 const known=new Set([...STUDIO_BUILTIN_HEADERS,...Object.values(STUDIO_LIBRARY_REGISTRY).flatMap(v=>v.headers)]);
 const unknownIncludes=[...includes].filter(x=>!known.has(x)&&!x.startsWith('avr/')&&!x.startsWith('util/')&&!x.startsWith('stdint')&&!x.startsWith('math.')&&!x.startsWith('string.')&&!x.startsWith('stdio.'));
 return {packages,headers,unknownIncludes,details:required.map(([id,v])=>({id,name:v.name||'Arduino AVR built-in',reason:v.reason,headers:v.headers,mode:v.name?'managed':'built-in'}))};
}
export function insertSuggestedIncludes(source,parts){
 const original=String(source);
 const existing=new Set([...original.matchAll(/^[ \t]*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map(x=>x[1]));
 const headers=resolveStudioLibraries({parts,code:original}).headers.filter(x=>!existing.has(x));
 return headers.length?headers.map(x=>'#include <'+x+'>').join('\n')+'\n\n'+original:original;
}
