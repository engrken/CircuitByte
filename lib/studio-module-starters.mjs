// Educational UART starters for stocked modules. Never certify wiring or network service.
import {BOARD_OPTIONS} from './studio-boards.mjs';

export const MODULE_STARTERS=Object.freeze([
 {id:'gps-neo6m',name:'NEO-6M GPS location reader',catalogIds:['cb-030','cb-083'],kind:'gps',
  summary:'Decode NMEA location data from a NEO-6M receiver using TinyGPSPlus.'},
 {id:'gsm-sim900a',name:'SIM900A GSM AT terminal',catalogIds:['cb-061'],kind:'gsm',
  summary:'Send manual AT commands to a SIM900A modem; does not automatically send SMS or start a data session.'},
 {id:'bluetooth-hc05',name:'HC-05 Bluetooth serial terminal',catalogIds:['cb-018'],kind:'bluetooth',
  summary:'Test UART data from an HC-05 Bluetooth Classic module with a serial terminal.'}
]);

function uartFor(board){
 if(['arduino:avr:uno','arduino:avr:nano:cpu=atmega328','arduino:avr:nano:cpu=atmega328old'].includes(board))
  return {declare:'#include <SoftwareSerial.h>\nSoftwareSerial moduleSerial(4, 3); // MCU RX D4, TX D3',begin:'moduleSerial.begin(9600);',
   rx:'D4',tx:'D3',notes:'Use D4 as RX from the module TX; D3 as TX to module RX after checking level shifting.'};
 if(board==='arduino:avr:mega:cpu=atmega2560')
  return {declare:'#define moduleSerial Serial1',begin:'moduleSerial.begin(9600);',
   rx:'D19 (RX1)',tx:'D18 (TX1)',notes:'Mega 2560 Serial1 is RX1 on D19 and TX1 on D18.'};
 if(board==='arduino:avr:leonardo')
  return {declare:'#define moduleSerial Serial1',begin:'moduleSerial.begin(9600);',
   rx:'D0 (RX1)',tx:'D1 (TX1)',notes:'Leonardo Serial1 uses pins 0/1; USB Serial is for the monitor.'};
 if(board==='esp8266:esp8266:nodemcuv2')
  return {declare:'#include <SoftwareSerial.h>\nSoftwareSerial moduleSerial(D5, D6); // RX GPIO14, TX GPIO12',begin:'moduleSerial.begin(9600);',
   rx:'D5 (GPIO14)',tx:'D6 (GPIO12)',notes:'NodeMCU D5=GPIO14 and D6=GPIO12; UART data pins are 3.3V-only.'};
 if(board==='esp32:esp32:esp32')
  return {declare:'HardwareSerial moduleSerial(2); // ESP32-WROOM-32 UART2',begin:'moduleSerial.begin(9600, SERIAL_8N1, 16, 17);',
   rx:'GPIO16 (UART2 RX)',tx:'GPIO17 (UART2 TX)',notes:'GPIO16/17 are example UART2 pins for the stocked ESP32-WROOM-32 board, not universal ESP32 pin assignments.'};
 if(board.startsWith('esp32:'))
  return {declare:'// Select free UART pins using the exact board schematic before connecting a module.\nconstexpr int MODULE_RX_GPIO = -1;\nconstexpr int MODULE_TX_GPIO = -1;\nHardwareSerial moduleSerial(1);',
   begin:'if (MODULE_RX_GPIO >= 0 && MODULE_TX_GPIO >= 0) moduleSerial.begin(9600, SERIAL_8N1, MODULE_RX_GPIO, MODULE_TX_GPIO);',
   rx:'RX GPIO (configure)',tx:'TX GPIO (configure)',
   notes:'UART pins deliberately unset. Replace -1 with verified free GPIOs for this ESP32-S3, ESP32-C3 or M5Stack revision before connecting hardware.'};
 throw Error('Choose a supported development board.');
}
function sketch(uart,kind){
 const additional=kind==='gps'?'#include <TinyGPS++.h>\nTinyGPSPlus gps;\n':'';
 const intro=['// CircuitByte module starter (not a hardware-certified wiring diagram).',
  '// Serial Monitor 115200 baud; module UART is a typical 9600 baud.',
  '// Confirm the module baud rate, supply, logic level and pin labels.'].join('\n');
 const setup=[intro,additional+uart.declare,'','void setup() {',
  '  Serial.begin(115200);',
  '  '+uart.begin,
  '  Serial.println("'+(kind==='gps'?'Waiting for NMEA sentences (outdoor sky view needed)...':kind==='gsm'?'SIM900A AT terminal: enter AT in Serial Monitor.':'HC-05 serial terminal: send text to test communication.')+'");',
  '}','','void loop() {'];
 if(uart.rx==='RX GPIO (configure)')
  setup.push('  if (MODULE_RX_GPIO < 0 || MODULE_TX_GPIO < 0) { delay(1000); return; }');
 if(kind==='gps')setup.push(
  '  while (moduleSerial.available()) gps.encode(moduleSerial.read());',
  '  if (gps.location.isUpdated() && gps.location.isValid()) {',
  '    Serial.print("Lat: "); Serial.print(gps.location.lat(), 6);',
  '    Serial.print(" Lon: "); Serial.println(gps.location.lng(), 6);',
  '  }');
 else setup.push(
  '  while (Serial.available()) moduleSerial.write(Serial.read());',
  '  while (moduleSerial.available()) Serial.write(moduleSerial.read());');
 setup.push('}','');
 return setup.join('\n');
}
export function moduleSerialStarter(board,starterId,selected=[]){
 const selectedBoard=BOARD_OPTIONS.find(item=>item.id===board);
 if(!selectedBoard)throw Error('Choose a supported development board.');
 const option=MODULE_STARTERS.find(item=>item.id===starterId);
 if(!option)throw Error('Choose a supported module starter.');
 const moduleId=option.catalogIds.find(id=>selected.includes(id))||option.catalogIds[0];
 const uart=uartFor(board);
 const netlist=[
  {pin:uart.rx,to:option.name+' TX (confirm module pin label)',net:'MODULE_TO_MCU',kind:'digital-input'},
  ...(option.kind==='gps'?[]:[{pin:uart.tx,to:option.name+' RX (level shifting may be required)',net:'MCU_TO_MODULE',kind:'digital-output'}]),
  {pin:'GND',to:option.name+' GND (common ground only when safe for the supply)',net:'COMMON_GROUND',kind:'ground'}
 ];
 const warnings=[
  uart.notes,
  'Confirm module-level TX/RX voltage, a suitable power supply, and a common ground before wiring. Power connections are intentionally omitted from this reference.',
  'The module UART is set to 9600 as a starting point; confirm and adapt to its configured baud rate.',
  ...(option.kind==='gsm'?[
   'SIM900A only supports 2G GSM/GPRS. Verify local carrier 2G availability and SIM/antenna compatibility. The terminal sends no SMS until you enter commands.',
   'Provide a dedicated correctly rated modem supply capable of transmit current bursts. Do not power the modem from an MCU GPIO or assume its VCC5/VCC4 input is interchangeable.'
  ]:option.kind==='gps'?[
   'GPS requires an antenna and satellite visibility. No fix is guaranteed indoors or immediately after power-up. Confirm NEO-6M breakout UART and voltage levels.'
  ]:[
   'HC-05 supports Bluetooth Classic, not BLE. This example uses the module UART, not an ESP32 built-in Bluetooth radio.'
  ]),
  'Educational source only; compile on the selected board and inspect electrical specifications before energizing hardware.'
 ];
 const parts=[...(selectedBoard.catalogId?[selectedBoard.catalogId]:[]),moduleId];
 return {slug:starterId,board,method:'board-starter',title:option.name,summary:option.summary,
  prompt:option.summary,parts,wires:netlist.map(({pin,to})=>[pin,to]),netlist,
  missing:[],warnings,code:sketch(uart,option.kind)};
}
