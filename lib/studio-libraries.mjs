// Arduino UNO library registry: catalog SKUs are not package names.
export const STUDIO_LIBRARY_REGISTRY=Object.freeze({
 hd44780:{name:'hd44780',headers:['hd44780.h','hd44780ioClass/hd44780_I2Cexp.h'],products:['cb-066'],reason:'16x2 I2C LCD display'},
 dht:{name:'DHT sensor library',headers:['DHT.h'],products:['cb-079','cb-050'],reason:'DHT22 digital humidity and temperature sensor'},
 unified:{name:'Adafruit Unified Sensor',headers:['Adafruit_Sensor.h'],products:['cb-079','cb-050'],reason:'DHT library dependency'},
 sd:{name:'SD',headers:['SD.h'],products:['cb-077'],reason:'SPI microSD card module'},
 wire:{name:null,headers:['Wire.h'],products:['cb-066'],reason:'I2C support included with Arduino AVR'},
 spi:{name:null,headers:['SPI.h'],products:['cb-077'],reason:'SPI support included with Arduino AVR'},
 oled:{name:'Adafruit SSD1306',headers:['Adafruit_SSD1306.h'],products:['cb-019'],reason:'Catalog 0.96 inch SSD1306 OLED display'},
 gfx:{name:'Adafruit GFX Library',headers:['Adafruit_GFX.h'],products:['cb-019'],reason:'SSD1306 graphics dependency'},
 rtc:{name:'RTClib',headers:['RTClib.h'],products:['cb-067'],reason:'DS3231 I2C real-time clock'},
 gps:{name:'TinyGPSPlus',headers:['TinyGPS++.h'],products:['cb-030','cb-083'],reason:'Optional GPS NMEA decoder'},
 ir:{name:'IRremote',headers:['IRremote.hpp'],products:['cb-055','cb-056'],reason:'IR receiver and transmitter decoding'},
 servo:{name:'Servo',headers:['Servo.h'],products:['cb-070','cb-071'],reason:'UNO hobby servo control'},
 stepper:{name:'Stepper',headers:['Stepper.h'],products:['cb-072'],reason:'28BYJ-48 stepper motor control'},
 softserial:{name:null,headers:['SoftwareSerial.h'],products:['cb-018','cb-030','cb-083','cb-061'],reason:'UNO serial for Bluetooth, GPS or GSM; built-in AVR library'},
 rtc1302:{name:'Rtc by Makuna',headers:['RtcDS1302.h'],products:[],reason:'Optional DS1302 RTC library; verify the exact module wiring'},
 encoder:{name:'Encoder',headers:['Encoder.h'],products:[],reason:'Optional quadrature rotary encoder decoding'},
 accel:{name:'AccelStepper',headers:['AccelStepper.h'],products:[],reason:'Optional speed/acceleration control for stepper modules'},
 liquid:{name:'LiquidCrystal',headers:['LiquidCrystal.h'],products:[],reason:'Built-in parallel LCD interface; separate from I2C LCD backpacks'}
});
export const STUDIO_BUILTIN_HEADERS=['Arduino.h','Wire.h','SPI.h','EEPROM.h','Servo.h','Stepper.h','SD.h','SoftwareSerial.h','LiquidCrystal.h'];
export function resolveStudioLibraries({parts=[],code='',manualLibraries=[]}={}){
 const selected=new Set((Array.isArray(parts)?parts:[]).filter(x=>typeof x==='string').slice(0,32));
 const includes=new Set([...String(code).matchAll(/^[ \t]*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map(x=>x[1]));
 const manual=new Set(Array.isArray(manualLibraries)?manualLibraries.filter(x=>typeof x==='string').slice(0,20):[]);
 const required=Object.entries(STUDIO_LIBRARY_REGISTRY).filter(([id,v])=>v.products.some(p=>selected.has(p))||v.headers.some(h=>includes.has(h))||manual.has(id));
 // Resolve known transitive library requirements even when the user only writes an #include.
 if(required.some(([id])=>id==='dht')&&!required.some(([id])=>id==='unified'))required.push(['unified',STUDIO_LIBRARY_REGISTRY.unified]);
 if(required.some(([id])=>id==='oled')&&!required.some(([id])=>id==='gfx'))required.push(['gfx',STUDIO_LIBRARY_REGISTRY.gfx]);
 const packages=[...new Set(required.map(([,v])=>v.name).filter(Boolean))];
 const headers=[...new Set(required.flatMap(([,v])=>v.headers))];
 const known=new Set([...STUDIO_BUILTIN_HEADERS,...Object.values(STUDIO_LIBRARY_REGISTRY).flatMap(v=>v.headers)]);
 const unknownIncludes=[...includes].filter(x=>!known.has(x)&&!x.startsWith('avr/')&&!x.startsWith('util/')&&!x.startsWith('stdint')&&!x.startsWith('math.')&&!x.startsWith('string.')&&!x.startsWith('stdio.'));
 return {packages,headers,unknownIncludes,details:required.map(([id,v])=>({id,name:v.name||'Arduino AVR built-in',reason:v.reason,headers:v.headers,mode:v.name?'managed':'built-in'}))};
}
export function insertSuggestedIncludes(source,parts,manualLibraries=[]){
 const original=String(source);
 const existing=new Set([...original.matchAll(/^[ \t]*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map(x=>x[1]));
 const headers=resolveStudioLibraries({parts,code:original,manualLibraries}).headers.filter(x=>!existing.has(x));
 return headers.length?headers.map(x=>'#include <'+x+'>').join('\n')+'\n\n'+original:original;
}
