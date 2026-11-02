// Board-aware Arduino library registry: catalog SKUs are not package names.
export const STUDIO_LIBRARY_REGISTRY=Object.freeze({
 // Common reference-module libraries are installed only when their headers appear in the sketch
 // or the learner selects them manually. A module's name alone never guarantees compatibility.
 bme280:{name:'Adafruit BME280 Library',headers:['Adafruit_BME280.h'],products:[],reason:'BME280 environmental readings; verify breakout power, address and driver'},
 bmp280:{name:'Adafruit BMP280 Library',headers:['Adafruit_BMP280.h'],products:[],reason:'BMP280 pressure readings; verify module, address and voltage'},
 mpu6050:{name:'Adafruit MPU6050',headers:['Adafruit_MPU6050.h'],products:[],reason:'MPU6050 motion readings; verify I2C power and orientation'},
 ads1x15:{name:'Adafruit ADS1X15',headers:['Adafruit_ADS1X15.h'],products:[],reason:'ADS1115 external ADC; input must remain within allowed voltage range'},
 ina219:{name:'Adafruit INA219',headers:['Adafruit_INA219.h'],products:[],reason:'INA219 low-voltage DC current sensing; verify shunt and bus limits'},
 pn532:{name:'Adafruit PN532',headers:['Adafruit_PN532.h'],products:[],reason:'PN532 NFC; verify interface selector and supply'},
 onewire:{name:'OneWire',headers:['OneWire.h'],products:[],reason:'One-wire temperature sensors and required bus pull-up'},
 dallas:{name:'DallasTemperature',headers:['DallasTemperature.h'],products:[],reason:'DS18B20 temperature conversion; requires OneWire'},
 mfrc522:{name:'MFRC522',headers:['MFRC522.h'],products:[],reason:'MFRC522 RFID reader; verify 3.3V SPI and tag type'},
 rf24:{name:'RF24',headers:['RF24.h'],products:[],reason:'nRF24L01 SPI radio; use regulated 3.3V supply and antenna'},
 radiolib:{name:'RadioLib',headers:['RadioLib.h'],products:[],reason:'SX127x LoRa radio; verify region, frequencies and antenna'},
 busio:{name:'Adafruit BusIO',headers:['Adafruit_I2CDevice.h','Adafruit_SPIDevice.h'],products:[],reason:'Adafruit I2C and SPI driver dependency'},

 tinygsm:{name:'TinyGSM',headers:['TinyGsmClient.h'],products:[],reason:'Optional SIM900A / SIM800 / LTE modem client; select the matching modem macro and verify 2G service or LTE bands'},
 esp32servo:{name:'ESP32Servo',headers:['ESP32Servo.h'],products:[],reason:'ESP32 family servo PWM library; check the selected SoC, power and PWM-capable pins'},
 m5unified:{name:'M5Unified',headers:['M5Unified.h'],products:[],reason:'M5Stack unified board API; verify your exact M5Core model'},
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
export function resolveStudioLibraries({parts=[],code='',manualLibraries=[],board='arduino:avr:uno'}={}){
 const selected=new Set((Array.isArray(parts)?parts:[]).filter(x=>typeof x==='string').slice(0,32));
 const includes=new Set([...String(code).matchAll(/^[ \t]*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map(x=>x[1]));
 const manual=new Set(Array.isArray(manualLibraries)?manualLibraries.filter(x=>typeof x==='string').slice(0,20):[]);
 const isEsp32=board.startsWith('esp32:');
 const required=Object.entries(STUDIO_LIBRARY_REGISTRY).filter(([id,v])=>
  !(isEsp32&&(id==='softserial'||id==='servo'))&&
  (v.products.some(p=>selected.has(p))||v.headers.some(h=>includes.has(h))||manual.has(id)));
 // ESP32 uses its HardwareSerial UART and an ESP32-specific servo implementation.
 if(isEsp32 && (['cb-070','cb-071'].some(id=>selected.has(id))||includes.has('ESP32Servo.h')||manual.has('esp32servo')) &&
   !required.some(([id])=>id==='esp32servo'))required.push(['esp32servo',STUDIO_LIBRARY_REGISTRY.esp32servo]);
 // Resolve known transitive library requirements even when the user only writes an #include.
 if(required.some(([id])=>id==='dht')&&!required.some(([id])=>id==='unified'))required.push(['unified',STUDIO_LIBRARY_REGISTRY.unified]);
 if(required.some(([id])=>id==='oled')&&!required.some(([id])=>id==='gfx'))required.push(['gfx',STUDIO_LIBRARY_REGISTRY.gfx]);
 if(required.some(([id])=>['bme280','bmp280','mpu6050','ads1x15','ina219','pn532'].includes(id))&&!required.some(([id])=>id==='busio'))
  required.push(['busio',STUDIO_LIBRARY_REGISTRY.busio]);
 if(required.some(([id])=>['bme280','mpu6050'].includes(id))&&!required.some(([id])=>id==='unified'))
  required.push(['unified',STUDIO_LIBRARY_REGISTRY.unified]);
 if(required.some(([id])=>id==='dallas')&&!required.some(([id])=>id==='onewire'))
  required.push(['onewire',STUDIO_LIBRARY_REGISTRY.onewire]);
 const corePackages=board.startsWith('esp8266:')?new Set(['SD','Servo']):board.startsWith('esp32:')?new Set(['SD']):new Set();
 const packages=[...new Set(required.map(([,v])=>v.name).filter(name=>name&&!corePackages.has(name)))];
 const headers=[...new Set(required.flatMap(([,v])=>v.headers))];
 const known=new Set([...STUDIO_BUILTIN_HEADERS,...Object.values(STUDIO_LIBRARY_REGISTRY).flatMap(v=>v.headers)]);
 if(isEsp32){known.delete('SoftwareSerial.h');known.delete('Servo.h');}
 else known.delete('ESP32Servo.h');
 if(board.startsWith('esp8266:'))for(const header of ['ESP8266WiFi.h','ESP8266WebServer.h','ESP8266HTTPClient.h','ESP8266mDNS.h','WiFiClient.h','WiFiClientSecure.h','LittleFS.h','FS.h','DNSServer.h','Ticker.h'])known.add(header);
 if(isEsp32)for(const header of ['WiFi.h','WebServer.h','HTTPClient.h','WiFiClient.h','WiFiClientSecure.h','ESPmDNS.h','LittleFS.h','SPIFFS.h','FS.h','Preferences.h','esp_wifi.h','esp_sleep.h'])known.add(header);
 if(board==='esp32:esp32:esp32'||board==='esp32:esp32:m5stack-core-esp32')known.add('BluetoothSerial.h');
 const unknownIncludes=[...includes].filter(x=>!known.has(x)&&!x.startsWith('avr/')&&!x.startsWith('util/')&&!x.startsWith('stdint')&&!x.startsWith('math.')&&!x.startsWith('string.')&&!x.startsWith('stdio.'));
 return {packages,headers,unknownIncludes,details:required.map(([id,v])=>({id,name:v.name||'Arduino core built-in',reason:v.reason,headers:v.headers,mode:v.name?'managed':'built-in'}))};
}
export function insertSuggestedIncludes(source,parts,manualLibraries=[],board='arduino:avr:uno'){
 const original=String(source);
 const existing=new Set([...original.matchAll(/^[ \t]*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map(x=>x[1]));
 const headers=resolveStudioLibraries({parts,code:original,manualLibraries,board}).headers.filter(x=>!existing.has(x));
 return headers.length?headers.map(x=>'#include <'+x+'>').join('\n')+'\n\n'+original:original;
}
