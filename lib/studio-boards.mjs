export const BOARD_OPTIONS = [
  {id:'arduino:avr:uno',name:'Arduino UNO R3',catalogId:'cb-059',voltage:'5V',notes:'UNO uses 5V logic. Hardware Serial uses USB pins 0/1; use SoftwareSerial for a separate UART.'},
  {id:'arduino:avr:nano:cpu=atmega328',name:'Arduino Nano ATmega328P',catalogId:null,voltage:'5V',notes:'Classic 5V ATmega328P Nano; confirm MCU and selected bootloader. The board is not listed in the store.'},
  {id:'arduino:avr:nano:cpu=atmega328old',name:'Arduino Nano ATmega328P (Old Bootloader)',catalogId:null,voltage:'5V',notes:'For older Nano bootloaders; compiled application is not proof of a compatible USB upload. Board is not stocked.'},
  {id:'arduino:avr:mega:cpu=atmega2560',name:'Arduino Mega 2560',catalogId:null,voltage:'5V',notes:'Mega 2560 has Serial1/Serial2/Serial3 for external UART modules. Board is not stocked.'},
  {id:'arduino:avr:leonardo',name:'Arduino Leonardo',catalogId:null,voltage:'5V',notes:'ATmega32U4 uses Serial for USB and Serial1 on pins 0/1 for external UART. Board is not stocked.'},
  {id:'esp8266:esp8266:nodemcuv2',name:'ESP8266 NodeMCU',catalogId:'cb-062',voltage:'3.3V',notes:'GPIO is 3.3V-only. D-pin labels differ from GPIO numbers. Check boot strap pins.'},
  {id:'esp32:esp32:esp32',name:'ESP32 Dev Module',catalogId:'cb-063',voltage:'3.3V',notes:'Classic ESP32-WROOM dev board: 3.3V GPIO, HardwareSerial UARTs. Check strapping/flash and input-only GPIO.'},
  {id:'esp32:esp32:esp32s3',name:'ESP32-S3 Dev Module',catalogId:null,voltage:'3.3V',notes:'ESP32-S3 USB, UART, GPIO and peripherals differ from classic ESP32. No Bluetooth Classic. Not stocked.'},
  {id:'esp32:esp32:esp32c3',name:'ESP32-C3 Dev Module',catalogId:null,voltage:'3.3V',notes:'ESP32-C3 is RISC-V with limited GPIO and no Bluetooth Classic. Verify pins and exact board; not stocked.'},
  {id:'esp32:esp32:m5stack-core-esp32',name:'M5Stack Core (ESP32)',catalogId:null,voltage:'3.3V',notes:'M5Stack model and hardware revision determine available GPIO, UART ports and peripherals. No fixed external UART pins are assumed.'}
];
export const studioBoardName = id => BOARD_OPTIONS.find(board => board.id === id)?.name || 'Unknown board';
export function boardSerialStarter(id){
 const target=BOARD_OPTIONS.find(board=>board.id===id);
 if(!target)throw Error('Choose a supported board.');
 return {slug:'serial-heartbeat',board:id,method:'board-starter',title:target.name+' serial starter',
  summary:'Print a heartbeat once per second at 115200 baud. No external components or GPIO connections are required.',
  prompt:'Print a serial heartbeat once per second at 115200 baud.',
  parts:target.catalogId?[target.catalogId]:[],wires:[],missing:[],
  warnings:['Select the exact board and USB port in Arduino IDE. A matching toolchain and physical-board test are still required.',
   ...(target.voltage==='3.3V'?['Use 3.3V GPIO logic; check this board variant and reserved pins. This starter does not configure external peripherals.']:[])],
  code:'// CircuitByte serial starter: '+target.name+'\n// Serial monitor: 115200 baud. No external wiring.\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  Serial.println("CircuitByte: board is running");\n  delay(1000);\n}\n'};
}
