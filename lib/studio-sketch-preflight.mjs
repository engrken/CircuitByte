import {BOARD_OPTIONS} from './studio-boards.mjs';
import {resolveStudioLibraries} from './studio-libraries.mjs';

// Conservative, offline-only sketch review. This is NOT a compiler, electrical simulator, or hardware certification.
function withoutComments(source){
 const text=String(source),out=[];
 let state='code';
 for(let i=0;i<text.length;i++){
  const ch=text[i],next=text[i+1];
  if(state==='line'){
   if(ch==='\n'){out.push('\n');state='code';}else out.push(' ');
  }else if(state==='block'){
   if(ch==='*'&&next==='/'){out.push(' ',' ');i++;state='code';}
   else out.push(ch==='\n'?'\n':' ');
  }else if(state==='double'||state==='single'){
   out.push(ch);
   if(ch==='\\'&&i+1<text.length){out.push(text[++i]);}
   else if(ch===(state==='double'?'"':"'"))state='code';
  }else if(ch==='/'&&next==='/'){out.push(' ',' ');i++;state='line';}
  else if(ch==='/'&&next==='*'){out.push(' ',' ');i++;state='block';}
  else {out.push(ch);if(ch==='"')state='double';else if(ch==="'")state='single';}
 }
 return out.join('');
}
function codeOnly(source){
 return withoutComments(source).replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,match=>match.replace(/[^\n]/g,' '));
}
export function reviewStudioSketch({board='',code='',parts=[],manualLibraries=[],customLibrary=false}={}){
 const blockers=[],warnings=[],seen=new Set();
 const add=(severity,code,message,fix)=>{
  if(seen.has(code))return;
  seen.add(code);(severity==='blocker'?blockers:warnings).push({severity,code,message,fix});
 };
 const selected=BOARD_OPTIONS.find(item=>item.id===board);
 if(!selected){add('blocker','BOARD_UNSUPPORTED','The chosen board is not supported.','Choose a supported board before requesting compilation.');return {blockers,warnings,canCompile:false,verified:false};}
 const esp32=board.startsWith('esp32:'),esp8266=board.startsWith('esp8266:');
 const avr=board.startsWith('arduino:avr:');
 const classic=board==='esp32:esp32:esp32';
 const source=String(code).slice(0,15000);
 const uncommented=withoutComments(source),scan=codeOnly(source);
 const headers=new Set([...uncommented.matchAll(/^[ \t]*#\s*include\s*[<"]([^>"\r\n]+)[>"]/gm)].map(m=>m[1]));
 const has=h=>headers.has(h);
 if(esp32&&has('SoftwareSerial.h'))add('blocker','ESP32_SOFTWARE_SERIAL','SoftwareSerial.h is an AVR/ESP8266-style interface, not the selected ESP32 core serial API.','Use HardwareSerial with verified available UART pins for the exact ESP32/M5Stack variant.');
 if(esp32&&has('Servo.h'))add('blocker','ESP32_SERVO_HEADER','The generic Servo.h is not the supported servo header for this ESP32 core.','Use the reviewed ESP32Servo library and #include <ESP32Servo.h>; verify board and PWM pins.');
 if(esp32&&has('ESP8266WiFi.h'))add('blocker','ESP8266_WIFI_ON_ESP32','ESP8266WiFi.h targets a different board family.','For an ESP32 sketch use its bundled WiFi.h and confirm API compatibility.');
 if(esp8266&&has('WiFi.h'))add('blocker','ESP32_WIFI_ON_ESP8266','WiFi.h does not select the ESP8266 bundled Wi-Fi interface.','Use ESP8266WiFi.h and check its library APIs for the exact ESP8266 core.');
 if(avr&&(has('ESP8266WiFi.h')||has('BluetoothSerial.h')||has('ESP32Servo.h')))add('blocker','ESP_HEADER_ON_AVR','This sketch imports an ESP-specific header while targeting an AVR board.','Select the intended ESP board or replace the header with a library actually compatible with your AVR hardware.');
 if((board==='esp32:esp32:esp32s3'||board==='esp32:esp32:esp32c3'||esp8266||avr)&&has('BluetoothSerial.h'))
  add('blocker','BLUETOOTH_CLASSIC_UNAVAILABLE','BluetoothSerial uses Bluetooth Classic, which is unavailable for this selected target.','Use an appropriate BLE library only if the selected board supports BLE, or choose classic ESP32 for Bluetooth Classic.');
 if((avr||esp8266)&&has('BLEDevice.h'))add('blocker','BLE_TARGET_UNAVAILABLE','This sketch references the ESP32 BLE API on a board without that built-in feature.','Select a compatible BLE-capable board or use an externally wired, appropriately supported radio.');
 if(avr&&!board.includes('mega:')&&!board.includes('leonardo')&&/\bSerial[1-3]\s*\./.test(scan))
  add('blocker','AVR_EXTRA_SERIAL_UNAVAILABLE','The chosen AVR board has no Serial1/Serial2/Serial3 hardware UART object.','Use Serial on the USB interface or a compatible SoftwareSerial implementation, or select a Mega/Leonardo and adjust the UART.');
 if(avr&&board.includes('leonardo')&&/\bSerial[23]\s*\./.test(scan))
  add('blocker','LEONARDO_EXTRA_SERIAL','Leonardo exposes Serial and Serial1; not Serial2 or Serial3.','Use Serial1 for external UART on verified pins 0 and 1.');
 if(classic){
  const pins=[...scan.matchAll(/\bpinMode\s*\(\s*(3[4-9])\s*,\s*(?:OUTPUT|OUTPUT_OPEN_DRAIN)\b/g)].map(x=>x[1]);
  if(pins.length)add('blocker','ESP32_INPUT_ONLY_GPIO','Classic ESP32 GPIO34–39 are input-only, but the sketch configures one as an output.','Move the output to a suitable GPIO, respecting flash, strapping and board-specific reservations.');
  if(/\b(?:pinMode|digitalWrite|analogWrite)\s*\(\s*(?:[6-9]|1[01])\s*,/.test(scan))
   add('review','ESP32_FLASH_GPIO','Classic ESP32 GPIO6–11 are normally used for onboard SPI flash.','Avoid these GPIOs on the common WROOM dev board; verify the exact module schematic.');
 }
 if(esp8266&&/\b(?:pinMode|digitalWrite)\s*\(\s*(?:D3|D4|D8)\s*,/i.test(scan))
  add('review','ESP8266_STRAPPING','Some NodeMCU D-pin aliases control ESP8266 boot strapping (D3/GPIO0, D4/GPIO2, D8/GPIO15).','Confirm startup pull states and attached devices to prevent failed boot.');
 if(esp8266&&/\banalogRead\s*\(\s*(?!A0\b|0\b)\d+\s*\)/.test(scan))
  add('review','ESP8266_ADC','NodeMCU has one analog input; the sketch appears to use a numbered pin instead of A0.','Use the verified board A0 alias and check the actual board-level voltage divider/input limit.');
 if((avr||esp8266||esp32)&&/\b(?:password|api_key|secret|token)\s*=\s*"[^"\n]{4,}"/i.test(uncommented))
  add('review','EMBEDDED_SECRET','The sketch may contain an embedded credential; this can leak through downloads or logs.','Use a private local configuration. Never paste credentials into AI diagnostics or public examples.');
 const deps=resolveStudioLibraries({board,code:source,parts,manualLibraries});
 if(deps.unknownIncludes.length&&!customLibrary)
  add('review','UNRESOLVED_HEADERS',deps.unknownIncludes.length+' header(s) are not recognized by the current Studio library index.','Verify each exact header using Library Manager or provide a reviewed local ZIP library before compiling.');
 if(esp32&&has('M5Stack.h')&&!customLibrary)
  add('blocker','LEGACY_M5_HEADER','Legacy M5Stack.h is not verified with the pinned ESP32 3.3.12 core.','Use M5Unified.h when appropriate to your exact M5 device or a separately verified compatible toolchain.');
 if(board==='esp32:esp32:m5stack-core-esp32')
  add('review','M5_BOARD_REVISION','M5Stack pin availability depends on the exact Core model and revision.','Confirm manufacturer pin assignments and power supply; compilation cannot verify external port pinouts.');
 return {blockers,warnings,canCompile:blockers.length===0,verified:false,
  note:'Static source and board-family checks only; no library installation, real compile, flash or hardware test.'};
}
